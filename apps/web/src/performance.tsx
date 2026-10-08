import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./performance.css";

const API = "/api/v1/performance";
type Family = "EMPLOYEE" | "LEADER" | "DESIGN" | "TURNKEY";
type Evidence = { kind: string; id: string; version: number; description: string; values?: Record<string, unknown> };
type SnapshotComponent = { metric: string; label?: string; raw: number | null; normalized: number | null; weight: number; evidence: Evidence[] };
type CycleNote = { actorId: string; text: string; at: string };
type RecordData = { [key: string]: unknown; family?: Family; groupKey?: string; label?: string; effectiveFrom?: string; from?: string; to?: string; status?: string; score?: number | null; scoreChange?: number | null; previousSnapshotId?: string | null; changeExplanation?: string[]; healthStatus?: string | null; policyId?: string; policyVersion?: number; explanation?: string[]; missing?: string[]; components?: SnapshotComponent[]; strengths?: string[]; weaknesses?: string[]; repeatedMistakes?: Array<{ category: string; reviewRoundIds: string[] }>; improvementActions?: string[]; operational?: { scheduleVarianceDays?: number | null; scopeChangeImpact?: Array<{ addedScope?: string; effectiveAt?: string }>; workloadRisk?: Array<Record<string, unknown>> }; excluded?: unknown[]; unavailable?: string[]; frequency?: string; finalizedAt?: string | null; finalizedBy?: string | null; goals?: string[]; developmentActions?: string[]; comments?: CycleNote[]; acknowledgements?: CycleNote[]; scoreId?: string | null; cause?: string; days?: number; summary?: string; sourceKind?: string; sourceId?: string; external?: boolean; supersedesId?: string | null; deliveryType?: string };
type RecordRow = { id: string; organizationId: string; kind: string; state: string; version: number; employeeId: string | null; projectId: string | null; data: RecordData; createdById: string; createdAt: string; updatedAt: string };
type Metric = { key: string; label: string; families: Family[]; category: string; unit: string; description: string };
type Employee = { id: string; label: string; teamId: string; branchId: string; canManage: boolean };
type Project = { id: string; label: string; deliveryType: "DESIGN" | "TURNKEY" };
type Context = { owner: boolean; employeeId: string | null; employees: Employee[]; projects: Project[]; policies: RecordRow[]; assignments: RecordRow[]; metrics: Metric[]; unavailable: string[] };
type EmployeeView = { employee: { id: string; label: string }; snapshots: RecordRow[]; cycles: RecordRow[]; groupAssignments: RecordRow[]; teamAverage: number | null; relativeToAverage: number | null; canManage: boolean; unavailable: string[] };
type ProjectView = { project: { id: string; label: string; deliveryType: string }; snapshots: RecordRow[]; delays: RecordRow[]; delayTotalDays: number; delayByCause: Array<{ cause: string; days: number }>; canManage: boolean; unavailable: string[] };
type ComponentForm = { metric: string; weight: string; min: string; max: string; direction: "HIGHER" | "LOWER"; required: boolean };
type Thresholds = { criticalBelow: string; delayedBelow: string; atRiskBelow: string };
type PolicyEditorProps = { busy: boolean; context: Context; policyFamily: Family; setPolicyFamily: (family: Family) => void; groupKey: string; setGroupKey: (value: string) => void; policyLabel: string; setPolicyLabel: (value: string) => void; effectiveFrom: string; setEffectiveFrom: (value: string) => void; components: ComponentForm[]; compatibleMetrics: Metric[]; addMetric: () => void; updateComponent: (index: number, change: Partial<ComponentForm>) => void; removeComponent: (index: number) => void; attendanceCap: string; setAttendanceCap: (value: string) => void; efficiencyCap: string; setEfficiencyCap: (value: string) => void; strengthAt: string; setStrengthAt: (value: string) => void; weaknessBelow: string; setWeaknessBelow: (value: string) => void; thresholds: Thresholds; setThresholds: (value: Thresholds) => void; savePolicy: () => void; mutate: (operation: string, fields: Record<string, unknown>, refresh?: "context" | "employee" | "project") => Promise<void> };
const causes = ["INTERNAL_TEAM", "CLIENT", "CONSULTANT", "VENDOR", "FACTORY", "PROCUREMENT", "MATERIAL", "SITE_CONDITION", "APPROVAL", "SCOPE_CHANGE", "OTHER"];
const sourceKinds = ["TASK_STATUS", "TASK_DATE", "REVIEW_ROUND", "SITE_HISTORY", "PROJECT_SCOPE"];
const frequencies = ["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"];
const commandId = () => crypto.randomUUID();

