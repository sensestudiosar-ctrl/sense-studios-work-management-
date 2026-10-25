import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { NotificationCenter } from "./notifications.js";
import { SignInHub, StaffRecovery } from "./auth-flow.js";
import { SessionGroups } from "./session-groups.js";
import { AuditRetentionCenter } from "./audit-retention.js";
import { ApprovalQueue } from "./approval-queue.js";
import { MyWorkManagement } from "./my-work-attention.js";
import { ProjectsRoute } from "./projects-route.js";
import { WorkspaceHeader, WorkspaceLayout, workspaceContextLabel } from "./workspace-navigation.js";
import { CrmWorkspace } from "./crm.js";
import { ProjectWorkspace } from "./project.js";
import { TaskWorkspace } from "./task.js";
import { DocumentWorkspace } from "./document.js";
import { RevisionWorkspace } from "./revision.js";
import { ReviewWorkspace } from "./review.js";
import { StaffClientReviewWorkspace } from "./client-review.js";
import { TurnkeyWorkspace } from "./turnkey.js";
import { TimeWorkspace } from "./time.js";
import { WorkforceWorkspace } from "./workforce.js";
import { PerformanceWorkspace } from "./performance.js";
import { DashboardWorkspace } from "./dashboard.js";
import { SiteWorkspace } from "./site.js";
import { SiteOfflineCaptureRoute } from "./site-offline-capture.js";
import { clearOfflinePointer, purgeOfflineAccount, purgeOtherOfflineAccounts, readOfflinePointer } from "./site-offline.js";
import { StaffExternalAccessWorkspace } from "./external-portal.js";
import { IntegrationsWorkspace } from "./integrations.js";
import { AutomationWorkspace } from "./automation.js";
import { AiAssistanceWorkspace } from "./ai-assistance.js";
import { SkillsTrainingWorkspace, SkillsWorkspace } from "./learning.js";
import { TrainingWorkspace } from "./learning-training.js";
import { LibraryWorkspace } from "./library-workspace.js";
import { InsightsNavigation } from "./insights-navigation.js";
import { DecisionsHome, SettingsSectionNavigation } from "./settings-homes.js";
import { OrganizationAdmin, TeamWorkspace } from "./organization-admin.js";
import { PeopleSelf } from "./people-self.js";
import { passkeyRegistrationError } from "./passkey-registration-error.js";
const AUTH_PATH = "/api/v1/auth";
async function readSession() {
    const response = await fetch(`${AUTH_PATH}/session`, {
        credentials: "include",
        cache: "no-store",
    });
    if (response.status === 401) {
        const pointer = readOfflinePointer();
        clearOfflinePointer();
        window.dispatchEvent(new Event("sense-session-ended"));
        if (pointer)
            await purgeOfflineAccount(pointer.accountId).catch(() => undefined);
        return null;
    }
    if (!response.ok)
        throw new Error("session-unavailable");
    const session = (await response.json());
    const offlinePointer = readOfflinePointer();
    if (offlinePointer && offlinePointer.accountId !== session.account.id) {
        clearOfflinePointer(offlinePointer.accountId);
        window.dispatchEvent(new Event("sense-session-ended"));
        await purgeOfflineAccount(offlinePointer.accountId).catch(() => undefined);
    }
    await purgeOtherOfflineAccounts(session.account.id).catch(() => undefined);
    return session;
}
function errorMessage(error) {
    switch (error) {
        case "invalid": return "We couldn’t sign you in. Check your passkey and try again.";
        case "throttled": return "Too many attempts. Wait a moment, then try again.";
        case "cancelled": return "The passkey request was cancelled. You can try again when ready.";
        case "network": return "We couldn’t reach the sign-in service. Check your connection and try again.";
        case "unavailable": return "Sign-in is temporarily unavailable. Try again shortly.";
        case "unsupported": return "This browser does not support passkeys. Open this page in a supported browser or device.";
    }
}
function isCancellation(error) {
    return error instanceof Error && ["NotAllowedError", "AbortError"].includes(error.name);
}
function isUnsupportedPasskeyBrowser(error) {
    return !window.PublicKeyCredential || (error instanceof Error && ["NotSupportedError", "SecurityError"].includes(error.name));
}
function deviceDescription(userAgent) {
    if (!userAgent)
        return "Unknown device";
    const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
    const platform = /iPhone|iPad/.test(userAgent) ? "iOS" : /Android/.test(userAgent) ? "Android" : /Windows/.test(userAgent) ? "Windows" : /Mac OS/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "device";
    return `${browser} on ${platform}`;
}
function displayDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}
function Login({ onSignedIn, notice }) {
    const loginLocation = useLocation();
    const ownerEntry = loginLocation.pathname === "/owner/sign-in";
    const [email, setEmail] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(null);
    const signIn = async (event) => {
        event.preventDefault();
        if (pending)
            return;
        if (!window.PublicKeyCredential) {
            setError("unsupported");
            return;
        }
        setPending(true);
        setError(null);
        try {
            const optionsResponse = await fetch(`${AUTH_PATH}/passkey/login/options`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });
            if (optionsResponse.status === 429)
                throw new Error("throttled");
            if (!optionsResponse.ok)
                throw new Error(optionsResponse.status >= 500 ? "unavailable" : "invalid");
            const { ceremonyId, options } = await optionsResponse.json();
            const response = await startAuthentication({ optionsJSON: options });
            const verifyResponse = await fetch(`${AUTH_PATH}/passkey/login/verify`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ceremonyId, response }),
            });
            if (verifyResponse.status === 429)
                throw new Error("throttled");
            if (!verifyResponse.ok)
                throw new Error(verifyResponse.status >= 500 ? "unavailable" : "invalid");
            const session = await readSession();
            if (session) {
                const pointer = readOfflinePointer();
                if (pointer && pointer.accountId !== session.account.id) {
                    void purgeOfflineAccount(pointer.accountId).catch(() => undefined);
                    clearOfflinePointer(pointer.accountId);
                }
                void purgeOtherOfflineAccounts(session.account.id).catch(() => undefined);
            }
            if (!session)
                throw new Error("invalid");
            onSignedIn(session);
        }
        catch (cause) {
            if (cause instanceof Error && ["invalid", "throttled", "unavailable"].includes(cause.message)) {
                setError(cause.message);
            }
            else if (isCancellation(cause)) {
                setError("cancelled");
            }
            else {
                setError("network");
            }
        }
        finally {
            setPending(false);
        }
    };
    return (_jsx("main", { className: "auth-content", children: _jsxs("section", { className: "auth-card auth-login", "aria-labelledby": "login-heading", children: [_jsx("div", { className: "eyebrow", children: "SENSE STUDIOS WORKSPACE" }), _jsx("h1", { id: "login-heading", children: ownerEntry ? "Owner sign in" : loginLocation.pathname === "/staff/sign-in" ? "Studio team sign in" : "Sign in with your passkey" }), _jsx("p", { className: "auth-intro", children: "Use the passkey registered to your work account to continue." }), notice && _jsx("p", { className: "notice", role: "status", children: notice }), error && _jsx("p", { className: "auth-error", role: "alert", children: errorMessage(error) }), _jsxs("form", { onSubmit: (event) => void signIn(event), children: [_jsx("label", { htmlFor: "email", children: "Work email" }), _jsx("input", { id: "email", name: "email", type: "email", autoComplete: "username webauthn", value: email, onChange: (event) => setEmail(event.target.value), required: true, maxLength: 254, disabled: pending }), _jsx("button", { className: "primary-action", type: "submit", disabled: pending || !email.trim(), children: pending ? "Waiting for passkey…" : "Continue with passkey" })] }), !window.PublicKeyCredential && _jsx("p", { className: "support-note", children: "This browser may not support passkeys. Use a supported browser or device." }), _jsxs("nav", { className: "identity-links", "aria-label": "Identity setup", children: [_jsx(Link, { to: "/staff/recovery", children: "Can't sign in?" }), _jsx("a", { href: "/client-portal/login", children: "Client sign in" }), _jsx(Link, { to: "/sign-in", children: "All sign-in options" }), _jsx(Link, { to: "/bootstrap", children: "Set up the first Owner account" }), _jsx(Link, { to: "/enroll", children: "Accept an invitation or recovery token" }), _jsx(Link, { to: "/owner-recovery", children: "Recover an Owner account" }), _jsx(Link, { to: "/install", children: "Install on your phone" })] })] }) }));
}
function Identity({ session, onLogout, busy, error, settingsSection, peopleMode = false, onSessionUpdate }) {
    const location = useLocation();
    const requestedPanel = new URLSearchParams(location.search).get("panel");
    const selectedPersonContext = peopleMode && new URLSearchParams(location.search).has("employeeId");
    const adminPanel = peopleMode ? "people" : requestedPanel === "structure" || requestedPanel === "access" || requestedPanel === "presentation" ? requestedPanel : "all";
    const identityActive = useRef(true);
    const [currentSession, setCurrentSession] = useState(session);
    const [refreshing, setRefreshing] = useState(false);
    const [actionError, setActionError] = useState();
    const [pending, setPending] = useState(false);
    const [token, setToken] = useState();
    const [tokenExpiresIn, setTokenExpiresIn] = useState();
    const [storedOffline, setStoredOffline] = useState(false);
    const [staffEmail, setStaffEmail] = useState("");
    const [staffRecoveryEmail, setStaffRecoveryEmail] = useState("");
    const [recoveryTarget, setRecoveryTarget] = useState(null);
    const [recoveryReason, setRecoveryReason] = useState("");
    const [verifiedOutOfBand, setVerifiedOutOfBand] = useState(false);
    const [actionSuccess, setActionSuccess] = useState();
    const [deviceSessions, setDeviceSessions] = useState(null);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState();
    const [revokingSessionId, setRevokingSessionId] = useState();
    const [organizationSettingsOpen, setOrganizationSettingsOpen] = useState(false);
    const [teamWorkspaceOpen, setTeamWorkspaceOpen] = useState(false);
    const [notificationsVisited, setNotificationsVisited] = useState(settingsSection === "notifications");
    useEffect(() => setCurrentSession(session), [session]);
    useEffect(() => { identityActive.current = true; return () => { identityActive.current = false; }; }, []);
    useEffect(() => { if (settingsSection === "notifications")
        setNotificationsVisited(true); }, [settingsSection]);
    const loadDeviceSessions = useCallback(async () => {
        setSessionsLoading(true);
        setSessionsError(undefined);
        try {
            const response = await fetch(`${AUTH_PATH}/sessions`, { credentials: "include", cache: "no-store" });
            if (!response.ok)
                throw new Error("sessions-unavailable");
            setDeviceSessions(await response.json());
        }
        catch {
            setSessionsError("We couldn’t load your sessions. Try again.");
        }
        finally {
            setSessionsLoading(false);
        }
    }, []);
    useEffect(() => { if (!peopleMode)
        void loadDeviceSessions(); }, [loadDeviceSessions, peopleMode]);
    const revokeDeviceSession = async (item) => {
        if (item.current || revokingSessionId)
            return;
        setRevokingSessionId(item.id);
        setSessionsError(undefined);
        try {
            const response = await fetch(`${AUTH_PATH}/sessions/${encodeURIComponent(item.id)}`, {
                method: "DELETE",
                credentials: "include",
                headers: { "X-CSRF-Token": currentSession.csrfToken },
            });
            if (!response.ok)
                throw new Error("session-revoke-failed");
            await loadDeviceSessions();
        }
        catch {
            setSessionsError("We couldn’t revoke that session. Refresh the list and try again.");
        }
        finally {
            setRevokingSessionId(undefined);
        }
    };
    const addOwnerPasskey = async () => {
        setPending(true);
        setActionError(undefined);
        setActionSuccess(undefined);
        let browserRegistration = false;
        try {
            const options = await apiPost(`${AUTH_PATH}/passkey/register/options`, {}, currentSession.csrfToken);
            browserRegistration = true;
            const response = await startRegistration({ optionsJSON: options.options });
            browserRegistration = false;
            await apiPost(`${AUTH_PATH}/passkey/register/verify`, { ceremonyId: options.ceremonyId, response }, currentSession.csrfToken);
            const updated = await readSession();
            if (!identityActive.current)
                return;
            if (!updated) {
                onLogout();
                return;
            }
            if (updated.account.id !== currentSession.account.id)
                return;
            setCurrentSession(updated);
            onSessionUpdate?.(updated);
            setActionSuccess("Passkey added to this account.");
        }
        catch (cause) {
            setActionError(browserRegistration
                ? passkeyRegistrationError(cause, { diagnostics: import.meta.env.DEV, browserSupported: Boolean(window.PublicKeyCredential) })
                : publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    const createRecoveryCode = async () => {
        setPending(true);
        setActionError(undefined);
        setActionSuccess(undefined);
        try {
            const result = await apiPost(`${AUTH_PATH}/owner/recovery-code`, {}, currentSession.csrfToken);
            setToken(result.recoveryCode);
            setTokenExpiresIn(undefined);
            setStoredOffline(false);
        }
        catch (cause) {
            setActionError(publicFlowError(cause, "Register a second distinct passkey before creating the recovery code."));
        }
        finally {
            setPending(false);
        }
    };
    const acknowledgeRecoveryCode = async () => {
        if (!storedOffline)
            return;
        setPending(true);
        setActionError(undefined);
        try {
            await apiPost(`${AUTH_PATH}/owner/recovery-code/ack`, { confirmedStoredOffline: true }, currentSession.csrfToken);
            const updated = await readSession();
            if (!identityActive.current)
                return;
            if (!updated) {
                onLogout();
                return;
            }
            if (updated.account.id !== currentSession.account.id)
                return;
            setCurrentSession(updated);
            onSessionUpdate?.(updated);
            setToken(undefined);
            setActionSuccess("Owner setup is complete. Keep the recovery code offline and use it only once.");
        }
        catch (cause) {
            setActionError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    const createInvitation = async (event) => {
        event.preventDefault();
        setPending(true);
        setActionError(undefined);
        setActionSuccess(undefined);
        setToken(undefined);
        setTokenExpiresIn(undefined);
        try {
            const result = await apiPost(`${AUTH_PATH}/staff/invitations`, { email: staffEmail.trim() }, currentSession.csrfToken);
            setToken(result.invitationToken);
            setTokenExpiresIn(result.expiresInSeconds);
        }
        catch (cause) {
            setActionError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    const authorizeRecovery = async (event) => {
        event.preventDefault();
        if (!recoveryTarget)
            return;
        setPending(true);
        setActionError(undefined);
        setActionSuccess(undefined);
        setToken(undefined);
        setTokenExpiresIn(undefined);
        try {
            const result = await apiPost(`${AUTH_PATH}/staff/${encodeURIComponent(recoveryTarget.id)}/recovery`, {
                reason: recoveryReason.trim(), verifiedOutOfBand: true,
            }, currentSession.csrfToken);
            setToken(result.recoveryToken);
            setTokenExpiresIn(result.expiresInSeconds);
        }
        catch (cause) {
            setActionError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    const revokeStaffSessions = async () => {
        if (!recoveryTarget || recoveryReason.trim().length < 10)
            return;
        setPending(true);
        setActionError(undefined);
        setActionSuccess(undefined);
        try {
            const result = await apiPost(`${AUTH_PATH}/staff/${encodeURIComponent(recoveryTarget.id)}/revoke-sessions`, {
                reason: recoveryReason.trim(),
            }, currentSession.csrfToken);
            setActionSuccess(`${result.revokedSessions} staff session${result.revokedSessions === 1 ? "" : "s"} revoked.`);
        }
        catch (cause) {
            setActionError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    const lookupStaff = async (event) => {
        event.preventDefault();
        setPending(true);
        setActionError(undefined);
        setRecoveryTarget(null);
        try {
            const response = await fetch(`${AUTH_PATH}/staff?email=${encodeURIComponent(staffRecoveryEmail.trim())}`, {
                credentials: "include", cache: "no-store",
            });
            if (!response.ok)
                throw Object.assign(new Error("lookup-failed"), { status: response.status });
            const result = await response.json();
            if (!result.account || result.account.state !== "ACTIVE") {
                setActionError("No active staff account was found for that email.");
            }
            else {
                setRecoveryTarget(result.account);
                setVerifiedOutOfBand(false);
            }
        }
        catch (cause) {
            setActionError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    const refreshIdentity = async () => {
        setRefreshing(true);
        try {
            const updated = await readSession();
            if (!identityActive.current)
                return;
            if (updated && updated.account.id === currentSession.account.id) {
                setCurrentSession(updated);
                onSessionUpdate?.(updated);
            }
            else if (!updated)
                onLogout();
        }
        catch {
            if (identityActive.current)
                setActionError("We couldn’t refresh your session. Try again.");
        }
        finally {
            setRefreshing(false);
        }
    };
    const ownerNeedsSetup = currentSession.account.kind === "OWNER" && currentSession.ownerSetupRequired === true;
    const settingsMode = settingsSection !== undefined || peopleMode;
    const owner = currentSession.account.kind === "OWNER";
    const staff = currentSession.account.kind === "STAFF";
    const effectiveSettingsSection = peopleMode ? "people" : settingsSection === "setup" && !ownerNeedsSetup ? "account" : settingsSection;
    const showAccount = !settingsMode || effectiveSettingsSection === "account" || ownerNeedsSetup;
    const showNotifications = !settingsMode || effectiveSettingsSection === "notifications";
    const showOrganization = peopleMode || !settingsMode || effectiveSettingsSection === "organization";
    const showTeam = peopleMode || !settingsMode || effectiveSettingsSection === "team";
    const copyToken = async () => {
        if (!token)
            return;
        try {
            await navigator.clipboard.writeText(token);
            setActionError(undefined);
            setActionSuccess("Copied. Store or hand off this one-time secret securely.");
        }
        catch {
            setActionSuccess(undefined);
            setActionError("Copy is unavailable in this browser. Select and copy the secret manually.");
        }
    };
    return (_jsxs("main", { className: `identity-content${peopleMode ? " people-route" : settingsMode ? " settings-shell" : ""}`, children: [peopleMode && _jsxs(_Fragment, { children: [_jsxs("header", { className: "people-route-heading", children: [_jsx("p", { className: "settings-homes-eyebrow", children: "WORKSPACE" }), _jsx("h1", { children: "People" }), !selectedPersonContext && _jsx("p", { children: owner ? "Manage employee membership, responsibilities and access through the current authorized workflows." : "Your account and permitted reporting team. Team records require an explicit grant." })] }), !selectedPersonContext && _jsxs("nav", { className: "people-personal-links", "aria-label": "People workspaces", children: [_jsx(Link, { to: "/my-work", children: "My Work" }), _jsx(Link, { to: "/settings?section=account", children: "My account & devices" }), _jsx(Link, { to: "/workforce", children: "Workforce" }), _jsx(Link, { to: "/learning", children: "Learning" }), owner && _jsx(Link, { to: "/settings?section=organization&panel=access", children: "Job roles & permissions" })] })] }), settingsMode && !peopleMode && _jsxs("header", { className: "settings-shell-heading", children: [_jsx("p", { className: "settings-homes-eyebrow", children: "WORKSPACE" }), _jsx("h1", { children: "Settings" }), _jsx("p", { children: "Manage your account and workspace preferences." })] }), settingsMode && !peopleMode && !ownerNeedsSetup && _jsx(SettingsSectionNavigation, { active: effectiveSettingsSection, owner: owner, staff: staff }), settingsMode && !peopleMode && !ownerNeedsSetup && _jsx("h2", { className: "settings-section-heading", children: effectiveSettingsSection === "account" ? "Account & devices" : effectiveSettingsSection === "notifications" ? "Notifications" : effectiveSettingsSection === "organization" ? "Organization administration" : "Team workspace" }), (!settingsMode || effectiveSettingsSection === "account" || ownerNeedsSetup) && _jsx("div", { className: "eyebrow", children: "IDENTITY" }), !settingsMode && _jsxs(_Fragment, { children: [_jsx("h1", { children: "You\u2019re signed in." }), _jsx("p", { className: "auth-intro", children: "Your account is authenticated. Workspace access will appear as approved capabilities are added." })] }), showAccount && _jsx(_Fragment, { children: _jsxs("section", { className: "identity-card", "aria-labelledby": "identity-heading", children: [_jsx("div", { className: "identity-avatar", "aria-hidden": "true", children: currentSession.account.email.slice(0, 1).toUpperCase() }), _jsxs("div", { className: "identity-details", children: [_jsx("h2", { id: "identity-heading", children: "Account" }), _jsx("p", { children: currentSession.account.email }), _jsx("span", { className: "account-kind", children: currentSession.account.kind === "OWNER" ? "Owner account" : "Staff account" })] }), _jsx("button", { type: "button", onClick: onLogout, disabled: busy, children: busy ? "Signing out…" : "Sign out" })] }) }), !settingsMode && _jsxs("nav", { className: "document-navigation", "aria-label": "Workspace navigation", children: [_jsx(Link, { to: "/dashboard", children: "Dashboard" }), _jsx(Link, { to: "/time", children: "Time" }), _jsx(Link, { to: "/workforce", children: "Workforce" }), _jsx(Link, { to: "/learning", children: "Learning" }), _jsx(Link, { to: "/performance", children: "Performance" }), _jsx(Link, { to: "/site", children: "Site delivery" }), _jsx(Link, { to: "/documents", children: "Project documents" }), _jsx(Link, { to: "/revisions", children: "Drawing register" }), _jsx(Link, { to: "/reviews", children: "Internal reviews" }), _jsx(Link, { to: "/client-reviews", children: "Client reviews" }), _jsx(Link, { to: "/external-access", children: "External access" }), _jsx(Link, { to: "/turnkey", children: "Turnkey operations" })] }), error && _jsx("p", { className: "auth-error", role: "alert", children: error }), peopleMode && staff && _jsx(PeopleSelf, {}), !settingsMode && !ownerNeedsSetup && _jsx(ApprovalQueue, {}), !settingsMode && !ownerNeedsSetup && _jsx(CrmWorkspace, { csrfToken: currentSession.csrfToken, owner: owner }), !settingsMode && !ownerNeedsSetup && _jsx(ProjectWorkspace, { csrfToken: currentSession.csrfToken, owner: owner }), !settingsMode && !ownerNeedsSetup && _jsx(TaskWorkspace, { csrfToken: currentSession.csrfToken, owner: owner }), showAccount && _jsx(_Fragment, { children: _jsxs("section", { className: "identity-section sessions-section", "aria-labelledby": "sessions-heading", children: [_jsxs("div", { className: "sessions-heading-row", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "DEVICES" }), _jsx("h2", { id: "sessions-heading", children: "Active sessions" })] }), _jsx("button", { className: "secondary-action", type: "button", onClick: () => void loadDeviceSessions(), disabled: sessionsLoading, children: "Refresh" })] }), sessionsLoading && _jsx("p", { role: "status", className: "identity-note", children: "Loading your sessions\u2026" }), sessionsError && _jsxs("div", { className: "sessions-error", children: [_jsx("p", { role: "alert", className: "auth-error", children: sessionsError }), _jsx("button", { className: "secondary-action", type: "button", onClick: () => void loadDeviceSessions(), children: "Try again" })] }), !sessionsLoading && !sessionsError && deviceSessions?.length === 0 && _jsx("p", { className: "identity-note", role: "status", children: "No sessions are available." }), !sessionsLoading && !sessionsError && deviceSessions && deviceSessions.length > 0 && (_jsx(SessionGroups, { sessions: deviceSessions, children: (item) => {
                                const expired = new Date(item.expiresAt).getTime() <= Date.now();
                                const status = item.current ? "Current device" : item.revokedAt ? "Revoked" : expired ? "Expired" : "Active";
                                return _jsxs("li", { className: "session-item", children: [_jsxs("div", { className: "session-copy", children: [_jsxs("h3", { children: [deviceDescription(item.userAgent), item.current && _jsx("span", { className: "current-device-badge", children: "This device" })] }), _jsxs("p", { children: [status, " \u00B7 Signed in ", displayDate(item.createdAt)] }), item.lastUsedAt && _jsxs("p", { children: ["Last used ", displayDate(item.lastUsedAt)] })] }), !item.current && !item.revokedAt && !expired && _jsx("button", { className: "secondary-action", type: "button", disabled: revokingSessionId !== undefined, onClick: () => void revokeDeviceSession(item), children: revokingSessionId === item.id ? "Revoking…" : "Revoke" })] }, item.id);
                            } }))] }) }), settingsMode ? notificationsVisited && _jsx("div", { hidden: !showNotifications, children: _jsx(NotificationCenter, { csrfToken: currentSession.csrfToken, initiallyOpen: true }) }) : _jsx(NotificationCenter, { csrfToken: currentSession.csrfToken }), ownerNeedsSetup && (_jsxs("section", { className: "identity-section", "aria-labelledby": "owner-setup-heading", children: [_jsx("div", { className: "eyebrow", children: "OWNER SETUP" }), _jsx("h2", { id: "owner-setup-heading", children: "Secure your Owner account" }), _jsx("p", { children: "Add a second distinct passkey, create your one-time offline recovery code, then confirm that you stored it safely." }), _jsxs("ol", { className: "owner-setup-progress", children: [_jsx("li", { children: (currentSession.activePasskeyCount ?? 0) >= 2 ? "Two passkeys registered" : "Register a second passkey" }), _jsx("li", { children: token ? "Save your offline recovery code" : "Create your recovery code" }), _jsx("li", { children: "Confirm safe storage" })] }), !token && _jsxs("div", { className: "identity-actions", children: [(currentSession.activePasskeyCount ?? 0) < 2 && _jsx("button", { type: "button", disabled: pending, onClick: () => void addOwnerPasskey(), children: "Add second passkey" }), (currentSession.activePasskeyCount ?? 0) >= 2 && _jsx("button", { type: "button", disabled: pending, onClick: () => void createRecoveryCode(), children: "Create offline recovery code" })] }), token && _jsxs("div", { className: "secret-handoff", children: [_jsx("label", { htmlFor: "recovery-code", children: "One-time offline recovery code" }), _jsx("textarea", { id: "recovery-code", readOnly: true, value: token, rows: 2 }), _jsx("button", { type: "button", onClick: () => void copyToken(), children: "Copy code" }), _jsxs("label", { className: "check-row", children: [_jsx("input", { type: "checkbox", checked: storedOffline, onChange: (event) => setStoredOffline(event.target.checked) }), "I stored this recovery code offline where only I can access it."] }), _jsx("button", { type: "button", disabled: pending || !storedOffline, onClick: () => void acknowledgeRecoveryCode(), children: "Confirm offline storage" })] })] })), owner && currentSession.ownerSetupRequired === false && (showOrganization || settingsMode) && _jsxs("div", { hidden: settingsMode && !showOrganization, children: [!peopleMode && (adminPanel === "all" || adminPanel === "structure") && _jsx(AuditRetentionCenter, { csrfToken: currentSession.csrfToken }), _jsxs("section", { className: `identity-section${peopleMode ? " people-administration" : ""}`, "aria-labelledby": peopleMode || adminPanel !== "all" ? "organization-heading" : "organization-settings-toggle", children: [!peopleMode && adminPanel === "all" && _jsxs("div", { className: "sessions-heading-row", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "ORGANIZATION" }), _jsx("h2", { id: "organization-settings-toggle", children: "Organization settings" })] }), _jsx("button", { className: "secondary-action", type: "button", "aria-expanded": organizationSettingsOpen, onClick: () => setOrganizationSettingsOpen((open) => !open), children: organizationSettingsOpen ? "Hide settings" : "Manage organization" })] }), (peopleMode || adminPanel !== "all" || organizationSettingsOpen) && _jsx(OrganizationAdmin, { session: currentSession, panel: adminPanel }, adminPanel)] })] }), staff && (showTeam || settingsMode) && (_jsx("div", { hidden: settingsMode && !showTeam, children: _jsxs("section", { className: "identity-section", "aria-labelledby": "team-workspace-heading", children: [!peopleMode && _jsxs("div", { className: "sessions-heading-row", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "TEAM" }), _jsx("h2", { id: "team-workspace-heading", children: "Team workspace" })] }), _jsx("button", { className: "secondary-action", type: "button", "aria-expanded": teamWorkspaceOpen, onClick: () => setTeamWorkspaceOpen((open) => !open), children: teamWorkspaceOpen ? "Close team workspace" : "Open team workspace" })] }), peopleMode && _jsx("h2", { id: "team-workspace-heading", children: "Permitted reporting team" }), (peopleMode || teamWorkspaceOpen) && _jsx(TeamWorkspace, { session: currentSession })] }) })), owner && currentSession.ownerSetupRequired === false && (peopleMode || !settingsMode || settingsSection === "organization" && adminPanel === "all") && (_jsx("section", { className: "identity-section", "aria-labelledby": "staff-identity-heading", children: _jsxs("details", { open: peopleMode ? undefined : true, children: [_jsx("summary", { className: "staff-identity-disclosure", children: "Staff invitations and recovery" }), _jsx("div", { className: "eyebrow", children: "IDENTITY ADMINISTRATION" }), _jsx("h2", { id: "staff-identity-heading", children: "Staff identity access" }), _jsxs("form", { className: "identity-form", onSubmit: (event) => void createInvitation(event), children: [_jsx("label", { htmlFor: "staff-invite-email", children: "Invite staff by work email" }), _jsxs("div", { className: "inline-form", children: [_jsx("input", { id: "staff-invite-email", type: "email", required: true, maxLength: 320, value: staffEmail, onChange: (event) => setStaffEmail(event.target.value) }), _jsx("button", { disabled: pending, children: "Create invitation" })] })] }), _jsxs("form", { className: "identity-form", onSubmit: (event) => void lookupStaff(event), children: [_jsx("label", { htmlFor: "staff-recovery-email", children: "Work email for verified staff recovery" }), _jsxs("div", { className: "inline-form", children: [_jsx("input", { id: "staff-recovery-email", type: "email", maxLength: 320, value: staffRecoveryEmail, onChange: (event) => { setStaffRecoveryEmail(event.target.value); setRecoveryTarget(null); }, required: true }), _jsx("button", { disabled: pending, children: "Find staff account" })] })] }), recoveryTarget && _jsxs("form", { className: "identity-form", onSubmit: (event) => void authorizeRecovery(event), children: [_jsxs("p", { className: "resolved-account", children: ["Recovery target: ", _jsx("strong", { children: recoveryTarget.email })] }), _jsx("label", { htmlFor: "recovery-reason", children: "Reason for recovery authorization" }), _jsx("textarea", { id: "recovery-reason", minLength: 10, maxLength: 1000, value: recoveryReason, onChange: (event) => setRecoveryReason(event.target.value), required: true }), _jsx("p", { className: "identity-note", children: "Revoking sessions signs the staff member out immediately. Recovery also revokes sessions and passkeys." }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending || recoveryReason.trim().length < 10, onClick: () => void revokeStaffSessions(), children: "Revoke staff sessions" }), _jsxs("label", { className: "check-row", children: [_jsx("input", { type: "checkbox", checked: verifiedOutOfBand, onChange: (event) => setVerifiedOutOfBand(event.target.checked), required: true }), "I verified this staff member out of band."] }), _jsx("button", { disabled: pending || !verifiedOutOfBand, children: "Revoke access and authorize recovery" })] }), token && _jsxs("div", { className: "secret-handoff", children: [_jsx("label", { htmlFor: "handoff-token", children: "One-time enrollment token for secure handoff" }), _jsx("textarea", { id: "handoff-token", readOnly: true, value: token, rows: 2 }), tokenExpiresIn !== undefined && _jsxs("p", { className: "identity-note", children: ["Expires in ", Math.ceil(tokenExpiresIn / 3600), " hours."] }), _jsx("button", { type: "button", onClick: () => void copyToken(), children: "Copy token" }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => { setToken(undefined); setTokenExpiresIn(undefined); }, children: "Hide token" })] })] }) })), (peopleMode || showAccount || effectiveSettingsSection === "organization" || ownerNeedsSetup) && actionError && _jsx("p", { className: "auth-error", role: "alert", children: actionError }), (peopleMode || showAccount || effectiveSettingsSection === "organization" || ownerNeedsSetup) && actionSuccess && _jsx("p", { className: "notice", role: "status", children: actionSuccess }), showAccount && _jsxs("div", { className: "identity-bottom-actions", children: [_jsx("button", { className: "secondary-action", type: "button", onClick: () => void refreshIdentity(), disabled: refreshing, children: refreshing ? "Refreshing…" : "Refresh session" }), _jsx("p", { className: "identity-note", role: "status", children: "Your sign-in is checked again when you return to this page." })] })] }));
}
async function apiPost(path, body, csrfToken) {
    const response = await fetch(path, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
        body: JSON.stringify(body),
    });
    if (!response.ok)
        throw Object.assign(new Error("request-failed"), { status: response.status });
    return response.status === 204 ? undefined : response.json();
}
function publicFlowError(error, forbiddenMessage) {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
    if (status === 429)
        return "Too many attempts. Wait a moment, then try again.";
    if (status === 401 || status === 400)
        return "The request could not be completed. Check the details and try again.";
    if (status === 403 && forbiddenMessage)
        return forbiddenMessage;
    if (status === 403)
        return "Sign out and sign in again before changing credentials or recovery settings.";
    if (status >= 500)
        return "The identity service is temporarily unavailable. Try again shortly.";
    if (isUnsupportedPasskeyBrowser(error))
        return "This browser does not support passkeys. Open this page in a supported browser or device.";
    if (isCancellation(error))
        return "The passkey request was cancelled. You can try again when ready.";
    return "We couldn’t reach the identity service. Check your connection and try again.";
}
function Bootstrap() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [secret, setSecret] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState();
    const [ceremony, setCeremony] = useState();
    const start = async (event) => {
        event.preventDefault();
        setPending(true);
        setError(undefined);
        try {
            const options = await apiPost(`${AUTH_PATH}/bootstrap/options`, { email: email.trim(), secret });
            setCeremony(options);
            setSecret("");
        }
        catch (cause) {
            setError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    const enroll = async () => {
        if (!ceremony)
            return;
        setPending(true);
        setError(undefined);
        try {
            const response = await startRegistration({ optionsJSON: ceremony.options });
            await apiPost(`${AUTH_PATH}/bootstrap/verify`, { ceremonyId: ceremony.ceremonyId, response });
            const restored = await readSession();
            if (!restored)
                throw new Error("session-missing");
            navigate("/");
        }
        catch (cause) {
            setError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    return _jsx("main", { className: "auth-content", children: _jsxs("section", { className: "auth-card", children: [_jsx("div", { className: "eyebrow", children: "FIRST OWNER SETUP" }), _jsx("h1", { children: "Register the first Owner passkey" }), _jsx("p", { className: "auth-intro", children: "Enter the initial Owner email and one-time setup secret provided by the deployment administrator." }), error && _jsx("p", { role: "alert", className: "auth-error", children: error }), !ceremony ? _jsxs("form", { onSubmit: (event) => void start(event), children: [_jsx("label", { htmlFor: "bootstrap-email", children: "Owner work email" }), _jsx("input", { id: "bootstrap-email", type: "email", autoComplete: "email", required: true, maxLength: 320, value: email, onChange: (event) => setEmail(event.target.value) }), _jsx("label", { htmlFor: "bootstrap-secret", children: "One-time setup secret" }), _jsx("input", { id: "bootstrap-secret", type: "password", autoComplete: "one-time-code", required: true, minLength: 32, maxLength: 512, value: secret, onChange: (event) => setSecret(event.target.value) }), _jsx("button", { disabled: pending, children: pending ? "Preparing passkey…" : "Continue" })] }) : _jsxs("div", { className: "identity-actions", children: [_jsx("p", { role: "status", children: "The registration ceremony is ready." }), _jsx("button", { disabled: pending, onClick: () => void enroll(), children: pending ? "Registering…" : "Register Owner passkey" }), _jsx("button", { className: "secondary-action", onClick: () => setCeremony(undefined), children: "Start over" })] }), _jsx(Link, { className: "text-link", to: "/", children: "Back to sign in" })] }) });
}
function Enrollment() {
    const navigate = useNavigate();
    const [token, setToken] = useState("");
    const [ceremony, setCeremony] = useState();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState();
    const getOptions = async (event) => {
        event.preventDefault();
        setPending(true);
        setError(undefined);
        try {
            setCeremony(await apiPost(`${AUTH_PATH}/staff/invitations/options`, { token: token.trim() }));
        }
        catch (cause) {
            setError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    const enroll = async () => {
        if (!ceremony)
            return;
        setPending(true);
        setError(undefined);
        try {
            const response = await startRegistration({ optionsJSON: ceremony.options });
            await apiPost(`${AUTH_PATH}/staff/invitations/verify`, { token: token.trim(), ceremonyId: ceremony.ceremonyId, response });
            setToken("");
            const restored = await readSession();
            if (!restored)
                throw new Error("session-missing");
            navigate("/");
        }
        catch (cause) {
            setError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    return _jsx("main", { className: "auth-content", children: _jsxs("section", { className: "auth-card", children: [_jsx("div", { className: "eyebrow", children: "STAFF ENROLLMENT" }), _jsx("h1", { children: "Set up your passkey" }), _jsx("p", { className: "auth-intro", children: "Paste the one-time invitation or recovery token provided by your Owner. The token stays on this page and is sent only to the identity service." }), error && _jsx("p", { role: "alert", className: "auth-error", children: error }), !ceremony ? _jsxs("form", { onSubmit: (event) => void getOptions(event), children: [_jsx("label", { htmlFor: "enrollment-token", children: "One-time enrollment token" }), _jsx("input", { id: "enrollment-token", type: "password", autoComplete: "off", required: true, minLength: 32, maxLength: 512, value: token, onChange: (event) => setToken(event.target.value) }), _jsx("button", { disabled: pending, children: pending ? "Checking token…" : "Continue" })] }) : _jsxs("div", { className: "identity-actions", children: [_jsx("p", { role: "status", children: "The registration ceremony is ready." }), _jsx("button", { disabled: pending, onClick: () => void enroll(), children: pending ? "Registering…" : "Register staff passkey" }), _jsx("button", { className: "secondary-action", onClick: () => setCeremony(undefined), children: "Use a different token" })] }), _jsx(Link, { className: "text-link", to: "/", children: "Back to sign in" })] }) });
}
function OwnerRecovery() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [ceremony, setCeremony] = useState();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState();
    const getOptions = async (event) => {
        event.preventDefault();
        setPending(true);
        setError(undefined);
        try {
            setCeremony(await apiPost(`${AUTH_PATH}/owner/recovery/options`, { email: email.trim(), code: code.trim() }));
        }
        catch (cause) {
            setError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    const recover = async () => {
        if (!ceremony)
            return;
        setPending(true);
        setError(undefined);
        try {
            const response = await startRegistration({ optionsJSON: ceremony.options });
            await apiPost(`${AUTH_PATH}/owner/recovery/verify`, { email: email.trim(), code: code.trim(), ceremonyId: ceremony.ceremonyId, response });
            setCode("");
            const restored = await readSession();
            if (!restored)
                throw new Error("session-missing");
            navigate("/");
        }
        catch (cause) {
            setError(publicFlowError(cause));
        }
        finally {
            setPending(false);
        }
    };
    return _jsx("main", { className: "auth-content", children: _jsxs("section", { className: "auth-card", children: [_jsx("div", { className: "eyebrow", children: "OWNER RECOVERY" }), _jsx("h1", { children: "Recover with your offline code" }), _jsx("p", { className: "auth-intro", children: "Use the one-time recovery code kept offline. Recovery replaces existing passkeys and sessions." }), error && _jsx("p", { role: "alert", className: "auth-error", children: error }), !ceremony ? _jsxs("form", { onSubmit: (event) => void getOptions(event), children: [_jsx("label", { htmlFor: "recovery-email", children: "Owner work email" }), _jsx("input", { id: "recovery-email", type: "email", required: true, maxLength: 320, value: email, onChange: (event) => setEmail(event.target.value) }), _jsx("label", { htmlFor: "owner-recovery-code", children: "Offline recovery code" }), _jsx("input", { id: "owner-recovery-code", type: "password", autoComplete: "off", required: true, minLength: 32, maxLength: 512, value: code, onChange: (event) => setCode(event.target.value) }), _jsx("button", { disabled: pending, children: pending ? "Checking recovery code…" : "Continue" })] }) : _jsxs("div", { className: "identity-actions", children: [_jsx("p", { role: "status", children: "Register a replacement passkey to complete recovery." }), _jsx("button", { disabled: pending, onClick: () => void recover(), children: pending ? "Recovering…" : "Register replacement passkey" }), _jsx("button", { className: "secondary-action", onClick: () => setCeremony(undefined), children: "Start over" })] }), _jsx(Link, { className: "text-link", to: "/", children: "Back to sign in" })] }) });
}
function AuthHome({ legacyWorkspace = false }) {
    const [view, setView] = useState({ kind: "restoring" });
    const [refreshAttempt, setRefreshAttempt] = useState(0);
    const [logoutBusy, setLogoutBusy] = useState(false);
    const [logoutError, setLogoutError] = useState();
    const restore = useCallback(async () => {
        try {
            const session = await readSession();
            setView((previous) => session
                ? { kind: "signed-in", session }
                : {
                    kind: "signed-out",
                    ...(previous.kind === "signed-in" ? { notice: "Your session ended. Sign in again to continue." } : {}),
                });
            if (!session) {
                const pointer = readOfflinePointer();
                if (pointer)
                    void purgeOfflineAccount(pointer.accountId).catch(() => undefined);
                clearOfflinePointer();
                window.dispatchEvent(new Event("sense-session-ended"));
            }
        }
        catch {
            setView({ kind: "session-error", message: "We couldn’t check your session. Try again." });
        }
    }, []);
    useEffect(() => {
        void restore();
    }, [restore, refreshAttempt]);
    useEffect(() => {
        if (view.kind !== "signed-in")
            return;
        const recheck = () => {
            if (document.visibilityState === "visible")
                void restore();
        };
        window.addEventListener("focus", recheck);
        document.addEventListener("visibilitychange", recheck);
        return () => {
            window.removeEventListener("focus", recheck);
            document.removeEventListener("visibilitychange", recheck);
        };
    }, [restore, view.kind]);
    const logout = async () => {
        if (view.kind !== "signed-in" || logoutBusy)
            return;
        setLogoutBusy(true);
        setLogoutError(undefined);
        try {
            const response = await fetch(`${AUTH_PATH}/logout`, {
                method: "POST",
                credentials: "include",
                headers: { "X-CSRF-Token": view.session.csrfToken },
            });
            if (response.status === 401) {
                const pointer = readOfflinePointer();
                if (pointer)
                    void purgeOfflineAccount(pointer.accountId).catch(() => undefined);
                clearOfflinePointer();
                window.dispatchEvent(new Event("sense-session-ended"));
                setView({ kind: "signed-out", notice: "Your session ended. Sign in again to continue." });
            }
            else if (!response.ok) {
                setLogoutError("We couldn’t sign you out. Try again.");
            }
            else {
                const pointer = readOfflinePointer();
                if (pointer)
                    void purgeOfflineAccount(pointer.accountId).catch(() => undefined);
                clearOfflinePointer();
                window.dispatchEvent(new Event("sense-session-ended"));
                setView({ kind: "signed-out", notice: "You’ve signed out." });
            }
        }
        catch {
            setLogoutError("We couldn’t reach the sign-in service. Try signing out again.");
        }
        finally {
            setLogoutBusy(false);
        }
    };
    if (view.kind === "restoring")
        return _jsx("main", { className: "auth-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (view.kind === "session-error") {
        return _jsx("main", { className: "auth-content", children: _jsxs("section", { className: "auth-card", children: [_jsx("p", { className: "auth-error", role: "alert", children: view.message }), _jsx("button", { type: "button", onClick: () => setRefreshAttempt((n) => n + 1), children: "Try again" })] }) });
    }
    if (view.kind === "signed-out")
        return _jsx(Login, { onSignedIn: (session) => setView({ kind: "signed-in", session }), notice: view.notice });
    if (!legacyWorkspace && !(view.session.account.kind === "OWNER" && view.session.ownerSetupRequired)) {
        const linkedTaskId = new URLSearchParams(window.location.search).get("taskId");
        return _jsx(Navigate, { replace: true, to: linkedTaskId ? `/tasks?taskId=${encodeURIComponent(linkedTaskId)}` : "/dashboard" });
    }
    return _jsx(WorkspaceLayout, { children: _jsx(Identity, { session: view.session, onLogout: () => void logout(), busy: logoutBusy, error: logoutError }, view.session.account.id) }, view.session.account.id);
}
function HeaderControls() {
    const { session } = useSessionProbe();
    const location = useLocation();
    const [logoutBusy, setLogoutBusy] = useState(false);
    const [logoutError, setLogoutError] = useState("");
    const logoutInFlight = useRef(false);
    const navigate = useNavigate();
    const logout = async () => {
        if (!session || logoutInFlight.current)
            return;
        logoutInFlight.current = true;
        setLogoutBusy(true);
        setLogoutError("");
        try {
            const response = await fetch(`${AUTH_PATH}/logout`, {
                method: "POST",
                credentials: "include",
                headers: { "X-CSRF-Token": session.csrfToken },
            });
            if (!response.ok && response.status !== 401)
                throw new Error("logout-failed");
            const pointer = readOfflinePointer();
            if (pointer)
                await purgeOfflineAccount(pointer.accountId).catch(() => undefined);
            clearOfflinePointer();
            window.dispatchEvent(new Event("sense-session-ended"));
            navigate("/", { replace: true });
        }
        catch {
            setLogoutError("We couldn’t sign you out. Try again.");
        }
        finally {
            logoutInFlight.current = false;
            setLogoutBusy(false);
        }
    };
    if (!session)
        return null;
    const contextLabel = workspaceContextLabel(location.pathname);
    const logoutButton = _jsx("button", { className: "site-header-logout", type: "button", onClick: () => void logout(), disabled: logoutBusy, children: logoutBusy ? "Logging out…" : "Log out" });
    return _jsxs("div", { className: "site-header-controls", children: [logoutError && _jsx("p", { className: "site-header-error", role: "alert", children: logoutError }), contextLabel && !session.ownerSetupRequired ? _jsx(WorkspaceHeader, { session: session, contextLabel: contextLabel, children: logoutButton }) : _jsxs(_Fragment, { children: [!session.ownerSetupRequired && _jsxs(NavLink, { className: "site-header-notifications", to: "/notifications", "aria-label": "Notifications", children: [_jsx("svg", { "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" }) }), _jsx("span", { children: "Notifications" })] }), logoutButton] })] });
}
function NotFound() {
    return _jsx("main", { className: "auth-content", children: _jsxs("section", { className: "auth-card", children: [_jsx("div", { className: "eyebrow", children: "PAGE NOT FOUND" }), _jsx("h1", { children: "That page is not here." }), _jsx(Link, { to: "/", className: "home-link", children: "Return to sign in" })] }) });
}
function DocumentsRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view project documents" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(DocumentWorkspace, { csrfToken: session.csrfToken, owner: session.account.kind === "OWNER" }) }) }, session.account.id);
}
function NotificationsRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/workspace", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view notifications" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(NotificationCenter, { csrfToken: session.csrfToken, initiallyOpen: true }) }) }, session.account.id);
}
function SettingsRoute() {
    const { session, failed, updateSession } = useProtectedRouteSession();
    const [logoutBusy, setLogoutBusy] = useState(false);
    const [logoutError, setLogoutError] = useState();
    const location = useLocation();
    const navigate = useNavigate();
    const logout = async () => {
        if (!session || logoutBusy)
            return;
        setLogoutBusy(true);
        setLogoutError(undefined);
        try {
            const response = await fetch(`${AUTH_PATH}/logout`, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": session.csrfToken } });
            if (!response.ok && response.status !== 401)
                throw new Error("logout-failed");
            const pointer = readOfflinePointer();
            if (pointer)
                void purgeOfflineAccount(pointer.accountId).catch(() => undefined);
            clearOfflinePointer();
            window.dispatchEvent(new Event("sense-session-ended"));
            updateSession(() => null);
            navigate("/", { replace: true });
        }
        catch {
            setLogoutError("We couldn’t sign you out. Try again.");
        }
        finally {
            setLogoutBusy(false);
        }
    };
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/workspace", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view settings" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    const owner = session.account.kind === "OWNER";
    const requestedSection = new URLSearchParams(location.search).get("section");
    const validSections = ["account", "notifications", ...(owner ? ["organization"] : ["team"])];
    const section = owner && session.ownerSetupRequired ? "setup" : validSections.includes(requestedSection) ? requestedSection : "account";
    return _jsx(WorkspaceLayout, { children: _jsx(Identity, { session: session, onLogout: () => void logout(), busy: logoutBusy, error: logoutError, settingsSection: section, onSessionUpdate: (updated) => updateSession((current) => current?.account.id === updated.account.id ? updated : current) }, session.account.id) }, session.account.id);
}
function DecisionsRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/workspace", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view decisions" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/workspace", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(DecisionsHome, {}) }) }, session.account.id);
}
function PeopleRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsxs("main", { className: "identity-content", children: [_jsx("p", { role: "alert", children: "We couldn\u2019t check your session. Return to the workspace and try again." }), _jsx(Link, { to: "/", children: "Return to workspace" })] });
    if (!session)
        return _jsxs("main", { className: "identity-content", children: [_jsx("h1", { children: "Sign in to view People" }), _jsx(Link, { to: "/", children: "Return to sign in" })] });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsxs("main", { className: "identity-content", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/workspace", children: "Return to Owner setup" })] });
    return _jsx(WorkspaceLayout, { children: _jsx(Identity, { session: session, onLogout: () => undefined, busy: false, error: undefined, peopleMode: true }, session.account.id) }, session.account.id);
}
function TasksRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view tasks" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content tasks-route", children: _jsx(TaskWorkspace, { csrfToken: session.csrfToken, owner: session.account.kind === "OWNER", listFirst: true }) }) }, session.account.id);
}
function MyWorkRoute() {
    const { session, failed, updateSession } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view My Work" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    const personalObligations = ({ employeeLessOwner }) => _jsx("div", { className: "my-work-obligations", children: _jsx(MyWorkManagement, { prioritizeReassignment: employeeLessOwner, onSessionExpired: () => updateSession(() => null) }, `management-${session.account.id}`) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content my-work-route", children: _jsx(TaskWorkspace, { accountId: session.account.id, csrfToken: session.csrfToken, owner: session.account.kind === "OWNER", listFirst: true, personalOnly: true, personalObligations: personalObligations, onSessionExpired: () => updateSession(() => null) }, `tasks-${session.account.id}`) }) }, session.account.id);
}
/**
 * Header/presence probe: renders for anonymous visitors too, so a failed
 * session read must not flip it into an error state. No `failed` flag.
 */
