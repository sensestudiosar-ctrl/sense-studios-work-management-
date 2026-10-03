export type TimeAccountingPayload = {
  schemaVersion: 1;
  recordId: string;
  revision: number;
  organizationId: string;
  employeeId: string;
  projectId: string | null;
  taskId: string | null;
  stageId: string | null;
  date: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  workNote: string;
  location: "OFFICE" | "SITE" | "REMOTE";
  billable: boolean;
  activityLabel: string | null;
  approvedAt: string | null;
};

export type TimeAccountingResult = {
  recordId: string;
  revision: number;
  accepted: true;
};

export type TimeAccountingFetch = typeof fetch;

export type HttpTimeAccountingAdapterOptions = {
  receiverBaseUrl: string;
  bearerToken?: string;
  timeoutMs?: number;
  fetch?: TimeAccountingFetch;
};

export class TimeAccountingAdapterError extends Error {
  readonly retriable: boolean;

  constructor(message = "Accounting receiver did not confirm the time record; retry delivery.", retriable = true) {
    super(message);
    this.name = "TimeAccountingAdapterError";
    this.retriable = retriable;
  }
}

/** Sends immutable time-record revisions to a server-configured accounting receiver. */
export class HttpTimeAccountingAdapter {
  private readonly endpoint: URL;
  private readonly token: string | undefined;
  private readonly timeoutMs: number;
  private readonly send: TimeAccountingFetch;

  constructor(options: HttpTimeAccountingAdapterOptions) {
    const base = new URL(options.receiverBaseUrl);
    if (base.protocol !== "http:" && base.protocol !== "https:") {
      throw new Error("Accounting receiver URL must use HTTP or HTTPS");
    }
    if (base.username || base.password || base.search || base.hash) {
      throw new Error("Accounting receiver URL must not contain credentials, query, or fragment");
    }
    base.pathname = `${base.pathname.replace(/\/$/, "")}/time-records/`;
    this.endpoint = base;
    this.token = options.bearerToken;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 120_000) {
      throw new Error("Accounting receiver timeout must be between 1 and 120000 milliseconds");
    }
    this.send = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async exportRecord(payload: TimeAccountingPayload, deliveryId: string): Promise<TimeAccountingResult> {
    if (!isValidPayload(payload) || !isUuid(deliveryId)) {
      throw new TimeAccountingAdapterError("Invalid time accounting record or delivery identifier.", false);
    }
    const endpoint = new URL(encodeURIComponent(payload.recordId), this.endpoint);
    const body: TimeAccountingPayload = {
      schemaVersion: payload.schemaVersion,
      recordId: payload.recordId,
      revision: payload.revision,
      organizationId: payload.organizationId,
      employeeId: payload.employeeId,
      projectId: payload.projectId,
      taskId: payload.taskId,
      stageId: payload.stageId,
      date: payload.date,
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
      durationSeconds: payload.durationSeconds,
      workNote: payload.workNote,
      location: payload.location,
      billable: payload.billable,
      activityLabel: payload.activityLabel,
      approvedAt: payload.approvedAt
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": deliveryId
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    let response: Response;
    try {
      response = await this.send(endpoint, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: "error"
      });
    } catch {
      throw new TimeAccountingAdapterError("Accounting receiver request failed or timed out; retry delivery.");
    }

    if (response.status !== 200 && response.status !== 201) throw new TimeAccountingAdapterError();

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      throw new TimeAccountingAdapterError();
    }
    if (!isAcceptedResult(result) || result.recordId !== payload.recordId || result.revision !== payload.revision) {
      throw new TimeAccountingAdapterError();
    }
    return { recordId: result.recordId, revision: result.revision, accepted: true };
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isValidPayload(value: TimeAccountingPayload): boolean {
  return value !== null && typeof value === "object" && value.schemaVersion === 1 && isUuid(value.recordId) &&
    Number.isInteger(value.revision) && value.revision > 0 && isUuid(value.organizationId) && isUuid(value.employeeId) &&
    (value.projectId === null || isUuid(value.projectId)) && (value.taskId === null || isUuid(value.taskId)) &&
    (value.stageId === null || isUuid(value.stageId)) && /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    isIsoOrNull(value.startedAt) && isIsoOrNull(value.endedAt) && Number.isInteger(value.durationSeconds) && value.durationSeconds > 0 &&
    typeof value.workNote === "string" && ["OFFICE", "SITE", "REMOTE"].includes(value.location) &&
    typeof value.billable === "boolean" && (value.activityLabel === null || typeof value.activityLabel === "string") &&
    isIsoOrNull(value.approvedAt);
}

function isIsoOrNull(value: string | null): boolean {
  return value === null || (typeof value === "string" && Number.isFinite(Date.parse(value)) && value.includes("T"));
}

function isAcceptedResult(value: unknown): value is TimeAccountingResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  const keys = Object.keys(result);
  return keys.length === 3 && keys.includes("recordId") && keys.includes("revision") && keys.includes("accepted") &&
    typeof result.recordId === "string" && typeof result.revision === "number" && Number.isInteger(result.revision) &&
    result.revision > 0 && result.accepted === true;
}
