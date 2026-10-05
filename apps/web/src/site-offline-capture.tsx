import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteOfflineCommand, getOfflineContext, listOfflineCommands, purgeOfflineAccount, purgeOfflineContext, purgeOfflineProject,
  purgeOtherOfflineAccounts, saveOfflineCommand, saveOfflineContext, saveOfflinePointer, clearOfflinePointer, readOfflinePointer,
  amendOfflineCommand, isRetryableOfflineStatus, type OfflineAction, type OfflineCommand, type OfflineContext, type OfflinePhoto,
} from "./site-offline.js";

type ProjectPackage = { id: string; version: number; data: { title: string; actualPercent: string | null; actualQuantity: string | null; qualityStatus: string; materialStatus: string; blockers: string; tomorrowPlan: string } };
type Folder = { id: string; name: string; offlineUploadAllowed?: boolean };
type CaptureProps = {
  accountId: string; projectId: string; projectTitle: string; csrfToken: string; today: string;
  canWork: boolean; canUpload: boolean; packages: ProjectPackage[]; folders: Folder[]; offlineOnly?: boolean;
  onAccessLost: () => void; onSynced: () => void;
};

const uuid = (): string => crypto.randomUUID();
const queueKey = (accountId: string, projectId: string, localId: string): string => `${accountId}:${projectId}:${localId}`;
const statusMessage: Record<OfflineCommand["status"], string> = {
  PENDING: "Pending", UPLOADING: "Uploading photos", SYNCING: "Syncing", CONFLICT: "Conflict", FAILED: "Failed", SYNCED: "Synchronized",
};
function httpError(status: number, body?: unknown): Error & { status: number; body?: unknown } {
  return Object.assign(new Error("request-failed"), { status, body });
}
async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => undefined);
  if (!response.ok) throw httpError(response.status, body);
  return body as T;
}
function bytesToHex(bytes: ArrayBuffer): string { return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join(""); }
async function digest(blob: Blob): Promise<string> { return bytesToHex(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())); }

