import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import "./integrations.css";

const API = "/api/v1/integrations";
type Kind = "MEETING" | "SITE_VISIT";
type Project = { id: string; title: string; canManageEvents: boolean };
type CalendarEvent = { id: string; kind: Kind; projectId: string | null; startAt: string; endAt: string; state: "ACTIVE" | "CANCELLED"; version: number; canManage: boolean };
type ConnectorOption = { id: string; label: string };
type BranchOption = { id: string; name: string };
type Connector = { id: string; label: string; branchId: string; sourceId: string; actorId: string; state: "ACTIVE" | "DISABLED"; version: number; createdAt: string; updatedAt: string };
type Delivery = { id: string; connectorId: string; externalId: string; status: string; leadId?: string; occurredAt: string };
type Location = { id: string; projectId: string; label: string; latitude: number; longitude: number; mapUrl: string };
type Setup = { owner: boolean; projects: Project[]; events: CalendarEvent[]; subscription: { active: boolean; id?: string; createdAt?: string }; connectorOptions: { branches: BranchOption[]; sources: ConnectorOption[]; actors: ConnectorOption[] }; websiteConnectors: Connector[]; deliveries: Delivery[]; locations: Location[] };
type SubscriptionSecret = { id: string; token: string; relativeUrl: string; createdAt: string };
type ConnectorSecret = Connector & { secret?: string; replayed?: boolean };
const commandId = (): string => crypto.randomUUID();

async function request<T>(path: string, csrf: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) { headers.set("Content-Type", "application/json"); headers.set("X-CSRF-Token", csrf); }
  const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
  if (!response.ok) {
    const message = body.error?.message ?? body.message;
    if (response.status === 409 && path.startsWith("/website-connectors")) throw new Error(message ?? "This connector changed elsewhere. Refresh and try again.");
    if (response.status === 409) throw new Error("This calendar item changed elsewhere. Refresh the list and try again.");
    throw new Error(message ?? `Request failed (${response.status})`);
  }
  return body as T;
}
const localInput = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const eventLabel = (kind: Kind): string => kind === "MEETING" ? "Meeting" : "Site visit";
const dateLabel = (value: string): string => new Date(value).toLocaleString();

