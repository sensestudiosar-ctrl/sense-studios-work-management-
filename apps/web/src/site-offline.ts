export type OfflineAction = "NOTE" | "MANPOWER" | "REPORT" | "SNAG" | "PACKAGE_PROGRESS";
export type OfflineStatus = "PENDING" | "UPLOADING" | "SYNCING" | "CONFLICT" | "FAILED" | "SYNCED";
export type OfflinePhoto = { localId: string; folderId: string; fileName: string; mimeType: string; sizeBytes: number; bytes: Blob; uploadId?: string; chunkSize?: number; finalizedDocumentId?: string; nextChunk?: number };
export type OfflineConflict = { id: string; version: number; state: string; data: Record<string, unknown> };
export type OfflineCommand = {
  key: string;
  accountId: string;
  projectId: string;
  projectTitle: string;
  localId: string;
  commandId: string;
  baseRecordVersion: number | null;
  action: OfflineAction;
  payload: Record<string, unknown>;
  reason: string;
  photos: OfflinePhoto[];
  status: OfflineStatus;
  error?: string;
  requiresPhotoRecapture?: boolean;
  conflict?: OfflineConflict;
  createdAt: string;
};
export function isRetryableOfflineStatus(status: OfflineStatus): boolean { return status === "PENDING" || status === "FAILED" || status === "UPLOADING" || status === "SYNCING"; }
export function amendOfflineCommand(entry: OfflineCommand, currentRecordVersion: number, reason: string, changes: Record<string, unknown>, createId: () => string): OfflineCommand {
  const retained = { ...entry }; delete retained.error; delete retained.conflict;
  const localId = createId();
  return { ...retained, key: `${entry.accountId}:${entry.projectId}:${localId}`, localId, commandId: createId(), baseRecordVersion: currentRecordVersion, payload: { ...entry.payload, ...changes }, reason, status: "PENDING" };
}

const DB_NAME = "sense-site-offline-v1";
const STORE = "commands";
const CONTEXTS = "contexts";
const scopeRevisions = new Map<string, number>();
const scopeRevision = (accountId: string, projectId: string): string => `${scopeRevisions.get(accountId) ?? 0}:${scopeRevisions.get(`${accountId}:${projectId}`) ?? 0}`;
function invalidateOfflineWrites(scope: string): void { scopeRevisions.set(scope, (scopeRevisions.get(scope) ?? 0) + 1); }
export class OfflineStorageUnavailableError extends Error {
  constructor(message = "Offline storage is unavailable in this browser or device.") { super(message); this.name = "OfflineStorageUnavailableError"; }
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new OfflineStorageUnavailableError());
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("accountId", "accountId", { unique: false });
      }
      if (!db.objectStoreNames.contains(CONTEXTS)) db.createObjectStore(CONTEXTS, { keyPath: "key" });
    };
    request.onerror = () => reject(new OfflineStorageUnavailableError());
    request.onblocked = () => reject(new OfflineStorageUnavailableError("Offline storage is busy in another tab. Close the other tab and try again."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function contextTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>, current = () => true): Promise<T> {
  const db = await openDb();
  if (!current()) { db.close(); throw new OfflineStorageUnavailableError("Offline access changed before the draft could be saved."); }
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(CONTEXTS, mode);
    const request = operation(tx.objectStore(CONTEXTS));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(new OfflineStorageUnavailableError());
    tx.oncomplete = () => { db.close(); resolve(result!); };
    tx.onerror = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
    tx.onabort = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
  });
}