export function SiteOfflineCapture(props: CaptureProps): React.JSX.Element {
  const [context, setContext] = useState<OfflineContext>();
  const [queue, setQueue] = useState<OfflineCommand[]>([]);
  const [storageError, setStorageError] = useState("");
  const [notice, setNotice] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [action, setAction] = useState<OfflineAction>("NOTE");
  const [folderId, setFolderId] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [amendReasons, setAmendReasons] = useState<Record<string, string>>({});
  const [amendPayloads, setAmendPayloads] = useState<Record<string, Record<string, unknown>>>({});
  const sessionActive = useRef(true);
  const [draft, setDraft] = useState({
    note: "", date: props.today, trade: "", count: "", manpowerNote: "", workCompleted: "", materialsReceived: "", issues: "", delayCauses: "", tomorrowPlan: "",
    snagTitle: "", snagDescription: "", snagPackageId: "", packageId: "", actualPercent: "", actualQuantity: "", qualityStatus: "PENDING", materialStatus: "", blockers: "", packageTomorrowPlan: "",
  });
  const safeFolders = useMemo(() => props.folders.filter((folder) => folder.offlineUploadAllowed === true), [props.folders]);

  const reload = useCallback(async () => {
    try {
      const [nextContext, items] = await Promise.all([
        getOfflineContext(props.accountId, props.projectId),
        listOfflineCommands(props.accountId, props.projectId),
      ]);
      if (!sessionActive.current) return;
      setContext(nextContext); setQueue(items); setStorageError("");
    } catch (error) { if (sessionActive.current) setStorageError(error instanceof Error ? error.message : "Offline storage is unavailable."); }
  }, [props.accountId, props.projectId]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    if (!props.offlineOnly && !props.canWork) {
      sessionActive.current = false; setContext(undefined); setQueue([]);
      void purgeOfflineProject(props.accountId, props.projectId).catch(() => setStorageError("Current project access could not be checked; stored offline drafts are hidden."));
    } else if (!props.offlineOnly) sessionActive.current = true;
  }, [props.accountId, props.projectId, props.canWork, props.offlineOnly]);
  useEffect(() => {
    sessionActive.current = props.offlineOnly === true || props.canWork;
    let mounted = true;
    void purgeOtherOfflineAccounts(props.accountId).then(() => { if (mounted) void reload(); }).catch(() => { if (mounted) setStorageError("Offline storage could not be checked. Local capture is unavailable until storage works."); });
    const clear = () => { sessionActive.current = false; clearOfflinePointer(props.accountId); void purgeOfflineAccount(props.accountId).catch(() => undefined); setContext(undefined); setQueue([]); };
    window.addEventListener("sense-session-ended", clear);
    return () => { mounted = false; sessionActive.current = false; window.removeEventListener("sense-session-ended", clear); };
  }, [props.accountId, reload]);

  const prepare = async (): Promise<void> => {
    if (!sessionActive.current) return;
    const prepared: OfflineContext = {
      key: `${props.accountId}:${props.projectId}`, accountId: props.accountId, projectId: props.projectId,
      projectTitle: props.projectTitle, preparedAt: new Date().toISOString(), today: props.today,
      packages: props.packages.map((item) => ({ id: item.id, title: item.data.title, version: item.version, actualPercent: item.data.actualPercent, actualQuantity: item.data.actualQuantity, qualityStatus: item.data.qualityStatus, materialStatus: item.data.materialStatus, blockers: item.data.blockers, tomorrowPlan: item.data.tomorrowPlan })),
      folders: safeFolders.map(({ id, name }) => ({ id, name })),
    };
    try { await saveOfflineContext(prepared); if (!sessionActive.current) { await purgeOfflineProject(props.accountId, props.projectId).catch(() => undefined); return; } saveOfflinePointer({ accountId: props.accountId, projectId: props.projectId, projectTitle: props.projectTitle }); setContext(prepared); setStorageError(""); setNotice(`Offline capture prepared for ${prepared.projectTitle}. Prepare again to refresh its minimal context.`); }
    catch (error) { setStorageError(error instanceof Error ? error.message : "Offline storage could not save this project."); setNotice(""); }
  };

  const addDraft = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!context || !props.canWork || storageError || !sessionActive.current) return;
    const form = event.currentTarget;
    const reason = (form.elements.namedItem("offlineReason") as HTMLTextAreaElement).value.trim();
    if (reason.length < 3) return;
    let payload: Record<string, unknown>; let baseRecordVersion: number | null = null;
    if (action === "NOTE") payload = { note: draft.note.trim(), photoIds: [] };
    else if (action === "MANPOWER") payload = { date: draft.date, trade: draft.trade.trim(), count: Number(draft.count), employeeAccountIds: [], note: draft.manpowerNote.trim() };
    else if (action === "REPORT") payload = { date: draft.date, workCompleted: draft.workCompleted.trim(), manpower: [], materialsReceived: draft.materialsReceived.trim(), photoIds: [], issues: draft.issues.trim(), delayCauses: draft.delayCauses.trim(), tomorrowPlan: draft.tomorrowPlan.trim() };
    else if (action === "SNAG") payload = { title: draft.snagTitle.trim(), description: draft.snagDescription.trim(), ...(draft.snagPackageId ? { packageId: draft.snagPackageId } : {}), photoIds: [] };
    else {
      const target = context.packages.find((item) => item.id === draft.packageId);
      if (!target) return;
      baseRecordVersion = target.version;
      payload = { recordId: target.id, actualPercent: draft.actualPercent, actualQuantity: draft.actualQuantity, qualityStatus: draft.qualityStatus, materialStatus: draft.materialStatus.trim(), blockers: draft.blockers.trim(), tomorrowPlan: draft.packageTomorrowPlan.trim(), photoIds: [] };
    }
    const selectedPhotos = action === "MANPOWER" ? [] : photos;
    if (selectedPhotos.some((file) => !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type.toLowerCase()))) { setNotice("Use PNG, JPEG, GIF, or WebP captured images. Unsupported files were not saved."); return; }
    if (selectedPhotos.length > 20) { setNotice("Choose no more than 20 captured images for one offline draft."); return; }
    const localId = uuid();
    const row: OfflineCommand = {
      key: queueKey(props.accountId, props.projectId, localId), accountId: props.accountId, projectId: props.projectId,
      projectTitle: props.projectTitle, localId, commandId: uuid(), baseRecordVersion, action, payload, reason,
      photos: selectedPhotos.map((file) => ({ localId: uuid(), folderId, fileName: file.name, mimeType: file.type, sizeBytes: file.size, bytes: file })),
      status: "PENDING", createdAt: new Date().toISOString(),
    };
    try { if (!sessionActive.current) return; await saveOfflineCommand(row); if (!sessionActive.current) return; setPhotos([]); form.reset(); await reload(); setStorageError(""); setNotice("Offline draft saved on this device."); }
    catch (error) { setStorageError(error instanceof Error ? error.message : "Offline storage could not save this draft."); setNotice(""); }
  };

  const uploadPhotos = async (entry: OfflineCommand): Promise<{ uploaded: string[]; retained: OfflinePhoto[] }> => {
    const uploaded: string[] = []; const photos = [...entry.photos];
    for (let photoIndex = 0; photoIndex < photos.length; photoIndex++) {
      let photo = photos[photoIndex]!;
      if (photo.finalizedDocumentId) { uploaded.push(photo.finalizedDocumentId); continue; }
      if (!photo.uploadId) {
        if (!sessionActive.current) throw new Error("The session ended before this upload could continue.");
        const started = await readJson<{ uploadId: string; chunkSize: number }>(await fetch(`/api/v1/site/projects/${encodeURIComponent(entry.projectId)}/offline-photos`, {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": props.csrfToken },
          body: JSON.stringify({ localId: photo.localId, folderId: photo.folderId, fileName: photo.fileName, mimeType: photo.mimeType, sizeBytes: photo.sizeBytes, reason: entry.reason }),
        }));
        if (!sessionActive.current) throw new Error("The session ended before this upload could continue.");
        const chunkSize = Math.min(started.chunkSize, 8 * 1024 * 1024);
        if (chunkSize <= 0) throw new Error("The document service returned an invalid upload size.");
        photo = { ...photo, uploadId: started.uploadId, chunkSize, nextChunk: 0 };
        photos[photoIndex] = photo;
        if (!sessionActive.current) throw new Error("The session ended before this upload could continue.");
        await saveOfflineCommand({ ...entry, photos });
      }
      const chunkSize = photo.chunkSize!; const chunkCount = Math.ceil(photo.sizeBytes / chunkSize);
      for (let index = photo.nextChunk ?? 0; index < chunkCount; index++) {
        if (!sessionActive.current) throw new Error("The session ended before this upload could continue.");
        const chunk = photo.bytes.slice(index * chunkSize, Math.min((index + 1) * chunkSize, photo.sizeBytes));
        const checksum = await digest(chunk);
        if (!sessionActive.current) throw new Error("The session ended before this upload could continue.");
        const response = await fetch(`/api/v1/documents/uploads/${encodeURIComponent(photo.uploadId!)}/chunks/${index}`, {
          method: "PUT", credentials: "include", headers: { "Content-Type": "application/octet-stream", "X-CSRF-Token": props.csrfToken, "x-chunk-sha256": checksum }, body: chunk,
        });
        if (!response.ok) throw httpError(response.status, await response.json().catch(() => undefined));
        if (!sessionActive.current) throw new Error("The session ended before this upload could continue.");
        photo = { ...photo, nextChunk: index + 1 }; photos[photoIndex] = photo;
        await saveOfflineCommand({ ...entry, photos });
      }
      if (!sessionActive.current) throw new Error("The session ended before this upload could continue.");
      const file = await readJson<{ id: string }>(await fetch(`/api/v1/documents/uploads/${encodeURIComponent(photo.uploadId!)}/finalize`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": props.csrfToken }, body: "{}",
      }));
      if (!sessionActive.current) throw new Error("The session ended before this upload could continue.");
      photo = { ...photo, finalizedDocumentId: file.id }; photos[photoIndex] = photo;
      await saveOfflineCommand({ ...entry, photos }); uploaded.push(file.id);
    }
    return { uploaded, retained: photos.filter((photo) => !photo.finalizedDocumentId) };
  };

  const syncOne = async (entry: OfflineCommand): Promise<void> => {
    if (!sessionActive.current) return;
    const withStatus = { ...entry, status: entry.photos.length ? "UPLOADING" as const : "SYNCING" as const };
    delete withStatus.error; delete withStatus.conflict;
    await saveOfflineCommand(withStatus); if (!sessionActive.current) return; await reload();
    try {
      let ready = withStatus;
      if (ready.photos.length) {
        const result = await uploadPhotos(ready);
        const photoIds = [...(Array.isArray(ready.payload.photoIds) ? ready.payload.photoIds as string[] : []), ...result.uploaded];
        ready = { ...ready, photos: result.retained, payload: { ...ready.payload, photoIds }, status: "SYNCING" };
        if (!sessionActive.current) return;
        await saveOfflineCommand(ready);
      }
      const response = await fetch(`/api/v1/site/projects/${encodeURIComponent(ready.projectId)}/offline-commands`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": props.csrfToken },
        body: JSON.stringify({ commandId: ready.commandId, localId: ready.localId, baseRecordVersion: ready.baseRecordVersion, reason: ready.reason, action: ready.action, payload: ready.payload }),
      });
      if (!sessionActive.current) return;
      if (response.status === 409) {
        const body = await response.json().catch(() => ({})) as { code?: string; record?: OfflineCommand["conflict"]; message?: string };
        if (body.code === "SITE_RECORD_CONFLICT" && body.record) {
          if (!sessionActive.current) return;
          await saveOfflineCommand({ ...ready, status: "CONFLICT", conflict: body.record });
          return;
        }
      }
      await readJson(response);
      if (!sessionActive.current) return;
      await saveOfflineCommand({ ...ready, status: "SYNCED", photos: [] });
    } catch (error) {
      if (!sessionActive.current) return;
      const status = (error as Error & { status?: number }).status ?? 0;
      if (status === 401 || status === 403 || status === 404) {
        await setNoAccess(); return;
      }
      const latest = (await listOfflineCommands(props.accountId, props.projectId)).find((item) => item.key === entry.key) ?? entry;
      if (!sessionActive.current || latest.status === "CONFLICT") return;
      await saveOfflineCommand({ ...latest, status: "FAILED", error: status ? `Upload or sync failed with status ${status}.` : "Upload or sync could not reach the service." });
    }
  };

  const [accessLost, setAccessLost] = useState(false);
  const setNoAccess = async (): Promise<void> => {
    sessionActive.current = false;
    setAccessLost(true); setContext(undefined); setQueue([]);
    clearOfflinePointer(props.accountId);
    await purgeOfflineAccount(props.accountId).catch(() => undefined);
    await purgeOfflineContext(props.accountId, props.projectId).catch(() => undefined);
    props.onAccessLost();
  };
  const syncPending = useCallback(async () => {
    if (syncBusy || !navigator.onLine || !context || props.offlineOnly) return;
    setSyncBusy(true); setNotice("");
    try {
      const items = await listOfflineCommands(props.accountId, props.projectId);
      for (const item of items) {
        if (!sessionActive.current) break;
        if (isRetryableOfflineStatus(item.status) && !item.requiresPhotoRecapture) await syncOne(item);
        if (!sessionActive.current) break;
      }
      await reload(); props.onSynced(); setNotice("Offline queue sync finished. Review any failed or conflicted items.");
    } catch (error) { setStorageError(error instanceof Error ? error.message : "Offline storage is unavailable."); }
    finally { setSyncBusy(false); }
  }, [syncBusy, context, props.accountId, props.projectId, props.csrfToken, props.offlineOnly, props.onSynced, reload]);
  useEffect(() => {
    const online = () => { if (context) void syncPending(); };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [context, syncPending]);

  const keepServer = async (entry: OfflineCommand): Promise<void> => { await deleteOfflineCommand(entry.key); await reload(); setNotice("The server’s current record was kept. This local draft was discarded."); };
  const amend = async (entry: OfflineCommand): Promise<void> => {
    if (!entry.conflict) return;
    const reason = (amendReasons[entry.key] ?? "").trim();
    if (reason.length < 3) return;
    const payload = { ...entry.payload, ...(amendPayloads[entry.key] ?? {}) };
    if (!sessionActive.current) return;
    const next = amendOfflineCommand(entry, entry.conflict.version, reason, payload, uuid);
    try { await saveOfflineCommand(next); await deleteOfflineCommand(entry.key); await reload(); setNotice("Amended command saved with the displayed server version. Sync it when ready."); }
    catch (error) { setStorageError(error instanceof Error ? error.message : "The amended command could not be saved."); }
  };
  const discard = async (entry: OfflineCommand): Promise<void> => { await deleteOfflineCommand(entry.key); await reload(); };
  const conflictFields: Record<OfflineAction, Array<{ key: string; label: string; multiline?: boolean; number?: boolean }>> = {
    NOTE: [{ key: "note", label: "Observation note", multiline: true }],
    MANPOWER: [{ key: "date", label: "Observation date" }, { key: "trade", label: "Trade" }, { key: "count", label: "People counted", number: true }, { key: "note", label: "Manpower note", multiline: true }],
    REPORT: [{ key: "date", label: "Report date" }, { key: "workCompleted", label: "Work completed today", multiline: true }, { key: "materialsReceived", label: "Materials received", multiline: true }, { key: "issues", label: "Issues", multiline: true }, { key: "delayCauses", label: "Delay causes", multiline: true }, { key: "tomorrowPlan", label: "Plan for tomorrow", multiline: true }],
    SNAG: [{ key: "title", label: "Snag title" }, { key: "description", label: "Snag description", multiline: true }],
    PACKAGE_PROGRESS: [{ key: "actualPercent", label: "Actual progress (%)" }, { key: "actualQuantity", label: "Actual quantity" }, { key: "qualityStatus", label: "Quality status" }, { key: "materialStatus", label: "Material status" }, { key: "blockers", label: "Blockers", multiline: true }, { key: "tomorrowPlan", label: "Plan for tomorrow", multiline: true }],
  };

  if (accessLost) return <section className="site-panel site-offline"><h2>Offline capture</h2><p role="status">Project access was lost. Local offline content has been removed.</p></section>;
  return <section className="site-panel site-offline" aria-labelledby="site-offline-title">
    <header><div><h2 id="site-offline-title">Offline site capture</h2><p>Prepare a small project summary, then record drafts on this device. Sync repeats current access checks.</p></div>
      <button type="button" onClick={() => void prepare()} disabled={!props.canWork || Boolean(storageError)}>Prepare offline capture</button></header>
    {storageError && <p role="status" className="site-note">{storageError} Online site work is still available.</p>}
    {notice && <p role="status" className="site-notice">{notice}</p>}
    {!props.canWork && <p role="status" className="site-note">Offline capture is unavailable because current site work access is not confirmed.</p>}
    {context && <><p role="status" className="site-offline-context">Offline capture prepared for {context.projectTitle} · prepared {new Date(context.preparedAt).toLocaleString()} · current project context only</p>
      <form className="site-form" onSubmit={(event) => void addDraft(event)}>
        <h3>Save an offline draft</h3>
        <label>Offline capture type<select aria-label="Offline capture type" value={action} onChange={(e) => setAction(e.target.value as OfflineAction)}><option value="NOTE">Note</option><option value="MANPOWER">Manpower observation</option><option value="REPORT">Daily report draft</option><option value="SNAG">Open snag</option><option value="PACKAGE_PROGRESS">Package progress</option></select></label>
        {action === "NOTE" && <label>Observation note<textarea aria-label="Observation note" required minLength={1} maxLength={4000} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })}/></label>}
        {action === "MANPOWER" && <><label>Observation date<input aria-label="Observation date" type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}/></label><label>Trade<input aria-label="Trade" required maxLength={120} value={draft.trade} onChange={(e) => setDraft({ ...draft, trade: e.target.value })}/></label><label>People counted<input aria-label="People counted" type="number" min="0" step="1" required value={draft.count} onChange={(e) => setDraft({ ...draft, count: e.target.value })}/></label><label>Manpower note<textarea aria-label="Manpower note" value={draft.manpowerNote} onChange={(e) => setDraft({ ...draft, manpowerNote: e.target.value })}/></label></>}
        {action === "REPORT" && <><label>Report date<input aria-label="Report date" type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })}/></label><label>Work completed today<textarea aria-label="Work completed today" required value={draft.workCompleted} onChange={(e) => setDraft({ ...draft, workCompleted: e.target.value })}/></label><label>Materials received<textarea aria-label="Materials received" value={draft.materialsReceived} onChange={(e) => setDraft({ ...draft, materialsReceived: e.target.value })}/></label><label>Issues<textarea aria-label="Issues" value={draft.issues} onChange={(e) => setDraft({ ...draft, issues: e.target.value })}/></label><label>Delay causes<textarea aria-label="Delay causes" value={draft.delayCauses} onChange={(e) => setDraft({ ...draft, delayCauses: e.target.value })}/></label><label>Plan for tomorrow<textarea aria-label="Plan for tomorrow" required value={draft.tomorrowPlan} onChange={(e) => setDraft({ ...draft, tomorrowPlan: e.target.value })}/></label></>}
        {action === "SNAG" && <><label>Snag title<input aria-label="Snag title" required value={draft.snagTitle} onChange={(e) => setDraft({ ...draft, snagTitle: e.target.value })}/></label><label>Snag description<textarea aria-label="Snag description" required value={draft.snagDescription} onChange={(e) => setDraft({ ...draft, snagDescription: e.target.value })}/></label><label>Related package<select aria-label="Related package" value={draft.snagPackageId} onChange={(e) => setDraft({ ...draft, snagPackageId: e.target.value })}><option value="">No package</option>{context.packages.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></>}
        {action === "PACKAGE_PROGRESS" && <><label>Package progress target<select aria-label="Package progress target" required value={draft.packageId} onChange={(e) => { const target = context.packages.find((item) => item.id === e.target.value); setDraft({ ...draft, packageId: e.target.value, actualPercent: target?.actualPercent ?? "", actualQuantity: target?.actualQuantity ?? "", qualityStatus: target?.qualityStatus ?? "PENDING", materialStatus: target?.materialStatus ?? "", blockers: target?.blockers ?? "", packageTomorrowPlan: target?.tomorrowPlan ?? "" }); }}><option value="">Choose package</option>{context.packages.map((item) => <option key={item.id} value={item.id}>{item.title} · version {item.version}</option>)}</select></label><label>Actual progress (%)<input aria-label="Actual progress (%)" type="number" min="0" max="100" step="0.01" required value={draft.actualPercent} onChange={(e) => setDraft({ ...draft, actualPercent: e.target.value })}/></label><label>Actual quantity<input aria-label="Actual quantity" required value={draft.actualQuantity} onChange={(e) => setDraft({ ...draft, actualQuantity: e.target.value })}/></label><label>Quality status<select aria-label="Quality status" value={draft.qualityStatus} onChange={(e) => setDraft({ ...draft, qualityStatus: e.target.value })}><option>PENDING</option><option>PASSED</option><option>FAILED</option></select></label><label>Material status<input aria-label="Material status" required value={draft.materialStatus} onChange={(e) => setDraft({ ...draft, materialStatus: e.target.value })}/></label><label>Blockers<textarea aria-label="Blockers" value={draft.blockers} onChange={(e) => setDraft({ ...draft, blockers: e.target.value })}/></label><label>Plan for tomorrow<textarea aria-label="Plan for tomorrow" value={draft.packageTomorrowPlan} onChange={(e) => setDraft({ ...draft, packageTomorrowPlan: e.target.value })}/></label></>}
        {action !== "MANPOWER" && <><label>Photo upload folder<select aria-label="Photo upload folder" value={folderId} onChange={(e) => setFolderId(e.target.value)} disabled={!props.canUpload || safeFolders.length === 0}><option value="">No captured photos</option>{safeFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><label>Captured photos<input aria-label="Captured photos" type="file" accept="image/*" capture="environment" multiple disabled={!props.canUpload || !folderId} onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}/></label></>}
        <label>Reason for this offline command<textarea name="offlineReason" aria-label="Reason for this offline command" required minLength={3} maxLength={1000}/></label>
        <button disabled={!props.canWork || Boolean(storageError)}>Save offline draft</button>
      </form>
    </>}
    {!props.canUpload && <p className="site-note">Photo capture is unavailable until current document upload access is confirmed.</p>}
    {props.offlineOnly && <p role="status" className="site-note">Local capture only. Server authentication and project authorization have not been checked. Reconnect and restore your live session before syncing.</p>}
    <div className="site-offline-queue"><div><h3>Offline capture queue</h3><button type="button" onClick={() => void syncPending()} disabled={!context || syncBusy || !navigator.onLine || props.offlineOnly}>{syncBusy ? "Syncing…" : "Sync now"}</button></div>
      {queue.length === 0 ? <p role="status">No offline drafts for this project.</p> : <ul>{queue.map((entry) => <li key={entry.key}>
        <article><header><strong>{entry.action.replaceAll("_", " ")} · {new Date(entry.createdAt).toLocaleString()}</strong><span className={`site-state site-offline-${entry.status.toLowerCase()}`}>{statusMessage[entry.status]}</span></header>
          <p>{entry.action === "NOTE" ? String(entry.payload.note) : entry.action === "PACKAGE_PROGRESS" ? `${context?.packages.find((item) => item.id === entry.payload.recordId)?.title ?? "Package"} · base version ${entry.baseRecordVersion}` : entry.action === "SNAG" ? String(entry.payload.title) : entry.action}</p>
          {entry.photos.length > 0 && <p>{entry.photos.length} captured photo(s) stored on this device.</p>}
          {entry.error && <p role="alert">{entry.error}</p>}
          {entry.conflict && <div className="site-offline-conflict"><h4>Current server values · version {entry.conflict.version}</h4><dl>{conflictFields[entry.action].map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{String(entry.conflict?.data[key] ?? "Not recorded")}</dd></div>)}</dl><h4>Compare and amend local values</h4><dl>{conflictFields[entry.action].map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{String({ ...entry.payload, ...(amendPayloads[entry.key] ?? {}) }[key] ?? "Not recorded")}</dd></div>)}</dl>{conflictFields[entry.action].map(({ key, label, multiline, number }) => <label key={key}>{label}{multiline ? <textarea aria-label={label} value={String({ ...entry.payload, ...(amendPayloads[entry.key] ?? {}) }[key] ?? "")} onChange={(e) => setAmendPayloads({ ...amendPayloads, [entry.key]: { ...(amendPayloads[entry.key] ?? {}), [key]: e.target.value } })}/> : <input aria-label={label} type={number ? "number" : "text"} value={String({ ...entry.payload, ...(amendPayloads[entry.key] ?? {}) }[key] ?? "")} onChange={(e) => setAmendPayloads({ ...amendPayloads, [entry.key]: { ...(amendPayloads[entry.key] ?? {}), [key]: number ? Number(e.target.value) : e.target.value } })}/>}</label>)}<p>Package/photo references stay attached to the original command. Amending creates a new command using current version {entry.conflict.version}.</p><button type="button" onClick={() => void keepServer(entry)}>Keep server values</button><label>Amendment reason<textarea aria-label="Amendment reason" value={amendReasons[entry.key] ?? ""} onChange={(e) => setAmendReasons({ ...amendReasons, [entry.key]: e.target.value })}/></label><button type="button" disabled={(amendReasons[entry.key] ?? "").trim().length < 3} onClick={() => void amend(entry)}>Amend and retry</button></div>}
          {entry.status !== "SYNCED" && entry.status !== "CONFLICT" && <button type="button" onClick={() => void discard(entry)}>Discard offline draft</button>}
        </article>
      </li>)}</ul>}
    </div>
  </section>;
}

