import { useCallback, useEffect, useRef, useState } from "react";
import "./document.css";

const API = "/api/v1";
type Branch = { id: string; name: string };
type Project = { id: string; title: string; status?: string; branchId?: string };
type Employee = { id: string; name: string; homeBranchId: string };
type Setup = { branches: Branch[]; employees?: Employee[] };
type ProjectPage = { branches: Branch[]; total: number; items: Project[] };
type Folder = { id: string; name: string; parentId: string | null; confidential: boolean; provisionState?: "READY" | "FAILED" | "PENDING"; provisionError?: string | null };
type FileEntry = { id: string; folderId: string; fileName: string; mimeType: string; sizeBytes: number; sha256: string; confidential: boolean; viewOnly: boolean; createdAt: string };
type Register = { project: { id: string; title: string }; folders: Folder[]; files: FileEntry[]; capabilities: { createFolder: boolean; upload: boolean; grant: boolean } };
type Grant = { id: string; resourceKind: "FOLDER" | "FILE"; resourceId: string; employeeId: string; reason: string; grantedAt: string };
type ActiveUpload = { file: File; uploadId: string; chunkSize: number; chunkIndex: number; chunks: number; confidential: boolean; viewOnly: boolean; reason: string; folderId: string; phase: "chunks" | "finalize" };

function statusOf(error: unknown): number { return error instanceof Error ? (error as Error & { status?: number }).status ?? 0 : 0; }
async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw Object.assign(new Error("request-failed"), { status: response.status });
  return response.json() as Promise<T>;
}
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"]; let value = bytes; let index = -1;
  do { value /= 1024; index += 1; } while (value >= 1024 && index < units.length - 1);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}
function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest("SHA-256", bytes).then((digest) => [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""));
}
function errorText(error: unknown): string {
  const status = statusOf(error);
  if (status === 403 || status === 404) return "You do not have access to this project’s document register.";
  if (status === 409) return "The project or document state changed. Refresh the register and try again.";
  if (status === 413) return "This file is larger than the server’s configured upload limit.";
  if (status >= 500) return "Document storage or service is unavailable. Try again shortly.";
  return "The document service could not complete the request. Try again.";
}

