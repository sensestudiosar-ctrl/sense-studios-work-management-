import { useCallback, useEffect, useMemo, useState } from "react";
import "./time.css";

const API = "/api/v1/time";
type Employee = { id: string; name: string };
type Project = { id: string; name: string };
type Task = { id: string; title: string; projectId: string; stageId: string | null };
type Stage = { id: string; label: string; projectId: string };
type Version = { version: number; data: Record<string, unknown>; reason: string; editorId: string; occurredAt: string };
type Delivery = { id: string; state: string; revision: number; attempts: number };
type Entry = {
  id: string; employeeId: string; version: number; date: string; startedAt?: string | null; endedAt?: string | null; durationSeconds: number; workNote: string; evidenceFileId?: string | null;
  location: "OFFICE" | "SITE" | "REMOTE"; billable: boolean; activityLabel: string | null;
  projectId: string | null; taskId: string | null; stageId: string | null; locked: boolean; approved: boolean;
  canCorrect: boolean; canApprove: boolean; versions: Version[]; deliveries: Delivery[];
};
type Timer = { id: string; state: "RUNNING" | "PAUSED"; version: number; elapsedSeconds: number; workNote: string; projectId: string | null; taskId: string | null; stageId: string | null; activityLabel: string | null; location: "OFFICE" | "SITE" | "REMOTE"; billable: boolean };
type Data = { timer: Timer | null; entries: Entry[] };
type Setup = { employeeId: string | null; employees: Employee[]; projects: Project[]; tasks: Task[]; stages: Stage[]; isOwner: boolean };
type Fields = { employeeId: string; projectId: string; taskId: string; stageId: string; activityLabel: string; date: string; startedAt: string; endedAt: string; durationSeconds: string; workNote: string; location: "OFFICE" | "SITE" | "REMOTE"; billable: boolean; evidenceFileId: string };
const today = () => new Date().toLocaleDateString("en-CA");
const emptyFields = (): Fields => ({ employeeId: "", projectId: "", taskId: "", stageId: "", activityLabel: "", date: today(), startedAt: "", endedAt: "", durationSeconds: "3600", workNote: "", location: "OFFICE", billable: true, evidenceFileId: "" });
const localDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const part = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
};
const duration = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function request<T>(url: string, csrf: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-CSRF-Token", csrf);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers, credentials: "include" });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
  if (!response.ok) throw new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`);
  return body as T;
}

function ReferenceFields({ setup, fields, setFields, employeePicker }: { setup: Setup; fields: Fields; setFields: (next: Fields) => void; employeePicker: boolean }): React.JSX.Element {
  const tasks = setup.tasks.filter((task) => task.projectId === (fields.projectId || null));
  const stages = setup.stages.filter((stage) => !fields.projectId || stage.projectId === fields.projectId);
  const set = (key: keyof Fields, value: string | boolean) => {
    if (key === "projectId") return setFields({ ...fields, projectId: value as string, taskId: "", stageId: "" });
    if (key === "taskId") { const task = setup.tasks.find((candidate) => candidate.id === value); return setFields({ ...fields, taskId: value as string, stageId: task?.stageId ?? "" }); }
    if (key === "stageId") { const task = setup.tasks.find((candidate) => candidate.id === fields.taskId); return setFields({ ...fields, stageId: value as string, ...(task && task.stageId !== value ? { taskId: "" } : {}) }); }
    setFields({ ...fields, [key]: value } as Fields);
  };
  return <>
    {employeePicker && <label>Employee<select value={fields.employeeId} onChange={(e) => set("employeeId", e.target.value)} required><option value="">Choose employee</option>{setup.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>}
    <label>Project<select value={fields.projectId} onChange={(e) => set("projectId", e.target.value)}><option value="">Non-project activity</option>{setup.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
    <label>Task<select value={fields.taskId} onChange={(e) => set("taskId", e.target.value)}><option value="">No task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
    <label>Stage<select value={fields.stageId} onChange={(e) => set("stageId", e.target.value)} disabled={!fields.projectId}><option value="">No stage</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label>
    <label>Activity label<input value={fields.activityLabel} onChange={(e) => set("activityLabel", e.target.value)} maxLength={160} placeholder="e.g. Training, travel, administration" /></label>
  </>;
}

function EntryFields({ setup, fields, setFields, employeePicker }: { setup: Setup; fields: Fields; setFields: (next: Fields) => void; employeePicker: boolean }): React.JSX.Element {
  const set = (key: keyof Fields, value: string | boolean) => setFields({ ...fields, [key]: value } as Fields);
  return <div className="time-form-grid">
    <ReferenceFields setup={setup} fields={fields} setFields={setFields} employeePicker={employeePicker} />
    <label>Date<input type="date" value={fields.date} onChange={(e) => set("date", e.target.value)} required /></label>
    <label>Start time<input type="datetime-local" value={fields.startedAt} onChange={(e) => set("startedAt", e.target.value)} /></label>
    <label>End time<input type="datetime-local" value={fields.endedAt} onChange={(e) => set("endedAt", e.target.value)} /></label>
    <label>Duration (seconds)<input type="number" min="1" max="86400" value={fields.durationSeconds} onChange={(e) => set("durationSeconds", e.target.value)} required /></label>
    <label>Work location<select value={fields.location} onChange={(e) => set("location", e.target.value)}><option value="OFFICE">Office</option><option value="SITE">Site</option><option value="REMOTE">Remote</option></select></label>
    <label className="time-check"><input type="checkbox" checked={fields.billable} onChange={(e) => set("billable", e.target.checked)} /> Billable</label>
    <label className="time-wide">Work note<textarea value={fields.workNote} onChange={(e) => set("workNote", e.target.value)} maxLength={1000} required rows={3} /></label>
    <label className="time-wide">Evidence file ID (optional)<input value={fields.evidenceFileId} onChange={(e) => set("evidenceFileId", e.target.value)} maxLength={100} /></label>
  </div>;
}

export function TimeWorkspace({ csrfToken, owner }: { csrfToken: string; owner: boolean }): React.JSX.Element {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [scope, setScope] = useState<"mine" | "managed">("mine");
  const [fields, setFields] = useState<Fields>(emptyFields());
  const [correction, setCorrection] = useState<Entry | null>(null);
  const [correctionFields, setCorrectionFields] = useState<Fields>(emptyFields());
  const [reason, setReason] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [syncedAt, setSyncedAt] = useState(Date.now());

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const [nextSetup, nextData] = await Promise.all([
        request<Setup>(`${API}/setup`, csrfToken),
        request<Data>(`${API}?scope=${scope}`, csrfToken),
      ]);
      setSetup(nextSetup); setData(nextData); setSyncedAt(Date.now()); setError("");
      setFields((previous) => ({ ...previous, employeeId: previous.employeeId || nextSetup.employeeId || "" }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn’t load time records."); }
    finally { if (initial) setLoading(false); }
  }, [csrfToken, scope]);
  useEffect(() => { void load(true); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => { setClock(Date.now()); void load(); }, 30_000); return () => window.clearInterval(timer); }, [load]);

  const mutate = async (path: string, body: unknown, method = "POST"): Promise<boolean> => {
    setPending(true); setError(""); setNotice("");
    try { await request(path, csrfToken, { method, body: JSON.stringify(body) }); await load(); setNotice("Time record updated."); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The action could not be completed."); return false; }
    finally { setPending(false); }
  };
  const fieldPayload = (value: Fields, includeEmployee = employeePicker) => ({ ...(includeEmployee && value.employeeId ? { employeeId: value.employeeId } : {}), ...(value.projectId ? { projectId: value.projectId } : {}), ...(value.taskId ? { taskId: value.taskId } : {}), ...(value.stageId ? { stageId: value.stageId } : {}), ...(value.activityLabel.trim() ? { activityLabel: value.activityLabel.trim() } : {}), date: value.date, ...(value.startedAt ? { startedAt: new Date(value.startedAt).toISOString() } : {}), ...(value.endedAt ? { endedAt: new Date(value.endedAt).toISOString() } : {}), durationSeconds: Number(value.durationSeconds), workNote: value.workNote.trim(), location: value.location, billable: value.billable, ...(value.evidenceFileId.trim() ? { evidenceFileId: value.evidenceFileId.trim() } : {}) });
  const startTimer = () => void mutate(`${API}/timers`, { commandId: id(), ...(fields.projectId ? { projectId: fields.projectId } : {}), ...(fields.taskId ? { taskId: fields.taskId } : {}), ...(fields.stageId ? { stageId: fields.stageId } : {}), ...(fields.activityLabel.trim() ? { activityLabel: fields.activityLabel.trim() } : {}), workNote: fields.workNote.trim(), location: fields.location, billable: fields.billable });
  const timerAction = (action: "pause" | "resume" | "stop") => {
    if (!data?.timer) return;
    const why = action === "stop" ? window.prompt("Reason for stopping this timer") : "Timer control";
    if (action === "stop" && !why?.trim()) return;
    void mutate(`${API}/timers/${encodeURIComponent(data.timer.id)}/${action}`, { commandId: id(), expectedVersion: data.timer.version, ...(why ? { reason: why.trim() } : {}) });
  };
  const beginCorrection = (entry: Entry) => {
    setCorrection(entry); setReason("");
    setCorrectionFields({ ...emptyFields(), employeeId: entry.employeeId, projectId: entry.projectId ?? "", taskId: entry.taskId ?? "", stageId: entry.stageId ?? "", activityLabel: entry.activityLabel ?? "", date: entry.date, startedAt: localDateTime(entry.startedAt), endedAt: localDateTime(entry.endedAt), durationSeconds: String(entry.durationSeconds), workNote: entry.workNote, location: entry.location, billable: entry.billable, evidenceFileId: entry.evidenceFileId ?? "" });
  };
  const visible = useMemo(() => (data?.entries ?? []).filter((entry) => (!filterProject || entry.projectId === filterProject) && (filterStatus === "all" || (filterStatus === "locked" ? entry.locked : filterStatus === "approved" ? entry.approved : filterStatus === "open" ? !entry.locked : true)) && (!search || `${entry.workNote} ${entry.activityLabel ?? ""}`.toLowerCase().includes(search.toLowerCase()))), [data, filterProject, filterStatus, search]);
  const hoursBreakdown = useMemo(() => {
    const entries = data?.entries ?? [];
    const total = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
    const byProject = new Map<string, { seconds: number; entries: number }>();
    for (const entry of entries) {
      const key = entry.projectId ?? "non-project";
      const bucket = byProject.get(key) ?? { seconds: 0, entries: 0 };
      bucket.seconds += entry.durationSeconds; bucket.entries += 1;
      byProject.set(key, bucket);
    }
    const projectRows = [...byProject.entries()].map(([key, value]) => ({ key, name: key === "non-project" ? "Non-project activity" : setup?.projects.find((project) => project.id === key)?.name ?? "Project", ...value })).sort((a, b) => b.seconds - a.seconds);
    const byTask = new Map<string, { seconds: number; title: string; projectId: string | null }>();
    for (const entry of entries) {
      if (!entry.taskId) continue;
      const title = setup?.tasks.find((task) => task.id === entry.taskId)?.title ?? "Task";
      const bucket = byTask.get(entry.taskId) ?? { seconds: 0, title, projectId: entry.projectId };
      bucket.seconds += entry.durationSeconds;
      byTask.set(entry.taskId, bucket);
    }
    const taskRows = [...byTask.entries()].map(([key, value]) => ({ key, ...value })).sort((a, b) => b.seconds - a.seconds).slice(0, 12);
    return { totalSeconds: total, totalHours: total / 3600, projectRows, taskRows, entryCount: entries.length };
  }, [data, setup?.projects, setup?.tasks]);
  const [hoursProjectFilter, setHoursProjectFilter] = useState("");
  const hoursForProject = hoursBreakdown.projectRows.filter((row) => !hoursProjectFilter || row.key === hoursProjectFilter);
  const hoursTaskRows = hoursBreakdown.taskRows.filter((row) => !hoursProjectFilter || (hoursProjectFilter === "non-project" ? row.projectId === null : row.projectId === hoursProjectFilter));
  const hoursTotalSeconds = hoursForProject.reduce((sum, row) => sum + row.seconds, 0);
  const hoursTotalHours = hoursTotalSeconds / 3600;

  if (loading) return <section className="identity-section time-workspace"><p role="status">Loading time workspace…</p></section>;
  if (!setup || !data) return <section className="identity-section time-workspace"><h2>Time</h2><p className="auth-error" role="alert">{error || "Time workspace is unavailable."}</p><button type="button" onClick={() => void load(true)}>Try again</button></section>;
  const employeePicker = owner || scope === "managed";
  const elapsed = data.timer ? data.timer.elapsedSeconds + (data.timer.state === "RUNNING" ? Math.max(0, Math.floor((clock - syncedAt) / 1000)) : 0) : 0;
  return <section className="identity-section time-workspace" aria-labelledby="time-heading">
    <div className="time-heading"><div><div className="eyebrow">WORK LOG</div><h2 id="time-heading">Time</h2><p>Record project and non-project work, then review its history and accounting delivery.</p></div><button type="button" className="secondary-action" disabled={pending} onClick={() => void load(true)}>Refresh</button></div>
    {(owner || setup.employees.length > 0) && <div className="time-toolbar"><label>View<select value={scope} onChange={(e) => setScope(e.target.value as "mine" | "managed")}><option value="mine">My time</option><option value="managed">Managed time</option></select></label><span>{scope === "managed" ? "Management actions follow your time permissions." : "Your entries are shown by default."}</span></div>}
    {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    <section className="time-panel time-hours"><div className="time-hours-head"><div><h3>Hours breakdown</h3><p>Worked hours per project and per task from your logged entries.{scope === "managed" ? " Managed scope." : ""}</p></div><label className="time-hours-filter">Project<select value={hoursProjectFilter} onChange={(e) => setHoursProjectFilter(e.target.value)}><option value="">All projects</option>{hoursBreakdown.projectRows.map((row) => <option key={row.key} value={row.key}>{row.name}</option>)}</select></label></div>
      <div className="time-hours-total"><span>Logged</span><strong>{hoursTotalHours.toFixed(1)}h</strong><small>{hoursForProject.reduce((sum, row) => sum + row.entries, 0)} entries in view · {hoursBreakdown.entryCount} total</small></div>
      {hoursForProject.length ? <div className="time-hours-grid">{hoursForProject.map((row) => {
        const rowTasks = hoursTaskRows.filter((task) => task.projectId === (row.key === "non-project" ? null : row.key));
        const share = hoursBreakdown.totalSeconds > 0 ? Math.round((row.seconds / hoursBreakdown.totalSeconds) * 100) : 0;
        return <div key={row.key} className="time-hours-card"><div className="time-hours-card-title"><h4>{row.name}</h4><span>{(row.seconds / 3600).toFixed(1)}h · {row.entries} {row.entries === 1 ? "entry" : "entries"}</span></div>
          <div className="time-hours-bar" role="img" aria-label={`${row.name} accounts for ${share}% of logged time`}><i style={{ width: `${share}%` }} /></div>
          {rowTasks.length ? <div className="time-hours-tasks">{rowTasks.map((task) => <button type="button" key={task.key} onClick={() => { setFilterProject(task.projectId ?? ""); setFilterStatus("all"); }}><span>{task.title}</span><strong>{(task.seconds / 3600).toFixed(1)}h</strong></button>)}</div> : <p className="time-hours-card-note">No task-level time logged.</p>}
        </div>;
      })} </div> : <p className="identity-note">No logged hours yet in this view.</p>}
    </section>
    <div className="time-top-grid">
      {(data.timer || setup.employeeId) && <section className="time-panel"><h3>{data.timer ? "Active timer" : "Start a timer"}</h3>
        {data.timer ? <><p className="time-clock" aria-live="polite">{duration(elapsed)}</p><p>{data.timer.workNote || "No work note"} · {data.timer.state.toLowerCase()}</p><div className="time-actions">{data.timer.state === "RUNNING" ? <button type="button" className="secondary-action" disabled={pending} onClick={() => timerAction("pause")}>Pause</button> : <button type="button" disabled={pending} onClick={() => timerAction("resume")}>Resume</button>}<button type="button" className="secondary-action" disabled={pending} onClick={() => timerAction("stop")}>Stop timer</button></div></> : <>
          <ReferenceFields setup={setup} fields={fields} setFields={setFields} employeePicker={false} />
          <label>Work note<input value={fields.workNote} onChange={(e) => setFields({ ...fields, workNote: e.target.value })} required maxLength={1000} /></label>
          <div className="time-inline"><label>Location<select value={fields.location} onChange={(e) => setFields({ ...fields, location: e.target.value as Fields["location"] })}><option value="OFFICE">Office</option><option value="SITE">Site</option><option value="REMOTE">Remote</option></select></label><label className="time-check"><input type="checkbox" checked={fields.billable} onChange={(e) => setFields({ ...fields, billable: e.target.checked })} /> Billable</label></div>
          <button type="button" disabled={pending || !fields.workNote.trim() || !setup.employeeId} onClick={startTimer}>Start timer</button>
          {!setup.employeeId && <p className="identity-note">Your account has no employee record for a personal timer.</p>}
        </>}
      </section>}
      <section className="time-panel"><h3>Log time manually</h3><form className="time-form" onSubmit={(e) => { e.preventDefault(); void mutate(`${API}/entries`, { commandId: id(), ...fieldPayload(fields) }).then((saved) => { if (saved) setFields(emptyFields()); }); }}>
        <EntryFields setup={setup} fields={fields} setFields={setFields} employeePicker={employeePicker} />
        <button type="submit" disabled={pending || !fields.workNote.trim() || !fields.durationSeconds || (employeePicker && !fields.employeeId)}>Save time entry</button>
      </form></section>
    </div>
    <section className="time-history"><div className="time-heading"><div><h3>Entry history</h3><p>{visible.length} {visible.length === 1 ? "entry" : "entries"}</p></div></div>
      <div className="time-filters"><label>Project<select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}><option value="">All projects</option>{setup.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Status<select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="all">All</option><option value="open">Open</option><option value="approved">Approved</option><option value="locked">Locked</option></select></label><label>Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Work note or activity" /></label></div>
      {!visible.length ? <p className="identity-note" role="status">No time entries match this view.</p> : <div className="time-entry-list">{visible.map((entry) => <article className="time-entry" key={entry.id}>
        <div className="time-entry-main"><div className="time-entry-title"><h4>{entry.activityLabel || entry.workNote || "Time entry"}</h4><span>{duration(entry.durationSeconds)}</span></div><p>{entry.date} · {entry.location.toLowerCase()} · {entry.billable ? "billable" : "non-billable"} · {entry.projectId ? setup.projects.find((p) => p.id === entry.projectId)?.name ?? "Project" : "Non-project activity"}</p><p>{entry.workNote}</p><div className="time-badges"><span>{entry.approved ? "Approved" : "Pending approval"}</span><span>{entry.locked ? "Locked" : "Editable"}</span></div>
          {!!entry.versions.length && <details><summary>Immutable history ({entry.versions.length} revisions)</summary><ol>{entry.versions.map((version, index) => {
            const previous = index > 0 ? entry.versions[index - 1]!.data : null;
            const next = version.data;
            const labels: Array<[string, string]> = [["date", "Date"], ["startedAt", "Start"], ["endedAt", "End"], ["durationSeconds", "Duration (seconds)"], ["projectId", "Project"], ["taskId", "Task"], ["stageId", "Stage"], ["workNote", "Work note"], ["location", "Location"], ["billable", "Billable"], ["evidenceFileId", "Evidence file"]];
            const display = (value: unknown) => value === undefined || value === null || value === "" ? "—" : typeof value === "boolean" ? value ? "Yes" : "No" : String(value);
            return <li key={version.version}><strong>Version {version.version}</strong> · {version.reason} · {version.editorId} · <time>{new Date(version.occurredAt).toLocaleString()}</time><dl className="time-version-diff">{labels.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{display(previous?.[key])} → {display(next[key])}</dd></div>)}</dl></li>;
          })}</ol></details>}
          {!!entry.deliveries.length && <details><summary>Accounting delivery</summary><ul>{entry.deliveries.map((delivery) => <li key={delivery.id}><strong>{delivery.state}</strong> · revision {delivery.revision} · {delivery.attempts} attempts {owner && delivery.state !== "DELIVERED" && <button type="button" className="secondary-action" disabled={pending} onClick={() => { const why = window.prompt("Reason for retrying this delivery"); if (why?.trim()) void mutate(`${API}/deliveries/${encodeURIComponent(delivery.id)}/retry`, { reason: why.trim() }); }}>Retry</button>}</li>)}</ul></details>}
        </div><div className="time-entry-actions">
          {entry.canCorrect && <button type="button" className="secondary-action" disabled={pending} onClick={() => beginCorrection(entry)}>Correct</button>}
          {entry.canApprove && !entry.approved && <button type="button" disabled={pending} onClick={() => { const why = window.prompt("Reason for approving this entry"); if (why?.trim()) void mutate(`${API}/entries/${encodeURIComponent(entry.id)}/approve`, { commandId: id(), expectedVersion: entry.version, reason: why.trim() }); }}>Approve</button>}
          {owner && entry.approved && <button type="button" className="secondary-action" disabled={pending} onClick={() => { const why = window.prompt("Reason for exporting this entry"); if (why?.trim()) void mutate(`${API}/entries/${encodeURIComponent(entry.id)}/export`, { commandId: id(), expectedVersion: entry.version, reason: why.trim() }); }}>Export</button>}
        </div>
      </article>)}</div>}
    </section>
    {correction && <div className="time-dialog-backdrop"><section className="time-dialog" role="dialog" aria-modal="true" aria-labelledby="correction-heading"><div className="time-heading"><div><h3 id="correction-heading">Correct time entry</h3><p>Version {correction.version}; prior versions remain in the audit history.</p></div><button type="button" className="secondary-action" onClick={() => setCorrection(null)}>Close</button></div><form className="time-form" onSubmit={(e) => { e.preventDefault(); if (reason.trim().length < 3) return; void mutate(`${API}/entries/${encodeURIComponent(correction.id)}/corrections`, { commandId: id(), expectedVersion: correction.version, reason: reason.trim(), ...fieldPayload(correctionFields, false) }).then((saved) => { if (saved) setCorrection(null); }); }}><EntryFields setup={setup} fields={correctionFields} setFields={setCorrectionFields} employeePicker={false} /><label>Reason for correction<textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={1000} required rows={3} /></label><button type="submit" disabled={pending || reason.trim().length < 3}>Save correction</button></form></section></div>}
  </section>;
}
