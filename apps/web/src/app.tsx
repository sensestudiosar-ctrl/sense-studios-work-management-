import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";

const AUTH_PATH = "/api/v1/auth";

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
    try {
      const options = await apiPost(`${AUTH_PATH}/passkey/register/options`, {}, currentSession.csrfToken) as Ceremony;
      const response = await startRegistration({ optionsJSON: options.options });
      await apiPost(`${AUTH_PATH}/passkey/register/verify`, { ceremonyId: options.ceremonyId, response }, currentSession.csrfToken);
      const updated = await readSession();
      if (updated) setCurrentSession(updated);
      setActionSuccess("Passkey added to this account.");
    } catch (cause) {
      setActionError(publicFlowError(cause));
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
      {error && <p className="auth-error" role="alert">{error}</p>}
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
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="site-footer">Sense Studios · Secure workspace</footer>
    </div>
  );
}
