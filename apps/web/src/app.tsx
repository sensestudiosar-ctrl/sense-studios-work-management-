import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { NotificationCenter } from "./notifications.js";
import { AuditRetentionCenter } from "./audit-retention.js";
import { ApprovalQueue } from "./approval-queue.js";
import { CrmWorkspace } from "./crm.js";
import { ProjectWorkspace } from "./project.js";
import { TaskWorkspace } from "./task.js";
import { DocumentWorkspace } from "./document.js";
import { RevisionWorkspace } from "./revision.js";
import { ReviewWorkspace } from "./review.js";
import { StaffClientReviewWorkspace } from "./client-review.js";

const AUTH_PATH = "/api/v1/auth";
const ORG_PATH = "/api/v1/org";

type Account = { id: string; email: string; kind: "OWNER" | "STAFF" };
type Session = { account: Account; csrfToken: string; ownerSetupRequired?: boolean; activePasskeyCount?: number };
type DeviceSession = {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  userAgent: string | null;
  current: boolean;
};
type Org = { id: string; name: string; timezone?: string; settingsVersion?: number };
type Branch = { id: string; name: string };
type Team = { id: string; branchId: string; name: string; waitingAlertsEnabled?: boolean; settingsVersion?: number };
type RolePermission = { id: string; permissionKey: string; scopeKind: "ORGANIZATION" | "BRANCH" | "TEAM" | "SELF"; branchId?: string | null; teamId?: string | null };
type JobRole = { id: string; name: string; permissions?: RolePermission[] };
type EmployeeOverride = RolePermission & { effect: "ALLOW" | "DENY"; expiresAt: string | null };
type Employee = {
  id: string;
  state: string;
  employeeCode: string | null;
  account: { normalizedEmail: string; state: string };
  homeBranch: { id: string; name: string };
  homeTeam: { id: string; name: string };
  jobRoleAssignments: Array<{ jobRole: { id: string; name: string } }>;
  permissionOverrides: EmployeeOverride[];
  reportsTo: { id: string; account: { normalizedEmail: string } } | null;
};
type ManagedEmployee = {
  id: string;
  employeeCode: string | null;
  hiredAt: string;
  reportsToId: string | null;
  account: { normalizedEmail: string };
  jobRoleAssignments: Array<{ jobRole: { id: string; name: string } }>;
};
type ManagerOption = { id: string; email: string };
type AuthView =
  | { kind: "restoring" }
  | { kind: "signed-out"; notice?: string }
  | { kind: "signed-in"; session: Session }
  | { kind: "session-error"; message: string };
type LoginError = "invalid" | "throttled" | "network" | "unavailable" | "cancelled" | "unsupported";

