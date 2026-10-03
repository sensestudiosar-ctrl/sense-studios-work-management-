import { useCallback, useEffect, useRef, useState } from "react";
import "./turnkey.css";

const API = "/api/v1";
type ProjectChoice = { id: string; title: string; status: string; branchName: string };
type RevisionChoice = { revisionId: string; drawingId: string; label: string; sha256: string };
type Approver = { accountId: string; label: string };
type ClientChoice = { accountId: string; label: string };
type Line = { key: string; description: string; quantity: string; unit: string };
type Price = { key: string; unitPrice: string };
type Capabilities = {
  requestCost: boolean; decideCost: boolean; setMaterials: boolean; requestProcurement: boolean;
  decideProcurement: boolean; progress: boolean; shareCosts: boolean;
};
type Release = {
  id: string; projectId: string; version: number; state: "DRAFT" | "COST_PENDING" | "COST_APPROVED" | "COST_REJECTED" | "PROCUREMENT_PENDING" | "PROCUREMENT_REJECTED" | "RELEASED";
  currency?: string; designs: RevisionChoice[]; lines: Line[]; materials: Array<{ lineKey: string; material: string }>;
  procurementStatus: string; factoryStatus: string; replacesReleaseId?: string | null; replacedById?: string | null; changeReason?: string | null;
  createdAt: string; createdById?: string; costApprovalId?: string | null; procurementApprovalId?: string | null;
  capabilities: Capabilities; costs?: { prices: Price[]; total: string };
  costShares?: Array<{ accountId: string; revokedAt: string | null }>;
  history: Array<{ eventName: string; reason: string; actorId: string; occurredAt: string; releaseVersion: number }>;
};
type ProjectDetail = {
  project: { id: string; title: string; status: string; version: number };
  releases: Release[];
  capabilities: { create: boolean; costView: boolean; manage: boolean };
  designCandidates: RevisionChoice[];
  eligibleApprovers: Array<Approver & { cost: boolean; procurement: boolean }>;
  clients: ClientChoice[];
};
type ProjectsResponse = { items: ProjectChoice[] };

function statusOf(error: unknown): number { return error instanceof Error ? (error as Error & { status?: number }).status ?? 0 : 0; }
async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw Object.assign(new Error("request-failed"), { status: response.status });
  return response.json() as Promise<T>;
}
function errorText(error: unknown): string {
  const status = statusOf(error);
  if (status === 403 || status === 404) return "You do not have access to this Turnkey project or action.";
  if (status === 409) return "This release changed while you were working. Refresh the project and review the current record before continuing.";
  if (status >= 500) return "The Turnkey service is unavailable. Try again shortly.";
  return "The Turnkey request could not be completed. Check the current record and try again.";
}
function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}
function releaseLabel(state: Release["state"]): string {
  return ({ DRAFT: "Draft", COST_PENDING: "Cost approval requested", COST_APPROVED: "Cost approved", COST_REJECTED: "Cost approval rejected", PROCUREMENT_PENDING: "Procurement approval requested", PROCUREMENT_REJECTED: "Procurement approval rejected", RELEASED: "Released to production" })[state];
}
function eventLabel(value: string): string { return value.replaceAll("_", " ").toLowerCase(); }

