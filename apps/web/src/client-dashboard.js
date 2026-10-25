import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { ClientProjectGallery } from "./gallery.js";
import "./client-dashboard.css";
const API = "/api/v1/client-portal";
async function get(path, signal) {
    const response = await fetch(`${API}${path}`, { credentials: "include", cache: "no-store", signal });
    if (!response.ok)
        throw new Error(String(response.status));
    return await response.json();
}
export function ClientDashboard({ session, initialProjectId }) {
    const [projects, setProjects] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [workspace, setWorkspace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        setWorkspace(null);
        setProjects([]);
        setSelectedId("");
        void get("/projects", controller.signal).then(result => {
            if (controller.signal.aborted)
                return;
            setProjects(result.projects);
            if (initialProjectId && !result.projects.some(project => project.id === initialProjectId)) {
                setError("This project is not available under your current access.");
                setLoading(false);
                return;
            }
            setSelectedId(initialProjectId ?? result.projects[0]?.id ?? "");
            if (!result.projects.length)
                setLoading(false);
        }).catch(() => { if (!controller.signal.aborted) {
            setError("Your shared projects could not be loaded. Refresh to try again.");
            setLoading(false);
        } });
        return () => controller.abort();
    }, [session.account.id, retry, initialProjectId]);
    useEffect(() => {
        if (!selectedId) {
            setWorkspace(null);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError("");
        setWorkspace(null);
        void get(`/reviews/projects/${encodeURIComponent(selectedId)}`, controller.signal)
            .then(value => { if (!controller.signal.aborted)
            setWorkspace(value); })
            .catch(() => { if (!controller.signal.aborted) {
            setError("This project summary is unavailable under your current access. Refresh or choose another shared project.");
            setWorkspace(null);
        } })
            .finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, [selectedId, session.account.id, retry]);
    const project = projects.find(value => value.id === selectedId);
    const packages = workspace?.packages ?? [];
    const visible = packages.flatMap(pack => pack.items.filter(item => item.permissions?.view || item.permissions?.review || item.permissions?.approve || item.permissions?.download).map(item => ({ ...item, packageTitle: pack.title, packageStatus: pack.status })));
    const approved = visible.filter(item => item.status === "APPROVED").length;
    const recentPackages = [...packages].sort((a, b) => new Date(b.submittedAt ?? b.createdAt ?? 0).getTime() - new Date(a.submittedAt ?? a.createdAt ?? 0).getTime()).slice(0, 5);
    const pending = visible.filter(item => item.status === "PENDING" || item.status === "IN_REVIEW").filter(item => item.permissions?.review || item.permissions?.approve);
    return _jsxs("section", { className: "client-dashboard", "aria-labelledby": "client-dashboard-heading", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("p", { className: "client-dashboard-kicker", children: "SHARED PROJECT OVERVIEW" }), _jsx("h2", { id: "client-dashboard-heading", children: "Project dashboard" }), _jsx("p", { children: "Project details and shared review items available to your client account." })] }), _jsx("button", { type: "button", className: "client-portal-secondary", onClick: () => setRetry(value => value + 1), disabled: loading, children: "Refresh" })] }), error && _jsx("p", { className: "client-dashboard-error", role: "alert", children: error }), loading && _jsx("p", { className: "client-dashboard-muted", role: "status", children: "Loading shared project details\u2026" }), !loading && !error && projects.length === 0 && _jsx("p", { className: "client-dashboard-muted", role: "status", children: "No projects are currently shared with your account." }), !loading && !error && projects.length > 0 && _jsxs(_Fragment, { children: [_jsxs("label", { className: "client-dashboard-project", children: ["Project", _jsx("select", { value: selectedId, onChange: event => setSelectedId(event.target.value), children: projects.map(item => _jsx("option", { value: item.id, children: item.title }, item.id)) })] }), workspace && project && _jsxs(_Fragment, { children: [_jsxs("div", { className: "client-dashboard-cards", children: [_jsxs("article", { children: [_jsx("span", { children: "Project status" }), _jsx("strong", { children: project.status })] }), _jsxs("article", { children: [_jsx("span", { children: "Shared approvals" }), _jsxs("strong", { children: [approved, " / ", visible.length] }), _jsx("small", { children: "Approved items among items shared with your account." })] })] }), _jsxs("div", { className: "client-dashboard-grid", children: [_jsxs("article", { children: [_jsx("h3", { children: "Recent submitted packages" }), recentPackages.length ? _jsx("ul", { children: recentPackages.map(pack => _jsxs("li", { children: [_jsx("strong", { children: pack.title }), _jsx("span", { children: pack.status })] }, pack.id)) }) : _jsx("p", { className: "client-dashboard-muted", children: "No review packages are currently shared." })] }), _jsxs("article", { children: [_jsx("h3", { children: "Reviews available to you" }), pending.length ? _jsx("ul", { children: pending.map(item => _jsxs("li", { children: [_jsx("strong", { children: item.label }), _jsxs("span", { children: [item.packageTitle, " \u00B7 ", item.status] })] }, item.id)) }) : _jsx("p", { className: "client-dashboard-muted", children: "No shared review or approval items need your action." })] })] }), _jsxs("article", { className: "client-dashboard-files", children: [_jsx("h3", { children: "Approved shared items" }), visible.filter(item => item.status === "APPROVED").length ? _jsx("ul", { children: visible.filter(item => item.status === "APPROVED").map(item => _jsxs("li", { children: [_jsx("strong", { children: item.label }), _jsx("span", { children: item.revision?.label ?? "Approved shared item" })] }, item.id)) }) : _jsx("p", { className: "client-dashboard-muted", children: "No approved shared items are available." })] }), _jsx(ClientProjectGallery, { projectId: selectedId, session: session })] })] })] });
}
