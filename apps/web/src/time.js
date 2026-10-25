import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./time.css";
const API = "/api/v1/time";
const today = () => new Date().toLocaleDateString("en-CA");
const emptyFields = () => ({ employeeId: "", projectId: "", taskId: "", stageId: "", activityLabel: "", date: today(), startedAt: "", endedAt: "", durationSeconds: "3600", workNote: "", location: "OFFICE", billable: true, evidenceFileId: "" });
const localDateTime = (value) => {
    if (!value)
        return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return "";
    const part = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
};
const duration = (seconds) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
async function request(url, csrf, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("X-CSRF-Token", csrf);
    if (init.body)
        headers.set("Content-Type", "application/json");
    const response = await fetch(url, { ...init, headers, credentials: "include" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`);
    return body;
}
function ReferenceFields({ setup, fields, setFields, employeePicker }) {
    const tasks = setup.tasks.filter((task) => task.projectId === (fields.projectId || null));
    const stages = setup.stages.filter((stage) => !fields.projectId || stage.projectId === fields.projectId);
    const set = (key, value) => {
        if (key === "projectId")
            return setFields({ ...fields, projectId: value, taskId: "", stageId: "" });
        if (key === "taskId") {
            const task = setup.tasks.find((candidate) => candidate.id === value);
            return setFields({ ...fields, taskId: value, stageId: task?.stageId ?? "" });
        }
        if (key === "stageId") {
            const task = setup.tasks.find((candidate) => candidate.id === fields.taskId);
            return setFields({ ...fields, stageId: value, ...(task && task.stageId !== value ? { taskId: "" } : {}) });
        }
        setFields({ ...fields, [key]: value });
    };
    return _jsxs(_Fragment, { children: [employeePicker && _jsxs("label", { children: ["Employee", _jsxs("select", { value: fields.employeeId, onChange: (e) => set("employeeId", e.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose employee" }), setup.employees.map((employee) => _jsx("option", { value: employee.id, children: employee.name }, employee.id))] })] }), _jsxs("label", { children: ["Project", _jsxs("select", { value: fields.projectId, onChange: (e) => set("projectId", e.target.value), children: [_jsx("option", { value: "", children: "Non-project activity" }), setup.projects.map((project) => _jsx("option", { value: project.id, children: project.name }, project.id))] })] }), _jsxs("label", { children: ["Task", _jsxs("select", { value: fields.taskId, onChange: (e) => set("taskId", e.target.value), children: [_jsx("option", { value: "", children: "No task" }), tasks.map((task) => _jsx("option", { value: task.id, children: task.title }, task.id))] })] }), _jsxs("label", { children: ["Stage", _jsxs("select", { value: fields.stageId, onChange: (e) => set("stageId", e.target.value), disabled: !fields.projectId, children: [_jsx("option", { value: "", children: "No stage" }), stages.map((stage) => _jsx("option", { value: stage.id, children: stage.label }, stage.id))] })] }), _jsxs("label", { children: ["Activity label", _jsx("input", { value: fields.activityLabel, onChange: (e) => set("activityLabel", e.target.value), maxLength: 160, placeholder: "e.g. Training, travel, administration" })] })] });
}
function EntryFields({ setup, fields, setFields, employeePicker }) {
    const set = (key, value) => setFields({ ...fields, [key]: value });
    return _jsxs("div", { className: "time-form-grid", children: [_jsx(ReferenceFields, { setup: setup, fields: fields, setFields: setFields, employeePicker: employeePicker }), _jsxs("label", { children: ["Date", _jsx("input", { type: "date", value: fields.date, onChange: (e) => set("date", e.target.value), required: true })] }), _jsxs("label", { children: ["Start time", _jsx("input", { type: "datetime-local", value: fields.startedAt, onChange: (e) => set("startedAt", e.target.value) })] }), _jsxs("label", { children: ["End time", _jsx("input", { type: "datetime-local", value: fields.endedAt, onChange: (e) => set("endedAt", e.target.value) })] }), _jsxs("label", { children: ["Duration (seconds)", _jsx("input", { type: "number", min: "1", max: "86400", value: fields.durationSeconds, onChange: (e) => set("durationSeconds", e.target.value), required: true })] }), _jsxs("label", { children: ["Work location", _jsxs("select", { value: fields.location, onChange: (e) => set("location", e.target.value), children: [_jsx("option", { value: "OFFICE", children: "Office" }), _jsx("option", { value: "SITE", children: "Site" }), _jsx("option", { value: "REMOTE", children: "Remote" })] })] }), _jsxs("label", { className: "time-check", children: [_jsx("input", { type: "checkbox", checked: fields.billable, onChange: (e) => set("billable", e.target.checked) }), " Billable"] }), _jsxs("label", { className: "time-wide", children: ["Work note", _jsx("textarea", { value: fields.workNote, onChange: (e) => set("workNote", e.target.value), maxLength: 1000, required: true, rows: 3 })] }), _jsxs("label", { className: "time-wide", children: ["Evidence file ID (optional)", _jsx("input", { value: fields.evidenceFileId, onChange: (e) => set("evidenceFileId", e.target.value), maxLength: 100 })] })] });
}
export function TimeWorkspace({ csrfToken, owner }) {
    const [setup, setSetup] = useState(null);
    const [data, setData] = useState(null);
    const [scope, setScope] = useState("mine");
    const [fields, setFields] = useState(emptyFields());
    const [correction, setCorrection] = useState(null);
    const [correctionFields, setCorrectionFields] = useState(emptyFields());
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
        if (initial)
            setLoading(true);
        try {
            const [nextSetup, nextData] = await Promise.all([
                request(`${API}/setup`, csrfToken),
                request(`${API}?scope=${scope}`, csrfToken),
            ]);
            setSetup(nextSetup);
            setData(nextData);
            setSyncedAt(Date.now());
            setError("");
            setFields((previous) => ({ ...previous, employeeId: previous.employeeId || nextSetup.employeeId || "" }));
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Couldn’t load time records.");
        }
        finally {
            if (initial)
                setLoading(false);
        }
    }, [csrfToken, scope]);
    useEffect(() => { void load(true); }, [load]);
    useEffect(() => { const timer = window.setInterval(() => { setClock(Date.now()); void load(); }, 30_000); return () => window.clearInterval(timer); }, [load]);
    const mutate = async (path, body, method = "POST") => {
        setPending(true);
        setError("");
        setNotice("");
        try {
            await request(path, csrfToken, { method, body: JSON.stringify(body) });
            await load();
            setNotice("Time record updated.");
            return true;
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "The action could not be completed.");
            return false;
        }
        finally {
            setPending(false);
        }
    };
    const fieldPayload = (value, includeEmployee = employeePicker) => ({ ...(includeEmployee && value.employeeId ? { employeeId: value.employeeId } : {}), ...(value.projectId ? { projectId: value.projectId } : {}), ...(value.taskId ? { taskId: value.taskId } : {}), ...(value.stageId ? { stageId: value.stageId } : {}), ...(value.activityLabel.trim() ? { activityLabel: value.activityLabel.trim() } : {}), date: value.date, ...(value.startedAt ? { startedAt: new Date(value.startedAt).toISOString() } : {}), ...(value.endedAt ? { endedAt: new Date(value.endedAt).toISOString() } : {}), durationSeconds: Number(value.durationSeconds), workNote: value.workNote.trim(), location: value.location, billable: value.billable, ...(value.evidenceFileId.trim() ? { evidenceFileId: value.evidenceFileId.trim() } : {}) });
    const startTimer = () => void mutate(`${API}/timers`, { commandId: id(), ...(fields.projectId ? { projectId: fields.projectId } : {}), ...(fields.taskId ? { taskId: fields.taskId } : {}), ...(fields.stageId ? { stageId: fields.stageId } : {}), ...(fields.activityLabel.trim() ? { activityLabel: fields.activityLabel.trim() } : {}), workNote: fields.workNote.trim(), location: fields.location, billable: fields.billable });
    const timerAction = (action) => {
        if (!data?.timer)
            return;
        const why = action === "stop" ? window.prompt("Reason for stopping this timer") : "Timer control";
        if (action === "stop" && !why?.trim())
            return;
        void mutate(`${API}/timers/${encodeURIComponent(data.timer.id)}/${action}`, { commandId: id(), expectedVersion: data.timer.version, ...(why ? { reason: why.trim() } : {}) });
    };
    const beginCorrection = (entry) => {
        setCorrection(entry);
        setReason("");
        setCorrectionFields({ ...emptyFields(), employeeId: entry.employeeId, projectId: entry.projectId ?? "", taskId: entry.taskId ?? "", stageId: entry.stageId ?? "", activityLabel: entry.activityLabel ?? "", date: entry.date, startedAt: localDateTime(entry.startedAt), endedAt: localDateTime(entry.endedAt), durationSeconds: String(entry.durationSeconds), workNote: entry.workNote, location: entry.location, billable: entry.billable, evidenceFileId: entry.evidenceFileId ?? "" });
    };
    const visible = useMemo(() => (data?.entries ?? []).filter((entry) => (!filterProject || entry.projectId === filterProject) && (filterStatus === "all" || (filterStatus === "locked" ? entry.locked : filterStatus === "approved" ? entry.approved : filterStatus === "open" ? !entry.locked : true)) && (!search || `${entry.workNote} ${entry.activityLabel ?? ""}`.toLowerCase().includes(search.toLowerCase()))), [data, filterProject, filterStatus, search]);
    const hoursBreakdown = useMemo(() => {
        const entries = data?.entries ?? [];
        const total = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
        const byProject = new Map();
        for (const entry of entries) {
            const key = entry.projectId ?? "non-project";
            const bucket = byProject.get(key) ?? { seconds: 0, entries: 0 };
            bucket.seconds += entry.durationSeconds;
            bucket.entries += 1;
            byProject.set(key, bucket);
        }
        const projectRows = [...byProject.entries()].map(([key, value]) => ({ key, name: key === "non-project" ? "Non-project activity" : setup?.projects.find((project) => project.id === key)?.name ?? "Project", ...value })).sort((a, b) => b.seconds - a.seconds);
        const byTask = new Map();
        for (const entry of entries) {
            if (!entry.taskId)
                continue;
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
    if (loading)
        return _jsx("section", { className: "identity-section time-workspace", children: _jsx("p", { role: "status", children: "Loading time workspace\u2026" }) });
    if (!setup || !data)
        return _jsxs("section", { className: "identity-section time-workspace", children: [_jsx("h2", { children: "Time" }), _jsx("p", { className: "auth-error", role: "alert", children: error || "Time workspace is unavailable." }), _jsx("button", { type: "button", onClick: () => void load(true), children: "Try again" })] });
    const employeePicker = owner || scope === "managed";
    const elapsed = data.timer ? data.timer.elapsedSeconds + (data.timer.state === "RUNNING" ? Math.max(0, Math.floor((clock - syncedAt) / 1000)) : 0) : 0;
    return _jsxs("section", { className: "identity-section time-workspace", "aria-labelledby": "time-heading", children: [_jsxs("div", { className: "time-heading", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "WORK LOG" }), _jsx("h2", { id: "time-heading", children: "Time" }), _jsx("p", { children: "Record project and non-project work, then review its history and accounting delivery." })] }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => void load(true), children: "Refresh" })] }), (owner || setup.employees.length > 0) && _jsxs("div", { className: "time-toolbar", children: [_jsxs("label", { children: ["View", _jsxs("select", { value: scope, onChange: (e) => setScope(e.target.value), children: [_jsx("option", { value: "mine", children: "My time" }), _jsx("option", { value: "managed", children: "Managed time" })] })] }), _jsx("span", { children: scope === "managed" ? "Management actions follow your time permissions." : "Your entries are shown by default." })] }), error && _jsx("p", { className: "auth-error", role: "alert", children: error }), notice && _jsx("p", { className: "notice", role: "status", children: notice }), _jsxs("section", { className: "time-panel time-hours", children: [_jsxs("div", { className: "time-hours-head", children: [_jsxs("div", { children: [_jsx("h3", { children: "Hours breakdown" }), _jsxs("p", { children: ["Worked hours per project and per task from your logged entries.", scope === "managed" ? " Managed scope." : ""] })] }), _jsxs("label", { className: "time-hours-filter", children: ["Project", _jsxs("select", { value: hoursProjectFilter, onChange: (e) => setHoursProjectFilter(e.target.value), children: [_jsx("option", { value: "", children: "All projects" }), hoursBreakdown.projectRows.map((row) => _jsx("option", { value: row.key, children: row.name }, row.key))] })] })] }), _jsxs("div", { className: "time-hours-total", children: [_jsx("span", { children: "Logged" }), _jsxs("strong", { children: [hoursTotalHours.toFixed(1), "h"] }), _jsxs("small", { children: [hoursForProject.reduce((sum, row) => sum + row.entries, 0), " entries in view \u00B7 ", hoursBreakdown.entryCount, " total"] })] }), hoursForProject.length ? _jsxs("div", { className: "time-hours-grid", children: [hoursForProject.map((row) => {
                                const rowTasks = hoursTaskRows.filter((task) => task.projectId === (row.key === "non-project" ? null : row.key));
                                const share = hoursBreakdown.totalSeconds > 0 ? Math.round((row.seconds / hoursBreakdown.totalSeconds) * 100) : 0;
                                return _jsxs("div", { className: "time-hours-card", children: [_jsxs("div", { className: "time-hours-card-title", children: [_jsx("h4", { children: row.name }), _jsxs("span", { children: [(row.seconds / 3600).toFixed(1), "h \u00B7 ", row.entries, " ", row.entries === 1 ? "entry" : "entries"] })] }), _jsx("div", { className: "time-hours-bar", role: "img", "aria-label": `${row.name} accounts for ${share}% of logged time`, children: _jsx("i", { style: { width: `${share}%` } }) }), rowTasks.length ? _jsx("div", { className: "time-hours-tasks", children: rowTasks.map((task) => _jsxs("button", { type: "button", onClick: () => { setFilterProject(task.projectId ?? ""); setFilterStatus("all"); }, children: [_jsx("span", { children: task.title }), _jsxs("strong", { children: [(task.seconds / 3600).toFixed(1), "h"] })] }, task.key)) }) : _jsx("p", { className: "time-hours-card-note", children: "No task-level time logged." })] }, row.key);
                            }), " "] }) : _jsx("p", { className: "identity-note", children: "No logged hours yet in this view." })] }), _jsxs("div", { className: "time-top-grid", children: [(data.timer || setup.employeeId) && _jsxs("section", { className: "time-panel", children: [_jsx("h3", { children: data.timer ? "Active timer" : "Start a timer" }), data.timer ? _jsxs(_Fragment, { children: [_jsx("p", { className: "time-clock", "aria-live": "polite", children: duration(elapsed) }), _jsxs("p", { children: [data.timer.workNote || "No work note", " \u00B7 ", data.timer.state.toLowerCase()] }), _jsxs("div", { className: "time-actions", children: [data.timer.state === "RUNNING" ? _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => timerAction("pause"), children: "Pause" }) : _jsx("button", { type: "button", disabled: pending, onClick: () => timerAction("resume"), children: "Resume" }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => timerAction("stop"), children: "Stop timer" })] })] }) : _jsxs(_Fragment, { children: [_jsx(ReferenceFields, { setup: setup, fields: fields, setFields: setFields, employeePicker: false }), _jsxs("label", { children: ["Work note", _jsx("input", { value: fields.workNote, onChange: (e) => setFields({ ...fields, workNote: e.target.value }), required: true, maxLength: 1000 })] }), _jsxs("div", { className: "time-inline", children: [_jsxs("label", { children: ["Location", _jsxs("select", { value: fields.location, onChange: (e) => setFields({ ...fields, location: e.target.value }), children: [_jsx("option", { value: "OFFICE", children: "Office" }), _jsx("option", { value: "SITE", children: "Site" }), _jsx("option", { value: "REMOTE", children: "Remote" })] })] }), _jsxs("label", { className: "time-check", children: [_jsx("input", { type: "checkbox", checked: fields.billable, onChange: (e) => setFields({ ...fields, billable: e.target.checked }) }), " Billable"] })] }), _jsx("button", { type: "button", disabled: pending || !fields.workNote.trim() || !setup.employeeId, onClick: startTimer, children: "Start timer" }), !setup.employeeId && _jsx("p", { className: "identity-note", children: "Your account has no employee record for a personal timer." })] })] }), _jsxs("section", { className: "time-panel", children: [_jsx("h3", { children: "Log time manually" }), _jsxs("form", { className: "time-form", onSubmit: (e) => { e.preventDefault(); void mutate(`${API}/entries`, { commandId: id(), ...fieldPayload(fields) }).then((saved) => { if (saved)
                                    setFields(emptyFields()); }); }, children: [_jsx(EntryFields, { setup: setup, fields: fields, setFields: setFields, employeePicker: employeePicker }), _jsx("button", { type: "submit", disabled: pending || !fields.workNote.trim() || !fields.durationSeconds || (employeePicker && !fields.employeeId), children: "Save time entry" })] })] })] }), _jsxs("section", { className: "time-history", children: [_jsx("div", { className: "time-heading", children: _jsxs("div", { children: [_jsx("h3", { children: "Entry history" }), _jsxs("p", { children: [visible.length, " ", visible.length === 1 ? "entry" : "entries"] })] }) }), _jsxs("div", { className: "time-filters", children: [_jsxs("label", { children: ["Project", _jsxs("select", { value: filterProject, onChange: (e) => setFilterProject(e.target.value), children: [_jsx("option", { value: "", children: "All projects" }), setup.projects.map((project) => _jsx("option", { value: project.id, children: project.name }, project.id))] })] }), _jsxs("label", { children: ["Status", _jsxs("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), children: [_jsx("option", { value: "all", children: "All" }), _jsx("option", { value: "open", children: "Open" }), _jsx("option", { value: "approved", children: "Approved" }), _jsx("option", { value: "locked", children: "Locked" })] })] }), _jsxs("label", { children: ["Search", _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Work note or activity" })] })] }), !visible.length ? _jsx("p", { className: "identity-note", role: "status", children: "No time entries match this view." }) : _jsx("div", { className: "time-entry-list", children: visible.map((entry) => _jsxs("article", { className: "time-entry", children: [_jsxs("div", { className: "time-entry-main", children: [_jsxs("div", { className: "time-entry-title", children: [_jsx("h4", { children: entry.activityLabel || entry.workNote || "Time entry" }), _jsx("span", { children: duration(entry.durationSeconds) })] }), _jsxs("p", { children: [entry.date, " \u00B7 ", entry.location.toLowerCase(), " \u00B7 ", entry.billable ? "billable" : "non-billable", " \u00B7 ", entry.projectId ? setup.projects.find((p) => p.id === entry.projectId)?.name ?? "Project" : "Non-project activity"] }), _jsx("p", { children: entry.workNote }), _jsxs("div", { className: "time-badges", children: [_jsx("span", { children: entry.approved ? "Approved" : "Pending approval" }), _jsx("span", { children: entry.locked ? "Locked" : "Editable" })] }), !!entry.versions.length && _jsxs("details", { children: [_jsxs("summary", { children: ["Immutable history (", entry.versions.length, " revisions)"] }), _jsx("ol", { children: entry.versions.map((version, index) => {
                                                        const previous = index > 0 ? entry.versions[index - 1].data : null;
                                                        const next = version.data;
                                                        const labels = [["date", "Date"], ["startedAt", "Start"], ["endedAt", "End"], ["durationSeconds", "Duration (seconds)"], ["projectId", "Project"], ["taskId", "Task"], ["stageId", "Stage"], ["workNote", "Work note"], ["location", "Location"], ["billable", "Billable"], ["evidenceFileId", "Evidence file"]];
                                                        const display = (value) => value === undefined || value === null || value === "" ? "—" : typeof value === "boolean" ? value ? "Yes" : "No" : String(value);
                                                        return _jsxs("li", { children: [_jsxs("strong", { children: ["Version ", version.version] }), " \u00B7 ", version.reason, " \u00B7 ", version.editorId, " \u00B7 ", _jsx("time", { children: new Date(version.occurredAt).toLocaleString() }), _jsx("dl", { className: "time-version-diff", children: labels.map(([key, label]) => _jsxs("div", { children: [_jsx("dt", { children: label }), _jsxs("dd", { children: [display(previous?.[key]), " \u2192 ", display(next[key])] })] }, key)) })] }, version.version);
                                                    }) })] }), !!entry.deliveries.length && _jsxs("details", { children: [_jsx("summary", { children: "Accounting delivery" }), _jsx("ul", { children: entry.deliveries.map((delivery) => _jsxs("li", { children: [_jsx("strong", { children: delivery.state }), " \u00B7 revision ", delivery.revision, " \u00B7 ", delivery.attempts, " attempts ", owner && delivery.state !== "DELIVERED" && _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => { const why = window.prompt("Reason for retrying this delivery"); if (why?.trim())
                                                                    void mutate(`${API}/deliveries/${encodeURIComponent(delivery.id)}/retry`, { reason: why.trim() }); }, children: "Retry" })] }, delivery.id)) })] })] }), _jsxs("div", { className: "time-entry-actions", children: [entry.canCorrect && _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => beginCorrection(entry), children: "Correct" }), entry.canApprove && !entry.approved && _jsx("button", { type: "button", disabled: pending, onClick: () => { const why = window.prompt("Reason for approving this entry"); if (why?.trim())
                                                void mutate(`${API}/entries/${encodeURIComponent(entry.id)}/approve`, { commandId: id(), expectedVersion: entry.version, reason: why.trim() }); }, children: "Approve" }), owner && entry.approved && _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => { const why = window.prompt("Reason for exporting this entry"); if (why?.trim())
                                                void mutate(`${API}/entries/${encodeURIComponent(entry.id)}/export`, { commandId: id(), expectedVersion: entry.version, reason: why.trim() }); }, children: "Export" })] })] }, entry.id)) })] }), correction && _jsx("div", { className: "time-dialog-backdrop", children: _jsxs("section", { className: "time-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "correction-heading", children: [_jsxs("div", { className: "time-heading", children: [_jsxs("div", { children: [_jsx("h3", { id: "correction-heading", children: "Correct time entry" }), _jsxs("p", { children: ["Version ", correction.version, "; prior versions remain in the audit history."] })] }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => setCorrection(null), children: "Close" })] }), _jsxs("form", { className: "time-form", onSubmit: (e) => { e.preventDefault(); if (reason.trim().length < 3)
                                return; void mutate(`${API}/entries/${encodeURIComponent(correction.id)}/corrections`, { commandId: id(), expectedVersion: correction.version, reason: reason.trim(), ...fieldPayload(correctionFields, false) }).then((saved) => { if (saved)
                                setCorrection(null); }); }, children: [_jsx(EntryFields, { setup: setup, fields: correctionFields, setFields: setCorrectionFields, employeePicker: false }), _jsxs("label", { children: ["Reason for correction", _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), minLength: 3, maxLength: 1000, required: true, rows: 3 })] }), _jsx("button", { type: "submit", disabled: pending || reason.trim().length < 3, children: "Save correction" })] })] }) })] });
}
