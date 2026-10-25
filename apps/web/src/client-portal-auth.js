import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthFrame } from "./auth-flow.js";
import { startRegistration } from "@simplewebauthn/browser";
import "./client-portal-auth.css";
import { ClientReviewPortal } from "./client-review.js";
import { ClientDashboard } from "./client-dashboard.js";
const portalAuthPath = "/api/v1/client-portal/auth";
const portalPath = "/api/v1/client-portal";
class PortalRequestError extends Error {
    status;
    constructor(status) {
        super("Client portal request failed");
        this.status = status;
    }
}
async function portalRequest(path, init = {}) {
    const headers = {};
    if (init.body !== undefined)
        headers["Content-Type"] = "application/json";
    if (init.csrfToken)
        headers["X-CSRF-Token"] = init.csrfToken;
    const response = await fetch(`${portalAuthPath}${path}`, {
        method: init.method ?? "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers,
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {})
    });
    if (!response.ok)
        throw new PortalRequestError(response.status);
    if (response.status === 204)
        return undefined;
    return await response.json();
}
async function portalDataRequest(path) {
    const response = await fetch(`${portalPath}${path}`, { credentials: "include", cache: "no-store" });
    if (!response.ok)
        throw new PortalRequestError(response.status);
    return await response.json();
}
function safeRequestMessage(error, fallback) {
    if (error instanceof PortalRequestError && error.status === 401)
        return "Your session expired or access was revoked. Sign in again to continue.";
    if (error instanceof PortalRequestError && error.status === 403)
        return "Your session could not verify this request. Sign in again and retry.";
    return fallback;
}
function dateLabel(value) {
    const time = new Date(value);
    return Number.isNaN(time.getTime()) ? "Time unavailable" : time.toLocaleString();
}
export function ClientPortalAuth({ accountOnly = false, onSessionEnded } = {}) {
    const [session, setSession] = useState();
    const [sessionNotice, setSessionNotice] = useState("");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [codeRequested, setCodeRequested] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const [authError, setAuthError] = useState("");
    const [authStatus, setAuthStatus] = useState("");
    const [passkeyBusy, setPasskeyBusy] = useState(false);
    const [passkeyMessage, setPasskeyMessage] = useState("");
    const [passkeyError, setPasskeyError] = useState("");
    const [deviceSessions, setDeviceSessions] = useState(null);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsError, setSessionsError] = useState("");
    const [revokingId, setRevokingId] = useState("");
    const [logoutBusy, setLogoutBusy] = useState(false);
    const [businessOpen, setBusinessOpen] = useState(false);
    const [costsOpen, setCostsOpen] = useState(false);
    const [dashboardOpen, setDashboardOpen] = useState(false);
    useEffect(() => { if (session === null)
        onSessionEnded?.(); }, [session, onSessionEnded]);
    const restoreSession = useCallback(async () => {
        try {
            const current = await portalRequest("/session");
            if (current.account.kind !== "CLIENT")
                throw new PortalRequestError(403);
            setSession(current);
            setSessionNotice("");
            return current;
        }
        catch (error) {
            if (error instanceof PortalRequestError && error.status === 401) {
                setSession(null);
                setSessionNotice("Your session expired or access was revoked. Sign in again to continue.");
                return null;
            }
            throw error;
        }
    }, []);
    useEffect(() => {
        let live = true;
        void portalRequest("/session")
            .then((current) => {
            if (!live)
                return;
            if (current.account.kind !== "CLIENT")
                throw new PortalRequestError(403);
            setSession(current);
        })
            .catch((error) => {
            if (!live)
                return;
            if (error instanceof PortalRequestError && error.status === 401)
                setSession(null);
            else {
                setSession(null);
                setAuthError("We couldn’t check your client portal session. Try again.");
            }
        });
        return () => { live = false; };
    }, []);
    const loadDeviceSessions = useCallback(async () => {
        setSessionsLoading(true);
        setSessionsError("");
        try {
            const rows = await portalRequest("/sessions");
            setDeviceSessions(rows);
        }
        catch (error) {
            setDeviceSessions(null);
            setSessionsError(safeRequestMessage(error, "We couldn’t load your sessions. Try again."));
            if (error instanceof PortalRequestError && error.status === 401) {
                setSession(null);
                setSessionNotice("Your session expired or access was revoked. Sign in again to continue.");
            }
        }
        finally {
            setSessionsLoading(false);
        }
    }, []);
    useEffect(() => {
        if (session)
            void loadDeviceSessions();
    }, [loadDeviceSessions, session]);
    const requestCode = async (event) => {
        event.preventDefault();
        setAuthBusy(true);
        setAuthError("");
        setAuthStatus("");
        try {
            await portalRequest("/code/request", { method: "POST", body: { email: email.trim() } });
            setCodeRequested(true);
            setCode("");
            setAuthStatus("If this address has access, a code has been sent.");
        }
        catch {
            setAuthError("We couldn’t request a sign-in code. Check your connection and try again.");
        }
        finally {
            setAuthBusy(false);
        }
    };
    const verifyCode = async (event) => {
        event.preventDefault();
        setAuthBusy(true);
        setAuthError("");
        setAuthStatus("");
        try {
            await portalRequest("/code/verify", { method: "POST", body: { email: email.trim(), code } });
            setCode("");
            const restored = await restoreSession();
            if (!restored)
                throw new PortalRequestError(401);
            setCodeRequested(false);
            setAuthStatus("You’re signed in to the client portal.");
        }
        catch (error) {
            setAuthError(error instanceof PortalRequestError && error.status === 401
                ? "That code could not be verified. Request a new code and try again."
                : "We couldn’t complete sign-in. Request a new code and try again.");
        }
        finally {
            setAuthBusy(false);
        }
    };
    const signOut = async () => {
        if (!session || logoutBusy)
            return;
        setLogoutBusy(true);
        setAuthError("");
        try {
            await portalRequest("/logout", { method: "POST", csrfToken: session.csrfToken });
            setSession(null);
            setDeviceSessions(null);
            setCostsOpen(false);
            setCodeRequested(false);
            setAuthStatus("You’ve signed out.");
            setSessionNotice("");
        }
        catch (error) {
            setAuthError(safeRequestMessage(error, "We couldn’t sign out. Try again."));
            if (error instanceof PortalRequestError && error.status === 401) {
                setSession(null);
                setSessionNotice("Your session expired or access was revoked. Sign in again to continue.");
            }
        }
        finally {
            setLogoutBusy(false);
        }
    };
    const registerPasskey = async () => {
        if (!session || passkeyBusy)
            return;
        setPasskeyBusy(true);
        setPasskeyError("");
        setPasskeyMessage("");
        try {
            const ceremony = await portalRequest("/passkeys/options", { method: "POST", body: {}, csrfToken: session.csrfToken });
            const response = await startRegistration({ optionsJSON: ceremony.options });
            await portalRequest("/passkeys/verify", { method: "POST", body: { ceremonyId: ceremony.ceremonyId, response }, csrfToken: session.csrfToken });
            const restored = await restoreSession();
            if (!restored)
                throw new PortalRequestError(401);
            setPasskeyMessage("Passkey registered.");
        }
        catch (error) {
            if (error instanceof Error && error.name === "NotAllowedError")
                setPasskeyError("Passkey registration was cancelled.");
            else if (error instanceof PortalRequestError && error.status === 401) {
                setSession(null);
                setSessionNotice("Your session expired or access was revoked. Sign in again to continue.");
                setPasskeyError("Your session ended. Sign in again to register a passkey.");
            }
            else
                setPasskeyError(safeRequestMessage(error, "We couldn’t register a passkey. Try again."));
        }
        finally {
            setPasskeyBusy(false);
        }
    };
    const revokeSession = async (device) => {
        if (!session || !device.id || revokingId)
            return;
        setRevokingId(device.id);
        setSessionsError("");
        setAuthStatus("");
        try {
            await portalRequest(`/sessions/${encodeURIComponent(device.id)}`, { method: "DELETE", csrfToken: session.csrfToken });
            const restored = await restoreSession();
            if (!restored) {
                setDeviceSessions(null);
                setSessionNotice("This session was revoked. Sign in again to continue.");
                return;
            }
            setAuthStatus("Session revoked.");
        }
        catch (error) {
            setSessionsError(safeRequestMessage(error, "We couldn’t revoke that session. Refresh the list and try again."));
            if (error instanceof PortalRequestError && error.status === 401) {
                setSession(null);
                setDeviceSessions(null);
                setSessionNotice("Your session expired or access was revoked. Sign in again to continue.");
            }
        }
        finally {
            setRevokingId("");
        }
    };
    if (session === undefined) {
        return _jsx("main", { className: "client-portal-auth", children: _jsx("p", { className: "client-portal-status", role: "status", children: "Checking your client portal session\u2026" }) });
    }
    if (!session) {
        return (_jsxs(AuthFrame, { audience: "CLIENT PORTAL", title: "Client portal sign in", intro: "Use the email address invited to your project. We\u2019ll email a one-time sign-in code.", children: [sessionNotice && _jsx("p", { className: "client-portal-notice", role: "status", children: sessionNotice }), _jsxs("form", { className: "client-portal-form", onSubmit: requestCode, children: [_jsx("label", { htmlFor: "client-portal-email", children: "Email address" }), _jsx("input", { id: "client-portal-email", name: "email", type: "email", autoComplete: "email", required: true, maxLength: 320, value: email, onChange: (event) => setEmail(event.target.value), disabled: authBusy }), _jsx("button", { type: "submit", disabled: authBusy || !email.trim(), children: authBusy ? "Sending…" : codeRequested ? "Send another code" : "Send sign-in code" })] }), codeRequested && (_jsxs("form", { className: "client-portal-form client-portal-code-form", onSubmit: verifyCode, children: [_jsx("label", { htmlFor: "client-portal-code", children: "One-time code" }), _jsx("input", { id: "client-portal-code", name: "code", type: "text", inputMode: "numeric", autoComplete: "one-time-code", pattern: "[0-9]{6}", maxLength: 6, required: true, value: code, onChange: (event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6)), disabled: authBusy }), _jsx("button", { type: "submit", disabled: authBusy || code.length !== 6, children: authBusy ? "Checking…" : "Continue" })] })), authStatus && _jsx("p", { className: "client-portal-success", role: "status", children: authStatus }), authError && _jsx("p", { className: "client-portal-error", role: "alert", children: authError }), _jsx("p", { className: "auth-flow-help", children: "Missing your code? Check your spam folder and confirm your email address. If you still need help, contact your studio project team." }), _jsx("a", { className: "auth-flow-back", href: "/sign-in", children: "Other sign-in options" })] }));
    }
    return (_jsx("main", { className: "client-portal-auth", children: _jsxs("section", { className: "client-portal-card client-portal-signed-in", "aria-labelledby": "client-portal-title", children: [_jsxs("header", { className: "client-portal-header", children: [_jsxs("div", { children: [_jsx("p", { className: "client-portal-eyebrow", children: "Sense Studios" }), _jsx("h1", { id: "client-portal-title", children: "Client portal account" }), _jsx("p", { className: "client-portal-identity", children: session.account.email })] }), _jsx("button", { className: "client-portal-secondary", type: "button", onClick: () => void signOut(), disabled: logoutBusy, children: logoutBusy ? "Signing out…" : "Sign out" })] }), _jsx("p", { className: "client-portal-intro", children: "Manage sign-in security and active sessions for this client account." }), !accountOnly && _jsxs("section", { className: "client-portal-business-nav", "aria-label": "Client project workspace", children: [_jsx("button", { type: "button", className: "client-portal-secondary", "aria-expanded": dashboardOpen, onClick: () => setDashboardOpen((open) => !open), children: dashboardOpen ? "Hide project dashboard" : "Open project dashboard" }), _jsx("button", { type: "button", className: "client-portal-secondary", "aria-expanded": businessOpen, onClick: () => setBusinessOpen((open) => !open), children: businessOpen ? "Hide project reviews" : "Open project reviews" }), _jsx("button", { type: "button", className: "client-portal-secondary", "aria-expanded": costsOpen, onClick: () => setCostsOpen((open) => !open), children: costsOpen ? "Hide approved cost snapshots" : "View approved cost snapshots" })] }), dashboardOpen && _jsx(ClientDashboard, { session: session }), businessOpen && _jsx(ClientReviewPortal, { session: session }), costsOpen && _jsx(ClientApprovedCostSnapshots, {}), authStatus && _jsx("p", { className: "client-portal-success", role: "status", children: authStatus }), authError && _jsx("p", { className: "client-portal-error", role: "alert", children: authError }), _jsxs("section", { className: "client-portal-security", "aria-labelledby": "client-security-title", children: [_jsxs("div", { className: "client-portal-section-heading", children: [_jsxs("div", { children: [_jsx("h2", { id: "client-security-title", children: "Account security" }), _jsxs("p", { children: [session.activePasskeyCount, " registered passkey", session.activePasskeyCount === 1 ? "" : "s"] })] }), _jsx("button", { type: "button", onClick: () => void registerPasskey(), disabled: passkeyBusy, children: passkeyBusy ? "Registering…" : "Register a passkey" })] }), _jsx("p", { className: "client-portal-muted", children: "A passkey is required for formal approval actions." }), passkeyMessage && _jsx("p", { className: "client-portal-success", role: "status", children: passkeyMessage }), passkeyError && _jsx("p", { className: "client-portal-error", role: "alert", children: passkeyError })] }), _jsxs("section", { className: "client-portal-sessions", "aria-labelledby": "client-sessions-title", children: [_jsxs("div", { className: "client-portal-section-heading", children: [_jsxs("div", { children: [_jsx("h2", { id: "client-sessions-title", children: "Sessions" }), _jsx("p", { children: "Sign out devices you no longer use." })] }), _jsx("button", { className: "client-portal-secondary", type: "button", onClick: () => void loadDeviceSessions(), disabled: sessionsLoading, children: sessionsLoading ? "Refreshing…" : "Refresh" })] }), sessionsLoading && _jsx("p", { className: "client-portal-muted", role: "status", children: "Loading sessions\u2026" }), sessionsError && _jsxs("div", { className: "client-portal-error-block", children: [_jsx("p", { className: "client-portal-error", role: "alert", children: sessionsError }), _jsx("button", { className: "client-portal-secondary", type: "button", onClick: () => void loadDeviceSessions(), children: "Try again" })] }), !sessionsLoading && !sessionsError && deviceSessions?.length === 0 && _jsx("p", { className: "client-portal-empty", role: "status", children: "No sessions are available." }), !sessionsLoading && !sessionsError && deviceSessions && deviceSessions.length > 0 && (_jsx("ul", { className: "client-portal-session-list", children: deviceSessions.map((device) => (_jsxs("li", { children: [_jsxs("div", { className: "client-portal-session-copy", children: [_jsx("strong", { children: device.current ? "This device" : device.userAgent || "Client portal session" }), _jsxs("span", { children: ["Last active ", dateLabel(device.lastUsedAt)] }), _jsxs("span", { children: ["Expires ", dateLabel(device.expiresAt)] }), device.revokedAt && _jsxs("span", { className: "client-portal-revoked", children: ["Revoked ", dateLabel(device.revokedAt)] })] }), !device.revokedAt && _jsx("button", { className: "client-portal-secondary", type: "button", onClick: () => void revokeSession(device), disabled: Boolean(revokingId), children: revokingId === device.id ? "Revoking…" : "Revoke" })] }, device.id))) }))] })] }) }));
}
export function ClientApprovedCostSnapshots() {
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState("");
    const [snapshots, setSnapshots] = useState(null);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingCosts, setLoadingCosts] = useState(false);
    const [error, setError] = useState("");
    const requestSequence = useRef(0);
    const loadSnapshots = useCallback(async (id) => {
        const sequence = ++requestSequence.current;
        if (!id) {
            setSnapshots([]);
            return;
        }
        setLoadingCosts(true);
        setError("");
        setSnapshots(null);
        try {
            const result = await portalDataRequest(`/projects/${encodeURIComponent(id)}/costs`);
            if (sequence === requestSequence.current)
                setSnapshots(result.items);
        }
        catch (cause) {
            if (sequence === requestSequence.current) {
                setSnapshots(null);
                setError(cause instanceof PortalRequestError && cause.status === 403
                    ? "These cost details are no longer available or were not shared with this account."
                    : "Approved cost snapshots could not be loaded. Try again.");
            }
        }
        finally {
            if (sequence === requestSequence.current)
                setLoadingCosts(false);
        }
    }, []);
    useEffect(() => {
        let live = true;
        void portalDataRequest("/projects")
            .then((result) => {
            if (!live)
                return;
            setProjects(result.projects);
            const firstId = result.projects[0]?.id ?? "";
            setProjectId(firstId);
            if (firstId)
                void loadSnapshots(firstId);
            else
                setSnapshots([]);
        })
            .catch(() => { if (live) {
            setProjects([]);
            setSnapshots(null);
            setError("Approved cost snapshots could not be loaded. Try again.");
        } })
            .finally(() => { if (live)
            setLoadingProjects(false); });
        return () => { live = false; };
    }, [loadSnapshots]);
    return (_jsxs("section", { className: "client-portal-sessions", "aria-labelledby": "client-costs-title", children: [_jsxs("div", { className: "client-portal-section-heading", children: [_jsxs("div", { children: [_jsx("h2", { id: "client-costs-title", children: "Approved cost snapshots" }), _jsx("p", { children: "Only approved costs explicitly shared with your account appear here." })] }), _jsx("button", { className: "client-portal-secondary", type: "button", onClick: () => void loadSnapshots(projectId), disabled: loadingProjects || loadingCosts || !projectId, children: loadingCosts ? "Refreshing…" : "Refresh" })] }), loadingProjects && _jsx("p", { className: "client-portal-muted", role: "status", children: "Loading projects\u2026" }), !loadingProjects && projects.length === 0 && !error && _jsx("p", { className: "client-portal-empty", role: "status", children: "No projects are available." }), !loadingProjects && projects.length > 0 && (_jsxs("div", { className: "client-portal-form", children: [_jsx("label", { htmlFor: "client-cost-project", children: "Project" }), _jsx("select", { id: "client-cost-project", value: projectId, onChange: (event) => { const id = event.target.value; setProjectId(id); void loadSnapshots(id); }, children: projects.map((project) => _jsx("option", { value: project.id, children: project.title }, project.id)) })] })), loadingCosts && _jsx("p", { className: "client-portal-muted", role: "status", children: "Loading approved cost snapshots\u2026" }), error && _jsxs("div", { className: "client-portal-error-block", children: [_jsx("p", { className: "client-portal-error", role: "alert", children: error }), _jsx("button", { className: "client-portal-secondary", type: "button", onClick: () => void loadSnapshots(projectId), disabled: loadingCosts || !projectId, children: "Try again" })] }), !loadingProjects && !loadingCosts && !error && snapshots?.length === 0 && _jsx("p", { className: "client-portal-empty", role: "status", children: "No approved cost snapshots have been shared with this account." }), !loadingCosts && !error && snapshots && snapshots.length > 0 && (_jsx("ul", { className: "client-portal-session-list", children: snapshots.map((snapshot) => (_jsx("li", { children: _jsxs("div", { className: "client-portal-session-copy", children: [_jsxs("strong", { children: ["Approved cost snapshot \u00B7 ", snapshot.currency] }), _jsxs("span", { children: ["Snapshot recorded ", dateLabel(snapshot.createdAt)] }), _jsx("ul", { className: "client-portal-cost-lines", children: snapshot.lines.map((line) => {
                                    const price = snapshot.costs.prices.find((entry) => entry.key === line.key);
                                    return _jsxs("li", { children: [_jsxs("span", { children: [line.description, ": ", line.quantity, " ", line.unit] }), price && _jsxs("span", { children: [price.unitPrice, " ", snapshot.currency, " per ", line.unit] })] }, line.key);
                                }) }), _jsxs("strong", { children: ["Total: ", snapshot.costs.total, " ", snapshot.currency] })] }) }, snapshot.id))) }))] }));
}
