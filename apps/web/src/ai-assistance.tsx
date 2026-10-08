import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import "./ai-assistance.css";

const API = "/api/v1/ai";
type Kind = "DAILY" | "PROJECT" | "MANAGEMENT" | "ASSIGNMENT";
type Purpose = "PRIMARY_OWNER" | "COLLABORATOR" | "REVIEWER";
type Project = { id: string; title?: string; name?: string };
type Task = { id: string; title?: string; name?: string; projectId?: string };
type Capabilities = Partial<Record<Kind, boolean>> & { canDaily?: boolean; canProject?: boolean; canManagement?: boolean; canAssignment?: boolean; canDecide?: boolean; canRecordOutcome?: boolean; canBroaderSearch?: boolean };
type Context = { capabilities?: Capabilities; projects?: Project[]; tasks?: Task[]; requestKinds?: Kind[]; supportedKinds?: Kind[]; provider?: string | { name?: string; model?: string }; providerVersion?: string; unavailableCapabilities?: string[]; unavailable?: string[] };
type Evidence = { id?: string; sourceId?: string; label?: string; title?: string; type?: string; field?: string; value?: unknown; observedAt?: string; sourceDate?: string | null; summary?: string };
type Candidate = { employeeId: string; label?: string; displayName?: string; purpose?: Purpose; teamId?: string | null; team?: string | { label?: string }; eligible?: boolean; factors?: Array<{ key?: string; label?: string; value?: unknown; status?: string; sourceId?: string }>; unavailableFactors?: string[] };
type Result = { kind?: Kind; provider?: string; providerVersion?: string; generatedAt?: string; scope?: string | Record<string, unknown>; summary?: string; facts?: Evidence[]; candidates?: Candidate[]; unavailableFactors?: string[]; limitations?: string[] };
type Decision = { id: string; version?: number; kind?: string; outcome?: string; reason?: string; actorLabel?: string; createdAt?: string; selectionEmployeeId?: string | null; selectionPurpose?: Purpose | null; selection?: { employeeId?: string; purpose?: Purpose }; observation?: { taskId?: string; taskVersion?: number; purpose?: Purpose; employeeId?: string; observedState?: string; observedAt?: string } | null };
type Run = { id: string; kind?: Kind; projectId?: string | null; taskId?: string | null; request?: { kind?: Kind; projectId?: string | null; taskId?: string | null }; createdAt?: string; decisionVersion?: number; result?: Result; decisions?: Decision[]; summary?: string };
type ApiError = Error & { status?: number };
const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
async function api<T>(path: string, csrf: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) { headers.set("Content-Type", "application/json"); headers.set("X-CSRF-Token", csrf); }
  const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
  if (!response.ok) { const error = new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`) as ApiError; error.status = response.status; throw error; }
  return body as T;
}
const reasonText = (cause: unknown, action: string) => {
  const status = (cause as ApiError)?.status;
  if (status === 401 || status === 403 || status === 404) return "Access changed or this evidence is no longer available. Refresh to recheck current permissions.";
  if (status === 409) return "The saved evidence changed. Refresh it before making another decision.";
  return cause instanceof Error ? cause.message : `${action} failed.`;
};
const nameOf = (record: Project | Task) => record.title ?? record.name ?? record.id;
const boundedWindow = (from: string, to: string) => {
  if (!from || !to) return false;
  const start = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 30 * 24 * 60 * 60 * 1000;
};
const allowed = (context: Context | null, kind: Kind) => {
  if (!context) return false;
  const capability = context.capabilities ?? {};
  const explicit = capability[kind] ?? capability[`can${kind[0] + kind.slice(1).toLowerCase()}` as keyof Capabilities];
  return typeof explicit === "boolean" ? explicit : (context.requestKinds ?? context.supportedKinds ?? []).includes(kind);
};
function jsonText(value: unknown): string { return typeof value === "string" ? value : value == null ? "Unavailable" : JSON.stringify(value); }
const readableField = (field?: string) => ({ title: "Title", status: "Status", priority: "Priority", targetDate: "Target date", committedDueDate: "Committed due date", dueDate: "Due date", version: "Version", publishedText: "Published text" } as Record<string, string>)[field ?? ""] ?? (field ? field.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, value => value.toUpperCase()) : "Source");
const readableState = (state?: string) => state?.replaceAll("_", " ").toLowerCase() ?? "Unavailable";

export function AiAssistanceWorkspace({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  const [context, setContext] = useState<Context | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [detail, setDetail] = useState<Run | null>(null);
  const [kind, setKind] = useState<Kind>("DAILY");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [purpose, setPurpose] = useState<Purpose>("PRIMARY_OWNER");
  const [broaderSearch, setBroaderSearch] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [selection, setSelection] = useState("");
  const [outcomeReason, setOutcomeReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const commandRef = useRef<{ key: string; id: string } | null>(null);
  const detailId = useRef("");

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setError("");
    try {
      const [nextContext, nextRuns] = await Promise.all([api<Context>("/context", csrfToken), api<{ items?: Run[]; runs?: Run[] } | Run[]>("/runs", csrfToken)]);
      setContext(nextContext);
      setRuns(Array.isArray(nextRuns) ? nextRuns : nextRuns.items ?? nextRuns.runs ?? []);
      const selectedId = detailId.current;
      if (selectedId) {
        setOpening(true); setDetail(null);
        try {
          const nextDetail = await api<Run>(`/runs/${encodeURIComponent(selectedId)}`, csrfToken);
          if (detailId.current === selectedId) setDetail(nextDetail);
        } catch (cause) {
          if (detailId.current === selectedId) {
            setError(reasonText(cause, "Saved evidence"));
            setDetail(null);
            if ([401, 403, 404].includes((cause as ApiError)?.status ?? 0)) setRuns(current => current.filter(run => run.id !== selectedId));
          }
        } finally { if (detailId.current === selectedId) setOpening(false); }
      }
    } catch (cause) {
      setError(reasonText(cause, "Evidence assistance"));
      if ([401, 403].includes((cause as ApiError)?.status ?? 0)) { setContext(null); setRuns([]); setDetail(null); }
    } finally { if (initial) setLoading(false); }
  }, [csrfToken]);
  useEffect(() => { void load(true); }, [load]);

  const openRun = async (id: string) => {
    detailId.current = id; setOpening(true); setDetail(null); setError("");
    try { const result = await api<Run>(`/runs/${encodeURIComponent(id)}`, csrfToken); if (detailId.current === id) setDetail(result); }
    catch (cause) { setError(reasonText(cause, "Saved evidence")); if ([401, 403, 404].includes((cause as ApiError)?.status ?? 0)) { setDetail(null); setRuns(current => current.filter(run => run.id !== id)); } }
    finally { if (detailId.current === id) setOpening(false); }
  };
  const runRequest = async (event: FormEvent) => {
    event.preventDefault();
    if (requestReason.trim().length < 3 || !boundedWindow(from, to) || !allowed(context, kind)) return;
    const payload = { kind, reason: requestReason.trim(), from, to, ...(kind === "PROJECT" ? { projectId } : {}), ...(kind === "ASSIGNMENT" ? { taskId, purpose, broaderSearch } : {}) };
    if ((kind === "PROJECT" && !projectId) || (kind === "ASSIGNMENT" && !taskId)) return;
    const key = JSON.stringify(payload); if (commandRef.current?.key !== key) commandRef.current = { key, id: uuid() };
    setBusy(true); setError(""); setNotice("");
    try {
      const created = await api<{ id: string; run?: Run }>("/runs", csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandRef.current.id, ...payload }) });
      commandRef.current = null; setNotice("Evidence summary saved. Review it as advice only; complete any business action through its ordinary workflow."); setRequestReason("");
      await load(); await openRun(created.id ?? created.run?.id ?? "");
    } catch (cause) { setError(reasonText(cause, "Evidence request")); }
    finally { setBusy(false); }
  };
  const decide = async (outcome: "ACCEPTED" | "REJECTED" | "OVERRIDDEN") => {
    if (!detail || decisionReason.trim().length < 3) return;
    const selected = outcome === "REJECTED" ? undefined : selection;
    if (detail.result?.kind === "ASSIGNMENT" && outcome !== "REJECTED" && !selected) return;
    const payload = { expectedDecisionVersion: detail.decisionVersion ?? 0, outcome, reason: decisionReason.trim(), ...(selected ? { selection: { purpose: detail.result?.candidates?.find(candidate => candidate.employeeId === selected)?.purpose ?? purpose, employeeId: selected } } : {}) };
    const key = JSON.stringify({ runId: detail.id, ...payload }); if (commandRef.current?.key !== key) commandRef.current = { key, id: uuid() };
    setBusy(true); setError(""); setNotice("");
    try { await api(`/runs/${encodeURIComponent(detail.id)}/decisions`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandRef.current.id, ...payload }) }); commandRef.current = null; setDecisionReason(""); setNotice("Nonbinding human decision recorded. No task, reviewer, deadline, or other domain record was changed."); await load(); await openRun(detail.id); }
    catch (cause) { setError(reasonText(cause, "Decision")); }
    finally { setBusy(false); }
  };
  const recordOutcome = async () => {
    const taskId = detail?.taskId ?? detail?.request?.taskId ?? "";
    if (!detail || !taskId || outcomeReason.trim().length < 3) return;
    const accepted = [...(detail.decisions ?? [])].reverse().find(decision => ["ACCEPTED", "OVERRIDDEN"].includes(decision.outcome ?? ""));
    if (!accepted) return;
    const payload = { expectedDecisionVersion: detail.decisionVersion ?? 0, decisionId: accepted.id, taskId, reason: outcomeReason.trim() };
    const key = JSON.stringify({ runId: detail.id, ...payload }); if (commandRef.current?.key !== key) commandRef.current = { key, id: uuid() };
    setBusy(true); setError(""); setNotice("");
    try { await api(`/runs/${encodeURIComponent(detail.id)}/outcomes`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandRef.current.id, ...payload }) }); commandRef.current = null; setOutcomeReason(""); setNotice("Source-linked observation saved. This records current state; it does not imply the suggestion caused it."); await load(); await openRun(detail.id); }
    catch (cause) { setError(reasonText(cause, "Outcome observation")); }
    finally { setBusy(false); }
  };

  const result = detail?.result;
  const assignment = result?.kind === "ASSIGNMENT";
  const canDecide = context?.capabilities?.canDecide === true;
  const canRecordOutcome = context?.capabilities?.canRecordOutcome === true;
  const outcomeTaskId = detail?.taskId ?? detail?.request?.taskId ?? "";
  return <section className="ai-assist" aria-labelledby="ai-assist-title">
    <header className="ai-assist-heading"><div><p className="ai-assist-kicker">Internal workspace</p><h2 id="ai-assist-title">Evidence assistance</h2><p>Deterministic evidence summaries and explainable candidates, using only your currently authorized records.</p></div><button type="button" className="ai-assist-secondary" onClick={() => void load()} disabled={loading || busy}>Refresh</button></header>
    <p className="ai-assist-limit" role="note">Provider-independent deterministic assistance · no live inference or external data transmission. Suggestions never finalize assignments, reviews, deadlines, skills, publications, or other business actions.</p>
    {error && <p className="ai-assist-error" role="alert">{error}</p>}{notice && <p className="ai-assist-notice" role="status">{notice}</p>}
    {loading && <p role="status">Loading current permissions and saved assistance…</p>}
    {!loading && !context && <div className="ai-assist-panel"><h3>Unavailable</h3><p>Current assistance access could not be confirmed. Refresh to check again.</p></div>}
    {!loading && context && <>
      <form className="ai-assist-panel" onSubmit={event => void runRequest(event)}>
        <h3>Request a bounded evidence summary</h3>
        <div className="ai-assist-grid">
          <label>Request type<select value={kind} onChange={event => setKind(event.target.value as Kind)}>{(["DAILY", "PROJECT", "MANAGEMENT", "ASSIGNMENT"] as Kind[]).filter(value => allowed(context, value)).map(value => <option key={value} value={value}>{value === "DAILY" ? "Daily priorities" : value === "PROJECT" ? "Project summary" : value === "MANAGEMENT" ? "Management evidence" : "Assignment candidates"}</option>)}</select></label>
          {kind === "PROJECT" && <label>Project<select value={projectId} onChange={event => setProjectId(event.target.value)} required><option value="">Choose an accessible project</option>{(context.projects ?? []).map(project => <option key={project.id} value={project.id}>{nameOf(project)}</option>)}</select></label>}
          {kind === "ASSIGNMENT" && <><label>Task<select value={taskId} onChange={event => setTaskId(event.target.value)} required><option value="">Choose an accessible task</option>{(context.tasks ?? []).map(task => <option key={task.id} value={task.id}>{nameOf(task)}</option>)}</select></label><label>Candidate purpose<select value={purpose} onChange={event => setPurpose(event.target.value as Purpose)}><option value="PRIMARY_OWNER">Primary owner</option><option value="COLLABORATOR">Collaborator</option><option value="REVIEWER">Independent reviewer</option></select></label>{context.capabilities?.canBroaderSearch && <label className="ai-assist-check"><input type="checkbox" checked={broaderSearch} onChange={event => setBroaderSearch(event.target.checked)} /> Search beyond the task’s current Team (authorized leaders only)</label>}</>}
          <label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)} required /></label><label>To<input type="date" value={to} onChange={event => setTo(event.target.value)} required /></label>
          <label className="ai-assist-wide">Request reason<textarea value={requestReason} onChange={event => setRequestReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
        </div>
        <div className="ai-assist-actions"><button type="submit" disabled={busy || !allowed(context, kind) || !boundedWindow(from, to) || requestReason.trim().length < 3}>Generate evidence summary</button></div>
        {(from && to && !boundedWindow(from, to)) && <p className="ai-assist-error" role="status">Choose an ordered date range of no more than 31 calendar days.</p>}
        {Object.keys(context.capabilities ?? {}).length === 0 && <p className="ai-assist-muted">No supported request is currently available for this role.</p>}
        {(context.unavailableCapabilities ?? context.unavailable ?? []).map((item, index) => <p className="ai-assist-muted" key={`${index}-${item}`}>{item}</p>)}
      </form>
      <div className="ai-assist-columns">
        <section className="ai-assist-panel" aria-label="Saved evidence"><h3>Saved evidence</h3>{runs.length === 0 ? <p role="status">No evidence summaries are available in your current scope.</p> : <ul className="ai-assist-list">{runs.map(run => <li key={run.id}><div><strong>{run.kind ?? "Evidence summary"}</strong><span>{run.createdAt ? new Date(run.createdAt).toLocaleString() : "Date unavailable"}</span></div><button type="button" className="ai-assist-secondary" onClick={() => void openRun(run.id)}>Open</button></li>)}</ul>}</section>
        <section className="ai-assist-panel" aria-label="Selected evidence"><h3>Selected evidence</h3>{opening && !detail && <p role="status">Rechecking access and loading saved evidence…</p>}{!detail && !opening && <p role="status">Choose a saved item to review its currently authorized evidence.</p>}{detail && <>
          <p className="ai-assist-provider">{result?.provider ?? (typeof context.provider === "string" ? context.provider : context.provider?.name) ?? "deterministic-evidence-v1"} · {result?.providerVersion ?? context.providerVersion ?? "model none"}</p>
          <p>{result?.summary ?? detail.summary ?? "No summary was returned."}</p><p className="ai-assist-muted">This is an unranked, source-grounded aid. Review the evidence and unavailable factors; it is not a decision or action.</p>
          {!!result?.facts?.length && <div><h4>Evidence</h4><ul>{result.facts.map((fact, index) => <li key={fact.id ?? fact.sourceId ?? index}><strong>{fact.label ?? fact.title ?? fact.type ?? "Source"} · {readableField(fact.field)}</strong>: {jsonText(fact.value ?? fact.summary)}{fact.sourceDate ? ` · Source date ${fact.sourceDate}` : fact.observedAt ? ` · Observed ${fact.observedAt}` : ""}</li>)}</ul></div>}
          {!!result?.candidates?.length && <div><h4>Eligible candidates (unranked)</h4><ul className="ai-assist-candidates">{result.candidates.map(candidate => <li key={`${candidate.purpose ?? "candidate"}:${candidate.employeeId}`}><label><input type="radio" name="ai-selection" value={candidate.employeeId} checked={selection === candidate.employeeId} onChange={() => setSelection(candidate.employeeId)} disabled={!assignment} /><strong>{candidate.label ?? candidate.displayName ?? "Authorized candidate"}</strong></label><span>{typeof candidate.team === "string" ? candidate.team : candidate.team?.label ?? (candidate.teamId ? `Team ${candidate.teamId}` : "Team unavailable")} · {candidate.eligible === false ? "Currently unavailable" : "Eligible when checked"}</span>{candidate.factors?.map((factor, index) => <span key={`${factor.key ?? index}`}>{factor.label ?? factor.key ?? "Factor"}: {jsonText(factor.value)}{factor.status ? ` (${factor.status})` : ""}</span>)}</li>)}</ul></div>}
          {[...(result?.unavailableFactors ?? []), ...(result?.limitations ?? [])].length > 0 && <div className="ai-assist-limitations"><h4>Unavailable factors and limitations</h4><ul>{[...(result?.unavailableFactors ?? []), ...(result?.limitations ?? [])].map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
          {!!detail.decisions?.length && <div><h4>Decision and observation history</h4><ol>{detail.decisions.map(decision => decision.kind === "OUTCOME" ? <li key={decision.id}><strong>Verified source observation</strong>{decision.observation ? <><p>Current task state: {readableState(decision.observation.observedState)} · Task version {decision.observation.taskVersion ?? "Unavailable"}{decision.observation.observedAt ? ` · Observed ${decision.observation.observedAt}` : ""}</p>{decision.observation.taskId && <p>Source task: {decision.observation.taskId}</p>}</> : <p>Observation details are unavailable under current access.</p>}{decision.reason && <p>Reason: {decision.reason}</p>}<p className="ai-assist-muted">This records the observed source state; it does not imply the suggestion caused it.</p></li> : <li key={decision.id}><strong>{decision.outcome ?? decision.kind ?? "Decision"}</strong>{decision.actorLabel ? ` · ${decision.actorLabel}` : ""}{decision.reason ? ` · ${decision.reason}` : ""}</li>)}</ol></div>}
          {canDecide && <div className="ai-assist-decision"><h4>Record a nonbinding human decision</h4><label>Decision reason<textarea value={decisionReason} onChange={event => setDecisionReason(event.target.value)} minLength={3} maxLength={1000} /></label><div className="ai-assist-actions"><button type="button" disabled={busy || decisionReason.trim().length < 3 || (assignment && !selection)} onClick={() => void decide("ACCEPTED")}>Accept suggestion</button><button type="button" className="ai-assist-secondary" disabled={busy || decisionReason.trim().length < 3} onClick={() => void decide("REJECTED")}>Reject</button>{assignment && <button type="button" className="ai-assist-secondary" disabled={busy || decisionReason.trim().length < 3 || !selection} onClick={() => void decide("OVERRIDDEN")}>Record override</button>}</div><p className="ai-assist-muted">Acceptance records your choice only. Use the ordinary authorized task or review workflow to make any change.</p></div>}
          {detail.result?.kind === "ASSIGNMENT" && canRecordOutcome && <div className="ai-assist-decision"><h4>Record a later source observation</h4><p>{outcomeTaskId ? `Bound to task ${outcomeTaskId}` : "The original task reference is unavailable; outcome recording is unavailable."}</p><label>Outcome reason<textarea value={outcomeReason} onChange={event => setOutcomeReason(event.target.value)} minLength={3} maxLength={1000} /></label><button type="button" className="ai-assist-secondary" disabled={busy || !outcomeTaskId || outcomeReason.trim().length < 3} onClick={() => void recordOutcome()}>Record verified outcome</button><p className="ai-assist-muted">The current task state is verified by its owning workflow; this observation does not infer causation or success.</p></div>}
        </>}</section>
      </div>
    </>}
  </section>;
}
