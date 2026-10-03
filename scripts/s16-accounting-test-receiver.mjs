import { createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

if (process.env.S16_TEST_RECEIVER !== "1" || !process.env.S16_TEST_RECEIVER_TOKEN) {
  throw new Error("S16 test receiver requires S16_TEST_RECEIVER=1 and S16_TEST_RECEIVER_TOKEN");
}

const host = process.env.S16_TEST_RECEIVER_HOST ?? "127.0.0.1";
if (host !== "127.0.0.1" && host !== "::1" && host !== "localhost") {
  throw new Error("S16 test receiver may bind only to loopback");
}
const port = Number(process.env.S16_TEST_RECEIVER_PORT ?? "56816");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid S16 test receiver port");
const token = Buffer.from(process.env.S16_TEST_RECEIVER_TOKEN);
const deliveries = new Map();
const revisions = new Map();
const records = new Map();
const failureModes = new Map();

const server = createServer((request, response) => {
  if (request.url?.startsWith("/__test/")) {
    if (!authorized(request.headers["x-s16-test-token"])) {
      response.writeHead(404).end();
      return;
    }
    void diagnostics(request, response);
    return;
  }
  void receive(request, response);
});

server.listen(port, host, () => {
  process.stdout.write(`S16 test accounting receiver listening on ${host}:${port}\n`);
});

function authorized(header) {
  if (typeof header !== "string") return false;
  const candidate = Buffer.from(header);
  return candidate.length === token.length && timingSafeEqual(candidate, token);
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const part = Buffer.from(chunk);
    size += part.length;
    if (size > 1024 * 1024) throw new Error("body-too-large");
    chunks.push(part);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function receive(request, response) {
  if (request.method !== "PUT") {
    response.writeHead(405, { Allow: "PUT" }).end();
    return;
  }
  const match = /^\/time-records\/([0-9a-f-]{36})$/i.exec(request.url ?? "");
  const deliveryId = request.headers["idempotency-key"];
  if (!match || typeof deliveryId !== "string") {
    response.writeHead(400).end();
    return;
  }
  let raw;
  let payload;
  try {
    raw = await readBody(request);
    payload = JSON.parse(raw);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const recordId = match[1].toLowerCase();
  if (!payload || payload.recordId !== recordId || !Number.isInteger(payload.revision) || payload.revision < 1) {
    response.writeHead(400).end();
    return;
  }

  const payloadHash = createHash("sha256").update(raw).digest("hex");
  const priorDelivery = deliveries.get(deliveryId);
  if (priorDelivery && (priorDelivery.recordId !== recordId || priorDelivery.revision !== payload.revision || priorDelivery.payloadHash !== payloadHash)) {
    response.writeHead(409).end();
    return;
  }
  const revisionKey = `${recordId}:${payload.revision}`;
  const priorRevision = revisions.get(revisionKey);
  if (priorRevision && priorRevision.payloadHash !== payloadHash) {
    response.writeHead(409).end();
    return;
  }
  const mode = failureModes.get(recordId) ?? "NORMAL";
  if (mode === "REJECT_BEFORE_ACCEPT") {
    failureModes.delete(recordId);
    response.writeHead(503).end();
    return;
  }

  deliveries.set(deliveryId, { recordId, revision: payload.revision, payloadHash });
  revisions.set(revisionKey, { recordId, revision: payload.revision, payloadHash, payload });
  const current = records.get(recordId);
  if (!current || payload.revision > current.revision) records.set(recordId, { recordId, revision: payload.revision, payloadHash, payload });
  const ack = { recordId, revision: payload.revision, accepted: true };
  if (mode === "ACCEPT_THEN_LOSE_ACK") {
    failureModes.delete(recordId);
    response.destroy();
    return;
  }
  response.writeHead(priorDelivery ? 200 : 201, { "Content-Type": "application/json" });
  response.end(JSON.stringify(ack));
}

async function diagnostics(request, response) {
  if (request.method === "GET" && request.url === "/__test/state") {
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({
      acceptedRecordCount: records.size,
      deliveryCount: deliveries.size,
      deliveries: [...deliveries.entries()].map(([id, value]) => ({ id, ...value })),
      records: [...records.values()].sort((left, right) => left.recordId.localeCompare(right.recordId)),
      revisions: [...revisions.values()].sort((left, right) => left.recordId.localeCompare(right.recordId) || left.revision - right.revision)
    }));
    return;
  }
  if (request.method === "POST" && request.url === "/__test/reset") {
    deliveries.clear();
    revisions.clear();
    records.clear();
    failureModes.clear();
    response.writeHead(204).end();
    return;
  }
  if (request.method === "POST" && request.url === "/__test/failure") {
    let body;
    try { body = JSON.parse(await readBody(request)); } catch { body = null; }
    if (typeof body?.recordId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.recordId) ||
        (body?.mode !== "REJECT_BEFORE_ACCEPT" && body?.mode !== "ACCEPT_THEN_LOSE_ACK")) {
      response.writeHead(400).end();
      return;
    }
    failureModes.set(body.recordId.toLowerCase(), body.mode);
    response.writeHead(204).end();
    return;
  }
  response.writeHead(404).end();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
