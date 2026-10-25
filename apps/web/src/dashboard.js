import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { workDate, workState } from "./work-labels";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, useDroppable, } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./dashboard.css";
import "./dashboard-widgets.css";
import "./dashboard-data.css";
import { DashboardTaskMix, DashboardProjectOverview } from "./dashboard-data-visuals.js";
import { DashboardPanel } from "./dashboard-panel.js";
import { WIDGET_INFO, loadLayout, saveLayout, defaultLayoutFor, } from "./dashboard-widgets.js";
import { DashboardTimeWidget } from "./dashboard-time-widget.js";
import { DashboardPerformanceWidget } from "./dashboard-performance-widget.js";
const API = "/api/v1";
class DashboardReadError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
const dashboardSourceNames = ["tasks", "decisions", "health", "performance", "workload", "site", "training"];
const sourceLabels = { tasks: "Tasks and attention", decisions: "Decision center", health: "Project health and risks", performance: "Employee and Team Leader performance", workload: "Workload and leave", site: "Project site", training: "Training and improvement" };
const cmd = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
async function request(path, csrf, init = {}) {
    const headers = new Headers(init.headers);
    if (init.body) {
        headers.set("Content-Type", "application/json");
        headers.set("X-CSRF-Token", csrf);
    }
    const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new DashboardReadError(body.error?.message ?? body.message ?? `Request failed (${response.status})`, response.status);
    return body;
}
const format = (v) => v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
const dateLabel = (v) => v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v ?? "";
const dateRangeOkay = (from, to) => Boolean(from && to && from <= to);
function HealthScore({ row }) {
    const scale = row.scoreScale;
    const hasScale = scale && Number.isFinite(scale.min) && Number.isFinite(scale.max) && scale.max > scale.min;
    return _jsxs("span", { className: "dashboard-health-meter", children: ["Health score ", row.score, " \u00B7 ", hasScale ? `Scale ${scale.min}–${scale.max}` : "Scale unavailable"] });
}
/* V10 widget eligibility — computed from the live authorized source
   catalog, not from a demo capability array. A widget is permitted
   when its backing source is authorized and readable (loaded or
   intentionally empty), not when the account is hard-denied. Saved
   layout IDs are always re-checked against this catalog before use
   (V10 §I.8). */
function permittedWidgetIds(sourceData, canSeePerformance) {
    const permitted = ["time", "projects", "nextAction"];
    const d = sourceData.decisions;
    if (d && !d.denied)
        permitted.push("decisions");
    if (canSeePerformance && !sourceData.performance?.denied)
        permitted.push("performance");
    if (sourceData.site && !sourceData.site.denied)
        permitted.push("site");
    if (sourceData.workload && !sourceData.workload.denied)
        permitted.push("workload");
    if (sourceData.training && !sourceData.training.denied)
        permitted.push("training");
    if (sourceData.health && !sourceData.health.denied)
        permitted.push("health");
    if (sourceData.tasks && !sourceData.tasks.denied)
        permitted.push("signals", "shortcuts");
    return permitted;
}
/* Draggable widget wrapper: dnd-kit sortable behaviour plus the V10
   edit-mode chrome (hide, drag handle, keyboard move controls). */