async function readSession(): Promise<Session | null> {
  const response = await fetch(`${AUTH_PATH}/session`, {
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("session-unavailable");
  return (await response.json()) as Session;
}

function errorMessage(error: LoginError): string {
  switch (error) {
    case "invalid": return "We couldn’t sign you in. Check your passkey and try again.";
    case "throttled": return "Too many attempts. Wait a moment, then try again.";
    case "cancelled": return "The passkey request was cancelled. You can try again when ready.";
    case "network": return "We couldn’t reach the sign-in service. Check your connection and try again.";
    case "unavailable": return "Sign-in is temporarily unavailable. Try again shortly.";
    case "unsupported": return "This browser does not support passkeys. Open this page in a supported browser or device.";
  }
}

function isCancellation(error: unknown): boolean {
  return error instanceof Error && ["NotAllowedError", "AbortError"].includes(error.name);
}

function isUnsupportedPasskeyBrowser(error: unknown): boolean {
  return !window.PublicKeyCredential || (error instanceof Error && ["NotSupportedError", "SecurityError"].includes(error.name));
}

function deviceDescription(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Firefox\//.test(userAgent) ? "Firefox" : /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const platform = /iPhone|iPad/.test(userAgent) ? "iOS" : /Android/.test(userAgent) ? "Android" : /Windows/.test(userAgent) ? "Windows" : /Mac OS/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "device";
  return `${browser} on ${platform}`;
}

function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

function Login({ onSignedIn, notice }: { onSignedIn: (session: Session) => void; notice: string | undefined }): React.JSX.Element {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  const signIn = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (pending) return;
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
      if (optionsResponse.status === 429) throw new Error("throttled");
      if (!optionsResponse.ok) throw new Error(optionsResponse.status >= 500 ? "unavailable" : "invalid");
      const { ceremonyId, options } = await optionsResponse.json() as {
        ceremonyId: string;
        options: Parameters<typeof startAuthentication>[0]["optionsJSON"];
      };
      const response = await startAuthentication({ optionsJSON: options });
      const verifyResponse = await fetch(`${AUTH_PATH}/passkey/login/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ceremonyId, response }),
      });
      if (verifyResponse.status === 429) throw new Error("throttled");
      if (!verifyResponse.ok) throw new Error(verifyResponse.status >= 500 ? "unavailable" : "invalid");
      const session = await readSession();
      if (!session) throw new Error("invalid");
      onSignedIn(session);
    } catch (cause) {
      if (cause instanceof Error && ["invalid", "throttled", "unavailable"].includes(cause.message)) {
        setError(cause.message as LoginError);
      } else if (isCancellation(cause)) {
        setError("cancelled");
      } else {
        setError("network");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth-content">
      <section className="auth-card" aria-labelledby="login-heading">
        <div className="eyebrow">SENSE STUDIOS WORKSPACE</div>
        <h1 id="login-heading">Sign in with your passkey</h1>
        <p className="auth-intro">Use the passkey registered to your work account to continue.</p>
        {notice && <p className="notice" role="status">{notice}</p>}
        {error && <p className="auth-error" role="alert">{errorMessage(error)}</p>}
        <form onSubmit={(event) => void signIn(event)}>
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username webauthn"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
            disabled={pending}
          />
          <button className="primary-action" type="submit" disabled={pending || !email.trim()}>
            {pending ? "Waiting for passkey…" : "Continue with passkey"}
          </button>
        </form>
        {!window.PublicKeyCredential && <p className="support-note">This browser may not support passkeys. Use a supported browser or device.</p>}
        <nav className="identity-links" aria-label="Identity setup">
          <Link to="/bootstrap">Set up the first Owner account</Link>
          <Link to="/enroll">Accept an invitation or recovery token</Link>
          <Link to="/owner-recovery">Recover an Owner account</Link>
        </nav>
      </section>
    </main>
  );
}

function Identity({ session, onLogout, busy, error }: {
  session: Session;
  onLogout: () => void;
  busy: boolean;
  error: string | undefined;
}): React.JSX.Element {
  const [currentSession, setCurrentSession] = useState(session);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string>();
  const [tokenExpiresIn, setTokenExpiresIn] = useState<number>();
  const [storedOffline, setStoredOffline] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRecoveryEmail, setStaffRecoveryEmail] = useState("");
  const [recoveryTarget, setRecoveryTarget] = useState<{ id: string; email: string; state: string } | null>(null);
  const [recoveryReason, setRecoveryReason] = useState("");
  const [verifiedOutOfBand, setVerifiedOutOfBand] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[] | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string>();
  const [revokingSessionId, setRevokingSessionId] = useState<string>();
  const [organizationSettingsOpen, setOrganizationSettingsOpen] = useState(false);
  const [teamWorkspaceOpen, setTeamWorkspaceOpen] = useState(false);

  useEffect(() => setCurrentSession(session), [session]);

  const loadDeviceSessions = useCallback(async (): Promise<void> => {
    setSessionsLoading(true);
    setSessionsError(undefined);
    try {
      const response = await fetch(`${AUTH_PATH}/sessions`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("sessions-unavailable");
      setDeviceSessions(await response.json() as DeviceSession[]);
    } catch {
      setSessionsError("We couldn’t load your sessions. Try again.");
    } finally { setSessionsLoading(false); }
  }, []);

  useEffect(() => { void loadDeviceSessions(); }, [loadDeviceSessions]);

  const revokeDeviceSession = async (item: DeviceSession): Promise<void> => {
    if (item.current || revokingSessionId) return;
    setRevokingSessionId(item.id);
    setSessionsError(undefined);
    try {
      const response = await fetch(`${AUTH_PATH}/sessions/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRF-Token": currentSession.csrfToken },
      });
      if (!response.ok) throw new Error("session-revoke-failed");
      await loadDeviceSessions();
    } catch {
      setSessionsError("We couldn’t revoke that session. Refresh the list and try again.");
    } finally { setRevokingSessionId(undefined); }
  };

  const addOwnerPasskey = async (): Promise<void> => {
    setPending(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    let browserRegistration = false;
    try {
      const options = await apiPost(`${AUTH_PATH}/passkey/register/options`, {}, currentSession.csrfToken) as Ceremony;
      browserRegistration = true;
      const response = await startRegistration({ optionsJSON: options.options });
      browserRegistration = false;
      await apiPost(`${AUTH_PATH}/passkey/register/verify`, { ceremonyId: options.ceremonyId, response }, currentSession.csrfToken);
      const updated = await readSession();
      if (updated) setCurrentSession(updated);
      setActionSuccess("Passkey added to this account.");
    } catch (cause) {
      setActionError(browserRegistration ? passkeyRegistrationError(cause) : publicFlowError(cause));
    } finally { setPending(false); }
  };

  const createRecoveryCode = async (): Promise<void> => {
    setPending(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    try {
      const result = await apiPost(`${AUTH_PATH}/owner/recovery-code`, {}, currentSession.csrfToken) as { recoveryCode: string };
      setToken(result.recoveryCode);
      setTokenExpiresIn(undefined);
      setStoredOffline(false);
    } catch (cause) { setActionError(publicFlowError(cause, "Register a second distinct passkey before creating the recovery code.")); }
    finally { setPending(false); }
  };

  const acknowledgeRecoveryCode = async (): Promise<void> => {
    if (!storedOffline) return;
    setPending(true);
    setActionError(undefined);
    try {
      await apiPost(`${AUTH_PATH}/owner/recovery-code/ack`, { confirmedStoredOffline: true }, currentSession.csrfToken);
      const updated = await readSession();
      if (updated) setCurrentSession(updated);
      setToken(undefined);
      setActionSuccess("Owner setup is complete. Keep the recovery code offline and use it only once.");
    } catch (cause) { setActionError(publicFlowError(cause)); }
    finally { setPending(false); }
  };

  const createInvitation = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setPending(true); setActionError(undefined); setActionSuccess(undefined); setToken(undefined); setTokenExpiresIn(undefined);
    try {
      const result = await apiPost(`${AUTH_PATH}/staff/invitations`, { email: staffEmail.trim() }, currentSession.csrfToken) as { invitationToken: string; expiresInSeconds: number };
      setToken(result.invitationToken);
      setTokenExpiresIn(result.expiresInSeconds);
    } catch (cause) { setActionError(publicFlowError(cause)); }
    finally { setPending(false); }
  };

  const authorizeRecovery = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!recoveryTarget) return;
    setPending(true); setActionError(undefined); setActionSuccess(undefined); setToken(undefined); setTokenExpiresIn(undefined);
    try {
      const result = await apiPost(`${AUTH_PATH}/staff/${encodeURIComponent(recoveryTarget.id)}/recovery`, {
        reason: recoveryReason.trim(), verifiedOutOfBand: true,
      }, currentSession.csrfToken) as { recoveryToken: string; expiresInSeconds: number };
      setToken(result.recoveryToken);
      setTokenExpiresIn(result.expiresInSeconds);
    } catch (cause) { setActionError(publicFlowError(cause)); }
    finally { setPending(false); }
  };

  const revokeStaffSessions = async (): Promise<void> => {
    if (!recoveryTarget || recoveryReason.trim().length < 10) return;
    setPending(true); setActionError(undefined); setActionSuccess(undefined);
    try {
      const result = await apiPost(`${AUTH_PATH}/staff/${encodeURIComponent(recoveryTarget.id)}/revoke-sessions`, {
        reason: recoveryReason.trim(),
      }, currentSession.csrfToken) as { revokedSessions: number };
      setActionSuccess(`${result.revokedSessions} staff session${result.revokedSessions === 1 ? "" : "s"} revoked.`);
    } catch (cause) { setActionError(publicFlowError(cause)); }
    finally { setPending(false); }
  };

  const lookupStaff = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setPending(true); setActionError(undefined); setRecoveryTarget(null);
    try {
      const response = await fetch(`${AUTH_PATH}/staff?email=${encodeURIComponent(staffRecoveryEmail.trim())}`, {
        credentials: "include", cache: "no-store",
      });
      if (!response.ok) throw Object.assign(new Error("lookup-failed"), { status: response.status });
      const result = await response.json() as { account: { id: string; email: string; state: string } | null };
      if (!result.account || result.account.state !== "ACTIVE") {
        setActionError("No active staff account was found for that email.");
      } else {
        setRecoveryTarget(result.account);
        setVerifiedOutOfBand(false);
      }
    } catch (cause) { setActionError(publicFlowError(cause)); }
    finally { setPending(false); }
  };

  const refreshIdentity = async (): Promise<void> => {
    setRefreshing(true);
    try { const updated = await readSession(); if (updated) setCurrentSession(updated); else onLogout(); }
    catch { setActionError("We couldn’t refresh your session. Try again."); }
    finally { setRefreshing(false); }
  };

  const ownerNeedsSetup = currentSession.account.kind === "OWNER" && currentSession.ownerSetupRequired === true;
  const copyToken = async (): Promise<void> => {
    if (!token) return;
    try { await navigator.clipboard.writeText(token); setActionError(undefined); setActionSuccess("Copied. Store or hand off this one-time secret securely."); }
    catch { setActionSuccess(undefined); setActionError("Copy is unavailable in this browser. Select and copy the secret manually."); }
  };

  return (
    <main className="identity-content">
      <div className="eyebrow">IDENTITY</div>
      <h1>You’re signed in.</h1>
      <p className="auth-intro">Your account is authenticated. Workspace access will appear as approved capabilities are added.</p>
      <section className="identity-card" aria-labelledby="identity-heading">
        <div className="identity-avatar" aria-hidden="true">{currentSession.account.email.slice(0, 1).toUpperCase()}</div>
        <div className="identity-details">
          <h2 id="identity-heading">Account</h2>
          <p>{currentSession.account.email}</p>
          <span className="account-kind">{currentSession.account.kind === "OWNER" ? "Owner account" : "Staff account"}</span>
        </div>
        <button type="button" onClick={onLogout} disabled={busy}>
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </section>
      <nav className="document-navigation" aria-label="Workspace navigation"><Link to="/documents">Project documents</Link><Link to="/revisions">Drawing register</Link><Link to="/reviews">Internal reviews</Link><Link to="/client-reviews">Client reviews</Link></nav>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {!ownerNeedsSetup && <ApprovalQueue />}
      {!ownerNeedsSetup && <CrmWorkspace csrfToken={currentSession.csrfToken} owner={currentSession.account.kind === "OWNER"} />}
      {!ownerNeedsSetup && <ProjectWorkspace csrfToken={currentSession.csrfToken} owner={currentSession.account.kind === "OWNER"} />}
      {!ownerNeedsSetup && <TaskWorkspace csrfToken={currentSession.csrfToken} owner={currentSession.account.kind === "OWNER"} />}
      <section className="identity-section sessions-section" aria-labelledby="sessions-heading">
        <div className="sessions-heading-row">
          <div><div className="eyebrow">DEVICES</div><h2 id="sessions-heading">Active sessions</h2></div>
          <button className="secondary-action" type="button" onClick={() => void loadDeviceSessions()} disabled={sessionsLoading}>Refresh</button>
        </div>
        {sessionsLoading && <p role="status" className="identity-note">Loading your sessions…</p>}
        {sessionsError && <div className="sessions-error"><p role="alert" className="auth-error">{sessionsError}</p><button className="secondary-action" type="button" onClick={() => void loadDeviceSessions()}>Try again</button></div>}
        {!sessionsLoading && !sessionsError && deviceSessions?.length === 0 && <p className="identity-note" role="status">No sessions are available.</p>}
        {!sessionsLoading && !sessionsError && deviceSessions && deviceSessions.length > 0 && (
          <ul className="session-list">
            {deviceSessions.map((item) => {
              const expired = new Date(item.expiresAt).getTime() <= Date.now();
              const status = item.current ? "Current device" : item.revokedAt ? "Revoked" : expired ? "Expired" : "Active";
              return <li className="session-item" key={item.id}>
                <div className="session-copy">
                  <h3>{deviceDescription(item.userAgent)}{item.current && <span className="current-device-badge">This device</span>}</h3>
                  <p>{status} · Signed in {displayDate(item.createdAt)}</p>
                  {item.lastUsedAt && <p>Last used {displayDate(item.lastUsedAt)}</p>}
                </div>
                {!item.current && !item.revokedAt && !expired && <button className="secondary-action" type="button" disabled={revokingSessionId !== undefined} onClick={() => void revokeDeviceSession(item)}>{revokingSessionId === item.id ? "Revoking…" : "Revoke"}</button>}
              </li>;
            })}
          </ul>
        )}
      </section>
      <NotificationCenter csrfToken={currentSession.csrfToken} />
      {currentSession.account.kind === "OWNER" && currentSession.ownerSetupRequired === false && <AuditRetentionCenter csrfToken={currentSession.csrfToken} />}
      {ownerNeedsSetup && (
        <section className="identity-section" aria-labelledby="owner-setup-heading">
          <div className="eyebrow">OWNER SETUP</div><h2 id="owner-setup-heading">Secure your Owner account</h2>
          <p>Add a second distinct passkey, create your one-time offline recovery code, then confirm that you stored it safely.</p>
          {!token && <div className="identity-actions">
            {(currentSession.activePasskeyCount ?? 0) < 2 && <button type="button" disabled={pending} onClick={() => void addOwnerPasskey()}>Add second passkey</button>}
            {(currentSession.activePasskeyCount ?? 0) >= 2 && <button type="button" disabled={pending} onClick={() => void createRecoveryCode()}>Create offline recovery code</button>}
          </div>}
          {token && <div className="secret-handoff">
            <label htmlFor="recovery-code">One-time offline recovery code</label><textarea id="recovery-code" readOnly value={token} rows={2} />
            <button type="button" onClick={() => void copyToken()}>Copy code</button>
            <label className="check-row"><input type="checkbox" checked={storedOffline} onChange={(event) => setStoredOffline(event.target.checked)} />I stored this recovery code offline where only I can access it.</label>
            <button type="button" disabled={pending || !storedOffline} onClick={() => void acknowledgeRecoveryCode()}>Confirm offline storage</button>
          </div>}
        </section>
      )}
      {currentSession.account.kind === "OWNER" && currentSession.ownerSetupRequired === false && (
        <section className="identity-section" aria-labelledby="organization-settings-toggle">
          <div className="sessions-heading-row">
            <div><div className="eyebrow">ORGANIZATION</div><h2 id="organization-settings-toggle">Organization settings</h2></div>
            <button className="secondary-action" type="button" aria-expanded={organizationSettingsOpen} onClick={() => setOrganizationSettingsOpen((open) => !open)}>
              {organizationSettingsOpen ? "Hide settings" : "Manage organization"}
            </button>
          </div>
          {organizationSettingsOpen && <OrganizationAdmin session={currentSession} />}
        </section>
      )}
      {currentSession.account.kind === "STAFF" && (
        <section className="identity-section" aria-labelledby="team-workspace-heading">
          <div className="sessions-heading-row">
            <div><div className="eyebrow">TEAM</div><h2 id="team-workspace-heading">Team workspace</h2></div>
            <button className="secondary-action" type="button" aria-expanded={teamWorkspaceOpen} onClick={() => setTeamWorkspaceOpen((open) => !open)}>
              {teamWorkspaceOpen ? "Close team workspace" : "Open team workspace"}
            </button>
          </div>
          {teamWorkspaceOpen && <TeamWorkspace session={currentSession} />}
        </section>
      )}
      {currentSession.account.kind === "OWNER" && currentSession.ownerSetupRequired === false && (
        <section className="identity-section" aria-labelledby="staff-identity-heading">
          <div className="eyebrow">IDENTITY ADMINISTRATION</div><h2 id="staff-identity-heading">Staff identity access</h2>
          <form className="identity-form" onSubmit={(event) => void createInvitation(event)}>
            <label htmlFor="staff-invite-email">Invite staff by work email</label>
            <div className="inline-form"><input id="staff-invite-email" type="email" required maxLength={320} value={staffEmail} onChange={(event) => setStaffEmail(event.target.value)} /><button disabled={pending}>Create invitation</button></div>
          </form>
          <form className="identity-form" onSubmit={(event) => void lookupStaff(event)}>
            <label htmlFor="staff-recovery-email">Work email for verified staff recovery</label>
            <div className="inline-form"><input id="staff-recovery-email" type="email" maxLength={320} value={staffRecoveryEmail} onChange={(event) => { setStaffRecoveryEmail(event.target.value); setRecoveryTarget(null); }} required /><button disabled={pending}>Find staff account</button></div>
          </form>
          {recoveryTarget && <form className="identity-form" onSubmit={(event) => void authorizeRecovery(event)}>
            <p className="resolved-account">Recovery target: <strong>{recoveryTarget.email}</strong></p>
            <label htmlFor="recovery-reason">Reason for recovery authorization</label>
            <textarea id="recovery-reason" minLength={10} maxLength={1000} value={recoveryReason} onChange={(event) => setRecoveryReason(event.target.value)} required />
            <p className="identity-note">Revoking sessions signs the staff member out immediately. Recovery also revokes sessions and passkeys.</p>
            <button type="button" className="secondary-action" disabled={pending || recoveryReason.trim().length < 10} onClick={() => void revokeStaffSessions()}>Revoke staff sessions</button>
            <label className="check-row"><input type="checkbox" checked={verifiedOutOfBand} onChange={(event) => setVerifiedOutOfBand(event.target.checked)} required />I verified this staff member out of band.</label>
            <button disabled={pending || !verifiedOutOfBand}>Revoke access and authorize recovery</button>
          </form>}
          {token && <div className="secret-handoff"><label htmlFor="handoff-token">One-time enrollment token for secure handoff</label><textarea id="handoff-token" readOnly value={token} rows={2} />{tokenExpiresIn !== undefined && <p className="identity-note">Expires in {Math.ceil(tokenExpiresIn / 3600)} hours.</p>}<button type="button" onClick={() => void copyToken()}>Copy token</button><button type="button" className="secondary-action" onClick={() => { setToken(undefined); setTokenExpiresIn(undefined); }}>Hide token</button></div>}
        </section>
      )}
      {actionError && <p className="auth-error" role="alert">{actionError}</p>}
      {actionSuccess && <p className="notice" role="status">{actionSuccess}</p>}
      <div className="identity-bottom-actions">
        <button className="secondary-action" type="button" onClick={() => void refreshIdentity()} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh session"}</button>
        <p className="identity-note" role="status">Your sign-in is checked again when you return to this page.</p>
      </div>
    </main>
  );
}