class PerformanceError extends Error { constructor(message: string, readonly status: number) { super(message); } }
async function request<T>(url: string, csrf: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) { headers.set("Content-Type", "application/json"); headers.set("X-CSRF-Token", csrf); }
  const response = await fetch(url, { ...init, headers, credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
  if (!response.ok) throw new PerformanceError(body.error?.message ?? body.message ?? `Request failed (${response.status})`, response.status);
  return body as T;
}
const explainValue = (value: unknown) => value === null || value === undefined || value === "" ? "—" : String(value);
const validDateRange = (from: string, to: string) => Boolean(from && to && from <= to);

export function PerformanceWorkspace({ csrfToken, owner }: { csrfToken: string; owner: boolean }): React.JSX.Element {
  const [context, setContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingCommand = useRef<{ fingerprint: string; id: string } | null>(null);
  const employeeRequest = useRef(0);
  const projectRequest = useRef(0);
  const [tab, setTab] = useState<"employee" | "project">("employee");
  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState(() => new URLSearchParams(window.location.search).get("projectId") ?? "");
  const [employee, setEmployee] = useState<EmployeeView | null>(null);
  const [project, setProject] = useState<ProjectView | null>(null);
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [family, setFamily] = useState<Family>("EMPLOYEE");
  const [policyFamily, setPolicyFamily] = useState<Family>("EMPLOYEE");
  const [groupKey, setGroupKey] = useState("");
  const [policyLabel, setPolicyLabel] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [components, setComponents] = useState<ComponentForm[]>([]);
  const [attendanceCap, setAttendanceCap] = useState("");
  const [efficiencyCap, setEfficiencyCap] = useState("");
  const [strengthAt, setStrengthAt] = useState("");
  const [weaknessBelow, setWeaknessBelow] = useState("");
  const [thresholds, setThresholds] = useState({ criticalBelow: "", delayedBelow: "", atRiskBelow: "" });
  const [assignmentDate, setAssignmentDate] = useState("");
  const [cycleFrequency, setCycleFrequency] = useState("MONTHLY");
  const [goalsText, setGoalsText] = useState("");
  const [actionsText, setActionsText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [ackText, setAckText] = useState("");
  const [delay, setDelay] = useState({ cause: "", days: "", sourceKind: "", sourceId: "", employeeId: "", external: false, from: "", to: "", summary: "" });

  const loadContext = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const value = await request<Context>(`${API}/context`, csrfToken);
      setContext(value); setEmployeeId(current => current || value.employeeId || value.employees[0]?.id || ""); setProjectId(current => current || value.projects[0]?.id || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Performance data could not be loaded."); }
    finally { setLoading(false); }
  }, [csrfToken]);
  const loadEmployee = useCallback(async () => {
    const requestId = ++employeeRequest.current;
    if (!employeeId) { setEmployee(null); return; }
    setEmployee(null);
    try { const value = await request<EmployeeView>(`${API}/employees/${encodeURIComponent(employeeId)}`, csrfToken); if (requestId === employeeRequest.current) setEmployee(value); }
    catch (cause) { if (requestId === employeeRequest.current) { setEmployee(null); setError(cause instanceof Error ? cause.message : "Employee performance could not be loaded."); } }
  }, [csrfToken, employeeId]);
  const loadProject = useCallback(async () => {
    const requestId = ++projectRequest.current;
    if (!projectId) { setProject(null); return; }
    setProject(null);
    try { const value = await request<ProjectView>(`${API}/projects/${encodeURIComponent(projectId)}`, csrfToken); if (requestId === projectRequest.current) setProject(value); }
    catch (cause) { if (requestId === projectRequest.current) { setProject(null); setError(cause instanceof Error ? cause.message : "Project health could not be loaded."); } }
  }, [csrfToken, projectId]);
  useEffect(() => { void loadContext(); }, [loadContext]);
  useEffect(() => { void loadEmployee(); }, [loadEmployee]);
  useEffect(() => { void loadProject(); }, [loadProject]);

  const mutate = async (operation: string, fields: Record<string, unknown>, refresh: "context" | "employee" | "project" = tab) => {
    if (reason.trim().length < 3) { setError("Enter a reason of at least three characters."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const fingerprint = JSON.stringify({ reason: reason.trim(), operation, fields });
      if (pendingCommand.current?.fingerprint !== fingerprint) pendingCommand.current = { fingerprint, id: commandId() };
      await request<RecordRow>(`${API}/commands`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: pendingCommand.current.id, reason: reason.trim(), operation, ...fields }) });
      pendingCommand.current = null;
      if (refresh === "context") await loadContext();
      if (refresh === "employee") await loadEmployee();
      if (refresh === "project") await loadProject();
      setNotice("Performance record saved."); setReason("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The action could not be completed."); }
    finally { setBusy(false); }
  };
  const policyFor = (currentFamily: Family, currentGroup: string) => context?.policies.find(row => row.kind === "POLICY" && row.state === "APPROVED" && row.data.family === currentFamily && row.data.groupKey === currentGroup);
  const compatibleMetrics = useMemo(() => context?.metrics.filter(metric => metric.families.includes(policyFamily)) ?? [], [context, policyFamily]);
  const activeEmployee = context?.employees.find(row => row.id === employeeId);
  const canManageEmployee = owner || employee?.canManage === true || activeEmployee?.canManage === true;
  const canManageProject = owner || project?.canManage === true;
  const snapshots = (rows: RecordRow[]) => rows.filter(row => row.kind === "SCORE" || row.kind === "HEALTH");
  const assignedGroup = employee?.groupAssignments.find(row => row.data.family === family)?.data.groupKey ?? "";
  const approvedEmployeePolicy = policyFor(family, assignedGroup);
  const approvedProjectPolicy = project ? policyFor(project.project.deliveryType as Family, project.project.deliveryType) : undefined;
  const familySnapshots = snapshots(employee?.snapshots ?? []).filter(row => row.data.family === family);
  const cycleSnapshot = familySnapshots.find(row => row.data.from === from && row.data.to === to);
  const changePolicyFamily = (next: Family) => { setPolicyFamily(next); setGroupKey(next === "DESIGN" || next === "TURNKEY" ? next : ""); setPolicyLabel(""); setEffectiveFrom(""); setComponents([]); setAttendanceCap(""); setEfficiencyCap(""); setStrengthAt(""); setWeaknessBelow(""); setThresholds({ criticalBelow: "", delayedBelow: "", atRiskBelow: "" }); };
  const addMetric = () => { const available = compatibleMetrics.find(metric => !components.some(row => row.metric === metric.key)); if (available) setComponents(rows => [...rows, { metric: available.key, weight: "", min: "", max: "", direction: available.category.includes("turnaround") || available.category.includes("count") ? "LOWER" : "HIGHER", required: true }]); };
  const updateComponent = (index: number, change: Partial<ComponentForm>) => setComponents(rows => rows.map((row, i) => i === index ? { ...row, ...change } : row));
  const savePolicy = () => {
    const policy = { family: policyFamily, groupKey: groupKey.trim(), label: policyLabel.trim(), effectiveFrom, components: components.map(row => ({ ...row, weight: Number(row.weight), min: Number(row.min), max: Number(row.max) })), attendanceMaxWeight: Number(attendanceCap), efficiencyMaxWeight: Number(efficiencyCap), strengthAt: Number(strengthAt), weaknessBelow: Number(weaknessBelow), thresholds: { criticalBelow: Number(thresholds.criticalBelow), delayedBelow: Number(thresholds.delayedBelow), atRiskBelow: Number(thresholds.atRiskBelow) } };
    if (!groupKey.trim() || !policyLabel.trim() || !effectiveFrom || components.length === 0 || components.some(row => row.weight === "" || row.min === "" || row.max === "") || attendanceCap === "" || efficiencyCap === "" || strengthAt === "" || weaknessBelow === "" || Object.values(thresholds).some(value => value === "")) { setError("Complete every policy field explicitly. No values are prefilled."); return; }
    void mutate("POLICY_CREATE", { policy }, "context");
  };
  if (loading) return <section className="identity-section performance"><p role="status">Loading performance…</p></section>;
  if (!context) return <section className="identity-section performance"><h1>Performance and project health</h1><p role="alert" className="auth-error">{error || "Performance is unavailable."}</p><button type="button" onClick={() => void loadContext()}>Try again</button></section>;
  return <section className="identity-section performance" aria-labelledby="performance-heading">
    <header className="perf-heading"><div><div className="eyebrow">PEOPLE & DELIVERY</div><h1 id="performance-heading">Performance and project health</h1><p>Published snapshots retain their source evidence, selected policy and calculation.</p></div><button type="button" className="secondary-action" disabled={busy} onClick={() => { void loadContext(); void loadEmployee(); void loadProject(); }}>Refresh</button></header>
    <div className="perf-tabs" role="tablist" aria-label="Performance views"><button role="tab" aria-selected={tab === "employee"} onClick={() => setTab("employee")}>Employee performance</button><button role="tab" aria-selected={tab === "project"} onClick={() => setTab("project")}>Design / Turnkey health</button></div>
    {error && <p role="alert" className="auth-error">{error}</p>}{notice && <p role="status" className="notice">{notice}</p>}
    <label className="perf-reason">Reason for this action (required)<input disabled={busy} value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} placeholder="Explain why this change or review is needed" /></label>
    {context.unavailable.length > 0 && <p className="perf-unavailable">Unavailable in this release: {context.unavailable.join(", ")}. No training, skills or SOP evidence is inferred.</p>}
    {tab === "employee" ? <>
      <div className="perf-toolbar"><label>Employee<select aria-label="Employee" disabled={busy} value={employeeId} onChange={event => { employeeRequest.current += 1; setEmployee(null); setEmployeeId(event.target.value); }}><option value="">Choose employee</option>{context.employees.map(row => <option key={row.id} value={row.id}>{row.label}{row.id === context.employeeId ? " (you)" : ""}</option>)}</select></label><label>Score family<select aria-label="Score family" value={family} onChange={event => setFamily(event.target.value as Family)}><option value="EMPLOYEE">Employee score</option><option value="LEADER">Team Leader management score</option></select></label></div>
      {!employeeId ? <div className="perf-empty" role="status">No employee performance records are available in your current scope.</div> : <>
        <div className="perf-panel"><h2>{employee?.employee.label ?? "Employee"}</h2><p>Current score and history are available only when an Owner-approved policy and sufficient source evidence exist.</p>
          {!approvedEmployeePolicy && <div className="perf-empty" role="status"><strong>Policy not configured</strong><p>No approved {family === "LEADER" ? "Team Leader" : "employee"} policy is assigned to this employee group. No score is shown or generated.</p></div>}
          {employee && familySnapshots.length === 0 && <p className="perf-empty" role="status">No published {family === "LEADER" ? "Team Leader management" : "employee"} score history yet. Missing required evidence remains insufficient; it is never replaced with a zero.</p>}
          {employee?.teamAverage === null && <p className="perf-empty" role="status">Anonymous own-team average is unavailable until the permitted team has compatible scored evidence.</p>}
          {employee && employee.teamAverage !== null && family === "EMPLOYEE" && <p className="perf-average">Your team average: <strong>{employee.teamAverage.toFixed(1)}</strong>{employee.relativeToAverage !== null && <span> · {employee.relativeToAverage >= 0 ? "+" : ""}{employee.relativeToAverage.toFixed(1)} relative to the anonymous average</span>}</p>}
          {familySnapshots.map(row => <SnapshotCard key={row.id} row={row} />)}
          {employee?.cycles.map(cycle => <CycleCard key={cycle.id} cycle={cycle} snapshots={employee.snapshots} self={cycle.employeeId === context.employeeId} canManage={owner || employee.canManage} owner={owner} busy={busy} mutate={mutate} ackText={ackText} setAckText={setAckText} commentText={commentText} setCommentText={setCommentText} />)}
        </div>
        {canManageEmployee && <div className="perf-panel"><h2>Generate a grounded score snapshot</h2><p>Generation requires a current approved policy, explicit group assignment and sufficient persisted source evidence. Scores preserve exact source versions.</p><div className="perf-toolbar"><label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label></div><button disabled={busy || !validDateRange(from, to) || !approvedEmployeePolicy} onClick={() => void mutate("EMPLOYEE_SNAPSHOT", { employeeId, family, from, to }, "employee")}>Generate {family.toLowerCase()} snapshot</button>
          <div className="perf-toolbar"><label>Assign role group<select aria-label="Assignment family" value={family} onChange={event => setFamily(event.target.value as Family)}><option value="EMPLOYEE">Employee</option><option value="LEADER">Team Leader</option></select></label><label>Approved group<select aria-label="Approved group" value={groupKey} onChange={event => setGroupKey(event.target.value)}><option value="">Choose an approved group</option>{context.policies.filter(row => row.kind === "POLICY" && row.state === "APPROVED" && row.data.family === family).map(row => <option key={row.id} value={row.data.groupKey}>{row.data.label} · {row.data.groupKey}</option>)}</select></label><label>Effective from<input type="date" value={assignmentDate} onChange={event => setAssignmentDate(event.target.value)} /></label></div><button className="secondary-action" disabled={busy || !groupKey || !assignmentDate} onClick={() => void mutate("ASSIGN_GROUP", { employeeId, family, groupKey, effectiveFrom: assignmentDate }, "employee")}>Save dated group assignment</button>
          <div className="perf-toolbar"><label>Review frequency<select value={cycleFrequency} onChange={event => setCycleFrequency(event.target.value)}>{frequencies.map(value => <option key={value}>{value}</option>)}</select></label></div><div className="perf-toolbar"><label>Cycle goals (one per line)<textarea value={goalsText} onChange={event => setGoalsText(event.target.value)} rows={2} /></label><label>Development actions (one per line)<textarea value={actionsText} onChange={event => setActionsText(event.target.value)} rows={2} /></label></div><button className="secondary-action" disabled={busy || !validDateRange(from, to) || !cycleSnapshot} onClick={() => void mutate("CYCLE_CREATE", { employeeId, frequency: cycleFrequency, from, to, scoreId: cycleSnapshot?.id ?? null, goals: lines(goalsText), developmentActions: lines(actionsText) }, "employee")}>Create review cycle</button>
        </div>}
      </>}
    </> : <>
      <div className="perf-toolbar"><label>Project<select aria-label="Project" disabled={busy} value={projectId} onChange={event => { projectRequest.current += 1; setProject(null); setProjectId(event.target.value); }}><option value="">Choose project</option>{context.projects.map(row => <option key={row.id} value={row.id}>{row.label} · {row.deliveryType}</option>)}</select></label></div>
      {!projectId ? <div className="perf-empty" role="status">No Design or Turnkey projects are available in your current project scope.</div> : <>
        <div className="perf-panel"><h2>{project?.project.label ?? "Project health"}</h2><p>Health evidence is derived from persisted schedules, milestones, reviews, pending decisions, scope and workload.</p>
          {project?.snapshots.length === 0 && <div className="perf-empty" role="status"><strong>No health snapshot</strong><p>No published snapshot is available. An approved policy and grounded evidence are required before a status is shown.</p></div>}
          {project?.snapshots.map(row => <SnapshotCard key={row.id} row={row} />)}
          <div className="perf-panel"><h3>Delay attribution</h3><p>Cause and source linkage must be reviewed and entered explicitly. Waiting text alone never assigns responsibility.</p><p><strong>Total allocated delay:</strong> {project?.delayTotalDays ?? 0} days</p><ul>{project?.delayByCause.map(item => <li key={item.cause}>{item.cause.replaceAll("_", " ")}: {item.days} days</li>)}</ul>{project?.delays.map(row => <DelayCard key={row.id} row={row} />)}</div>
        </div>
        {!approvedProjectPolicy && <p className="perf-empty" role="status">No approved {project?.project.deliveryType ?? "project health"} policy is configured. No health result is shown or generated.</p>}
        {canManageProject && <div className="perf-panel"><h2>Generate health and review delays</h2><div className="perf-toolbar"><label>From<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} onChange={event => setTo(event.target.value)} /></label></div><button disabled={busy || !validDateRange(from, to) || !approvedProjectPolicy} onClick={() => void mutate("PROJECT_SNAPSHOT", { projectId, from, to }, "project")}>Generate project health snapshot</button>
          {owner && <><h3>Owner reviewed delay source</h3><div className="perf-toolbar"><label>Cause<select aria-label="Delay cause" value={delay.cause} onChange={event => setDelay({ ...delay, cause: event.target.value })}><option value="">Choose cause</option>{causes.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label>Allocated delay (days)<input type="number" min="0" step="0.25" value={delay.days} onChange={event => setDelay({ ...delay, days: event.target.value })} /></label><label>Source kind<select aria-label="Delay source kind" value={delay.sourceKind} onChange={event => setDelay({ ...delay, sourceKind: event.target.value })}><option value="">Choose source</option>{sourceKinds.map(value => <option key={value}>{value}</option>)}</select></label><label>Source record ID<input value={delay.sourceId} onChange={event => setDelay({ ...delay, sourceId: event.target.value })} /></label><label>Employee ID (optional)<input value={delay.employeeId} onChange={event => setDelay({ ...delay, employeeId: event.target.value })} /></label><label>From<input type="date" value={delay.from} onChange={event => setDelay({ ...delay, from: event.target.value })} /></label><label>To<input type="date" value={delay.to} onChange={event => setDelay({ ...delay, to: event.target.value })} /></label></div><label>Evidence summary<textarea value={delay.summary} onChange={event => setDelay({ ...delay, summary: event.target.value })} rows={2} /></label><label className="perf-checkbox"><input type="checkbox" checked={delay.external} onChange={event => setDelay({ ...delay, external: event.target.checked })} /> Owner-reviewed external cause</label><button className="secondary-action" disabled={busy || !delay.cause || !delay.days || !delay.sourceKind || !delay.sourceId || !delay.from || !delay.to || !delay.summary.trim()} onClick={() => void mutate("DELAY_RECORD", { projectId, delay: { ...delay, days: Number(delay.days), employeeId: delay.employeeId || null, supersedesId: null } }, "project")}>Record attributed delay</button></>}
        </div>}
      </>}
    </>}
    {owner && <PolicyEditor busy={busy} context={context} policyFamily={policyFamily} setPolicyFamily={changePolicyFamily} groupKey={groupKey} setGroupKey={setGroupKey} policyLabel={policyLabel} setPolicyLabel={setPolicyLabel} effectiveFrom={effectiveFrom} setEffectiveFrom={setEffectiveFrom} components={components} compatibleMetrics={compatibleMetrics} addMetric={addMetric} updateComponent={updateComponent} removeComponent={(index: number) => setComponents(rows => rows.filter((_, i) => i !== index))} attendanceCap={attendanceCap} setAttendanceCap={setAttendanceCap} efficiencyCap={efficiencyCap} setEfficiencyCap={setEfficiencyCap} strengthAt={strengthAt} setStrengthAt={setStrengthAt} weaknessBelow={weaknessBelow} setWeaknessBelow={setWeaknessBelow} thresholds={thresholds} setThresholds={setThresholds} savePolicy={savePolicy} mutate={mutate} />}
  </section>;
}