function SortableWidget({ id, editing, onHide, onMoveUp, onMoveDown, onMoveAcross, canMoveUp, canMoveDown, canMoveAcross, children, }) {
    const { transform, transition, isDragging, attributes, listeners, setNodeRef, setActivatorNodeRef } = useSortable({ id, disabled: !editing });
    const style = { transform: CSS.Transform.toString(transform), transition };
    const info = WIDGET_INFO[id];
    return (_jsxs("section", { ref: setNodeRef, "data-widget-id": id, "data-widget": id, className: `dv-widget${isDragging ? " is-dragging" : ""}${editing ? " is-editing" : ""}`, style: style, children: [_jsxs("div", { className: "dv-widget-head", children: [_jsx("div", { className: "dv-widget-heading", children: _jsx("h3", { children: info?.label ?? id }) }), editing && (_jsxs("div", { className: "dv-widget-tools", children: [_jsx("button", { type: "button", className: "dv-edit-hbtn", title: "Hide widget", "aria-label": `Hide ${info?.label ?? id} widget`, onClick: () => onHide(id), children: "\u2212" }), _jsxs("button", { ref: setActivatorNodeRef, type: "button", className: "dv-drag-handle", ...attributes, "aria-label": `Drag to move ${info?.label ?? id}`, title: "Drag to rearrange", ...listeners, children: [_jsxs("span", { className: "dv-drag-dots", "aria-hidden": "true", children: [_jsx("i", {}), _jsx("i", {}), _jsx("i", {}), _jsx("i", {}), _jsx("i", {}), _jsx("i", {})] }), _jsx("span", { children: info?.label ?? id })] }), _jsx("button", { type: "button", className: "dv-edit-hbtn", title: "Move up", "aria-label": `Move ${info?.label ?? id} up`, disabled: !canMoveUp, onClick: () => onMoveUp(id), children: "\u2191" }), _jsx("button", { type: "button", className: "dv-edit-hbtn", title: "Move down", "aria-label": `Move ${info?.label ?? id} down`, disabled: !canMoveDown, onClick: () => onMoveDown(id), children: "\u2193" }), canMoveAcross && _jsx("button", { type: "button", className: "dv-edit-hbtn", title: "Move to other column", "aria-label": `Move ${info?.label ?? id} to other column`, onClick: () => onMoveAcross(id), children: "\u21C4" })] }))] }), children] }));
}
function WidgetLane({ id, droppable, children }) {
    const { setNodeRef, isOver } = useDroppable({ id, disabled: !droppable });
    return _jsx("div", { ref: setNodeRef, className: `dv-widget-col${droppable && isOver ? " is-over" : ""}`, children: children });
}
export function DashboardWorkspace({ csrfToken, accountId, owner, initialTab = "dashboard", focused = false }) {
    const [tab, setTab] = useState(initialTab);
    const [dash, setDash] = useState({ today: null, role: owner ? "Owner account" : "Staff account" });
    const [sourceData, setSourceData] = useState({});
    const [panel, setPanel] = useState(null);
    useEffect(() => { setPanel(null); }, [accountId, csrfToken]);
    const [context, setContext] = useState(null);
    const [schedules, setSchedules] = useState(null);
    const [reminders, setReminders] = useState(null);
    const [summaries, setSummaries] = useState([]);
    const [selectedSummaryId, setSelectedSummaryId] = useState("");
    const [snapshots, setSnapshots] = useState([]);
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [selectedTable, setSelectedTable] = useState(null);
    const [preview, setPreview] = useState(null);
    const [category, setCategory] = useState("");
    const [from, setFrom] = useState(today());
    const [to, setTo] = useState(today());
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [reason, setReason] = useState("");
    const [correctsId, setCorrectsId] = useState("");
    const commandRef = useRef(null);
    const sourceRequestIds = useRef(new Map());
    const [reminderTitle, setReminderTitle] = useState("");
    const [reminderDue, setReminderDue] = useState("");
    const [reminderReason, setReminderReason] = useState("");
    const [ruleKind, setRuleKind] = useState("TASK_REMINDER");
    const [ruleEnabled, setRuleEnabled] = useState(true);
    const [ruleTime, setRuleTime] = useState("");
    const [timezone, setTimezone] = useState("");
    const [audience, setAudience] = useState("SELF");
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
    const [editingRule, setEditingRule] = useState(null);
    const loadSource = useCallback(async (source) => {
        const requestId = (sourceRequestIds.current.get(source) ?? 0) + 1;
        sourceRequestIds.current.set(source, requestId);
        setSourceData(current => ({ ...current, [source]: { readCompletedAt: null, sections: [], ...(source === "decisions" ? { decisions: { items: [], nextCursor: null } } : {}), loading: true } }));
        try {
            const result = await request(`/dashboard/sources/${source}`, csrfToken);
            if (result.source !== source || !Array.isArray(result.sections) || typeof result.readCompletedAt !== "string" || typeof result.today !== "string" || source === "decisions" && !result.decisions)
                throw new Error("The source response was incomplete.");
            if (sourceRequestIds.current.get(source) !== requestId)
                return;
            setSourceData(current => ({ ...current, [source]: { readCompletedAt: result.readCompletedAt, sections: result.sections, ...(result.decisions ? { decisions: result.decisions } : {}), loading: false } }));
            setDash(current => ({ ...current, today: result.today }));
        }
        catch (cause) {
            if (sourceRequestIds.current.get(source) === requestId)
                setSourceData(current => ({ ...current, [source]: { readCompletedAt: null, sections: [], ...(source === "decisions" ? { decisions: { items: [], nextCursor: null } } : {}), loading: false, denied: cause instanceof DashboardReadError && [401, 403].includes(cause.status), error: cause instanceof Error ? cause.message : "This source could not be read." } }));
        }
    }, [csrfToken]);
    const load = useCallback(async (initial = false) => {
        if (initial)
            setLoading(true);
        setError("");
        for (const source of dashboardSourceNames)
            void loadSource(source);
        try {
            const [c, s, r, scheduled, h] = await Promise.all([
                request("/reports/context", csrfToken),
                owner ? request("/dashboard/schedules", csrfToken) : Promise.resolve({ rules: [] }), request("/dashboard/reminders", csrfToken), request("/dashboard/summaries", csrfToken),
                request("/reports/snapshots", csrfToken),
            ]);
            setContext(c);
            setSchedules(s);
            setReminders(r);
            setSummaries(scheduled.summaries);
            setSelectedSummaryId(current => current && scheduled.summaries.some(item => item.id === current) ? current : scheduled.summaries[0]?.id ?? "");
            setSnapshots(h.snapshots ?? h.items ?? []);
            setCategory(current => current || c.categories[0]?.key || "");
        }
        catch (cause) {
            setSummaries([]);
            setSelectedSummaryId("");
            setError(cause instanceof Error ? cause.message : "Dashboard supporting data could not be loaded.");
        }
        finally {
            if (initial)
                setLoading(false);
        }
    }, [csrfToken, loadSource, owner]);
    useEffect(() => { void load(true); }, [load]);
    const mutate = async (path, payload, refresh = true) => {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const signature = `${path}:${JSON.stringify(payload)}`;
            if (commandRef.current?.signature !== signature)
                commandRef.current = { signature, id: cmd() };
            await request(path, csrfToken, { method: "POST", body: JSON.stringify({ ...payload, commandId: commandRef.current.id }) });
            commandRef.current = null;
            if (refresh)
                await load();
            setNotice("Saved.");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "The action could not be completed.");
        }
        finally {
            setBusy(false);
        }
    };
    const makePreview = async () => {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const result = await request("/reports/preview", csrfToken, { method: "POST", body: JSON.stringify({ category, from, to }) });
            setPreview(result);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "The report preview could not be created.");
        }
        finally {
            setBusy(false);
        }
    };
    const saveSnapshot = async () => {
        if (!preview || !reason.trim())
            return;
        await mutate("/reports/snapshots", { category: preview.category, from: preview.from, to: preview.to, reason: reason.trim(), ...(correctsId ? { correctsId } : {}) });
        setReason("");
        setCorrectsId("");
        const history = await request("/reports/snapshots", csrfToken).catch(() => ({}));
        setSnapshots(history.snapshots ?? history.items ?? []);
    };
    const openSnapshot = async (id) => {
        setBusy(true);
        setError("");
        try {
            const result = await request(`/reports/snapshots/${encodeURIComponent(id)}`, csrfToken);
            setSelectedSnapshot(result.snapshot);
            setSelectedTable(result.table);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "The frozen report could not be loaded.");
        }
        finally {
            setBusy(false);
        }
    };
    const download = (url) => { window.location.assign(url); };
    const isOwner = owner && Boolean(context?.owner);
    const selectedSummary = summaries.find(item => item.id === selectedSummaryId) ?? null;
    const weekdayValues = weekdays.trim() ? weekdays.split(",").map(day => Number(day.trim())) : [];
    const eventNames = eventNamesText.split(",").map(name => name.trim()).filter(Boolean);
    const validEventNames = !context?.eventNames || eventNames.every(name => context.eventNames.some(item => item.key === name));
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
    const healthRows = useMemo(() => {
        const state = sourceData.health;
        if (!state || state.loading || state.error)
            return [];
        return state.sections.filter(section => !section.unavailable).flatMap(s => s.rows);
    }, [sourceData.health]);
    const tasksState = sourceData.tasks;
    const healthState = sourceData.health;
    const decisionsState = sourceData.decisions;
    const taskSectionNote = (key) => !tasksState || tasksState.loading ? "Reading task source…"
        : tasksState.error ? "Task source unavailable."
            : tasksState.sections.find(section => section.key === key)?.unavailable
                ?? (tasksState.sections.some(section => section.key === key) ? null : "This task summary is unavailable.");
    const taskSectionCount = (key) => !tasksState || tasksState.loading ? "Loading…"
        : taskSectionNote(key) ? "Unavailable" : String(tasksState.sections.find(section => section.key === key).rows.length);
    const taskAttentionRows = tasksState?.sections.find(s => s.key === "attention")?.rows ?? [];
    const kpiTiles = [
        { key: "overdue", label: "Overdue", value: taskSectionCount("overdue"), route: "/tasks", sub: "Past due and incomplete" },
        { key: "today", label: "Due today", value: taskSectionCount("today"), route: "/tasks", sub: "Committed date when present, otherwise Target" },
        { key: "priority", label: "High priority", value: taskSectionCount("priority"), route: "/tasks", sub: "High and critical priority" },
        { key: "waiting", label: "Waiting / blocked", value: taskSectionCount("waiting"), route: "/tasks", sub: "Waiting state and blockers" },
        { key: "reviews", label: "Review / corrections", value: taskSectionCount("reviews"), route: "/tasks", sub: "Task states only" },
    ];
    const kind = owner ? "OWNER" : "STAFF";
    const [perfContext, setPerfContext] = useState(null);
    const [accessRefresh, setAccessRefresh] = useState(0);
    useEffect(() => {
        let active = true;
        setPerfContext(null);
        void request("/performance/context", csrfToken)
            .then(value => { if (active && Array.isArray(value.employees))
            setPerfContext(value); }).catch(() => { if (active)
            setPerfContext(null); });
        return () => { active = false; };
    }, [csrfToken, accessRefresh]);
    const canSeePerformance = Boolean(perfContext && ((owner && perfContext.owner) || perfContext.employees.some(employee => employee.canManage && employee.id !== perfContext.employeeId)));
    const canSeeSite = Boolean(sourceData.site && !sourceData.site.denied && sourceData.site.sections.some(section => section.rows.length));
    const permitted = useMemo(() => permittedWidgetIds(sourceData, canSeePerformance), [sourceData, canSeePerformance]);
    const [mode, setMode] = useState(() => window.innerWidth <= 760 ? "mobile" : "desktop");
    useEffect(() => { const resize = () => setMode(window.innerWidth <= 760 ? "mobile" : "desktop"); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, []);
    const [layout, setLayout] = useState(() => loadLayout(accountId, kind, permitted, canSeePerformance, canSeeSite, mode));
    const [editing, setEditing] = useState(false), [galleryOpen, setGalleryOpen] = useState(false), [queueExpanded, setQueueExpanded] = useState(false);
    const [layoutNotice, setLayoutNotice] = useState("");
    const visitLayouts = useRef(new Map());
    const visitLayoutKey = `${accountId}:${mode}`;
    const longPress = useRef(null);
    useEffect(() => { setLayout(visitLayouts.current.get(visitLayoutKey) ?? loadLayout(accountId, kind, permitted, canSeePerformance, canSeeSite, mode)); }, [accountId, kind, permitted, canSeePerformance, canSeeSite, mode, visitLayoutKey]);
    const [reviewInbox, setReviewInbox] = useState(null);
    const [reviewError, setReviewError] = useState("");
    useEffect(() => {
        let active = true;
        setReviewInbox(null);
        setReviewError("");
        void request("/reviews/inbox?limit=5", csrfToken).then(value => { if (active && Array.isArray(value.items))
            setReviewInbox(value); }).catch(cause => { if (active)
            setReviewError(cause instanceof Error ? cause.message : "Review source unavailable"); });
        return () => { active = false; };
    }, [csrfToken, accessRefresh]);
    const cancelLongPress = () => { if (longPress.current)
        clearTimeout(longPress.current); longPress.current = null; };
    useEffect(() => () => { if (longPress.current)
        clearTimeout(longPress.current); }, []);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const updateLayout = (next) => {
        // Resolve the device key from the current window size (not the render-time
        // `mode` closure) so a resize between drag-end and the layout write cannot
        // persist this layout under the wrong device preset.
        const currentMode = window.innerWidth <= 760 ? "mobile" : "desktop";
        visitLayouts.current.set(`${accountId}:${currentMode}`, next);
        setLayout(next);
        setLayoutNotice(saveLayout(accountId, next, currentMode) ? "Layout saved on this device." : "Layout changed for this visit; browser storage is unavailable.");
    };
    const hideWidget = (id) => {
        const wid = id;
        updateLayout({ ...layout, hidden: [...layout.hidden, wid], leftOrder: layout.leftOrder.filter(w => w !== wid), rightOrder: layout.rightOrder.filter(w => w !== wid) });
    };
    const addWidget = (id) => {
        const wid = id;
        updateLayout({ ...layout, hidden: layout.hidden.filter(w => w !== wid), leftOrder: [...layout.leftOrder, wid] });
    };
    const resetToDefaults = () => { updateLayout(defaultLayoutFor(kind, permitted, canSeePerformance, canSeeSite, mode)); setGalleryOpen(false); };
    const moveWithin = (id, direction) => {
        const wid = id;
        const lane = layout.leftOrder.includes(wid) ? "leftOrder" : "rightOrder";
        if (direction === "across") {
            const target = lane === "leftOrder" ? "rightOrder" : "leftOrder";
            updateLayout({ ...layout, [lane]: layout[lane].filter(w => w !== wid), [target]: [...layout[target], wid] });
            return;
        }
        const current = layout[lane];
        const idx = current.indexOf(wid);
        if (idx === -1)
            return;
        updateLayout({ ...layout, [lane]: arrayMove(current, idx, direction === "up" ? idx - 1 : idx + 1) });
    };
    const visibleLeft = layout.leftOrder.filter(id => !layout.hidden.includes(id) && permitted.includes(id));
    const visibleRight = layout.rightOrder.filter(id => !layout.hidden.includes(id) && permitted.includes(id));
    const availableGallery = permitted.filter(id => !visibleLeft.includes(id) && !visibleRight.includes(id));
    /* Attention queue: one row per unique task across the overlapping
       task buckets (overdue, waiting, priority, attention, today). A
       task may appear in several buckets — intentional; rows are
       de-duplicated by task id. Show 2 initially, expandable. */
    const attentionBaseRows = useMemo(() => {
        if (!tasksState || tasksState.loading || tasksState.error)
            return [];
        const seen = new Set();
        const rows = [];
        for (const key of ["overdue", "waiting", "priority", "attention", "reviews", "today"]) {
            const section = tasksState.sections.find(s => s.key === key);
            for (const row of section?.unavailable ? [] : section?.rows ?? []) {
                if (!seen.has(row.id)) {
                    seen.add(row.id);
                    rows.push(row);
                }
            }
        }
        return rows;
    }, [tasksState]);
    const attentionRows = queueExpanded ? attentionBaseRows : attentionBaseRows.slice(0, 2);
    const queueIncomplete = Boolean(tasksState && !tasksState.loading && !tasksState.error && ["overdue", "waiting", "priority", "attention", "reviews", "today"].some(key => !tasksState.sections.some(section => section.key === key && !section.unavailable)));
    // Commit once on drop. Updating lane order during collision measurement can
    // move the collision target beneath the pointer and recursively reorder it.
    const commitDrag = (event) => {
        const from = String(event.active.id), to = event.over ? String(event.over.id) : undefined;
        if (!to || from === to)
            return;
        if (mode === "mobile" && to === "lane-right")
            return;
        const fromId = from, toId = to;
        if (to === "lane-left" || to === "lane-right") {
            const source = layout.leftOrder.includes(fromId) ? "leftOrder" : "rightOrder";
            const target = to === "lane-left" ? "leftOrder" : "rightOrder";
            if (source !== target && layout[source].includes(fromId))
                updateLayout({ ...layout, [source]: layout[source].filter(id => id !== fromId), [target]: [...layout[target], fromId] });
            return;
        }
        const fLane = visibleLeft.includes(fromId) ? "leftOrder" : "rightOrder";
        const tLane = visibleRight.includes(toId) ? "rightOrder" : "leftOrder";
        if (fLane !== tLane) {
            const fItems = [...layout[fLane]], tItems = [...layout[tLane]];
            const fi = fItems.indexOf(fromId), ti = tItems.indexOf(toId);
            if (fi === -1 || ti === -1)
                return;
            const [moved] = fItems.splice(fi, 1);
            if (!moved)
                return;
            tItems.splice(ti, 0, moved);
            updateLayout({ ...layout, [fLane]: fItems, [tLane]: tItems });
            return;
        }
        const items = [...layout[fLane]];
        const fi = items.indexOf(fromId), ti = items.indexOf(toId);
        if (fi === -1 || ti === -1)
            return;
        updateLayout({ ...layout, [fLane]: arrayMove(items, fi, ti) });
    };
    const renderSourceWidget = (source) => {
        const state = sourceData[source];
        return _jsx("div", { className: "dv-widget-body", children: !state || state.loading ? _jsxs("p", { role: "status", children: ["Reading ", sourceLabels[source].toLowerCase(), "\u2026"] }) : state.error ? _jsxs("div", { className: "dv-source-error", role: "alert", children: [_jsx("strong", { children: state.error }), _jsxs("button", { type: "button", onClick: () => void loadSource(source), children: ["Retry ", sourceLabels[source].toLowerCase()] })] }) : _jsxs(_Fragment, { children: [state.sections.map(section => _jsxs("div", { children: [_jsx("h4", { children: section.label }), section.unavailable ? _jsx("p", { children: section.unavailable }) : section.rows.length ? section.rows.slice(0, 5).map(row => _jsx("div", { className: "dv-site-row", children: _jsxs("div", { className: "dv-site-main", children: [_jsx("strong", { children: row.label }), _jsx("small", { children: [row.status, row.date, row.value].filter(v => v !== undefined && v !== null).join(" · ") }), typeof row.score === "number" && Number.isFinite(row.score) && _jsx(HealthScore, { row: row }), _jsx("button", { type: "button", "aria-haspopup": "dialog", onClick: () => setPanel({ source, sectionKey: section.key, rowId: row.id, title: row.label }), children: "View details \u2192" })] }) }, row.id)) : _jsx("p", { children: "No current items." })] }, section.key)), !state.sections.length && _jsx("p", { children: "No current items." }), _jsxs("div", { className: "dv-widget-foot", children: [_jsx("button", { type: "button", "aria-haspopup": "dialog", onClick: () => setPanel({ source, title: sourceLabels[source] }), children: "View all details" }), "Read at ", state.readCompletedAt ? new Date(state.readCompletedAt).toLocaleString() : "Unavailable"] })] }) });
    };
    const renderWidget = (id) => {
        switch (id) {
            case "time": return _jsx(DashboardTimeWidget, { csrfToken: csrfToken, refreshVersion: accessRefresh });
            case "decisions":
                return (_jsx("div", { className: "dv-widget-body", children: decisionsState?.loading ? _jsx("div", { className: "dv-source-loading", children: "Reading decisions\u2026" })
                        : decisionsState?.error ? _jsxs("div", { className: "dv-source-error", children: [_jsx("strong", { children: "Decision source unavailable" }), _jsx("button", { type: "button", onClick: () => void loadSource("decisions"), children: "Retry" })] })
                            : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dv-decisions-summary", children: [_jsxs("div", { className: "dv-decisions-chip", children: [_jsx("strong", { children: (sourceData.decisions?.decisions?.items ?? []).length }), _jsx("span", { className: "dv-decisions-chip-label", children: "Approval requests" })] }), _jsxs("div", { className: "dv-decisions-chip review", children: [_jsx("strong", { children: taskSectionCount("reviews") }), _jsx("span", { className: "dv-decisions-chip-label", children: "Task reviews" })] })] }), _jsx("div", { className: "dv-decisions-section-label", children: "Approval obligations" }), (sourceData.decisions?.decisions?.items ?? []).slice(0, 3).map((item, i) => {
                                        const row = typeof item === "object" && item !== null ? item : {};
                                        return (_jsxs("button", { type: "button", "aria-haspopup": "dialog", onClick: () => { const tf = row.title ?? row.label; setPanel(tf !== undefined ? { source: "decisions", title: String(tf), taskFilter: String(tf) } : { source: "decisions", title: "Decision" }); }, className: "dv-attention-row", children: [_jsx("span", { className: "dv-attention-stripe default", "aria-hidden": "true" }), _jsxs("div", { className: "dv-attention-main", children: [_jsx("div", { className: "dv-attention-title", children: String(row.title ?? row.label ?? "Decision") }), _jsx("div", { className: "dv-attention-meta", children: [row.requesterLabel, row.levelLabel].filter(Boolean).join(" · ") })] })] }, String(row.id ?? i)));
                                    }), (sourceData.decisions?.decisions?.items ?? []).length === 0 && _jsx("div", { className: "dv-source-loading", children: "No approval obligations in this source." }), reviewInbox ? (_jsxs("div", { className: "dv-review-rounds", children: [_jsxs("div", { className: "dv-review-rounds-head", children: [_jsx("strong", { children: "Assigned review rounds" }), _jsxs("span", { children: [reviewInbox.total, " total"] })] }), reviewInbox.items.length > 0 ? reviewInbox.items.map(round => (_jsxs("button", { type: "button", "aria-haspopup": "dialog", onClick: () => setPanel({ source: "reviews", rowId: round.taskId, title: round.taskTitle, taskFilter: round.taskId }), className: "dv-attention-row", children: [_jsx("span", { className: "dv-attention-stripe review", "aria-hidden": "true" }), _jsxs("div", { className: "dv-attention-main", children: [_jsxs("div", { className: "dv-attention-title", children: [round.taskTitle, round.revisionLabel ? ` · ${round.revisionLabel}` : ""] }), _jsx("div", { className: "dv-attention-meta", children: [round.projectTitle, `Round ${round.roundNumber}`, workState(round.status), round.dueDate ? workDate(round.dueDate) : ""].filter(Boolean).join(" · ") })] })] }, round.roundId))) : _jsx("div", { className: "dv-source-loading", children: "No assigned review rounds in the authorized review source." })] })) : _jsxs("div", { className: "dv-review-rounds", children: [_jsx("div", { className: "dv-review-rounds-head", children: _jsx("strong", { children: "Assigned review rounds" }) }), _jsxs("div", { className: "dv-source-loading", children: [reviewError || "Reading review source…", _jsx("button", { type: "button", onClick: () => setAccessRefresh(value => value + 1), children: "Retry reviews" })] })] })] })) }));
            case "projects":
                return (_jsx("div", { className: "dv-widget-body", children: !healthState || healthState.loading ? _jsx("div", { className: "dv-source-loading", children: "Reading projects\u2026" })
                        : healthState?.error ? _jsxs("div", { className: "dv-source-error", children: [_jsx("strong", { children: "Project source unavailable" }), _jsx("button", { type: "button", onClick: () => void loadSource("health"), children: "Retry" })] })
                            : (_jsxs(_Fragment, { children: [_jsx(DashboardProjectOverview, { available: healthState.sections.some(section => section.key === "health" && !section.unavailable), rows: healthRows }), _jsxs("div", { className: "dv-projects-grid", children: [healthRows.slice(0, 4).map(row => (_jsxs("button", { type: "button", "aria-haspopup": "dialog", onClick: () => setPanel({ source: "health", rowId: row.id, title: row.label }), className: "dv-project-card", children: [_jsxs("div", { className: "dv-project-top", children: [_jsx("span", { className: "dv-project-name", children: row.label }), typeof row.score === "number" && Number.isFinite(row.score)
                                                                ? _jsx("span", { className: "dv-project-signal other", children: row.status ?? "Recorded score" })
                                                                : _jsx("span", { className: "dv-project-signal other", children: row.status === "UNAVAILABLE" ? "Evidence needed" : row.status?.replace(/_/g, " ") ?? "Unrated" })] }), _jsx("div", { className: "dv-project-meta", children: [row.status, row.value].filter(v => v && v !== "—").join(" · ") }), typeof row.score === "number" && Number.isFinite(row.score) && _jsx(HealthScore, { row: row }), _jsx("span", { className: "dv-project-link", children: "View details \u2192" })] }, row.id))), healthState?.sections.filter(section => section.unavailable).map(section => _jsx("p", { children: section.unavailable }, section.key)), healthRows.length === 0 && !healthState?.sections.some(section => section.unavailable) && _jsx("div", { className: "dv-source-loading", children: "No authorized project snapshots yet." })] })] })) }));
            case "performance": return perfContext && canSeePerformance ? _jsx(DashboardPerformanceWidget, { context: perfContext, csrfToken: csrfToken, owner: owner }) : null;
            case "nextAction":
                return (_jsx("div", { className: "dv-widget-body", children: !tasksState || tasksState.loading ? _jsx("p", { role: "status", children: "Reading task source\u2026" }) : taskSectionNote("attention") ? _jsxs("div", { className: "dv-source-error", role: "alert", children: [_jsx("strong", { children: taskSectionNote("attention") }), _jsx("button", { type: "button", onClick: () => void loadSource("tasks"), children: "Retry tasks" })] }) : taskAttentionRows[0] ? (_jsxs("button", { type: "button", "aria-haspopup": "dialog", onClick: () => setPanel({ source: "tasks", sectionKey: "attention", rowId: taskAttentionRows[0].id, title: taskAttentionRows[0].label }), className: "dv-nextaction", children: [_jsx("div", { className: "dv-nextaction-icon", "aria-hidden": "true", children: "\u2192" }), _jsxs("div", { className: "dv-nextaction-main", children: [_jsx("div", { className: "dv-nextaction-title", children: taskAttentionRows[0].label }), _jsx("div", { className: "dv-nextaction-meta", children: [taskAttentionRows[0].status, taskAttentionRows[0].date].filter(Boolean).join(" · ") })] })] })) : _jsx("div", { className: "dv-source-loading", children: "No next action in the authorized task source." }) }));
            case "site": return renderSourceWidget("site");
            case "workload": return renderSourceWidget("workload");
            case "training": return renderSourceWidget("training");
            case "health": return renderSourceWidget("health");
            case "signals": return renderSourceWidget("tasks");
            case "shortcuts": return _jsxs("div", { className: "dv-widget-body", children: [_jsx(Link, { to: "/my-work", children: "My Work" }), " \u00B7 ", _jsx(Link, { to: "/projects", children: "Projects" }), " \u00B7 ", _jsx(Link, { to: "/decisions", children: "Decisions" })] });
            default:
                return null;
        }
    };
    return _jsxs("section", { className: "identity-section dashboard-workspace", "aria-labelledby": "dashboard-heading", children: [panel && (() => {
                const state = sourceData[panel.source];
                let sections = (state?.sections ?? []).filter(section => !panel.sectionKey || section.key === panel.sectionKey)
                    .map(section => ({ ...section, rows: panel.taskFilter === "__all_attention__" ? section.rows : panel.taskFilter ? section.rows.filter(row => row.label.toLowerCase().includes(panel.taskFilter.toLowerCase()) || row.id.toLowerCase() === panel.taskFilter.toLowerCase()) : panel.rowId ? section.rows.filter(row => row.id === panel.rowId) : section.rows }))
                    .filter(section => !panel.rowId || section.rows.length > 0 || Boolean(panel.sectionKey && section.unavailable));
                if (panel.rowId && !panel.sectionKey)
                    sections = sections.slice(0, 1);
                return _jsx(DashboardPanel, { title: panel.rowId ? "Item details" : panel.title, sections: sections, loading: !state || state.loading, error: state?.error ?? (panel.sectionKey && !state?.loading && !sections.length ? "This summary is unavailable in the current source." : undefined), readAt: state?.readCompletedAt ?? null, dateLabel: panel.source === "tasks" ? "Due" : "Date", onRetry: () => void loadSource(panel.source), onClose: () => setPanel(null), primaryAction: panel.taskFilter === "__all_attention__" ? _jsx(Link, { to: "/tasks", onClick: () => setPanel(null), children: "Open Tasks workspace \u2192" }) : undefined }, `${panel.source}:${panel.sectionKey ?? ""}:${panel.rowId ?? ""}`);
            })(), _jsxs("div", { className: "dashboard-heading", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: initialTab === "reports" ? "INSIGHTS" : "WORKSPACE OVERVIEW" }), _jsx("h1", { id: "dashboard-heading", children: initialTab === "reports" ? "Reports" : "Dashboard" }), _jsx("p", { children: initialTab === "reports" ? "Preview current report data or open a saved report." : "A current view of decisions, tasks and project updates available to your account." })] }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => { void load(true); setAccessRefresh(value => value + 1); }, disabled: busy, children: "Refresh" })] }), !focused && _jsx("nav", { className: "dashboard-tabs", "aria-label": "Dashboard sections", children: [['dashboard', 'Overview'], ['summaries', 'Scheduled summaries'], ['reports', 'Reports'], ['schedules', 'Reminders & schedules']].map(([key, label]) => _jsx("button", { type: "button", "aria-pressed": tab === key, onClick: () => setTab(key), children: label }, key)) }), error && _jsxs("p", { className: "auth-error", role: "alert", children: [error, " ", _jsx("button", { type: "button", className: "secondary-action", onClick: () => void load(true), children: "Retry supporting data" })] }), notice && _jsx("p", { className: "notice", role: "status", children: notice }), loading && tab !== "dashboard" && _jsx("p", { role: "status", children: "Loading reports, summaries, reminders, and schedules\u2026" }), tab === "dashboard" && _jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard-summary", "aria-label": "Dashboard source context", children: [_jsxs("span", { children: [_jsx("small", { children: "Organization date" }), _jsx("strong", { children: organizationDateLabel })] }), _jsxs("span", { children: [_jsx("small", { children: "Account type" }), _jsx("strong", { children: dash.role })] })] }), _jsx("div", { className: "dv-section-heading", children: _jsx("h3", { children: "Today at a glance" }) }), _jsx("div", { className: "dv-summary-strip", "aria-label": "Five independent task summaries; counts overlap and must not be summed", children: kpiTiles.map(tile => {
                            const loading = !tasksState || tasksState.loading;
                            const unavailable = tile.value === "Unavailable";
                            return (_jsxs("button", { type: "button", onClick: () => setPanel({ source: "tasks", sectionKey: tile.key, title: tile.label }), "aria-haspopup": "dialog", className: `dv-summary-card dv-summary-${tile.key}${loading ? " is-loading" : ""}`, "data-summary": tile.label.toLowerCase().replace(/\s+/g, "-"), "aria-label": `${tile.label} · ${loading ? "source loading" : unavailable ? "source unavailable" : tile.value + " matching tasks"}`, "aria-describedby": !loading && !unavailable ? `dashboard-task-mix-${tile.key}` : undefined, children: [_jsx("div", { className: "dv-summary-top", children: _jsx("strong", { children: tile.label }) }), loading
                                        ? _jsxs(_Fragment, { children: [_jsx("div", { className: "dv-summary-skeleton" }), _jsx("div", { className: "dv-summary-cue", children: "Loading\u2026" })] })
                                        : unavailable
                                            ? _jsx("div", { className: "dv-summary-unavailable", children: "Unavailable" })
                                            : _jsxs(_Fragment, { children: [_jsx("div", { className: "dv-summary-count", "data-summary": tile.label.toLowerCase().replace(/\s+/g, "-"), children: tile.value }), _jsx("div", { className: "dv-summary-cue", children: tile.sub })] }), !loading && !unavailable && _jsx(DashboardTaskMix, { descriptionId: `dashboard-task-mix-${tile.key}`, rows: tasksState?.sections.find(section => section.key === tile.key)?.rows ?? [] }), _jsx("span", { className: "dv-summary-arrow", "aria-hidden": "true", children: "\u2192" })] }, tile.label));
                        }) }), _jsxs("div", { className: "dv-summary-freshness", children: [_jsxs("span", { children: [tasksState?.readCompletedAt ? `Task source read at ${new Date(tasksState.readCompletedAt).toLocaleString()}` : "Task summaries have not been read.", " Counts overlap."] }), tasksState && !tasksState.loading && (tasksState.error || kpiTiles.some(tile => tile.value === "Unavailable")) && _jsx("button", { type: "button", onClick: () => void loadSource("tasks"), children: "Retry task summaries" })] }), _jsx("div", { className: "dv-essentials-heading", children: _jsx("button", { type: "button", className: "secondary-action", onClick: () => setEditing(true), children: "Edit widgets" }) }), layoutNotice && _jsx("p", { role: "status", children: layoutNotice }), _jsx(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragEnd: commitDrag, children: _jsxs("div", { className: `dv-widget-grid${editing ? " is-editing" : ""}`, onPointerDown: event => { if (event.pointerType === "touch" && !editing && !event.target.closest("button, input, select, textarea, a"))
                                longPress.current = setTimeout(() => setEditing(true), 600); }, onPointerUp: cancelLongPress, onPointerCancel: cancelLongPress, onPointerMove: cancelLongPress, children: [_jsxs(WidgetLane, { id: "lane-left", droppable: true, children: [editing && (_jsxs("div", { className: "dv-edit-toolbar", children: [_jsxs("p", { children: [_jsx("strong", { children: "Customize widgets." }), " Drag to reposition, hide optional widgets, or add from the gallery. Top summary cards and the bottom Attention Queue stay fixed."] }), _jsxs("div", { className: "dv-edit-actions", children: [_jsx("button", { type: "button", onClick: () => setGalleryOpen(previous => !previous), children: galleryOpen ? "Hide gallery" : "Add widgets" }), _jsx("button", { type: "button", onClick: resetToDefaults, children: "Reset layout" }), _jsx("button", { type: "button", className: "primary", onClick: () => { setEditing(false); setGalleryOpen(false); }, children: "Done" })] })] })), _jsx(SortableContext, { items: visibleLeft, children: visibleLeft.map(id => (_jsx(SortableWidget, { id: id, editing: editing, onHide: hideWidget, onMoveUp: wid => moveWithin(wid, "up"), onMoveDown: wid => moveWithin(wid, "down"), onMoveAcross: wid => moveWithin(wid, "across"), canMoveUp: visibleLeft.indexOf(id) > 0, canMoveDown: visibleLeft.indexOf(id) < visibleLeft.length - 1, canMoveAcross: mode === "desktop", children: renderWidget(id) }, id))) }), editing && galleryOpen && availableGallery.length > 0 && (_jsxs("div", { className: "dv-widget-gallery", role: "region", "aria-label": "Add widgets", children: [_jsxs("h4", { children: ["Add widgets (", availableGallery.length, " available)"] }), _jsx("div", { className: "dv-gallery-grid", children: availableGallery.map(id => (_jsxs("button", { type: "button", className: "dv-gallery-item", onClick: () => addWidget(id), children: [_jsxs("div", { children: [_jsx("strong", { children: WIDGET_INFO[id]?.label ?? id }), _jsx("small", { children: WIDGET_INFO[id]?.desc ?? "" })] }), _jsx("span", { className: "dv-gallery-add", children: "+ Add" })] }, id))) })] }))] }), _jsx(WidgetLane, { id: "lane-right", droppable: mode === "desktop", children: _jsx(SortableContext, { items: visibleRight, children: visibleRight.map(id => (_jsx(SortableWidget, { id: id, editing: editing, onHide: hideWidget, onMoveUp: wid => moveWithin(wid, "up"), onMoveDown: wid => moveWithin(wid, "down"), onMoveAcross: wid => moveWithin(wid, "across"), canMoveUp: visibleRight.indexOf(id) > 0, canMoveDown: visibleRight.indexOf(id) < visibleRight.length - 1, canMoveAcross: mode === "desktop", children: renderWidget(id) }, id))) }) })] }) }), _jsxs("section", { className: "dv-attention-queue", "aria-label": "Attention queue \u2014 fixed, not movable", children: [_jsxs("div", { className: "dv-attention-head", children: [_jsxs("div", { children: [_jsx("h3", { children: "Attention queue" }), _jsx("p", { children: "Authorized task preview \u00B7 one row per task, even with multiple reasons" })] }), _jsx("span", { className: "dv-attention-locked", "aria-hidden": "true", children: "Fixed" })] }), queueIncomplete && _jsxs("div", { className: "dv-source-error", role: "status", children: [_jsx("strong", { children: "Some task sections are unavailable. This preview may be incomplete." }), _jsx("button", { type: "button", onClick: () => void loadSource("tasks"), children: "Retry attention source" })] }), _jsx("div", { className: "dv-attention-body", children: !tasksState || tasksState.loading ? (_jsx("div", { className: "dv-source-loading", children: "Reading attention items\u2026" })) : tasksState.error ? (_jsxs("div", { className: "dv-source-error", children: [_jsx("strong", { children: "Task source unavailable." }), _jsx("button", { type: "button", onClick: () => void loadSource("tasks"), children: "Retry" })] })) : attentionRows.length > 0 ? attentionRows.map(row => (_jsxs("button", { type: "button", "aria-haspopup": "dialog", onClick: () => setPanel({ source: "tasks", rowId: row.id, title: row.label }), className: "dv-attention-row", children: [_jsx("span", { className: `dv-attention-stripe ${row.status?.includes("WAITING") ? "waiting" : row.date && dash.today && row.date < dash.today ? "overdue" : "default"}`, "aria-hidden": "true" }), _jsxs("div", { className: "dv-attention-main", children: [_jsx("div", { className: "dv-attention-title", children: row.label }), _jsx("div", { className: "dv-attention-meta", children: [row.status, row.date].filter(Boolean).join(" · ") })] }), _jsxs("div", { className: "dv-attention-right", children: [_jsx("span", { className: `dv-attention-due${row.date && dash.today && row.date < dash.today ? " overdue" : ""}`, children: row.date ? workDate(row.date) : "" }), _jsx("span", { className: `dv-attention-chip ${row.status?.includes("WAITING") ? "waiting" : ""}`, children: row.status ? workState(row.status) : "" })] })] }, row.id))) : (_jsx("div", { className: "dv-source-loading", children: queueIncomplete ? "No complete task preview is available." : "No tasks in this scope." })) }), attentionBaseRows.length > 2 && (_jsxs("div", { className: "dv-attention-foot", children: [_jsxs("span", { children: ["Read at ", tasksState?.readCompletedAt ? new Date(tasksState.readCompletedAt).toLocaleString() : "—", " \u00B7 ", attentionBaseRows.length, " tasks"] }), _jsxs("div", { className: "dv-attention-actions", children: [_jsx("button", { type: "button", onClick: () => setQueueExpanded(previous => !previous), children: queueExpanded ? "Show less" : `Show more · ${attentionBaseRows.length - 2} tasks` }), _jsx("button", { type: "button", onClick: () => setPanel({ source: "tasks", title: "All attention tasks", taskFilter: "__all_attention__" }), children: "Open all tasks \u2192" })] })] }))] })] }), tab === "summaries" && !loading && _jsxs("div", { className: "dashboard-report-layout", children: [_jsxs("article", { className: "dashboard-panel", children: [_jsx("h3", { children: "Scheduled summaries" }), _jsx("p", { children: "Only summaries available under your current source access appear here." }), summaries.length === 0 ? _jsx("p", { className: "identity-note", role: "status", children: "No generated summaries are available." }) : _jsx("ul", { children: summaries.map(item => _jsxs("li", { "data-summary-id": item.id, children: [_jsxs("div", { children: [_jsxs("strong", { children: [item.summary.kind, " summary"] }), _jsxs("small", { children: [item.summary.from ?? "", item.summary.from ? " — " : "", item.summary.to ?? "", " \u00B7 ", new Date(item.summary.generatedAt || item.createdAt).toLocaleString()] })] }), _jsx("button", { type: "button", className: "secondary-action", "aria-pressed": selectedSummaryId === item.id, onClick: () => setSelectedSummaryId(item.id), children: selectedSummaryId === item.id ? "Selected" : "View summary" })] }, item.id)) })] }), selectedSummary && _jsxs("article", { className: "dashboard-panel", "aria-labelledby": "scheduled-summary-heading", children: [_jsx("div", { className: "eyebrow", children: "SCHEDULED SUMMARY" }), _jsxs("h3", { id: "scheduled-summary-heading", children: [selectedSummary.summary.kind, selectedSummary.summary.from ? ` · ${selectedSummary.summary.from}` : "", selectedSummary.summary.to && selectedSummary.summary.to !== selectedSummary.summary.from ? ` — ${selectedSummary.summary.to}` : ""] }), _jsxs("p", { children: ["Generated ", new Date(selectedSummary.summary.generatedAt || selectedSummary.createdAt).toLocaleString()] }), _jsx("div", { className: "dashboard-sections", children: selectedSummary.summary.sections.map(section => _jsxs("article", { className: "dashboard-panel", children: [_jsx("h3", { children: section.label }), section.unavailable && _jsx("p", { className: "dashboard-unavailable", children: section.unavailable }), section.rows.length ? _jsx("ul", { children: section.rows.map((row, index) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: row.label }), _jsx("small", { children: [row.status, row.date].filter(Boolean).join(" · ") })] }), _jsx("span", { children: format(row.value) })] }, row.id ?? `${section.key}-${index}`)) }) : !section.unavailable && _jsx("p", { className: "identity-note", children: "No factual items for this section." })] }, section.key)) })] })] }), tab === "reports" && !loading && _jsxs("div", { className: "dashboard-report-layout", children: [_jsxs("article", { className: "dashboard-panel", children: [_jsx("h3", { children: "Build report preview" }), _jsx("p", { children: "Preview source records that your account is currently permitted to read." }), _jsxs("div", { className: "dashboard-form-grid", children: [_jsxs("label", { children: ["Report category", _jsxs("select", { value: category, onChange: e => setCategory(e.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose category" }), (context?.categories ?? []).map(item => _jsx("option", { value: item.key, children: item.label }, item.key))] })] }), _jsxs("label", { children: ["From", _jsx("input", { type: "date", value: from, onChange: e => setFrom(e.target.value), required: true })] }), _jsxs("label", { children: ["To", _jsx("input", { type: "date", value: to, onChange: e => setTo(e.target.value), required: true })] })] }), _jsx("button", { type: "button", disabled: busy || !category || !dateRangeOkay(from, to), onClick: () => void makePreview(), children: "Preview report" }), preview && _jsxs("div", { className: "dashboard-preview", children: [_jsxs("div", { className: "dashboard-heading", children: [_jsxs("div", { children: [_jsx("h4", { children: preview.title }), _jsxs("small", { children: [dateLabel(preview.from), " \u2014 ", dateLabel(preview.to), " \u00B7 Generated ", new Date(preview.generatedAt).toLocaleString()] })] }), _jsx("div", { className: "dashboard-export-actions", children: ["csv", "xlsx", "pdf", "print"].map(fmt => _jsx("button", { type: "button", className: "secondary-action", onClick: () => download(`/api/v1/reports/export?category=${encodeURIComponent(preview.category)}&from=${encodeURIComponent(preview.from)}&to=${encodeURIComponent(preview.to)}&format=${fmt}`), children: fmt === "xlsx" ? "Excel" : fmt.toUpperCase() }, fmt)) })] }), preview.unavailable.length > 0 && _jsx("ul", { className: "dashboard-unavailable", children: preview.unavailable.map((value, i) => _jsx("li", { children: value }, i)) }), preview.rows.length === 0 ? _jsx("p", { className: "identity-note", children: "No permitted source rows are available for this period." }) : _jsx("div", { className: "dashboard-table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: preview.columns.map(column => _jsx("th", { children: column.label }, column.key)) }) }), _jsx("tbody", { children: preview.rows.map((row, i) => _jsx("tr", { children: preview.columns.map(column => _jsx("td", { children: format(row[column.key]) }, column.key)) }, `${String(row.sourceId ?? row.id ?? "report-row")}:${String(row.field ?? row.key ?? "")}:${i}`)) })] }) }), isOwner && _jsxs("div", { className: "dashboard-freeze", children: [_jsxs("label", { children: ["Reason for frozen report (required)", _jsx("textarea", { value: reason, onChange: e => setReason(e.target.value), minLength: 3, maxLength: 1000 })] }), _jsxs("label", { children: ["Correct an earlier snapshot (optional)", _jsxs("select", { value: correctsId, onChange: e => setCorrectsId(e.target.value), children: [_jsx("option", { value: "", children: "New frozen report" }), snapshots.filter(s => s.category === preview.category).map(s => _jsxs("option", { value: s.id, children: [s.title ?? `${s.category} ${s.from ?? ""}–${s.to ?? ""}`, " \u00B7 ", s.id.slice(0, 8)] }, s.id))] })] }), _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => void saveSnapshot(), children: correctsId ? "Freeze correction" : "Freeze report" })] })] })] }), _jsxs("article", { className: "dashboard-panel", children: [_jsx("h3", { children: "Frozen report history" }), snapshots.length === 0 ? _jsx("p", { className: "identity-note", children: "No frozen reports yet." }) : _jsx("ul", { children: snapshots.map(snapshot => _jsxs("li", { "data-snapshot-id": snapshot.id, children: [_jsxs("div", { children: [_jsx("strong", { children: snapshot.title ?? snapshot.category ?? "Frozen report" }), _jsxs("small", { children: [dateLabel(snapshot.from), " ", snapshot.from ? "—" : "", " ", dateLabel(snapshot.to), " \u00B7 ", snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString() : snapshot.id] })] }), _jsxs("div", { className: "dashboard-export-actions", children: [_jsx("button", { className: "secondary-action", type: "button", onClick: () => void openSnapshot(snapshot.id), disabled: busy, children: "Read" }), ["csv", "xlsx", "pdf", "print"].map(fmt => _jsx("button", { className: "secondary-action", type: "button", onClick: () => download(`/api/v1/reports/snapshots/${encodeURIComponent(snapshot.id)}/export?format=${fmt}`), children: fmt === "xlsx" ? "Excel" : fmt.toUpperCase() }, fmt))] })] }, snapshot.id)) }), selectedSnapshot && _jsxs("div", { className: "dashboard-snapshot", children: [_jsx("h4", { children: selectedSnapshot.title ?? selectedTable?.title ?? "Frozen report" }), selectedTable ? _jsxs(_Fragment, { children: [_jsx("div", { className: "dashboard-table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: selectedTable.columns.map(column => _jsx("th", { children: column.label }, column.key)) }) }), _jsx("tbody", { children: selectedTable.rows.map((row, i) => _jsx("tr", { children: selectedTable.columns.map(column => _jsx("td", { children: format(row[column.key]) }, column.key)) }, `${String(row.sourceId ?? row.id ?? "report-row")}:${String(row.field ?? row.key ?? "")}:${i}`)) })] }) }), _jsxs("pre", { children: ["Reason: ", selectedSnapshot.reason ?? "—", selectedSnapshot.correctsId ? `\nCorrects snapshot: ${selectedSnapshot.correctsId}` : ""] })] }) : _jsx("p", { role: "status", children: "Loading frozen report\u2026" })] })] })] }), tab === "schedules" && !loading && _jsxs("div", { className: "dashboard-report-layout", children: [_jsxs("article", { className: "dashboard-panel", children: [_jsx("h3", { children: "Personal reminder" }), _jsx("p", { children: "Reminders stay private to the employee who creates them." }), _jsxs("div", { className: "dashboard-form-grid", children: [_jsxs("label", { children: ["Reminder title", _jsx("input", { value: reminderTitle, onChange: e => setReminderTitle(e.target.value), maxLength: 160, required: true })] }), _jsxs("label", { children: ["Due date and time", _jsx("input", { type: "datetime-local", value: reminderDue, onChange: e => setReminderDue(e.target.value), required: true })] }), _jsxs("label", { className: "dashboard-span", children: ["Reason", _jsx("textarea", { value: reminderReason, onChange: e => setReminderReason(e.target.value), minLength: 3, maxLength: 1000, required: true })] })] }), _jsx("button", { type: "button", disabled: busy || !reminderTitle.trim() || !reminderDue || reminderReason.trim().length < 3, onClick: () => void mutate("/dashboard/reminders", { title: reminderTitle.trim(), dueAt: new Date(reminderDue).toISOString(), reason: reminderReason.trim() }).then(() => { setReminderTitle(""); setReminderDue(""); setReminderReason(""); }), children: "Save reminder" }), _jsx("h4", { children: "Your reminders" }), !reminders?.reminders.length ? _jsx("p", { className: "identity-note", children: "No reminders yet." }) : _jsx("ul", { children: reminders.reminders.map((item, i) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: format(item.title) }), _jsx("small", { children: item.dueAt ? new Date(item.dueAt).toLocaleString() : "" })] }), _jsx("span", { children: format(item.reason) })] }, String(item.id ?? i))) })] }), _jsxs("article", { className: "dashboard-panel", children: [_jsx("h3", { children: isOwner ? "Organization schedules" : "Schedule rules" }), _jsx("p", { children: "Set explicit times and audiences. No numeric work policy is prefilled or implied." }), schedules?.rules.length ? _jsx("ul", { children: schedules.rules.map((item, i) => _jsxs("li", { "data-schedule-id": String(item.id ?? ""), children: [_jsxs("div", { children: [_jsx("strong", { children: format(item.kind ?? "Schedule") }), _jsxs("small", { children: [format(item.localTime), " \u00B7 ", format(item.timezone), " \u00B7 ", format(item.audience)] })] }), _jsx("span", { children: item.enabled ? "Enabled" : "Disabled" }), isOwner && item.id && _jsx("button", { className: "secondary-action", type: "button", onClick: () => { setEditingRule({ id: item.id, version: typeof item.version === "number" ? item.version : 1 }); setRuleKind(item.kind === "SUMMARY" || item.kind === "EVENT_NOTICE" ? item.kind : "TASK_REMINDER"); setRuleEnabled(Boolean(item.enabled)); setRuleTime(typeof item.localTime === "string" ? item.localTime : ""); setTimezone(typeof item.timezone === "string" ? item.timezone : ""); setAudience(item.audience === "OWNER" || item.audience === "EMPLOYEE" || item.audience === "MANAGER" ? item.audience : "SELF"); setSummaryKind(typeof item.summaryKind === "string" ? item.summaryKind : "MORNING"); setWeekdays(Array.isArray(item.weekdays) ? item.weekdays.join(", ") : ""); setDayOfMonth(typeof item.dayOfMonth === "number" ? String(item.dayOfMonth) : ""); setOffsetDays(typeof item.offsetDays === "number" ? String(item.offsetDays) : ""); setPriority(typeof item.priority === "string" ? item.priority : ""); setProjectId(typeof item.projectId === "string" ? item.projectId : ""); setEventNamesText(Array.isArray(item.eventNames) ? item.eventNames.join(", ") : ""); setCritical(Boolean(item.critical)); setMandatory(Boolean(item.mandatory)); setRuleReason(""); }, children: "Edit" })] }, String(item.id ?? i))) }) : _jsx("p", { className: "identity-note", children: isOwner ? "No organization schedules configured." : "Organization schedules are managed by the Owner." }), isOwner && _jsxs("div", { className: "dashboard-freeze", children: [_jsx("h4", { children: editingRule ? "Edit schedule rule" : "Add schedule rule" }), _jsxs("div", { className: "dashboard-form-grid", children: [_jsxs("label", { children: ["Rule kind", _jsxs("select", { value: ruleKind, onChange: e => { setRuleKind(e.target.value); setSummaryKind("MORNING"); setWeekdays(""); setDayOfMonth(""); setOffsetDays(""); setPriority(""); setProjectId(""); setEventNamesText(""); }, children: [_jsx("option", { value: "TASK_REMINDER", children: "Task reminder" }), _jsx("option", { value: "SUMMARY", children: "Summary" }), _jsx("option", { value: "EVENT_NOTICE", children: "Event notice" })] })] }), _jsxs("label", { children: ["Local time", _jsx("input", { type: "time", value: ruleTime, onChange: e => setRuleTime(e.target.value), required: true })] }), _jsxs("label", { children: ["Timezone", _jsx("input", { value: timezone, onChange: e => setTimezone(e.target.value), required: true, placeholder: "e.g. Asia/Kolkata" })] }), _jsxs("label", { children: ["Audience", _jsxs("select", { value: audience, onChange: e => setAudience(e.target.value), children: [_jsx("option", { value: "SELF", children: "Self" }), _jsx("option", { value: "OWNER", children: "Owner" }), _jsx("option", { value: "EMPLOYEE", children: "Employee" }), _jsx("option", { value: "MANAGER", children: "Manager" })] })] }), ruleKind === "SUMMARY" && _jsxs("label", { children: ["Summary period", _jsxs("select", { value: summaryKind, onChange: e => setSummaryKind(e.target.value), children: [_jsx("option", { children: "MORNING" }), _jsx("option", { children: "EVENING" }), _jsx("option", { children: "WEEKLY" }), _jsx("option", { children: "MONTHLY" })] })] }), ruleKind === "EVENT_NOTICE" && _jsxs("label", { children: ["Event names (comma separated, required)", _jsx("input", { value: eventNamesText, onChange: e => setEventNamesText(e.target.value), placeholder: "Enter explicitly configured event names" })] }), _jsxs("label", { children: ["Weekdays (0=Sun, 6=Sat)", ruleKind === "SUMMARY" && summaryKind === "WEEKLY" ? " · required" : "", _jsx("input", { value: weekdays, onChange: e => setWeekdays(e.target.value), placeholder: "Optional, comma separated" })] }), _jsxs("label", { children: ["Day of month", ruleKind === "SUMMARY" && summaryKind === "MONTHLY" ? " · required" : "", _jsx("input", { type: "number", min: "1", max: "31", value: dayOfMonth, onChange: e => setDayOfMonth(e.target.value), placeholder: "Optional" })] }), ruleKind === "TASK_REMINDER" && _jsxs("label", { children: ["Task reminder offset (days) \u00B7 required", _jsx("input", { type: "number", min: "-366", max: "366", step: "1", value: offsetDays, onChange: e => setOffsetDays(e.target.value), placeholder: "Enter day offset" })] }), ruleKind !== "SUMMARY" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Priority", _jsxs("select", { value: priority, onChange: e => setPriority(e.target.value), children: [_jsx("option", { value: "", children: "No priority filter" }), _jsx("option", { value: "LOW", children: "Low" }), _jsx("option", { value: "MEDIUM", children: "Medium" }), _jsx("option", { value: "HIGH", children: "High" }), _jsx("option", { value: "CRITICAL", children: "Critical" })] })] }), _jsxs("label", { children: ["Project ID (optional)", _jsx("input", { value: projectId, onChange: e => setProjectId(e.target.value) })] })] }), _jsxs("label", { className: "dashboard-check", children: [_jsx("input", { type: "checkbox", checked: ruleEnabled, onChange: e => setRuleEnabled(e.target.checked) }), " Enabled"] }), _jsxs("label", { className: "dashboard-check", children: [_jsx("input", { type: "checkbox", checked: critical, onChange: e => setCritical(e.target.checked) }), " Critical"] }), _jsxs("label", { className: "dashboard-check", children: [_jsx("input", { type: "checkbox", checked: mandatory, onChange: e => setMandatory(e.target.checked) }), " Mandatory"] }), _jsxs("label", { className: "dashboard-span", children: ["Reason", _jsx("textarea", { value: ruleReason, onChange: e => setRuleReason(e.target.value), minLength: 3, maxLength: 1000, required: true })] })] }), _jsx("p", { children: "Optional schedule policies stay unset until you enter them. Recipients are rechecked against current access when notices are generated." }), _jsx("button", { type: "button", disabled: busy || !scheduleValid, onClick: () => {
                                            const payload = { kind: ruleKind, enabled: ruleEnabled, localTime: ruleTime, timezone: timezone.trim(), audience, critical, mandatory, reason: ruleReason.trim(), ...(ruleKind === "SUMMARY" ? { summaryKind } : {}), ...(ruleKind === "EVENT_NOTICE" ? { eventNames } : {}), ...(weekdays.trim() ? { weekdays: weekdayValues } : {}), ...(dayOfMonth.trim() ? { dayOfMonth: Number(dayOfMonth) } : {}), ...(ruleKind === "TASK_REMINDER" && offsetDays.trim() ? { offsetDays: Number(offsetDays) } : {}), ...(ruleKind !== "SUMMARY" && priority ? { priority } : {}), ...(ruleKind !== "SUMMARY" && projectId.trim() ? { projectId: projectId.trim() } : {}), ...(editingRule ? { expectedVersion: editingRule.version } : {}) };
                                            void mutate(editingRule ? `/dashboard/schedules/${encodeURIComponent(editingRule.id)}` : "/dashboard/schedules", payload).then(() => { setRuleReason(""); setEditingRule(null); });
                                        }, children: editingRule ? "Save schedule changes" : "Save schedule rule" })] })] })] })] });
}