export function SiteOfflineCaptureRoute(): React.JSX.Element {
  const [state, setState] = useState<{ pointer?: ReturnType<typeof readOfflinePointer>; context?: OfflineContext; unavailable?: boolean }>({});
  useEffect(() => {
    const pointer = readOfflinePointer();
    if (!pointer) { setState({ unavailable: true }); return; }
    void getOfflineContext(pointer.accountId, pointer.projectId).then((context) => context ? setState({ pointer, context }) : setState({ pointer, unavailable: true })).catch(() => setState({ pointer, unavailable: true }));
  }, []);
  if (!state.pointer) return <main className="identity-content"><section className="identity-section"><h1>Offline site capture unavailable</h1><p role="status">{state.unavailable ? "No prepared account and project context is available on this device." : "Checking locally prepared project context…"} Reconnect and sign in to prepare a project for offline capture.</p><a href="/">Return to sign in</a></section></main>;
  if (!state.context) return <main className="identity-content"><section className="identity-section"><h1>Offline site capture unavailable</h1><p role="status">The prepared local project context could not be opened. Reconnect and sign in before continuing.</p><a href="/">Return to sign in</a></section></main>;
  const context = state.context;
  const packages: ProjectPackage[] = context.packages.map((item) => ({ id: item.id, version: item.version, data: { title: item.title, actualPercent: item.actualPercent, actualQuantity: item.actualQuantity, qualityStatus: item.qualityStatus, materialStatus: item.materialStatus, blockers: item.blockers, tomorrowPlan: item.tomorrowPlan } }));
  const folders: Folder[] = context.folders.map((folder) => ({ ...folder, offlineUploadAllowed: true }));
  return <main className="identity-content"><section className="identity-section"><h1>Site capture · local device mode</h1><p role="status">Account-bound local drafts for {context.projectTitle}. This screen does not prove server authentication or project access. Reconnect and sign in to sync.</p></section><SiteOfflineCapture accountId={context.accountId} projectId={context.projectId} projectTitle={context.projectTitle} csrfToken="" today={context.today} canWork={true} canUpload={true} packages={packages} folders={folders} offlineOnly onAccessLost={() => setState({ unavailable: true })} onSynced={() => undefined}/></main>;
}