function lines(text: string) { return text.split(/\r?\n/).map(row => row.trim()).filter(Boolean); }
function SnapshotCard({ row }: { row: RecordRow }) {
  const data = row.data;
  return <article className="perf-snapshot"><header><div><strong>{data.family ?? (row.kind === "HEALTH" ? data.deliveryType : "Score")} · {data.from} – {data.to}</strong><p>Policy {data.policyId ?? "unavailable"} · version {data.policyVersion ?? "—"}</p></div><b className={data.status === "SCORED" ? "perf-status scored" : "perf-status"}>{data.healthStatus ?? (data.status === "INSUFFICIENT_EVIDENCE" ? "Insufficient evidence" : data.status ?? "Published")}</b></header><div className="perf-score">{data.score === null || data.score === undefined ? "No numeric score" : `${Number(data.score).toFixed(1)} / 100`}</div>
    {data.previousSnapshotId && <p>Compared with immutable snapshot {data.previousSnapshotId}.</p>}{data.scoreChange !== null && data.scoreChange !== undefined && <p><strong>Change from prior result:</strong> {data.scoreChange > 0 ? "+" : ""}{data.scoreChange.toFixed(1)} points</p>}{data.changeExplanation?.map((item, index) => <p key={`change-${index}`}>{item}</p>)}
    {data.explanation?.map((item: string, index: number) => <p key={index}>{item}</p>)}{(data.missing?.length ?? 0) > 0 && <p><strong>Missing evidence:</strong> {data.missing?.join(", ")}</p>}
    {data.components && data.components.length > 0 && <div className="perf-table-wrap"><table><thead><tr><th>Measure</th><th>Observed</th><th>Normalized</th><th>Weight</th><th>Evidence</th></tr></thead><tbody>{data.components.map((item, index) => <tr key={`${item.metric}-${index}`}><td>{item.label ?? item.metric}</td><td>{explainValue(item.raw)}</td><td>{explainValue(item.normalized)}</td><td>{item.weight}%</td><td>{item.evidence.length ? item.evidence.map(e => `${e.description} (${e.kind} ${e.id} v${e.version})`).join("; ") : "No accessible source reference"}</td></tr>)}</tbody></table></div>}
    {(data.strengths?.length ?? 0) > 0 || (data.weaknesses?.length ?? 0) > 0 || (data.repeatedMistakes?.length ?? 0) > 0 || (data.improvementActions?.length ?? 0) > 0 ? <div className="perf-insights">{(data.strengths?.length ?? 0) > 0 && <p><strong>Strengths:</strong> {data.strengths?.join("; ")}</p>}{(data.weaknesses?.length ?? 0) > 0 && <p><strong>Areas to improve:</strong> {data.weaknesses?.join("; ")}</p>}{(data.repeatedMistakes?.length ?? 0) > 0 && <p><strong>Repeated patterns:</strong> {data.repeatedMistakes?.map(item => `${item.category} (${item.reviewRoundIds.length} review rounds)`).join("; ")}</p>}{(data.improvementActions?.length ?? 0) > 0 && <p><strong>Improvement actions:</strong> {data.improvementActions?.join("; ")}</p>}</div> : null}
    {data.operational && <div className="perf-insights"><strong>Operational facts:</strong>{data.operational.scheduleVarianceDays !== undefined && <p>Schedule variance: {data.operational.scheduleVarianceDays === null ? "insufficient schedule evidence" : `${data.operational.scheduleVarianceDays} days`}</p>}{(data.operational.scopeChangeImpact?.length ?? 0) > 0 && <p>Effective scope additions: {data.operational.scopeChangeImpact?.map(item => `${item.addedScope ?? "Scope addition"} (${item.effectiveAt ?? "date unavailable"})`).join("; ")}</p>}{(data.operational.workloadRisk?.length ?? 0) > 0 && <p>Schedule-derived capacity evidence: {data.operational.workloadRisk?.length} dated allocation(s) reviewed.</p>}</div>}
    <details><summary>Snapshot, exclusions and unavailable measures</summary><p>Frozen snapshot {row.id}; created {row.createdAt}. Exclusions: {JSON.stringify(data.excluded ?? [])}</p><p>Unavailable: {(data.unavailable ?? []).join(", ") || "None reported"}</p></details>
  </article>;
}
function DelayCard({ row }: { row: RecordRow }) { const d = row.data; return <article className="perf-delay"><strong>{String(d.cause).replaceAll("_", " ")} · {d.days} days</strong><p>{d.from} – {d.to} · {d.summary}</p><small>Source: {d.sourceKind} {d.sourceId}{d.external ? " · Owner reviewed as external" : ""}{d.supersedesId ? ` · corrects ${d.supersedesId}` : ""}</small></article>; }

