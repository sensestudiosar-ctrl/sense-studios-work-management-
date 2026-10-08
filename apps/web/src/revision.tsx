import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./revision.css";

const API = "/api/v1";
type Branch = { id: string; name: string };
type Project = { id: string; title: string };
type Setup = { branches: Branch[] };
type ProjectPage = { items: Project[] };
type FileEntry = { id: string; fileName: string; mimeType: string; sizeBytes: number; sha256: string };
type FileRegister = { files: FileEntry[] };
type Revision = {
  id: string; fileId: string; blobId: string; series: "R" | "CR"; number: number; label: string;
  state: "WORKING" | "SUBMITTED" | "REVIEWED" | "APPROVED" | "ISSUED" | "SUPERSEDED";
  isCurrent: boolean; issueEligible: boolean; issueBlocker: string | null; sha256: string; fileName: string; mimeType: string; sizeBytes: number;
  reason: string; createdAt: string; createdById: string; ordinal: number;
};
type Drawing = {
  id: string; documentNumber: string; title: string; version: number; clientApprovalRequired: boolean;
  revisions: Revision[];
};
type Transmittal = {
  id: string; purpose: string; issuedAt: string; senderId: string; senderName?: string; canAcknowledge?: boolean;
  items: Array<{ revisionId: string; drawingId: string; label: string; sha256: string }>;
  recipients: Array<{ accountId: string; name?: string; acknowledgementRequired: boolean; acknowledgedAt: string | null; note: string | null }>;
};
type Register = {
  drawings: Drawing[]; transmittals: Transmittal[];
  capabilities: { createRevision: boolean; issue: boolean; selectClientReview: boolean };
  issueBlocker: string | null; eligibleRecipients?: Array<{ accountId: string; name: string; revisionIds: string[] }>;
};

function statusOf(error: unknown): number { return error instanceof Error ? (error as Error & { status?: number }).status ?? 0 : 0; }
async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw Object.assign(new Error("request-failed"), { status: response.status });
  return response.json() as Promise<T>;
}
function errorText(error: unknown): string {
  const status = statusOf(error);
  if (status === 403 || status === 404) return "You do not have access to this project’s drawing register.";
  if (status === 409) return "The register changed or this file is already attached to a revision. Refresh the register and choose another file.";
  if (status === 413) return "This file is larger than the server’s configured upload limit.";
  if (status >= 500) return "The revision service is unavailable. Try again shortly.";
  return "The revision service could not complete the request. Try again.";
}
function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"]; let value = bytes; let index = -1;
  do { value /= 1024; index += 1; } while (value >= 1024 && index < units.length - 1);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}
function stateLabel(state: Revision["state"]): string {
  return state === "SUPERSEDED" ? "Superseded — Do Not Use" : state.charAt(0) + state.slice(1).toLowerCase();
}

