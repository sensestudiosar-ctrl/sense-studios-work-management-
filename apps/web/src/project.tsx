import { useCallback, useEffect, useRef, useState } from "react";
import "./project.css";

const API = "/api/v1/projects";
type Branch = { id: string; name: string };
type Scope = { id: string; name: string; normalizedName: string; baseline: boolean };
type Project = { id: string; title: string; status: string; deliveryType: "DESIGN" | "TURNKEY"; version: number; client?: { id: string; name: string } | null; branch: Branch; scopes: Scope[]; createdAt: string };
type ProjectSetup = { branches: Branch[] };
type ProjectPage = { total: number; items: Project[] };
type ProjectDetail = { project: Project; wonLeadProvenance?: { leadId: string; stageChangeId: string; occurredAt: string; actorId: string; fromStage: string; toStage: string; leadVersion: number } };

async function json(response: Response): Promise<unknown> { if (!response.ok) throw Object.assign(new Error(response.status === 403 ? "denied" : response.status === 409 ? "conflict" : "request"), { status: response.status }); return response.json() as Promise<unknown>; }

export function ProjectWorkspace({ csrfToken, owner }: { csrfToken: string; owner: boolean }): React.JSX.Element | null {
  const [setup, setSetup] = useState<ProjectSetup>();
  const [branchId, setBranchId] = useState("");
  const [items, setItems] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ProjectDetail>();
  const [setupLoading, setSetupLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [deliveryType, setDeliveryType] = useState<"DESIGN" | "TURNKEY">("DESIGN");
  const [scopes, setScopes] = useState("");
  const [clientId, setClientId] = useState("");
  const [wonLeadId, setWonLeadId] = useState("");
  const [reason, setReason] = useState("");
  const [success, setSuccess] = useState("");
  const listRequest = useRef(0);
  const detailRequest = useRef(0);

  const request = useCallback(async (url: string, init?: RequestInit) => json(await fetch(url, { credentials: "include", cache: "no-store", ...init })), []);
  const loadSetup = useCallback(async () => {
    setSetupLoading(true); setError("");
    try { const result = await request(`${API}/setup`) as ProjectSetup; setSetup(result); setBranchId((current) => result.branches.some((b) => b.id === current) ? current : result.branches[0]?.id ?? ""); }
    catch (cause) { setError(cause instanceof Error && cause.message === "denied" ? "You need Owner access to manage projects." : "Projects could not be loaded. Check your connection and try again."); }
    finally { setSetupLoading(false); }
  }, [request]);
  const loadList = useCallback(async (currentBranch: string) => {
    const requestId = ++listRequest.current;
    ++detailRequest.current;
    if (!currentBranch) { setItems([]); setSelectedId(""); setDetail(undefined); return; }
    setLoading(true); setError(""); setSelectedId(""); setDetail(undefined);
    try { const result = await request(`${API}?branchId=${encodeURIComponent(currentBranch)}&offset=0&limit=50`) as ProjectPage; if (requestId === listRequest.current) setItems(result.items); }
    catch (cause) { if (requestId === listRequest.current) { setItems([]); setError(cause instanceof Error && cause.message === "denied" ? "You need Owner access to view projects." : "Projects could not be loaded. Try again."); } }
    finally { if (requestId === listRequest.current) setLoading(false); }
  }, [request]);
  useEffect(() => { if (owner) void loadSetup(); else setSetupLoading(false); }, [owner, loadSetup]);
  useEffect(() => { if (!setupLoading && owner) void loadList(branchId); }, [branchId, setupLoading, owner, loadList]);
  const selectProject = async (id: string) => {
    const requestId = ++detailRequest.current;
    setSelectedId(id); setDetail(undefined); setDetailError(""); setDetailLoading(true);
    try { const result = await request(`${API}/${encodeURIComponent(id)}`) as ProjectDetail; if (requestId === detailRequest.current) setDetail(result); }
    catch (cause) { if (requestId === detailRequest.current) setDetailError(cause instanceof Error && cause.message === "denied" ? "You need Owner access to view this project." : "Project details could not be loaded. Try again."); }
    finally { if (requestId === detailRequest.current) setDetailLoading(false); }
  };
  const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (pending || !branchId) return;
    setPending(true); setError(""); setSuccess("");
    const scopeNames = scopes.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean);
    const body = { branchId, title: title.trim(), deliveryType, scopes: scopeNames, ...(clientId.trim() ? { clientId: clientId.trim() } : {}), ...(wonLeadId.trim() ? { wonLeadId: wonLeadId.trim() } : {}), reason: reason.trim() };
    try {
      await request(API, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
      setTitle(""); setScopes(""); setClientId(""); setWonLeadId(""); setReason(""); setSuccess("Draft project created."); await loadList(branchId);
    } catch (cause) { setError(cause instanceof Error && cause.message === "conflict" ? "This Won lead was already converted or the project details conflict. Review the values and try again." : cause instanceof Error && cause.message === "denied" ? "You need Owner access to create a project." : "The project could not be created. Check the details and try again."); }
    finally { setPending(false); }
  };

  if (!owner) return null;
  return <section className="project-workspace" aria-labelledby="projects-heading">
    <header className="project-heading"><div><div className="eyebrow">DELIVERY</div><h2 id="projects-heading">Projects</h2><p>Set up a Draft project with its delivery type and initial service scopes.</p></div><span className="project-count">{items.length} shown</span></header>
    {error && <div className="project-alert" role="alert"><span>{error}</span><button type="button" onClick={() => branchId ? void loadList(branchId) : void loadSetup()}>Try again</button></div>}
    {success && <p className="project-success" role="status">{success}</p>}
    {setupLoading ? <p className="project-status" role="status">Loading project setup…</p> : <>
      {setup?.branches.length ? <label className="project-branch">Owning branch<select aria-label="Project branch" value={branchId} onChange={(event) => { ++listRequest.current; ++detailRequest.current; setBranchId(event.target.value); setSelectedId(""); setDetail(undefined); }}>{setup.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label> : <p className="project-empty" role="status">No active branches are available for projects.</p>}
      {!!branchId && <div className="project-columns">
        <section className="project-panel" aria-labelledby="project-list-heading"><div className="project-panel-heading"><h3 id="project-list-heading">Drafts and projects</h3><button className="project-quiet-button" type="button" onClick={() => void loadList(branchId)} disabled={loading}>Refresh</button></div>
          {loading ? <p className="project-status" role="status">Loading projects…</p> : items.length === 0 ? <p className="project-empty" role="status">No projects for this branch yet.</p> : <ul className="project-list">{items.map((item) => <li key={item.id}><button type="button" className={`project-list-item${selectedId === item.id ? " is-selected" : ""}`} onClick={() => void selectProject(item.id)} aria-pressed={selectedId === item.id}><span><strong>{item.title}</strong><small>{item.deliveryType === "DESIGN" ? "Design" : "Turnkey"} · {item.scopes.length} baseline {item.scopes.length === 1 ? "scope" : "scopes"}</small></span><span className="project-status-pill">{item.status}</span></button></li>)}</ul>}
          {detailLoading && <p className="project-status" role="status">Loading project details…</p>}{detailError && <p role="alert" className="project-inline-error">{detailError}</p>}
          {detail && <article className="project-detail"><div className="project-detail-heading"><div><div className="eyebrow">PROJECT DETAIL</div><h3>{detail.project.title}</h3></div><span className="project-status-pill">{detail.project.status}</span></div><dl><div><dt>Branch</dt><dd>{detail.project.branch.name}</dd></div><div><dt>Delivery type</dt><dd>{detail.project.deliveryType === "DESIGN" ? "Design" : "Turnkey"}</dd></div><div><dt>Client</dt><dd>{detail.project.client?.name ?? "Not linked"}</dd></div></dl><h4>Baseline scopes</h4><ul className="project-scope-list">{detail.project.scopes.map((scope) => <li key={scope.id}>{scope.name}</li>)}</ul>{detail.wonLeadProvenance && <p className="project-provenance">Converted from Won lead · recorded {new Date(detail.wonLeadProvenance.occurredAt).toLocaleString()}</p>}</article>}
        </section>
        <section className="project-panel project-create-panel" aria-labelledby="create-project-heading"><div className="project-panel-heading"><h3 id="create-project-heading">Create Draft project</h3><span className="project-status-pill">Draft</span></div><form className="project-form" onSubmit={(event) => void createProject(event)}>
          <label>Project title<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={160} required /></label>
          <label>Delivery type<select value={deliveryType} onChange={(event) => setDeliveryType(event.target.value as "DESIGN" | "TURNKEY")}><option value="DESIGN">Design</option><option value="TURNKEY">Turnkey</option></select></label>
          <label>Initial service scopes<textarea aria-label="Initial service scopes" value={scopes} onChange={(event) => setScopes(event.target.value)} placeholder={"Architecture\nInterior design"} required rows={3} /><small>Enter 1–12 scopes, one per line or separated by commas.</small></label>
          <div className="project-form-pair"><label>Client ID <span>(optional)</span><input aria-label="Client ID" value={clientId} onChange={(event) => setClientId(event.target.value)} inputMode="text" /></label><label>Won lead ID <span>(optional)</span><input aria-label="Won lead ID" value={wonLeadId} onChange={(event) => setWonLeadId(event.target.value)} inputMode="text" /><small>Leave blank to create a direct project.</small></label></div>
          <label>Creation reason<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
          <button className="project-primary-button" type="submit" disabled={pending || !branchId}>{pending ? "Creating Draft…" : "Create Draft project"}</button>
        </form></section>
      </div>}
    </>}
  </section>;
}
