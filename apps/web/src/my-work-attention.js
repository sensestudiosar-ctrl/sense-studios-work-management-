import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./my-work-attention.css";
const LIMIT = 50;
const initial = () => ({ offset: 0, page: undefined, loading: true, error: "", failureStatus: undefined, revision: 0, refreshedAt: undefined, stale: false });
const PERSONAL_PHASES = [
    { key: "active", label: "Active personal tasks", short: "Active", icon: "◈" },
    { key: "waiting", label: "Waiting personal tasks", short: "Waiting", icon: "⊘" },
    { key: "review", label: "Personal tasks in review phase", short: "Review phase", icon: "◇" },
    { key: "completed", label: "Completed personal tasks", short: "Completed", icon: "✓" },
];
function personalPhaseEndpoint(filterQuery, phase) {
    const query = new URLSearchParams("scope=personal&offset=0&limit=1");
    const filters = new URLSearchParams(filterQuery);
    for (const [key, value] of filters) {
        if (key === "phase" || key === "offset" || key === "limit" || key === "scope")
            continue;
        if (key === "dateBasis" && !filters.get("dateFrom") && !filters.get("dateTo"))
            continue;
        if (value.trim())
            query.set(key, value.trim());
    }
    query.set("phase", phase);
    return `/api/v1/tasks?${query.toString()}`;
}
export function MyWorkPhaseSummary({ filters, selectedPhase, onSelect, refreshVersion = 0, queueStale = false, queueRefreshedAt, onSessionExpired, includeAbout = true }) {
    const filterQuery = new URLSearchParams(Object.entries(filters).sort(([left], [right]) => left.localeCompare(right))).toString();
    const contextKey = filterQuery;
    const [phaseTotals, setPhaseTotals] = useState({});
    const expired = useRef(false);
    const handleSessionExpired = useCallback(() => {
        if (expired.current)
            return;
        expired.current = true;
        onSessionExpired?.();
    }, [onSessionExpired]);
    const updatePhaseTotal = useCallback((phase, status, total, key, refreshedAt) => {
        setPhaseTotals((current) => current[phase]?.status === status && current[phase]?.total === total && current[phase]?.contextKey === key && current[phase]?.refreshedAt === refreshedAt ? current : { ...current, [phase]: { status, total, contextKey: key, refreshedAt } });
    }, []);
    const selected = PERSONAL_PHASES.find((phase) => phase.key === selectedPhase);
    const storedTotal = selectedPhase ? phaseTotals[selectedPhase] : undefined;
    const selectedTotal = storedTotal?.contextKey === contextKey ? storedTotal : undefined;
    return _jsxs("section", { className: "my-work-phase-summary", "aria-label": "Personal task phases", children: [_jsx("div", { className: "my-work-phase-summary__grid", children: PERSONAL_PHASES.map((phase) => _jsx(PersonalPhaseCount, { phase: phase.key, label: phase.label, shortLabel: phase.short, icon: phase.icon, filterQuery: filterQuery, refreshVersion: refreshVersion, selected: selectedPhase === phase.key, onSelect: onSelect, onCountChange: updatePhaseTotal, onSessionExpired: handleSessionExpired }, phase.key)) }), selected && _jsxs("p", { className: "my-work-phase-summary__selection", role: "status", children: [queueStale ? `The task list is a stale snapshot${queueRefreshedAt ? ` from ${new Date(queueRefreshedAt).toLocaleString()}` : ""} and may not match this summary.` : selectedTotal?.status === "ready" ? `${selected.short} · ${selectedTotal.total} personal ${selectedTotal.total === 1 ? "task" : "tasks"}` : selectedTotal?.status === "stale" ? `${selected.short} task count is a stale snapshot from ${new Date(selectedTotal.refreshedAt ?? 0).toLocaleString()}; the task list may have changed` : selectedTotal?.status === "denied" ? `${selected.short} task count is not available to this account` : selectedTotal?.status === "unavailable" ? `${selected.short} task count is unavailable` : `Loading ${selected.short.toLowerCase()} task count`, "  ", _jsx("button", { type: "button", "aria-label": "Clear phase selection", onClick: () => onSelect(""), children: "Clear" })] }), includeAbout && _jsx(MyWorkTaskCountInformation, {})] });
}
export function MyWorkTaskCountInformation() {
    return _jsxs("details", { className: "my-work-phase-summary__about", children: [_jsx("summary", { children: "About task counts" }), _jsx("p", { children: "Counts include tasks you own or where you are explicitly listed as a collaborator. Review includes approved and correction work; it does not include your reviewer inbox. The task list remains paginated." }), _jsx("p", { children: "The top Reviews card filters pending review and correction tasks. Assigned reviewer obligations remain separate from owned tasks. Needs action filters authorized task, review and decision actions in one queue, retaining separate source counts. Overdue uses unfinished personal tasks past their Target date in the organization calendar; its temporary date preset clears back to your applied filters. Waiting / blocked counts Waiting tasks only. Counts and the task queue refresh independently." })] });
}
function PersonalPhaseCount({ phase, label, shortLabel, icon, filterQuery, refreshVersion, selected, onSelect, onCountChange, onSessionExpired }) {
    const [state, setState] = useState({ status: "loading", revision: 0, contextKey: "" });
    const sequence = useRef(0);
    const contextKey = filterQuery;
    const visibleState = state.contextKey === contextKey ? state : { status: "loading", revision: state.revision, contextKey };
    useEffect(() => { onCountChange(phase, visibleState.status, visibleState.total, contextKey, visibleState.refreshedAt); }, [contextKey, onCountChange, phase, visibleState.status, visibleState.total, visibleState.refreshedAt]);
    useEffect(() => {
        const requestId = ++sequence.current;
        const controller = new AbortController();
        setState((current) => current.contextKey === contextKey
            ? { ...current, status: "loading", message: undefined }
            : { status: "loading", revision: current.revision, contextKey });
        void fetch(personalPhaseEndpoint(filterQuery, phase), { credentials: "include", cache: "no-store", signal: controller.signal })
            .then(async (response) => {
            if (!response.ok) {
                const body = await response.clone().json().catch(() => ({}));
                const error = new Error(body.error?.message ?? body.message ?? `Could not load this count (${response.status}).`);
                error.status = response.status;
                throw error;
            }
            const body = await response.json();
            if (!Number.isInteger(body.total) || (body.total ?? -1) < 0 || !Array.isArray(body.items))
                throw new Error("The server returned an invalid task count.");
            return body.total;
        })
            .then((total) => { if (sequence.current === requestId)
            setState((current) => ({ status: "ready", total, revision: current.revision, contextKey, refreshedAt: Date.now() })); })
            .catch((cause) => {
            if (sequence.current !== requestId || cause instanceof DOMException && cause.name === "AbortError")
                return;
            const status = cause instanceof Error ? cause.status : undefined;
            if (status === 401)
                onSessionExpired();
            setState((current) => status !== 401 && status !== 403 && current.total !== undefined && current.refreshedAt !== undefined
                ? { ...current, status: "stale", message: cause instanceof Error ? cause.message : "Could not refresh this count.", revision: current.revision, contextKey }
                : { status: status === 403 ? "denied" : "unavailable", message: status === 403 ? "Not available to this account." : cause instanceof Error ? cause.message : "Could not load this count.", revision: current.revision, contextKey });
        });
        return () => { controller.abort(); sequence.current += 1; };
    }, [contextKey, filterQuery, onSessionExpired, phase, refreshVersion, state.revision]);
    const retry = () => setState((current) => ({ ...current, status: "loading", message: undefined, revision: current.revision + 1, contextKey }));
    return _jsxs("article", { className: `my-work-phase my-work-phase-${phase}${selected ? " is-selected" : ""}`, children: [_jsxs("button", { type: "button", className: "my-work-phase__select", "aria-label": `${label}: ${visibleState.status === "ready" ? visibleState.total : visibleState.status === "stale" ? `Stale count ${visibleState.total}` : visibleState.status === "loading" ? "Loading" : visibleState.status === "denied" ? "Not available" : "Unavailable"}`, "aria-description": selected ? "Selected; click to clear" : "Open matching tasks", "aria-pressed": selected, onFocus: (event) => { const strip = event.currentTarget.closest(".my-work-phase-summary__grid"); if (strip && strip.scrollWidth > strip.clientWidth)
                    event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" }); }, onClick: () => onSelect(selected ? "" : phase), children: [_jsxs("span", { className: "my-work-phase__title", children: [_jsx("span", { className: "my-work-phase__icon", "aria-hidden": "true", children: icon }), _jsx("span", { children: shortLabel })] }), _jsx("strong", { children: visibleState.status === "ready" ? visibleState.total : visibleState.status === "stale" ? `${visibleState.total} · Stale` : visibleState.status === "loading" ? "Loading…" : visibleState.status === "denied" ? "Not available" : "Unavailable" }), _jsxs("small", { className: "my-work-phase__hint", children: [_jsx("span", { children: selected ? "Selected · click to clear" : "Open matching tasks" }), _jsx("span", { className: "my-work-phase__arrow", "aria-hidden": "true", children: selected ? "✓" : "↗" })] })] }), visibleState.status === "unavailable" && _jsxs("div", { className: "my-work-phase__source-error", role: "alert", children: [_jsx("span", { children: visibleState.message }), _jsxs("button", { type: "button", onClick: retry, children: ["Retry ", shortLabel.toLowerCase(), " count"] })] }), visibleState.status === "stale" && _jsxs("div", { className: "my-work-phase__source-error", role: "status", children: [_jsxs("span", { children: ["Stale \u00B7 last successfully refreshed ", new Date(visibleState.refreshedAt ?? 0).toLocaleString(), ". ", visibleState.message] }), _jsxs("button", { type: "button", onClick: retry, children: ["Retry ", shortLabel.toLowerCase(), " count"] })] }), visibleState.status === "denied" && _jsx("p", { className: "my-work-phase__source-error", role: "status", children: visibleState.message })] });
}
async function readPage(response) {
    if (!response.ok) {
        const body = await response.clone().json().catch(() => ({}));
        const error = new Error(body.error?.message ?? body.message ?? `Could not load this list (${response.status}).`);
        error.status = response.status;
        throw error;
    }
    const body = await response.json();
    if (!Number.isInteger(body.total) || (body.total ?? -1) < 0 || !Array.isArray(body.items))
        throw new Error("The server returned an invalid attention list.");
    return body;
}
function useIndependentPage(key, endpoint, onUnauthorized) {
    const [state, setState] = useState(() => initial());
    const request = useRef(0);
    useEffect(() => {
        const offset = state.offset;
        const id = ++request.current;
        const controller = new AbortController();
        setState((current) => ({ ...current, offset, loading: true, error: "", failureStatus: undefined, stale: false }));
        void fetch(endpoint(offset), { credentials: "include", cache: "no-store", signal: controller.signal })
            .then((readPage))
            .then((page) => { if (request.current === id)
            setState((current) => ({ ...current, offset, page, loading: false, error: "", refreshedAt: Date.now(), stale: false })); })
            .catch((error) => {
            if (request.current !== id || error instanceof DOMException && error.name === "AbortError")
                return;
            const status = error instanceof Error ? error.status : undefined;
            if (status === 401)
                onUnauthorized();
            setState((current) => status !== 401 && status !== 403 && current.page
                ? { ...current, offset, loading: false, failureStatus: status, stale: true, error: error instanceof Error ? error.message : "Could not refresh this list." }
                : { ...current, offset, page: undefined, loading: false, failureStatus: status, stale: false, refreshedAt: undefined, error: error instanceof Error ? error.message : "Could not load this list." });
        });
        return () => controller.abort();
    }, [key, endpoint, onUnauthorized, state.offset, state.revision]);
    const retry = useCallback(() => setState((current) => ({ ...current, error: "", failureStatus: undefined, revision: current.revision + 1 })), []);
    const pageTo = useCallback((offset) => setState((current) => ({ ...current, offset: Math.max(0, offset), page: undefined, refreshedAt: undefined, stale: false })), []);
    const refresh = useCallback(() => setState((current) => ({ ...current, error: "", failureStatus: undefined, revision: current.revision + 1 })), []);
    return { state, retry, pageTo, refresh };
}
const reviewConfig = {
    source: "reviews",
    title: "Reviews awaiting you",
    summaryTitle: "Reviews",
    endpoint: (offset) => `/api/v1/reviews/inbox?personal=true&offset=${offset}&limit=${LIMIT}`,
    href: (item) => `/reviews?taskId=${encodeURIComponent(item.taskId)}&roundId=${encodeURIComponent(item.roundId)}`,
    label: (item) => item.taskTitle,
    description: (item) => `${item.projectTitle} · Round ${item.roundNumber}${item.revisionLabel ? ` · Revision ${item.revisionLabel}` : ""}`,
    itemKey: (item) => item.roundId,
};
const correctionConfig = {
    source: "corrections",
    title: "Your correction tasks",
    summaryTitle: "Corrections",
    endpoint: (offset) => `/api/v1/tasks/attention?kind=corrections&offset=${offset}&limit=${LIMIT}`,
    href: (item) => `/tasks?taskId=${encodeURIComponent(item.id)}`,
    label: (item) => item.title,
    description: (item) => item.projectTitle ? `${item.projectTitle} · ${item.reason}` : item.reason,
    itemKey: (item) => item.id,
};
const reassignmentConfig = {
    source: "reassignment",
    title: "Management: employee-exit reassignment",
    summaryTitle: "Management",
    endpoint: (offset) => `/api/v1/tasks/attention?kind=reassignment&offset=${offset}&limit=${LIMIT}`,
    href: (item) => `/tasks?taskId=${encodeURIComponent(item.id)}`,
    label: (item) => item.title,
    description: (item) => item.projectTitle ? `${item.projectTitle} · ${item.reason}` : item.reason,
    itemKey: (item) => item.id,
};
function sourceCount(state) {
    if (state.failureStatus === 401)
        return { status: "unavailable" };
    if (state.failureStatus === 403)
        return { status: "denied" };
    if (state.loading)
        return { status: "loading" };
    if (state.stale && state.page)
        return { status: "stale", total: state.page.total };
    if (state.error || !state.page)
        return { status: "unavailable" };
    return { status: "ready", total: state.page.total };
}
export function MyWorkManagement({ onSessionExpired, prioritizeReassignment = false }) {
    const expiredRef = useRef(onSessionExpired);
    expiredRef.current = onSessionExpired;
    const expired = useCallback(() => expiredRef.current?.(), []);
    const reassignment = useIndependentPage("reassignment", reassignmentConfig.endpoint, expired);
    if (!reassignment.state.loading && !reassignment.state.error && !reassignment.state.stale && reassignment.state.page?.total === 0)
        return null;
    return _jsx("section", { className: "my-work-attention", "aria-label": "Authorized management obligations", children: _jsx(AttentionDisclosure, { config: reassignmentConfig, ...reassignment, defaultOpen: prioritizeReassignment }) });
}
export function MyWorkAttention({ onSessionExpired, prioritizeReassignment = false, sourceRequest, onActionCounts }) {
    const [modalRequest, setModalRequest] = useState(null);
    const returnFocus = useRef(null);
    const hadModal = useRef(false);
    const onSessionExpiredRef = useRef(onSessionExpired);
    onSessionExpiredRef.current = onSessionExpired;
    const handleUnauthorized = useCallback(() => onSessionExpiredRef.current?.(), []);
    const reviews = useIndependentPage("reviews", reviewConfig.endpoint, handleUnauthorized);
    const corrections = useIndependentPage("corrections", correctionConfig.endpoint, handleUnauthorized);
    const reassignment = useIndependentPage("reassignment", reassignmentConfig.endpoint, handleUnauthorized);
    const actionCounts = useMemo(() => ({ corrections: sourceCount(corrections.state), management: sourceCount(reassignment.state) }), [corrections.state, reassignment.state]);
    useEffect(() => {
        onActionCounts?.(actionCounts);
    }, [onActionCounts, actionCounts]);
    const latestSources = useRef({ reviews, corrections, reassignment });
    latestSources.current = { reviews, corrections, reassignment };
    const confirmedEmpty = (state) => Boolean(state.page && state.page.total === 0 && state.page.items.length === 0 && !state.loading && !state.stale && !state.error && !state.failureStatus);
    const requestedSource = sourceRequest?.source;
    const requestedVersion = sourceRequest?.version;
    useEffect(() => {
        if (!requestedSource || requestedVersion === undefined)
            return;
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setModalRequest({ source: requestedSource, version: requestedVersion });
        const refreshLoaded = (state, refresh) => { if (state.page && !state.loading)
            refresh(); };
        const sources = latestSources.current;
        if (requestedSource === "reviews")
            refreshLoaded(sources.reviews.state, sources.reviews.refresh);
        else {
            refreshLoaded(sources.corrections.state, sources.corrections.refresh);
            refreshLoaded(sources.reassignment.state, sources.reassignment.refresh);
        }
    }, [requestedSource, requestedVersion, reviews.refresh, corrections.refresh, reassignment.refresh]);
    useEffect(() => {
        if (modalRequest) {
            hadModal.current = true;
            return;
        }
        if (hadModal.current) {
            hadModal.current = false;
            returnFocus.current?.focus();
            returnFocus.current = null;
        }
    }, [modalRequest]);
    const showReviewsInModal = modalRequest?.source === "reviews";
    const showActionsInModal = modalRequest?.source === "actions";
    return _jsxs("section", { className: "my-work-attention", "aria-label": "Work needing attention", children: [!showReviewsInModal && !confirmedEmpty(reviews.state) && _jsx(AttentionDisclosure, { config: reviewConfig, ...reviews }), !showActionsInModal && !confirmedEmpty(corrections.state) && _jsx(AttentionDisclosure, { config: correctionConfig, ...corrections }), !showActionsInModal && !confirmedEmpty(reassignment.state) && _jsx(AttentionDisclosure, { config: reassignmentConfig, ...reassignment, defaultOpen: prioritizeReassignment }), modalRequest && _jsx(AttentionModal, { source: modalRequest.source, onClose: () => setModalRequest(null), children: modalRequest.source === "reviews" ? _jsx(AttentionSection, { config: reviewConfig, ...reviews }) : _jsxs(_Fragment, { children: [_jsx("a", { className: "my-work-attention__modal-link", href: "/decisions", children: "Open decisions" }), _jsx(AttentionSection, { config: correctionConfig, ...corrections }), _jsx(AttentionSection, { config: reassignmentConfig, ...reassignment }), _jsxs("div", { className: "my-work-attention__client-context", children: [_jsx("p", { children: "Client reviews are project context and have no personal count." }), _jsx("a", { className: "my-work-attention__modal-link", href: "/client-reviews", children: "Open project client reviews" })] })] }) })] });
}
function AttentionModal({ source, onClose, children }) {
    const dialogRef = useRef(null);
    const title = source === "reviews" ? "Reviews awaiting you" : "Work needing attention";
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog)
            return;
        if (typeof dialog.showModal === "function" && !dialog.open)
            dialog.showModal();
        else
            dialog.setAttribute("open", "");
    }, []);
    const close = () => {
        const dialog = dialogRef.current;
        if (dialog?.open && typeof dialog.close === "function")
            dialog.close();
        else
            onClose();
    };
    return createPortal(_jsxs("dialog", { ref: dialogRef, className: "my-work-attention__modal", "aria-labelledby": "my-work-attention-modal-title", onClose: onClose, children: [_jsxs("header", { className: "my-work-attention__modal-header", children: [_jsx("h2", { id: "my-work-attention-modal-title", children: title }), _jsx("button", { type: "button", className: "my-work-attention__modal-close", onClick: close, "aria-label": "Close", children: "Close" })] }), _jsx("div", { className: "my-work-attention__modal-content", children: children })] }), document.body);
}
function AttentionDisclosure({ config, state, retry, pageTo, refresh, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    const total = state.page?.total;
    const needsAttention = (total ?? 0) > 0 || state.stale || !!state.error || state.failureStatus === 401 || state.failureStatus === 403;
    useEffect(() => { if (needsAttention)
        setOpen(true); }, [needsAttention]);
    const summary = state.loading ? "Loading" : state.failureStatus === 403 ? "Access not available" : state.failureStatus === 401 ? "Session ended" : state.stale ? `Stale · ${total} items` : state.error ? "Unavailable" : total === undefined ? "Not loaded" : `${total} ${total === 1 ? "item" : "items"}`;
    return _jsxs("details", { className: "my-work-attention__disclosure", "data-work-source": config.source, open: open, onToggle: (event) => setOpen(event.currentTarget.open), children: [_jsxs("summary", { children: [_jsx("span", { children: config.summaryTitle ?? config.title }), _jsx("strong", { children: summary })] }), _jsx(AttentionSection, { config: config, state: state, retry: retry, pageTo: pageTo, refresh: refresh })] });
}
function AttentionSection({ config, state, retry, pageTo, refresh }) {
    const total = state.page?.total ?? 0;
    const start = state.page?.items.length ? state.offset + 1 : 0;
    const end = state.page?.items.length ? state.offset + state.page.items.length : 0;
    const pages = Math.max(1, Math.ceil(total / LIMIT));
    const pageNumber = Math.floor(state.offset / LIMIT) + 1;
    const headingId = `attention-${config.title.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    return _jsxs("section", { className: "my-work-attention__section", "aria-labelledby": headingId, children: [_jsxs("header", { children: [_jsx("h2", { id: headingId, children: config.title }), _jsx("button", { type: "button", onClick: refresh, disabled: state.loading, children: "Refresh" })] }), state.loading && _jsx("p", { role: "status", children: state.page ? "Refreshing…" : "Loading…" }), state.error && _jsxs("div", { className: state.stale ? "my-work-attention__error is-stale" : "my-work-attention__error", role: state.stale ? "status" : "alert", children: [_jsxs("p", { children: [state.stale && state.refreshedAt ? `Stale · last successfully refreshed ${new Date(state.refreshedAt).toLocaleString()}. ` : "", state.error] }), _jsxs("button", { type: "button", onClick: retry, children: ["Retry ", config.title.toLowerCase()] })] }), state.page && (!state.failureStatus || state.stale) && _jsxs(_Fragment, { children: [state.page.items.length === 0 ? _jsx("p", { className: "my-work-attention__empty", children: "Nothing in this list right now." }) : _jsx("ul", { children: state.page.items.map((item) => _jsx("li", { children: _jsxs("a", { href: config.href(item), children: [_jsx("strong", { children: config.label(item) }), _jsx("span", { children: config.description(item) })] }) }, config.itemKey(item))) }), total > LIMIT && _jsxs("nav", { className: "my-work-attention__pager", "aria-label": `${config.title} pages`, children: [_jsx("button", { type: "button", disabled: state.loading || state.stale || state.offset === 0, onClick: () => pageTo(state.offset - LIMIT), children: "Previous" }), _jsxs("span", { children: [state.stale ? "Stale snapshot · " : "", "Showing ", start, "\u2013", end, " of ", total, " \u00B7 Page ", pageNumber, " of ", pages] }), _jsx("button", { type: "button", disabled: state.loading || state.stale || state.offset + LIMIT >= total, onClick: () => pageTo(state.offset + LIMIT), children: "Next" })] })] })] });
}
