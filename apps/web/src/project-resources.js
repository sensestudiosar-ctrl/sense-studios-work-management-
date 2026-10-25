import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const PREVIEW_LIMIT = 5;
const waitingReviewQuery = (projectId) => new URLSearchParams({ projectId, scope: "accessible", queue: "waiting", sort: "due", offset: "0", limit: String(PREVIEW_LIMIT) }).toString();
function object(value) { return typeof value === "object" && value !== null && !Array.isArray(value); }
function text(value) { return typeof value === "string" && value.trim().length > 0; }
function readSummary(body, projectId, kind) {
    if (!object(body))
        throw new Error("response");
    if (kind === "documents") {
        if (!object(body.project) || body.project.id !== projectId || !Array.isArray(body.files))
            throw new Error("response");
        const ids = new Set();
        const items = body.files.map((row) => {
            if (!object(row) || !text(row.id) || ids.has(row.id) || !text(row.fileName) || typeof row.viewOnly !== "boolean")
                throw new Error("response");
            ids.add(row.id);
            return { id: row.id, label: row.fileName, detail: row.viewOnly ? "View only" : "File" };
        });
        return { total: items.length, items: items.slice(0, PREVIEW_LIMIT) };
    }
    if (!Number.isSafeInteger(body.total) || body.total < 0 || !Array.isArray(body.items) || body.items.length > PREVIEW_LIMIT || body.total < body.items.length)
        throw new Error("response");
    const ids = new Set();
    const items = body.items.map((row) => {
        if (!object(row) || row.projectId !== projectId || !text(row.roundId) || ids.has(row.roundId) || !text(row.taskId) || !text(row.taskTitle) || !Number.isSafeInteger(row.roundNumber) || row.roundNumber < 1 || !["SUBMITTED", "IN_REVIEW"].includes(String(row.status)))
            throw new Error("response");
        ids.add(row.roundId);
        const query = new URLSearchParams({ projectId, scope: "accessible", queue: "waiting", sort: "due", taskId: row.taskId, roundId: row.roundId });
        return { id: row.roundId, label: row.taskTitle, detail: `Round ${row.roundNumber} · ${row.status === "IN_REVIEW" ? "In review" : "Submitted"}`, href: `/reviews?${query}` };
    });
    return { total: body.total, items };
}
/** Compose only existing authorized reads; all commands remain in owning workspaces. */
export function ProjectResourceSummary({ projectId, kind, onSessionExpired }) {
    const context = `${kind}:${projectId}`;
    const [state, setState] = useState({ context });
    const [refresh, setRefresh] = useState(0);
    useEffect(() => {
        let active = true;
        let ended = false;
        let generation = 0;
        let controller;
        const load = async () => {
            if (ended)
                return;
            const request = ++generation;
            controller?.abort();
            controller = new AbortController();
            setState({ context });
            try {
                const url = kind === "documents" ? `/api/v1/documents/projects/${encodeURIComponent(projectId)}` : `/api/v1/reviews/inbox?${waitingReviewQuery(projectId)}`;
                const response = await fetch(url, { credentials: "include", cache: "no-store", signal: controller.signal });
                if (!active || ended || generation !== request)
                    return;
                if (!response.ok) {
                    if (response.status === 401) {
                        endSession();
                        onSessionExpired();
                        return;
                    }
                    if (response.status === 403 || response.status === 404) {
                        setState({ context, error: `These ${kind} are unavailable with your current access.` });
                        return;
                    }
                    throw new Error("request");
                }
                const summary = readSummary(await response.json(), projectId, kind);
                if (active && !ended && generation === request)
                    setState({ context, summary });
            }
            catch {
                if (active && !ended && generation === request)
                    setState({ context, error: `Could not load ${kind}. Try again.` });
            }
        };
        const endSession = () => { ended = true; ++generation; controller?.abort(); setState({ context, ended: true }); };
        const focus = () => { if (document.visibilityState !== "hidden")
            void load(); };
        window.addEventListener("sense-session-ended", endSession);
        window.addEventListener("focus", focus);
        document.addEventListener("visibilitychange", focus);
        void load();
        return () => { active = false; ++generation; controller?.abort(); window.removeEventListener("sense-session-ended", endSession); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); };
    }, [context, kind, projectId, refresh, onSessionExpired]);
    const current = state.context === context ? state : undefined;
    const summary = current?.summary;
    const title = kind === "documents" ? "Accessible files" : "Waiting internal review rounds";
    return _jsx("div", { className: "project-resource-summary", role: "group", "aria-label": title, "aria-busy": !summary && !current?.error && !current?.ended, children: current?.ended ? _jsxs("p", { role: "alert", children: ["Your session ended. Sign in again to view ", kind, "."] }) : current?.error ? _jsxs("div", { className: "project-resource-error", children: [_jsx("p", { role: "alert", children: current.error }), _jsxs("button", { type: "button", onClick: () => setRefresh(value => value + 1), children: ["Retry ", kind] })] }) : summary ? _jsxs(_Fragment, { children: [_jsxs("p", { className: "project-resource-count", children: [_jsx("strong", { children: summary.total }), " ", kind === "documents" ? "files available to you" : "waiting review rounds available to you"] }), summary.items.length ? _jsxs(_Fragment, { children: [_jsx("p", { className: "project-resource-caption", children: kind === "documents" ? `Latest ${summary.items.length} accessible files` : `Showing ${summary.items.length} of ${summary.total}, earliest due first` }), _jsx("ul", { className: "project-resource-list", children: summary.items.map(item => _jsx("li", { children: _jsxs("span", { children: [item.href ? _jsx("a", { href: item.href, children: item.label }) : _jsx("strong", { children: item.label }), _jsx("small", { children: item.detail })] }) }, item.id)) })] }) : _jsxs("p", { children: ["No ", kind === "documents" ? "files" : "waiting internal review rounds", " available to you in this project."] })] }) : _jsxs("p", { role: "status", children: ["Loading ", kind, "\u2026"] }) });
}