export type OfflineContext = { key: string; accountId: string; projectId: string; projectTitle: string; preparedAt: string; today: string; packages: Array<{ id: string; title: string; version: number; actualPercent: string | null; actualQuantity: string | null; qualityStatus: string; materialStatus: string; blockers: string; tomorrowPlan: string }>; folders: Array<{ id: string; name: string }> };
export type OfflinePointer = { accountId: string; projectId: string; projectTitle: string };
const POINTER_KEY = "sense-site-offline-pointer-v1";
export function saveOfflinePointer(pointer: OfflinePointer): void { localStorage.setItem(POINTER_KEY, JSON.stringify(pointer)); }
export function readOfflinePointer(): OfflinePointer | undefined {
  try { const value = localStorage.getItem(POINTER_KEY); if (!value) return undefined; const parsed = JSON.parse(value) as OfflinePointer; return parsed.accountId && parsed.projectId ? parsed : undefined; }
  catch { return undefined; }
}
export function clearOfflinePointer(accountId?: string): void {
  try { const pointer = readOfflinePointer(); if (!accountId || pointer?.accountId === accountId) localStorage.removeItem(POINTER_KEY); } catch { /* browser storage may be disabled */ }
}
export async function saveOfflineContext(context: OfflineContext): Promise<void> { const revision = scopeRevision(context.accountId, context.projectId); await contextTransaction("readwrite", (store) => store.put(context), () => revision === scopeRevision(context.accountId, context.projectId)); }
export async function getOfflineContext(accountId: string, projectId: string): Promise<OfflineContext | undefined> { return contextTransaction("readonly", (store) => store.get(`${accountId}:${projectId}`)); }
export async function listOfflineContexts(accountId: string): Promise<OfflineContext[]> {
  const all = await contextTransaction("readonly", (store) => store.getAll());
  return all.filter((item) => item.accountId === accountId);
}
export async function purgeOfflineContext(accountId: string, projectId: string): Promise<void> { await contextTransaction("readwrite", (store) => store.delete(`${accountId}:${projectId}`)); }
export async function purgeOfflineProject(accountId: string, projectId: string): Promise<void> {
  invalidateOfflineWrites(`${accountId}:${projectId}`);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, CONTEXTS], "readwrite");
    const commands = tx.objectStore(STORE); const contexts = tx.objectStore(CONTEXTS);
    const request = commands.getAll();
    request.onsuccess = () => { for (const item of request.result) if (item.accountId === accountId && item.projectId === projectId) commands.delete(item.key); };
    contexts.delete(`${accountId}:${projectId}`);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
    tx.onabort = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
  });
}
export async function purgeOfflineProjectPhotos(accountId: string, projectId: string): Promise<void> {
  invalidateOfflineWrites(`${accountId}:${projectId}`);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, CONTEXTS], "readwrite");
    const commands = tx.objectStore(STORE); const contexts = tx.objectStore(CONTEXTS);
    const request = commands.getAll();
    request.onsuccess = () => { for (const item of request.result) if (item.accountId === accountId && item.projectId === projectId && (item.photos.length || Array.isArray(item.payload.photoIds) && item.payload.photoIds.length)) commands.delete(item.key); };
    const contextRequest = contexts.get(`${accountId}:${projectId}`);
    contextRequest.onsuccess = () => { if (contextRequest.result) contexts.put({ ...contextRequest.result, folders: [] }); };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
    tx.onabort = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
  });
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>, current = () => true): Promise<T> {
  const db = await openDb();
  if (!current()) { db.close(); throw new OfflineStorageUnavailableError("Offline access changed before the draft could be saved."); }
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = operation(tx.objectStore(STORE));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(new OfflineStorageUnavailableError());
    tx.oncomplete = () => { db.close(); resolve(result!); };
    tx.onerror = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
    tx.onabort = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
  });
}

export async function saveOfflineCommand(command: OfflineCommand): Promise<void> {
  const revision = scopeRevision(command.accountId, command.projectId);
  await transaction("readwrite", (store) => store.put(command), () => revision === scopeRevision(command.accountId, command.projectId));
}

export async function listOfflineCommands(accountId: string, projectId?: string): Promise<OfflineCommand[]> {
  const all = await transaction("readonly", (store) => store.getAll());
  return all.filter((item) => item.accountId === accountId && (!projectId || item.projectId === projectId))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function deleteOfflineCommand(key: string): Promise<void> {
  await transaction("readwrite", (store) => store.delete(key));
}

/** Updates must preserve every account's pending queue without exposing its contents. */
export async function hasPendingOfflineCommands(): Promise<boolean> {
  const entries = await transaction<OfflineCommand[]>("readonly", (store) => store.getAll());
  return entries.some((entry) => entry.status !== "SYNCED");
}

export async function purgeOfflineAccount(accountId: string): Promise<void> {
  invalidateOfflineWrites(accountId);
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, CONTEXTS], "readwrite");
    const commands = tx.objectStore(STORE); const contexts = tx.objectStore(CONTEXTS);
    const commandRequest = commands.getAll(); const contextRequest = contexts.getAll();
    commandRequest.onsuccess = () => { for (const item of commandRequest.result) if (item.accountId === accountId) commands.delete(item.key); };
    contextRequest.onsuccess = () => { for (const item of contextRequest.result) if (item.accountId === accountId) contexts.delete(item.key); };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
    tx.onabort = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
  });
}

export async function purgeOtherOfflineAccounts(accountId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE, CONTEXTS], "readwrite");
    const commands = tx.objectStore(STORE); const contexts = tx.objectStore(CONTEXTS);
    const commandRequest = commands.getAll(); const contextRequest = contexts.getAll();
    commandRequest.onsuccess = () => { for (const item of commandRequest.result) if (item.accountId !== accountId) commands.delete(item.key); };
    contextRequest.onsuccess = () => { for (const item of contextRequest.result) if (item.accountId !== accountId) contexts.delete(item.key); };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
    tx.onabort = () => { db.close(); reject(new OfflineStorageUnavailableError()); };
  });
}
