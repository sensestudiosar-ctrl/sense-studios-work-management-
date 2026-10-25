import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export function ConfirmedDrawings({ projectId, onSessionExpired }) {
    const [state, setState] = useState({ projectId });
    const [refresh, setRefresh] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setState({ projectId });
        void (async () => {
            try {
                const response = await fetch(`/api/v1/reviews/projects/${encodeURIComponent(projectId)}/confirmed-drawings`, { credentials: "include", cache: "no-store", signal: controller.signal });
                if (controller.signal.aborted)
                    return;
                if (response.status === 401) {
                    onSessionExpired();
                    return;
                }
                if (!response.ok)
                    throw new Error("unavailable");
                const body = await response.json();
                if (!controller.signal.aborted)
                    setState({ projectId, items: body.items });
            }
            catch {
                if (!controller.signal.aborted)
                    setState({ projectId, error: "Confirmed drawings could not be loaded with your current access." });
            }
        })();
        return () => controller.abort();
    }, [projectId, refresh, onSessionExpired]);
    const current = state.projectId === projectId ? state : { projectId };
    return _jsxs("section", { className: "project-resource-summary", "aria-label": "Confirmed drawings", children: [_jsx("h4", { children: "Confirmed drawings" }), _jsx("p", { children: "Exact files and links with the Primary Client\u2019s final approval." }), current.error ? _jsxs(_Fragment, { children: [_jsx("p", { role: "alert", children: current.error }), _jsx("button", { type: "button", onClick: () => setRefresh(value => value + 1), children: "Retry confirmed drawings" })] }) : !current.items ? _jsx("p", { role: "status", children: "Loading confirmed drawings\u2026" }) : current.items.length === 0 ? _jsx("p", { children: "No finally approved drawings, files or links yet." }) : _jsx("ul", { children: current.items.map(item => _jsxs("li", { children: [_jsx("strong", { children: item.label }), _jsxs("p", { children: [item.kind === "LINK" ? "Approved link" : item.kind === "DRAWING" ? "Approved drawing" : "Approved file", " \u00B7 ", new Date(item.approvedAt).toLocaleDateString(), " \u00B7 ", item.signatureName] }), item.kind === "LINK" ? _jsxs(_Fragment, { children: [_jsx("a", { href: item.url, target: "_blank", rel: "noopener noreferrer", children: "Open approved link" }), _jsx("p", { children: "External content may change; the approved URL is preserved." })] }) : item.fileId && _jsx("a", { href: `/api/v1/documents/files/${encodeURIComponent(item.fileId)}/stream`, children: "Open approved file" })] }, item.id)) })] });
}
