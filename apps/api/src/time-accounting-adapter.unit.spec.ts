import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { jest } from "@jest/globals";
import { HttpTimeAccountingAdapter, TimeAccountingAdapterError, type TimeAccountingPayload } from "./time-accounting-adapter.js";

const payload = (): TimeAccountingPayload => ({
  schemaVersion: 1,
  recordId: randomUUID(),
  revision: 2,
  organizationId: randomUUID(),
  employeeId: randomUUID(),
  projectId: randomUUID(),
  taskId: null,
  stageId: randomUUID(),
  date: "2026-10-01",
  startedAt: "2026-10-01T08:00:00.000Z",
  endedAt: "2026-10-01T09:00:00.000Z",
  durationSeconds: 3600,
  workNote: "Site coordination",
  location: "SITE",
  billable: true,
  activityLabel: "Coordination",
  approvedAt: "2026-10-01T10:00:00.000Z"
});

describe("HTTP time accounting adapter", () => {
  it("retries with the same idempotency key and immutable JSON body", async () => {
    const record = payload();
    const deliveryId = randomUUID();
    const requests: Array<{ url: URL; init?: RequestInit }> = [];
    const send = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: new URL(String(input)), init });
      return new Response(JSON.stringify({ recordId: record.recordId, revision: record.revision, accepted: true }), { status: 201 });
    }) as unknown as typeof fetch;
    const adapter = new HttpTimeAccountingAdapter({ receiverBaseUrl: "http://accounting.test/api/", bearerToken: "server-secret", fetch: send });

    await adapter.exportRecord(record, deliveryId);
    await adapter.exportRecord(record, deliveryId);

    expect(requests).toHaveLength(2);
    expect(requests[0]?.url.href).toBe(`http://accounting.test/api/time-records/${record.recordId}`);
    expect(requests[0]?.init?.method).toBe("PUT");
    expect(requests[0]?.init?.headers).toEqual({
      "Content-Type": "application/json",
      "Idempotency-Key": deliveryId,
      Authorization: "Bearer server-secret"
    });
    expect(requests[0]?.init?.body).toBe(JSON.stringify(record));
    expect(requests[1]?.init?.headers).toEqual(requests[0]?.init?.headers);
    expect(requests[1]?.init?.body).toBe(requests[0]?.init?.body);
  });

  it("rejects a receiver acknowledgement for a different record or revision", async () => {
    const record = payload();
    const adapter = new HttpTimeAccountingAdapter({
      receiverBaseUrl: "http://accounting.test",
      fetch: (async () => new Response(JSON.stringify({ recordId: record.recordId, revision: record.revision - 1, accepted: true }), { status: 200 })) as typeof fetch
    });

    await expect(adapter.exportRecord(record, randomUUID())).rejects.toMatchObject({ name: "TimeAccountingAdapterError", retriable: true });
  });

  it("rejects non-success responses without exposing receiver details", async () => {
    const adapter = new HttpTimeAccountingAdapter({
      receiverBaseUrl: "http://accounting.test",
      fetch: (async () => new Response("private receiver error", { status: 503 })) as typeof fetch
    });

    await expect(adapter.exportRecord(payload(), randomUUID())).rejects.toMatchObject({
      name: "TimeAccountingAdapterError",
      retriable: true,
      message: "Accounting receiver did not confirm the time record; retry delivery."
    });
  });

  it("bounds receiver calls with a timeout and returns a safe retriable error", async () => {
    const send = ((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("timeout")), { once: true });
    })) as typeof fetch;
    const adapter = new HttpTimeAccountingAdapter({ receiverBaseUrl: "http://accounting.test", timeoutMs: 5, fetch: send });

    await expect(adapter.exportRecord(payload(), randomUUID())).rejects.toBeInstanceOf(TimeAccountingAdapterError);
  });

  it("uses a loopback receiver to prove concurrent retries are idempotent and revisions do not regress", async () => {
    const receiver = createContractReceiver();
    const baseUrl = await start(receiver.server);
    const adapter = new HttpTimeAccountingAdapter({ receiverBaseUrl: baseUrl });
    try {
      const record = payload();
      const deliveryId = randomUUID();
      const duplicate = await Promise.all([
        adapter.exportRecord(record, deliveryId),
        adapter.exportRecord(record, deliveryId)
      ]);
      expect(duplicate[0]).toEqual(duplicate[1]);
      expect(receiver.deliveryCount()).toBe(1);
      await adapter.exportRecord(record, deliveryId);
      expect(receiver.deliveryCount()).toBe(1);

      const changedSameRevision = { ...record, workNote: "Different content" };
      await expect(adapter.exportRecord(changedSameRevision, deliveryId)).rejects.toMatchObject({ retriable: true });
      await expect(adapter.exportRecord(changedSameRevision, randomUUID())).rejects.toMatchObject({ retriable: true });

      const newer = { ...record, revision: record.revision + 1, workNote: "Revised note" };
      const newerResult = await adapter.exportRecord(newer, randomUUID());
      expect(newerResult.revision).toBe(newer.revision);
      await adapter.exportRecord(record, randomUUID());
      expect(receiver.current(record.recordId)).toMatchObject({ revision: newer.revision, workNote: "Revised note" });
    } finally {
      await stop(receiver.server);
    }
  });

  it("rejects a receiver redirect without contacting its destination", async () => {
    let destinationHits = 0;
    const destination = createServer((_request, response) => {
      destinationHits += 1;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ recordId: "unused", revision: 1, accepted: true }));
    });
    const destinationUrl = await start(destination);
    const redirector = createServer((_request, response) => {
      response.writeHead(302, { Location: `${destinationUrl}/receive` });
      response.end();
    });
    const redirectUrl = await start(redirector);
    try {
      const adapter = new HttpTimeAccountingAdapter({ receiverBaseUrl: redirectUrl });
      await expect(adapter.exportRecord(payload(), randomUUID())).rejects.toMatchObject({ retriable: true });
      expect(destinationHits).toBe(0);
    } finally {
      await Promise.all([stop(redirector), stop(destination)]);
    }
  });

  it("rejects malformed input locally without making a request", async () => {
    const send = jest.fn() as unknown as typeof fetch;
    const adapter = new HttpTimeAccountingAdapter({ receiverBaseUrl: "http://accounting.test", fetch: send });
    const record = payload();
    await expect(adapter.exportRecord({ ...record, durationSeconds: 0 }, randomUUID())).rejects.toMatchObject({
      name: "TimeAccountingAdapterError",
      retriable: false
    });
    await expect(adapter.exportRecord(record, "not-a-uuid")).rejects.toMatchObject({ retriable: false });
    expect(send).not.toHaveBeenCalled();
  });
});

