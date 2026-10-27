import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
/** Prototype due buckets, in display order. */
export const DUE_BUCKETS = ["Overdue", "Today", "This week", "Next week", "This month", "Later", "Without a date"];
/** Prototype priority order. */
const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
/**
 * The next-action value the caller emits when no task-specific action
 * applies. Rows that carry this value render the quiet right-edge chevron
 * instead of a filled labelled button; informational labels (corrections,
 * reviews, approvals) keep the labelled action button.
 */
const DEFAULT_NEXT_ACTION = "Open task";
/**
 * Maps an application status to the prototype's six visual states. The
 * prototype has exactly six states; the application has thirteen statuses.
 * This is a pure presentation mapping and must never be used to decide
 * behaviour — canonical status stays authoritative everywhere else.
 */
export function parityState(status) {
    switch (status) {
        case "NOT_STARTED":
            return "todo";
        case "IN_PROGRESS":
            return "progress";
        case "WAITING":
            return "waiting";
        case "SUBMITTED_INTERNAL_REVIEW":
        case "IN_INTERNAL_REVIEW":
        case "SUBMITTED_CLIENT_REVIEW":
        case "IN_CLIENT_REVIEW":
            return "review";
        case "CORRECTIONS_REQUIRED":
        case "CLIENT_REVISION_REQUIRED":
        case "STOPPED_DUE_TO_PROJECT_CANCELLATION":
            return "correction";
        case "INTERNAL_APPROVED":
        case "CLIENT_APPROVED":
        case "COMPLETED":
            return "done";
        default:
            return "todo";
    }
}
/** Maps an application priority to the prototype's four priority pills. */
export function parityPriorityClass(priority) {
    switch (priority) {
        case "CRITICAL":
            return "pr-Urgent";
        case "HIGH":
            return "pr-High";
        case "MEDIUM":
            return "pr-Normal";
        case "LOW":
            return "pr-Low";
        default:
            return "pr-Normal";
    }
}
/** Human label for a priority pill. The prototype uses Urgent for CRITICAL. */
export function parityPriorityLabel(priority) {
    return priority === "CRITICAL" ? "Urgent" : priority === "MEDIUM" ? "Normal" : priority;
}
/** Human label for a status, matching the rest of the application's wording. */
export function parityStatusLabel(status) {
    return status.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
}
/**
 * Assigns a due bucket using an explicit "today" so the result is testable
 * and does not depend on the browser clock. Dates are compared as calendar
 * days in UTC, matching how the application stores date-only bounds.
 */
