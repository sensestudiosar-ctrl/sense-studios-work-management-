import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowSearchParams } from "./use-window-search-params.js";
function dateLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}
export function ApprovalQueue({ title = "Needs your attention", hideWhenEmpty = false }) {
    const [searchParams] = useWindowSearchParams();
    const requestedApprovalId = searchParams.get("approvalId") ?? "";
    const [items, setItems] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState();
    const [loadMoreError, setLoadMoreError] = useState();
    const [selectedError, setSelectedError] = useState();
    const [focusedApprovalId, setFocusedApprovalId] = useState("");
    const [refreshedAt, setRefreshedAt] = useState(undefined);
    const refreshedAtRef = useRef(undefined);
    const [stale, setStale] = useState(false);
    const [confirmedEmptyPage, setConfirmedEmptyPage] = useState(false);
    const queueContext = useRef(requestedApprovalId);
    const requestSequence = useRef(0);
    const loadMoreSequence = useRef(0);
    const loadQueue = useCallback(async () => {
        const request = ++requestSequence.current;
        loadMoreSequence.current++;
        const contextChanged = queueContext.current !== requestedApprovalId;
        queueContext.current = requestedApprovalId;
        setLoading(true);
        setLoadingMore(false);
        setError(undefined);
        setLoadMoreError(undefined);
        setSelectedError(undefined);
        setFocusedApprovalId("");
        if (contextChanged) {
            setItems([]);
            setNextCursor(null);
            refreshedAtRef.current = undefined;
            setRefreshedAt(undefined);
            setStale(false);
        }
        try {
            const response = await fetch("/api/v1/approvals/attention?limit=30", {
                credentials: "include",
                cache: "no-store",
            });
            if (response.status === 401)
                throw new Error("signed-out");
            if (response.status === 403)
                throw new Error("forbidden");
            if (!response.ok)
                throw new Error("unavailable");
            const page = await response.json();
            if (request !== requestSequence.current)
                return;
            setConfirmedEmptyPage(Array.isArray(page.items) && page.items.length === 0 && page.nextCursor === null);
            setItems(Array.isArray(page.items) ? page.items : []);
            setNextCursor(page.nextCursor ?? null);
            refreshedAtRef.current = Date.now();
            setRefreshedAt(refreshedAtRef.current);
            setStale(false);
            if (requestedApprovalId) {
                try {
                    const selectedResponse = await fetch(`/api/v1/approvals/attention/${encodeURIComponent(requestedApprovalId)}`, { credentials: "include", cache: "no-store" });
                    if (request !== requestSequence.current)
                        return;
                    if (selectedResponse.status === 401 || selectedResponse.status === 403) {
                        setItems([]);
                        setNextCursor(null);
                        refreshedAtRef.current = undefined;
                        setRefreshedAt(undefined);
                        setStale(false);
                        setError(selectedResponse.status === 401
                            ? "Your session ended. Sign in again to view pending decisions."
                            : "You don’t have access to this decision queue.");
                    }
                    else if (selectedResponse.status === 404) {
                        setSelectedError("This decision is no longer pending or is unavailable to your account.");
                    }
                    else if (!selectedResponse.ok) {
                        setSelectedError("We couldn’t load the requested decision. Try refreshing the queue.");
                    }
                    else {
                        const selected = await selectedResponse.json();
                        if (request !== requestSequence.current)
                            return;
                        setFocusedApprovalId(selected.id);
                        setItems(current => current.some(item => item.id === selected.id) ? current : [selected, ...current]);
                    }
                }
                catch {
                    if (request === requestSequence.current)
                        setSelectedError("We couldn’t load the requested decision. Try refreshing the queue.");
                }
            }
        }
        catch (cause) {
            if (request !== requestSequence.current)
                return;
            const code = cause instanceof Error ? cause.message : "unavailable";
            if (code === "signed-out" || code === "forbidden") {
                setItems([]);
                setNextCursor(null);
                refreshedAtRef.current = undefined;
                setRefreshedAt(undefined);
                setStale(false);
            }
            else if (!contextChanged && refreshedAtRef.current !== undefined)
                setStale(true);
            setError(code === "signed-out"
                ? "Your session ended. Sign in again to view pending decisions."
                : code === "forbidden"
                    ? "You don’t have access to this decision queue."
                    : "We couldn’t load pending decisions. Try again.");
        }
        finally {
            if (request === requestSequence.current)
                setLoading(false);
        }
    }, [requestedApprovalId]);
    const loadMore = async () => {
        if (!nextCursor || loadingMore)
            return;
        const parentRequest = requestSequence.current;
        const loadRequest = ++loadMoreSequence.current;
        setLoadingMore(true);
        setLoadMoreError(undefined);
        try {
            const response = await fetch(`/api/v1/approvals/attention?limit=30&cursor=${encodeURIComponent(nextCursor)}`, {
                credentials: "include",
                cache: "no-store",
            });
            if (response.status === 401)
                throw new Error("signed-out");
            if (response.status === 403)
                throw new Error("forbidden");
            if (!response.ok)
                throw new Error("unavailable");
            const page = await response.json();
            if (parentRequest !== requestSequence.current || loadRequest !== loadMoreSequence.current)
                return;
            setItems((current) => {
                const seen = new Set(current.map((item) => item.id));
                return [...current, ...(page.items ?? []).filter((item) => !seen.has(item.id))];
            });
            setNextCursor(page.nextCursor ?? null);
        }
        catch (cause) {
            if (parentRequest !== requestSequence.current || loadRequest !== loadMoreSequence.current)
                return;
            const code = cause instanceof Error ? cause.message : "unavailable";
            const message = code === "signed-out"
                ? "Your session ended. Sign in again to view pending decisions."
                : code === "forbidden"
                    ? "You don’t have access to this decision queue."
                    : "We couldn’t load more pending decisions. Try again.";
            if (code === "signed-out" || code === "forbidden") {
                setItems([]);
                setNextCursor(null);
                refreshedAtRef.current = undefined;
                setRefreshedAt(undefined);
                setStale(false);
                setError(message);
            }
            else {
                setLoadMoreError(message);
            }
        }
        finally {
            if (parentRequest === requestSequence.current && loadRequest === loadMoreSequence.current)
                setLoadingMore(false);
        }
    };
    useEffect(() => { void loadQueue(); return () => { requestSequence.current++; }; }, [loadQueue]);
    useEffect(() => {
        if (requestedApprovalId && focusedApprovalId === requestedApprovalId)
            document.getElementById(`approval-${focusedApprovalId}`)?.focus();
    }, [focusedApprovalId, items, requestedApprovalId]);
    const sameContext = queueContext.current === requestedApprovalId;
    const visibleItems = sameContext ? items : [];
    const visibleError = sameContext ? error : undefined;
    const visibleSelectedError = sameContext ? selectedError : undefined;
    const visibleCursor = sameContext ? nextCursor : null;
    const visibleStale = sameContext && stale;
    if (hideWhenEmpty && !requestedApprovalId && sameContext && confirmedEmptyPage && visibleItems.length === 0 && visibleCursor === null && !loading && !loadingMore && !visibleError && !visibleSelectedError && !visibleStale)
        return null;
    return (_jsxs("section", { className: "identity-section approval-queue", "aria-labelledby": "approval-queue-heading", children: [_jsxs("div", { className: "sessions-heading-row", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "MANAGEMENT" }), _jsx("h2", { id: "approval-queue-heading", children: title })] }), _jsx("button", { className: "secondary-action", type: "button", onClick: () => void loadQueue(), disabled: loading, children: loading ? "Refreshing…" : "Refresh" })] }), _jsx("p", { className: "identity-note", children: "Pending actions from your authorized work areas appear here." }), loading && _jsx("p", { className: "identity-note", role: "status", children: "Loading pending decisions\u2026" }), !loading && visibleError && _jsxs("div", { className: "sessions-error", children: [_jsx("p", { className: "auth-error", role: "alert", children: visibleError }), visibleStale && refreshedAt && _jsxs("p", { className: "identity-note", role: "status", children: ["Previous decision data is retained but hidden \u00B7 last successfully refreshed ", new Date(refreshedAt).toLocaleString(), ". It may no longer reflect pending decisions."] }), _jsx("button", { className: "secondary-action", type: "button", onClick: () => void loadQueue(), children: "Try again" })] }), !loading && !visibleError && visibleSelectedError && _jsx("p", { className: "identity-note", role: "status", children: visibleSelectedError }), !loading && !visibleError && visibleItems.length === 0 && _jsxs("div", { className: "approval-queue-empty task-empty-state", role: "status", children: [_jsx("svg", { className: "task-empty-state__icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M4 6h16M7 12h10m-7 6h4" }) }), _jsx("p", { className: "task-empty-state__title", children: "No pending decisions in this list." })] }), !loading && !visibleError && visibleItems.length > 0 && (_jsxs(_Fragment, { children: [_jsx("ul", { className: "approval-queue-list", children: visibleItems.map((item) => (_jsxs("li", { id: `approval-${item.id}`, tabIndex: item.id === focusedApprovalId ? -1 : undefined, "aria-current": item.id === focusedApprovalId ? "true" : undefined, className: `approval-queue-item${item.id === focusedApprovalId ? " is-selected" : ""}`, children: [_jsxs("div", { className: "approval-queue-copy", children: [_jsxs("div", { className: "approval-queue-meta", children: [_jsx("span", { children: item.approvalLevel }), _jsxs("time", { dateTime: item.requestedAt, children: ["Requested ", dateLabel(item.requestedAt)] })] }), _jsx("h3", { children: item.title }), _jsx("p", { className: "approval-queue-summary", children: item.summary }), _jsxs("p", { children: [_jsx("strong", { children: item.subjectLabel }), " \u00B7 Requested by ", item.requesterLabel] }), _jsxs("p", { children: ["Reason: ", item.reason] }), item.expiresAt && _jsxs("p", { className: "approval-queue-expiry", children: ["Decision due ", dateLabel(item.expiresAt)] })] }), _jsx("span", { className: "approval-queue-type", children: item.typeKey })] }, item.id))) }), loadMoreError && _jsx("p", { className: "auth-error", role: "alert", children: loadMoreError }), visibleStale && refreshedAt && _jsxs("p", { className: "identity-note", role: "status", children: ["Previous decision data may no longer reflect pending decisions \u00B7 last successfully refreshed ", new Date(refreshedAt).toLocaleString(), "."] }), visibleCursor && _jsx("button", { className: "secondary-action approval-load-more", type: "button", onClick: () => void loadMore(), disabled: loadingMore, children: loadingMore ? "Loading…" : "Load more" })] }))] }));
}
