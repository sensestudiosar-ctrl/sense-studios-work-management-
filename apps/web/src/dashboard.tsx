import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./dashboard.css";
import "./dashboard-widgets.css";

const API = "/api/v1";
type Cell = string | number | null;
type DashRow = { id: string; label: string; status?: string; date?: string; value?: string | number; route?: string; score?: number | null; scoreScale?: { min: number; max: number } };
type Section = { key: string; label: string; rows: DashRow[]; unavailable?: string };
type Dash = { today: string | null; role: string };
type DashboardSource = "tasks" | "decisions" | "health" | "performance" | "workload" | "site" | "training";
type DashboardSourceResult = { source: DashboardSource; today: string; readCompletedAt: string; sections: Section[]; decisions?: { items: unknown[]; nextCursor: string | null } };
type DashboardSourceState = { readCompletedAt: string | null; sections: Section[]; decisions?: { items: unknown[]; nextCursor?: string | null }; error?: string; loading?: boolean };
const dashboardSourceNames: DashboardSource[] = ["tasks", "decisions", "health", "performance", "workload", "site", "training"];
const sourceLabels: Record<DashboardSource, string> = { tasks: "Tasks and attention", decisions: "Decision center", health: "Project health and risks", performance: "Employee and Team Leader performance", workload: "Workload and leave", site: "Project site", training: "Training and improvement" };
type Category = { key: string; label: string };
type Context = { categories: Category[]; eventNames?: Category[]; owner: boolean };
type Preview = { title: string; category: string; from: string; to: string; generatedAt: string; columns: Array<{ key: string; label: string }>; rows: Array<Record<string, Cell>>; unavailable: string[] };
type ReportTable = Omit<Preview, "generatedAt"> & { generatedAt?: string };
type Snapshot = { id: string; category?: string; from?: string; to?: string; title?: string; createdAt?: string; correctedById?: string | null; correctsId?: string | null; reason?: string; [key: string]: unknown };
type Schedules = { rules: Array<Record<string, unknown> & { id?: string; kind?: string; enabled?: boolean }> };
type Reminders = { reminders: Array<Record<string, unknown> & { id?: string; title?: string; dueAt?: string; reason?: string }> };
type SummarySection = { key: string; label: string; rows: DashRow[]; unavailable?: string };
type ScheduledSummary = { id: string; createdAt: string; sourceId: string; slot: string; summary: { kind: string; from?: string; to?: string; generatedAt: string; sections: SummarySection[] } };
type Summaries = { summaries: ScheduledSummary[] };
const cmd = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