export function TurnkeyWorkspace({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  const [projects, setProjects] = useState<ProjectChoice[]>([]);
  const [projectId, setProjectId] = useState("");
  const [detail, setDetail] = useState<ProjectDetail>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const epoch = useRef(0);
  const [selectedRevisionIds, setSelectedRevisionIds] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([{ key: "line-1", description: "", quantity: "", unit: "" }]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [replacesReleaseId, setReplacesReleaseId] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [costApproverId, setCostApproverId] = useState("");
  const [procurementApproverId, setProcurementApproverId] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionOutcome, setDecisionOutcome] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [materialReason, setMaterialReason] = useState("");
  const [materials, setMaterials] = useState<Record<string, string>>({});
  const [progressReason, setProgressReason] = useState("");
  const [progressStage, setProgressStage] = useState<"PROCUREMENT" | "FACTORY">("PROCUREMENT");
  const [shareAccountId, setShareAccountId] = useState("");
  const [shareReason, setShareReason] = useState("");

  const loadProject = useCallback(async (id: string, request: number): Promise<void> => {
    const next = await json<ProjectDetail>(await fetch(`${API}/turnkey/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }));
    if (request !== epoch.current) return;
    setDetail(next);
    setSelectedRevisionIds((current) => current.filter((revisionId) => next.designCandidates.some((candidate) => candidate.revisionId === revisionId)));
    setCostApproverId((current) => next.eligibleApprovers.some((approver) => approver.cost && approver.accountId === current) ? current : next.eligibleApprovers.find((approver) => approver.cost)?.accountId ?? "");
    setProcurementApproverId((current) => next.eligibleApprovers.some((approver) => approver.procurement && approver.accountId === current) ? current : next.eligibleApprovers.find((approver) => approver.procurement)?.accountId ?? "");
  }, []);

  const loadProjects = useCallback(async (): Promise<void> => {
    const request = ++epoch.current;
    setLoading(true); setError("");
    try {
      const result = await json<ProjectsResponse>(await fetch(`${API}/turnkey/projects`, { credentials: "include", cache: "no-store" }));
      if (request !== epoch.current) return;
      setProjects(result.items);
      const nextId = result.items.some((project) => project.id === projectId) ? projectId : "";
      setProjectId(nextId);
      if (nextId) await loadProject(nextId, request);
      else setDetail(undefined);
    } catch (cause) {
      if (request === epoch.current) { setDetail(undefined); setProjects([]); setError(errorText(cause)); }
    } finally { if (request === epoch.current) setLoading(false); }
  }, [projectId, loadProject]);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  const refresh = async (): Promise<void> => {
    if (busy) return;
    const request = ++epoch.current; setLoading(true); setError("");
    try { if (projectId) await loadProject(projectId, request); else await loadProjects(); }
    catch (cause) { if (request === epoch.current) { setDetail(undefined); setError(errorText(cause)); } }
    finally { if (request === epoch.current) setLoading(false); }
  };

  const selectProject = async (id: string): Promise<void> => {
    const request = ++epoch.current;
    setProjectId(id); setDetail(undefined); setError(""); setNotice("");
    if (!id) return;
    setLoading(true);
    try { await loadProject(id, request); }
    catch (cause) { if (request === epoch.current) setError(errorText(cause)); }
    finally { if (request === epoch.current) setLoading(false); }
  };

  const post = async <T,>(url: string, body: unknown): Promise<T> => json<T>(await fetch(url, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body),
  }));

  const act = async (release: Release, action: (base: string) => Promise<void>, success: string): Promise<void> => {
    if (busy || !projectId) return;
    setBusy(true); setError(""); setNotice("");
    try { await action(`${API}/turnkey/releases/${encodeURIComponent(release.id)}`); await refreshAfterMutation(success); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };
  const refreshAfterMutation = async (success: string): Promise<void> => {
    const request = ++epoch.current;
    await loadProject(projectId, request);
    setNotice(success);
  };

  const createRelease = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!detail?.capabilities.create || busy || !projectId || !selectedRevisionIds.length || !lines.length || lines.some((line) => !line.description.trim() || !line.quantity.trim() || !line.unit.trim() || !prices[line.key]?.trim()) || draftReason.trim().length < 3 || (replacesReleaseId && changeReason.trim().length < 3)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await post(`${API}/turnkey/projects/${encodeURIComponent(projectId)}/releases`, {
        revisionIds: selectedRevisionIds,
        lines: lines.map((line) => ({ ...line, description: line.description.trim(), quantity: line.quantity.trim(), unit: line.unit.trim() })),
        prices: lines.flatMap((line) => { const unitPrice = prices[line.key]?.trim(); return unitPrice ? [{ key: line.key, unitPrice }] : []; }),
        currency, reason: draftReason.trim(), ...(replacesReleaseId ? { replacesReleaseId, changeReason: changeReason.trim() } : {}),
      });
      setDraftReason(""); setChangeReason(""); setReplacesReleaseId(""); setSelectedRevisionIds([]);
      await refreshAfterMutation("Draft BOQ saved. Its selected design inputs are retained with this release.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  };

  const startApproval = (release: Release, kind: "cost-request" | "procurement-request", approverAccountId: string): void => {
    void act(release, async (base) => {
      const eligible = detail?.eligibleApprovers.find((approver) => approver.accountId === approverAccountId);
      if (!eligible || (kind === "cost-request" ? !eligible.cost : !eligible.procurement)) throw new Error("Choose an eligible approver.");
      await post(`${base}/${kind}`, { expectedVersion: release.version, approverAccountId, reason: requestReason.trim() });
      setRequestReason("");
    }, kind === "cost-request" ? "Cost approval request sent." : "Procurement approval request sent.");
  };
  const decide = (release: Release, kind: "cost-decision" | "procurement-decision"): void => {
    void act(release, async (base) => {
      await post(`${base}/${kind}`, { expectedVersion: release.version, outcome: decisionOutcome, reason: decisionReason.trim() });
      setDecisionReason("");
    }, decisionOutcome === "APPROVED" ? "Decision recorded." : "Rejection recorded and retained in the release history.");
  };

  const nextProgress = (status: string): "IN_PROGRESS" | "COMPLETED" | null => status === "NOT_STARTED" ? "IN_PROGRESS" : status === "IN_PROGRESS" ? "COMPLETED" : null;

  const addLine = (): void => setLines((current) => [...current, { key: `line-${current.length + 1}`, description: "", quantity: "", unit: "" }]);
  const removeLine = (key: string): void => setLines((current) => current.length > 1 ? current.filter((line) => line.key !== key) : current);

  return <section className="turnkey-workspace" aria-labelledby="turnkey-heading">
    <header className="turnkey-header"><div><p className="turnkey-eyebrow">TURNKEY OPERATIONS</p><h1 id="turnkey-heading">BOQ and production</h1><p>Track approved design inputs, operational materials, procurement and factory progress.</p></div><button type="button" onClick={() => void refresh()} disabled={loading || busy}>Refresh</button></header>
    {error && <p className="turnkey-error" role="alert">{error}</p>}{notice && <p className="turnkey-notice" role="status">{notice}</p>}
    {loading && <p className="turnkey-muted" role="status">Loading Turnkey projects…</p>}
    {!loading && <label className="turnkey-project-picker">Project<select aria-label="Turnkey project" value={projectId} onChange={(event) => void selectProject(event.target.value)} disabled={busy}><option value="">Choose a Turnkey project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {project.branchName} · {project.status}</option>)}</select></label>}
    {!loading && !error && !projects.length && <p className="turnkey-muted" role="status">No Turnkey projects are available to this account.</p>}
    {!loading && projectId && detail && <>
      <div className="turnkey-project-heading"><div><h2>{detail.project.title}</h2><p>{projects.find((project) => project.id === projectId)?.branchName ?? "Project branch"} · {detail.project.status}</p></div><span>{detail.releases.length} {detail.releases.length === 1 ? "release" : "releases"}</span></div>
      {detail.releases.map((release) => <article className="turnkey-release" key={release.id}>
      <header><div><p className="turnkey-eyebrow">RELEASE · V{release.version}</p><h3>{releaseLabel(release.state)}</h3><p>Created {dateLabel(release.createdAt)}</p></div><span className={`turnkey-state turnkey-state-${release.state.toLowerCase()}`}>{release.state.replaceAll("_", " ")}</span></header>
        {release.replacesReleaseId && release.changeReason && <p className="turnkey-change"><strong>Replaces prior release</strong> · {release.changeReason}</p>}
        <section className="turnkey-panel"><h4>Released design inputs</h4>{release.designs.length ? <ul>{release.designs.map((design) => <li key={design.revisionId}><strong>{design.label}</strong><small>SHA-256 {design.sha256}</small></li>)}</ul> : <p className="turnkey-muted">No design inputs are attached.</p>}</section>
        <section className="turnkey-panel"><h4>Bill of quantities</h4>{release.lines.length ? <div className="turnkey-table-wrap"><table><thead><tr><th>Item</th><th>Quantity</th><th>Unit</th>{detail.capabilities.costView && release.costs && <th>Unit price</th>}</tr></thead><tbody>{release.lines.map((line) => <tr key={line.key}><td>{line.description}</td><td>{line.quantity}</td><td>{line.unit}</td>{detail.capabilities.costView && release.costs && <td>{release.costs.prices.find((price) => price.key === line.key)?.unitPrice ?? "—"} {release.currency}</td>}</tr>)}</tbody></table></div> : <p className="turnkey-muted">No BOQ lines are recorded.</p>}{detail.capabilities.costView && release.costs && <p className="turnkey-cost-total">BOQ total: {release.costs.total} {release.currency}</p>}</section>
        {release.materials.length > 0 && <section className="turnkey-panel"><h4>Materials</h4><ul>{release.materials.map((material) => <li key={material.lineKey}><strong>{release.lines.find((line) => line.key === material.lineKey)?.description ?? material.lineKey}</strong><span>{material.material}</span></li>)}</ul></section>}
        <section className="turnkey-status-grid" aria-label="Procurement and factory status"><div><h4>Procurement</h4><p>{release.procurementStatus.replaceAll("_", " ")}</p></div><div><h4>Factory</h4><p>{release.factoryStatus.replaceAll("_", " ")}</p></div></section>
        {release.capabilities.requestCost && release.state === "DRAFT" && <form className="turnkey-form" onSubmit={(event) => { event.preventDefault(); startApproval(release, "cost-request", costApproverId); }}><h4>Request cost approval</h4><label>Approver<select value={costApproverId} onChange={(event) => setCostApproverId(event.target.value)} required><option value="">Choose an eligible approver</option>{detail.eligibleApprovers.filter((approver) => approver.cost).map((approver) => <option key={approver.accountId} value={approver.accountId}>{approver.label}</option>)}</select></label><label>Cost request reason<input value={requestReason} onChange={(event) => setRequestReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || !costApproverId || requestReason.trim().length < 3}>Send cost approval request</button></form>}
        {release.capabilities.decideCost && <form className="turnkey-form" onSubmit={(event) => { event.preventDefault(); decide(release, "cost-decision"); }}><h4>Cost approval decision</h4><label>Decision<select value={decisionOutcome} onChange={(event) => setDecisionOutcome(event.target.value as "APPROVED" | "REJECTED")}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></label><label>Cost decision reason<input value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || decisionReason.trim().length < 3}>Record decision</button></form>}
        {release.capabilities.setMaterials && <form className="turnkey-form" onSubmit={(event) => { event.preventDefault(); void act(release, async (base) => { await post(`${base}/materials`, { expectedVersion: release.version, selections: release.lines.map((line) => ({ lineKey: line.key, material: materials[line.key] ?? "" })).map((selection) => ({ ...selection, material: selection.material.trim() })), reason: materialReason.trim() }); setMaterialReason(""); }, "Material selections saved."); }}><h4>Set materials</h4>{release.lines.map((line) => <label key={line.key}>{line.description}<input value={materials[line.key] ?? release.materials.find((item) => item.lineKey === line.key)?.material ?? ""} onChange={(event) => setMaterials((current) => ({ ...current, [line.key]: event.target.value }))} minLength={2} maxLength={500} required /></label>)}<label>Material update reason<input value={materialReason} onChange={(event) => setMaterialReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || materialReason.trim().length < 3}>Save materials</button></form>}
        {release.capabilities.requestProcurement && <form className="turnkey-form" onSubmit={(event) => { event.preventDefault(); startApproval(release, "procurement-request", procurementApproverId); }}><h4>Request procurement approval</h4><label>Approver<select value={procurementApproverId} onChange={(event) => setProcurementApproverId(event.target.value)} required><option value="">Choose an eligible approver</option>{detail.eligibleApprovers.filter((approver) => approver.procurement).map((approver) => <option key={approver.accountId} value={approver.accountId}>{approver.label}</option>)}</select></label><label>Procurement request reason<input value={requestReason} onChange={(event) => setRequestReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || !procurementApproverId || requestReason.trim().length < 3}>Send procurement approval request</button></form>}
        {release.capabilities.decideProcurement && <form className="turnkey-form" onSubmit={(event) => { event.preventDefault(); decide(release, "procurement-decision"); }}><h4>Procurement decision</h4><label>Decision<select value={decisionOutcome} onChange={(event) => setDecisionOutcome(event.target.value as "APPROVED" | "REJECTED")}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></label><label>Procurement decision reason<input value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || decisionReason.trim().length < 3}>Record decision</button></form>}
        {release.capabilities.progress && <form className="turnkey-form" onSubmit={(event) => { event.preventDefault(); const current = progressStage === "PROCUREMENT" ? release.procurementStatus : release.factoryStatus; const status = nextProgress(current); if (!status) return; void act(release, async (base) => { await post(`${base}/progress`, { expectedVersion: release.version, stage: progressStage, status, reason: progressReason.trim() }); setProgressReason(""); }, "Production progress updated."); }}><h4>Update progress</h4><label>Stage<select value={progressStage} onChange={(event) => setProgressStage(event.target.value as "PROCUREMENT" | "FACTORY")}><option value="PROCUREMENT">Procurement</option><option value="FACTORY" disabled={release.procurementStatus !== "COMPLETED"}>Factory</option></select></label><p className="turnkey-muted">Next allowed status: {nextProgress(progressStage === "PROCUREMENT" ? release.procurementStatus : release.factoryStatus)?.replaceAll("_", " ") ?? "This stage is complete"}</p><label>Production progress reason<input value={progressReason} onChange={(event) => setProgressReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || progressReason.trim().length < 3 || !nextProgress(progressStage === "PROCUREMENT" ? release.procurementStatus : release.factoryStatus) || (progressStage === "FACTORY" && release.procurementStatus !== "COMPLETED")}>Save progress</button></form>}
        <details className="turnkey-history"><summary>{detail.capabilities.costView ? "Decision and change history" : "Operational history"}</summary><ol>{release.history.map((event, index) => <li key={`${event.eventName}-${event.occurredAt}-${index}`}><strong>{eventLabel(event.eventName)}</strong><span>{event.reason}</span><small>{dateLabel(event.occurredAt)}</small></li>)}</ol></details>
        {detail.capabilities.costView && release.capabilities.shareCosts && detail.clients.length > 0 && <form className="turnkey-form" onSubmit={(event) => { event.preventDefault(); void act(release, async (base) => { await post(`${base}/cost-share`, { expectedVersion: release.version, accountId: shareAccountId, view: true, reason: shareReason.trim() }); setShareReason(""); }, "Approved cost access shared with the selected client."); }}><h4>Share approved costs with a client</h4><p className="turnkey-muted">This grants read access to approved costs only. The client cannot approve costs.</p><label>Client<select value={shareAccountId} onChange={(event) => setShareAccountId(event.target.value)} required><option value="">Choose a client</option>{detail.clients.map((client) => <option key={client.accountId} value={client.accountId}>{client.label}</option>)}</select></label><label>Cost sharing reason<input value={shareReason} onChange={(event) => setShareReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || !shareAccountId || shareReason.trim().length < 3 || !release.costs}>Share approved costs</button>{(release.costShares ?? []).filter((grant) => !grant.revokedAt).map((grant) => <div className="turnkey-share" key={grant.accountId}><span>{detail.clients.find((client) => client.accountId === grant.accountId)?.label ?? "Shared client"} has approved cost access</span><button type="button" onClick={() => void act(release, async (base) => { await post(`${base}/cost-share`, { expectedVersion: release.version, accountId: grant.accountId, view: false, reason: shareReason.trim() }); setShareReason(""); }, "Client cost access withdrawn.")} disabled={busy || shareReason.trim().length < 3}>Withdraw access</button></div>)}</form>}
      </article>)}
      {detail.capabilities.create && <form className="turnkey-create" onSubmit={(event) => void createRelease(event)}><p className="turnkey-eyebrow">NEW BOQ</p><h3>Create an immutable draft</h3><p className="turnkey-muted">Select exact approved design revisions. Their file checksums are shown and retained on the release.</p>
        <fieldset><legend>Approved design inputs</legend>{detail.designCandidates.length ? detail.designCandidates.map((design) => <label key={design.revisionId}><input type="checkbox" checked={selectedRevisionIds.includes(design.revisionId)} onChange={(event) => setSelectedRevisionIds((current) => event.target.checked ? [...current, design.revisionId] : current.filter((id) => id !== design.revisionId))} /> <span>{design.label}<small>SHA-256 {design.sha256}</small></span></label>) : <p className="turnkey-muted">No approved design revisions are available.</p>}</fieldset>
        <div className="turnkey-lines"><h4>BOQ lines</h4>{lines.map((line) => <div className="turnkey-line-editor" key={line.key}><label>Description<input value={line.description} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, description: event.target.value } : item))} maxLength={300} required /></label><label>Quantity<input type="number" inputMode="decimal" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: event.target.value } : item))} required /></label><label>Unit<input value={line.unit} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, unit: event.target.value } : item))} maxLength={40} required /></label>{detail.capabilities.costView && <label>Unit price<input type="number" inputMode="decimal" min="0" step="0.0001" value={prices[line.key] ?? ""} onChange={(event) => setPrices((current) => ({ ...current, [line.key]: event.target.value }))} /></label>}<button type="button" onClick={() => removeLine(line.key)} disabled={lines.length <= 1} aria-label={`Remove ${line.description || "BOQ"} line`}>Remove</button></div>)}<button type="button" onClick={addLine}>Add BOQ line</button></div>
        <div className="turnkey-form-row"><label>Currency<input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} minLength={3} maxLength={3} pattern="[A-Z]{3}" required /></label><label>BOQ draft reason<input value={draftReason} onChange={(event) => setDraftReason(event.target.value)} minLength={3} maxLength={1000} required /></label></div>
        <label className="turnkey-picker">Replaces a release (optional)<select value={replacesReleaseId} onChange={(event) => setReplacesReleaseId(event.target.value)}><option value="">New production inputs</option>{detail.releases.filter((release) => release.state === "RELEASED").map((release) => <option key={release.id} value={release.id}>Release {release.version}</option>)}</select></label>
        {replacesReleaseId && <label className="turnkey-picker">Change request reason<input value={changeReason} onChange={(event) => setChangeReason(event.target.value)} minLength={3} maxLength={1000} required /></label>}
        <button className="turnkey-primary" type="submit" disabled={busy || !selectedRevisionIds.length || !detail.designCandidates.length || lines.some((line) => !prices[line.key]?.trim()) || draftReason.trim().length < 3 || (replacesReleaseId !== "" && changeReason.trim().length < 3)}>Save draft BOQ</button>
      </form>}
    </>}
  </section>;
}
