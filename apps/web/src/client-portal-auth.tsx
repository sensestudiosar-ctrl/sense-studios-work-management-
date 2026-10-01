import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import "./client-portal-auth.css";
import { ClientReviewPortal } from "./client-review.js";

const portalAuthPath = "/api/v1/client-portal/auth";

export type PortalSession = {
  account: { id: string; email: string; kind: "CLIENT" };
  csrfToken: string;
  activePasskeyCount: number;
};

type PortalDeviceSession = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  userAgent: string | null;
  current?: boolean;
};

type Ceremony = {
  ceremonyId: string;
  options: Parameters<typeof startRegistration>[0]["optionsJSON"];
};

class PortalRequestError extends Error {
  constructor(readonly status: number) {
    super("Client portal request failed");
  }
}

async function portalRequest<T>(path: string, init: { method?: string; body?: unknown; csrfToken?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.csrfToken) headers["X-CSRF-Token"] = init.csrfToken;
  const response = await fetch(`${portalAuthPath}${path}`, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {})
  });
  if (!response.ok) throw new PortalRequestError(response.status);
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

function safeRequestMessage(error: unknown, fallback: string): string {
  if (error instanceof PortalRequestError && error.status === 401) return "Your session expired or access was revoked. Sign in again to continue.";
  if (error instanceof PortalRequestError && error.status === 403) return "Your session could not verify this request. Sign in again and retry.";
  return fallback;
}

function dateLabel(value: string): string {
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? "Time unavailable" : time.toLocaleString();
}

