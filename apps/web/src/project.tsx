import { useCallback, useEffect, useRef, useState } from "react";
import "./project.css";
import { ProjectPlan, ProjectTemplatePanel, type TemplateVersion } from "./project-template.js";

const API = "/api/v1/projects";
type Branch = { id: string; name: string };
type Scope = { id: string; name: string; normalizedName: string; baseline: boolean };
type Project = { id: string; title: string; status: string; deliveryType: "DESIGN" | "TURNKEY"; version: number; client?: { id: string; name: string } | null; branch: Branch; scopes: Scope[]; createdAt: string; statusChanges?: Array<{ id: string; fromStatus?: string; toStatus: string; reason: string }> };
type Employee = { id: string; accountId: string; name: string; homeBranchId: string };
type ProjectSetup = { branches: Branch[]; employees?: Employee[]; owner?: boolean; ownerAccountId?: string };
type ProjectPage = { total: number; items: Project[] };
type ProjectDetail = { project: Project & { currentLeadEmployeeId?: string | null; currentLeadName?: string | null; scopeApproverAccountId?: string | null }; capabilities?: Record<string, boolean>; currentLeadEmployeeId?: string | null; currentLeadName?: string | null; scopeApproverAccountId?: string | null; assignments?: Array<{ employeeId: string; employee?: Employee; name?: string }>; leadChanges?: Array<{ employeeName?: string; reason: string; createdAt?: string }>; transfers?: Array<{ fromBranchName?: string; toBranchName?: string; reason: string; createdAt?: string }>; scopeChanges?: Array<{ approvalId?: string | null; approval?: { state?: string } | null; name: string; status: string; reason: string }>; cancellationRequests?: Array<{ status: string; reason: string }>; wonLeadProvenance?: { leadId: string; stageChangeId: string; occurredAt: string; actorId: string; fromStage: string; toStage: string; leadVersion: number } };

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
  const [actionStatus, setActionStatus] = useState("");
  const [actionEmployee, setActionEmployee] = useState("");
  const [actionBranch, setActionBranch] = useState("");
  const [actionAccount, setActionAccount] = useState("");
  const [actionScope, setActionScope] = useState("");
  const [templateVersion, setTemplateVersion] = useState<TemplateVersion>();
  const [templateReset, setTemplateReset] = useState(0);
  const [overrideMilestones, setOverrideMilestones] = useState(false);
  const [confirmCancellation, setConfirmCancellation] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const creationRequest = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const applyTemplateVersion = useCallback((version: TemplateVersion | undefined) => {
    setTemplateVersion(version);
    if (version) { setDeliveryType(version.definition.deliveryType); setScopes(version.definition.scopes.join("\n")); }
  }, []);

  const request = useCallback(async (url: string, init?: RequestInit) => json(await fetch(url, { credentials: "include", cache: "no-store", ...init })), []);
  const loadSetup = useCallback(async () => {
    setSetupLoading(true); setError("");
    try { const result = await request(`${API}/setup`) as ProjectSetup; setSetup(result); setBranchId((current) => result.branches.some((b) => b.id === current) ? current : result.branches[0]?.id ?? ""); }
    catch (cause) { setError(cause instanceof Error && cause.message === "denied" && owner ? "You need Owner access to manage projects." : "Project access could not be loaded. Check your connection and try again."); }
    finally { setSetupLoading(false); }
  }, [request]);
  const loadList = useCallback(async (currentBranch: string, preserveSelection = false) => {
    const requestId = ++listRequest.current;
    ++detailRequest.current;
    if (!currentBranch) { setItems([]); setSelectedId(""); setDetail(undefined); return; }
    setLoading(true); setError("");
    if (!preserveSelection) { setSelectedId(""); setDetail(undefined); }
    try { const result = await request(`${API}?branchId=${encodeURIComponent(currentBranch)}&offset=0&limit=50`) as ProjectPage; if (requestId === listRequest.current) setItems(result.items); }
    catch (cause) { if (requestId === listRequest.current) { setItems([]); setError(cause instanceof Error && cause.message === "denied" ? "You need Owner access to view projects." : "Projects could not be loaded. Try again."); } }
    finally { if (requestId === listRequest.current) setLoading(false); }
  }, [request]);
  useEffect(() => { void loadSetup(); }, [loadSetup]);
  useEffect(() => { if (!setupLoading && branchId) void loadList(branchId); }, [branchId, setupLoading, loadList]);
  const selectProject = async (id: string) => {
    const requestId = ++detailRequest.current;
    setSelectedId(id); setDetail(undefined); setOverrideMilestones(false); setDetailError(""); setDetailLoading(true);
    try { const result = await request(`${API}/${encodeURIComponent(id)}`) as ProjectDetail; if (requestId === detailRequest.current) setDetail(result); }
    catch (cause) { if (requestId === detailRequest.current) setDetailError(cause instanceof Error && cause.message === "denied" ? "You need Owner access to view this project." : "Project details could not be loaded. Try again."); }
    finally { if (requestId === detailRequest.current) setDetailLoading(false); }
  };
  const createProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (pending || !branchId) return;
    setPending(true); setError(""); setSuccess("");
    const scopeNames = scopes.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean);
    const payload = { branchId, title: title.trim(), deliveryType, scopes: scopeNames, ...(clientId.trim() ? { clientId: clientId.trim() } : {}), ...(wonLeadId.trim() ? { wonLeadId: wonLeadId.trim() } : {}), reason: reason.trim(), ...(templateVersion ? { templateVersionId: templateVersion.id } : {}) };
    const fingerprint = JSON.stringify(payload);
    if (!creationRequest.current || creationRequest.current.fingerprint !== fingerprint) creationRequest.current = { fingerprint, key: crypto.randomUUID() };
    const body = { ...payload, ...(templateVersion ? { idempotencyKey: creationRequest.current.key } : {}) };
    try {
      await request(API, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
      setTitle(""); setScopes(""); setClientId(""); setWonLeadId(""); setReason(""); setTemplateVersion(undefined); setTemplateReset((value) => value + 1); creationRequest.current = undefined; setSuccess("Draft project created."); await loadList(branchId);
    } catch (cause) { setError(cause instanceof Error && cause.message === "conflict" ? "This Won lead was already converted or the project details conflict. Review the values and try again." : cause instanceof Error && cause.message === "denied" ? "You need Owner access to create a project." : "The project could not be created. Check the details and try again."); }
    finally { setPending(false); }
  };

  const sendAction = async (path: string, payload: Record<string, unknown>): Promise<void> => {
    if (!detail || pending) return;
    setPending(true); setDetailError(""); setSuccess("");
    try {
      await request(`${API}/${encodeURIComponent(detail.project.id)}${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ ...payload, ...(path === "/status" && overrideMilestones ? { overrideMilestones: true } : {}), expectedVersion: detail.project.version, reason: reason.trim() }) });
      setReason(""); setOverrideMilestones(false); setConfirmCancellation(false); setSuccess(path === "/cancel" ? "Project cancelled. Unfinished delivery tasks stopped; completed work is retained." : "Action saved."); await selectProject(detail.project.id); await loadList(branchId, true);
    } catch (cause) {
      if (cause instanceof Error && cause.message === "conflict") { await selectProject(detail.project.id); setDetailError("This project changed. The latest details are loaded; review them before retrying."); }
      else setDetailError(cause instanceof Error && cause.message === "denied" ? "You do not have permission for that action." : "The action could not be saved. Try again.");
    } finally { setPending(false); }
  };

  const sendCancellationRequest = async (): Promise<void> => {
    if (!detail || pending) return;
    setPending(true); setDetailError(""); setSuccess("");
    try { await request(`${API}/${encodeURIComponent(detail.project.id)}/cancellation-requests`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ reason: reason.trim() }) }); setReason(""); setSuccess("Cancellation request submitted and pending Owner review."); await selectProject(detail.project.id); }
    catch (cause) { setDetailError(cause instanceof Error && cause.message === "denied" ? "You cannot request cancellation for this project." : "Cancellation request could not be saved. Try again."); }
    finally { setPending(false); }
  };

  const decideScope = async (approvalId: string, outcome: "APPROVED" | "REJECTED"): Promise<void> => {
    if (!detail || pending || reason.trim().length < 3) return;
    setPending(true); setDetailError(""); setSuccess("");
    try {
      await request(`${API}/${encodeURIComponent(detail.project.id)}/scope-requests/${encodeURIComponent(approvalId)}/decision`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ outcome, reason: reason.trim() }) });
      setReason(""); setSuccess(outcome === "APPROVED" ? "Scope change approved." : "Scope change rejected."); await selectProject(detail.project.id);
    } catch (cause) {
      if (cause instanceof Error && cause.message === "conflict") { await selectProject(detail.project.id); setDetailError("This approval changed. The latest project details are loaded."); }
      else setDetailError(cause instanceof Error && cause.message === "denied" ? "You are not the current scope approver." : "The scope decision could not be saved. Try again.");
    } finally { setPending(false); }
  };

  const withdrawScope = async (approvalId: string): Promise<void> => {
    if (!detail || !owner || pending || reason.trim().length < 3) return;
    setPending(true); setDetailError(""); setSuccess("");
    try {
      await request(`${API}/${encodeURIComponent(detail.project.id)}/scope-requests/${encodeURIComponent(approvalId)}/withdraw`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ reason: reason.trim() }) });
      setReason(""); setSuccess("Pending scope request withdrawn. The Owner can change the approver, then the requester may submit again."); await selectProject(detail.project.id);
    } catch (cause) {
      if (cause instanceof Error && cause.message === "conflict") { await selectProject(detail.project.id); setDetailError("This scope request changed. The latest project details are loaded."); }
      else setDetailError(cause instanceof Error && cause.message === "denied" ? "Only the Owner can withdraw a pending scope request." : "The scope request could not be withdrawn. Try again.");
    } finally { setPending(false); }
  };

  const removeContributor = async (employeeId: string): Promise<void> => {
    if (!detail || pending) return;
    setPending(true); setDetailError("");
    try {
      await request(`${API}/${encodeURIComponent(detail.project.id)}/assignments/${encodeURIComponent(employeeId)}`, { method: "DELETE", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ expectedVersion: detail.project.version, reason: reason.trim() }) });
      setSuccess("Contributor assignment removed."); await selectProject(detail.project.id);
    } catch (cause) { if (cause instanceof Error && cause.message === "conflict") { await selectProject(detail.project.id); setDetailError("This project changed. The latest details are loaded; review them before retrying."); } else setDetailError("Contributor assignment could not be removed."); }
    finally { setPending(false); }
  };

  return <section className="project-workspace" aria-labelledby="projects-heading">
    <header className="project-heading"><div><div className="eyebrow">DELIVERY</div><h2 id="projects-heading">Projects</h2><p>Set up a Draft project with its delivery type and initial service scopes.</p></div><span className="project-count">{items.length} shown</span></header>
    {error && <div className="project-alert" role="alert"><span>{error}</span><button type="button" onClick={() => branchId ? void loadList(branchId) : void loadSetup()}>Try again</button></div>}
    {success && <p className="project-success" role="status">{success}</p>}
    {setupLoading ? <p className="project-status" role="status">Loading project setup…</p> : <>
      {setup?.branches.length ? <label className="project-branch">Owning branch<select aria-label="Project branch" value={branchId} onChange={(event) => { ++listRequest.current; ++detailRequest.current; setBranchId(event.target.value); setSelectedId(""); setDetail(undefined); }}>{setup.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label> : <p className="project-empty" role="status">No active branches are available for projects.</p>}
      <ProjectTemplatePanel owner={owner} csrfToken={csrfToken} onTemplateChange={applyTemplateVersion} resetKey={templateReset} />
      {!!branchId && <div className="project-columns">
        <section className="project-panel" aria-labelledby="project-list-heading"><div className="project-panel-heading"><h3 id="project-list-heading">Drafts and projects</h3><button className="project-quiet-button" type="button" onClick={() => void loadList(branchId)} disabled={loading}>Refresh</button></div>
          {loading ? <p className="project-status" role="status">Loading projects…</p> : items.length === 0 ? <p className="project-empty" role="status">No projects for this branch yet.</p> : <ul className="project-list">{items.map((item) => <li key={item.id}><button type="button" className={`project-list-item${selectedId === item.id ? " is-selected" : ""}`} onClick={() => void selectProject(item.id)} aria-pressed={selectedId === item.id}><span><strong>{item.title}</strong><small>{item.deliveryType === "DESIGN" ? "Design" : "Turnkey"} · {item.scopes.length} baseline {item.scopes.length === 1 ? "scope" : "scopes"}</small></span><span className="project-status-pill">{item.status}</span></button></li>)}</ul>}
          {detailLoading && <p className="project-status" role="status">Loading project details…</p>}{detailError && <p role="alert" className="project-inline-error">{detailError}</p>}
          {detail && <article className="project-detail"><div className="project-detail-heading"><div><div className="eyebrow">PROJECT DETAIL</div><h3>{detail.project.title}</h3></div><span className="project-status-pill">{detail.project.status}</span></div><dl><div><dt>Branch</dt><dd>{detail.project.branch.name}</dd></div><div><dt>Delivery type</dt><dd>{detail.project.deliveryType === "DESIGN" ? "Design" : "Turnkey"}</dd></div><div><dt>Client</dt><dd>{detail.project.client?.name ?? "Not linked"}</dd></div></dl><h4>Baseline scopes</h4><ul className="project-scope-list">{detail.project.scopes.map((scope) => <li key={scope.id}>{scope.name}</li>)}</ul>{detail.wonLeadProvenance && <p className="project-provenance">Converted from Won lead · recorded {new Date(detail.wonLeadProvenance.occurredAt).toLocaleString()}</p>}
            <h4>History and requests</h4><ul className="project-history">{(detail.project.statusChanges ?? []).map((row) => <li key={row.id}>{row.fromStatus ?? "Created"} → {row.toStatus} · {row.reason}</li>)}{(detail.transfers ?? []).map((row, index) => <li key={`transfer-${index}`}>Branch transfer · {row.reason}. Contributors whose home branch differs from the new owning branch need an explicit Owner regrant.</li>)}{(detail.leadChanges ?? []).map((row, index) => <li key={`lead-${index}`}>Lead change · {row.reason}</li>)}{(detail.scopeChanges ?? []).map((row, index) => <li key={`scope-${index}`}>Scope change: {row.name} · {row.status} · {row.reason}{row.approvalId && (row.approval?.state === "PENDING" || row.status === "PENDING") && <span className="project-scope-decision">{detail.capabilities?.decideScope && <><button type="button" disabled={pending || reason.trim().length < 3} onClick={() => void decideScope(row.approvalId!, "APPROVED")}>Approve</button><button type="button" disabled={pending || reason.trim().length < 3} onClick={() => void decideScope(row.approvalId!, "REJECTED")}>Reject</button></>}{owner && <button type="button" disabled={pending || reason.trim().length < 3} onClick={() => void withdrawScope(row.approvalId!)}>Withdraw</button>}</span>}</li>)}{(detail.cancellationRequests ?? []).map((row, index) => <li key={`cancel-${index}`}>Cancellation request · {row.status} · {row.reason}</li>)}</ul>
            {detail.scopeChanges?.some((row) => detail.capabilities?.decideScope && row.approvalId && (row.approval?.state === "PENDING" || row.status === "PENDING")) && <p className="project-decision-help">Enter a decision reason above before approving or rejecting a pending scope change. The requester cannot approve their own request.</p>}
            {owner && detail.scopeChanges?.some((row) => row.approvalId && (row.approval?.state === "PENDING" || row.status === "PENDING")) && <p className="project-decision-help">If the named approver is unavailable, withdraw the request with a reason, change the approver above, then the requester may submit again.</p>}
            <h4>Project Lead</h4><p>{detail.currentLeadName ?? detail.project.currentLeadName ?? setup?.employees?.find((employee) => employee.id === (detail.currentLeadEmployeeId ?? detail.project.currentLeadEmployeeId))?.name ?? "No Project Lead assigned"}</p>
            <h4>Assigned contributors</h4>{(detail.assignments ?? []).length ? <ul className="project-history">{detail.assignments?.map((row) => <li key={row.employeeId}>{row.employee?.name ?? row.name ?? row.employeeId}{(owner || detail.capabilities?.manageAssignments) && <button type="button" disabled={pending || reason.trim().length < 3} onClick={() => void removeContributor(row.employeeId)}>Remove</button>}</li>)}</ul> : <p>No additional contributors</p>}
            <ProjectPlan projectId={detail.project.id} projectVersion={detail.project.version} csrfToken={csrfToken} onSaved={() => void selectProject(detail.project.id)} />
            <div className="project-actions"><label>Reason for action<input aria-label="Project action reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} /></label>
              {["CANCELLED", "ARCHIVED"].includes(detail.project.status) ? <p>This project is closed. Its delivery history is retained. Approved closeout work is managed in Tasks.</p> : <>
              {((detail.capabilities?.assignLead ?? owner) || detail.capabilities?.manageLead) && <div className="project-action-row"><select aria-label="Project lead" value={actionEmployee} onChange={(event) => setActionEmployee(event.target.value)}><option value="">Choose active employee</option>{setup?.employees?.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select><button disabled={pending || !actionEmployee || reason.trim().length < 3} onClick={() => void sendAction("/lead", { employeeId: actionEmployee })}>Set lead</button></div>}
              {((detail.capabilities?.assignContributor ?? owner) || detail.capabilities?.manageAssignments) && <div className="project-action-row"><select aria-label="Contributor" value={actionEmployee} onChange={(event) => setActionEmployee(event.target.value)}><option value="">Choose employee</option>{setup?.employees?.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select><button disabled={pending || !actionEmployee || reason.trim().length < 3} onClick={() => void sendAction("/assignments", { employeeId: actionEmployee })}>Assign contributor</button></div>}
              {((detail.capabilities?.changeStatus ?? owner) || detail.capabilities?.manageLifecycle) && <div className="project-action-row"><select aria-label="New project status" value={actionStatus} onChange={(event) => { setActionStatus(event.target.value); setOverrideMilestones(false); }}><option value="">Choose status</option>{["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"].map((status) => <option key={status}>{status}</option>)}</select><button disabled={pending || !actionStatus || reason.trim().length < 3 || (actionStatus === "COMPLETED" && !owner && !detail.capabilities?.override)} onClick={() => void sendAction("/status", { toStatus: actionStatus })}>Change status</button><small>Project gates apply before completion.</small>{actionStatus === "COMPLETED" && detail.capabilities?.override && <label className="project-override-option"><input type="checkbox" checked={overrideMilestones} onChange={(event) => setOverrideMilestones(event.target.checked)} />Override incomplete required milestones with this reason</label>}</div>}
              {owner && ["DRAFT", "ACTIVE", "ON_HOLD"].includes(detail.project.status) && <div className="project-action-row"><label><input type="checkbox" checked={confirmCancellation} onChange={(event) => setConfirmCancellation(event.target.checked)} />Stop unfinished delivery work and retain completed work and history</label><button disabled={pending || !confirmCancellation || reason.trim().length < 3} onClick={() => void sendAction("/cancel", {})}>Cancel project</button></div>}
              {owner && <><div className="project-action-row"><select aria-label="Transfer owning branch" value={actionBranch} onChange={(event) => setActionBranch(event.target.value)}><option value="">Choose branch</option>{setup?.branches.filter((branch) => branch.id !== branchId).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><button disabled={pending || !actionBranch || reason.trim().length < 3} onClick={() => void sendAction("/transfer", { toBranchId: actionBranch })}>Transfer branch</button></div><div className="project-action-row"><select aria-label="Scope approver" value={actionAccount} onChange={(event) => setActionAccount(event.target.value)}><option value="">Choose scope approver</option>{setup?.ownerAccountId && <option value={setup.ownerAccountId}>Owner</option>}{setup?.employees?.map((employee) => <option key={employee.accountId} value={employee.accountId}>{employee.name}</option>)}</select><button disabled={pending || !actionAccount || reason.trim().length < 3} onClick={() => void sendAction("/scope-approver", { accountId: actionAccount })}>Set scope approver</button></div></>}
              {((detail.capabilities?.requestScopeChange ?? owner) || detail.capabilities?.requestScope) && <div className="project-action-row"><input aria-label="Proposed scope" placeholder="Proposed service scope" value={actionScope} onChange={(event) => setActionScope(event.target.value)} /><button disabled={pending || !actionScope.trim() || reason.trim().length < 3} onClick={() => void sendAction("/scope-requests", { name: actionScope.trim() })}>Request scope change</button></div>}
              {!owner && detail.capabilities?.requestCancellation && <button disabled={pending || reason.trim().length < 3} onClick={() => void sendCancellationRequest()}>Request cancellation</button>}
              </>}
            </div></article>}
        </section>
        {owner && <section className="project-panel project-create-panel" aria-labelledby="create-project-heading"><div className="project-panel-heading"><h3 id="create-project-heading">Create Draft project</h3><span className="project-status-pill">Draft</span></div><form className="project-form" onSubmit={(event) => void createProject(event)}>
          <label>Project title<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={160} required /></label>
          <label>Delivery type<select value={deliveryType} disabled={!!templateVersion} onChange={(event) => setDeliveryType(event.target.value as "DESIGN" | "TURNKEY")}><option value="DESIGN">Design</option><option value="TURNKEY">Turnkey</option></select></label>
          <label>Initial service scopes<textarea aria-label="Initial service scopes" value={scopes} readOnly={!!templateVersion} onChange={(event) => setScopes(event.target.value)} placeholder={"Architecture\nInterior design"} required rows={3} /><small>{templateVersion ? "Scopes come from the selected template version. Choose current project setup to enter different scopes." : "Enter 1–12 scopes, one per line or separated by commas."}</small></label>
          <div className="project-form-pair"><label>Client ID <span>(optional)</span><input aria-label="Client ID" value={clientId} onChange={(event) => setClientId(event.target.value)} inputMode="text" /></label><label>Won lead ID <span>(optional)</span><input aria-label="Won lead ID" value={wonLeadId} onChange={(event) => setWonLeadId(event.target.value)} inputMode="text" /><small>Leave blank to create a direct project.</small></label></div>
          <label>Creation reason<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
          <button className="project-primary-button" type="submit" disabled={pending || !branchId}>{pending ? "Creating Draft…" : "Create Draft project"}</button>
        </form></section>}
      </div>}
    </>}
  </section>;
}