export function dueBucket(dueDate, today, completed) {
    if (!dueDate)
        return "Without a date";
    if (dueDate < today)
        return completed ? "Later" : "Overdue";
    if (dueDate === today)
        return "Today";
    const due = new Date(`${dueDate}T00:00:00.000Z`);
    const base = new Date(`${today}T00:00:00.000Z`);
    const days = Math.round((due.getTime() - base.getTime()) / 86_400_000);
    if (days <= 7)
        return "This week";
    if (days <= 14)
        return "Next week";
    if (days <= 31)
        return "This month";
    return "Later";
}
export function MyWorkParityList({ rows, today, groupBy = "due", selectedId = null, loading = false, error, onOpenTask, onPin, onQuickAction, }) {
    const [expanded, setExpanded] = useState({});
    const [shown, setShown] = useState({});
    const rowRefs = useRef(new Map());
    const groups = useMemo(() => {
        const pinned = rows.filter(row => row.pinned);
        const rest = rows.filter(row => !row.pinned);
        const buckets = new Map();
        for (const row of rest) {
            const key = groupBy === "priority" ? parityPriorityLabel(row.priority) : dueBucket(row.dueDate, today, row.status === "COMPLETED");
            const list = buckets.get(key) ?? [];
            list.push(row);
            buckets.set(key, list);
        }
        const keys = [...buckets.keys()];
        keys.sort((left, right) => groupBy === "priority"
            ? PRIORITY_ORDER.indexOf(priorityKey(left)) - PRIORITY_ORDER.indexOf(priorityKey(right))
            : DUE_BUCKETS.indexOf(left) - DUE_BUCKETS.indexOf(right));
        const result = [];
        if (pinned.length)
            result.push({ key: "Pinned", label: "Pinned", rows: pinned });
        result.push(...keys.map(key => ({ key, label: key, rows: buckets.get(key) })));
        return result;
    }, [rows, today, groupBy]);
    const move = useCallback((from, delta) => {
        const order = groups.flatMap(group => group.rows.map(row => row.id));
        const index = order.indexOf(from);
        const next = order[Math.min(order.length - 1, Math.max(0, index + delta))];
        if (next !== undefined)
            rowRefs.current.get(next)?.focus();
    }, [groups]);
    if (loading)
        return _jsx("p", { role: "status", children: "Loading your work\u2026" });
    if (error)
        return _jsx("p", { role: "alert", children: error });
    if (rows.length === 0) {
        return _jsxs("div", { className: "my-work-empty", children: [_jsx("div", { "aria-hidden": "true", style: { fontSize: 30 }, children: "\u2315" }), _jsx("strong", { children: "Nothing assigned in this scope" }), _jsx("p", { children: "Switch your work scope, or return when more work is assigned." })] });
    }
    return _jsx("div", { className: "my-work-parity-groups", children: groups.map(group => {
            const collapsed = Boolean(expanded[group.key]);
            const visible = shown[group.key] ?? 6;
            const slice = group.rows.slice(0, collapsed ? 0 : visible);
            return _jsxs("section", { className: "my-work-group", "aria-label": group.label, children: [_jsxs("button", { type: "button", className: "my-work-group-head", "aria-expanded": !collapsed, onClick: () => setExpanded(current => ({ ...current, [group.key]: !collapsed })), children: [_jsx("span", { className: `my-work-chev${collapsed ? " is-collapsed" : ""}`, "aria-hidden": "true", children: "\u25BE" }), _jsx("span", { children: group.label }), _jsx("span", { className: "my-work-group-count", children: group.rows.length })] }), !collapsed && _jsxs(_Fragment, { children: [_jsxs("div", { className: "my-work-tablehead", "aria-hidden": "true", children: [_jsx("span", { children: "Task" }), _jsx("span", { children: "People" }), _jsx("span", { children: "Due" }), _jsx("span", { children: "Status" }), _jsx("span", { children: "Priority" })] }), slice.map(row => _jsx(ParityRow, { row: row, today: today, selected: row.id === selectedId, rowRefs: rowRefs, onOpen: onOpenTask, onPin: onPin, onQuickAction: onQuickAction, onMove: move }, row.id)), group.rows.length > visible && _jsxs("button", { type: "button", className: "my-work-showmore", onClick: () => setShown(current => ({ ...current, [group.key]: visible + 6 })), children: ["Show ", Math.min(6, group.rows.length - visible), " more of ", group.rows.length, " \u25BE"] })] })] }, group.key);
        }) });
}
function priorityKey(label) {
    if (label === "Urgent")
        return "CRITICAL";
    if (label === "Normal")
        return "MEDIUM";
    return label.toUpperCase();
}
function ParityRow({ row, today, selected, rowRefs, onOpen, onPin, onQuickAction, onMove }) {
    const state = parityState(row.status);
    const overdue = row.dueDate !== null && row.dueDate < today && row.status !== "COMPLETED";
    /**
     * The accessible name matches the established `Open task: <title>` convention
     * so assistive tech and existing tests see one consistent name. The status,
     * priority and due date are rendered as visible row content and are also
     * exposed as list-item text, so nothing is lost for screen-reader users.
     */
    const label = `Open task: ${row.title}`;
    /** Default state (the "Open task" label) → quiet chevron; an informational
     *  label → filled labelled button. Both delegate to the same upward action. */
    const isOpenOnly = row.nextAction === DEFAULT_NEXT_ACTION;
    return _jsxs("div", { className: `my-work-demo-row state-${state}${selected ? " is-selected" : ""}`, role: "listitem", children: [_jsx("button", { type: "button", ref: node => { if (node)
                    rowRefs.current.set(row.id, node);
                else
                    rowRefs.current.delete(row.id); }, className: "my-work-row-main", "aria-label": label, onClick: () => onOpen(row.id), onKeyDown: event => {
                    if (event.key === "ArrowDown") {
                        event.preventDefault();
                        onMove(row.id, 1);
                    }
                    if (event.key === "ArrowUp") {
                        event.preventDefault();
                        onMove(row.id, -1);
                    }
                } }), _jsxs("span", { className: "my-work-row-task", children: [onPin && _jsx("button", { type: "button", className: "my-work-pin", "aria-pressed": Boolean(row.pinned), "aria-label": `${row.pinned ? "Unpin" : "Pin"} ${row.title}`, title: `${row.pinned ? "Unpin" : "Pin"} task`, onClick: () => onPin(row.id, !row.pinned), children: row.pinned ? "◆" : "◇" }), _jsx("span", { className: "my-work-status-dot", "aria-hidden": "true" }), _jsxs("span", { className: "my-work-row-text", children: [_jsxs("span", { className: "my-work-titleline", children: [_jsx("strong", { children: row.title }), _jsx("span", { className: `my-work-priority ${parityPriorityClass(row.priority)}`, title: `${parityPriorityLabel(row.priority)} priority`, children: parityPriorityLabel(row.priority) })] }), _jsxs("small", { children: [row.context || row.project, row.context ? "" : ` · ${row.stage}`] }), _jsxs("small", { children: [row.isSubtask ? "Subtask · " : "", "Next: ", row.nextAction] }), row.requiresReassignment && _jsx("small", { className: "my-work-row-reassignment", children: "Needs reassignment after employee exit" }), _jsxs("span", { className: "my-work-mobile-state", children: [_jsx("span", { className: `my-work-status my-work-status-${state}`, children: parityStatusLabel(row.status) }), _jsx("span", { className: `my-work-mobile-due${overdue ? " overdue" : ""}`, children: row.dueDate ?? "No date" })] })] })] }), _jsx("span", { className: "my-work-row-cell", children: row.people }), _jsx("span", { className: `my-work-row-cell my-work-due${overdue ? " overdue" : ""}`, children: row.dueDate ?? "No date" }), _jsx("span", { className: "my-work-status-cell", children: _jsx("span", { className: `my-work-status my-work-status-${state}`, children: parityStatusLabel(row.status) }) }), _jsx("span", { className: "my-work-row-cell my-work-priority-cell", children: _jsx("span", { className: `my-work-priority priority-pill ${parityPriorityClass(row.priority)}`, title: `${parityPriorityLabel(row.priority)} priority`, children: parityPriorityLabel(row.priority) }) }), _jsx("span", { className: "my-work-row-action", children: isOpenOnly
                    ? _jsx("span", { className: "my-work-row-open", "aria-hidden": "true", children: "\u2192" })
                    : _jsx("button", { type: "button", onClick: () => (onQuickAction ?? onOpen)(row.id), children: row.nextAction }) })] });
}
/**
 * Status legend. Clicking a status delegates upward; this component applies no
 * filter of its own and never assumes the caller will honor it.
 */