async function request<T>(path: string, csrf: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) { headers.set("Content-Type", "application/json"); headers.set("X-CSRF-Token", csrf); }
  const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`);
  return body as T;
}
const format = (v: unknown) => v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
const dateLabel = (v: string | undefined) => v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v ?? "";
const dateRangeOkay = (from: string, to: string) => Boolean(from && to && from <= to);

function HealthScore({ row }: { row: DashRow }): React.JSX.Element {
  const scale = row.scoreScale;
  const hasScale = scale && Number.isFinite(scale.min) && Number.isFinite(scale.max) && scale.max > scale.min;
  return <span className="dashboard-health-meter">Health score {row.score} · {hasScale ? `Scale ${scale.min}–${scale.max}` : "Scale unavailable"}</span>;
}

export function DashboardWorkspace({ csrfToken, owner, initialTab = "dashboard", focused = false }: { csrfToken: string; owner: boolean; initialTab?: "dashboard" | "summaries" | "reports" | "schedules"; focused?: boolean }): React.JSX.Element {
  const [tab, setTab] = useState<"dashboard" | "summaries" | "reports" | "schedules">(initialTab);
  const [dash, setDash] = useState<Dash>({ today: null, role: owner ? "Owner account" : "Staff account" });
  const [sourceData, setSourceData] = useState<Partial<Record<DashboardSource, DashboardSourceState>>>({});
  const [context, setContext] = useState<Context | null>(null);
  const [schedules, setSchedules] = useState<Schedules | null>(null);
  const [reminders, setReminders] = useState<Reminders | null>(null);
  const [summaries, setSummaries] = useState<ScheduledSummary[]>([]);
  const [selectedSummaryId, setSelectedSummaryId] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [selectedTable, setSelectedTable] = useState<ReportTable | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [correctsId, setCorrectsId] = useState("");
  const commandRef = useRef<{ signature: string; id: string } | null>(null);
  const sourceRequestIds = useRef(new Map<DashboardSource, number>());
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDue, setReminderDue] = useState("");
  const [reminderReason, setReminderReason] = useState("");
  const [ruleKind, setRuleKind] = useState<"TASK_REMINDER" | "SUMMARY" | "EVENT_NOTICE">("TASK_REMINDER");
  const [ruleEnabled, setRuleEnabled] = useState(true);
  const [ruleTime, setRuleTime] = useState("");
  const [timezone, setTimezone] = useState("");
  const [audience, setAudience] = useState<"SELF" | "OWNER" | "EMPLOYEE" | "MANAGER">("SELF");
  const [ruleReason, setRuleReason] = useState("");
  const [summaryKind, setSummaryKind] = useState("MORNING");
  const [weekdays, setWeekdays] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [offsetDays, setOffsetDays] = useState("");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [critical, setCritical] = useState(false);
  const [mandatory, setMandatory] = useState(false);
  const [eventNamesText, setEventNamesText] = useState("");
  const [editingRule, setEditingRule] = useState<{ id: string; version: number } | null>(null);

  const loadSource = useCallback(async (source: DashboardSource): Promise<void> => {
    const requestId = (sourceRequestIds.current.get(source) ?? 0) + 1;
    sourceRequestIds.current.set(source, requestId);
    setSourceData(current => ({ ...current, [source]: { readCompletedAt: null, sections: [], ...(source === "decisions" ? { decisions: { items: [], nextCursor: null } } : {}), loading: true } }));
    try {
      const result = await request<DashboardSourceResult>(`/dashboard/sources/${source}`, csrfToken);
      if (result.source !== source || !Array.isArray(result.sections) || typeof result.readCompletedAt !== "string" || typeof result.today !== "string" || source === "decisions" && !result.decisions) throw new Error("The source response was incomplete.");
      if (sourceRequestIds.current.get(source) !== requestId) return;
      setSourceData(current => ({ ...current, [source]: { readCompletedAt: result.readCompletedAt, sections: result.sections, ...(result.decisions ? { decisions: result.decisions } : {}), loading: false } }));
      setDash(current => ({ ...current, today: result.today }));
    } catch (cause) {
      if (sourceRequestIds.current.get(source) === requestId) setSourceData(current => ({ ...current, [source]: { readCompletedAt: null, sections: [], ...(source === "decisions" ? { decisions: { items: [], nextCursor: null } } : {}), loading: false, error: cause instanceof Error ? cause.message : "This source could not be read." } }));
    }
  }, [csrfToken]);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setError("");
    for (const source of dashboardSourceNames) void loadSource(source);
    try {
      const [c, s, r, scheduled, h] = await Promise.all([
        request<Context>("/reports/context", csrfToken),
        owner ? request<Schedules>("/dashboard/schedules", csrfToken) : Promise.resolve({ rules: [] }), request<Reminders>("/dashboard/reminders", csrfToken), request<Summaries>("/dashboard/summaries", csrfToken),
        request<{ snapshots?: Snapshot[]; items?: Snapshot[] }>("/reports/snapshots", csrfToken),
      ]);
      setContext(c); setSchedules(s); setReminders(r); setSummaries(scheduled.summaries); setSelectedSummaryId(current => current && scheduled.summaries.some(item => item.id === current) ? current : scheduled.summaries[0]?.id ?? ""); setSnapshots(h.snapshots ?? h.items ?? []);
      setCategory(current => current || c.categories[0]?.key || "");
    } catch (cause) { setSummaries([]); setSelectedSummaryId(""); setError(cause instanceof Error ? cause.message : "Dashboard supporting data could not be loaded."); }
    finally { if (initial) setLoading(false); }
  }, [csrfToken, loadSource, owner]);
  useEffect(() => { void load(true); }, [load]);

  const mutate = async (path: string, payload: Record<string, unknown>, refresh = true): Promise<void> => {
    setBusy(true); setError(""); setNotice("");
    try {
      const signature = `${path}:${JSON.stringify(payload)}`;
      if (commandRef.current?.signature !== signature) commandRef.current = { signature, id: cmd() };
      await request(path, csrfToken, { method: "POST", body: JSON.stringify({ ...payload, commandId: commandRef.current.id }) });
      commandRef.current = null;
      if (refresh) await load();
      setNotice("Saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The action could not be completed."); }
    finally { setBusy(false); }
  };
  const makePreview = async () => {
    setBusy(true); setError(""); setNotice("");
    try { const result = await request<Preview>("/reports/preview", csrfToken, { method: "POST", body: JSON.stringify({ category, from, to }) }); setPreview(result); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The report preview could not be created."); }
    finally { setBusy(false); }
  };
  const saveSnapshot = async () => {
    if (!preview || !reason.trim()) return;
    await mutate("/reports/snapshots", { category: preview.category, from: preview.from, to: preview.to, reason: reason.trim(), ...(correctsId ? { correctsId } : {}) });
    setReason(""); setCorrectsId("");
    const history = await request<{ snapshots?: Snapshot[]; items?: Snapshot[] }>("/reports/snapshots", csrfToken).catch((): { snapshots?: Snapshot[]; items?: Snapshot[] } => ({}));
    setSnapshots(history.snapshots ?? history.items ?? []);
  };
  const openSnapshot = async (id: string) => {
    setBusy(true); setError("");
    try { const result = await request<{ snapshot: Snapshot; table: ReportTable }>(`/reports/snapshots/${encodeURIComponent(id)}`, csrfToken); setSelectedSnapshot(result.snapshot); setSelectedTable(result.table); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The frozen report could not be loaded."); }
    finally { setBusy(false); }
  };
  const download = (url: string) => { window.location.assign(url); };

  const isOwner = owner && Boolean(context?.owner);
  const selectedSummary = summaries.find(item => item.id === selectedSummaryId) ?? null;
  const weekdayValues = weekdays.trim() ? weekdays.split(",").map(day => Number(day.trim())) : [];
  const eventNames = eventNamesText.split(",").map(name => name.trim()).filter(Boolean);
  const validEventNames = !context?.eventNames || eventNames.every(name => context.eventNames!.some(item => item.key === name));
  const organizationDateLabel = dash.today ?? (dashboardSourceNames.every(source => sourceData[source] && !sourceData[source]?.loading) ? "Unavailable" : "Loading…");
  const scheduleValid = Boolean(ruleTime && timezone.trim() && ruleReason.trim().length >= 3
    && (!weekdays.trim() || weekdayValues.every(day => Number.isInteger(day) && day >= 0 && day <= 6))
    && (!dayOfMonth || Number.isInteger(Number(dayOfMonth)) && Number(dayOfMonth) >= 1 && Number(dayOfMonth) <= 31)
    && (ruleKind !== "TASK_REMINDER" || !offsetDays || Number.isInteger(Number(offsetDays)) && Number(offsetDays) >= -366 && Number(offsetDays) <= 366)
    && (ruleKind !== "TASK_REMINDER" || offsetDays.trim())
    && (ruleKind !== "SUMMARY" || summaryKind !== "WEEKLY" || weekdayValues.length > 0)
    && (ruleKind !== "SUMMARY" || summaryKind !== "MONTHLY" || dayOfMonth.trim())
    && (ruleKind !== "EVENT_NOTICE" || eventNames.length > 0 && validEventNames));

  // Counts belong to their exact authorized source and section. Overlapping
  // sections are not a unique work total; unavailable reads are not empty.
  const openDecisionCount = useMemo(() => (sourceData.decisions?.decisions?.items ?? []).filter(item => {
    const row = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
    return row.canDecide !== false;
  }).length, [sourceData.decisions]);
  const healthRows = useMemo(() => {
    const state = sourceData.health;
    if (!state || state.loading || state.error) return [];
    return state.sections.filter(section => !section.unavailable).flatMap(s => s.rows).filter(row => typeof row.score === "number" && Number.isFinite(row.score));
  }, [sourceData.health]);
  const tasksState = sourceData.tasks;
  const healthState = sourceData.health;
  const decisionsState = sourceData.decisions;
  const sourceCount = (state: DashboardSourceState | undefined, count: number): string => !state || state.loading ? "Loading…"
    : state.error || state.sections.some(section => section.unavailable) ? "Unavailable" : String(count);
  const taskSectionNote = (key: string): string | null => !tasksState || tasksState.loading ? "Reading task source…"
    : tasksState.error ? "Task source unavailable."
      : tasksState.sections.find(section => section.key === key)?.unavailable
        ?? (tasksState.sections.some(section => section.key === key) ? null : "This task summary is unavailable.");
  const taskSectionCount = (key: string): string => !tasksState || tasksState.loading ? "Loading…"
    : taskSectionNote(key) ? "Unavailable" : String(tasksState.sections.find(section => section.key === key)!.rows.length);
  const taskTodayRows = tasksState?.sections.find(s => s.key === "today")?.rows ?? [];
  const taskOverdueRows = tasksState?.sections.find(s => s.key === "overdue")?.rows ?? [];
  const taskAttentionRows = tasksState?.sections.find(s => s.key === "attention")?.rows ?? [];
  const taskPriorityRows = tasksState?.sections.find(s => s.key === "priority")?.rows ?? [];
  const taskBlockedRows = tasksState?.sections.find(s => s.key === "waiting")?.rows ?? [];
  const taskReviewRows = tasksState?.sections.find(s => s.key === "reviews")?.rows ?? [];

  const kpiTiles = [
    { label: "Open decisions", value: sourceCount(decisionsState, openDecisionCount), cls: "", ic: "decisions", col: "#2563eb", route: "/decisions", sub: "Awaiting your action" },
    { label: "Needs attention", value: taskSectionCount("attention"), cls: "dn", ic: "attention", col: "#dc2626", route: "/tasks", sub: "Critical or overdue" },
    { label: "Health tracked", value: sourceCount(healthState, healthRows.length), cls: "", ic: "health", col: "#d97706", route: "/project-health", sub: "Projects with a persisted score" },
    { label: "Overdue tasks", value: taskSectionCount("overdue"), cls: taskOverdueRows.length ? "dn" : "", ic: "overdue", col: "#dc2626", route: "/tasks", sub: "Past due and incomplete" },
    { label: "Blocked / waiting", value: taskSectionCount("waiting"), cls: taskBlockedRows.length ? "dn" : "", ic: "blocked", col: "#7c3aed", route: "/tasks", sub: "Waiting or blocker" },
  ];
  return <section className="identity-section dashboard-workspace" aria-labelledby="dashboard-heading">
    <div className="dashboard-heading"><div><div className="eyebrow">{initialTab === "reports" ? "INSIGHTS" : "WORKSPACE OVERVIEW"}</div><h2 id="dashboard-heading">{initialTab === "reports" ? "Reports" : "Dashboard"}</h2><p>{initialTab === "reports" ? "Preview current report data or open an immutable retained snapshot." : "A current view of decisions, tasks and project updates available to your account."}</p></div><button type="button" className="secondary-action" onClick={() => void load(true)} disabled={busy}>Refresh</button></div>
    {!focused && <nav className="dashboard-tabs" aria-label="Dashboard sections">{([['dashboard', 'Overview'], ['summaries', 'Scheduled summaries'], ['reports', 'Reports'], ['schedules', 'Reminders & schedules']] as const).map(([key, label]) => <button type="button" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</nav>}
    {error && <p className="auth-error" role="alert">{error} <button type="button" className="secondary-action" onClick={() => void load(true)}>Retry supporting data</button></p>}{notice && <p className="notice" role="status">{notice}</p>}
    {loading && tab !== "dashboard" && <p role="status">Loading reports, summaries, reminders, and schedules…</p>}
    {tab === "dashboard" && <>
      <div className="dashboard-summary"><span><small>Organization date</small><strong>{organizationDateLabel}</strong></span><span><small>Account type</small><strong>{dash.role}</strong></span></div>
      <div className="dashboard-kpi-strip" aria-label="Dashboard KPI tiles">
        {kpiTiles.map(tile => (
          <div key={tile.label} className={`dashboard-kpi ${tile.cls}`}>
            <div className="dashboard-kpi-head">
              <span className="dashboard-kpi-icon" style={{ color: tile.col }} aria-hidden="true">{tile.ic === "decisions" ? "◈" : tile.ic === "attention" ? "!" : tile.ic === "health" ? "●" : tile.ic === "overdue" ? "⏰" : "⊘"}</span>
              <span className="dashboard-kpi-title">{tile.label}</span>
            </div>
            <div className="dashboard-kpi-value">{tile.value}</div>
            <div className={`dashboard-kpi-trend ${tile.cls}`}>{tile.sub}</div>
            {tile.route && <Link className="dashboard-kpi-link" to={tile.route}>View →</Link>}
          </div>
        ))}
      </div>

      {/* Demo-style two-column body: left = project health + milestone work, right = attention + priority */}
      <div className="dashboard-split">
        <div className="dashboard-split-left">
          <section className="dashboard-panel" aria-label="Project health">
            <div className="dashboard-panel-head">
              <div><h3>Project status</h3><p className="dashboard-panel-sub">Authorized persisted health snapshots</p></div>
              <Link className="dashboard-panel-link" to="/projects">View projects →</Link>
            </div>
            <div className="dashboard-prow-list">
              {!healthState || healthState.loading ? <p role="status" className="dashboard-read-time">Reading project health…</p>
                : healthState.error || healthState.sections.some(section => section.unavailable) ? <p role="status">Project health source unavailable.</p>
                : healthRows.length > 0 ? healthRows.slice(0, 6).map(row => (
                  <div key={row.id} className="dashboard-prow">
                    <span className="dashboard-prow-dot" aria-hidden="true"></span>
                    <div className="dashboard-prow-text">
                      <div className="dashboard-prow-name">{row.label}</div>
                      <div className="dashboard-prow-sub">{[row.status, row.value].filter(v => v && v !== "—").join(" · ")}</div>
                    </div>
                    <div className="dashboard-prow-meter">
                      <HealthScore row={row} />
                    </div>
                    {row.route && <Link className="dashboard-panel-link" to={row.route}>Open</Link>}
                  </div>
                )) : <p className="identity-note">No authorized project-health snapshot is available yet.</p>}
            </div>
          </section>

          <section className="dashboard-panel" aria-label="Today's due tasks">
            <div className="dashboard-panel-head">
              <div><h3>Tasks due today</h3><p className="dashboard-panel-sub">Committed date when present, otherwise Target</p></div>
              <Link className="dashboard-panel-link" to="/tasks">My Work →</Link>
            </div>
            <div className="dashboard-timeline">
              {taskSectionNote("today") ? <p role="status" className="dashboard-read-time">{taskSectionNote("today")}</p>
                : taskTodayRows.length > 0 ? taskTodayRows.slice(0, 8).map(row => (
                  <div key={row.id} className="dashboard-tl-item">
                    <div className="dashboard-tl-rail"><span className={`dashboard-tl-node ${row.status?.includes("COMPLETE") ? "done" : "cur"}`}>{row.status?.includes("COMPLETE") ? "✓" : "●"}</span></div>
                    <div>
                      <div className="dashboard-tl-title">{row.label}</div>
                      <div className="dashboard-tl-sub">{[row.status, row.date].filter(Boolean).join(" · ")}</div>
                    </div>
                    {row.route && <Link className="dashboard-panel-link" to={row.route}>Open</Link>}
                  </div>
                )) : <p className="identity-note">No due work on today's calendar.</p>}
            </div>
          </section>

        </div>

        <div className="dashboard-split-right">
          <section className="dashboard-panel" aria-label="Needs your attention">
            <div className="dashboard-panel-head">
              <div><h3>Needs your attention</h3><p className="dashboard-panel-sub">{taskSectionNote("attention") ?? `${taskAttentionRows.length} task items`}</p></div>
              <Link className="dashboard-panel-link" to="/decisions">Open decisions →</Link>
            </div>
            <ul className="dashboard-attn-list">
              {taskSectionNote("attention") ? <li role="status" className="dashboard-read-time">{taskSectionNote("attention")}</li>
                : taskAttentionRows.length > 0 ? taskAttentionRows.slice(0, 6).map(row => (
                  <li key={row.id} className="dashboard-attn">
                    <span className={`dashboard-attn-ic ${row.status?.includes("BLOCK") ? "warn" : "ok"}`} aria-hidden="true">{row.status?.includes("BLOCK") ? "!" : "✓"}</span>
                    <div className="dashboard-attn-text">
                      <div className="dashboard-attn-title">{row.label}</div>
                      <div className="dashboard-attn-sub">{[row.status, row.date].filter(Boolean).join(" · ")}</div>
                    </div>
                    {row.date && <span className="dashboard-attn-due">{row.date}</span>}
                  </li>
                )) : <li className="identity-note">No task attention items in this source.</li>}
            </ul>
          </section>

          <section className="dashboard-panel" aria-label="Priority work">
            <div className="dashboard-panel-head">
              <div><h3>Priority work</h3><p className="dashboard-panel-sub">High and critical priority</p></div>
            </div>
            <ul className="dashboard-attn-list">
              {taskSectionNote("priority") ? <li role="status" className="dashboard-read-time">{taskSectionNote("priority")}</li>
                : taskPriorityRows.length > 0 ? taskPriorityRows.slice(0, 5).map(row => (
                  <li key={row.id} className="dashboard-attn">
                    <span className="dashboard-attn-ic ok" aria-hidden="true">◆</span>
                    <div className="dashboard-attn-text">
                      <div className="dashboard-attn-title">{row.label}</div>
                      <div className="dashboard-attn-sub">{[row.status, row.date].filter(Boolean).join(" · ")}</div>
                    </div>
                    {row.route && <Link className="dashboard-panel-link" to={row.route}>Open</Link>}
                  </li>
                )) : <li className="identity-note">No high or critical priority items.</li>}
            </ul>
          </section>

          <section className="dashboard-panel" aria-label="Task reviews and corrections">
            <div className="dashboard-panel-head">
              <div><h3>Task reviews and corrections</h3><p className="dashboard-panel-sub">Current task states and due dates</p></div>
            </div>
            <div className="dashboard-activity-list">
              {taskSectionNote("reviews") ? <p role="status">{taskSectionNote("reviews")}</p>
                : taskReviewRows.length > 0 ? taskReviewRows.slice(0, 8).map(row => (
                <div key={row.id} className="dashboard-act-row">
                  <div className="dashboard-act-box">
                    <div className="dashboard-act-text"><b>{row.label}</b></div>
                    <div className="dashboard-act-time">{[row.status, row.date].filter(Boolean).join(" · ")}</div>
                    {row.route && <Link className="dashboard-panel-link" to={row.route}>Open</Link>}
                  </div>
                </div>
              )) : <p className="identity-note">No review or correction tasks in this source.</p>}
            </div>
          </section>
        </div>
      </div>

      <div className="dashboard-overview-grid"><div className="dashboard-sections">
      {sourceData.decisions?.error ? <article className="dashboard-panel dashboard-source-card dashboard-source-decisions"><h3>Decision center</h3><p className="dashboard-unavailable" role="status">This source is unavailable: {sourceData.decisions.error}</p><button type="button" className="secondary-action" onClick={() => void loadSource("decisions")}>Retry decision center</button></article> : sourceData.decisions?.loading || !sourceData.decisions ? <article className="dashboard-panel dashboard-source-card dashboard-source-decisions"><h3>Decision center</h3><p role="status">Reading this source…</p></article> : <article className="dashboard-panel dashboard-source-card dashboard-source-decisions"><h3>Decision center</h3>{sourceData.decisions.readCompletedAt && <p className="dashboard-read-time">Read at {new Date(sourceData.decisions.readCompletedAt).toLocaleString()}</p>}{(sourceData.decisions.decisions?.items ?? []).length > 0 ? <ul>{(sourceData.decisions.decisions?.items ?? []).map((item, index) => { const row = typeof item === "object" && item !== null ? item as Record<string, unknown> : { value: item }; const route = typeof row.route === "string" ? row.route : null; return <li key={String(row.id ?? index)}><div><strong>{format(row.title ?? row.label ?? row.kind ?? "Decision")}</strong><small>{[row.requesterLabel, row.levelLabel, row.typeKey].map(format).filter(v => v !== "—").join(" · ")}</small></div><span>{format(row.summary ?? row.description)}</span>{route && <Link to={route}>Open</Link>}</li>; })}</ul> : <p className="identity-note">No current decisions.</p>}</article>}
      {dashboardSourceNames.filter(source => source === "tasks").flatMap(source => {
        const state = sourceData[source];
        const sections = state?.sections ?? [];
        if (!state || state.loading) return [<article className={`dashboard-panel dashboard-source-card dashboard-source-${source}`} key={`${source}-loading`}><h3>{sourceLabels[source]}</h3><p role="status">Reading this source…</p></article>];
        if (state?.error) return [<article className={`dashboard-panel dashboard-source-card dashboard-source-${source}`} key={`${source}-error`}><h3>{sourceLabels[source]}</h3><p className="dashboard-unavailable" role="status">This source is unavailable: {state.error}</p><button type="button" className="secondary-action" onClick={() => void loadSource(source)}>Retry {sourceLabels[source].toLowerCase()}</button></article>];
        if (sections.length === 0) return [<article className={`dashboard-panel dashboard-source-card dashboard-source-${source}`} key={`${source}-empty`}><h3>{sourceLabels[source]}</h3>{state?.readCompletedAt && <p className="dashboard-read-time">Read at {new Date(state.readCompletedAt).toLocaleString()}</p>}<p className="identity-note">No current items.</p></article>];
        return sections.map(section => <article className={`dashboard-panel dashboard-source-card dashboard-source-${source}`} key={section.key}><h3>{section.label}</h3>{state?.readCompletedAt && <p className="dashboard-read-time">Read at {new Date(state.readCompletedAt).toLocaleString()}</p>}{section.unavailable && <p className="dashboard-unavailable">{section.unavailable}</p>}{section.rows.length ? <ul>{section.rows.map(row => <li key={row.id}><div><strong>{row.label}</strong><small>{[row.status, row.date].filter(Boolean).join(" · ")}</small>{typeof row.score === "number" && Number.isFinite(row.score) && <HealthScore row={row} />}</div><span>{format(row.value)}</span>{row.route && <Link to={row.route}>Open</Link>}</li>)}</ul> : !section.unavailable && <p className="identity-note">No current items.</p>}</article>);
      })}</div>
      {dashboardSourceNames.filter(source => source !== "decisions" && source !== "tasks").flatMap(source => {
        const state = sourceData[source];
        const sections = state?.sections ?? [];
        if (!state || state.loading) return [<article className={`dashboard-panel dashboard-source-card dashboard-source-${source}`} key={`${source}-loading`}><h3>{sourceLabels[source]}</h3><p role="status">Reading this source…</p></article>];
        if (state?.error) return [<article className={`dashboard-panel dashboard-source-card dashboard-source-${source}`} key={`${source}-error`}><h3>{sourceLabels[source]}</h3><p className="dashboard-unavailable" role="status">This source is unavailable: {state.error}</p><button type="button" className="secondary-action" onClick={() => void loadSource(source)}>Retry {sourceLabels[source].toLowerCase()}</button></article>];
        if (sections.length === 0) return [<article className={`dashboard-panel dashboard-source-card dashboard-source-${source}`} key={`${source}-empty`}><h3>{sourceLabels[source]}</h3>{state?.readCompletedAt && <p className="dashboard-read-time">Read at {new Date(state.readCompletedAt).toLocaleString()}</p>}<p className="identity-note">No current items.</p></article>];
        return sections.map(section => <article className={`dashboard-panel dashboard-source-card dashboard-source-${source}`} key={section.key}><h3>{section.label}</h3>{state?.readCompletedAt && <p className="dashboard-read-time">Read at {new Date(state.readCompletedAt).toLocaleString()}</p>}{section.unavailable && <p className="dashboard-unavailable">{section.unavailable}</p>}{section.rows.length ? <ul>{section.rows.map(row => <li key={row.id}><div><strong>{row.label}</strong><small>{[row.status, row.date].filter(Boolean).join(" · ")}</small>{typeof row.score === "number" && Number.isFinite(row.score) && <HealthScore row={row} />}</div><span>{format(row.value)}</span>{row.route && <Link to={row.route}>Open</Link>}</li>)}</ul> : !section.unavailable && <p className="identity-note">No current items.</p>}</article>);
      })}</div>
    </>}
    {tab === "summaries" && !loading && <div className="dashboard-report-layout">
      <article className="dashboard-panel"><h3>Scheduled summaries</h3><p>Only summaries available under your current source access appear here.</p>{summaries.length === 0 ? <p className="identity-note" role="status">No generated summaries are available.</p> : <ul>{summaries.map(item => <li key={item.id} data-summary-id={item.id}><div><strong>{item.summary.kind} summary</strong><small>{item.summary.from ?? ""}{item.summary.from ? " — " : ""}{item.summary.to ?? ""} · {new Date(item.summary.generatedAt || item.createdAt).toLocaleString()}</small></div><button type="button" className="secondary-action" aria-pressed={selectedSummaryId === item.id} onClick={() => setSelectedSummaryId(item.id)}>{selectedSummaryId === item.id ? "Selected" : "View summary"}</button></li>)}</ul>}</article>
      {selectedSummary && <article className="dashboard-panel" aria-labelledby="scheduled-summary-heading"><div className="eyebrow">SCHEDULED SUMMARY</div><h3 id="scheduled-summary-heading">{selectedSummary.summary.kind}{selectedSummary.summary.from ? ` · ${selectedSummary.summary.from}` : ""}{selectedSummary.summary.to && selectedSummary.summary.to !== selectedSummary.summary.from ? ` — ${selectedSummary.summary.to}` : ""}</h3><p>Generated {new Date(selectedSummary.summary.generatedAt || selectedSummary.createdAt).toLocaleString()}</p><div className="dashboard-sections">{selectedSummary.summary.sections.map(section => <article className="dashboard-panel" key={section.key}><h3>{section.label}</h3>{section.unavailable && <p className="dashboard-unavailable">{section.unavailable}</p>}{section.rows.length ? <ul>{section.rows.map((row, index) => <li key={row.id ?? `${section.key}-${index}`}><div><strong>{row.label}</strong><small>{[row.status, row.date].filter(Boolean).join(" · ")}</small></div><span>{format(row.value)}</span></li>)}</ul> : !section.unavailable && <p className="identity-note">No factual items for this section.</p>}</article>)}</div></article>}
    </div>}
    {tab === "reports" && !loading && <div className="dashboard-report-layout"><article className="dashboard-panel"><h3>Build report preview</h3><p>Preview source records that your account is currently permitted to read.</p><div className="dashboard-form-grid"><label>Report category<select value={category} onChange={e => setCategory(e.target.value)} required><option value="">Choose category</option>{(context?.categories ?? []).map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} required /></label><label>To<input type="date" value={to} onChange={e => setTo(e.target.value)} required /></label></div><button type="button" disabled={busy || !category || !dateRangeOkay(from, to)} onClick={() => void makePreview()}>Preview report</button>
      {preview && <div className="dashboard-preview"><div className="dashboard-heading"><div><h4>{preview.title}</h4><small>{dateLabel(preview.from)} — {dateLabel(preview.to)} · Generated {new Date(preview.generatedAt).toLocaleString()}</small></div><div className="dashboard-export-actions">{(["csv", "xlsx", "pdf", "print"] as const).map(fmt => <button type="button" className="secondary-action" key={fmt} onClick={() => download(`/api/v1/reports/export?category=${encodeURIComponent(preview.category)}&from=${encodeURIComponent(preview.from)}&to=${encodeURIComponent(preview.to)}&format=${fmt}`)}>{fmt === "xlsx" ? "Excel" : fmt.toUpperCase()}</button>)}</div></div>
        {preview.unavailable.length > 0 && <ul className="dashboard-unavailable">{preview.unavailable.map((value, i) => <li key={i}>{value}</li>)}</ul>}
        {preview.rows.length === 0 ? <p className="identity-note">No permitted source rows are available for this period.</p> : <div className="dashboard-table-wrap"><table><thead><tr>{preview.columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{preview.rows.map((row, i) => <tr key={`${String(row.sourceId ?? row.id ?? "report-row")}:${String(row.field ?? row.key ?? "")}:${i}`}>{preview.columns.map(column => <td key={column.key}>{format(row[column.key])}</td>)}</tr>)}</tbody></table></div>}
        {isOwner && <div className="dashboard-freeze"><label>Reason for frozen report (required)<textarea value={reason} onChange={e => setReason(e.target.value)} minLength={3} maxLength={1000} /></label><label>Correct an earlier snapshot (optional)<select value={correctsId} onChange={e => setCorrectsId(e.target.value)}><option value="">New frozen report</option>{snapshots.filter(s => s.category === preview.category).map(s => <option key={s.id} value={s.id}>{s.title ?? `${s.category} ${s.from ?? ""}–${s.to ?? ""}`} · {s.id.slice(0, 8)}</option>)}</select></label><button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void saveSnapshot()}>{correctsId ? "Freeze correction" : "Freeze report"}</button></div>}
      </div>}</article>
      <article className="dashboard-panel"><h3>Frozen report history</h3>{snapshots.length === 0 ? <p className="identity-note">No frozen reports yet.</p> : <ul>{snapshots.map(snapshot => <li key={snapshot.id} data-snapshot-id={snapshot.id}><div><strong>{snapshot.title ?? snapshot.category ?? "Frozen report"}</strong><small>{dateLabel(snapshot.from)} {snapshot.from ? "—" : ""} {dateLabel(snapshot.to)} · {snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString() : snapshot.id}</small></div><div className="dashboard-export-actions"><button className="secondary-action" type="button" onClick={() => void openSnapshot(snapshot.id)} disabled={busy}>Read</button>{(["csv", "xlsx", "pdf", "print"] as const).map(fmt => <button className="secondary-action" type="button" key={fmt} onClick={() => download(`/api/v1/reports/snapshots/${encodeURIComponent(snapshot.id)}/export?format=${fmt}`)}>{fmt === "xlsx" ? "Excel" : fmt.toUpperCase()}</button>)}</div></li>)}</ul>}{selectedSnapshot && <div className="dashboard-snapshot"><h4>{selectedSnapshot.title ?? selectedTable?.title ?? "Frozen report"}</h4>{selectedTable ? <><div className="dashboard-table-wrap"><table><thead><tr>{selectedTable.columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{selectedTable.rows.map((row, i) => <tr key={`${String(row.sourceId ?? row.id ?? "report-row")}:${String(row.field ?? row.key ?? "")}:${i}`}>{selectedTable.columns.map(column => <td key={column.key}>{format(row[column.key])}</td>)}</tr>)}</tbody></table></div><pre>Reason: {selectedSnapshot.reason ?? "—"}{selectedSnapshot.correctsId ? `\nCorrects snapshot: ${selectedSnapshot.correctsId}` : ""}</pre></> : <p role="status">Loading frozen report…</p>}</div>}</article>
    </div>}
    {tab === "schedules" && !loading && <div className="dashboard-report-layout">
      <article className="dashboard-panel"><h3>Personal reminder</h3><p>Reminders stay private to the employee who creates them.</p><div className="dashboard-form-grid"><label>Reminder title<input value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} maxLength={160} required /></label><label>Due date and time<input type="datetime-local" value={reminderDue} onChange={e => setReminderDue(e.target.value)} required /></label><label className="dashboard-span">Reason<textarea value={reminderReason} onChange={e => setReminderReason(e.target.value)} minLength={3} maxLength={1000} required /></label></div><button type="button" disabled={busy || !reminderTitle.trim() || !reminderDue || reminderReason.trim().length < 3} onClick={() => void mutate("/dashboard/reminders", { title: reminderTitle.trim(), dueAt: new Date(reminderDue).toISOString(), reason: reminderReason.trim() }).then(() => { setReminderTitle(""); setReminderDue(""); setReminderReason(""); })}>Save reminder</button>
        <h4>Your reminders</h4>{!reminders?.reminders.length ? <p className="identity-note">No reminders yet.</p> : <ul>{reminders.reminders.map((item, i) => <li key={String(item.id ?? i)}><div><strong>{format(item.title)}</strong><small>{item.dueAt ? new Date(item.dueAt).toLocaleString() : ""}</small></div><span>{format(item.reason)}</span></li>)}</ul>}</article>
      <article className="dashboard-panel"><h3>{isOwner ? "Organization schedules" : "Schedule rules"}</h3><p>Set explicit times and audiences. No numeric work policy is prefilled or implied.</p>{schedules?.rules.length ? <ul>{schedules.rules.map((item, i) => <li key={String(item.id ?? i)} data-schedule-id={String(item.id ?? "")}><div><strong>{format(item.kind ?? "Schedule")}</strong><small>{format(item.localTime)} · {format(item.timezone)} · {format(item.audience)}</small></div><span>{item.enabled ? "Enabled" : "Disabled"}</span>{isOwner && item.id && <button className="secondary-action" type="button" onClick={() => { setEditingRule({ id: item.id!, version: typeof item.version === "number" ? item.version : 1 }); setRuleKind(item.kind === "SUMMARY" || item.kind === "EVENT_NOTICE" ? item.kind : "TASK_REMINDER"); setRuleEnabled(Boolean(item.enabled)); setRuleTime(typeof item.localTime === "string" ? item.localTime : ""); setTimezone(typeof item.timezone === "string" ? item.timezone : ""); setAudience(item.audience === "OWNER" || item.audience === "EMPLOYEE" || item.audience === "MANAGER" ? item.audience : "SELF"); setSummaryKind(typeof item.summaryKind === "string" ? item.summaryKind : "MORNING"); setWeekdays(Array.isArray(item.weekdays) ? item.weekdays.join(", ") : ""); setDayOfMonth(typeof item.dayOfMonth === "number" ? String(item.dayOfMonth) : ""); setOffsetDays(typeof item.offsetDays === "number" ? String(item.offsetDays) : ""); setPriority(typeof item.priority === "string" ? item.priority : ""); setProjectId(typeof item.projectId === "string" ? item.projectId : ""); setEventNamesText(Array.isArray(item.eventNames) ? item.eventNames.join(", ") : ""); setCritical(Boolean(item.critical)); setMandatory(Boolean(item.mandatory)); setRuleReason(""); }}>{"Edit"}</button>}</li>)}</ul> : <p className="identity-note">{isOwner ? "No organization schedules configured." : "Organization schedules are managed by the Owner."}</p>}
        {isOwner && <div className="dashboard-freeze"><h4>{editingRule ? "Edit schedule rule" : "Add schedule rule"}</h4><div className="dashboard-form-grid"><label>Rule kind<select value={ruleKind} onChange={e => { setRuleKind(e.target.value as typeof ruleKind); setSummaryKind("MORNING"); setWeekdays(""); setDayOfMonth(""); setOffsetDays(""); setPriority(""); setProjectId(""); setEventNamesText(""); }}><option value="TASK_REMINDER">Task reminder</option><option value="SUMMARY">Summary</option><option value="EVENT_NOTICE">Event notice</option></select></label><label>Local time<input type="time" value={ruleTime} onChange={e => setRuleTime(e.target.value)} required /></label><label>Timezone<input value={timezone} onChange={e => setTimezone(e.target.value)} required placeholder="e.g. Asia/Kolkata" /></label><label>Audience<select value={audience} onChange={e => setAudience(e.target.value as typeof audience)}><option value="SELF">Self</option><option value="OWNER">Owner</option><option value="EMPLOYEE">Employee</option><option value="MANAGER">Manager</option></select></label>{ruleKind === "SUMMARY" && <label>Summary period<select value={summaryKind} onChange={e => setSummaryKind(e.target.value)}><option>MORNING</option><option>EVENING</option><option>WEEKLY</option><option>MONTHLY</option></select></label>}{ruleKind === "EVENT_NOTICE" && <label>Event names (comma separated, required)<input value={eventNamesText} onChange={e => setEventNamesText(e.target.value)} placeholder="Enter explicitly configured event names" /></label>}<label>Weekdays (0=Sun, 6=Sat){ruleKind === "SUMMARY" && summaryKind === "WEEKLY" ? " · required" : ""}<input value={weekdays} onChange={e => setWeekdays(e.target.value)} placeholder="Optional, comma separated" /></label><label>Day of month{ruleKind === "SUMMARY" && summaryKind === "MONTHLY" ? " · required" : ""}<input type="number" min="1" max="31" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} placeholder="Optional" /></label>{ruleKind === "TASK_REMINDER" && <label>Task reminder offset (days) · required<input type="number" min="-366" max="366" step="1" value={offsetDays} onChange={e => setOffsetDays(e.target.value)} placeholder="Enter day offset" /></label>}{ruleKind !== "SUMMARY" && <><label>Priority<select value={priority} onChange={e => setPriority(e.target.value)}><option value="">No priority filter</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label><label>Project ID (optional)<input value={projectId} onChange={e => setProjectId(e.target.value)} /></label></>}<label className="dashboard-check"><input type="checkbox" checked={ruleEnabled} onChange={e => setRuleEnabled(e.target.checked)} /> Enabled</label><label className="dashboard-check"><input type="checkbox" checked={critical} onChange={e => setCritical(e.target.checked)} /> Critical</label><label className="dashboard-check"><input type="checkbox" checked={mandatory} onChange={e => setMandatory(e.target.checked)} /> Mandatory</label><label className="dashboard-span">Reason<textarea value={ruleReason} onChange={e => setRuleReason(e.target.value)} minLength={3} maxLength={1000} required /></label></div><p>Optional schedule policies stay unset until you enter them. Recipients are rechecked against current access when notices are generated.</p><button type="button" disabled={busy || !scheduleValid} onClick={() => {
          const payload: Record<string, unknown> = { kind: ruleKind, enabled: ruleEnabled, localTime: ruleTime, timezone: timezone.trim(), audience, critical, mandatory, reason: ruleReason.trim(), ...(ruleKind === "SUMMARY" ? { summaryKind } : {}), ...(ruleKind === "EVENT_NOTICE" ? { eventNames } : {}), ...(weekdays.trim() ? { weekdays: weekdayValues } : {}), ...(dayOfMonth.trim() ? { dayOfMonth: Number(dayOfMonth) } : {}), ...(ruleKind === "TASK_REMINDER" && offsetDays.trim() ? { offsetDays: Number(offsetDays) } : {}), ...(ruleKind !== "SUMMARY" && priority ? { priority } : {}), ...(ruleKind !== "SUMMARY" && projectId.trim() ? { projectId: projectId.trim() } : {}), ...(editingRule ? { expectedVersion: editingRule.version } : {}) };
          void mutate(editingRule ? `/dashboard/schedules/${encodeURIComponent(editingRule.id)}` : "/dashboard/schedules", payload).then(() => { setRuleReason(""); setEditingRule(null); });
        }}>{editingRule ? "Save schedule changes" : "Save schedule rule"}</button></div>}
      </article>
    </div>}
  </section>;
}