function CycleCard({ cycle, snapshots: scoreRows, self, canManage, owner, busy, mutate, ackText, setAckText, commentText, setCommentText }: { cycle: RecordRow; snapshots: RecordRow[]; self: boolean; canManage: boolean; owner: boolean; busy: boolean; mutate: (operation: string, fields: Record<string, unknown>, refresh?: "context" | "employee" | "project") => Promise<void>; ackText: string; setAckText: (value: string) => void; commentText: string; setCommentText: (value: string) => void }) {
  const [goalsText, setGoalsText] = useState("");
  const [actionsText, setActionsText] = useState("");
  const d = cycle.data;
  const eligibleScore = scoreRows.find(row => row.kind === "SCORE" && row.data.family === "EMPLOYEE" && row.data.from === d.from && row.data.to === d.to);
  useEffect(() => { setGoalsText((d.goals ?? []).join("\n")); setActionsText((d.developmentActions ?? []).join("\n")); }, [cycle]);
  return <article className="perf-cycle"><header><strong>{d.frequency} review · {d.from} – {d.to}</strong><span>{d.finalizedAt ? "Finalized" : "Open"}</span></header>{(d.goals?.length ?? 0) > 0 && <p><strong>Goals:</strong> {d.goals?.join("; ")}</p>}{(d.developmentActions?.length ?? 0) > 0 && <p><strong>Development actions:</strong> {d.developmentActions?.join("; ")}</p>}
    {d.comments?.map((item, index) => <p key={index}><strong>Manager comment:</strong> {item.text}</p>)}{d.acknowledgements?.map((item, index) => <p key={index}><strong>Employee acknowledgement:</strong> {item.text}</p>)}
    {self && <div className="perf-inline-form"><label>Your acknowledgement<input value={ackText} onChange={event => setAckText(event.target.value)} /></label><button className="secondary-action" disabled={busy || !ackText.trim()} onClick={() => void mutate("CYCLE_ACKNOWLEDGE", { id: cycle.id, expectedVersion: cycle.version, text: ackText.trim() }, "employee")}>Acknowledge this cycle</button><small>Acknowledgement records that you saw the cycle; it does not change your score or approve the review.</small></div>}
    {canManage && d.finalizedAt == null && <div className="perf-inline-form"><label>Manager comment<input value={commentText} onChange={event => setCommentText(event.target.value)} /></label><label>Goals, one per line<textarea value={goalsText} onChange={event => setGoalsText(event.target.value)} rows={2} /></label><label>Development actions, one per line<textarea value={actionsText} onChange={event => setActionsText(event.target.value)} rows={2} /></label><button className="secondary-action" disabled={busy || !commentText.trim()} onClick={() => void mutate("CYCLE_COMMENT", { id: cycle.id, expectedVersion: cycle.version, text: commentText.trim(), goals: lines(goalsText), developmentActions: lines(actionsText) }, "employee")}>Save review comment</button>{owner && <><p>Finalization will bind employee score snapshot {d.scoreId ?? eligibleScore?.id ?? "unavailable"} for this exact period.</p><button disabled={busy || !(d.scoreId || eligibleScore)} onClick={() => void mutate("CYCLE_FINALIZE", { id: cycle.id, expectedVersion: cycle.version }, "employee")}>Finalize cycle</button></>}</div>}
  </article>;
}

