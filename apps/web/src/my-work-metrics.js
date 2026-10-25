import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
// Use the organization calendar supplied by the existing server, never the
// browser timezone. Task date bounds are inclusive date-only UTC midnights.
export function previousCalendarDay(today) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today))
        throw new Error("The organization calendar is unavailable.");
    const date = new Date(`${today}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== today)
        throw new Error("The organization calendar is unavailable.");
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}
export function overdueTaskFilters(filters, before) {
    // A single API dateBasis cannot express Target AND Committed ranges. Keep
    // applied filters intact; this temporary preset explicitly pauses date ranges.
    return { ...filters, phase: "active", dateBasis: "target", dateFrom: "", dateTo: before };
}
function taskCountEndpoint(filters, phase) {
    const query = new URLSearchParams({ scope: "personal", offset: "0", limit: "1" });
    for (const [key, value] of Object.entries(filters)) {
        if (["scope", "offset", "limit", "phase", "sort"].includes(key))
            continue;
        if (key === "dateBasis" && !filters.dateFrom && !filters.dateTo)
            continue;
        if (value.trim())
            query.set(key, value.trim());
    }
    if (phase === "reviews")
        query.set("metric", "reviews");
    else
        query.set("phase", phase);
    return `/api/v1/tasks?${query}`;
}
async function readResponse(response) {
    if (!response.ok) {
        const error = new Error(`Could not load this source (${response.status}).`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
export function MyWorkTopCards({ filters, actionCounts, selectedMetric, onSelect, onOpenSources, onOverdueCalendar, refreshVersion = 0, queueStale = false, queueRefreshedAt, onSessionExpired, showSelection = true, sitePresentation = false, accountId }) {
    const [totals, setTotals] = useState({});
    const changed = useCallback((key, state) => {
        setTotals(current => current[key]?.status === state.status && current[key]?.total === state.total && current[key]?.before === state.before ? current : { ...current, [key]: state });
    }, []);
    const selected = totals[selectedMetric];
    const label = selectedMetric === "overdue" ? "Overdue" : "Waiting";
    return _jsxs("section", { className: "my-work-top-cards my-work-phase-summary", "aria-label": "Work overview", children: [_jsxs("div", { className: `my-work-phase-summary__grid${sitePresentation ? " my-work-phase-summary__grid--site" : ""}`, onFocusCapture: event => {
                    const strip = event.currentTarget;
                    if (strip.scrollWidth > strip.clientWidth)
                        event.target.closest(".my-work-phase")?.scrollIntoView({ block: "nearest", inline: "nearest" });
                }, children: [_jsx("article", { className: `my-work-phase my-work-phase-action${selectedMetric === "attention" ? " is-selected" : ""}`, children: _jsxs("button", { type: "button", className: "my-work-phase__select", "aria-label": "Needs action: filter authorized tasks, reviews and decisions", "aria-pressed": selectedMetric === "attention", onClick: () => onOpenSources("actions"), children: ["        ", _jsxs("span", { className: "my-work-phase__title", children: [_jsx("span", { className: "my-work-phase__icon", "aria-hidden": "true", children: "\u25C8" }), _jsx("span", { children: "Needs action" })] }), _jsxs("span", { className: "my-work-action-counts", children: [_jsx(ActionSourceCount, { label: "Tasks", state: actionCounts?.actionableTasks }), _jsx(ActionSourceCount, { label: "Reviews", state: actionCounts?.assignedReviews }), _jsx(ActionSourceCount, { label: "Decisions", state: actionCounts?.decisions })] }), _jsx("small", { className: "my-work-phase__hint", children: _jsx("span", { children: "Separate exact source counts" }) })] }) }), sitePresentation && _jsx(SiteSnagCount, { accountId: accountId, refreshVersion: refreshVersion, onSessionExpired: onSessionExpired }, accountId ?? "current-session"), _jsx(MetricCount, { metric: "overdue", label: "Overdue", hint: "Past Target \u00B7 unfinished", icon: "\u25F7", filters: filters, selected: selectedMetric === "overdue", refreshVersion: refreshVersion, onSelect: onSelect, onChanged: changed, onCalendar: onOverdueCalendar, onSessionExpired: onSessionExpired }), !sitePresentation && _jsxs(_Fragment, { children: [_jsx(MetricCount, { metric: "reviews", label: "Reviews", hint: "Pending review / correction tasks", icon: "\u25C7", filters: filters, selected: selectedMetric === "reviews", refreshVersion: refreshVersion, onSelect: onSelect, onChanged: changed, onSessionExpired: onSessionExpired }), _jsx(MetricCount, { metric: "waiting", label: "Waiting / blocked", hint: "Waiting tasks only", icon: "\u2298", filters: filters, selected: selectedMetric === "waiting", refreshVersion: refreshVersion, onSelect: onSelect, onChanged: changed, onSessionExpired: onSessionExpired })] })] }), showSelection && ["overdue", "waiting"].includes(selectedMetric) && _jsxs("p", { className: "my-work-phase-summary__selection", role: "status", children: [selected?.status === "ready" ? `${label} · ${selected.total} personal ${selected.total === 1 ? "task" : "tasks"}` : selected?.status === "stale" ? `${label} count is a stale snapshot; refresh before relying on it.` : selected?.status === "denied" ? `${label} count is not available to this account.` : selected?.status === "unavailable" ? `${label} count is unavailable.` : `Loading ${label.toLowerCase()} count`, queueStale && _jsxs("span", { children: [" The task list is a stale snapshot", queueRefreshedAt ? ` from ${new Date(queueRefreshedAt).toLocaleString()}` : "", " and may not match this count."] }), selectedMetric === "overdue" && _jsxs("span", { children: [" Target through ", selected?.before ?? "the previous organization day", ".", (filters.dateFrom || filters.dateTo) && " Applied date range is paused; Clear restores it."] }), _jsx("button", { type: "button", "aria-label": "Clear work card selection", onClick: () => onSelect(""), children: "Clear" })] })] });
}
function siteSnagTotal(body) {
    const object = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
    const uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const invalid = () => new Error("The complete authorized Site snag count is unavailable.");
    if (body.source !== "site" || typeof body.readCompletedAt !== "string" || !Number.isFinite(Date.parse(body.readCompletedAt)) || !Array.isArray(body.sections))
        throw invalid();
    const ids = new Set();
    for (const section of body.sections) {
        if (!object(section) || typeof section.key !== "string" || !Array.isArray(section.rows) || section.unavailable)
            throw invalid();
        for (const row of section.rows) {
            if (!object(row) || !object(row.sourceRef))
                throw invalid();
            const ref = row.sourceRef;
            if (!uuid(ref.projectId) || section.key !== `site:${ref.projectId}`)
                throw invalid();
            if (ref.type === "PROJECT")
                continue;
            if (ref.type !== "SITE_RECORD" || !uuid(ref.recordId) || typeof ref.recordKind !== "string" || !["PACKAGE", "REPORT", "SNAG", "MANPOWER", "NOTE", "HANDOVER"].includes(ref.recordKind))
                throw invalid();
            // This is an all-state record count, not a task predicate, open-snag
            // policy, employee-responsibility count or authority to act on a snag.
            if (ref.recordKind === "SNAG")
                ids.add(`${ref.projectId}:${ref.recordId}`);
        }
    }
    return ids.size;
}
function SiteSnagCount({ accountId, refreshVersion, onSessionExpired }) {
    const [state, setState] = useState({ status: "loading", accountId });
    const [revision, setRevision] = useState(0);
    const request = useRef(0);
    const visible = state.accountId === accountId ? state : { status: "loading" };
    useEffect(() => {
        const retryOnReturn = () => { if (document.visibilityState !== "hidden")
            setRevision(value => value + 1); };
        window.addEventListener("focus", retryOnReturn);
        document.addEventListener("visibilitychange", retryOnReturn);
        return () => { window.removeEventListener("focus", retryOnReturn); document.removeEventListener("visibilitychange", retryOnReturn); };
    }, []);
    useEffect(() => {
        const id = ++request.current;
        const controller = new AbortController();
        setState(current => current.accountId === accountId ? { ...current, status: "loading" } : { status: "loading", accountId });
        const endSession = () => { request.current += 1; controller.abort(); setState({ status: "unavailable", accountId, message: "Sign in to refresh Site records." }); };
        window.addEventListener("sense-session-ended", endSession);
        void fetch("/api/v1/dashboard/sources/site", { credentials: "include", cache: "no-store", signal: controller.signal }).then(readResponse).then(body => {
            const total = siteSnagTotal(body);
            if (request.current === id && !controller.signal.aborted)
                setState({ status: "ready", accountId, total, refreshedAt: Date.parse(body.readCompletedAt) });
        }).catch((cause) => {
            if (request.current !== id || controller.signal.aborted)
                return;
            const status = cause instanceof Error ? cause.status : undefined;
            if (status === 401)
                onSessionExpired?.();
            setState(current => ![401, 403, 404].includes(status ?? 0) && current.accountId === accountId && current.total !== undefined
                ? { ...current, status: "stale", message: "Site records could not be refreshed." }
                : { status: status === 403 || status === 404 ? "denied" : "unavailable", accountId, message: status === 403 || status === 404 ? "Site records are not available to this account." : "Site records could not be loaded." });
        });
        return () => { request.current += 1; controller.abort(); window.removeEventListener("sense-session-ended", endSession); };
    }, [accountId, refreshVersion, revision, onSessionExpired]);
    const value = visible.status === "ready" ? visible.total : visible.status === "stale" ? `${visible.total} · Stale` : visible.status === "loading" ? "Loading…" : visible.status === "denied" ? "Not available" : "Unavailable";
    const content = _jsxs(_Fragment, { children: [_jsxs("span", { className: "my-work-phase__title", children: [_jsx("span", { className: "my-work-phase__icon", "aria-hidden": "true", children: "\u25C7" }), _jsx("span", { children: "Site snags" })] }), _jsx("strong", { children: value }), _jsx("small", { className: "my-work-phase__hint", children: "Open Site delivery \u2197" })] });
    return _jsxs("article", { className: "my-work-phase", "aria-label": "Site snags summary", children: [visible.status === "ready" || visible.status === "stale" ? _jsx("a", { href: "/site", className: "my-work-phase__select", "aria-label": `Site snags: ${value}`, children: content })
                : _jsx("div", { className: "my-work-phase__select", "aria-label": `Site snags: ${value}`, role: "status", children: content }), _jsx("p", { className: "my-work-phase__source-error", children: "All states across authorized sites. Task filters do not apply." }), ["stale", "unavailable", "denied"].includes(visible.status) && _jsxs("div", { className: "my-work-phase__source-error", role: visible.status === "unavailable" ? "alert" : "status", children: [_jsxs("span", { children: [visible.status === "stale" ? `Stale · last read ${new Date(visible.refreshedAt ?? 0).toLocaleString()}. ` : "", visible.message] }), visible.status !== "denied" && _jsx("button", { type: "button", onClick: () => setRevision(value => value + 1), children: "Retry Site snag count" })] })] });
}
function ActionSourceCount({ label, state }) {
    const status = state?.status ?? "loading";
    const value = status === "ready" || status === "stale" ? state?.total : status === "loading" ? "…" : "—";
    return _jsxs("span", { className: "my-work-action-count", "aria-label": `${label}: ${status === "ready" ? value : status === "stale" ? `${value}, stale` : status === "denied" ? "Not available" : status === "unavailable" ? "Unavailable" : status === "excluded" ? "Excluded by filter" : "Loading"}`, children: [_jsx("strong", { children: value }), _jsx("small", { children: label }), status !== "ready" && _jsx("small", { className: "my-work-action-count-state", children: status === "loading" ? "Loading" : status === "denied" ? "Not available" : status === "stale" ? "Stale" : status === "excluded" ? "Excluded by filter" : "Unavailable" })] });
}
function MetricCount({ metric, label, hint, icon, filters, selected, refreshVersion, onSelect, onChanged, onCalendar, onSessionExpired }) {
    const filterKey = JSON.stringify(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)));
    const [state, setState] = useState({ status: "loading", context: filterKey });
    const [revision, setRevision] = useState(0);
    const request = useRef(0);
    const visible = state.context === filterKey ? state : { status: "loading", context: filterKey };
    useEffect(() => { onChanged(metric, visible); }, [metric, onChanged, visible]);
    useEffect(() => {
        const retryOnReturn = () => { if (document.visibilityState !== "hidden")
            setRevision(value => value + 1); };
        window.addEventListener("focus", retryOnReturn);
        document.addEventListener("visibilitychange", retryOnReturn);
        return () => { window.removeEventListener("focus", retryOnReturn); document.removeEventListener("visibilitychange", retryOnReturn); };
    }, []);
    useEffect(() => {
        const id = ++request.current;
        const controller = new AbortController();
        const options = { credentials: "include", cache: "no-store", signal: controller.signal };
        const currentFilters = Object.fromEntries(JSON.parse(filterKey));
        setState(current => current.context === filterKey ? { ...current, status: "loading" } : { status: "loading", context: filterKey });
        if (metric === "overdue")
            onCalendar?.({ status: "loading" });
        void (async () => {
            let before;
            if (metric === "overdue") {
                const calendar = await fetch("/api/v1/dashboard/sources/tasks", options).then(readResponse);
                if (calendar.source !== "tasks" || typeof calendar.today !== "string")
                    throw new Error("The organization calendar is unavailable.");
                before = previousCalendarDay(calendar.today);
            }
            const endpoint = taskCountEndpoint(before ? overdueTaskFilters(currentFilters, before) : currentFilters, metric === "overdue" ? "active" : metric === "reviews" ? "reviews" : "waiting");
            const body = await fetch(endpoint, options).then(readResponse);
            if (!Number.isInteger(body.total) || body.total < 0 || !Array.isArray(body.items))
                throw new Error("The server returned an invalid count.");
            if (request.current !== id)
                return;
            setState({ status: "ready", total: body.total, refreshedAt: Date.now(), context: filterKey, ...(before ? { before } : {}) });
            if (before)
                onCalendar?.({ status: "ready", before });
        })().catch((cause) => {
            if (request.current !== id || controller.signal.aborted)
                return;
            const status = cause instanceof Error ? cause.status : undefined;
            if (status === 401)
                onSessionExpired?.();
            if (metric === "overdue")
                onCalendar?.({ status: "unavailable" });
            setState(current => status !== 401 && status !== 403 && current.context === filterKey && current.total !== undefined && current.refreshedAt !== undefined
                ? { ...current, status: "stale", message: cause instanceof Error ? cause.message : "Could not refresh this count." }
                : { status: status === 403 ? "denied" : "unavailable", context: filterKey, message: status === 403 ? "Not available to this account." : cause instanceof Error ? cause.message : "Could not load this count." });
        });
        return () => { request.current += 1; controller.abort(); };
    }, [filterKey, metric, onCalendar, onSessionExpired, refreshVersion, revision]);
    const value = visible.status === "ready" ? visible.total : visible.status === "stale" ? `${visible.total} · Stale` : visible.status === "loading" ? "Loading…" : visible.status === "denied" ? "Not available" : "Unavailable";
    const selectable = metric !== "overdue" || visible.status === "ready";
    return _jsxs("article", { className: `my-work-phase my-work-phase-${metric}${selected ? " is-selected" : ""}`, children: [_jsxs("button", { type: "button", className: "my-work-phase__select", "aria-label": `${label}: ${value}`, "aria-description": hint, title: selected ? "Click to show the full list" : "Click to view only these tasks", "aria-pressed": selected, disabled: !selectable && !selected, onClick: () => onSelect(selected ? "" : metric === "waiting" ? "waiting" : metric === "reviews" ? "reviews" : "overdue"), children: [_jsxs("span", { className: "my-work-phase__title", children: [_jsx("span", { className: "my-work-phase__icon", "aria-hidden": "true", children: icon }), _jsx("span", { children: label })] }), _jsx("strong", { children: value }), _jsxs("small", { className: "my-work-phase__hint", children: [_jsx("span", { children: selected ? "Viewing matching tasks" : hint }), _jsx("span", { className: "my-work-phase__arrow", "aria-hidden": "true", children: selected ? "✓" : "↗" })] })] }), ["stale", "unavailable", "denied"].includes(visible.status) && _jsxs("div", { className: "my-work-phase__source-error", role: visible.status === "unavailable" ? "alert" : "status", children: [_jsxs("span", { children: [visible.status === "stale" ? `Stale · last refreshed ${new Date(visible.refreshedAt ?? 0).toLocaleString()}. ` : "", visible.message] }), visible.status !== "denied" && _jsxs("button", { type: "button", onClick: () => setRevision(value => value + 1), children: ["Retry ", label.toLowerCase(), " count"] })] })] });
}
