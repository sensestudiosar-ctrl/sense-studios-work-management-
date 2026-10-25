import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Presentation of one authorized source section, never an aggregate of
 * overlapping Dashboard summaries. Unknown states remain explicitly unknown. */
export function taskStateMix(rows) {
    const counts = new Map();
    for (const row of rows)
        counts.set(row.status || "STATUS_UNAVAILABLE", (counts.get(row.status || "STATUS_UNAVAILABLE") ?? 0) + 1);
    return [...counts].map(([state, count]) => ({
        label: state === "STATUS_UNAVAILABLE" ? "Status unavailable" : state.replace(/_/g, " ").toLowerCase().replace(/^./, c => c.toUpperCase()), count,
        tone: state.includes("WAIT") ? "waiting" : /REVIEW|CORRECTION/.test(state) ? "review" : state === "IN_PROGRESS" ? "progress" : "other",
    }));
}
export function DashboardTaskMix({ rows, descriptionId }) {
    const groups = taskStateMix(rows);
    return _jsxs("div", { className: "dv-task-mix", children: [_jsx("div", { className: "dv-task-mix-bar", "aria-hidden": "true", children: groups.map(group => _jsx("span", { className: `dv-mix-${group.tone}`, style: { flexGrow: group.count } }, group.label)) }), _jsx("span", { id: descriptionId, className: "dv-task-mix-label", children: groups.length ? groups.map(group => `${group.count} ${group.label.toLowerCase()}`).join(" · ") : "No matching tasks" })] });
}
export function DashboardProjectOverview({ available, rows }) {
    if (!available)
        return _jsx("p", { className: "dv-projects-unavailable", role: "status", children: "Project summary unavailable. Read the source details below." });
    return _jsxs("div", { className: "dv-projects-overview", children: [_jsx("strong", { children: rows.length }), _jsxs("span", { children: ["Projects in this source", _jsxs("small", { children: [rows.filter(row => typeof row.score === "number" && Number.isFinite(row.score)).length, " with scored evidence"] })] }), _jsx(DashboardDataIcon, { name: "projects" })] });
}
const paths = {
    overdue: "M12 3 2 21h20L12 3Zm0 6v5m0 3h.01",
    today: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
    priority: "M5 21V4m0 0c5-4 9 4 15 0v10c-6 4-10-4-15 0",
    waiting: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
    reviews: "m8 12 3 3 5-6M6 3h12l3 3v15H3V6l3-3Z",
    time: "M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
    projects: "M3 6h6l2 3h10v12H3V6Z",
    decisions: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-4 10 3 3 5-6",
    performance: "M4 21V11h4v10m3 0V4h4v17m3 0V8h4v13",
};
export function DashboardDataIcon({ name }) {
    return _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: _jsx("path", { d: paths[name] ?? paths.projects }) });
}
