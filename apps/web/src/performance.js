import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./performance.css";
const API = "/api/v1/performance";
const causes = ["INTERNAL_TEAM", "CLIENT", "CONSULTANT", "VENDOR", "FACTORY", "PROCUREMENT", "MATERIAL", "SITE_CONDITION", "APPROVAL", "SCOPE_CHANGE", "OTHER"];
const sourceKinds = ["TASK_STATUS", "TASK_DATE", "REVIEW_ROUND", "SITE_HISTORY", "PROJECT_SCOPE"];
const frequencies = ["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"];
const commandId = () => crypto.randomUUID();
class PerformanceError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
async function request(url, csrf, init = {}) {
    const headers = new Headers(init.headers);
    if (init.body) {
        headers.set("Content-Type", "application/json");
        headers.set("X-CSRF-Token", csrf);
    }
    const response = await fetch(url, { ...init, headers, credentials: "include", cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new PerformanceError(body.error?.message ?? body.message ?? `Request failed (${response.status})`, response.status);
    return body;
}
const explainValue = (value) => value === null || value === undefined || value === "" ? "—" : String(value);
const validDateRange = (from, to) => Boolean(from && to && from <= to);
export function PerformanceWorkspace({ csrfToken, owner, initialTab = "employee", focused = false }) {
    const [context, setContext] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const pendingCommand = useRef(null);
    const employeeRequest = useRef(0);
    const projectRequest = useRef(0);
    const [tab, setTab] = useState(initialTab);
    const [employeeId, setEmployeeId] = useState("");
    const [projectId, setProjectId] = useState(() => new URLSearchParams(window.location.search).get("projectId") ?? "");
    const selectedProjectId = useRef(projectId);
    const [employee, setEmployee] = useState(null);
    const [project, setProject] = useState(null);
    const [projectLoading, setProjectLoading] = useState(false);
    const [projectError, setProjectError] = useState("");
    const [healthDirectory, setHealthDirectory] = useState(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthError, setHealthError] = useState("");
    const healthRequest = useRef(0);
    const [reason, setReason] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [family, setFamily] = useState("EMPLOYEE");
    const [policyFamily, setPolicyFamily] = useState("EMPLOYEE");
    const [groupKey, setGroupKey] = useState("");
    const [policyLabel, setPolicyLabel] = useState("");
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [components, setComponents] = useState([]);
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
        setLoading(true);
        setError("");
        try {
            const value = await request(`${API}/context`, csrfToken);
            setContext(value);
            setEmployeeId(current => current || value.employeeId || value.employees[0]?.id || "");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Performance data could not be loaded.");
        }
        finally {
            setLoading(false);
        }
    }, [csrfToken]);
    const loadEmployee = useCallback(async () => {
        const requestId = ++employeeRequest.current;
        if (!employeeId) {
            setEmployee(null);
            return;
        }
        setEmployee(null);
        try {
            const value = await request(`${API}/employees/${encodeURIComponent(employeeId)}`, csrfToken);
            if (requestId === employeeRequest.current)
                setEmployee(value);
        }
        catch (cause) {
            if (requestId === employeeRequest.current) {
                setEmployee(null);
                setError(cause instanceof Error ? cause.message : "Employee performance could not be loaded.");
            }
        }
    }, [csrfToken, employeeId]);
    const loadProject = useCallback(async () => {
        const requestId = ++projectRequest.current;
        setProject(null);
        setProjectError("");
        if (!context || !projectId) {
            setProjectLoading(false);
            return;
        }
        if (!context.projects.some(row => row.id === projectId)) {
            setProjectLoading(false);
            setProjectError("This project is unavailable in your current scope. Choose another project from the list.");
            return;
        }
        setProjectLoading(true);
        try {
            const value = await request(`${API}/projects/${encodeURIComponent(projectId)}`, csrfToken);
            if (requestId === projectRequest.current)
                setProject(value);
        }
        catch (cause) {
            if (requestId === projectRequest.current) {
                setProject(null);
                setProjectError(cause instanceof Error ? cause.message : "Project health could not be loaded.");
            }
        }
        finally {
            if (requestId === projectRequest.current)
                setProjectLoading(false);
        }
    }, [csrfToken, projectId, context]);
    const loadHealthDirectory = useCallback(async () => {
        const requestId = ++healthRequest.current;
        setHealthDirectory(null);
        setHealthError("");
        setHealthLoading(true);
        try {
            const value = await request("/api/v1/dashboard/sources/health", csrfToken);
            if (requestId === healthRequest.current)
                setHealthDirectory(value);
        }
        catch (cause) {
            if (requestId === healthRequest.current)
                setHealthError(cause instanceof Error ? cause.message : "Project health summaries could not be loaded.");
        }
        finally {
            if (requestId === healthRequest.current)
                setHealthLoading(false);
        }
    }, [csrfToken]);
    useEffect(() => { void loadContext(); }, [loadContext]);
    useEffect(() => { void loadEmployee(); }, [loadEmployee]);
    useEffect(() => { void loadProject(); }, [loadProject]);
    useEffect(() => { if (tab === "project" && context)
        void loadHealthDirectory(); }, [tab, context, loadHealthDirectory]);
    useEffect(() => {
        const restore = () => {
            const nextId = new URLSearchParams(window.location.search).get("projectId") ?? "";
            if (selectedProjectId.current === nextId)
                return;
            setDelay({ cause: "", days: "", sourceKind: "", sourceId: "", employeeId: "", external: false, from: "", to: "", summary: "" });
            selectedProjectId.current = nextId;
            projectRequest.current += 1;
            setProject(null);
            setProjectError("");
            setProjectId(nextId);
        };
        window.addEventListener("popstate", restore);
        return () => { window.removeEventListener("popstate", restore); projectRequest.current += 1; healthRequest.current += 1; };
    }, []);
    const selectProject = (id) => {
        if (busy || !context?.projects.some(row => row.id === id))
            return;
        if (selectedProjectId.current === id)
            return;
        if (selectedProjectId.current !== id)
            setDelay({ cause: "", days: "", sourceKind: "", sourceId: "", employeeId: "", external: false, from: "", to: "", summary: "" });
        selectedProjectId.current = id;
        const url = new URL(window.location.href);
        url.searchParams.set("projectId", id);
        if (window.location.search !== url.search) {
            window.history.pushState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
            window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
        }
        projectRequest.current += 1;
        setProject(null);
        setProjectError("");
        setNotice("");
        setProjectId(id);
    };
    const mutate = async (operation, fields, refresh = tab) => {
        if (reason.trim().length < 3) {
            setError("Enter a reason of at least three characters.");
            return;
        }
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const fingerprint = JSON.stringify({ reason: reason.trim(), operation, fields });
            if (pendingCommand.current?.fingerprint !== fingerprint)
                pendingCommand.current = { fingerprint, id: commandId() };
            await request(`${API}/commands`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: pendingCommand.current.id, reason: reason.trim(), operation, ...fields }) });
            pendingCommand.current = null;
            if (refresh === "context")
                await loadContext();
            if (refresh === "employee")
                await loadEmployee();
            if (refresh === "project") {
                await loadProject();
                await loadHealthDirectory();
            }
            setNotice("Performance record saved.");
            setReason("");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "The action could not be completed.");
        }
        finally {
            setBusy(false);
        }
    };
    const policyFor = (currentFamily, currentGroup) => context?.policies.find(row => row.kind === "POLICY" && row.state === "APPROVED" && row.data.family === currentFamily && row.data.groupKey === currentGroup);
    const compatibleMetrics = useMemo(() => context?.metrics.filter(metric => metric.families.includes(policyFamily)) ?? [], [context, policyFamily]);
    const activeEmployee = context?.employees.find(row => row.id === employeeId);
    const canManageEmployee = owner || employee?.canManage === true || activeEmployee?.canManage === true;
    const canManageProject = !!project && (owner || project.canManage === true);
    const snapshots = (rows) => rows.filter(row => row.kind === "SCORE" || row.kind === "HEALTH");
    const assignedGroup = employee?.groupAssignments.find(row => row.data.family === family)?.data.groupKey ?? "";
    const approvedEmployeePolicy = policyFor(family, assignedGroup);
    const approvedProjectPolicy = project ? policyFor(project.project.deliveryType, project.project.deliveryType) : undefined;
    const familySnapshots = snapshots(employee?.snapshots ?? []).filter(row => row.data.family === family);
    const cycleSnapshot = familySnapshots.find(row => row.data.from === from && row.data.to === to);
    const changePolicyFamily = (next) => { setPolicyFamily(next); setGroupKey(next === "DESIGN" || next === "TURNKEY" ? next : ""); setPolicyLabel(""); setEffectiveFrom(""); setComponents([]); setAttendanceCap(""); setEfficiencyCap(""); setStrengthAt(""); setWeaknessBelow(""); setThresholds({ criticalBelow: "", delayedBelow: "", atRiskBelow: "" }); };
    const addMetric = () => { const available = compatibleMetrics.find(metric => !components.some(row => row.metric === metric.key)); if (available)
        setComponents(rows => [...rows, { metric: available.key, weight: "", min: "", max: "", direction: available.category.includes("turnaround") || available.category.includes("count") ? "LOWER" : "HIGHER", required: true }]); };
    const updateComponent = (index, change) => setComponents(rows => rows.map((row, i) => i === index ? { ...row, ...change } : row));
    const savePolicy = () => {
        const policy = { family: policyFamily, groupKey: groupKey.trim(), label: policyLabel.trim(), effectiveFrom, components: components.map(row => ({ ...row, weight: Number(row.weight), min: Number(row.min), max: Number(row.max) })), attendanceMaxWeight: Number(attendanceCap), efficiencyMaxWeight: Number(efficiencyCap), strengthAt: Number(strengthAt), weaknessBelow: Number(weaknessBelow), thresholds: { criticalBelow: Number(thresholds.criticalBelow), delayedBelow: Number(thresholds.delayedBelow), atRiskBelow: Number(thresholds.atRiskBelow) } };
        if (!groupKey.trim() || !policyLabel.trim() || !effectiveFrom || components.length === 0 || components.some(row => row.weight === "" || row.min === "" || row.max === "") || attendanceCap === "" || efficiencyCap === "" || strengthAt === "" || weaknessBelow === "" || Object.values(thresholds).some(value => value === "")) {
            setError("Complete every policy field explicitly. No values are prefilled.");
            return;
        }
        void mutate("POLICY_CREATE", { policy }, "context");
    };
    if (loading)
        return _jsx("section", { className: "identity-section performance", children: _jsx("p", { role: "status", children: "Loading performance\u2026" }) });
    if (!context)
        return _jsxs("section", { className: "identity-section performance", children: [_jsx("h1", { children: initialTab === "project" ? "Project Health" : "Performance" }), _jsx("p", { role: "alert", className: "auth-error", children: error || "Performance is unavailable." }), _jsx("button", { type: "button", onClick: () => void loadContext(), children: "Try again" })] });
    return _jsxs("section", { className: "identity-section performance", "aria-labelledby": "performance-heading", children: [_jsxs("header", { className: "perf-heading", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: initialTab === "project" ? "PROJECT DELIVERY" : "PEOPLE" }), _jsx("h1", { id: "performance-heading", children: initialTab === "project" ? "Project Health" : "Performance" }), _jsx("p", { children: initialTab === "project" ? "Review current health evidence and immutable project snapshots." : "Published performance snapshots retain their source evidence, selected policy and calculation." })] }), _jsx("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => { void loadContext(); void loadEmployee(); void loadProject(); }, children: "Refresh" })] }), !focused && _jsxs("div", { className: "perf-tabs", role: "tablist", "aria-label": "Performance views", children: [_jsx("button", { role: "tab", "aria-selected": tab === "employee", onClick: () => setTab("employee"), children: "Employee performance" }), _jsx("button", { role: "tab", "aria-selected": tab === "project", onClick: () => setTab("project"), children: "Design / Turnkey health" })] }), error && _jsx("p", { role: "alert", className: "auth-error", children: error }), notice && _jsx("p", { role: "status", className: "notice", children: notice }), _jsxs("label", { className: "perf-reason", children: ["Reason for this action (required)", _jsx("input", { disabled: busy, value: reason, maxLength: 1000, onChange: event => setReason(event.target.value), placeholder: "Explain why this change or review is needed" })] }), context.unavailable.length > 0 && _jsxs("p", { className: "perf-unavailable", children: ["Unavailable in this release: ", context.unavailable.join(", "), ". No training, skills or SOP evidence is inferred."] }), tab === "employee" ? _jsxs(_Fragment, { children: [_jsxs("div", { className: "perf-toolbar", children: [_jsxs("label", { children: ["Employee", _jsxs("select", { "aria-label": "Employee", disabled: busy, value: employeeId, onChange: event => { employeeRequest.current += 1; setEmployee(null); setEmployeeId(event.target.value); }, children: [_jsx("option", { value: "", children: "Choose employee" }), context.employees.map(row => _jsxs("option", { value: row.id, children: [row.label, row.id === context.employeeId ? " (you)" : ""] }, row.id))] })] }), _jsxs("label", { children: ["Score family", _jsxs("select", { "aria-label": "Score family", value: family, onChange: event => setFamily(event.target.value), children: [_jsx("option", { value: "EMPLOYEE", children: "Employee score" }), _jsx("option", { value: "LEADER", children: "Team Leader management score" })] })] })] }), !employeeId ? _jsx("div", { className: "perf-empty", role: "status", children: "No employee performance records are available in your current scope." }) : _jsxs(_Fragment, { children: [_jsxs("div", { className: "perf-panel", children: [_jsx("h2", { children: employee?.employee.label ?? "Employee" }), _jsx("p", { children: "Current score and history are available only when an Owner-approved policy and sufficient source evidence exist." }), !approvedEmployeePolicy && _jsxs("div", { className: "perf-empty", role: "status", children: [_jsx("strong", { children: "Policy not configured" }), _jsxs("p", { children: ["No approved ", family === "LEADER" ? "Team Leader" : "employee", " policy is assigned to this employee group. No score is shown or generated."] })] }), employee && familySnapshots.length === 0 && _jsxs("p", { className: "perf-empty", role: "status", children: ["No published ", family === "LEADER" ? "Team Leader management" : "employee", " score history yet. Missing required evidence remains insufficient; it is never replaced with a zero."] }), employee?.teamAverage === null && _jsx("p", { className: "perf-empty", role: "status", children: "Anonymous own-team average is unavailable until the permitted team has compatible scored evidence." }), employee && employee.teamAverage !== null && family === "EMPLOYEE" && _jsxs("p", { className: "perf-average", children: ["Your team average: ", _jsx("strong", { children: employee.teamAverage.toFixed(1) }), employee.relativeToAverage !== null && _jsxs("span", { children: [" \u00B7 ", employee.relativeToAverage >= 0 ? "+" : "", employee.relativeToAverage.toFixed(1), " relative to the anonymous average"] })] }), familySnapshots.map(row => _jsx(SnapshotCard, { row: row }, row.id)), employee?.cycles.map(cycle => _jsx(CycleCard, { cycle: cycle, snapshots: employee.snapshots, self: cycle.employeeId === context.employeeId, canManage: owner || employee.canManage, owner: owner, busy: busy, mutate: mutate, ackText: ackText, setAckText: setAckText, commentText: commentText, setCommentText: setCommentText }, cycle.id))] }), canManageEmployee && _jsxs("div", { className: "perf-panel", children: [_jsx("h2", { children: "Generate a grounded score snapshot" }), _jsx("p", { children: "Generation requires a current approved policy, explicit group assignment and sufficient persisted source evidence. Scores preserve exact source versions." }), _jsxs("div", { className: "perf-toolbar", children: [_jsxs("label", { children: ["From", _jsx("input", { type: "date", value: from, onChange: event => setFrom(event.target.value) })] }), _jsxs("label", { children: ["To", _jsx("input", { type: "date", value: to, onChange: event => setTo(event.target.value) })] })] }), _jsxs("button", { disabled: busy || !validDateRange(from, to) || !approvedEmployeePolicy, onClick: () => void mutate("EMPLOYEE_SNAPSHOT", { employeeId, family, from, to }, "employee"), children: ["Generate ", family.toLowerCase(), " snapshot"] }), _jsxs("div", { className: "perf-toolbar", children: [_jsxs("label", { children: ["Assign role group", _jsxs("select", { "aria-label": "Assignment family", value: family, onChange: event => setFamily(event.target.value), children: [_jsx("option", { value: "EMPLOYEE", children: "Employee" }), _jsx("option", { value: "LEADER", children: "Team Leader" })] })] }), _jsxs("label", { children: ["Approved group", _jsxs("select", { "aria-label": "Approved group", value: groupKey, onChange: event => setGroupKey(event.target.value), children: [_jsx("option", { value: "", children: "Choose an approved group" }), context.policies.filter(row => row.kind === "POLICY" && row.state === "APPROVED" && row.data.family === family).map(row => _jsxs("option", { value: row.data.groupKey, children: [row.data.label, " \u00B7 ", row.data.groupKey] }, row.id))] })] }), _jsxs("label", { children: ["Effective from", _jsx("input", { type: "date", value: assignmentDate, onChange: event => setAssignmentDate(event.target.value) })] })] }), _jsx("button", { className: "secondary-action", disabled: busy || !groupKey || !assignmentDate, onClick: () => void mutate("ASSIGN_GROUP", { employeeId, family, groupKey, effectiveFrom: assignmentDate }, "employee"), children: "Save dated group assignment" }), _jsx("div", { className: "perf-toolbar", children: _jsxs("label", { children: ["Review frequency", _jsx("select", { value: cycleFrequency, onChange: event => setCycleFrequency(event.target.value), children: frequencies.map(value => _jsx("option", { children: value }, value)) })] }) }), _jsxs("div", { className: "perf-toolbar", children: [_jsxs("label", { children: ["Cycle goals (one per line)", _jsx("textarea", { value: goalsText, onChange: event => setGoalsText(event.target.value), rows: 2 })] }), _jsxs("label", { children: ["Development actions (one per line)", _jsx("textarea", { value: actionsText, onChange: event => setActionsText(event.target.value), rows: 2 })] })] }), _jsx("button", { className: "secondary-action", disabled: busy || !validDateRange(from, to) || !cycleSnapshot, onClick: () => void mutate("CYCLE_CREATE", { employeeId, frequency: cycleFrequency, from, to, scoreId: cycleSnapshot?.id ?? null, goals: lines(goalsText), developmentActions: lines(actionsText) }, "employee"), children: "Create review cycle" })] })] })] }) : _jsx(_Fragment, { children: _jsxs("div", { className: `perf-health-layout ${projectId ? "has-selection" : ""}`, children: [_jsxs("aside", { className: "perf-health-directory", "aria-labelledby": "health-project-list-heading", children: [_jsxs("header", { children: [_jsx("h2", { id: "health-project-list-heading", children: "Projects" }), _jsx("p", { children: "All projects in your current health scope. Select one to inspect its evidence." })] }), healthLoading && _jsx("p", { role: "status", children: "Loading health summaries\u2026" }), healthError && _jsxs("div", { children: [_jsx("p", { role: "alert", children: healthError }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => void loadHealthDirectory(), disabled: healthLoading, children: "Retry summaries" })] }), healthDirectory && _jsxs("p", { className: "perf-health-read", children: ["Read at ", new Date(healthDirectory.readCompletedAt).toLocaleString(), ". Bars show persisted snapshots, not live predictions."] }), context.projects.length === 0 && _jsx("p", { role: "status", children: "No Design or Turnkey projects are available in your current project scope." }), _jsx("ul", { className: "perf-project-list", children: context.projects.map(row => {
                                        const summary = healthDirectory?.sections.find(section => section.key === "health")?.rows.find(item => item.id === row.id);
                                        const numeric = summary?.status === "SCORED" && typeof summary.score === "number" && Number.isFinite(summary.score) && summary.scoreScale?.min === 0 && summary.scoreScale.max === 100 && summary.score >= 0 && summary.score <= 100;
                                        return _jsx("li", { children: _jsxs("button", { type: "button", className: "perf-project-choice", "aria-pressed": projectId === row.id, "aria-controls": "health-project-detail", disabled: busy, onClick: () => selectProject(row.id), children: [_jsx("strong", { children: row.label }), _jsx("span", { children: row.deliveryType === "TURNKEY" ? "Turnkey" : "Design" }), numeric ? _jsxs(_Fragment, { children: [_jsxs("span", { className: "perf-project-score", children: [summary.score.toFixed(1), " / 100"] }), _jsx("meter", { min: 0, max: 100, value: summary.score, "aria-label": `${row.label} persisted health score` })] }) : _jsx("span", { className: "perf-project-status", children: summary?.status === "INSUFFICIENT_EVIDENCE" ? "Insufficient evidence" : summary ? "No numeric health snapshot" : healthError ? "Health summary unavailable" : "Health not loaded" }), summary?.snapshotId && _jsxs("small", { children: ["Snapshot ", summary.from ?? "date unavailable", " \u2013 ", summary.to ?? "date unavailable", " \u00B7 policy v", summary.policyVersion ?? "unavailable"] })] }) }, row.id);
                                    }) })] }), _jsx("div", { id: "health-project-detail", className: "perf-health-detail", "aria-busy": projectLoading, children: !projectId ? _jsx("div", { className: "perf-empty", role: "status", children: "Select a project to inspect its health, snapshot history and delay evidence. The project list stays available while you work." }) : _jsxs(_Fragment, { children: [projectLoading && _jsx("p", { role: "status", children: "Loading selected project health\u2026" }), projectError && _jsxs("div", { className: "perf-empty", children: [_jsx("p", { role: "alert", children: projectError }), context.projects.some(row => row.id === projectId) && _jsx("button", { type: "button", className: "secondary-action", onClick: () => void loadProject(), children: "Retry project" })] }), project && _jsxs(_Fragment, { children: [_jsxs("div", { className: "perf-panel", children: [_jsx("h2", { children: project?.project.label ?? "Project health" }), _jsx("p", { children: "Health evidence is derived from persisted schedules, milestones, reviews, pending decisions, scope and workload." }), project?.snapshots.length === 0 && _jsxs("div", { className: "perf-empty", role: "status", children: [_jsx("strong", { children: "No health snapshot" }), _jsx("p", { children: "No published snapshot is available. An approved policy and grounded evidence are required before a status is shown." })] }), project?.snapshots.map(row => _jsx(SnapshotCard, { row: row }, row.id)), _jsxs("div", { className: "perf-panel", children: [_jsx("h3", { children: "Delay attribution" }), _jsx("p", { children: "Cause and source linkage must be reviewed and entered explicitly. Waiting text alone never assigns responsibility." }), _jsxs("p", { children: [_jsx("strong", { children: "Total allocated delay:" }), " ", project?.delayTotalDays ?? 0, " days"] }), _jsx("ul", { children: project?.delayByCause.map(item => _jsxs("li", { children: [item.cause.replaceAll("_", " "), ": ", item.days, " days"] }, item.cause)) }), project?.delays.map(row => _jsx(DelayCard, { row: row }, row.id))] })] }), !approvedProjectPolicy && _jsxs("p", { className: "perf-empty", role: "status", children: ["No approved ", project?.project.deliveryType ?? "project health", " policy is configured. No health result is shown or generated."] }), canManageProject && _jsxs("div", { className: "perf-panel", children: [_jsx("h2", { children: "Generate health and review delays" }), _jsxs("div", { className: "perf-toolbar", children: [_jsxs("label", { children: ["From", _jsx("input", { type: "date", value: from, onChange: event => setFrom(event.target.value) })] }), _jsxs("label", { children: ["To", _jsx("input", { type: "date", value: to, onChange: event => setTo(event.target.value) })] })] }), _jsx("button", { disabled: busy || !validDateRange(from, to) || !approvedProjectPolicy, onClick: () => void mutate("PROJECT_SNAPSHOT", { projectId, from, to }, "project"), children: "Generate project health snapshot" }), owner && _jsxs(_Fragment, { children: [_jsx("h3", { children: "Owner reviewed delay source" }), _jsxs("div", { className: "perf-toolbar", children: [_jsxs("label", { children: ["Cause", _jsxs("select", { "aria-label": "Delay cause", value: delay.cause, onChange: event => setDelay({ ...delay, cause: event.target.value }), children: [_jsx("option", { value: "", children: "Choose cause" }), causes.map(value => _jsx("option", { value: value, children: value.replaceAll("_", " ") }, value))] })] }), _jsxs("label", { children: ["Allocated delay (days)", _jsx("input", { type: "number", min: "0", step: "0.25", value: delay.days, onChange: event => setDelay({ ...delay, days: event.target.value }) })] }), _jsxs("label", { children: ["Source kind", _jsxs("select", { "aria-label": "Delay source kind", value: delay.sourceKind, onChange: event => setDelay({ ...delay, sourceKind: event.target.value }), children: [_jsx("option", { value: "", children: "Choose source" }), sourceKinds.map(value => _jsx("option", { children: value }, value))] })] }), _jsxs("label", { children: ["Source record ID", _jsx("input", { value: delay.sourceId, onChange: event => setDelay({ ...delay, sourceId: event.target.value }) })] }), _jsxs("label", { children: ["Employee ID (optional)", _jsx("input", { value: delay.employeeId, onChange: event => setDelay({ ...delay, employeeId: event.target.value }) })] }), _jsxs("label", { children: ["From", _jsx("input", { type: "date", value: delay.from, onChange: event => setDelay({ ...delay, from: event.target.value }) })] }), _jsxs("label", { children: ["To", _jsx("input", { type: "date", value: delay.to, onChange: event => setDelay({ ...delay, to: event.target.value }) })] })] }), _jsxs("label", { children: ["Evidence summary", _jsx("textarea", { value: delay.summary, onChange: event => setDelay({ ...delay, summary: event.target.value }), rows: 2 })] }), _jsxs("label", { className: "perf-checkbox", children: [_jsx("input", { type: "checkbox", checked: delay.external, onChange: event => setDelay({ ...delay, external: event.target.checked }) }), " Owner-reviewed external cause"] }), _jsx("button", { className: "secondary-action", disabled: busy || !delay.cause || !delay.days || !delay.sourceKind || !delay.sourceId || !delay.from || !delay.to || !delay.summary.trim(), onClick: () => void mutate("DELAY_RECORD", { projectId, delay: { ...delay, days: Number(delay.days), employeeId: delay.employeeId || null, supersedesId: null } }, "project"), children: "Record attributed delay" })] })] })] })] }) })] }) }), owner && _jsx(PolicyEditor, { busy: busy, context: context, policyFamily: policyFamily, setPolicyFamily: changePolicyFamily, groupKey: groupKey, setGroupKey: setGroupKey, policyLabel: policyLabel, setPolicyLabel: setPolicyLabel, effectiveFrom: effectiveFrom, setEffectiveFrom: setEffectiveFrom, components: components, compatibleMetrics: compatibleMetrics, addMetric: addMetric, updateComponent: updateComponent, removeComponent: (index) => setComponents(rows => rows.filter((_, i) => i !== index)), attendanceCap: attendanceCap, setAttendanceCap: setAttendanceCap, efficiencyCap: efficiencyCap, setEfficiencyCap: setEfficiencyCap, strengthAt: strengthAt, setStrengthAt: setStrengthAt, weaknessBelow: weaknessBelow, setWeaknessBelow: setWeaknessBelow, thresholds: thresholds, setThresholds: setThresholds, savePolicy: savePolicy, mutate: mutate })] });
}
function lines(text) { return text.split(/\r?\n/).map(row => row.trim()).filter(Boolean); }
function SnapshotCard({ row }) {
    const data = row.data;
    return _jsxs("article", { className: "perf-snapshot", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsxs("strong", { children: [data.family ?? (row.kind === "HEALTH" ? data.deliveryType : "Score"), " \u00B7 ", data.from, " \u2013 ", data.to] }), _jsxs("p", { children: ["Policy ", data.policyId ?? "unavailable", " \u00B7 version ", data.policyVersion ?? "—"] })] }), _jsx("b", { className: data.status === "SCORED" ? "perf-status scored" : "perf-status", children: data.healthStatus ?? (data.status === "INSUFFICIENT_EVIDENCE" ? "Insufficient evidence" : data.status ?? "Published") })] }), _jsx("div", { className: "perf-score", children: data.score === null || data.score === undefined ? "No numeric score" : `${Number(data.score).toFixed(1)} / 100` }), data.previousSnapshotId && _jsxs("p", { children: ["Compared with immutable snapshot ", data.previousSnapshotId, "."] }), data.scoreChange !== null && data.scoreChange !== undefined && _jsxs("p", { children: [_jsx("strong", { children: "Change from prior result:" }), " ", data.scoreChange > 0 ? "+" : "", data.scoreChange.toFixed(1), " points"] }), data.changeExplanation?.map((item, index) => _jsx("p", { children: item }, `change-${index}`)), data.explanation?.map((item, index) => _jsx("p", { children: item }, index)), (data.missing?.length ?? 0) > 0 && _jsxs("p", { children: [_jsx("strong", { children: "Missing evidence:" }), " ", data.missing?.join(", ")] }), data.components && data.components.length > 0 && _jsx("div", { className: "perf-table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Measure" }), _jsx("th", { children: "Observed" }), _jsx("th", { children: "Normalized" }), _jsx("th", { children: "Weight" }), _jsx("th", { children: "Evidence" })] }) }), _jsx("tbody", { children: data.components.map((item, index) => _jsxs("tr", { children: [_jsx("td", { children: item.label ?? item.metric }), _jsx("td", { children: explainValue(item.raw) }), _jsx("td", { children: explainValue(item.normalized) }), _jsxs("td", { children: [item.weight, "%"] }), _jsx("td", { children: item.evidence.length ? item.evidence.map(e => `${e.description} (${e.kind} ${e.id} v${e.version})`).join("; ") : "No accessible source reference" })] }, `${item.metric}-${index}`)) })] }) }), (data.strengths?.length ?? 0) > 0 || (data.weaknesses?.length ?? 0) > 0 || (data.repeatedMistakes?.length ?? 0) > 0 || (data.improvementActions?.length ?? 0) > 0 ? _jsxs("div", { className: "perf-insights", children: [(data.strengths?.length ?? 0) > 0 && _jsxs("p", { children: [_jsx("strong", { children: "Strengths:" }), " ", data.strengths?.join("; ")] }), (data.weaknesses?.length ?? 0) > 0 && _jsxs("p", { children: [_jsx("strong", { children: "Areas to improve:" }), " ", data.weaknesses?.join("; ")] }), (data.repeatedMistakes?.length ?? 0) > 0 && _jsxs("p", { children: [_jsx("strong", { children: "Repeated patterns:" }), " ", data.repeatedMistakes?.map(item => `${item.category} (${item.reviewRoundIds.length} review rounds)`).join("; ")] }), (data.improvementActions?.length ?? 0) > 0 && _jsxs("p", { children: [_jsx("strong", { children: "Improvement actions:" }), " ", data.improvementActions?.join("; ")] })] }) : null, data.operational && _jsxs("div", { className: "perf-insights", children: [_jsx("strong", { children: "Operational facts:" }), data.operational.scheduleVarianceDays !== undefined && _jsxs("p", { children: ["Schedule variance: ", data.operational.scheduleVarianceDays === null ? "insufficient schedule evidence" : `${data.operational.scheduleVarianceDays} days`] }), (data.operational.scopeChangeImpact?.length ?? 0) > 0 && _jsxs("p", { children: ["Effective scope additions: ", data.operational.scopeChangeImpact?.map(item => `${item.addedScope ?? "Scope addition"} (${item.effectiveAt ?? "date unavailable"})`).join("; ")] }), (data.operational.workloadRisk?.length ?? 0) > 0 && _jsxs("p", { children: ["Schedule-derived capacity evidence: ", data.operational.workloadRisk?.length, " dated allocation(s) reviewed."] })] }), _jsxs("details", { children: [_jsx("summary", { children: "Snapshot, exclusions and unavailable measures" }), _jsxs("p", { children: ["Frozen snapshot ", row.id, "; created ", row.createdAt, ". Exclusions: ", JSON.stringify(data.excluded ?? [])] }), _jsxs("p", { children: ["Unavailable: ", (data.unavailable ?? []).join(", ") || "None reported"] })] })] });
}
function DelayCard({ row }) { const d = row.data; return _jsxs("article", { className: "perf-delay", children: [_jsxs("strong", { children: [String(d.cause).replaceAll("_", " "), " \u00B7 ", d.days, " days"] }), _jsxs("p", { children: [d.from, " \u2013 ", d.to, " \u00B7 ", d.summary] }), _jsxs("small", { children: ["Source: ", d.sourceKind, " ", d.sourceId, d.external ? " · Owner reviewed as external" : "", d.supersedesId ? ` · corrects ${d.supersedesId}` : ""] })] }); }
function CycleCard({ cycle, snapshots: scoreRows, self, canManage, owner, busy, mutate, ackText, setAckText, commentText, setCommentText }) {
    const [goalsText, setGoalsText] = useState("");
    const [actionsText, setActionsText] = useState("");
    const d = cycle.data;
    const eligibleScore = scoreRows.find(row => row.kind === "SCORE" && row.data.family === "EMPLOYEE" && row.data.from === d.from && row.data.to === d.to);
    useEffect(() => { setGoalsText((d.goals ?? []).join("\n")); setActionsText((d.developmentActions ?? []).join("\n")); }, [cycle]);
    return _jsxs("article", { className: "perf-cycle", children: [_jsxs("header", { children: [_jsxs("strong", { children: [d.frequency, " review \u00B7 ", d.from, " \u2013 ", d.to] }), _jsx("span", { children: d.finalizedAt ? "Finalized" : "Open" })] }), (d.goals?.length ?? 0) > 0 && _jsxs("p", { children: [_jsx("strong", { children: "Goals:" }), " ", d.goals?.join("; ")] }), (d.developmentActions?.length ?? 0) > 0 && _jsxs("p", { children: [_jsx("strong", { children: "Development actions:" }), " ", d.developmentActions?.join("; ")] }), d.comments?.map((item, index) => _jsxs("p", { children: [_jsx("strong", { children: "Manager comment:" }), " ", item.text] }, index)), d.acknowledgements?.map((item, index) => _jsxs("p", { children: [_jsx("strong", { children: "Employee acknowledgement:" }), " ", item.text] }, index)), self && _jsxs("div", { className: "perf-inline-form", children: [_jsxs("label", { children: ["Your acknowledgement", _jsx("input", { value: ackText, onChange: event => setAckText(event.target.value) })] }), _jsx("button", { className: "secondary-action", disabled: busy || !ackText.trim(), onClick: () => void mutate("CYCLE_ACKNOWLEDGE", { id: cycle.id, expectedVersion: cycle.version, text: ackText.trim() }, "employee"), children: "Acknowledge this cycle" }), _jsx("small", { children: "Acknowledgement records that you saw the cycle; it does not change your score or approve the review." })] }), canManage && d.finalizedAt == null && _jsxs("div", { className: "perf-inline-form", children: [_jsxs("label", { children: ["Manager comment", _jsx("input", { value: commentText, onChange: event => setCommentText(event.target.value) })] }), _jsxs("label", { children: ["Goals, one per line", _jsx("textarea", { value: goalsText, onChange: event => setGoalsText(event.target.value), rows: 2 })] }), _jsxs("label", { children: ["Development actions, one per line", _jsx("textarea", { value: actionsText, onChange: event => setActionsText(event.target.value), rows: 2 })] }), _jsx("button", { className: "secondary-action", disabled: busy || !commentText.trim(), onClick: () => void mutate("CYCLE_COMMENT", { id: cycle.id, expectedVersion: cycle.version, text: commentText.trim(), goals: lines(goalsText), developmentActions: lines(actionsText) }, "employee"), children: "Save review comment" }), owner && _jsxs(_Fragment, { children: [_jsxs("p", { children: ["Finalization will bind employee score snapshot ", d.scoreId ?? eligibleScore?.id ?? "unavailable", " for this exact period."] }), _jsx("button", { disabled: busy || !(d.scoreId || eligibleScore), onClick: () => void mutate("CYCLE_FINALIZE", { id: cycle.id, expectedVersion: cycle.version }, "employee"), children: "Finalize cycle" })] })] })] });
}
function PolicyEditor({ busy, context, policyFamily, setPolicyFamily, groupKey, setGroupKey, policyLabel, setPolicyLabel, effectiveFrom, setEffectiveFrom, components, compatibleMetrics, addMetric, updateComponent, removeComponent, attendanceCap, setAttendanceCap, efficiencyCap, setEfficiencyCap, strengthAt, setStrengthAt, weaknessBelow, setWeaknessBelow, thresholds, setThresholds, savePolicy, mutate }) {
    return _jsxs("details", { className: "perf-panel perf-owner", open: true, children: [_jsx("summary", { children: "Owner policy setup and approval" }), _jsx("p", { children: "Enter every formula value explicitly, review the metric catalogue and approve the draft before generating snapshots. No active defaults are supplied." }), _jsxs("div", { className: "perf-toolbar", children: [_jsxs("label", { children: ["Policy family", _jsxs("select", { "aria-label": "Policy family", value: policyFamily, onChange: event => setPolicyFamily(event.target.value), children: [_jsx("option", { value: "EMPLOYEE", children: "Employee" }), _jsx("option", { value: "LEADER", children: "Team Leader" }), _jsx("option", { value: "DESIGN", children: "Design health" }), _jsx("option", { value: "TURNKEY", children: "Turnkey health" })] })] }), policyFamily === "DESIGN" || policyFamily === "TURNKEY" ? _jsxs("p", { children: ["Project health group: ", policyFamily] }) : _jsxs("label", { children: ["Role group key", _jsx("input", { value: groupKey, onChange: event => setGroupKey(event.target.value), placeholder: "Owner-defined group key" })] }), _jsxs("label", { children: ["Label", _jsx("input", { value: policyLabel, onChange: event => setPolicyLabel(event.target.value) })] }), _jsxs("label", { children: ["Effective from", _jsx("input", { type: "date", value: effectiveFrom, onChange: event => setEffectiveFrom(event.target.value) })] })] }), _jsx("p", { children: "Employee and Team Leader groups are separately assigned. Design and Turnkey use distinct policies and thresholds." }), components.map((row, index) => _jsxs("div", { className: "perf-component", children: [_jsxs("label", { children: ["Metric", _jsx("select", { value: row.metric, onChange: event => updateComponent(index, { metric: event.target.value }), children: compatibleMetrics.map((metric) => _jsxs("option", { value: metric.key, children: [metric.label, " \u00B7 ", metric.unit] }, metric.key)) })] }), _jsxs("label", { children: ["Weight", _jsx("input", { type: "number", min: "0", max: "100", value: row.weight, onChange: event => updateComponent(index, { weight: event.target.value }) })] }), _jsxs("label", { children: ["Minimum", _jsx("input", { type: "number", value: row.min, onChange: event => updateComponent(index, { min: event.target.value }) })] }), _jsxs("label", { children: ["Maximum", _jsx("input", { type: "number", value: row.max, onChange: event => updateComponent(index, { max: event.target.value }) })] }), _jsxs("label", { children: ["Direction", _jsxs("select", { value: row.direction, onChange: event => updateComponent(index, { direction: event.target.value }), children: [_jsx("option", { value: "HIGHER", children: "Higher is better" }), _jsx("option", { value: "LOWER", children: "Lower is better" })] })] }), _jsxs("label", { className: "perf-checkbox", children: [_jsx("input", { type: "checkbox", checked: row.required, onChange: event => updateComponent(index, { required: event.target.checked }) }), " Required evidence"] }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => removeComponent(index), children: "Remove measure" }), _jsx("small", { children: compatibleMetrics.find((metric) => metric.key === row.metric)?.description })] }, `${row.metric}-${index}`)), _jsx("button", { type: "button", className: "secondary-action", disabled: !compatibleMetrics.some((metric) => !components.some((row) => row.metric === metric.key)), onClick: addMetric, children: "Add measurable source" }), _jsxs("div", { className: "perf-toolbar", children: [_jsxs("label", { children: ["Attendance maximum weight", _jsx("input", { type: "number", min: "0", max: "100", value: attendanceCap, onChange: event => setAttendanceCap(event.target.value) })] }), _jsxs("label", { children: ["Efficiency maximum weight", _jsx("input", { type: "number", min: "0", max: "100", value: efficiencyCap, onChange: event => setEfficiencyCap(event.target.value) })] }), _jsxs("label", { children: ["Strength at or above", _jsx("input", { type: "number", min: "0", max: "100", value: strengthAt, onChange: event => setStrengthAt(event.target.value) })] }), _jsxs("label", { children: ["Weakness below", _jsx("input", { type: "number", min: "0", max: "100", value: weaknessBelow, onChange: event => setWeaknessBelow(event.target.value) })] })] }), _jsxs("div", { className: "perf-toolbar", children: [_jsxs("label", { children: ["Critical below", _jsx("input", { type: "number", min: "0", max: "100", value: thresholds.criticalBelow, onChange: event => setThresholds({ ...thresholds, criticalBelow: event.target.value }) })] }), _jsxs("label", { children: ["Delayed below", _jsx("input", { type: "number", min: "0", max: "100", value: thresholds.delayedBelow, onChange: event => setThresholds({ ...thresholds, delayedBelow: event.target.value }) })] }), _jsxs("label", { children: ["At Risk below", _jsx("input", { type: "number", min: "0", max: "100", value: thresholds.atRiskBelow, onChange: event => setThresholds({ ...thresholds, atRiskBelow: event.target.value }) })] })] }), _jsx("button", { disabled: busy, onClick: savePolicy, children: "Save policy draft" }), _jsx("div", { className: "perf-policy-list", children: context.policies.filter((row) => row.kind === "POLICY").map((row) => _jsxs("article", { children: [_jsxs("strong", { children: [row.data.label, " \u00B7 ", row.data.family, "/", row.data.groupKey] }), _jsxs("span", { children: [row.state, " \u00B7 v", row.version, " \u00B7 effective ", row.data.effectiveFrom] }), row.state === "DRAFT" && _jsx("button", { className: "secondary-action", disabled: busy, onClick: () => void mutate("POLICY_APPROVE", { id: row.id, expectedVersion: row.version }, "context"), children: "Approve policy" })] }, row.id)) })] });
}