function useSessionProbe() {
    const [session, setSession] = useState();
    useEffect(() => {
        let active = true;
        let generation = 0;
        const restore = () => {
            const requestId = ++generation;
            void readSession().then(value => {
                if (active && requestId === generation)
                    setSession(value);
            }).catch(() => undefined);
        };
        const ended = () => { generation += 1; if (active)
            setSession(null); };
        const recheck = () => { if (document.visibilityState === "visible")
            restore(); };
        restore();
        window.addEventListener("sense-session-ended", ended);
        window.addEventListener("focus", recheck);
        document.addEventListener("visibilitychange", recheck);
        return () => {
            active = false;
            generation += 1;
            window.removeEventListener("sense-session-ended", ended);
            window.removeEventListener("focus", recheck);
            document.removeEventListener("visibilitychange", recheck);
        };
    }, []);
    return { session };
}
/** Keep protected workspaces out of the tree after explicit session loss. */
function useProtectedRouteSession() {
    const [session, setSession] = useState();
    const [failed, setFailed] = useState(false);
    const mounted = useRef(true);
    const updateSession = useCallback((updater) => {
        if (mounted.current)
            setSession(updater);
    }, []);
    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);
    useEffect(() => {
        let active = true;
        let generation = 0;
        const restore = () => {
            const requestId = ++generation;
            void readSession().then(value => {
                if (active && requestId === generation) {
                    setSession(value);
                    setFailed(false);
                }
            }).catch(() => {
                if (active && requestId === generation)
                    setFailed(true);
            });
        };
        const ended = () => {
            generation += 1;
            if (active) {
                setSession(null);
                setFailed(false);
            }
        };
        const recheck = () => { if (document.visibilityState === "visible")
            restore(); };
        restore();
        window.addEventListener("sense-session-ended", ended);
        window.addEventListener("focus", recheck);
        document.addEventListener("visibilitychange", recheck);
        return () => {
            active = false;
            generation += 1;
            window.removeEventListener("sense-session-ended", ended);
            window.removeEventListener("focus", recheck);
            document.removeEventListener("visibilitychange", recheck);
        };
    }, []);
    return { session, failed, updateSession };
}
function RevisionsRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view the drawing register" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(RevisionWorkspace, { csrfToken: session.csrfToken }) }) }, session.account.id);
}
function ReviewsRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to review project drawings" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(ReviewWorkspace, { csrfToken: session.csrfToken, owner: session.account.kind === "OWNER" }) }) }, session.account.id);
}
function ClientReviewsRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to manage client reviews" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(StaffClientReviewWorkspace, { csrfToken: session.csrfToken, owner: session.account.kind === "OWNER" }) }) }, session.account.id);
}
function TurnkeyRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view Turnkey operations" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(TurnkeyWorkspace, { csrfToken: session.csrfToken }) }) }, session.account.id);
}
export function App() {
    const siteHeaderRef = useRef(null);
    useLayoutEffect(() => {
        const header = siteHeaderRef.current;
        if (!header)
            return;
        const root = document.documentElement;
        const updateHeaderHeight = () => {
            const height = `${Math.ceil(header.getBoundingClientRect().height)}px`;
            if (root.style.getPropertyValue("--sense-header-height") !== height) {
                root.style.setProperty("--sense-header-height", height);
            }
        };
        updateHeaderHeight();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateHeaderHeight);
            return () => {
                window.removeEventListener("resize", updateHeaderHeight);
                root.style.removeProperty("--sense-header-height");
            };
        }
        const observer = new ResizeObserver(updateHeaderHeight);
        observer.observe(header);
        return () => {
            observer.disconnect();
            root.style.removeProperty("--sense-header-height");
        };
    }, []);
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "site-header", ref: siteHeaderRef, children: [_jsxs(Link, { to: "/", className: "brand", "aria-label": "Sense Studios home", children: [_jsx("span", { className: "brand-mark", children: "S" }), _jsxs("span", { children: [_jsx("strong", { children: "SENSE STUDIOS" }), _jsx("small", { children: "WORK MANAGEMENT" })] })] }), _jsx("span", { className: "phase-badge", children: "IDENTITY" }), _jsx(HeaderControls, {})] }), _jsxs(Routes, { children: [_jsx(Route, { path: "/sign-in", element: _jsx(SignInHub, {}) }), _jsx(Route, { path: "/staff/sign-in", element: _jsx(AuthHome, {}) }), _jsx(Route, { path: "/owner/sign-in", element: _jsx(AuthHome, {}) }), _jsx(Route, { path: "/staff/recovery", element: _jsx(StaffRecovery, {}) }), _jsx(Route, { path: "/", element: _jsx(AuthHome, {}) }), _jsx(Route, { path: "/workspace", element: _jsx(AuthHome, { legacyWorkspace: true }) }), _jsx(Route, { path: "/my-work", element: _jsx(MyWorkRoute, {}) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsRoute, {}) }), _jsx(Route, { path: "/decisions", element: _jsx(DecisionsRoute, {}) }), _jsx(Route, { path: "/notifications", element: _jsx(NotificationsRoute, {}) }), _jsx(Route, { path: "/tasks", element: _jsx(TasksRoute, {}) }), _jsx(Route, { path: "/projects", element: _jsx(ProjectsRoute, { readSession: readSession }) }), _jsx(Route, { path: "/people", element: _jsx(PeopleRoute, {}) }), _jsx(Route, { path: "/bootstrap", element: _jsx(Bootstrap, {}) }), _jsx(Route, { path: "/enroll", element: _jsx(Enrollment, {}) }), _jsx(Route, { path: "/owner-recovery", element: _jsx(OwnerRecovery, {}) }), _jsx(Route, { path: "/documents", element: _jsx(DocumentsRoute, {}) }), _jsx(Route, { path: "/revisions", element: _jsx(RevisionsRoute, {}) }), _jsx(Route, { path: "/reviews", element: _jsx(ReviewsRoute, {}) }), _jsx(Route, { path: "/client-reviews", element: _jsx(ClientReviewsRoute, {}) }), _jsx(Route, { path: "/external-access", element: _jsx(ExternalAccessRoute, {}) }), _jsx(Route, { path: "/turnkey", element: _jsx(TurnkeyRoute, {}) }), _jsx(Route, { path: "/time", element: _jsx(TimeRoute, {}) }), _jsx(Route, { path: "/workforce", element: _jsx(WorkforceRoute, {}) }), _jsx(Route, { path: "/learning", element: _jsx(LearningRoute, {}, "learning-legacy") }), _jsx(Route, { path: "/learning/skills", element: _jsx(LearningRoute, { area: "skills" }, "learning-skills") }), _jsx(Route, { path: "/learning/training", element: _jsx(LearningRoute, { area: "training" }, "learning-training") }), _jsx(Route, { path: "/learning/library", element: _jsx(LearningRoute, { area: "library" }, "learning-library") }), _jsx(Route, { path: "/performance", element: _jsx(PerformanceRoute, {}, "performance") }), _jsx(Route, { path: "/project-health", element: _jsx(PerformanceRoute, { initialTab: "project", focused: true }, "project-health") }), _jsx(Route, { path: "/dashboard", element: _jsx(DashboardRoute, {}, "dashboard") }), _jsx(Route, { path: "/reports", element: _jsx(DashboardRoute, { initialTab: "reports", focused: true }, "reports") }), _jsx(Route, { path: "/integrations", element: _jsx(IntegrationsRoute, {}) }), _jsx(Route, { path: "/automation", element: _jsx(AutomationRoute, {}, "automation") }), _jsx(Route, { path: "/saved-reports", element: _jsx(AutomationRoute, { savedReportsOnly: true }, "saved-reports") }), _jsx(Route, { path: "/assistance", element: _jsx(AiAssistanceRoute, {}) }), _jsx(Route, { path: "/site", element: _jsx(SiteRoute, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }), _jsx("footer", { className: "site-footer", children: "Sense Studios \u00B7 Secure workspace" })] }));
}
function ExternalAccessRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to manage external access" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(StaffExternalAccessWorkspace, { csrfToken: session.csrfToken, owner: session.account.kind === "OWNER" }) }) }, session.account.id);
}
function TimeRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view time records" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(TimeWorkspace, { csrfToken: session.csrfToken, owner: session.account.kind === "OWNER" }) }) }, session.account.id);
}
function WorkforceRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view workforce records" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content workforce-route", children: _jsx(WorkforceWorkspace, { csrfToken: session.csrfToken, owner: session.account.kind === "OWNER" }) }) }, session.account.id);
}
function LearningRoute({ area }) {
    const { session, failed } = useProtectedRouteSession();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const legacyPanel = query.get("panel");
    const panel = area ?? (legacyPanel === "library" || (!legacyPanel && (query.has("recordId") || query.has("versionId"))) ? "library" : legacyPanel === "training" || (!legacyPanel && query.has("assignmentId")) ? "training" : legacyPanel === "skills" || (!legacyPanel && (query.has("employeeId") || query.has("ratingId") || query.has("changeId"))) ? "skills" : "legacy");
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view Learning" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    const areaLinks = [["skills", "Skills", "/learning?panel=skills"], ["training", "Training", "/learning?panel=training"], ["library", "Library", "/learning?panel=library"]];
    const preservedQuery = new URLSearchParams(location.search);
    preservedQuery.delete("panel");
    const queryString = preservedQuery.toString();
    const legacyCombined = panel === "legacy";
    return _jsx(WorkspaceLayout, { children: _jsxs("main", { className: "identity-content learning-route", children: [_jsx("nav", { className: "learning-area-tabs", "aria-label": "Learning areas", children: areaLinks.map(([key, label, path]) => _jsx(Link, { to: `${path}${queryString ? `&${queryString}` : ""}`, "aria-current": panel === key ? "page" : undefined, children: label }, key)) }), panel === "library" ? _jsx(LibraryWorkspace, { csrfToken: session.csrfToken }) : panel === "training" ? _jsx(TrainingWorkspace, { csrfToken: session.csrfToken }) : legacyCombined ? _jsx(SkillsTrainingWorkspace, { csrfToken: session.csrfToken }) : _jsx(SkillsWorkspace, { csrfToken: session.csrfToken })] }) }, session.account.id);
}
function PerformanceRoute({ initialTab = "employee", focused = false }) {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view performance records" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    const projectId = new URLSearchParams(window.location.search).get("projectId") ?? undefined;
    return _jsx(WorkspaceLayout, { children: _jsxs("main", { className: "identity-content", children: [_jsx(InsightsNavigation, { ...(projectId ? { projectId } : {}) }), _jsx(PerformanceWorkspace, { csrfToken: session.csrfToken, owner: session.account.kind === "OWNER", initialTab: initialTab, focused: focused })] }) }, session.account.id);
}
function DashboardRoute({ initialTab = "dashboard", focused = false }) {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view your dashboard" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    const reportsHome = initialTab === "reports";
    return _jsx(WorkspaceLayout, { children: _jsxs("main", { className: "identity-content", children: [reportsHome && _jsx(InsightsNavigation, {}), _jsx(DashboardWorkspace, { accountId: session.account.id, csrfToken: session.csrfToken, owner: session.account.kind === "OWNER", initialTab: initialTab, focused: focused })] }) }, session.account.id);
}
function IntegrationsRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to manage calendar integrations" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(IntegrationsWorkspace, { csrfToken: session.csrfToken }) }) }, session.account.id);
}
function AutomationRoute({ savedReportsOnly = false }) {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to manage automation and reports" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsxs("main", { className: "identity-content", children: [savedReportsOnly && _jsx(InsightsNavigation, {}), _jsx(AutomationWorkspace, { csrfToken: session.csrfToken, mode: savedReportsOnly ? "saved-reports" : "automation" })] }) }, session.account.id);
}
function SiteRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx(SiteOfflineCaptureRoute, {});
    if (!session) {
        const pointer = readOfflinePointer();
        if (pointer)
            void purgeOfflineAccount(pointer.accountId).catch(() => undefined);
        if (pointer)
            window.dispatchEvent(new Event("sense-session-ended"));
        clearOfflinePointer();
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view site delivery" }), _jsx(Link, { to: "/", children: "Return to sign in" })] }) });
    }
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to Owner setup" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(SiteWorkspace, { csrfToken: session.csrfToken, accountId: session.account.id }) }) }, session.account.id);
}
function AiAssistanceRoute() {
    const { session, failed } = useProtectedRouteSession();
    if (session === undefined && !failed)
        return _jsx("main", { className: "identity-content", children: _jsx("p", { className: "loading-state", role: "status", children: "Checking your session\u2026" }) });
    if (failed)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("p", { className: "auth-error", role: "alert", children: "We couldn\u2019t check your session. Try again from the workspace home." }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (!session)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Sign in to view evidence assistance" }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    if (session.account.kind === "OWNER" && session.ownerSetupRequired)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Complete Owner setup first" }), _jsx(Link, { to: "/", children: "Return to workspace" })] }) });
    return _jsx(WorkspaceLayout, { children: _jsx("main", { className: "identity-content", children: _jsx(AiAssistanceWorkspace, { csrfToken: session.csrfToken }) }) }, session.account.id);
}
