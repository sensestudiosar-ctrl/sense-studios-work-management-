import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorkspaceLayout } from "./workspace-navigation.js";
import { ProjectWorkspace } from "./project.js";
export function ProjectsRoute({ readSession }) {
    const [session, setSession] = useState();
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let active = true;
        let generation = 0;
        const refresh = () => { const token = ++generation; void readSession().then((value) => { if (active && token === generation) {
            setSession(value);
            setFailed(false);
        } }).catch(() => { if (active && token === generation)
            setFailed(true); }); };
        const onSessionEnded = () => { generation += 1; if (active) {
            setSession(null);
            setFailed(false);
        } };
        refresh();
        window.addEventListener("sense-session-ended", onSessionEnded);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);
        return () => { active = false; generation += 1; window.removeEventListener("sense-session-ended", onSessionEnded); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
    }, [readSession]);
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view projects" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    const initialProjectId = new URLSearchParams(window.location.search).get("projectId") ?? "";
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content projects-route", children: _jsx(ProjectWorkspace, { csrfToken: session.csrfToken, owner: session.account.kind === "OWNER", listFirst: true, initialProjectId: initialProjectId }) }) }, session.account.id);
}
