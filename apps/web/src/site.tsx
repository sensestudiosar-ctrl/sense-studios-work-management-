import { useCallback, useEffect, useRef, useState } from "react";
import "./site.css";
import { SiteOfflineCapture } from "./site-offline-capture.js";
import { clearOfflinePointer, purgeOfflineAccount, purgeOfflineProject, purgeOfflineProjectPhotos, readOfflinePointer } from "./site-offline.js";

const API = "/api/v1/site";
const DOCS = "/api/v1/documents";
type Project = { id: string; title: string; status: string; branchName: string };
type Evidence = { documentId?: string; blobId?: string; sha256?: string; name?: string; mimeType?: string; hidden?: boolean; indication?: string };
type Package = { id: string; version: number; state: "OPEN" | "COMPLETED"; data: { title: string; date: string; tomorrowPlan: string; plannedPercent: string; actualPercent: string | null; plannedQuantity: string; actualQuantity: string | null; unit: string; qualityStatus: "PENDING" | "PASSED" | "FAILED"; materialStatus: string; blockers: string; critical: boolean; releaseId?: string; photoEvidence: Evidence[] } };
type Manpower = { id: string; version: number; state: "RECORDED"; data: { date: string; trade: string; count: number; employeeAccountIds: string[]; note: string } };
type Report = { id: string; version: number; state: "DRAFT" | "CONFIRMED"; data: { date: string; workCompleted: string; manpower: Array<{ trade: string; count: number }>; materialsReceived: string; photoEvidence: Evidence[]; issues: string; delayCauses: string; tomorrowPlan: string; supersedesReportId?: string; confirmedBy?: string; confirmedAt?: string } };
type SnagState = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "READY_FOR_VERIFICATION" | "VERIFIED" | "CLOSED";
type Snag = { id: string; version: number; state: SnagState; data: { title: string; description: string; packageId?: string; fixerAccountId?: string; verifierAccountId?: string; repairGeneration: number; repairNote?: string; photoEvidence: Evidence[]; latestVerificationId?: string; closedBy?: string; closedAt?: string }; capabilities: { assign: boolean; start: boolean; ready: boolean; appointVerifier: boolean; verify: boolean; close: boolean }; attempts: Array<{ id: string; outcome: "PASSED" | "FAILED"; repairGeneration: number; fixerAccountId: string; verifierAccountId: string; note: string; photoEvidence: Evidence[]; occurredAt: string }>; history: unknown[] };
type Detail = { project: { id: string; title: string; status: string }; version: number; today: string; tomorrow: string; responsible: { accountId: string; label: string } | null; people: Array<{ accountId: string; label: string; canWork: boolean }>; capabilities: { manage: boolean; work: boolean; confirm: boolean; handover: boolean }; packages: Package[]; manpower: Manpower[]; reports: Report[]; notes?: Array<{ id: string; version: number; state: string; data: { note: string; photoEvidence: Evidence[] } }>; snags: Snag[]; handovers: Array<{ id: string; data: { note: string; decidedBy: string; decidedAt: string; packages: Array<{ id: string; version: number }>; snags: Array<{ id: string; version: number; verificationId: string }>; reportIds: string[] } }>; history: Array<{ eventName: string; actorId: string; reason: string; occurredAt: string; beforeVersion?: number; afterVersion?: number; safeLabel?: string }>; materials: Array<{ releaseId: string; state: string; lines: unknown[]; materials: unknown[]; procurementStatus: string; factoryStatus: string }>; workforce: { attendance: Array<{ accountId: string; label: string; state: "OPEN" | "CLOSED"; mode: "SITE" | "OFFICE" | "REMOTE"; provisional: boolean }>; count: number } };
type List = { items: Project[] };
type Documents = { files: Array<{ id: string; fileName: string; mimeType: string; sha256: string }>; folders: Array<{ id: string; name: string; offlineUploadAllowed?: boolean }>; capabilities?: { upload: boolean } };
type DraftReport = { workCompleted: string; manpowerTrade: string; manpowerCount: string; materialsReceived: string; issues: string; delayCauses: string; tomorrowPlan: string; photoIds: string[] };