export function RevisionWorkspace({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [requestedProjectId, setRequestedProjectId] = useState(() => new URLSearchParams(window.location.search).get("projectId") ?? "");
  const requestedProjectIdRef = useRef(requestedProjectId);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [register, setRegister] = useState<Register>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestEpoch = useRef(0);
  const [documentNumber, setDocumentNumber] = useState("");
  const [title, setTitle] = useState("");
  const [initialFileId, setInitialFileId] = useState("");
  const [initialReason, setInitialReason] = useState("");
  const [selectedDrawingId, setSelectedDrawingId] = useState("");
  const [series, setSeries] = useState<"R" | "CR">("R");
  const [revisionFileId, setRevisionFileId] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [clientReviewDrawingId, setClientReviewDrawingId] = useState("");
  const [clientReviewReason, setClientReviewReason] = useState("");
  const [issueRevisionIds, setIssueRevisionIds] = useState<string[]>([]);
  const [issueRecipientIds, setIssueRecipientIds] = useState<string[]>([]);
  const [issuePurpose, setIssuePurpose] = useState("");
  const [issueReason, setIssueReason] = useState("");
  const [acknowledgementRequired, setAcknowledgementRequired] = useState(false);
  const [acknowledgementInputs, setAcknowledgementInputs] = useState<Record<string, { reason: string; note: string }>>({});

  const loadProject = useCallback(async (id: string, epoch: number): Promise<void> => {
    const [nextRegister, fileRegister] = await Promise.all([
      json<Register>(await fetch(`${API}/revisions/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" })),
      json<FileRegister>(await fetch(`${API}/documents/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" })),
    ]);
    if (epoch !== requestEpoch.current) return;
    setRegister(nextRegister);
    setFiles(fileRegister.files);
    setSelectedDrawingId((current) => nextRegister.drawings.some((drawing) => drawing.id === current) ? current : nextRegister.drawings[0]?.id ?? "");
  }, []);

  const loadSetup = useCallback(async (requestedId = requestedProjectIdRef.current): Promise<void> => {
    const epoch = ++requestEpoch.current;
    setLoading(true); setError(""); setDenied(false);
    try {
      const setup = await json<Setup>(await fetch(`${API}/projects/setup`, { credentials: "include", cache: "no-store" }));
      if (epoch !== requestEpoch.current) return;
      const preferredBranch = setup.branches.find((branch) => branch.id === branchId) ?? setup.branches[0];
      if (!preferredBranch) { setBranches([]); setProjects([]); setBranchId(""); setProjectId(""); setFiles([]); setRegister(undefined); return; }
      let nextBranch = preferredBranch.id;
      let nextProjects: Project[] = [];
      if (requestedId) {
        for (const branch of setup.branches) {
          const branchProjects: Project[] = [];
          for (let offset = 0; offset <= 100_000; offset += 50) {
            const page = await json<ProjectPage>(await fetch(`${API}/projects?branchId=${encodeURIComponent(branch.id)}&offset=${offset}&limit=50`, { credentials: "include", cache: "no-store" }));
            if (epoch !== requestEpoch.current) return;
            branchProjects.push(...page.items);
            if (page.items.length < 50) break;
          }
          if (branchProjects.some((project) => project.id === requestedId)) {
            nextBranch = branch.id; nextProjects = branchProjects; break;
          }
          if (branch.id === preferredBranch.id) nextProjects = branchProjects;
        }
      } else {
        const page = await json<ProjectPage>(await fetch(`${API}/projects?branchId=${encodeURIComponent(nextBranch)}&offset=0&limit=50`, { credentials: "include", cache: "no-store" }));
        nextProjects = page.items;
      }
      if (epoch !== requestEpoch.current) return;
      const nextProject = requestedId && nextProjects.some((project) => project.id === requestedId) ? requestedId : "";
      setBranches(setup.branches); setBranchId(nextBranch); setProjects(nextProjects); setProjectId(nextProject);
      if (nextProject) await loadProject(nextProject, epoch);
      else { setFiles([]); setRegister(undefined); }
    } catch (cause) {
      if (epoch !== requestEpoch.current) return;
      setFiles([]); setRegister(undefined);
      if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause));
    } finally { if (epoch === requestEpoch.current) setLoading(false); }
  }, [branchId, loadProject]);

  useEffect(() => { void loadSetup(); }, []);

  useEffect(() => {
    const onPopState = (): void => {
      const requested = new URLSearchParams(window.location.search).get("projectId") ?? "";
      requestedProjectIdRef.current = requested;
      setRequestedProjectId(requested);
      void loadSetup(requested);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadSetup]);

  const refresh = async (): Promise<void> => {
    if (busy) return;
    const epoch = ++requestEpoch.current;
    setLoading(true); setError(""); setDenied(false);
    try {
      if (projectId) await loadProject(projectId, epoch); else await loadSetup();
    } catch (cause) { if (epoch === requestEpoch.current) { if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause)); } }
    finally { if (epoch === requestEpoch.current) setLoading(false); }
  };

  const selectBranch = async (id: string): Promise<void> => {
    const url = new URL(window.location.href); url.searchParams.delete("projectId"); window.history.pushState(null, "", url);
    requestedProjectIdRef.current = ""; setRequestedProjectId("");
    const epoch = ++requestEpoch.current;
    setBranchId(id); setProjectId(""); setProjects([]); setFiles([]); setRegister(undefined); setLoading(true); setError(""); setDenied(false);
    try {
      const page = await json<ProjectPage>(await fetch(`${API}/projects?branchId=${encodeURIComponent(id)}&offset=0&limit=50`, { credentials: "include", cache: "no-store" }));
      if (epoch !== requestEpoch.current) return;
      setProjects(page.items);
    } catch (cause) { if (epoch === requestEpoch.current) { if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause)); } }
    finally { if (epoch === requestEpoch.current) setLoading(false); }
  };

  const selectProject = async (id: string): Promise<void> => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("projectId", id); else url.searchParams.delete("projectId");
    window.history.pushState({ revisionProjectSelection: true }, "", url);
    requestedProjectIdRef.current = id; setRequestedProjectId(id);
    const epoch = ++requestEpoch.current;
    setProjectId(id); setRegister(undefined); setFiles([]); setLoading(true); setError(""); setDenied(false);
    try {
      if (!id) return;
      await loadProject(id, epoch);
    }
    catch (cause) { if (epoch === requestEpoch.current) { if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause)); } }
    finally { if (epoch === requestEpoch.current) setLoading(false); }
  };

  const post = async (url: string, body: unknown): Promise<void> => {
    await json<unknown>(await fetch(url, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body),
    }));
  };

  const createDrawing = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!projectId || !register?.capabilities.createRevision || busy || !initialFileId || initialReason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await post(`${API}/revisions/projects/${encodeURIComponent(projectId)}/drawings`, {
        documentNumber: documentNumber.trim(), title: title.trim(), fileId: initialFileId, reason: initialReason.trim(),
      });
      setDocumentNumber(""); setTitle(""); setInitialFileId(""); setInitialReason("");
      const epoch = ++requestEpoch.current;
      await loadProject(projectId, epoch); setNotice("Drawing created with immutable revision R0.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const addRevision = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const drawing = register?.drawings.find((item) => item.id === selectedDrawingId);
    if (!projectId || !register?.capabilities.createRevision || !drawing || busy || !revisionFileId || revisionReason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await post(`${API}/revisions/drawings/${encodeURIComponent(drawing.id)}`, {
        fileId: revisionFileId, series, expectedVersion: drawing.version, reason: revisionReason.trim(),
      });
      setRevisionFileId(""); setRevisionReason("");
      const epoch = ++requestEpoch.current;
      await loadProject(projectId, epoch); setNotice(`Revision added to ${drawing.documentNumber}. The new revision is in Working state.`);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const requireClientReview = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const drawing = register?.drawings.find((item) => item.id === clientReviewDrawingId);
    if (!drawing || !projectId || !register?.capabilities.selectClientReview || busy || clientReviewReason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await post(`${API}/revisions/drawings/${encodeURIComponent(drawing.id)}/client-review`, { expectedVersion: drawing.version, reason: clientReviewReason.trim() });
      setClientReviewReason(""); setClientReviewDrawingId("");
      const epoch = ++requestEpoch.current;
      await loadProject(projectId, epoch); setNotice(`Client review was recorded for ${drawing.documentNumber}. Client decisions remain in S14.`);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const issueRevisions = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const eligibleIds = (register?.eligibleRecipients ?? []).filter((recipient) => issueRevisionIds.every((id) => recipient.revisionIds.includes(id))).map((recipient) => recipient.accountId);
    const recipientAccountIds = issueRecipientIds.filter((id) => eligibleIds.includes(id));
    if (!projectId || !register?.capabilities.issue || busy || !issueRevisionIds.length || !recipientAccountIds.length || issuePurpose.trim().length < 3 || issueReason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await post(`${API}/revisions/projects/${encodeURIComponent(projectId)}/issues`, {
        revisionIds: issueRevisionIds, recipientAccountIds, purpose: issuePurpose.trim(), reason: issueReason.trim(), acknowledgementRequired,
      });
      setIssueRevisionIds([]); setIssueRecipientIds([]); setIssuePurpose(""); setIssueReason(""); setAcknowledgementRequired(false);
      const epoch = ++requestEpoch.current;
      await loadProject(projectId, epoch); setNotice("Transmittal recorded.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const acknowledge = async (transmittalId: string): Promise<void> => {
    const value = acknowledgementInputs[transmittalId] ?? { reason: "", note: "" };
    if (busy || value.reason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await post(`${API}/revisions/transmittals/${encodeURIComponent(transmittalId)}/acknowledge`, { reason: value.reason.trim(), ...(value.note.trim() ? { note: value.note.trim() } : {}) });
      setAcknowledgementInputs((current) => ({ ...current, [transmittalId]: { reason: "", note: "" } }));
      const epoch = ++requestEpoch.current;
      await loadProject(projectId, epoch); setNotice("Transmittal acknowledged.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const claimedFileIds = useMemo(() => new Set(register?.drawings.flatMap((drawing) => drawing.revisions.map((revision) => revision.fileId)) ?? []), [register]);
  const availableFiles = useMemo(() => files.filter((file) => !claimedFileIds.has(file.id)), [claimedFileIds, files]);
  const selectedDrawing = register?.drawings.find((drawing) => drawing.id === selectedDrawingId);
  const issueableRevisions = register?.drawings.flatMap((drawing) => drawing.revisions.filter((revision) => revision.issueEligible).map((revision) => ({ drawing, revision }))) ?? [];
  const selectedIssueRecipients = (register?.eligibleRecipients ?? []).filter((recipient) => issueRevisionIds.length
    ? issueRevisionIds.every((revisionId) => recipient.revisionIds.includes(revisionId))
    : recipient.revisionIds.length > 0);
  const issueGateText = register?.issueBlocker || (register && !register.capabilities.issue ? "Formal issue is unavailable for this account or project." : "");

  return <section className="revision-workspace" aria-labelledby="revisions-heading">
    <header className="revision-header"><div><p className="revision-eyebrow">DESIGN CONTROL</p><h1 id="revisions-heading">Drawing register</h1><p>Revision files are retained as immutable, checksum-bound project records.</p></div><button type="button" onClick={() => void refresh()} disabled={loading || busy}>Refresh</button></header>
    {error && <p className="revision-error" role="alert">{error} <button type="button" onClick={() => void refresh()} disabled={loading || busy}>Try again</button></p>}
    {denied && <p className="revision-denied" role="alert">You are not authorized to view this project’s drawing register. Ask the Owner to review your project assignment and document access.</p>}
    {notice && <p className="revision-notice" role="status">{notice}</p>}
    {loading && <p className="revision-muted" role="status">Loading project drawing access…</p>}
    {!loading && !denied && !error && <>
      {branches.length ? <label className="revision-picker">Owning branch<select aria-label="Revision project branch" value={branchId} onChange={(event) => void selectBranch(event.target.value)} disabled={busy}><option value="">Choose branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label> : <p className="revision-muted">No active branches are available.</p>}
      {branchId && <label className="revision-picker">Project<select aria-label="Revision project" value={projectId} onChange={(event) => void selectProject(event.target.value)} disabled={busy}><option value="">Choose a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}
      {!projectId && !projects.length && branchId && !requestedProjectId && <p className="revision-muted" role="status">No projects are available for this branch.</p>}
      {requestedProjectId && !projectId && !loading && !error && !denied && <p className="revision-unavailable" role="status">The requested project is unavailable or your access has changed. Choose an authorized project.</p>}
      {register && <>
        <div className="revision-register-heading"><div><span className="revision-eyebrow">REGISTER</span><h2>{projects.find((project) => project.id === projectId)?.title ?? "Project drawings"}</h2></div><span>{register.drawings.length} {register.drawings.length === 1 ? "drawing" : "drawings"}</span></div>
        {issueGateText && <aside className="revision-issue-gate" aria-label="Formal issue gate"><strong>Formal issue is gated</strong><p>{issueGateText}</p>{register.drawings.some((drawing) => drawing.clientApprovalRequired || drawing.revisions.some((revision) => revision.series === "CR")) && <p>Drawings requiring client approval and CR revisions also need the exact client decision and portal evidence from S14.</p>}</aside>}
        <div className="revision-columns">
          <section className="revision-list" aria-labelledby="drawing-list-heading"><h2 id="drawing-list-heading">Drawings and revision history</h2>
            {!register.drawings.length ? <p className="revision-muted" role="status">No drawings have been registered for this project.</p> : register.drawings.map((drawing) => {
              const current = drawing.revisions.find((revision) => revision.isCurrent);
              return <article className="revision-drawing" key={drawing.id}>
                <header><div><p className="revision-eyebrow">{drawing.documentNumber}</p><h3>{drawing.title}</h3></div><span className="revision-current">{current ? `Current ${current.label}` : "No current approved revision"}</span></header>
                {(drawing.clientApprovalRequired || drawing.revisions.some((revision) => revision.series === "CR")) && <p className="revision-client-gate">Client approval is required before formal issue. Exact client decisions and portal evidence belong to S14.</p>}
                {register.capabilities.selectClientReview && !drawing.clientApprovalRequired && (clientReviewDrawingId === drawing.id ? <form className="revision-client-review-form" onSubmit={(event) => void requireClientReview(event)}>
                  <label>Reason for requiring client review<input aria-label={`Client review reason for ${drawing.documentNumber}`} value={clientReviewReason} onChange={(event) => setClientReviewReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
                  <button className="revision-primary" type="submit" disabled={busy || clientReviewReason.trim().length < 3}>{busy ? "Saving…" : "Confirm client review requirement"}</button>
                  <button type="button" onClick={() => { setClientReviewDrawingId(""); setClientReviewReason(""); }} disabled={busy}>Cancel</button>
                </form> : <button className="revision-secondary" type="button" onClick={() => setClientReviewDrawingId(drawing.id)}>Require client review</button>)}
                {!current && <p className="revision-muted">No approved revision is current. New revisions remain Working until the review workflow in S13 is available.</p>}
                {!drawing.revisions.length ? <p className="revision-muted">No revisions are available.</p> : <ol className="revision-history">{drawing.revisions.map((revision) => <li key={revision.id} className={revision.isCurrent ? "is-current" : ""}>
                  <div className="revision-item-heading"><strong>{revision.label}</strong><span className={`revision-state revision-state-${revision.state.toLowerCase()}`}>{stateLabel(revision.state)}</span></div>
                  <p>{revision.fileName} · {humanSize(revision.sizeBytes)} · {displayDate(revision.createdAt)}</p>
                  <p className="revision-reason">Reason: {revision.reason}</p>
                  <p className="revision-checksum">SHA-256 {revision.sha256}</p>
                  {revision.issueBlocker && <p className="revision-client-gate">Issue unavailable: {revision.issueBlocker}</p>}
                  {revision.state === "SUPERSEDED" && <p className="revision-superseded">Superseded — Do Not Use</p>}
                  <a href={`${API}/revisions/${encodeURIComponent(revision.id)}/stream`} className="revision-download">Download retained revision</a>
                </li>)}</ol>}
              </article>;
            })}
          </section>
          <div className="revision-forms">
            {register.capabilities.createRevision && <form className="revision-panel revision-form" onSubmit={(event) => void createDrawing(event)}>
              <h2>Create drawing</h2><p className="revision-muted">The selected file becomes the immutable initial revision R0.</p>
              <label>Document number<input aria-label="Drawing document number" value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} maxLength={80} required /></label>
              <label>Drawing title<input aria-label="Drawing title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required /></label>
              <label>Initial file<select aria-label="Drawing file" value={initialFileId} onChange={(event) => setInitialFileId(event.target.value)} required><option value="">Choose an available project file</option>{availableFiles.map((file) => <option key={file.id} value={file.id}>{file.fileName} · {humanSize(file.sizeBytes)}</option>)}</select></label>
              <label>Revision reason<input aria-label="Initial revision reason" value={initialReason} onChange={(event) => setInitialReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
              <p className="revision-client-gate">Client approval is required for formal issue.</p>
              <button className="revision-primary" type="submit" disabled={busy || !documentNumber.trim() || !title.trim() || !initialFileId || initialReason.trim().length < 3}>{busy ? "Saving…" : "Create drawing as R0"}</button>
              {!availableFiles.length && <p className="revision-muted">Upload an unclaimed file in Project documents before creating a drawing.</p>}
            </form>}
            {register.capabilities.createRevision && !!register.drawings.length && <form className="revision-panel revision-form" onSubmit={(event) => void addRevision(event)}>
              <h2>Add revision</h2><p className="revision-muted">Revision labels are assigned automatically and cannot replace prior files.</p>
              <label>Drawing<select aria-label="Drawing to revise" value={selectedDrawingId} onChange={(event) => setSelectedDrawingId(event.target.value)} required><option value="">Choose a drawing</option>{register.drawings.map((drawing) => <option key={drawing.id} value={drawing.id}>{drawing.documentNumber} · {drawing.title}</option>)}</select></label>
              <label>Revision series<select aria-label="Revision series" value={series} onChange={(event) => setSeries(event.target.value as "R" | "CR")}><option value="R">Internal revision (R)</option><option value="CR">Client review revision (CR)</option></select></label>
              <label>Revision file<select aria-label="Revision file" value={revisionFileId} onChange={(event) => setRevisionFileId(event.target.value)} required><option value="">Choose an available project file</option>{availableFiles.map((file) => <option key={file.id} value={file.id}>{file.fileName} · {humanSize(file.sizeBytes)}</option>)}</select></label>
              <label>Revision reason<input aria-label="Append revision reason" value={revisionReason} onChange={(event) => setRevisionReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
              <button className="revision-primary" type="submit" disabled={busy || !selectedDrawing || !revisionFileId || revisionReason.trim().length < 3}>{busy ? "Saving…" : "Add revision"}</button>
              {selectedDrawing && <p className="revision-muted">Current register version: {selectedDrawing.version}. A new revision remains Working and does not become current.</p>}
              {!availableFiles.length && <p className="revision-muted">No unclaimed project files are available for a new revision.</p>}
            </form>}
          </div>
        </div>
        {register.capabilities.issue && <form className="revision-panel revision-issue-form" onSubmit={(event) => void issueRevisions(event)}>
          <div><p className="revision-eyebrow">FORMAL ISSUE</p><h2>Create transmittal</h2></div>
          <p className="revision-muted">Only exact current approved revisions can be issued. Sending client-review material and recording client decisions remain in S14.</p>
          <fieldset><legend>Approved current revisions</legend>{issueableRevisions.length ? issueableRevisions.map(({ drawing, revision }) => <label key={revision.id}><input type="checkbox" checked={issueRevisionIds.includes(revision.id)} onChange={(event) => setIssueRevisionIds((current) => event.target.checked ? [...current, revision.id] : current.filter((id) => id !== revision.id))} /> {drawing.documentNumber} · {drawing.title} · {revision.label}</label>) : <p className="revision-muted">No current approved revisions are eligible to issue.</p>}</fieldset>
          <fieldset><legend>Named recipients</legend>{selectedIssueRecipients.length ? selectedIssueRecipients.map((recipient) => <label key={recipient.accountId}><input type="checkbox" checked={issueRecipientIds.includes(recipient.accountId)} onChange={(event) => setIssueRecipientIds((current) => event.target.checked ? [...current, recipient.accountId] : current.filter((id) => id !== recipient.accountId))} /> {recipient.name}</label>) : <p className="revision-muted">Choose revisions to see people who can access each selected file.</p>}</fieldset>
          <label>Transmittal purpose<input value={issuePurpose} onChange={(event) => setIssuePurpose(event.target.value)} minLength={3} maxLength={500} required /></label>
          <label>Issue reason<input value={issueReason} onChange={(event) => setIssueReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
          <label className="revision-checkbox"><input type="checkbox" checked={acknowledgementRequired} onChange={(event) => setAcknowledgementRequired(event.target.checked)} /> Require acknowledgement</label>
          <button className="revision-primary" type="submit" disabled={busy || !issueRevisionIds.length || !issueRecipientIds.some((id) => selectedIssueRecipients.some((recipient) => recipient.accountId === id)) || issuePurpose.trim().length < 3 || issueReason.trim().length < 3}>{busy ? "Issuing…" : "Issue selected revisions"}</button>
        </form>}
        <section className="revision-panel revision-transmittals" aria-labelledby="transmittals-heading"><div><p className="revision-eyebrow">ISSUE HISTORY</p><h2 id="transmittals-heading">Transmittals</h2></div>
          {!register.transmittals.length ? <p className="revision-muted" role="status">No transmittals have been issued for this project. Formal issue remains gated until the required review evidence is available.</p> : <ul className="revision-transmittal-list">{register.transmittals.map((transmittal) => <li key={transmittal.id}>
            <div><strong>{transmittal.purpose}</strong><small>Issued {displayDate(transmittal.issuedAt)} · Sender {transmittal.senderName ?? "Authorized sender"}</small><small>{transmittal.items.length} document {transmittal.items.length === 1 ? "item" : "items"}: {transmittal.items.map((item) => item.label).join(", ")}</small></div>
            <ul>{transmittal.recipients.map((recipient) => <li key={recipient.accountId}><span>{recipient.name ?? "Named recipient"}</span><span>{recipient.acknowledgementRequired ? recipient.acknowledgedAt ? `Acknowledged ${displayDate(recipient.acknowledgedAt)}` : "Acknowledgement required · pending" : "Acknowledgement not required"}{recipient.note ? ` · ${recipient.note}` : ""}</span></li>)}</ul>
            {transmittal.canAcknowledge && <div className="revision-acknowledge"><label>Acknowledgement reason<input value={acknowledgementInputs[transmittal.id]?.reason ?? ""} onChange={(event) => setAcknowledgementInputs((current) => ({ ...current, [transmittal.id]: { reason: event.target.value, note: current[transmittal.id]?.note ?? "" } }))} minLength={3} maxLength={1000} required /></label><label>Acknowledgement note<input value={acknowledgementInputs[transmittal.id]?.note ?? ""} onChange={(event) => setAcknowledgementInputs((current) => ({ ...current, [transmittal.id]: { reason: current[transmittal.id]?.reason ?? "", note: event.target.value } }))} maxLength={1000} /></label><button type="button" onClick={() => void acknowledge(transmittal.id)} disabled={busy || (acknowledgementInputs[transmittal.id]?.reason.trim().length ?? 0) < 3}>{busy ? "Saving…" : "Acknowledge transmittal"}</button></div>}
          </li>)}</ul>}
        </section>
      </>}
    </>}
  </section>;
}