export function DocumentWorkspace({ csrfToken, owner = true }: { csrfToken: string; owner?: boolean }): React.JSX.Element {
  const initialProjectId = useRef(new URLSearchParams(window.location.search).get("projectId") ?? "");
  const [setup, setSetup] = useState<Setup>();
  const [branchId, setBranchId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [projectOffset, setProjectOffset] = useState(0);
  const [projectQuery, setProjectQuery] = useState("");
  const [appliedProjectQuery, setAppliedProjectQuery] = useState("");
  const [pickerReady, setPickerReady] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [register, setRegister] = useState<Register>();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantsError, setGrantsError] = useState("");
  const [folderId, setFolderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [provisioningFolderId, setProvisioningFolderId] = useState("");
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderParentId, setFolderParentId] = useState("");
  const [folderConfidential, setFolderConfidential] = useState(false);
  const [file, setFile] = useState<File>();
  const [confidential, setConfidential] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [reason, setReason] = useState("");
  const [activeUpload, setActiveUpload] = useState<ActiveUpload>();
  const [grantKind, setGrantKind] = useState<"FOLDER" | "FILE">("FOLDER");
  const [grantResourceId, setGrantResourceId] = useState("");
  const [grantEmployeeId, setGrantEmployeeId] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const generation = useRef(0);
  const pageSize = 50;

  const clearRegister = (): void => {
    setRegister(undefined); setFolders([]); setFiles([]); setGrants([]); setGrantsError(""); setGrantsLoading(false); setFolderId("");
  };

  const pickerUrl = (offset: number, selectedBranch = branchId, query = appliedProjectQuery): string => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(pageSize) });
    if (selectedBranch) params.set("branchId", selectedBranch);
    if (query) params.set("q", query);
    return `${API}/documents/project-picker?${params.toString()}`;
  };

  const loadProjectPage = useCallback(async (offset: number, selectedBranch = "", query = "", token = generation.current): Promise<void> => {
    const result = await json<ProjectPage>(await fetch(pickerUrl(offset, selectedBranch, query), { credentials: "include", cache: "no-store" }));
    if (token !== generation.current) return;
    setSetup({ branches: result.branches });
    setPickerReady(true);
    setProjects(result.items); setProjectTotal(result.total); setProjectOffset(offset);
    setBranchId(selectedBranch && result.branches.some((branch) => branch.id === selectedBranch) ? selectedBranch : "");
    setProjectId(""); clearRegister();
  }, [branchId, appliedProjectQuery]);

  const loadRegister = useCallback(async (id: string, token = generation.current): Promise<string> => {
    const value = await json<Register>(await fetch(`${API}/documents/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }));
    if (token !== generation.current) return "";
    setRegister(value); setFolders(value.folders); setFiles(value.files);
    setFolderId((current) => value.folders.some((folder) => folder.id === current) ? current : value.folders[0]?.id ?? "");
    if (value.capabilities.grant) {
      setGrantsLoading(true); setGrantsError("");
      try {
        const grantPage = await json<{ items: Grant[] }>(await fetch(`${API}/documents/projects/${encodeURIComponent(id)}/grants`, { credentials: "include", cache: "no-store" }));
        if (token !== generation.current) return "";
        setGrants(grantPage.items);
      } catch (cause) { if (token === generation.current) { setGrants([]); setGrantsError(errorText(cause)); } }
      finally { if (token === generation.current) setGrantsLoading(false); }
    } else { setGrants([]); setGrantsError(""); setGrantsLoading(false); }
    return value.project.id;
  }, []);

  const loadSetup = useCallback(async (): Promise<void> => {
    const token = ++generation.current;
    setLoading(true); setError(""); setDenied(false); clearRegister();
    try {
      if (owner) {
        const result = await json<Setup>(await fetch(`${API}/projects/setup`, { credentials: "include", cache: "no-store" }));
        if (token !== generation.current) return;
        setEmployees(result.employees ?? []);
      } else setEmployees([]);
      await loadProjectPage(0, "", appliedProjectQuery, token);
      const deepLinkedProjectId = initialProjectId.current;
      if (deepLinkedProjectId) {
        try {
          const authorizedProjectId = await loadRegister(deepLinkedProjectId, token);
          if (token === generation.current) {
            setProjectId(authorizedProjectId);
            initialProjectId.current = "";
          }
        } catch (cause) {
          if (token === generation.current) {
            if (statusOf(cause) === 403 || statusOf(cause) === 404) initialProjectId.current = "";
            setProjectId(""); clearRegister();
          }
          throw cause;
        }
      }
    } catch (cause) {
      if (token !== generation.current) return;
      clearRegister(); setProjectId(""); setProjects([]); setProjectTotal(0);
      if (initialProjectId.current && (statusOf(cause) === 403 || statusOf(cause) === 404)) initialProjectId.current = "";
      if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true);
      else setError(errorText(cause));
    } finally { if (token === generation.current) setLoading(false); }
  }, [owner, appliedProjectQuery, loadProjectPage, loadRegister]);

  useEffect(() => { void loadSetup(); return () => { generation.current += 1; }; }, []);

  const refresh = async (): Promise<void> => {
    if (busy) return;
    if (initialProjectId.current) { await loadSetup(); return; }
    const token = ++generation.current;
    setLoading(true); setError(""); setDenied(false);
    try {
      if (projectId) await loadRegister(projectId, token);
      else await loadProjectPage(projectOffset, branchId, appliedProjectQuery, token);
    } catch (cause) {
      if (token !== generation.current) return;
      clearRegister();
      if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause));
    } finally { if (token === generation.current) setLoading(false); }
  };

  const selectBranch = async (id: string): Promise<void> => {
    if (busy || activeUpload) return;
    initialProjectId.current = "";
    const token = ++generation.current;
    setBranchId(id); setProjectId(""); clearRegister(); setProjects([]); setProjectTotal(0); setProjectOffset(0); setLoading(true); setError(""); setDenied(false);
    try {
      await loadProjectPage(0, id, appliedProjectQuery, token);
    } catch (cause) { if (token === generation.current) { setProjects([]); setProjectTotal(0); clearRegister(); if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause)); } }
    finally { if (token === generation.current) setLoading(false); }
  };

  const selectProject = async (id: string): Promise<void> => {
    if (busy || activeUpload) return;
    initialProjectId.current = "";
    const token = ++generation.current;
    setProjectId(id); clearRegister(); setLoading(true); setError(""); setDenied(false);
    try { if (id) await loadRegister(id, token); }
    catch (cause) { if (token === generation.current) { clearRegister(); if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause)); } }
    finally { if (token === generation.current) setLoading(false); }
  };

  const applyProjectSearch = async (): Promise<void> => {
    if (busy || activeUpload) return;
    initialProjectId.current = "";
    const query = projectQuery.trim().slice(0, 160);
    const token = ++generation.current;
    setAppliedProjectQuery(query); setProjectId(""); clearRegister(); setProjects([]); setProjectTotal(0); setProjectOffset(0); setLoading(true); setError(""); setDenied(false);
    try { await loadProjectPage(0, branchId, query, token); }
    catch (cause) { if (token === generation.current) { clearRegister(); setProjects([]); setProjectTotal(0); if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause)); } }
    finally { if (token === generation.current) setLoading(false); }
  };

  const changeProjectPage = async (offset: number): Promise<void> => {
    if (busy || activeUpload || offset < 0 || offset >= projectTotal) return;
    initialProjectId.current = "";
    const token = ++generation.current;
    setProjectId(""); clearRegister(); setLoading(true); setError(""); setDenied(false);
    try { await loadProjectPage(offset, branchId, appliedProjectQuery, token); }
    catch (cause) { if (token === generation.current) { clearRegister(); setProjects([]); setProjectTotal(0); if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause)); } }
    finally { if (token === generation.current) setLoading(false); }
  };

  const post = async <T,>(url: string, body: unknown): Promise<T> => json<T>(await fetch(url, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body),
  }));

  const createFolder = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); if (!projectId || busy || reason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await post(`${API}/documents/projects/${encodeURIComponent(projectId)}/folders`, { name: folderName.trim(), ...(folderParentId ? { parentId: folderParentId } : {}), confidential: folderConfidential, reason: reason.trim() });
      setFolderName(""); setFolderParentId(""); setFolderConfidential(false); setReason(""); setNotice("Folder created."); await loadRegister(projectId);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const createGrant = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); if (!projectId || !register?.capabilities.grant || busy || !grantResourceId || !grantEmployeeId || grantReason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice(""); setGrantsError("");
    try {
      await post(`${API}/documents/projects/${encodeURIComponent(projectId)}/grants`, { resourceKind: grantKind, resourceId: grantResourceId, employeeId: grantEmployeeId, reason: grantReason.trim() });
      setGrantReason(""); setNotice("Confidential access granted."); await loadRegister(projectId);
    } catch (cause) { setGrantsError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const revokeGrant = async (grant: Grant): Promise<void> => {
    if (!register?.capabilities.grant || busy || grantReason.trim().length < 3) { setGrantsError("Enter a reason of at least 3 characters before revoking access."); return; }
    setBusy(true); setGrantsError(""); setError(""); setNotice("");
    try {
      await post(`${API}/documents/grants/${encodeURIComponent(grant.id)}/revoke`, { reason: grantReason.trim() });
      setGrantReason(""); setNotice("Document access revoked."); await loadRegister(projectId);
    } catch (cause) { setGrantsError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const clearProjectSearch = (): void => {
    if (busy || activeUpload) return;
    setProjectQuery("");
    const token = ++generation.current;
    setAppliedProjectQuery(""); setProjectId(""); clearRegister(); setProjects([]); setProjectTotal(0); setProjectOffset(0); setLoading(true); setError(""); setDenied(false);
    void loadProjectPage(0, branchId, "", token).catch((cause: unknown) => {
      if (token !== generation.current) return;
      clearRegister(); setProjects([]); setProjectTotal(0);
      if (statusOf(cause) === 403 || statusOf(cause) === 404) setDenied(true); else setError(errorText(cause));
    }).finally(() => { if (token === generation.current) setLoading(false); });
  };

  const provisionTemplateFolders = async (): Promise<void> => {
    if (!projectId || !register?.capabilities.createFolder || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await post(`${API}/documents/projects/${encodeURIComponent(projectId)}/provision-template`, {});
      await loadRegister(projectId); setNotice("Applied template folders are set up. Any failed folders are listed for retry.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const retryFolderProvision = async (folder: Folder): Promise<void> => {
    if (!register?.capabilities.createFolder || busy) return;
    setBusy(true); setProvisioningFolderId(folder.id); setError(""); setNotice("");
    try {
      await post(`${API}/documents/folders/${encodeURIComponent(folder.id)}/retry`, {});
      await loadRegister(projectId); setNotice(`${folder.name} storage provisioning was retried. Its current status is shown in the folder list.`);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); setProvisioningFolderId(""); }
  };

  const beginUpload = async (): Promise<void> => {
    if (!projectId || !folderId || !file || busy || reason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const init = await post<{ uploadId: string; chunkSize: number }>(`${API}/documents/projects/${encodeURIComponent(projectId)}/uploads`, { folderId, fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, confidential, viewOnly, reason: reason.trim() });
      await uploadChunks({ file, uploadId: init.uploadId, chunkSize: init.chunkSize, chunkIndex: 0, chunks: Math.ceil(file.size / init.chunkSize), confidential, viewOnly, reason: reason.trim(), folderId, phase: "chunks" });
    } catch (cause) { setError(errorText(cause)); setBusy(false); }
  };

  const uploadChunks = async (upload: ActiveUpload): Promise<void> => {
    setActiveUpload(upload);
    let nextIndex = upload.chunkIndex;
    try {
      if (upload.phase === "chunks") {
        for (; nextIndex < upload.chunks; nextIndex += 1) {
          const start = nextIndex * upload.chunkSize;
          const bytes = await upload.file.slice(start, Math.min(start + upload.chunkSize, upload.file.size)).arrayBuffer();
          const hash = await sha256Hex(bytes);
          const response = await fetch(`${API}/documents/uploads/${encodeURIComponent(upload.uploadId)}/chunks/${nextIndex}`, {
            method: "PUT", credentials: "include", headers: { "Content-Type": "application/octet-stream", "X-Chunk-Sha256": hash, "X-CSRF-Token": csrfToken }, body: bytes,
          });
          if (!response.ok) throw Object.assign(new Error("chunk-failed"), { status: response.status });
          setActiveUpload({ ...upload, chunkIndex: nextIndex + 1 });
        }
      }
      setActiveUpload({ ...upload, chunkIndex: upload.chunks, phase: "finalize" });
      const result = await post<FileEntry>(`${API}/documents/uploads/${encodeURIComponent(upload.uploadId)}/finalize`, {});
      setFiles((current) => [result, ...current.filter((entry) => entry.id !== result.id)]);
      setFile(undefined); setReason(""); setActiveUpload(undefined); setNotice("File uploaded and registered.");
      await loadRegister(projectId);
    } catch (cause) {
      setActiveUpload({ ...upload, chunkIndex: nextIndex, phase: nextIndex >= upload.chunks ? "finalize" : "chunks" });
      setError(errorText(cause));
    } finally { setBusy(false); }
  };

  const progress = activeUpload ? activeUpload.phase === "finalize" ? 100 : Math.floor(activeUpload.chunkIndex / Math.max(1, activeUpload.chunks) * 100) : 0;
  const grantResources = grantKind === "FOLDER" ? folders.map((folder) => ({ id: folder.id, label: `${folder.name}${folder.confidential ? " · Confidential folder" : ""}` })) : files.map((entry) => ({ id: entry.id, label: `${entry.fileName}${entry.confidential ? " · Confidential file" : ""}` }));
  const resourceLabel = (grant: Grant): string => grant.resourceKind === "FOLDER" ? folders.find((folder) => folder.id === grant.resourceId)?.name ?? "Unavailable folder" : files.find((entry) => entry.id === grant.resourceId)?.fileName ?? "Unavailable file";
  const employeeLabel = (id: string): string => employees.find((employee) => employee.id === id)?.name ?? "Former or unavailable employee";
  const contextLocked = busy || !!activeUpload;
  const pickerProjects = register && !projects.some((project) => project.id === register.project.id) ? [...projects, register.project] : projects;

  return <section className="document-workspace" aria-labelledby="documents-heading">
    <header className="document-header"><div><p className="document-eyebrow">PROJECT RECORDS</p><h2 id="documents-heading">Documents</h2><p>Project files are stored and served through the authorized document service.</p></div><button type="button" onClick={() => void refresh()} disabled={loading || busy}>Refresh</button></header>
    {error && <p className="document-error" role="alert">{error} <button type="button" onClick={() => void refresh()} disabled={loading || busy}>Try again</button></p>}
    {denied && <p className="document-denied" role="alert">You are not authorized to view this document register. Ask the Owner to review your project assignment and document grants.</p>}
    {notice && <p className="document-notice" role="status">{notice}</p>}
    {loading && <p role="status" className="document-muted">Loading project document access…</p>}
    {pickerReady && !error && <>
      {setup?.branches.length ? <label className="document-picker">Owning branch<select aria-label="Document project branch" value={branchId} onChange={(event) => void selectBranch(event.target.value)} disabled={contextLocked}><option value="">All authorized branches</option>{setup.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label> : <p className="document-muted">No project branches are available to you.</p>}
      {setup?.branches.length ? <form className="document-project-search" onSubmit={(event) => { event.preventDefault(); void applyProjectSearch(); }}>
        <label htmlFor="document-project-search">Search project titles</label>
        <div><input id="document-project-search" value={projectQuery} maxLength={160} onChange={(event) => setProjectQuery(event.target.value.slice(0, 160))} placeholder="Search projects" disabled={contextLocked} /><button type="submit" disabled={loading || contextLocked}>Search</button>{appliedProjectQuery && <button type="button" onClick={clearProjectSearch} disabled={loading || contextLocked}>Clear search</button>}</div>
      </form> : null}
      {setup?.branches.length ? <label className="document-picker">Project<select aria-label="Document project" value={projectId} onChange={(event) => void selectProject(event.target.value)} disabled={contextLocked}><option value="">Choose a project</option>{pickerProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label> : null}
      {setup?.branches.length ? <nav className="document-project-pagination" aria-label="Project picker pages"><span>{projectTotal ? `Showing ${projectOffset + 1}–${Math.min(projectOffset + projects.length, projectTotal)} of ${projectTotal} projects` : "No matching projects"}</span><div><button type="button" onClick={() => void changeProjectPage(projectOffset - pageSize)} disabled={loading || contextLocked || projectOffset === 0}>Previous</button><button type="button" onClick={() => void changeProjectPage(projectOffset + pageSize)} disabled={loading || contextLocked || projectOffset + pageSize >= projectTotal}>Next</button></div></nav> : null}
      {!projectId && !loading && projects.length === 0 && setup?.branches.length ? <p role="status" className="document-muted">No projects match this branch and search.</p> : null}
      {register && <>
        <div className="document-register-heading"><div><span className="document-eyebrow">REGISTER</span><h3>{register.project.title}</h3></div><span>{files.length} {files.length === 1 ? "file" : "files"}</span></div>
        {register.capabilities.createFolder && <div className="document-provision-toolbar"><p className="document-muted">Set up physical folders from the project’s applied template. Failed folder operations can be retried below.</p><button type="button" onClick={() => void provisionTemplateFolders()} disabled={busy}>{busy ? "Setting up…" : "Set up template folders"}</button></div>}
        <div className="document-columns">
          <section className="document-panel"><h3>Files</h3>
            {folders.length > 0 && <label className="document-picker">Folder<select aria-label="Filter files by folder" value={folderId} onChange={(event) => setFolderId(event.target.value)}><option value="">All project folders</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}{folder.confidential ? " · Confidential" : ""}</option>)}</select></label>}
            {files.length === 0 ? <p role="status" className="document-muted">No files have been registered for this project.</p> : <ul className="document-file-list">{files.filter((entry) => !folderId || entry.folderId === folderId).map((entry) => <li key={entry.id}>
              <div><strong>{entry.fileName}</strong><small>{humanSize(entry.sizeBytes)} · {new Date(entry.createdAt).toLocaleDateString()} · {entry.confidential ? "Confidential" : "Project file"}{entry.viewOnly ? " · View only" : ""}</small><small>SHA-256 {entry.sha256}</small></div><a className="document-download" href={`${API}/documents/files/${encodeURIComponent(entry.id)}/stream`}>Download</a>
            </li>)}</ul>}
            {folders.length > 0 && <><h4>Project folders</h4><ul className="document-folder-list">{folders.map((folder) => <li key={folder.id}>
              <div><strong>{folder.name}{folder.confidential ? " · Confidential" : ""}</strong><small>{folder.provisionState === "READY" ? "Storage ready" : folder.provisionState === "FAILED" ? "Storage setup failed" : folder.provisionState ? "Storage setup pending" : "Provisioning state unavailable"}</small>{folder.provisionError && <small className="document-folder-error">{folder.provisionError}</small>}</div>
              {folder.provisionState === "FAILED" && register.capabilities.createFolder && <button type="button" onClick={() => void retryFolderProvision(folder)} disabled={busy} aria-label={`Retry storage setup for ${folder.name}`}>{provisioningFolderId === folder.id ? "Retrying…" : "Retry provisioning"}</button>}
            </li>)}</ul></>}
          </section>
          <div className="document-forms">
            {register.capabilities.createFolder && <form className="document-panel document-form" onSubmit={(event) => void createFolder(event)}><h3>Create folder</h3>
              <label>Folder name<input value={folderName} onChange={(event) => setFolderName(event.target.value)} minLength={1} maxLength={120} required /></label>
              <label>Parent folder<select value={folderParentId} onChange={(event) => setFolderParentId(event.target.value)}><option value="">Project root</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
              <label className="document-check"><input type="checkbox" checked={folderConfidential} onChange={(event) => setFolderConfidential(event.target.checked)} /> Confidential folder</label>
              <label>Reason<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
              <button className="document-primary" type="submit" disabled={busy || !folderName.trim() || reason.trim().length < 3}>{busy ? "Saving…" : "Create folder"}</button>
            </form>}
            {register.capabilities.upload && <section className="document-panel document-form"><h3>Upload file</h3>
              <label>Destination folder<select aria-label="Upload destination folder" value={folderId} onChange={(event) => setFolderId(event.target.value)} required><option value="">Choose folder</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}{folder.confidential ? " · Confidential" : ""}</option>)}</select></label>
              <label>File<input type="file" onChange={(event) => setFile(event.target.files?.[0])} disabled={!!activeUpload} /></label>
              <label className="document-check"><input type="checkbox" checked={confidential} onChange={(event) => setConfidential(event.target.checked)} /> Confidential file</label>
              <label className="document-check"><input type="checkbox" checked={viewOnly} onChange={(event) => setViewOnly(event.target.checked)} /> Mark as view only</label>
              <label>Reason<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
              {!activeUpload ? <button className="document-primary" type="button" onClick={() => void beginUpload()} disabled={busy || !file || !folderId || reason.trim().length < 3}>{busy ? "Preparing upload…" : "Upload and register"}</button> : <div className="document-progress" aria-live="polite"><div><strong>{activeUpload.file.name}</strong><span>{progress}% · {activeUpload.phase === "finalize" ? "Finalizing" : `Chunk ${Math.min(activeUpload.chunkIndex + 1, activeUpload.chunks)} of ${activeUpload.chunks}`}</span></div><progress value={progress} max="100" /><button className="document-primary" type="button" onClick={() => void uploadChunks(activeUpload)} disabled={busy}>{busy ? "Uploading…" : "Retry upload"}</button></div>}
              {file && !activeUpload && <p className="document-muted">{humanSize(file.size)} · Upload sends one verified chunk at a time.</p>}
            </section>}
          </div>
        </div>
        {register.capabilities.grant && <section className="document-panel document-grants" aria-labelledby="document-grants-heading">
          <div className="document-grants-heading"><div><p className="document-eyebrow">OWNER ACCESS</p><h3 id="document-grants-heading">Confidential access</h3></div><button type="button" onClick={() => void loadRegister(projectId)} disabled={busy || grantsLoading}>Refresh grants</button></div>
          <p className="document-muted">Grant access to a confidential folder or file for an active project employee. A confidential folder needs a folder grant, and each confidential file inside it also needs its own file grant.</p>
          {grantsError && <p className="document-error" role="alert">{grantsError}</p>}
          <form className="document-grant-form" onSubmit={(event) => void createGrant(event)}>
            <label>Resource type<select value={grantKind} onChange={(event) => { setGrantKind(event.target.value as "FOLDER" | "FILE"); setGrantResourceId(""); }}><option value="FOLDER">Folder</option><option value="FILE">File</option></select></label>
            <label>Folder or file<select value={grantResourceId} onChange={(event) => setGrantResourceId(event.target.value)} required><option value="">Choose resource</option>{grantResources.map((resource) => <option key={resource.id} value={resource.id}>{resource.label}</option>)}</select></label>
            <label>Project employee<select value={grantEmployeeId} onChange={(event) => setGrantEmployeeId(event.target.value)} required><option value="">Choose employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
            <label>Reason<input value={grantReason} onChange={(event) => setGrantReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
            <button className="document-primary" type="submit" disabled={busy || !grantResourceId || !grantEmployeeId || grantReason.trim().length < 3}>{busy ? "Saving…" : "Grant access"}</button>
          </form>
          <h4>Active grants</h4>
          {grantsLoading ? <p className="document-muted" role="status">Loading access grants…</p> : grants.length === 0 ? <p className="document-muted" role="status">No confidential access grants are active.</p> : <ul className="document-grant-list">{grants.map((grant) => <li key={grant.id}>
            <div><strong>{resourceLabel(grant)}</strong><small>{grant.resourceKind === "FOLDER" ? "Folder" : "File"} · {employeeLabel(grant.employeeId)} · Granted {new Date(grant.grantedAt).toLocaleDateString()}</small><small>Reason: {grant.reason}</small></div>
            <button type="button" onClick={() => void revokeGrant(grant)} disabled={busy || grantReason.trim().length < 3} aria-label={`Revoke access for ${employeeLabel(grant.employeeId)} to ${resourceLabel(grant)}`}>Revoke</button>
          </li>)}</ul>}
          {grants.length > 0 && <p className="document-muted">Enter a reason above before revoking a grant.</p>}
        </section>}
      </>}
    </>}
  </section>;
}
