import { useEffect, useState } from "react";

const NOTIFICATIONS_PATH = "/api/v1/notifications";

type Channel = "IN_APP" | "EMAIL";
type InboxItem = {
  id: string; category: string; title: string; body: string; internalRoute: string;
  critical: boolean; mandatory: boolean; createdAt: string; readAt: string | null;
};
type Preference = { category: string; channel: Channel; enabled: boolean };
type QuietHours = { startLocal: string; endLocal: string; timeZone: string };
type Settings = { preferences: Preference[]; quietHours: QuietHours | null };
type Inbox = { items: InboxItem[]; nextCursor: string | null };
type EmailStatus = { id: string; title: string; deliveryState: "PENDING" | "LEASED" | "DELIVERED" | "DEAD"; attempts: number; failureCode: string | null; createdAt: string; deliveredAt: string | null };
type EmailStatusResponse = { verified: boolean; available: boolean; items: EmailStatus[] };

function emailFailure(code: string | null): string | undefined {
  if (!code) return undefined;
  if (code === "recipient_not_authorized") return "Delivery stopped because the recipient is no longer authorized.";
  if (code === "recipient_unverified") return "Delivery stopped because the account email is not verified.";
  if (code === "preference_disabled") return "Delivery was disabled by your channel preference.";
  if (code === "email_not_configured") return "Email delivery is not configured.";
  if (code === "email_provider_rejected") return "The email provider rejected this message.";
  return "Email delivery could not be completed.";
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

export function NotificationCenter({ csrfToken, initiallyOpen = false }: { csrfToken: string; initiallyOpen?: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(initiallyOpen);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatus[]>([]);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [emailVerificationAvailable, setEmailVerificationAvailable] = useState<boolean | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState<string>();
  const [verificationError, setVerificationError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [category, setCategory] = useState("");
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [enabled, setEnabled] = useState(false);
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [timeZone, setTimeZone] = useState("");

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      const [inboxResponse, settingsResponse, emailStatusResponse] = await Promise.all([
        fetch(NOTIFICATIONS_PATH, { credentials: "include", cache: "no-store" }),
        fetch(`${NOTIFICATIONS_PATH}/preferences`, { credentials: "include", cache: "no-store" }),
        fetch(`${NOTIFICATIONS_PATH}/email-status`, { credentials: "include", cache: "no-store" }),
      ]);
      if (!inboxResponse.ok || !settingsResponse.ok || !emailStatusResponse.ok) throw new Error("load");
      const [nextInbox, nextSettings, nextEmailStatus] = await Promise.all([inboxResponse.json(), settingsResponse.json(), emailStatusResponse.json()]) as [Inbox, Settings, EmailStatusResponse];
      setInbox(nextInbox);
      setSettings(nextSettings);
      setEmailStatus(nextEmailStatus.items);
      setEmailVerified(nextEmailStatus.verified);
      setEmailVerificationAvailable(nextEmailStatus.available);
      if (nextSettings.quietHours) {
        setStartLocal(nextSettings.quietHours.startLocal);
        setEndLocal(nextSettings.quietHours.endLocal);
        setTimeZone(nextSettings.quietHours.timeZone);
      }
    } catch {
      setError("We couldn’t load your notifications. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const request = async (url: string, method: "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<void> => {
    setSaving(true);
    setError(undefined);
    try {
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) throw new Error("request");
      await load();
      // Re-fetching the inbox reflects the new read state in the nav badge.
      window.dispatchEvent(new Event("sense-notifications-read"));
    } catch {
      setError("We couldn’t save that change. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const savePreference = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!category.trim()) return;
    await request(`${NOTIFICATIONS_PATH}/preferences`, "PUT", { category: category.trim().toLowerCase(), channel, enabled });
  };

  const loadMore = async (): Promise<void> => {
    if (!inbox?.nextCursor) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`${NOTIFICATIONS_PATH}?cursor=${encodeURIComponent(inbox.nextCursor)}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("load");
      const next = await response.json() as Inbox;
      setInbox({ items: [...inbox.items, ...next.items], nextCursor: next.nextCursor });
    } catch {
      setError("We couldn’t load more notifications. Try again.");
    } finally { setLoading(false); }
  };

  const saveQuietHours = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await request(`${NOTIFICATIONS_PATH}/quiet-hours`, "PUT", { startLocal, endLocal, timeZone: timeZone.trim() });
  };

  const requestEmailVerification = async (): Promise<void> => {
    setSaving(true);
    setVerificationError(undefined);
    setVerificationMessage(undefined);
    try {
      const response = await fetch(`${NOTIFICATIONS_PATH}/email-verification`, {
        method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrfToken }
      });
      if (!response.ok) throw new Error("request");
      setVerificationMessage("A verification code was sent to your email address.");
    } catch {
      setVerificationError("We couldn’t send a verification code. Try again.");
    } finally { setSaving(false); }
  };

  const verifyEmail = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!/^\d{6}$/.test(verificationCode)) return;
    setSaving(true);
    setVerificationError(undefined);
    setVerificationMessage(undefined);
    try {
      const response = await fetch(`${NOTIFICATIONS_PATH}/email-verification/verify`, {
        method: "POST", credentials: "include",
        headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode })
      });
      if (!response.ok) throw new Error("verify");
      setVerificationCode("");
      setEmailVerified(true);
      setVerificationMessage("Your email address is verified.");
    } catch {
      setVerificationError("We couldn’t verify that code. Check it and try again.");
    } finally { setSaving(false); }
  };

  return (
    <section className="identity-section notification-center" aria-labelledby="notifications-heading">
      <div className="sessions-heading-row">
        <div><div className="eyebrow">INBOX & PREFERENCES</div><h2 id="notifications-heading">Notifications</h2></div>
        <button className="secondary-action" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "Open notifications"}
        </button>
      </div>
      {!open && <p className="identity-note">Your private inbox and delivery preferences.</p>}
      {open && <>
        {loading && <p role="status" className="identity-note">Loading notifications…</p>}
        {error && <div className="sessions-error"><p role="alert" className="auth-error">{error}</p><button className="secondary-action" type="button" onClick={() => void load()}>Try again</button></div>}
        {!loading && !error && inbox?.items.length === 0 && <div className="notification-center-empty task-empty-state" role="status">
          <svg className="task-empty-state__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10m-7 6h4"/></svg>
          <p className="task-empty-state__title">Your inbox is clear. New authorized updates will appear here.</p>
        </div>}
        {!loading && !error && inbox && inbox.items.length > 0 && <ul className="notification-list">
          {inbox.items.map((item) => <li className={item.readAt ? "notification-item is-read" : "notification-item"} key={item.id}>
            <div className="notification-copy">
              <div className="notification-meta"><span>{item.category}</span>{item.critical && <strong>Critical</strong>}{item.mandatory && <strong>Required</strong>}</div>
              <h3>{item.title}</h3><p>{item.body}</p><time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
            </div>
            <div className="notification-actions">
              <a className="secondary-action notification-link" href={item.internalRoute.startsWith("/") && !item.internalRoute.startsWith("//") ? item.internalRoute : "/"}>Open</a>
              {!item.readAt && <button className="secondary-action" type="button" disabled={saving} onClick={() => void request(`${NOTIFICATIONS_PATH}/${item.id}/read`, "PATCH")}>Mark read</button>}
            </div>
          </li>)}
        </ul>}
        {inbox?.nextCursor && <button className="secondary-action" type="button" disabled={loading} onClick={() => void loadMore()}>{loading ? "Loading…" : "Load more"}</button>}

        <section aria-labelledby="email-delivery-heading" className="notification-email-status">
          <h3 id="email-delivery-heading">Email delivery</h3>
          {emailVerificationAvailable === false ? <p className="identity-note" role="status">Email verification is unavailable until transactional email is configured.</p> : emailVerified === true ? <p className="identity-note" role="status">Email address verified.</p> : emailVerified === false ? <div className="notification-verification">
            <p className="identity-note" role="status">Email address not verified. Verify it to enable email delivery.</p>
            <button className="secondary-action" type="button" disabled={saving} onClick={() => void requestEmailVerification()}>{saving ? "Sending…" : "Send or resend verification code"}</button>
            <form className="notification-form" onSubmit={(event) => void verifyEmail(event)}>
              <label htmlFor="email-verification-code">Six-digit verification code</label>
              <input id="email-verification-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
              <button type="submit" disabled={saving || verificationCode.length !== 6}>{saving ? "Verifying…" : "Verify email"}</button>
            </form>
            {verificationMessage && <p className="identity-note" role="status">{verificationMessage}</p>}
            {verificationError && <p className="auth-error" role="alert">{verificationError}</p>}
          </div> : <p className="identity-note" role="status">Checking email verification…</p>}
          {emailStatus.length === 0 ? <div className="notification-preference-empty" role="status">
            <svg className="notification-preference-empty__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10m-7 6h4"/></svg>
            <p className="identity-note">No email notifications have been queued.</p>
          </div> : <ul className="notification-preference-list">
            {emailStatus.map((item) => <li key={item.id}>
              <span><strong>{item.title}</strong><small>{item.deliveryState === "DELIVERED" ? "Delivered" : item.deliveryState === "DEAD" ? "Not delivered" : "Pending"}{emailFailure(item.failureCode) ? ` · ${emailFailure(item.failureCode)}` : ""}</small></span>
              <span>{item.attempts} attempts</span>
            </li>)}
          </ul>}
        </section>

        <div className="notification-settings-grid">
          <section aria-labelledby="channel-preferences-heading">
            <h3 id="channel-preferences-heading">Optional channel preferences</h3>
            <p className="identity-note">Required business notices remain enabled. Leave a category unset to use its configured delivery defaults.</p>
            {settings?.preferences.length ? <ul className="notification-preference-list">
              {settings.preferences.map((item) => <li key={`${item.category}:${item.channel}`}>
                <span><strong>{item.category}</strong> · {item.channel}</span><span>{item.enabled ? "On" : "Off"}</span>
              </li>)}
            </ul> : <div className="notification-preference-empty" role="status">
              <svg className="notification-preference-empty__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10m-7 6h4"/></svg>
              <p className="identity-note">No optional preferences are saved.</p>
            </div>}
            <form className="notification-form" onSubmit={(event) => void savePreference(event)}>
              <label htmlFor="notification-category">Category</label><input id="notification-category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}" required />
              <label htmlFor="notification-channel">Channel</label><select id="notification-channel" value={channel} onChange={(event) => setChannel(event.target.value as Channel)}><option value="EMAIL">Email</option><option value="IN_APP">In app</option></select>
              <label className="notification-check"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /> Enable this optional category and channel</label>
              <button type="submit" disabled={saving || !category.trim()}>{saving ? "Saving…" : "Save preference"}</button>
            </form>
          </section>
          <section aria-labelledby="quiet-hours-heading">
            <h3 id="quiet-hours-heading">Quiet hours</h3>
            <p className="identity-note">Times use your selected time zone. Critical notices can bypass quiet hours.</p>
            {settings?.quietHours && <p className="identity-note" role="status">Currently {settings.quietHours.startLocal}–{settings.quietHours.endLocal} · {settings.quietHours.timeZone}</p>}
            <form className="notification-form" onSubmit={(event) => void saveQuietHours(event)}>
              <label htmlFor="quiet-start">Start</label><input id="quiet-start" type="time" value={startLocal} onChange={(event) => setStartLocal(event.target.value)} required />
              <label htmlFor="quiet-end">End</label><input id="quiet-end" type="time" value={endLocal} onChange={(event) => setEndLocal(event.target.value)} required />
              <label htmlFor="quiet-time-zone">IANA time zone</label><input id="quiet-time-zone" value={timeZone} onChange={(event) => setTimeZone(event.target.value)} placeholder="Asia/Kolkata" maxLength={100} required />
              <div className="notification-actions"><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save quiet hours"}</button>{settings?.quietHours && <button className="secondary-action" type="button" disabled={saving} onClick={() => void request(`${NOTIFICATIONS_PATH}/quiet-hours`, "DELETE")}>Clear</button>}</div>
            </form>
          </section>
        </div>
      </>}
    </section>
  );
}