function createContractReceiver() {
  const deliveries = new Map<string, string>();
  const revisions = new Map<string, Record<string, unknown>>();
  const revisionHashes = new Map<string, string>();
  const server = createServer((request, response) => {
    void handle(request, response);
  });

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString("utf8");
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      response.writeHead(400).end();
      return;
    }
    const key = request.headers["idempotency-key"];
    const recordId = body.recordId;
    const revision = body.revision;
    if (request.method !== "PUT" || typeof key !== "string" || typeof recordId !== "string" || typeof revision !== "number") {
      response.writeHead(400).end();
      return;
    }
    const hash = createHash("sha256").update(raw).digest("hex");
    const previousDelivery = deliveries.get(key);
    if (previousDelivery !== undefined) {
      if (previousDelivery !== hash) {
        response.writeHead(409).end();
        return;
      }
      sendAck(response, recordId, revision);
      return;
    }
    const current = revisions.get(recordId);
    const revisionKey = `${recordId}:${revision}`;
    const previousRevisionHash = revisionHashes.get(revisionKey);
    if (previousRevisionHash !== undefined && previousRevisionHash !== hash) {
      response.writeHead(409).end();
      return;
    }
    deliveries.set(key, hash);
    revisionHashes.set(revisionKey, hash);
    if (!current || revision > Number(current.revision)) revisions.set(recordId, body);
    sendAck(response, recordId, revision);
  }

  return {
    server,
    deliveryCount: () => deliveries.size,
    current: (recordId: string) => revisions.get(recordId)
  };
}

function sendAck(response: ServerResponse, recordId: string, revision: number): void {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ recordId, revision, accepted: true }));
}

async function start(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Loopback receiver did not bind to a TCP port");
  return `http://127.0.0.1:${address.port}`;
}

async function stop(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
