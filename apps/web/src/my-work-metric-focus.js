import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LABELS = {
    overdue: "Overdue",
    waiting: "Waiting / blocked",
    review: "Review phase",
    reviews: "Reviews",
    active: "Active",
    completed: "Completed"
};
function validCount(total) {
    return total !== undefined && Number.isInteger(total) && total >= 0;
}
function countText(total) {
    return `${total} ${total === 1 ? "task" : "tasks"}`;
}
function refreshedLabel(refreshedAt) {
    if (refreshedAt === undefined || !Number.isFinite(refreshedAt))
        return undefined;
    const date = new Date(refreshedAt);
    return Number.isNaN(date.getTime()) ? undefined : `Last refreshed ${date.toISOString()}.`;
}
export function MyWorkMetricFocus({ metric, total, loading, stale, denied, error, refreshedAt, overdueBefore, dateRangePaused, onClear }) {
    if (!Object.hasOwn(LABELS, metric))
        return null;
    const label = LABELS[metric];
    const hasCount = validCount(total);
    let title;
    const refreshed = stale && !loading && !denied ? refreshedLabel(refreshedAt) : undefined;
    if (denied)
        title = `${label} results aren’t available with your current access.`;
    else if (loading)
        title = `Loading ${label.toLowerCase()} results…`;
    else if (error && stale)
        title = hasCount ? `Showing last refreshed count: ${countText(total)} · ${label}. Latest refresh failed.` : `${label} results may be out of date. Latest refresh failed.`;
    else if (error)
        title = `${label} results couldn’t be loaded.`;
    else if (stale)
        title = hasCount ? `Showing last refreshed count: ${countText(total)} · ${label}` : `${label} results may be out of date.`;
    else if (hasCount)
        title = `${countText(total)} · ${label}`;
    else
        title = `${label} results are not available yet.`;
    return _jsxs("div", { className: "my-work-metric-focus", role: "status", "aria-label": "Work card results", children: [_jsxs("div", { className: "my-work-metric-focus-copy", children: [_jsx("strong", { children: title }), refreshed && _jsx("span", { children: refreshed }), metric === "overdue" && overdueBefore && _jsxs("span", { children: ["Organization day cutoff: ", overdueBefore] }), metric === "overdue" && dateRangePaused && _jsx("span", { children: "Applied date range paused while this card filter is active." })] }), _jsx("button", { type: "button", "aria-label": "Clear work card selection", onClick: onClear, children: "\u00D7 Clear widget filter" })] });
}