function passkeyRegistrationError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const name = error instanceof Error ? error.name : "UnknownError";
  const detail = import.meta.env.DEV ? ` (browser detail: ${name}${code ? ` / ${code}` : ""})` : "";
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") return `That passkey is already registered. Choose a different passkey method, such as your phone or a security key.${detail}`;
  if (isCancellation(error)) return `The passkey request was cancelled or declined by the browser. You can try again when ready.${detail}`;
  if (isUnsupportedPasskeyBrowser(error)) return `This browser does not support passkeys. Open this page in a supported browser or device.${detail}`;
  return `The browser could not create another passkey with that method. Choose a different device or security key and try again.${detail}`;
}

function OrganizationAdmin({ session }: { session: Session }): React.JSX.Element {
  const [organization, setOrganization] = useState<Org | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [orgName, setOrgName] = useState("");
  const [orgTimezone, setOrgTimezone] = useState("Asia/Kolkata");
  const [branchName, setBranchName] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissionRoleId, setPermissionRoleId] = useState("");
  const [permissionKey, setPermissionKey] = useState("");
  const [permissionScope, setPermissionScope] = useState<RolePermission["scopeKind"]>("ORGANIZATION");
  const [permissionBranchId, setPermissionBranchId] = useState("");
  const [permissionTeamId, setPermissionTeamId] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffAccount, setStaffAccount] = useState<{ id: string; email: string; state: string } | null>(null);
  const [employeeBranchId, setEmployeeBranchId] = useState("");
  const employeeBranchIdRef = useRef("");
  const [employeeTeamId, setEmployeeTeamId] = useState("");
  const [employeeRoleIds, setEmployeeRoleIds] = useState<string[]>([]);
  const [editingRolesEmployeeId, setEditingRolesEmployeeId] = useState("");
  const [editingRoleIds, setEditingRoleIds] = useState<string[]>([]);
  const [editingMembershipEmployeeId, setEditingMembershipEmployeeId] = useState("");
  const [membershipBranchId, setMembershipBranchId] = useState("");
  const [membershipTeamId, setMembershipTeamId] = useState("");
  const [membershipReportsToId, setMembershipReportsToId] = useState("");
  const [editingPermissionsEmployeeId, setEditingPermissionsEmployeeId] = useState("");
  const [overridePermissionKey, setOverridePermissionKey] = useState("");
  const [overrideEffect, setOverrideEffect] = useState<"ALLOW" | "DENY">("DENY");
  const [overrideScope, setOverrideScope] = useState<RolePermission["scopeKind"]>("SELF");
  const [overrideBranchId, setOverrideBranchId] = useState("");
  const [overrideTeamId, setOverrideTeamId] = useState("");
  const [overrideExpiresAt, setOverrideExpiresAt] = useState("");
  const [managerId, setManagerId] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [hiredAt, setHiredAt] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [suspendingEmployee, setSuspendingEmployee] = useState("");
  const [exitingEmployee, setExitingEmployee] = useState("");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      const orgResponse = await fetch(ORG_PATH, { credentials: "include", cache: "no-store" });
      if (!orgResponse.ok) throw Object.assign(new Error("organization-unavailable"), { status: orgResponse.status });
      const org = await orgResponse.json() as Org | null;
      setOrganization(org);
      setOrgTimezone(org?.timezone ?? "Asia/Kolkata");
      if (!org) { setBranches([]); setTeams([]); setRoles([]); setEmployees([]); return; }
      const query = `?organizationId=${encodeURIComponent(org.id)}`;
      const [branchResponse, teamResponse, roleResponse, employeeResponse] = await Promise.all([
        fetch(`${ORG_PATH}/branches${query}`, { credentials: "include", cache: "no-store" }),
        fetch(`${ORG_PATH}/teams${query}`, { credentials: "include", cache: "no-store" }),
        fetch(`${ORG_PATH}/roles${query}`, { credentials: "include", cache: "no-store" }),
        fetch(`${ORG_PATH}/employees${query}`, { credentials: "include", cache: "no-store" })
      ]);
      if ([branchResponse, teamResponse, roleResponse, employeeResponse].some((response) => !response.ok)) throw new Error("organization-unavailable");
      const [nextBranches, nextTeams, nextRoles, nextEmployees] = await Promise.all([
        branchResponse.json() as Promise<Branch[]>, teamResponse.json() as Promise<Team[]>,
        roleResponse.json() as Promise<JobRole[]>, employeeResponse.json() as Promise<Employee[]>
      ]);
      setBranches(nextBranches); setTeams(nextTeams); setRoles(nextRoles); setEmployees(nextEmployees);
      setSelectedBranchId((current) => nextBranches.some((item) => item.id === current) ? current : nextBranches[0]?.id ?? "");
      const nextEmployeeBranchId = nextBranches.some((item) => item.id === employeeBranchIdRef.current)
        ? employeeBranchIdRef.current : nextBranches[0]?.id ?? "";
      employeeBranchIdRef.current = nextEmployeeBranchId;
      setEmployeeBranchId(nextEmployeeBranchId);
      setEmployeeTeamId((current) => nextTeams.some((item) => item.id === current && item.branchId === nextEmployeeBranchId) ? current : "");
    } catch (cause) {
      const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
      setError(status === 403 ? "Organization access is restricted to a fully secured Owner session." : "We couldn’t load organization settings. Try again.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const mutate = async (path: string, method: "POST" | "PUT", body: unknown): Promise<void> => {
    setPending(true); setError(undefined); setSuccess(undefined);
    try {
      const response = await fetch(`${ORG_PATH}${path}`, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw Object.assign(new Error("organization-write-failed"), { status: response.status });
      await load();
      setSuccess("Organization settings saved.");
    } catch (cause) {
      const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
      setError(status === 403 ? "Sign in again before changing organization settings." : "We couldn’t save this change. Check the details and try again.");
    } finally { setPending(false); }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>, action: () => Promise<void>): void => {
    event.preventDefault();
    if (!pending) void action();
  };

  const requireReason = reason.trim();
  const orgBody = { name: orgName.trim(), reason: requireReason };

  const findStaff = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setPending(true); setError(undefined); setSuccess(undefined); setStaffAccount(null);
    try {
      const response = await fetch(`${AUTH_PATH}/staff?email=${encodeURIComponent(staffEmail.trim())}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("identity-lookup-failed");
      const result = await response.json() as { account: { id: string; email: string; state: string } | null };
      if (!result.account || result.account.state !== "ACTIVE") setError("No active staff identity was found for that email.");
      else { setStaffAccount(result.account); setSuccess("Active staff identity found. Choose the employee’s home membership below."); }
    } catch { setError("We couldn’t look up that staff identity. Try again."); }
    finally { setPending(false); }
  };

  const visibleEmployeeTeams = teams.filter((item) => item.branchId === employeeBranchId);
  const visiblePermissionTeams = teams.filter((item) => item.branchId === permissionBranchId);
  const visibleOverrideTeams = teams.filter((item) => item.branchId === overrideBranchId);
  const visibleMembershipTeams = teams.filter((item) => item.branchId === membershipBranchId);
  const grantRolePermission = (): Promise<void> => mutate(`/roles/${encodeURIComponent(permissionRoleId)}/permissions`, "POST", {
    organizationId: organization?.id, permissionKey: permissionKey.trim(), scopeKind: permissionScope,
    ...(permissionScope === "BRANCH" || permissionScope === "TEAM" ? { branchId: permissionBranchId } : {}),
    ...(permissionScope === "TEAM" ? { teamId: permissionTeamId } : {}), reason: requireReason
  });
  const grantEmployeeOverride = (employeeId: string): Promise<void> => mutate(`/employees/${encodeURIComponent(employeeId)}/permissions`, "POST", {
    organizationId: organization?.id, permissionKey: overridePermissionKey.trim(), effect: overrideEffect, scopeKind: overrideScope,
    ...(overrideScope === "BRANCH" || overrideScope === "TEAM" ? { branchId: overrideBranchId } : {}),
    ...(overrideScope === "TEAM" ? { teamId: overrideTeamId } : {}),
    ...(overrideExpiresAt ? { expiresAt: new Date(overrideExpiresAt).toISOString() } : {}), reason: requireReason
  });
  return <section className="identity-section org-admin" aria-labelledby="organization-heading">
    <div className="sessions-heading-row">
      <div><div className="eyebrow">ORGANIZATION</div><h2 id="organization-heading">Branches, teams and employees</h2></div>
      <button className="secondary-action" type="button" onClick={() => void load()} disabled={loading || pending}>Refresh</button>
    </div>
    {loading && <p className="identity-note" role="status">Loading organization settings…</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    {success && <p className="notice" role="status">{success}</p>}
    {!loading && !organization && <form className="identity-form" onSubmit={(event) => submit(event, () => mutate("", "POST", orgBody))}>
      <h3>Set up the organization</h3>
      <label htmlFor="org-name">Organization name</label><input id="org-name" required minLength={2} maxLength={160} value={orgName} onChange={(event) => setOrgName(event.target.value)} />
      <label htmlFor="org-reason">Reason</label><textarea id="org-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
      <button disabled={pending || orgName.trim().length < 2 || requireReason.length < 10}>{pending ? "Saving…" : "Create organization"}</button>
    </form>}
    {!loading && organization && <>
      <p className="identity-note">{organization.name}. Job roles, reporting lines and permissions are managed separately. An employee can hold multiple job roles.</p>
      <div className="org-form-grid">
        <form className="identity-form" onSubmit={(event) => submit(event, () => mutate("/branches", "POST", { organizationId: organization.id, name: branchName.trim(), reason: requireReason }))}>
          <h3>Add a branch</h3><label htmlFor="branch-name">Branch name</label><input id="branch-name" required maxLength={120} value={branchName} onChange={(event) => setBranchName(event.target.value)} />
          <label htmlFor="org-reason-branch">Reason</label><textarea id="org-reason-branch" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
          <button disabled={pending || !branchName.trim() || requireReason.length < 10}>Add branch</button>
        </form>
        <form className="identity-form" onSubmit={(event) => submit(event, () => mutate("/teams", "POST", { organizationId: organization.id, branchId: selectedBranchId, name: teamName.trim(), reason: requireReason }))}>
          <h3>Add a team</h3><label htmlFor="team-branch">Branch</label><select id="team-branch" required value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)}><option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
          <label htmlFor="team-name">Team name</label><input id="team-name" required maxLength={120} value={teamName} onChange={(event) => setTeamName(event.target.value)} />
          <label htmlFor="org-reason-team">Reason</label><textarea id="org-reason-team" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
          <button disabled={pending || !selectedBranchId || !teamName.trim() || requireReason.length < 10}>Add team</button>
        </form>
        <form className="identity-form" onSubmit={(event) => submit(event, () => mutate("/roles", "POST", { organizationId: organization.id, name: roleName.trim(), description: roleDescription.trim() || undefined, reason: requireReason }))}>
          <h3>Add a job role</h3><label htmlFor="role-name">Role name</label><input id="role-name" required maxLength={120} value={roleName} onChange={(event) => setRoleName(event.target.value)} />
          <label htmlFor="role-description">Description</label><textarea id="role-description" maxLength={1000} value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} />
          <label htmlFor="org-reason-role">Reason</label><textarea id="org-reason-role" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
          <button disabled={pending || !roleName.trim() || requireReason.length < 10}>Add job role</button>
        </form>
      </div>
      <div className="org-list-grid">
        <section aria-labelledby="branches-list-heading"><h3 id="branches-list-heading">Branches</h3>{branches.length ? <ul>{branches.map((branch) => <li key={branch.id}>{branch.name}</li>)}</ul> : <p className="identity-note">No branches yet.</p>}</section>
        <section aria-labelledby="teams-list-heading"><h3 id="teams-list-heading">Teams</h3>{teams.length ? <ul>{teams.map((team) => <li key={team.id}><span>{branches.find((branch) => branch.id === team.branchId)?.name}: {team.name} · Waiting alerts {team.waitingAlertsEnabled ? "enabled" : "disabled"}</span><button className="secondary-action" type="button" disabled={pending || requireReason.length < 3} onClick={() => void mutate(`/teams/${team.id}/waiting-alerts`, "PUT", { enabled: !team.waitingAlertsEnabled, expectedVersion: team.settingsVersion ?? 1, reason: requireReason })}>{team.waitingAlertsEnabled ? "Disable" : "Enable"} Waiting alerts for {team.name}</button></li>)}</ul> : <p className="identity-note">No teams yet.</p>}</section>
        <form className="identity-form" aria-label="Organization timezone" onSubmit={(event) => submit(event, () => mutate(`/${organization.id}/timezone`, "PUT", { timezone: orgTimezone.trim(), expectedVersion: organization.settingsVersion ?? 1, reason: requireReason }))}><h3>Recurring task timezone</h3><p className="identity-note">Schedule dates use this organization timezone. Missed dates are skipped; monthly dates use the last day in shorter months.</p><label htmlFor="organization-timezone">IANA timezone</label><input id="organization-timezone" value={orgTimezone} onChange={(event) => setOrgTimezone(event.target.value)} maxLength={80} required /><button className="secondary-action" type="submit" disabled={pending || requireReason.length < 3 || !orgTimezone.trim() || orgTimezone.trim() === (organization.timezone ?? "Asia/Kolkata")}>Change timezone</button></form>
        <section aria-labelledby="roles-list-heading"><h3 id="roles-list-heading">Job roles</h3>{roles.length ? <ul>{roles.map((role) => <li key={role.id}>{role.name}</li>)}</ul> : <p className="identity-note">No job roles yet.</p>}</section>
      </div>
      <section className="org-permission-manager" aria-labelledby="role-permissions-heading">
        <h3 id="role-permissions-heading">Job role permission bundles</h3>
        <p className="identity-note">Permissions are granted explicitly to a job role. Role names do not grant access by themselves.</p>
        {roles.length === 0 ? <p className="identity-note">Create a job role before configuring permissions.</p> : <>
          <form className="org-permission-form" onSubmit={(event) => submit(event, grantRolePermission)}>
            <label htmlFor="permission-role">Job role</label>
            <select id="permission-role" required value={permissionRoleId} onChange={(event) => setPermissionRoleId(event.target.value)}>
              <option value="">Select a job role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <label htmlFor="permission-key">Permission key</label>
            <input id="permission-key" required minLength={2} maxLength={160} value={permissionKey} onChange={(event) => setPermissionKey(event.target.value)} placeholder="e.g. projects.read" />
            <label htmlFor="permission-scope">Permission scope</label>
            <select id="permission-scope" value={permissionScope} onChange={(event) => { setPermissionScope(event.target.value as RolePermission["scopeKind"]); setPermissionTeamId(""); }}>
              <option value="ORGANIZATION">Organization</option><option value="BRANCH">Branch</option><option value="TEAM">Team</option><option value="SELF">Self</option>
            </select>
            {(permissionScope === "BRANCH" || permissionScope === "TEAM") && <>
              <label htmlFor="permission-branch">Branch</label>
              <select id="permission-branch" required value={permissionBranchId} onChange={(event) => { setPermissionBranchId(event.target.value); setPermissionTeamId(""); }}>
                <option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </>}
            {permissionScope === "TEAM" && <>
              <label htmlFor="permission-team">Team</label>
              <select id="permission-team" required value={permissionTeamId} onChange={(event) => setPermissionTeamId(event.target.value)}>
                <option value="">Select a team</option>{visiblePermissionTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </>}
            <label htmlFor="permission-reason">Reason</label>
            <textarea id="permission-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
            <button disabled={pending || !permissionRoleId || !permissionKey.trim() || requireReason.length < 10 || ((permissionScope === "BRANCH" || permissionScope === "TEAM") && !permissionBranchId) || (permissionScope === "TEAM" && !permissionTeamId)}>{pending ? "Saving…" : "Grant permission"}</button>
          </form>
          <div className="org-role-permission-list">
            {roles.map((role) => <section key={role.id} aria-labelledby={`role-permissions-${role.id}`}>
              <h4 id={`role-permissions-${role.id}`}>{role.name}</h4>
              {role.permissions?.length ? <ul>{role.permissions.map((permission) => <li key={permission.id}>
                <span><strong>{permission.permissionKey}</strong> · {permission.scopeKind}{permission.branchId ? ` · ${branches.find((item) => item.id === permission.branchId)?.name ?? "Branch"}` : ""}{permission.teamId ? ` / ${teams.find((item) => item.id === permission.teamId)?.name ?? "Team"}` : ""}</span>
                <button type="button" className="secondary-action" disabled={pending || requireReason.length < 10} aria-label={`Revoke ${permission.permissionKey} from ${role.name}`} onClick={() => void mutate(`/roles/${encodeURIComponent(role.id)}/permissions/${encodeURIComponent(permission.id)}/revoke`, "PUT", { reason: requireReason })}>Revoke</button>
              </li>)}</ul> : <p className="identity-note">No active permissions assigned.</p>}
            </section>)}
          </div>
        </>}
      </section>
      <form className="identity-form" onSubmit={(event) => void findStaff(event)}>
        <h3>Create an employee record</h3><p className="identity-note">The person must first accept an Owner invitation and register a passkey under Staff identity access.</p>
        <label htmlFor="employee-staff-email">Staff work email</label><div className="inline-form"><input id="employee-staff-email" type="email" required maxLength={320} value={staffEmail} onChange={(event) => { setStaffEmail(event.target.value); setStaffAccount(null); }} /><button type="submit" disabled={pending || !staffEmail.trim()}>Find active identity</button></div>
      </form>
      {staffAccount && !employees.some((employee) => employee.id === staffAccount.id) && <form className="identity-form" onSubmit={(event) => submit(event, () => mutate("/employees", "POST", {
        organizationId: organization.id, accountId: staffAccount.id, branchId: employeeBranchId, teamId: employeeTeamId,
        jobRoleIds: employeeRoleIds, ...(managerId ? { reportsToId: managerId } : {}), ...(employeeCode.trim() ? { employeeCode: employeeCode.trim() } : {}),
        hiredAt, reason: requireReason
      }))}>
        <p className="resolved-account">Staff identity: <strong>{staffAccount.email}</strong></p>
        <label htmlFor="employee-branch">Home branch</label><select id="employee-branch" required value={employeeBranchId} onChange={(event) => { employeeBranchIdRef.current = event.target.value; setEmployeeBranchId(event.target.value); setEmployeeTeamId(""); }}><option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        <label htmlFor="employee-team">Home team</label><select id="employee-team" required value={employeeTeamId} onChange={(event) => setEmployeeTeamId(event.target.value)}><option value="">Select a team</option>{visibleEmployeeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
        <label htmlFor="employee-roles">Job roles</label><select id="employee-roles" multiple value={employeeRoleIds} onChange={(event) => setEmployeeRoleIds(Array.from(event.target.selectedOptions, (option) => option.value))}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
        <label htmlFor="employee-manager">Reports to</label><select id="employee-manager" value={managerId} onChange={(event) => setManagerId(event.target.value)}><option value="">No reporting manager</option>{employees.filter((employee) => employee.state === "ACTIVE" && employee.homeBranch.id === employeeBranchId && employee.homeTeam.id === employeeTeamId).map((employee) => <option key={employee.id} value={employee.id}>{employee.account.normalizedEmail}</option>)}</select>
        <label htmlFor="employee-code">Employee code (optional)</label><input id="employee-code" maxLength={64} value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} />
        <label htmlFor="employee-hired-at">Employment start date</label><input id="employee-hired-at" type="date" required value={hiredAt} onChange={(event) => setHiredAt(event.target.value)} />
        <label htmlFor="employee-reason">Reason for employee setup</label><textarea id="employee-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        <button disabled={pending || !employeeBranchId || !employeeTeamId || requireReason.length < 10}>{pending ? "Saving…" : "Create employee"}</button>
      </form>}
      <section className="org-employees" aria-labelledby="employees-heading"><h3 id="employees-heading">Employees</h3>
        {employees.length === 0 ? <p className="identity-note">No employees have been added.</p> : <ul className="org-employee-list">{employees.map((employee) => <li key={employee.id}>
          <div><strong>{employee.account.normalizedEmail}</strong><p>{employee.homeBranch.name} · {employee.homeTeam.name}{employee.jobRoleAssignments.length ? ` · ${employee.jobRoleAssignments.map((assignment) => assignment.jobRole.name).join(", ")}` : " · No job role"}</p><p>{employee.state}{employee.reportsTo ? ` · Reports to ${employee.reportsTo.account.normalizedEmail}` : ""}</p></div>
          {employee.state === "ACTIVE" && <div className="org-employee-actions">
            <button type="button" className="secondary-action" disabled={pending} onClick={() => {
              setEditingMembershipEmployeeId((current) => current === employee.id ? "" : employee.id);
              setMembershipBranchId(employee.homeBranch.id);
              setMembershipTeamId(employee.homeTeam.id);
              setMembershipReportsToId(employee.reportsTo?.id ?? "");
            }}>Manage home team</button>
            <button type="button" className="secondary-action" disabled={pending} onClick={() => {
              setEditingRolesEmployeeId((current) => current === employee.id ? "" : employee.id);
              setEditingRoleIds(employee.jobRoleAssignments.map((assignment) => assignment.jobRole.id));
            }}>Manage job roles</button>
            <button type="button" className="secondary-action" disabled={pending} onClick={() => setEditingPermissionsEmployeeId((current) => current === employee.id ? "" : employee.id)}>Manage access overrides</button>
            <button type="button" className="secondary-action" disabled={pending} onClick={() => setSuspendingEmployee(employee.id)}>Suspend access</button>
          </div>}
          {employee.state !== "EXITED" && <button type="button" className="secondary-action" disabled={pending} aria-label={`Finalize exit for ${employee.account.normalizedEmail}`} onClick={() => { setReason(""); setExitingEmployee(employee.id); }}>Finalize employee exit</button>}
          {editingMembershipEmployeeId === employee.id && employee.state === "ACTIVE" && <form className="org-role-editor" onSubmit={(event) => submit(event, async () => {
            await mutate(`/employees/${encodeURIComponent(employee.id)}/membership`, "PUT", {
              organizationId: organization.id, branchId: membershipBranchId, teamId: membershipTeamId,
              reportsToId: membershipReportsToId || null, reason: requireReason
            });
            setEditingMembershipEmployeeId("");
          })}>
            <h4>Home branch, team and manager</h4>
            <label htmlFor={`employee-branch-edit-${employee.id}`}>Home branch</label>
            <select id={`employee-branch-edit-${employee.id}`} required value={membershipBranchId} onChange={(event) => { setMembershipBranchId(event.target.value); setMembershipTeamId(""); setMembershipReportsToId(""); }}><option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
            <label htmlFor={`employee-team-edit-${employee.id}`}>Home team</label>
            <select id={`employee-team-edit-${employee.id}`} required value={membershipTeamId} onChange={(event) => { setMembershipTeamId(event.target.value); setMembershipReportsToId(""); }}><option value="">Select a team</option>{visibleMembershipTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
            <label htmlFor={`employee-manager-edit-${employee.id}`}>Reports to</label>
            <select id={`employee-manager-edit-${employee.id}`} value={membershipReportsToId} onChange={(event) => setMembershipReportsToId(event.target.value)}><option value="">No reporting manager</option>{employees.filter((candidate) => candidate.id !== employee.id && candidate.state === "ACTIVE" && candidate.homeBranch.id === membershipBranchId && candidate.homeTeam.id === membershipTeamId).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.account.normalizedEmail}</option>)}</select>
            <label htmlFor={`employee-membership-reason-${employee.id}`}>Reason</label>
            <textarea id={`employee-membership-reason-${employee.id}`} required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
            <button disabled={pending || !membershipBranchId || !membershipTeamId || requireReason.length < 10}>{pending ? "Saving…" : "Save home membership"}</button>
          </form>}
          {editingRolesEmployeeId === employee.id && <form className="org-role-editor" onSubmit={(event) => submit(event, async () => {
            await mutate(`/employees/${encodeURIComponent(employee.id)}/job-roles`, "PUT", {
              organizationId: organization.id, jobRoleIds: editingRoleIds, reason: requireReason
            });
            setEditingRolesEmployeeId("");
          })}>
            <label htmlFor={`employee-role-edit-${employee.id}`}>Assigned job roles</label>
            <select id={`employee-role-edit-${employee.id}`} multiple value={editingRoleIds} onChange={(event) => setEditingRoleIds(Array.from(event.target.selectedOptions, (option) => option.value))}>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <label htmlFor={`employee-role-reason-${employee.id}`}>Reason</label>
            <textarea id={`employee-role-reason-${employee.id}`} required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
            <button disabled={pending || requireReason.length < 10}>{pending ? "Saving…" : "Save job roles"}</button>
          </form>}
          {editingPermissionsEmployeeId === employee.id && employee.state === "ACTIVE" && <div className="org-role-editor">
            <h4>Explicit employee access overrides</h4>
            {employee.permissionOverrides.length ? <ul>{employee.permissionOverrides.map((override) => <li key={override.id}>
              <span><strong>{override.effect}</strong> {override.permissionKey} · {override.scopeKind}{override.branchId ? ` · ${branches.find((item) => item.id === override.branchId)?.name ?? "Branch"}` : ""}{override.teamId ? ` / ${teams.find((item) => item.id === override.teamId)?.name ?? "Team"}` : ""}{override.expiresAt ? ` · expires ${new Date(override.expiresAt).toLocaleString()}` : ""}</span>
              <button type="button" className="secondary-action" disabled={pending || requireReason.length < 10} aria-label={`Revoke ${override.permissionKey} override from ${employee.account.normalizedEmail}`} onClick={() => void mutate(`/employees/${encodeURIComponent(employee.id)}/permissions/${encodeURIComponent(override.id)}/revoke`, "PUT", { reason: requireReason })}>Revoke</button>
            </li>)}</ul> : <p className="identity-note">No explicit employee overrides are recorded.</p>}
            <form className="org-permission-form" onSubmit={(event) => submit(event, () => grantEmployeeOverride(employee.id))}>
              <label htmlFor={`override-key-${employee.id}`}>Permission key</label>
              <input id={`override-key-${employee.id}`} required minLength={2} maxLength={160} value={overridePermissionKey} onChange={(event) => setOverridePermissionKey(event.target.value)} placeholder="e.g. task.review" />
              <label htmlFor={`override-effect-${employee.id}`}>Effect</label>
              <select id={`override-effect-${employee.id}`} value={overrideEffect} onChange={(event) => setOverrideEffect(event.target.value as "ALLOW" | "DENY")}><option value="DENY">Deny</option><option value="ALLOW">Allow</option></select>
              <label htmlFor={`override-scope-${employee.id}`}>Scope</label>
              <select id={`override-scope-${employee.id}`} value={overrideScope} onChange={(event) => { setOverrideScope(event.target.value as RolePermission["scopeKind"]); setOverrideTeamId(""); }}><option value="SELF">Self</option><option value="TEAM">Team</option><option value="BRANCH">Branch</option><option value="ORGANIZATION">Organization</option></select>
              {(overrideScope === "BRANCH" || overrideScope === "TEAM") && <>
                <label htmlFor={`override-branch-${employee.id}`}>Branch</label>
                <select id={`override-branch-${employee.id}`} required value={overrideBranchId} onChange={(event) => { setOverrideBranchId(event.target.value); setOverrideTeamId(""); }}><option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
              </>}
              {overrideScope === "TEAM" && <>
                <label htmlFor={`override-team-${employee.id}`}>Team</label>
                <select id={`override-team-${employee.id}`} required value={overrideTeamId} onChange={(event) => setOverrideTeamId(event.target.value)}><option value="">Select a team</option>{visibleOverrideTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
              </>}
              <label htmlFor={`override-expiry-${employee.id}`}>Expiry (optional)</label>
              <input id={`override-expiry-${employee.id}`} type="datetime-local" value={overrideExpiresAt} onChange={(event) => setOverrideExpiresAt(event.target.value)} />
              <label htmlFor={`override-reason-${employee.id}`}>Reason</label>
              <textarea id={`override-reason-${employee.id}`} required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
              <button disabled={pending || !overridePermissionKey.trim() || requireReason.length < 10 || ((overrideScope === "BRANCH" || overrideScope === "TEAM") && !overrideBranchId) || (overrideScope === "TEAM" && !overrideTeamId)}>{pending ? "Saving…" : "Save override"}</button>
            </form>
          </div>}
        </li>)}</ul>}
      </section>
      {suspendingEmployee && <form className="identity-form" onSubmit={(event) => submit(event, async () => { await mutate(`/employees/${encodeURIComponent(suspendingEmployee)}/suspend`, "PUT", { reason: requireReason }); setSuspendingEmployee(""); })}>
        <h3>Confirm employee suspension</h3><p className="identity-note">This immediately blocks sign-in and revokes every current session. It does not finalize employment exit or change project/task ownership.</p>
        <label htmlFor="suspend-reason">Reason</label><textarea id="suspend-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        <div className="identity-actions"><button disabled={pending || requireReason.length < 10}>Confirm suspension</button><button type="button" className="secondary-action" onClick={() => setSuspendingEmployee("")}>Cancel</button></div>
      </form>}
      {exitingEmployee && <form className="identity-form" onSubmit={(event) => submit(event, async () => { await mutate(`/employees/${encodeURIComponent(exitingEmployee)}/exit`, "POST", { reason: requireReason }); setExitingEmployee(""); })}>
        <h3>Finalize employee exit</h3><p className="identity-note">Access and sessions end immediately. Unfinished owned tasks wait for individual reassignment; Active projects led by this employee go On Hold until you appoint a replacement. Completed work and history are retained.</p>
        <label htmlFor="exit-reason">Exit reason</label><textarea id="exit-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        <div className="identity-actions"><button disabled={pending || requireReason.length < 10}>Finalize exit</button><button type="button" className="secondary-action" onClick={() => setExitingEmployee("")}>Cancel</button></div>
      </form>}
    </>}
  </section>;
}

function TeamWorkspace({ session }: { session: Session }): React.JSX.Element {
  const [employees, setEmployees] = useState<ManagedEmployee[]>([]);
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [managerByEmployee, setManagerByEmployee] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [reason, setReason] = useState("");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true); setError(undefined);
    try {
      const response = await fetch(`${ORG_PATH}/team/employees`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw Object.assign(new Error("team-unavailable"), { status: response.status });
      const result = await response.json() as { employees: ManagedEmployee[]; managerOptions: ManagerOption[] };
      setEmployees(result.employees); setManagerOptions(result.managerOptions);
      setManagerByEmployee(Object.fromEntries(result.employees.map((employee) => [employee.id, employee.reportsToId ?? ""])));
    } catch (cause) {
      const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
      setError(status === 403 || status === 404
        ? "This account does not have an active team-management grant. Ask the Owner to review your team permissions."
        : "We couldn’t load the managed team. Try again.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateManager = async (event: React.FormEvent<HTMLFormElement>, employeeId: string): Promise<void> => {
    event.preventDefault();
    if (pendingEmployeeId) return;
    setPendingEmployeeId(employeeId); setError(undefined); setSuccess(undefined);
    try {
      const response = await fetch(`${ORG_PATH}/team/employees/${encodeURIComponent(employeeId)}/reporting`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
        body: JSON.stringify({ reportsToId: managerByEmployee[employeeId], reason: reason.trim() })
      });
      if (!response.ok) throw Object.assign(new Error("team-update-failed"), { status: response.status });
      await load(); setSuccess("Reporting relationship saved.");
    } catch (cause) {
      const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
      setError(status === 403 ? "Your team-management permission changed. Refresh your session and try again." : "We couldn’t save this reporting change. Review the details and try again.");
    } finally { setPendingEmployeeId(undefined); }
  };

  return <div className="team-workspace">
    <div className="sessions-heading-row"><p className="identity-note">This list includes only active employees in your reporting team. Reporting changes require an explicit team-scoped grant and a reason.</p><button type="button" className="secondary-action" onClick={() => void load()} disabled={loading || pendingEmployeeId !== undefined}>Refresh team</button></div>
    {loading && <p role="status" className="identity-note">Loading managed team…</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    {success && <p role="status" className="notice">{success}</p>}
    {!loading && !error && employees.length === 0 && <p role="status" className="identity-note">You do not currently manage any employees.</p>}
    {!loading && employees.length > 0 && <ul className="org-employee-list">{employees.map((employee) => <li key={employee.id}>
      <div><strong>{employee.account.normalizedEmail}</strong><p>{employee.employeeCode ? `Employee ${employee.employeeCode} · ` : ""}{employee.jobRoleAssignments.map((assignment) => assignment.jobRole.name).join(", ") || "No job role"}</p></div>
      <form className="team-reporting-form" onSubmit={(event) => void updateManager(event, employee.id)}>
        <label htmlFor={`team-manager-${employee.id}`}>Reports to</label>
        <select id={`team-manager-${employee.id}`} required value={managerByEmployee[employee.id] ?? ""} onChange={(event) => setManagerByEmployee((current) => ({ ...current, [employee.id]: event.target.value }))}>
          <option value="">Choose a reporting manager</option>{managerOptions.map((manager) => <option key={manager.id} value={manager.id}>{manager.email}</option>)}
        </select>
        <label htmlFor={`team-reporting-reason-${employee.id}`}>Reason</label>
        <textarea id={`team-reporting-reason-${employee.id}`} required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        <button disabled={pendingEmployeeId !== undefined || !managerByEmployee[employee.id] || reason.trim().length < 10}>{pendingEmployeeId === employee.id ? "Saving…" : "Save reporting line"}</button>
      </form>
    </li>)}</ul>}
  </div>;
}

type Ceremony = { ceremonyId: string; options: Parameters<typeof startRegistration>[0]["optionsJSON"] };

async function apiPost(path: string, body: unknown, csrfToken?: string): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw Object.assign(new Error("request-failed"), { status: response.status });
  return response.status === 204 ? undefined : response.json();
}

function publicFlowError(error: unknown, forbiddenMessage?: string): string {
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
  if (status === 429) return "Too many attempts. Wait a moment, then try again.";
  if (status === 401 || status === 400) return "The request could not be completed. Check the details and try again.";
  if (status === 403 && forbiddenMessage) return forbiddenMessage;
  if (status === 403) return "Sign out and sign in again before changing credentials or recovery settings.";
  if (status >= 500) return "The identity service is temporarily unavailable. Try again shortly.";
  if (isUnsupportedPasskeyBrowser(error)) return "This browser does not support passkeys. Open this page in a supported browser or device.";
  if (isCancellation(error)) return "The passkey request was cancelled. You can try again when ready.";
  return "We couldn’t reach the identity service. Check your connection and try again.";
}

function Bootstrap(): React.JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  const [ceremony, setCeremony] = useState<Ceremony>();
  const start = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setPending(true); setError(undefined);
    try {
      const options = await apiPost(`${AUTH_PATH}/bootstrap/options`, { email: email.trim(), secret }) as Ceremony;
      setCeremony(options);
      setSecret("");
    }
    catch (cause) { setError(publicFlowError(cause)); }
    finally { setPending(false); }
  };
  const enroll = async (): Promise<void> => {
    if (!ceremony) return;
    setPending(true); setError(undefined);
    try {
      const response = await startRegistration({ optionsJSON: ceremony.options });
      await apiPost(`${AUTH_PATH}/bootstrap/verify`, { ceremonyId: ceremony.ceremonyId, response });
      const restored = await readSession();
      if (!restored) throw new Error("session-missing");
      navigate("/");
    } catch (cause) { setError(publicFlowError(cause)); }
    finally { setPending(false); }
  };
  return <main className="auth-content"><section className="auth-card"><div className="eyebrow">FIRST OWNER SETUP</div><h1>Register the first Owner passkey</h1><p className="auth-intro">Enter the initial Owner email and one-time setup secret provided by the deployment administrator.</p>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {!ceremony ? <form onSubmit={(event) => void start(event)}><label htmlFor="bootstrap-email">Owner work email</label><input id="bootstrap-email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} /><label htmlFor="bootstrap-secret">One-time setup secret</label><input id="bootstrap-secret" type="password" autoComplete="one-time-code" required minLength={32} maxLength={512} value={secret} onChange={(event) => setSecret(event.target.value)} /><button disabled={pending}>{pending ? "Preparing passkey…" : "Continue"}</button></form> : <div className="identity-actions"><p role="status">The registration ceremony is ready.</p><button disabled={pending} onClick={() => void enroll()}>{pending ? "Registering…" : "Register Owner passkey"}</button><button className="secondary-action" onClick={() => setCeremony(undefined)}>Start over</button></div>}
    <Link className="text-link" to="/">Back to sign in</Link></section></main>;
}

function Enrollment(): React.JSX.Element {
  const navigate = useNavigate();
  const [token, setToken] = useState(""); const [ceremony, setCeremony] = useState<Ceremony>();
  const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  const getOptions = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setPending(true); setError(undefined);
    try { setCeremony(await apiPost(`${AUTH_PATH}/staff/invitations/options`, { token: token.trim() }) as Ceremony); }
    catch (cause) { setError(publicFlowError(cause)); }
    finally { setPending(false); }
  };
  const enroll = async (): Promise<void> => {
    if (!ceremony) return;
    setPending(true); setError(undefined);
    try {
      const response = await startRegistration({ optionsJSON: ceremony.options });
      await apiPost(`${AUTH_PATH}/staff/invitations/verify`, { token: token.trim(), ceremonyId: ceremony.ceremonyId, response });
      setToken("");
      const restored = await readSession(); if (!restored) throw new Error("session-missing"); navigate("/");
    } catch (cause) { setError(publicFlowError(cause)); }
    finally { setPending(false); }
  };
  return <main className="auth-content"><section className="auth-card"><div className="eyebrow">STAFF ENROLLMENT</div><h1>Set up your passkey</h1><p className="auth-intro">Paste the one-time invitation or recovery token provided by your Owner. The token stays on this page and is sent only to the identity service.</p>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {!ceremony ? <form onSubmit={(event) => void getOptions(event)}><label htmlFor="enrollment-token">One-time enrollment token</label><input id="enrollment-token" type="password" autoComplete="off" required minLength={32} maxLength={512} value={token} onChange={(event) => setToken(event.target.value)} /><button disabled={pending}>{pending ? "Checking token…" : "Continue"}</button></form> : <div className="identity-actions"><p role="status">The registration ceremony is ready.</p><button disabled={pending} onClick={() => void enroll()}>{pending ? "Registering…" : "Register staff passkey"}</button><button className="secondary-action" onClick={() => setCeremony(undefined)}>Use a different token</button></div>}
    <Link className="text-link" to="/">Back to sign in</Link></section></main>;
}

function OwnerRecovery(): React.JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [code, setCode] = useState("");
  const [ceremony, setCeremony] = useState<Ceremony>(); const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const getOptions = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setPending(true); setError(undefined);
    try { setCeremony(await apiPost(`${AUTH_PATH}/owner/recovery/options`, { email: email.trim(), code: code.trim() }) as Ceremony); }
    catch (cause) { setError(publicFlowError(cause)); }
    finally { setPending(false); }
  };
  const recover = async (): Promise<void> => {
    if (!ceremony) return;
    setPending(true); setError(undefined);
    try {
      const response = await startRegistration({ optionsJSON: ceremony.options });
      await apiPost(`${AUTH_PATH}/owner/recovery/verify`, { email: email.trim(), code: code.trim(), ceremonyId: ceremony.ceremonyId, response });
      setCode("");
      const restored = await readSession(); if (!restored) throw new Error("session-missing"); navigate("/");
    } catch (cause) { setError(publicFlowError(cause)); }
    finally { setPending(false); }
  };
  return <main className="auth-content"><section className="auth-card"><div className="eyebrow">OWNER RECOVERY</div><h1>Recover with your offline code</h1><p className="auth-intro">Use the one-time recovery code kept offline. Recovery replaces existing passkeys and sessions.</p>
    {error && <p role="alert" className="auth-error">{error}</p>}
    {!ceremony ? <form onSubmit={(event) => void getOptions(event)}><label htmlFor="recovery-email">Owner work email</label><input id="recovery-email" type="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} /><label htmlFor="owner-recovery-code">Offline recovery code</label><input id="owner-recovery-code" type="password" autoComplete="off" required minLength={32} maxLength={512} value={code} onChange={(event) => setCode(event.target.value)} /><button disabled={pending}>{pending ? "Checking recovery code…" : "Continue"}</button></form> : <div className="identity-actions"><p role="status">Register a replacement passkey to complete recovery.</p><button disabled={pending} onClick={() => void recover()}>{pending ? "Recovering…" : "Register replacement passkey"}</button><button className="secondary-action" onClick={() => setCeremony(undefined)}>Start over</button></div>}
    <Link className="text-link" to="/">Back to sign in</Link></section></main>;
}

function AuthHome(): React.JSX.Element {
  const [view, setView] = useState<AuthView>({ kind: "restoring" });
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<string>();

  const restore = useCallback(async () => {
    try {
      const session = await readSession();
      setView((previous) => session
        ? { kind: "signed-in", session }
        : {
            kind: "signed-out",
            ...(previous.kind === "signed-in" ? { notice: "Your session ended. Sign in again to continue." } : {}),
          });
    } catch {
      setView({ kind: "session-error", message: "We couldn’t check your session. Try again." });
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore, refreshAttempt]);

  useEffect(() => {
    if (view.kind !== "signed-in") return;
    const recheck = (): void => {
      if (document.visibilityState === "visible") void restore();
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [restore, view.kind]);

  const logout = async (): Promise<void> => {
    if (view.kind !== "signed-in" || logoutBusy) return;
    setLogoutBusy(true);
    setLogoutError(undefined);
    try {
      const response = await fetch(`${AUTH_PATH}/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": view.session.csrfToken },
      });
      if (response.status === 401) {
        setView({ kind: "signed-out", notice: "Your session ended. Sign in again to continue." });
      } else if (!response.ok) {
        setLogoutError("We couldn’t sign you out. Try again.");
      } else {
        setView({ kind: "signed-out", notice: "You’ve signed out." });
      }
    } catch {
      setLogoutError("We couldn’t reach the sign-in service. Try signing out again.");
    } finally {
      setLogoutBusy(false);
    }
  };

  if (view.kind === "restoring") return <main className="auth-content"><p className="loading-state" role="status">Checking your session…</p></main>;
  if (view.kind === "session-error") {
    return <main className="auth-content"><section className="auth-card"><p className="auth-error" role="alert">{view.message}</p><button type="button" onClick={() => setRefreshAttempt((n) => n + 1)}>Try again</button></section></main>;
  }
  if (view.kind === "signed-out") return <Login onSignedIn={(session) => setView({ kind: "signed-in", session })} notice={view.notice} />;
  return <Identity session={view.session} onLogout={() => void logout()} busy={logoutBusy} error={logoutError} />;
}