function PolicyEditor({ busy, context, policyFamily, setPolicyFamily, groupKey, setGroupKey, policyLabel, setPolicyLabel, effectiveFrom, setEffectiveFrom, components, compatibleMetrics, addMetric, updateComponent, removeComponent, attendanceCap, setAttendanceCap, efficiencyCap, setEfficiencyCap, strengthAt, setStrengthAt, weaknessBelow, setWeaknessBelow, thresholds, setThresholds, savePolicy, mutate }: PolicyEditorProps) {
  return <details className="perf-panel perf-owner" open><summary>Owner policy setup and approval</summary><p>Enter every formula value explicitly, review the metric catalogue and approve the draft before generating snapshots. No active defaults are supplied.</p><div className="perf-toolbar"><label>Policy family<select aria-label="Policy family" value={policyFamily} onChange={event => setPolicyFamily(event.target.value as Family)}><option value="EMPLOYEE">Employee</option><option value="LEADER">Team Leader</option><option value="DESIGN">Design health</option><option value="TURNKEY">Turnkey health</option></select></label>{policyFamily === "DESIGN" || policyFamily === "TURNKEY" ? <p>Project health group: {policyFamily}</p> : <label>Role group key<input value={groupKey} onChange={event => setGroupKey(event.target.value)} placeholder="Owner-defined group key" /></label>}<label>Label<input value={policyLabel} onChange={event => setPolicyLabel(event.target.value)} /></label><label>Effective from<input type="date" value={effectiveFrom} onChange={event => setEffectiveFrom(event.target.value)} /></label></div>
    <p>Employee and Team Leader groups are separately assigned. Design and Turnkey use distinct policies and thresholds.</p>{components.map((row: ComponentForm, index: number) => <div className="perf-component" key={`${row.metric}-${index}`}><label>Metric<select value={row.metric} onChange={event => updateComponent(index, { metric: event.target.value })}>{compatibleMetrics.map((metric: Metric) => <option key={metric.key} value={metric.key}>{metric.label} · {metric.unit}</option>)}</select></label><label>Weight<input type="number" min="0" max="100" value={row.weight} onChange={event => updateComponent(index, { weight: event.target.value })} /></label><label>Minimum<input type="number" value={row.min} onChange={event => updateComponent(index, { min: event.target.value })} /></label><label>Maximum<input type="number" value={row.max} onChange={event => updateComponent(index, { max: event.target.value })} /></label><label>Direction<select value={row.direction} onChange={event => updateComponent(index, { direction: event.target.value as ComponentForm["direction"] })}><option value="HIGHER">Higher is better</option><option value="LOWER">Lower is better</option></select></label><label className="perf-checkbox"><input type="checkbox" checked={row.required} onChange={event => updateComponent(index, { required: event.target.checked })} /> Required evidence</label><button type="button" className="secondary-action" onClick={() => removeComponent(index)}>Remove measure</button><small>{compatibleMetrics.find((metric: Metric) => metric.key === row.metric)?.description}</small></div>)}<button type="button" className="secondary-action" disabled={!compatibleMetrics.some((metric: Metric) => !components.some((row: ComponentForm) => row.metric === metric.key))} onClick={addMetric}>Add measurable source</button>
    <div className="perf-toolbar"><label>Attendance maximum weight<input type="number" min="0" max="100" value={attendanceCap} onChange={event => setAttendanceCap(event.target.value)} /></label><label>Efficiency maximum weight<input type="number" min="0" max="100" value={efficiencyCap} onChange={event => setEfficiencyCap(event.target.value)} /></label><label>Strength at or above<input type="number" min="0" max="100" value={strengthAt} onChange={event => setStrengthAt(event.target.value)} /></label><label>Weakness below<input type="number" min="0" max="100" value={weaknessBelow} onChange={event => setWeaknessBelow(event.target.value)} /></label></div>
    <div className="perf-toolbar"><label>Critical below<input type="number" min="0" max="100" value={thresholds.criticalBelow} onChange={event => setThresholds({ ...thresholds, criticalBelow: event.target.value })} /></label><label>Delayed below<input type="number" min="0" max="100" value={thresholds.delayedBelow} onChange={event => setThresholds({ ...thresholds, delayedBelow: event.target.value })} /></label><label>At Risk below<input type="number" min="0" max="100" value={thresholds.atRiskBelow} onChange={event => setThresholds({ ...thresholds, atRiskBelow: event.target.value })} /></label></div>
    <button disabled={busy} onClick={savePolicy}>Save policy draft</button><div className="perf-policy-list">{context.policies.filter((row: RecordRow) => row.kind === "POLICY").map((row: RecordRow) => <article key={row.id}><strong>{row.data.label} · {row.data.family}/{row.data.groupKey}</strong><span>{row.state} · v{row.version} · effective {row.data.effectiveFrom}</span>{row.state === "DRAFT" && <button className="secondary-action" disabled={busy} onClick={() => void mutate("POLICY_APPROVE", { id: row.id, expectedVersion: row.version }, "context")}>Approve policy</button>}</article>)}</div>
  </details>;
}