export function MyWorkStatusLegend({ states, activeStatus, onSelect }) {
    return _jsx("div", { className: "my-work-legend", role: "group", "aria-label": "Filter by status", children: states.map(item => {
            const state = parityState(item.status);
            const active = activeStatus === item.status;
            return _jsxs("button", { type: "button", "aria-pressed": active, title: active ? "Show all statuses" : `Filter to ${item.label}`, onClick: () => onSelect(active ? "" : item.status), children: [_jsx("i", { "aria-hidden": "true", style: { ["--task-state-rail"]: `var(--state-${state})` } }), item.label] }, item.status);
        }) });
}
/** Metric focus panel — explains the selected card and offers a clear action. */
export function MyWorkMetricFocusPanel({ label, symbol, description, onClear }) {
    const closeRef = useRef(null);
    useEffect(() => { closeRef.current?.focus(); }, []);
    return _jsxs("div", { className: "my-work-metric-focus-panel", role: "status", children: [_jsx("span", { className: "focus-symbol", "aria-hidden": "true", children: symbol }), _jsxs("span", { className: "focus-copy", children: [_jsx("b", { children: label }), _jsx("p", { children: description })] }), _jsx("button", { type: "button", className: "focus-clear", ref: closeRef, onClick: onClear, children: "Clear" })] });
}