function NotFound(): React.JSX.Element {
  return <main className="auth-content"><section className="auth-card"><div className="eyebrow">PAGE NOT FOUND</div><h1>That page is not here.</h1><Link to="/" className="home-link">Return to sign in</Link></section></main>;
}

function DocumentsRoute(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void readSession().then((value) => { if (active) setSession(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (session === undefined && !failed) return <main className="identity-content"><p className="loading-state" role="status">Checking your session…</p></main>;
  if (failed) return <main className="identity-content"><section className="identity-section"><p className="auth-error" role="alert">We couldn’t check your session. Try again from the workspace home.</p><Link to="/">Return to workspace</Link></section></main>;
  if (!session) return <main className="identity-content"><section className="identity-section"><h1>Sign in to view project documents</h1><Link to="/">Return to sign in</Link></section></main>;
  if (session.account.kind === "OWNER" && session.ownerSetupRequired) return <main className="identity-content"><section className="identity-section"><h1>Complete Owner setup first</h1><Link to="/">Return to Owner setup</Link></section></main>;
  return <main className="identity-content"><div className="document-route-heading"><div><Link to="/">← Workspace</Link><nav className="document-navigation" aria-label="Project records"><Link to="/documents">Project documents</Link><Link to="/revisions">Drawing register</Link><Link to="/reviews">Internal reviews</Link></nav></div><span>{session.account.email}</span></div><DocumentWorkspace csrfToken={session.csrfToken} /></main>;
}

function RevisionsRoute(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void readSession().then((value) => { if (active) setSession(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (session === undefined && !failed) return <main className="identity-content"><p className="loading-state" role="status">Checking your session…</p></main>;
  if (failed) return <main className="identity-content"><section className="identity-section"><p className="auth-error" role="alert">We couldn’t check your session. Try again from the workspace home.</p><Link to="/">Return to workspace</Link></section></main>;
  if (!session) return <main className="identity-content"><section className="identity-section"><h1>Sign in to view the drawing register</h1><Link to="/">Return to sign in</Link></section></main>;
  if (session.account.kind === "OWNER" && session.ownerSetupRequired) return <main className="identity-content"><section className="identity-section"><h1>Complete Owner setup first</h1><Link to="/">Return to Owner setup</Link></section></main>;
  return <main className="identity-content"><div className="document-route-heading"><div><Link to="/">← Workspace</Link><nav className="document-navigation" aria-label="Project records"><Link to="/documents">Project documents</Link><Link to="/revisions">Drawing register</Link><Link to="/reviews">Internal reviews</Link></nav></div><span>{session.account.email}</span></div><RevisionWorkspace csrfToken={session.csrfToken} /></main>;
}

function ReviewsRoute(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void readSession().then((value) => { if (active) setSession(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (session === undefined && !failed) return <main className="identity-content"><p className="loading-state" role="status">Checking your session…</p></main>;
  if (failed) return <main className="identity-content"><section className="identity-section"><p className="auth-error" role="alert">We couldn’t check your session. Try again from the workspace home.</p><Link to="/">Return to workspace</Link></section></main>;
  if (!session) return <main className="identity-content"><section className="identity-section"><h1>Sign in to review project drawings</h1><Link to="/">Return to sign in</Link></section></main>;
  if (session.account.kind === "OWNER" && session.ownerSetupRequired) return <main className="identity-content"><section className="identity-section"><h1>Complete Owner setup first</h1><Link to="/">Return to Owner setup</Link></section></main>;
  return <main className="identity-content"><div className="document-route-heading"><div><Link to="/">← Workspace</Link><nav className="document-navigation" aria-label="Project records"><Link to="/documents">Project documents</Link><Link to="/revisions">Drawing register</Link><Link to="/reviews">Internal reviews</Link></nav></div><span>{session.account.email}</span></div><ReviewWorkspace csrfToken={session.csrfToken} /></main>;
}

function ClientReviewsRoute(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void readSession().then((value) => { if (active) setSession(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (session === undefined && !failed) return <main className="identity-content"><p className="loading-state" role="status">Checking your session…</p></main>;
  if (failed) return <main className="identity-content"><section className="identity-section"><p className="auth-error" role="alert">We couldn’t check your session. Try again from the workspace home.</p><Link to="/">Return to workspace</Link></section></main>;
  if (!session) return <main className="identity-content"><section className="identity-section"><h1>Sign in to manage client reviews</h1><Link to="/">Return to sign in</Link></section></main>;
  if (session.account.kind === "OWNER" && session.ownerSetupRequired) return <main className="identity-content"><section className="identity-section"><h1>Complete Owner setup first</h1><Link to="/">Return to Owner setup</Link></section></main>;
  return <main className="identity-content"><div className="document-route-heading"><div><Link to="/">← Workspace</Link><nav className="document-navigation" aria-label="Project records"><Link to="/documents">Project documents</Link><Link to="/revisions">Drawing register</Link><Link to="/reviews">Internal reviews</Link><Link to="/client-reviews">Client reviews</Link></nav></div><span>{session.account.email}</span></div><StaffClientReviewWorkspace csrfToken={session.csrfToken} owner={session.account.kind === "OWNER"} /></main>;
}

export function App(): React.JSX.Element {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Sense Studios home">
          <span className="brand-mark">S</span>
          <span><strong>SENSE STUDIOS</strong><small>WORK MANAGEMENT</small></span>
        </Link>
        <span className="phase-badge">IDENTITY</span>
      </header>
      <Routes>
        <Route path="/" element={<AuthHome />} />
        <Route path="/bootstrap" element={<Bootstrap />} />
        <Route path="/enroll" element={<Enrollment />} />
        <Route path="/owner-recovery" element={<OwnerRecovery />} />
        <Route path="/documents" element={<DocumentsRoute />} />
        <Route path="/revisions" element={<RevisionsRoute />} />
        <Route path="/reviews" element={<ReviewsRoute />} />
        <Route path="/client-reviews" element={<ClientReviewsRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="site-footer">Sense Studios · Secure workspace</footer>
    </div>
  );
}