export function ClientPortalAuth(): React.JSX.Element {
  const [session, setSession] = useState<PortalSession | null>();
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
  const [deviceSessions, setDeviceSessions] = useState<PortalDeviceSession[] | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [revokingId, setRevokingId] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);

  const restoreSession = useCallback(async (): Promise<PortalSession | null> => {
    try {
      const current = await portalRequest<PortalSession>("/session");
      if (current.account.kind !== "CLIENT") throw new PortalRequestError(403);
      setSession(current);
      setSessionNotice("");
      return current;
    } catch (error) {
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
    void portalRequest<PortalSession>("/session")
      .then((current) => {
        if (!live) return;
        if (current.account.kind !== "CLIENT") throw new PortalRequestError(403);
        setSession(current);
      })
      .catch((error: unknown) => {
        if (!live) return;
        if (error instanceof PortalRequestError && error.status === 401) setSession(null);
        else {
          setSession(null);
          setAuthError("We couldn’t check your client portal session. Try again.");
        }
      });
    return () => { live = false; };
  }, []);

  const loadDeviceSessions = useCallback(async (): Promise<void> => {
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const rows = await portalRequest<PortalDeviceSession[]>("/sessions");
      setDeviceSessions(rows);
    } catch (error) {
      setDeviceSessions(null);
      setSessionsError(safeRequestMessage(error, "We couldn’t load your sessions. Try again."));
      if (error instanceof PortalRequestError && error.status === 401) {
        setSession(null);
        setSessionNotice("Your session expired or access was revoked. Sign in again to continue.");
      }
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) void loadDeviceSessions();
  }, [loadDeviceSessions, session]);

  const requestCode = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthStatus("");
    try {
      await portalRequest<{ accepted: true }>("/code/request", { method: "POST", body: { email: email.trim() } });
      setCodeRequested(true);
      setCode("");
      setAuthStatus("If this address has access, a code has been sent.");
    } catch {
      setAuthError("We couldn’t request a sign-in code. Check your connection and try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const verifyCode = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthStatus("");
    try {
      await portalRequest("/code/verify", { method: "POST", body: { email: email.trim(), code } });
      setCode("");
      const restored = await restoreSession();
      if (!restored) throw new PortalRequestError(401);
      setCodeRequested(false);
      setAuthStatus("You’re signed in to the client portal.");
    } catch (error) {
      setAuthError(error instanceof PortalRequestError && error.status === 401
        ? "That code could not be verified. Request a new code and try again."
        : "We couldn’t complete sign-in. Request a new code and try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async (): Promise<void> => {
    if (!session || logoutBusy) return;
    setLogoutBusy(true);
    setAuthError("");
    try {
      await portalRequest("/logout", { method: "POST", csrfToken: session.csrfToken });
      setSession(null);
      setDeviceSessions(null);
      setCodeRequested(false);
      setAuthStatus("You’ve signed out.");
      setSessionNotice("");
    } catch (error) {
      setAuthError(safeRequestMessage(error, "We couldn’t sign out. Try again."));
      if (error instanceof PortalRequestError && error.status === 401) {
        setSession(null);
        setSessionNotice("Your session expired or access was revoked. Sign in again to continue.");
      }
    } finally {
      setLogoutBusy(false);
    }
  };

  const registerPasskey = async (): Promise<void> => {
    if (!session || passkeyBusy) return;
    setPasskeyBusy(true);
    setPasskeyError("");
    setPasskeyMessage("");
    try {
      const ceremony = await portalRequest<Ceremony>("/passkeys/options", { method: "POST", body: {}, csrfToken: session.csrfToken });
      const response = await startRegistration({ optionsJSON: ceremony.options });
      await portalRequest("/passkeys/verify", { method: "POST", body: { ceremonyId: ceremony.ceremonyId, response }, csrfToken: session.csrfToken });
      const restored = await restoreSession();
      if (!restored) throw new PortalRequestError(401);
      setPasskeyMessage("Passkey registered.");
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") setPasskeyError("Passkey registration was cancelled.");
      else if (error instanceof PortalRequestError && error.status === 401) {
        setSession(null);
        setSessionNotice("Your session expired or access was revoked. Sign in again to continue.");
        setPasskeyError("Your session ended. Sign in again to register a passkey.");
      } else setPasskeyError(safeRequestMessage(error, "We couldn’t register a passkey. Try again."));
    } finally {
      setPasskeyBusy(false);
    }
  };

  const revokeSession = async (device: PortalDeviceSession): Promise<void> => {
    if (!session || !device.id || revokingId) return;
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
    } catch (error) {
      setSessionsError(safeRequestMessage(error, "We couldn’t revoke that session. Refresh the list and try again."));
      if (error instanceof PortalRequestError && error.status === 401) {
        setSession(null);
        setDeviceSessions(null);
        setSessionNotice("Your session expired or access was revoked. Sign in again to continue.");
      }
    } finally {
      setRevokingId("");
    }
  };

  if (session === undefined) {
    return <main className="client-portal-auth"><p className="client-portal-status" role="status">Checking your client portal session…</p></main>;
  }

  if (!session) {
    return (
      <main className="client-portal-auth">
        <section className="client-portal-card" aria-labelledby="client-portal-title">
          <p className="client-portal-eyebrow">Sense Studios</p>
          <h1 id="client-portal-title">Client portal sign in</h1>
          <p className="client-portal-intro">Use the email address connected to your client access.</p>
          {sessionNotice && <p className="client-portal-notice" role="status">{sessionNotice}</p>}
          <form className="client-portal-form" onSubmit={requestCode}>
            <label htmlFor="client-portal-email">Email address</label>
            <input id="client-portal-email" name="email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} disabled={authBusy} />
            <button type="submit" disabled={authBusy || !email.trim()}>{authBusy ? "Sending…" : codeRequested ? "Send another code" : "Send sign-in code"}</button>
          </form>
          {codeRequested && (
            <form className="client-portal-form client-portal-code-form" onSubmit={verifyCode}>
              <label htmlFor="client-portal-code">One-time code</label>
              <input id="client-portal-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} disabled={authBusy} />
              <button type="submit" disabled={authBusy || code.length !== 6}>{authBusy ? "Checking…" : "Continue"}</button>
            </form>
          )}
          {authStatus && <p className="client-portal-success" role="status">{authStatus}</p>}
          {authError && <p className="client-portal-error" role="alert">{authError}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="client-portal-auth">
      <section className="client-portal-card client-portal-signed-in" aria-labelledby="client-portal-title">
        <header className="client-portal-header">
          <div>
            <p className="client-portal-eyebrow">Sense Studios</p>
            <h1 id="client-portal-title">Client portal account</h1>
            <p className="client-portal-identity">{session.account.email}</p>
          </div>
          <button className="client-portal-secondary" type="button" onClick={() => void signOut()} disabled={logoutBusy}>{logoutBusy ? "Signing out…" : "Sign out"}</button>
        </header>
        <p className="client-portal-intro">Manage sign-in security and active sessions for this client account.</p>
        <section className="client-portal-business-nav" aria-label="Client project workspace">
          <button type="button" className="client-portal-secondary" aria-expanded={businessOpen} onClick={() => setBusinessOpen((open) => !open)}>{businessOpen ? "Hide project reviews" : "Open project reviews"}</button>
        </section>
        {businessOpen && <ClientReviewPortal session={session} />}
        {authStatus && <p className="client-portal-success" role="status">{authStatus}</p>}
        {authError && <p className="client-portal-error" role="alert">{authError}</p>}

        <section className="client-portal-security" aria-labelledby="client-security-title">
          <div className="client-portal-section-heading">
            <div><h2 id="client-security-title">Account security</h2><p>{session.activePasskeyCount} registered passkey{session.activePasskeyCount === 1 ? "" : "s"}</p></div>
            <button type="button" onClick={() => void registerPasskey()} disabled={passkeyBusy}>{passkeyBusy ? "Registering…" : "Register a passkey"}</button>
          </div>
          <p className="client-portal-muted">A passkey is required for formal approval actions.</p>
          {passkeyMessage && <p className="client-portal-success" role="status">{passkeyMessage}</p>}
          {passkeyError && <p className="client-portal-error" role="alert">{passkeyError}</p>}
        </section>

        <section className="client-portal-sessions" aria-labelledby="client-sessions-title">
          <div className="client-portal-section-heading">
            <div><h2 id="client-sessions-title">Sessions</h2><p>Sign out devices you no longer use.</p></div>
            <button className="client-portal-secondary" type="button" onClick={() => void loadDeviceSessions()} disabled={sessionsLoading}>{sessionsLoading ? "Refreshing…" : "Refresh"}</button>
          </div>
          {sessionsLoading && <p className="client-portal-muted" role="status">Loading sessions…</p>}
          {sessionsError && <div className="client-portal-error-block"><p className="client-portal-error" role="alert">{sessionsError}</p><button className="client-portal-secondary" type="button" onClick={() => void loadDeviceSessions()}>Try again</button></div>}
          {!sessionsLoading && !sessionsError && deviceSessions?.length === 0 && <p className="client-portal-empty" role="status">No sessions are available.</p>}
          {!sessionsLoading && !sessionsError && deviceSessions && deviceSessions.length > 0 && (
            <ul className="client-portal-session-list">
              {deviceSessions.map((device) => (
                <li key={device.id}>
                  <div className="client-portal-session-copy">
                    <strong>{device.current ? "This device" : device.userAgent || "Client portal session"}</strong>
                    <span>Last active {dateLabel(device.lastUsedAt)}</span>
                    <span>Expires {dateLabel(device.expiresAt)}</span>
                    {device.revokedAt && <span className="client-portal-revoked">Revoked {dateLabel(device.revokedAt)}</span>}
                  </div>
                  {!device.revokedAt && <button className="client-portal-secondary" type="button" onClick={() => void revokeSession(device)} disabled={Boolean(revokingId)}>{revokingId === device.id ? "Revoking…" : "Revoke"}</button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
