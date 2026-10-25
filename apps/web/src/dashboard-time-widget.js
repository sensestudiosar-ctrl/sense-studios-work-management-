import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
class TimeReadError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
async function request(path, csrf, body) {
    const response = await fetch(`/api/v1/time${path}`, { method: body ? "POST" : "GET", credentials: "include", cache: "no-store", headers: body ? { "Content-Type": "application/json", "X-CSRF-Token": csrf } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new TimeReadError(result.error?.message ?? result.message ?? `Time source unavailable (${response.status})`, response.status);
    return result;
}
export function DashboardTimeWidget({ csrfToken, refreshVersion = 0 }) {
    const [setup, setSetup] = useState(null), [timer, setTimer] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true), [error, setError] = useState(""), [pending, setPending] = useState(false);
    const [workNote, setWorkNote] = useState(""), [location, setLocation] = useState("OFFICE"), [billable, setBillable] = useState(true);
    const [projectId, setProjectId] = useState(""), [taskId, setTaskId] = useState("");
    const [activityLabel, setActivityLabel] = useState("");
    const [clock, setClock] = useState(Date.now), [readAt, setReadAt] = useState(0);
    const generation = useRef(0), command = useRef(null), busy = useRef(false);
    const load = useCallback(async () => {
        const current = ++generation.current;
        setError("");
        setLoading(true);
        try {
            const [nextSetup, data] = await Promise.all([request("/setup", csrfToken), request("?scope=mine", csrfToken)]);
            if (current !== generation.current)
                return;
            setSetup(nextSetup);
            setTimer(data.timer);
            setEntries(Array.isArray(data.entries) ? data.entries : []);
            setReadAt(Date.now());
            setClock(Date.now());
        }
        catch (cause) {
            if (current !== generation.current)
                return;
            setSetup(null);
            setTimer(null);
            setError(cause instanceof Error ? cause.message : "Time source unavailable");
        }
        finally {
            if (current === generation.current)
                setLoading(false);
        }
    }, [csrfToken]);
    useEffect(() => { void load(); return () => { generation.current++; }; }, [load, refreshVersion]);
    useEffect(() => { const tick = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(tick); }, []);
    const mutate = async (path, payload) => {
        if (busy.current)
            return;
        busy.current = true;
        setPending(true);
        setError("");
        const signature = JSON.stringify({ path, payload });
        if (command.current?.signature !== signature)
            command.current = { signature, id: crypto.randomUUID() };
        try {
            await request(path, csrfToken, { ...payload, commandId: command.current.id });
            command.current = null;
            if (path === "/timers")
                setWorkNote("");
            await load();
        }
        catch (cause) {
            // Keep the command identity for a same-input retry after an uncertain response.
            if (cause instanceof TimeReadError && [401, 403].includes(cause.status)) {
                generation.current++;
                setSetup(null);
                setTimer(null);
                setReadAt(0);
                setLoading(false);
            }
            setError(cause instanceof Error ? cause.message : "Timer command not confirmed");
        }
        finally {
            busy.current = false;
            setPending(false);
        }
    };
    const timerAction = (action) => {
        if (!timer || pending)
            return;
        const reason = action === "stop" ? window.prompt("Reason for stopping this timer")?.trim() : "Timer control";
        if (!reason)
            return;
        void mutate(`/timers/${encodeURIComponent(timer.id)}/${action}`, { expectedVersion: timer.version, reason });
    };
    const elapsed = timer ? timer.elapsedSeconds + (timer.state === "RUNNING" ? Math.max(0, Math.floor((clock - readAt) / 1000)) : 0) : 0;
    const duration = [Math.floor(elapsed / 3600), Math.floor(elapsed % 3600 / 60), elapsed % 60].map(n => String(n).padStart(2, "0")).join(":");
    const today = new Date().toLocaleDateString("en-CA");
    const weekAgo = new Date(Date.now() - 6 * 86_400_000).toLocaleDateString("en-CA");
    const hoursIn = (from) => { const s = entries.filter(entry => entry.date >= from).reduce((total, entry) => total + entry.durationSeconds, 0); return `${(s / 3600).toFixed(1)}h`; };
    const projectHours = useMemo(() => {
        const totals = new Map();
        for (const entry of entries) {
            if (!entry.projectId)
                continue;
            const name = setup?.projects.find(project => project.id === entry.projectId)?.name ?? "Project";
            const current = totals.get(entry.projectId) ?? { name, seconds: 0, count: 0 };
            current.seconds += entry.durationSeconds;
            current.count += 1;
            totals.set(entry.projectId, current);
        }
        return [...totals.values()].sort((a, b) => b.seconds - a.seconds).slice(0, 3);
    }, [entries, setup?.projects]);
    return _jsxs("div", { className: "dv-widget-body dv-time-body", children: [error && _jsxs("div", { className: "dv-source-error", role: "alert", children: [_jsx("strong", { children: error }), _jsx("button", { type: "button", disabled: pending, onClick: () => void load(), children: "Refresh timer" })] }), loading ? _jsx("p", { role: "status", children: "Reading time source\u2026" }) : timer ? _jsxs("div", { className: "dv-time-active", children: [_jsxs("div", { className: "dv-time-value", children: [_jsx("div", { className: "dv-time-display", "data-state": timer.state === "RUNNING" ? "running" : "idle", children: duration }), _jsxs("span", { className: "dv-time-status", children: [_jsx("i", { "aria-hidden": "true" }), timer.state === "RUNNING" ? "Tracking now" : "Paused"] })] }), timer.workNote && _jsx("p", { children: timer.workNote }), _jsxs("div", { className: "dv-time-controls", children: [_jsx("button", { type: "button", disabled: pending, onClick: () => timerAction(timer.state === "RUNNING" ? "pause" : "resume"), children: timer.state === "RUNNING" ? "Pause" : "Resume" }), _jsx("button", { type: "button", disabled: pending, className: "secondary-action", onClick: () => timerAction("stop"), children: "Stop & save" })] })] }) : setup?.employeeId ? _jsxs("div", { className: "dv-time-idle", children: [_jsx("div", { className: "dv-time-display", children: "00:00:00" }), _jsxs("label", { className: "dv-time-field", children: ["Project", _jsxs("select", { value: projectId, disabled: pending, onChange: e => { setProjectId(e.target.value); setTaskId(""); setActivityLabel(""); }, children: [_jsx("option", { value: "", children: "Non-project activity" }), setup.projects?.map(p => _jsx("option", { value: p.id, children: p.name }, p.id))] })] }), _jsxs("label", { className: "dv-time-field", children: ["Task \u00B7 optional", _jsxs("select", { value: taskId, disabled: pending, onChange: e => setTaskId(e.target.value), children: [_jsx("option", { value: "", children: "No linked task" }), setup.tasks?.filter(t => (t.projectId ?? "") === projectId).map(t => _jsx("option", { value: t.id, children: t.title }, t.id))] })] }), !projectId && _jsxs("label", { className: "dv-time-field", children: ["Non-project activity", _jsx("input", { value: activityLabel, maxLength: 160, disabled: pending, onChange: e => setActivityLabel(e.target.value), placeholder: "For example, internal coordination" })] }), _jsxs("label", { className: "dv-time-field", children: ["Work note", _jsx("input", { value: workNote, maxLength: 1000, disabled: pending, onChange: e => setWorkNote(e.target.value), placeholder: "What are you working on?" })] }), _jsxs("div", { className: "dv-time-options", children: [_jsxs("label", { className: "dv-time-field", children: ["Location", _jsxs("select", { value: location, disabled: pending, onChange: e => setLocation(e.target.value), children: [_jsx("option", { value: "OFFICE", children: "Office" }), _jsx("option", { value: "SITE", children: "Site" }), _jsx("option", { value: "REMOTE", children: "Remote" })] })] }), _jsxs("label", { className: "dv-time-check", children: [_jsx("input", { type: "checkbox", checked: billable, disabled: pending, onChange: e => setBillable(e.target.checked) }), "Billable"] })] }), _jsx("button", { type: "button", disabled: pending || !workNote.trim() || !projectId && !activityLabel.trim(), onClick: () => void mutate("/timers", { workNote: workNote.trim(), location, billable, ...(projectId ? { projectId } : {}), ...(taskId ? { taskId } : {}), ...(!projectId ? { activityLabel: activityLabel.trim() } : {}) }), children: "Start timer" })] }) : !error && _jsx("p", { children: "Your account has no employee record for a personal timer." }), entries.length > 0 && _jsxs("div", { className: "dv-time-hours", "aria-label": "Logged hours from your recent time entries", children: [_jsxs("div", { className: "dv-time-hours-row", children: [_jsx("span", { children: "Today" }), _jsx("strong", { children: hoursIn(today) }), _jsx("span", { children: "This week" }), _jsx("strong", { children: hoursIn(weekAgo) })] }), projectHours.length > 0 && _jsx("div", { className: "dv-time-hours-projects", children: projectHours.map(project => _jsxs("div", { className: "dv-time-hours-project", children: [_jsx("span", { children: project.name }), _jsxs("strong", { children: [(project.seconds / 3600).toFixed(1), "h"] })] }, project.name)) })] }), _jsxs("div", { className: "dv-widget-foot", children: [_jsx("span", { children: readAt ? `Read at ${new Date(readAt).toLocaleTimeString()}` : "Time source not read" }), _jsx(Link, { to: "/time", children: "Time log & manual entry \u2192" })] })] });
}