function statusOf(error: unknown): number { return error instanceof Error ? (error as Error & { status?: number }).status ?? 0 : 0; }
async function json<T>(response: Response): Promise<T> { if (!response.ok) throw Object.assign(new Error("request-failed"), { status: response.status }); return response.json() as Promise<T>; }
function message(error: unknown): string {
  const status = statusOf(error);
  if (status === 403 || status === 404) return "You no longer have access to this project or action. Refresh the project list to check current access.";
  if (status === 409) return "This project changed while you were working. The current project was refreshed; review its latest version before trying again.";
  if (status >= 500) return "The site service is unavailable. Try again shortly.";
  return "The request could not be completed. Check the current record and try again.";
}
const blankReport = (): DraftReport => ({ workCompleted: "", manpowerTrade: "", manpowerCount: "", materialsReceived: "", issues: "", delayCauses: "", tomorrowPlan: "", photoIds: [] });
const evidenceLabel = (item: Evidence): string => item.hidden ? item.indication ?? "Evidence is retained but unavailable to this account." : item.name ?? "Authorized photo evidence";

export function SiteWorkspace({ csrfToken, accountId }: { csrfToken: string; accountId: string }): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [detail, setDetail] = useState<Detail>();
  const [documents, setDocuments] = useState<Array<{ documentId: string; name: string; mimeType: string; sha256: string }>>([]);
  const [documentsError, setDocumentsError] = useState("");
  const [offlineFolders, setOfflineFolders] = useState<Array<{ id: string; name: string; offlineUploadAllowed?: boolean }>>([]);
  const [canUploadOfflinePhotos, setCanUploadOfflinePhotos] = useState(false);
  const [clearingOfflinePhotos, setClearingOfflinePhotos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const epoch = useRef(0);
  const [reason, setReason] = useState("");
  const [report, setReport] = useState<DraftReport>(blankReport);
  const [manpower, setManpower] = useState({ date: "", trade: "", count: "", note: "", employeeAccountIds: [] as string[] });
  const [packageDraft, setPackageDraft] = useState({ title: "", date: "", tomorrowPlan: "", plannedPercent: "", plannedQuantity: "", unit: "", critical: false });
  const [packagePhotoIds, setPackagePhotoIds] = useState<string[]>([]);
  const [snagDraft, setSnagDraft] = useState({ title: "", description: "", packageId: "" });
  const [snagPhotoIds, setSnagPhotoIds] = useState<string[]>([]);
  const [responsibleAccountId, setResponsibleAccountId] = useState("");
  const [snagAction, setSnagAction] = useState<Record<string, { fixer: string; verifier: string; note: string; photoIds: string[]; outcome: "PASSED" | "FAILED" }>>({});
  const current = useRef<Detail | undefined>(undefined);
  const projectIdRef = useRef(new URLSearchParams(window.location.search).get("projectId") ?? "");

  const loadDetail = useCallback(async (id: string, request: number): Promise<void> => {
    let next: Detail;
    try { next = await json<Detail>(await fetch(`${API}/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" })); }
    catch (cause) { const status = statusOf(cause); if (status === 401 || status === 403 || status === 404) { const pointer = readOfflinePointer(); if (pointer?.accountId === accountId && pointer.projectId === id) clearOfflinePointer(accountId); await purgeOfflineProject(accountId, id).catch(() => undefined); } throw cause; }
    if (request !== epoch.current) return;
    current.current = next; setDetail(next);
    setDocumentsError("");
    try {
      const fileResult = await json<Documents>(await fetch(`${DOCS}/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }));
      if (request !== epoch.current) return;
      setDocuments(fileResult.files.filter((file) => file.mimeType.startsWith("image/")).map((file) => ({ documentId: file.id, sha256: file.sha256, name: file.fileName, mimeType: file.mimeType })));
      setOfflineFolders((fileResult.folders ?? []).filter((folder) => folder.offlineUploadAllowed === true));
      setCanUploadOfflinePhotos(fileResult.capabilities?.upload === true);
      if (fileResult.capabilities?.upload === false) {
        setClearingOfflinePhotos(true);
        await purgeOfflineProjectPhotos(accountId, id).catch(() => undefined);
        setClearingOfflinePhotos(false);
      }
    } catch (cause) {
      if (request !== epoch.current) return;
      const documentStatus = statusOf(cause);
      if (documentStatus === 401 || documentStatus === 403 || documentStatus === 404) {
        setClearingOfflinePhotos(true);
        await purgeOfflineProjectPhotos(accountId, id).catch(() => undefined);
        setClearingOfflinePhotos(false);
      }
      setDocuments([]);
      setOfflineFolders([]); setCanUploadOfflinePhotos(false);
      setDocumentsError(documentStatus === 401 || documentStatus === 403 || documentStatus === 404
        ? "Document access is unavailable. Offline commands containing photos were discarded; photo selection is unavailable until document access is restored."
        : "Authorized evidence files could not be loaded. Site records remain available; photo selection is unavailable until document access is restored.");
    }
  }, [accountId]);

  const loadProjects = useCallback(async (): Promise<void> => {
    const request = ++epoch.current; setLoading(true); setError("");
    try {
      const result = await json<List>(await fetch(`${API}/projects`, { credentials: "include", cache: "no-store" }));
      if (request !== epoch.current) return;
      const active = result.items.filter((item) => item.status === "ACTIVE");
      const pointer = readOfflinePointer();
      if (pointer?.accountId === accountId && !active.some((item) => item.id === pointer.projectId)) {
        await purgeOfflineProject(accountId, pointer.projectId).catch(() => undefined);
        clearOfflinePointer(accountId);
      }
      setProjects(active);
      const selectedId = projectIdRef.current;
      const nextId = active.some((item) => item.id === selectedId) ? selectedId : "";
      projectIdRef.current = nextId;
      setProjectId(nextId);
      if (nextId) await loadDetail(nextId, request); else { current.current = undefined; setDetail(undefined); setDocuments([]); setOfflineFolders([]); setCanUploadOfflinePhotos(false); setDocumentsError(""); }
    } catch (cause) { if (request === epoch.current) { current.current = undefined; setProjects([]); setDetail(undefined); setError(message(cause)); const status = statusOf(cause); if (status === 401 || status === 403 || status === 404) { clearOfflinePointer(accountId); window.dispatchEvent(new Event("sense-session-ended")); await purgeOfflineAccount(accountId).catch(() => undefined); } } }
    finally { if (request === epoch.current) setLoading(false); }
  }, [loadDetail]);

  useEffect(() => { void loadProjects(); return () => { epoch.current++; }; }, [loadProjects]);

  const selectProject = async (id: string): Promise<void> => {
    const request = ++epoch.current; projectIdRef.current = id; setProjectId(id); setDetail(undefined); current.current = undefined; setDocuments([]); setOfflineFolders([]); setCanUploadOfflinePhotos(false); setDocumentsError(""); setError(""); setNotice("");
    if (!id) return;
    setLoading(true);
    try { await loadDetail(id, request); } catch (cause) { if (request === epoch.current) setError(message(cause)); }
    finally { if (request === epoch.current) setLoading(false); }
  };
  const refresh = async (): Promise<void> => {
    if (busy) return;
    const request = ++epoch.current; setLoading(true); setError("");
    try { if (projectId) await loadDetail(projectId, request); else await loadProjects(); }
    catch (cause) { if (request === epoch.current) { current.current = undefined; setDetail(undefined); setError(message(cause)); } }
    finally { if (request === epoch.current) setLoading(false); }
  };
  const post = async (path: string, body: Record<string, unknown>): Promise<void> => {
    await json<unknown>(await fetch(`${API}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }));
  };
  const mutate = async (path: string, version: number, body: Record<string, unknown>, success: string): Promise<void> => {
    if (busy || !projectId || reason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    try { await post(path, { ...body, expectedVersion: version, reason: reason.trim() }); setReason(""); await refreshAfterMutation(success); }
    catch (cause) { setError(message(cause)); if (statusOf(cause) === 409) await refreshAfterMutation(""); }
    finally { setBusy(false); }
  };
  const refreshAfterMutation = async (success: string): Promise<void> => {
    const request = ++epoch.current;
    try { await loadDetail(projectId, request); if (request === epoch.current) setNotice(success); }
    catch (cause) { if (request === epoch.current) { current.current = undefined; setDetail(undefined); setError(message(cause)); } }
  };
  const actionsFor = (snag: Snag) => snagAction[snag.id] ?? { fixer: "", verifier: "", note: "", photoIds: [], outcome: "PASSED" as const };
  const updateSnag = (id: string, change: Partial<ReturnType<typeof actionsFor>>): void => setSnagAction((all) => ({ ...all, [id]: { ...actionsFor({ id } as Snag), ...change } }));
  const photoPicker = (label: string, selected: string[], onChange: (ids: string[]) => void): React.JSX.Element => <fieldset className="site-photos"><legend>{label}</legend>{documentsError ? <p role="status">{documentsError}</p> : documents.length === 0 ? <p role="status">No authorized image evidence is available for this project.</p> : documents.map((file) => <label key={file.documentId}><input type="checkbox" name="photoIds" value={file.documentId} checked={selected.includes(file.documentId)} onChange={(event) => onChange(event.target.checked ? [...selected, file.documentId] : selected.filter((id) => id !== file.documentId))} />{file.name} · {file.mimeType}</label>)}</fieldset>;

  return <main className="site-workspace" aria-labelledby="site-title">
    <header className="site-workspace-header"><div><p className="site-eyebrow">TURNKEY · SITE DELIVERY</p><h1 id="site-title">Site progress and daily work</h1><p>Record site observations, retain named decisions, and review current evidence.</p></div><button type="button" className="site-secondary" onClick={() => void refresh()} disabled={busy || loading}>Refresh</button></header>
    {error && <p className="site-error" role="alert">{error}</p>}{notice && <p className="site-notice" role="status">{notice}</p>}{documentsError && <p className="site-note" role="status">{documentsError}</p>}
    <label className="site-project-picker">Active Turnkey project<select aria-label="Active Turnkey project" disabled={busy} value={projectId} onChange={(event) => void selectProject(event.target.value)}><option value="">Choose a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.branchName}</option>)}</select></label>
    {loading && <p role="status" className="site-note">Loading current site records…</p>}
    {!loading && !error && !detail && <p role="status" className="site-empty">{projects.length ? "Choose an active Turnkey project to review its site records." : "No active Turnkey projects are available to you."}</p>}
    {detail && <>
      <label className="site-reason">Reason for the next site action<input minLength={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} required/></label>
      {detail.capabilities.manage && <form className="site-form site-responsible" onSubmit={(event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/responsible`, detail.version, { accountId: responsibleAccountId }, "Site responsible person appointed; the appointment does not grant project access."); }}><label>Appoint the responsible person<select value={responsibleAccountId} onChange={(e) => setResponsibleAccountId(e.target.value)} required><option value="">Choose an already assigned person</option>{detail.people.filter((person) => person.canWork).map((person) => <option key={person.accountId} value={person.accountId}>{person.label}</option>)}</select></label><button disabled={busy || reason.trim().length < 3 || !responsibleAccountId}>Appoint responsible person</button></form>}
      <section className="site-overview" aria-labelledby="site-overview-title"><div className="site-overview-heading"><div><p className="site-eyebrow">{detail.project.status} · VERSION {detail.version}</p><h2 id="site-overview-title">{detail.project.title}</h2><p>Responsible person: {detail.responsible?.label ?? "Not appointed"}</p></div><p><strong>Today</strong> {detail.today}<br/><strong>Tomorrow</strong> {detail.tomorrow}</p></div>
        <div className="site-dashboard">
          <article><h3>Today’s work</h3><p>{detail.packages.filter((item) => item.data.date === detail.today).map((item) => item.data.title).join(", ") || "No work package scheduled today."}</p></article>
          <article><h3>Tomorrow’s plan</h3><p>{detail.packages.map((item) => item.data.tomorrowPlan).filter(Boolean).join(" · ") || "No plan recorded."}</p></article>
          <article><h3>Workers today</h3><p>{detail.workforce.count} assigned people · {detail.manpower.filter((item) => item.data.date === detail.today).reduce((n, item) => n + item.data.count, 0)} manual trade count</p><small>Attendance and reported manpower are separate records.</small></article>
          <article><h3>Progress and quality</h3><p>{detail.packages.filter((item) => item.data.actualPercent !== null).length} packages with reported progress · {detail.packages.filter((item) => item.data.qualityStatus === "PENDING").length} quality checks pending</p></article>
          <article><h3>Photos and evidence</h3><p>{detail.packages.reduce((n, item) => n + item.data.photoEvidence.length, 0) + detail.reports.reduce((n, item) => n + item.data.photoEvidence.length, 0)} attached evidence items</p></article>
          <article><h3>Snags</h3><p>{detail.snags.filter((item) => item.state !== "CLOSED").length} open · {detail.snags.filter((item) => item.state === "READY_FOR_VERIFICATION").length} awaiting independent verification</p></article>
          <article><h3>Site approvals</h3><p>{detail.reports.filter((item) => item.state === "DRAFT").length} reports awaiting responsible-person confirmation · {detail.packages.filter((item) => item.data.actualPercent !== null).length} current progress entries</p></article>
          <article><h3>Pending decisions</h3><p>{detail.snags.filter((item) => item.state === "VERIFIED").length} verified snags awaiting management closure · {detail.packages.filter((item) => item.state === "OPEN" && item.data.actualPercent !== null).length} packages with reported progress</p></article>
          <article><h3>Materials</h3><p>{detail.materials.length} released Turnkey material sets · costs remain in Turnkey approvals.</p></article>
          <article><h3>Blockers</h3><p>{detail.packages.map((item) => item.data.blockers).filter(Boolean).join(" · ") || "No blockers reported."}</p></article>
          <article className="site-critical"><h3>Critical activities</h3><p>{detail.packages.filter((item) => item.data.critical).map((item) => item.data.title).join(", ") || "No critical work package is flagged."}</p></article>
        </div>
      </section>

      {!clearingOfflinePhotos && <SiteOfflineCapture key={projectId} accountId={accountId} projectId={projectId} projectTitle={detail.project.title} csrfToken={csrfToken} today={detail.today}
        canWork={detail.capabilities.work} canUpload={canUploadOfflinePhotos} packages={detail.packages} folders={offlineFolders}
        onAccessLost={() => { current.current = undefined; setDetail(undefined); setDocuments([]); setError("Current site access could not be confirmed. Offline project content was removed; refresh after reviewing access."); }}
        onSynced={() => { void refresh(); }} />}

      {detail.notes && <section className="site-panel"><h2>Site notes</h2>{detail.notes.length === 0 ? <p role="status">No site notes have synchronized for this project.</p> : detail.notes.map((item) => <article className="site-record" key={item.id}><p>{item.data.note}</p>{item.data.photoEvidence.length > 0 && <p>Photos: {item.data.photoEvidence.map(evidenceLabel).join(", ")}</p>}</article>)}</section>}

      {detail.capabilities.manage && <section className="site-panel"><h2>Plan a work package</h2><form className="site-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/packages`, detail.version, { ...packageDraft, plannedPercent: packageDraft.plannedPercent.trim(), plannedQuantity: packageDraft.plannedQuantity.trim() }, "Work package saved."); }}>
        <label>Package title<input required maxLength={160} value={packageDraft.title} onChange={(e) => setPackageDraft({ ...packageDraft, title: e.target.value })}/></label><label>Work date<input type="date" required value={packageDraft.date} onChange={(e) => setPackageDraft({ ...packageDraft, date: e.target.value })}/></label><label>Planned progress (%)<input type="number" min="0" max="100" step="0.01" required value={packageDraft.plannedPercent} onChange={(e) => setPackageDraft({ ...packageDraft, plannedPercent: e.target.value })}/></label><label>Planned quantity<input inputMode="decimal" required value={packageDraft.plannedQuantity} onChange={(e) => setPackageDraft({ ...packageDraft, plannedQuantity: e.target.value })}/></label><label>Quantity unit<input required maxLength={40} value={packageDraft.unit} onChange={(e) => setPackageDraft({ ...packageDraft, unit: e.target.value })}/></label><label>Plan for tomorrow<textarea maxLength={2000} value={packageDraft.tomorrowPlan} onChange={(e) => setPackageDraft({ ...packageDraft, tomorrowPlan: e.target.value })}/></label><label className="site-check"><input type="checkbox" checked={packageDraft.critical} onChange={(e) => setPackageDraft({ ...packageDraft, critical: e.target.checked })}/>Critical activity</label><button disabled={busy || reason.trim().length < 3 || !packageDraft.title.trim() || !packageDraft.date || !packageDraft.plannedPercent || !packageDraft.plannedQuantity || !packageDraft.unit.trim()}>Create package</button></form></section>}

      <section className="site-panel"><h2>Work packages</h2>{detail.packages.length === 0 && <p role="status">No site work packages have been created.</p>}{detail.packages.map((item) => <article className="site-record" key={item.id}><header><div><h3>{item.data.title}</h3><p>{item.data.date} · {item.state} · version {item.version}{item.data.critical ? " · CRITICAL" : ""}</p></div><span className={`site-state site-state-${item.state.toLowerCase()}`}>{item.state}</span></header><dl className="site-facts"><div><dt>Planned</dt><dd>{item.data.plannedPercent}% · {item.data.plannedQuantity} {item.data.unit}</dd></div><div><dt>Actual</dt><dd>{item.data.actualPercent ?? "Not reported"}{item.data.actualPercent !== null ? "%" : ""} · {item.data.actualQuantity ?? "Not reported"} {item.data.unit}</dd></div><div><dt>Quality / materials</dt><dd>{item.data.qualityStatus} / {item.data.materialStatus}</dd></div></dl>{item.data.blockers && <p><strong>Blockers:</strong> {item.data.blockers}</p>}{item.data.photoEvidence.length > 0 && <p><strong>Evidence:</strong> {item.data.photoEvidence.map(evidenceLabel).join(", ")}</p>}
        {detail.capabilities.work && <form className="site-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate(`/packages/${encodeURIComponent(item.id)}/progress`, detail.version, { actualPercent: String(form.get("actualPercent")), actualQuantity: String(form.get("actualQuantity")), qualityStatus: String(form.get("qualityStatus")), materialStatus: String(form.get("materialStatus")), blockers: String(form.get("blockers")), tomorrowPlan: String(form.get("tomorrowPlan")), photoIds: packagePhotoIds }, "Progress observation saved."); }}><h4>Report current progress</h4><label>Actual progress (%)<input name="actualPercent" type="number" min="0" max="100" step="0.01" defaultValue={item.data.actualPercent ?? ""} required/></label><label>Actual quantity<input name="actualQuantity" inputMode="decimal" defaultValue={item.data.actualQuantity ?? ""} required/></label><label>Quality status<select name="qualityStatus" defaultValue={item.data.qualityStatus}><option>PENDING</option><option>PASSED</option><option>FAILED</option></select></label><label>Material status<input name="materialStatus" defaultValue={item.data.materialStatus} required/></label><label>Blockers<textarea name="blockers" defaultValue={item.data.blockers}/></label><label>Plan for tomorrow<textarea name="tomorrowPlan" defaultValue={item.data.tomorrowPlan}/></label>{photoPicker("Attach authorized image evidence", packagePhotoIds, setPackagePhotoIds)}<button disabled={busy || reason.trim().length < 3}>Save progress</button></form>}
        {detail.capabilities.manage && item.state === "OPEN" && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void mutate(`/packages/${encodeURIComponent(item.id)}/complete`, detail.version, {}, "Package completion decision recorded.")}>Decide package complete</button>}
      </article>)}</section>

      <section className="site-panel"><h2>Manpower and attendance</h2><p>Manual trade counts are site observations. Workforce attendance is displayed separately.</p><p>Assigned attendance today: {detail.workforce.attendance.map((person) => `${person.label} (${person.state.toLowerCase()}, ${person.mode.toLowerCase()}${person.provisional ? ", provisional" : ""})`).join(" · ") || "No relevant attendance records."}</p>{detail.capabilities.work && <form className="site-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/manpower`, detail.version, { date: manpower.date, trade: manpower.trade.trim(), count: Number(manpower.count), employeeAccountIds: manpower.employeeAccountIds, note: manpower.note.trim() }, "Manpower observation saved."); }}><h3>Record a trade count</h3><label>Date<input type="date" required value={manpower.date} onChange={(e) => setManpower({ ...manpower, date: e.target.value })}/></label><label>Trade<input required maxLength={120} value={manpower.trade} onChange={(e) => setManpower({ ...manpower, trade: e.target.value })}/></label><label>People counted<input type="number" min="0" step="1" required value={manpower.count} onChange={(e) => setManpower({ ...manpower, count: e.target.value })}/></label><label>Note<textarea value={manpower.note} onChange={(e) => setManpower({ ...manpower, note: e.target.value })}/></label><label>Assigned people, if known<select multiple value={manpower.employeeAccountIds} onChange={(e) => setManpower({ ...manpower, employeeAccountIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>{detail.people.filter((person) => person.canWork).map((person) => <option key={person.accountId} value={person.accountId}>{person.label}</option>)}</select></label><button disabled={busy || reason.trim().length < 3 || !manpower.date || !manpower.trade.trim() || manpower.count === ""}>Save manpower</button></form>}<ul>{detail.manpower.map((item) => <li key={item.id}>{item.data.date} · {item.data.trade}: {item.data.count} · {item.data.note}</li>)}</ul></section>

      <section className="site-panel"><h2>Daily reports</h2>{detail.capabilities.work && <form className="site-form" onSubmit={(event) => { event.preventDefault(); const { manpowerTrade, manpowerCount, ...reportFields } = report; void mutate(`/projects/${encodeURIComponent(projectId)}/reports`, detail.version, { date: detail.today, ...reportFields, manpower: manpowerTrade.trim() && manpowerCount !== "" ? [{ trade: manpowerTrade.trim(), count: Number(manpowerCount) }] : [] }, "Daily report draft saved."); setReport(blankReport()); }}><h3>Save a new daily report draft</h3><label>Work completed today<textarea required value={report.workCompleted} onChange={(e) => setReport({ ...report, workCompleted: e.target.value })}/></label><label>Manpower trade<input value={report.manpowerTrade} onChange={(e) => setReport({ ...report, manpowerTrade: e.target.value })}/></label><label>People reported for trade<input type="number" min="0" step="1" value={report.manpowerCount} onChange={(e) => setReport({ ...report, manpowerCount: e.target.value })}/></label><label>Materials received<textarea value={report.materialsReceived} onChange={(e) => setReport({ ...report, materialsReceived: e.target.value })}/></label><label>Issues<textarea value={report.issues} onChange={(e) => setReport({ ...report, issues: e.target.value })}/></label><label>Delay causes<textarea value={report.delayCauses} onChange={(e) => setReport({ ...report, delayCauses: e.target.value })}/></label><label>Plan for tomorrow<textarea required value={report.tomorrowPlan} onChange={(e) => setReport({ ...report, tomorrowPlan: e.target.value })}/></label>{photoPicker("Authorized photo evidence", report.photoIds, (ids) => setReport({ ...report, photoIds: ids }))}<button disabled={busy || reason.trim().length < 3 || !report.workCompleted.trim() || !report.tomorrowPlan.trim() || Boolean(report.manpowerTrade.trim() && report.manpowerCount === "")}>Save report draft</button></form>}{detail.reports.map((item) => <article className="site-record" key={item.id}><h3>{item.data.date} · {item.state}</h3><p>{item.data.workCompleted}</p><p><strong>Materials:</strong> {item.data.materialsReceived || "None recorded"}</p><p><strong>Issues:</strong> {item.data.issues || "None recorded"} · <strong>Delay:</strong> {item.data.delayCauses || "None recorded"}</p><p><strong>Tomorrow:</strong> {item.data.tomorrowPlan}</p>{item.data.photoEvidence.length > 0 && <p>Photos: {item.data.photoEvidence.map(evidenceLabel).join(", ")}</p>}{item.state === "CONFIRMED" && <p role="status">Confirmed by {item.data.confirmedBy} · {item.data.confirmedAt}</p>}{item.state === "DRAFT" && detail.capabilities.confirm && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void mutate(`/reports/${encodeURIComponent(item.id)}/confirm`, detail.version, {}, "Daily report confirmed by the named responsible person.")}>Confirm daily report</button>}</article>)}</section>

      <section className="site-panel"><h2>Snags and independent checks</h2>{detail.capabilities.work && <form className="site-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/snags`, detail.version, { title: snagDraft.title.trim(), description: snagDraft.description.trim(), ...(snagDraft.packageId ? { packageId: snagDraft.packageId } : {}), photoIds: snagPhotoIds }, "Snag recorded."); }}><h3>Record a snag</h3><label>Title<input required value={snagDraft.title} onChange={(e) => setSnagDraft({ ...snagDraft, title: e.target.value })}/></label><label>Description<textarea required value={snagDraft.description} onChange={(e) => setSnagDraft({ ...snagDraft, description: e.target.value })}/></label><label>Related work package<select value={snagDraft.packageId} onChange={(e) => setSnagDraft({ ...snagDraft, packageId: e.target.value })}><option value="">No package</option>{detail.packages.map((item) => <option key={item.id} value={item.id}>{item.data.title}</option>)}</select></label>{photoPicker("Initial snag photos", snagPhotoIds, setSnagPhotoIds)}<button disabled={busy || reason.trim().length < 3 || !snagDraft.title.trim() || !snagDraft.description.trim()}>Create snag</button></form>}{detail.snags.map((snag) => { const action = actionsFor(snag); return <article className="site-record" key={snag.id}><header><div><h3>{snag.data.title}</h3><p>{snag.state.replaceAll("_", " ")} · repair {snag.data.repairGeneration} · version {snag.version}</p></div><span className="site-state">{snag.state.replaceAll("_", " ")}</span></header><p>{snag.data.description}</p>{snag.data.repairNote && <p><strong>Latest repair note:</strong> {snag.data.repairNote}</p>}
        {snag.capabilities.assign && <form className="site-form site-inline" onSubmit={(event) => { event.preventDefault(); void mutate(`/snags/${encodeURIComponent(snag.id)}/assign`, detail.version, { fixerAccountId: action.fixer }, "Fixer assigned; prior repair history is retained."); }}><label>Assign fixer<select required value={action.fixer} onChange={(e) => updateSnag(snag.id, { fixer: e.target.value })}><option value="">Choose assigned person</option>{detail.people.filter((person) => person.canWork && person.accountId !== action.verifier).map((person) => <option key={person.accountId} value={person.accountId}>{person.label}</option>)}</select></label><button disabled={busy || reason.trim().length < 3 || !action.fixer}>Assign fixer</button></form>}
        {snag.capabilities.start && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void mutate(`/snags/${encodeURIComponent(snag.id)}/start`, detail.version, {}, "Repair started by the assigned fixer.")}>Start repair</button>}
        {snag.capabilities.ready && <form className="site-form site-inline" onSubmit={(event) => { event.preventDefault(); void mutate(`/snags/${encodeURIComponent(snag.id)}/ready`, detail.version, { note: action.note.trim(), photoIds: action.photoIds }, "Repair submitted for independent verification."); }}><label>Repair note<textarea required value={action.note} onChange={(e) => updateSnag(snag.id, { note: e.target.value })}/></label>{photoPicker("Repair evidence", action.photoIds, (ids) => updateSnag(snag.id, { photoIds: ids }))}<button disabled={busy || reason.trim().length < 3 || !action.note.trim()}>Ready for verification</button></form>}
        {snag.capabilities.appointVerifier && <form className="site-form site-inline" onSubmit={(event) => { event.preventDefault(); void mutate(`/snags/${encodeURIComponent(snag.id)}/verifier`, detail.version, { verifierAccountId: action.verifier }, "Independent verifier appointed."); }}><label>Name verifier<select required value={action.verifier} onChange={(e) => updateSnag(snag.id, { verifier: e.target.value })}><option value="">Choose a verifier who did not perform the repair</option>{detail.people.filter((person) => person.canWork && person.accountId !== snag.data.fixerAccountId).map((person) => <option key={person.accountId} value={person.accountId}>{person.label}</option>)}</select></label><button disabled={busy || reason.trim().length < 3 || !action.verifier}>Appoint verifier</button></form>}
        {snag.capabilities.verify && <form className="site-form site-inline" onSubmit={(event) => { event.preventDefault(); void mutate(`/snags/${encodeURIComponent(snag.id)}/verify`, detail.version, { outcome: action.outcome, note: action.note.trim(), photoIds: action.photoIds }, action.outcome === "PASSED" ? "Verification passed; management must decide separately whether to close." : "Verification failed; the same snag returns to repair with the failed attempt retained."); }}><label>Verification outcome<select value={action.outcome} onChange={(e) => updateSnag(snag.id, { outcome: e.target.value as "PASSED" | "FAILED" })}><option value="PASSED">Pass current repair</option><option value="FAILED">Fail current repair</option></select></label><label>Verification note<textarea required minLength={3} value={action.note} onChange={(e) => updateSnag(snag.id, { note: e.target.value })}/></label>{photoPicker("Verification evidence", action.photoIds, (ids) => updateSnag(snag.id, { photoIds: ids }))}<button disabled={busy || reason.trim().length < 3 || action.note.trim().length < 3}>Record independent check</button></form>}
        {snag.capabilities.close && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void mutate(`/snags/${encodeURIComponent(snag.id)}/close`, detail.version, {}, "Separate management closure recorded against the latest passed verification.")}>Close verified snag</button>}
        {snag.attempts.length > 0 && <details><summary>Verification attempts ({snag.attempts.length})</summary><ol>{snag.attempts.map((attempt) => <li key={attempt.id}>{attempt.outcome} · repair {attempt.repairGeneration} · fixer {attempt.fixerAccountId} · verifier {attempt.verifierAccountId} · {attempt.occurredAt}<p>{attempt.note}</p></li>)}</ol></details>}
      </article>; })}</section>

      <section className="site-panel"><h2>Site handover</h2><p>Management makes a separate handover decision after every current package is complete, package quality has passed, and all snags are closed. Client acceptance and project completion remain separate.</p>{detail.capabilities.handover && <form className="site-form" onSubmit={(event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/handover`, detail.version, { note: (event.currentTarget.elements.namedItem("handoverNote") as HTMLTextAreaElement).value.trim() }, "Site handover decision recorded with its current package, snag, and report evidence."); }}><label>Handover decision note<textarea name="handoverNote" required minLength={3} maxLength={1000}/></label><button disabled={busy || reason.trim().length < 3}>Record site handover</button></form>}{detail.handovers.map((item) => <article className="site-record" key={item.id}><h3>Handover {item.data.decidedAt}</h3><p>{item.data.note}</p><p>Decision by {item.data.decidedBy}. Snapshots: {item.data.packages.length} packages, {item.data.snags.length} closed snags, {item.data.reportIds.length} reports.</p></article>)}</section>
      <details className="site-history"><summary>Project site history ({detail.history.length} events)</summary><ol>{detail.history.map((entry, index) => <li key={`${entry.eventName}-${entry.occurredAt}-${index}`}><strong>{entry.safeLabel ?? entry.eventName.replaceAll("_", " ")}</strong><span>{entry.occurredAt} · {entry.actorId} · {entry.reason}</span><small>Version {entry.beforeVersion ?? "—"} → {entry.afterVersion ?? "—"}</small></li>)}</ol></details>
    </>}
  </main>;
}