export function IntegrationsWorkspace({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [secret, setSecret] = useState<SubscriptionSecret | null>(null);
  const [kind, setKind] = useState<Kind>("MEETING");
  const [projectId, setProjectId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [connectorLabel, setConnectorLabel] = useState("");
  const [branchId, setBranchId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [actorId, setActorId] = useState("");
  const [connectorReason, setConnectorReason] = useState("");
  const [connectorSecret, setConnectorSecret] = useState("");
  const connectorCommand = useRef<{ signature: string; id: string } | null>(null);
  const connectorCommandId = (signature: string): string => {
    if (connectorCommand.current?.signature !== signature) connectorCommand.current = { signature, id: commandId() };
    return connectorCommand.current.id;
  };

  const load = useCallback(async (initial = false): Promise<void> => {
    if (initial) setLoading(true);
    setError("");
    try { setSetup(await request<Setup>("/setup", csrfToken)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Calendar settings could not be loaded."); }
    finally { if (initial) setLoading(false); }
  }, [csrfToken]);
  useEffect(() => { void load(true); }, [load]);

  const download = async (): Promise<void> => {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API}/calendar.ics`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Your calendar access is no longer available. Sign in again or refresh access." : `Calendar download failed (${response.status}).`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sense-calendar.ics"; anchor.hidden = true;
      document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setNotice("Calendar file downloaded.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Calendar download failed."); }
    finally { setBusy(false); }
  };

  const subscription = async (): Promise<void> => {
    setBusy(true); setError(""); setNotice(""); setSecret(null);
    try {
      const result = await request<SubscriptionSecret>("/calendar/subscription", csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), reason: "Create or rotate my calendar subscription." }) });
      setSecret(result); setNotice("Copy the subscription URL now. Its secret is shown only once."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Subscription could not be created."); }
    finally { setBusy(false); }
  };
  const revoke = async (): Promise<void> => {
    setBusy(true); setError(""); setNotice(""); setSecret(null);
    try {
      await request<{ revoked: true }>("/calendar/subscription", csrfToken, { method: "DELETE", body: JSON.stringify({ commandId: commandId(), reason: "Revoke my calendar subscription." }) });
      setNotice("Subscription revoked. Calendar copies already imported may remain in other apps."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Subscription could not be revoked."); }
    finally { setBusy(false); }
  };
  const saveEvent = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!startAt || !endAt || !reason.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const body = { commandId: commandId(), reason: reason.trim(), startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() };
      if (editing) await request<CalendarEvent>(`/calendar/events/${encodeURIComponent(editing.id)}`, csrfToken, { method: "PUT", body: JSON.stringify({ ...body, expectedVersion: editing.version }) });
      else await request<CalendarEvent>("/calendar/events", csrfToken, { method: "POST", body: JSON.stringify({ ...body, kind, ...(projectId ? { projectId } : {}) }) });
      setNotice(editing ? "Calendar event updated." : "Calendar event saved."); setEditing(null); setStartAt(""); setEndAt(""); setReason(""); setProjectId(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Calendar event could not be saved."); }
    finally { setBusy(false); }
  };
  const beginEdit = (item: CalendarEvent): void => { setEditing(item); setKind(item.kind); setProjectId(item.projectId ?? ""); setStartAt(localInput(item.startAt)); setEndAt(localInput(item.endAt)); setReason(""); };
  const cancelEvent = async (item: CalendarEvent): Promise<void> => {
    const why = window.prompt("Reason for cancelling this event");
    if (!why?.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try { await request<CalendarEvent>(`/calendar/events/${encodeURIComponent(item.id)}/cancel`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), reason: why.trim(), expectedVersion: item.version }) }); setNotice("Calendar event cancelled."); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Calendar event could not be cancelled."); }
    finally { setBusy(false); }
  };

  const createConnector = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!setup?.owner || !connectorLabel.trim() || !branchId || !sourceId || !actorId || connectorReason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice(""); setConnectorSecret("");
    try {
      const fields = { reason: connectorReason.trim(), label: connectorLabel.trim(), branchId, sourceId, actorId };
      const signature = `create:${JSON.stringify(fields)}`;
      const result = await request<ConnectorSecret>("/website-connectors", csrfToken, { method: "POST", body: JSON.stringify({ ...fields, commandId: connectorCommandId(signature) }) });
      if (result.secret) { setConnectorSecret(result.secret); setNotice("Copy this website signing secret now. It is shown only once."); }
      else setNotice("The connector already exists, but its one-time secret is unavailable. Rotate the connector to create a new secret.");
      connectorCommand.current = null;
      setConnectorLabel(""); setConnectorReason(""); setBranchId(""); setSourceId(""); setActorId(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Website connector could not be created."); }
    finally { setBusy(false); }
  };

  const connectorAction = async (item: Connector, action: "rotate" | "disable"): Promise<void> => {
    if (!setup?.owner || busy) return;
    const why = window.prompt(`Reason to ${action} ${item.label}`);
    if (!why?.trim()) return;
    setBusy(true); setError(""); setNotice(""); setConnectorSecret("");
    try {
      const fields = { reason: why.trim(), expectedVersion: item.version };
      const signature = `${action}:${item.id}:${JSON.stringify(fields)}`;
      const result = await request<ConnectorSecret | Connector>(`/website-connectors/${encodeURIComponent(item.id)}/${action}`, csrfToken, { method: "POST", body: JSON.stringify({ ...fields, commandId: connectorCommandId(signature) }) });
      if (action === "rotate" && "secret" in result && result.secret) { setConnectorSecret(result.secret); setNotice("Copy this website signing secret now. It is shown only once."); }
      else if (action === "rotate") setNotice("This rotation was already completed, but its one-time secret is unavailable. Start a new rotation to create another secret.");
      else setNotice("Website connector disabled.");
      connectorCommand.current = null;
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Website connector could not be ${action === "rotate" ? "rotated" : "disabled"}.`); }
    finally { setBusy(false); }
  };

  return <section className="identity-section integrations-workspace" aria-labelledby="integrations-heading">
    <div className="integrations-heading"><div><div className="eyebrow">CONNECTED WORK</div><h2 id="integrations-heading">Calendar</h2><p>Export authorized deadlines, milestones, reviews and your entered events.</p></div><div className="integrations-actions"><button type="button" className="integrations-secondary" onClick={() => void load()} disabled={busy}>Refresh calendar</button><button className="primary-action" type="button" onClick={() => void download()} disabled={busy}>Download .ics</button></div></div>
    {error && <p className="integrations-error" role="alert">{error}</p>}{notice && <p className="integrations-notice" role="status">{notice}</p>}
    {loading ? <p role="status">Loading calendar settings…</p> : setup && <>
      <div className="integrations-panels">
        <section className="integrations-panel" aria-labelledby="subscription-heading"><h3 id="subscription-heading">Calendar subscription</h3><p>A private link refreshes from your current authorized calendar items.</p><p className="integrations-copy-limit">Revoking the link stops future access. Copies already imported into another calendar may remain there.</p>
          <div className="integrations-actions"><button type="button" onClick={() => void subscription()} disabled={busy}>{setup.subscription.active ? "Rotate subscription link" : "Create subscription link"}</button>{setup.subscription.active && <button type="button" className="integrations-secondary" onClick={() => void revoke()} disabled={busy}>Revoke link</button>}</div>
          {secret && <div className="integrations-secret"><strong>Copy this URL now. It will not be shown again.</strong><label htmlFor="calendar-subscription-url">Private subscription URL</label><input id="calendar-subscription-url" readOnly value={new URL(secret.relativeUrl, window.location.origin).toString()} onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={() => void navigator.clipboard?.writeText(new URL(secret.relativeUrl, window.location.origin).toString()).then(() => setNotice("Subscription URL copied."))}>Copy URL</button></div>}
        </section>
        <section className="integrations-panel"><h3>{editing ? "Edit calendar event" : "Add a meeting or site visit"}</h3><form onSubmit={(event) => void saveEvent(event)}><div className="integrations-form-grid">
          <label>Event type<select value={kind} onChange={(event) => setKind(event.target.value as Kind)} disabled={Boolean(editing)}><option value="MEETING">Meeting</option><option value="SITE_VISIT">Site visit</option></select></label>
          <label>Project (optional)<select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={Boolean(editing)}><option value="">Personal event</option>{setup.projects.filter((project) => project.canManageEvents).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          <label>Starts<input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required /></label><label>Ends<input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} required /></label>
          <label className="integrations-span">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required placeholder="Why is this event being recorded?" /></label>
        </div><div className="integrations-actions"><button type="submit" disabled={busy || !startAt || !endAt || !reason.trim()}>{editing ? "Save changes" : "Save event"}</button>{editing && <button type="button" className="integrations-secondary" onClick={() => { setEditing(null); setStartAt(""); setEndAt(""); setReason(""); }}>Stop editing</button>}</div></form></section>
      </div>
      <section className="integrations-events" aria-labelledby="events-heading"><h3 id="events-heading">Entered events</h3>{setup.events.length === 0 ? <p role="status">No meetings or site visits have been entered.</p> : <ul>{setup.events.map((item) => <li key={item.id}><div><strong>{eventLabel(item.kind)}</strong><span>{dateLabel(item.startAt)} – {dateLabel(item.endAt)}</span><small>{item.projectId ? setup.projects.find((project) => project.id === item.projectId)?.title ?? "Project event" : "Personal event"} · {item.state === "ACTIVE" ? "Active" : "Cancelled"}</small></div>{item.canManage && item.state === "ACTIVE" && <div className="integrations-actions"><button type="button" className="integrations-secondary" disabled={busy} onClick={() => beginEdit(item)}>Edit</button><button type="button" className="integrations-secondary" disabled={busy} onClick={() => void cancelEvent(item)}>Cancel</button></div>}</li>)}</ul>}</section>
      <p className="integrations-minimal-note">Calendar labels are minimal. They exclude project and task names, contact details, notes and location evidence.</p>
      {setup.owner && <section className="integrations-events" aria-labelledby="website-heading"><h3 id="website-heading">Website enquiries</h3><p>Connect a signed website enquiry source. Each accepted enquiry creates one new lead.</p>
        <form onSubmit={(event) => void createConnector(event)}><div className="integrations-form-grid">
          <label>Connector label<input value={connectorLabel} onChange={(event) => setConnectorLabel(event.target.value)} minLength={1} maxLength={160} required /></label>
          <label>Branch<select value={branchId} onChange={(event) => setBranchId(event.target.value)} required><option value="">Choose an active branch</option>{setup.connectorOptions.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Website source<select value={sourceId} onChange={(event) => setSourceId(event.target.value)} required><option value="">Choose an active Website source</option>{setup.connectorOptions.sources.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>Authorized actor<select value={actorId} onChange={(event) => setActorId(event.target.value)} required><option value="">Choose an authorized internal actor</option>{setup.connectorOptions.actors.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="integrations-span">Reason<textarea value={connectorReason} onChange={(event) => setConnectorReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
        </div><div className="integrations-actions"><button type="submit" disabled={busy || !connectorLabel.trim() || !branchId || !sourceId || !actorId || connectorReason.trim().length < 3}>Create website connector</button></div></form>
        {connectorSecret && <div className="integrations-secret"><strong>Copy this signing secret now. It is shown only once.</strong><label htmlFor="website-signing-secret">Website signing secret</label><input id="website-signing-secret" readOnly value={connectorSecret} onFocus={(event) => event.currentTarget.select()} /><button type="button" onClick={() => void navigator.clipboard?.writeText(connectorSecret).then(() => setNotice("Website signing secret copied."))}>Copy secret</button></div>}
        {setup.websiteConnectors.length === 0 ? <p role="status">No website connectors configured.</p> : <ul>{setup.websiteConnectors.map((item) => <li key={item.id}><div><strong>{item.label}</strong><span>{item.state}</span><small>Version {item.version} · Updated {dateLabel(item.updatedAt)}</small></div><div className="integrations-actions">{item.state === "ACTIVE" && <><button type="button" className="integrations-secondary" disabled={busy} onClick={() => void connectorAction(item, "rotate")}>Rotate secret</button><button type="button" className="integrations-secondary" disabled={busy} onClick={() => void connectorAction(item, "disable")}>Disable connector</button></>}</div></li>)}</ul>}
        <h4>Recent delivery status</h4>{setup.deliveries.length === 0 ? <p role="status">No website enquiry deliveries recorded.</p> : <ul>{setup.deliveries.map((item) => <li key={item.id}><div><strong>{setup.websiteConnectors.find((connector) => connector.id === item.connectorId)?.label ?? "Website connector"}</strong><span>{item.status}</span><small>{dateLabel(item.occurredAt)}</small></div></li>)}</ul>}
        {connectorSecret && <p className="integrations-copy-limit">Keep this signing secret private. It is never shown again after leaving this page.</p>}
      </section>}
      {setup.locations.length > 0 && <section className="integrations-events" aria-labelledby="locations-heading"><h3 id="locations-heading">Project locations</h3><ul>{setup.locations.map((item) => <li key={item.id}><div><strong>{item.label}</strong><span>{setup.projects.find((project) => project.id === item.projectId)?.title ?? "Authorized project"}</span></div><a className="integrations-map-link" href={item.mapUrl} target="_blank" rel="noopener noreferrer">Open map</a></li>)}</ul><p className="integrations-minimal-note">Maps open only when you choose a link. No location is sent to a map service automatically.</p></section>}
    </>}
  </section>;
}
