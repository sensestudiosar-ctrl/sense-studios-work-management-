import { useEffect, useState } from "react";

const AUDIT_PATH = "/api/v1/audit";
type AuditRow = {
  id: string; eventKey: string; occurredAt: string; actorSnapshot: unknown; subjectType: string;
  subjectId: string; reason: string | null; before: unknown; after: unknown; correctsEventId: string | null; retentionExpiresAt: string;
};
type SearchResult = { items: AuditRow[]; nextCursor: string | null };
type Overview = {
  configuration: { noticeIntervalDays: number | null } | null;
  notices: Array<{ id: string; noticeAt: string; auditEvent: { id: string; eventKey: string; occurredAt: string; retentionExpiresAt: string; subjectType: string; subjectId: string } }>;
  activeHolds: Array<{ id: string; auditEventId: string; reason: string; heldAt: string }>;
  tombstoneCount: number;
};

function time(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

function json(value: unknown): string {
  return value === null ? "None recorded" : JSON.stringify(value, null, 2);
}

export function AuditRetentionCenter({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [search, setSearch] = useState<SearchResult | null>(null);
  const [eventKey, setEventKey] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [interval, setInterval] = useState("");
  const [disposition, setDisposition] = useState<Record<string, "CLEARED" | "NOT_APPLICABLE">>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const [holdReason, setHoldReason] = useState<Record<string, string>>({});
  const [releaseReason, setReleaseReason] = useState<Record<string, string>>({});
  const [correctionForms, setCorrectionForms] = useState<Record<string, { field: string; value: string; reason: string }>>({});
  const [correctionErrors, setCorrectionErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const load = async (): Promise<void> => {
    setLoading(true); setError(undefined);
    try {
      const [overviewResponse, searchResponse] = await Promise.all([
        fetch(`${AUDIT_PATH}/retention`, { credentials: "include", cache: "no-store" }),
        fetch(`${AUDIT_PATH}/events?limit=30`, { credentials: "include", cache: "no-store" })
      ]);
      if (!overviewResponse.ok || !searchResponse.ok) throw new Error("load");
      const [nextOverview, nextSearch] = await Promise.all([overviewResponse.json(), searchResponse.json()]) as [Overview, SearchResult];
      setOverview(nextOverview); setSearch(nextSearch);
      setInterval(nextOverview.configuration?.noticeIntervalDays?.toString() ?? "");
    } catch { setError("We couldn’t load audit records and retention status. Try again."); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const request = async (url: string, method: "PUT" | "POST", body: unknown): Promise<void> => {
    setSaving(true); setError(undefined);
    try {
      const response = await fetch(url, {
        method, credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error("save");
      await load();
    } catch { setError("We couldn’t save that retention change. Try again."); }
    finally { setSaving(false); }
  };

  const queryEvents = async (): Promise<void> => {
    setLoading(true); setError(undefined);
    const params = new URLSearchParams({ limit: "30" });
    if (eventKey.trim()) params.set("eventKey", eventKey.trim());
    if (subjectId.trim()) params.set("subjectId", subjectId.trim());
    try {
      const response = await fetch(`${AUDIT_PATH}/events?${params.toString()}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("search");
      setSearch(await response.json() as SearchResult);
    } catch { setError("We couldn’t search audit events. Try again."); }
    finally { setLoading(false); }
  };

  const loadMore = async (): Promise<void> => {
    if (!search?.nextCursor) return;
    setLoading(true); setError(undefined);
    try {
      const response = await fetch(`${AUDIT_PATH}/events?limit=30&cursor=${encodeURIComponent(search.nextCursor)}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("page");
      const next = await response.json() as SearchResult;
      setSearch({ items: [...search.items, ...next.items], nextCursor: next.nextCursor });
    } catch { setError("We couldn’t load more audit events. Try again."); }
    finally { setLoading(false); }
  };

  const createCorrection = async (event: React.FormEvent<HTMLFormElement>, item: AuditRow): Promise<void> => {
    event.preventDefault();
    const form = correctionForms[item.id] ?? { field: "", value: "", reason: "" };
    const field = form.field.trim();
    const reason = form.reason.trim();
    if (!field || field.length > 80 || !reason || reason.length < 10 || reason.length > 1000 || form.value.length > 1000) {
      setCorrectionErrors((current) => ({ ...current, [item.id]: "Enter a field, corrected value, and a reason from 10 to 1000 characters." }));
      return;
    }
    setSaving(true);
    setCorrectionErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const response = await fetch(`${AUDIT_PATH}/events/${item.id}/corrections`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ reason, correction: { [field]: form.value } })
      });
      if (!response.ok) throw new Error("correction");
      setCorrectionForms((current) => ({ ...current, [item.id]: { field: "", value: "", reason: "" } }));
      await load();
    } catch {
      setCorrectionErrors((current) => ({ ...current, [item.id]: "We couldn’t record that correction. Try again." }));
    } finally { setSaving(false); }
  };

  return <section className="identity-section audit-retention" aria-labelledby="audit-retention-heading">
    <div className="sessions-heading-row">
      <div><div className="eyebrow">OWNER CONTROLS</div><h2 id="audit-retention-heading">Audit and retention</h2></div>
      <button className="secondary-action" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Open audit controls"}</button>
    </div>
    {!open && <p className="identity-note">Search immutable change evidence, review expiry notices, and manage retention holds.</p>}
    {open && <>
      {loading && <p role="status" className="identity-note">Loading audit and retention status…</p>}
      {error && <div className="sessions-error"><p role="alert" className="auth-error">{error}</p><button className="secondary-action" type="button" onClick={() => void load()}>Try again</button></div>}
      {!loading && overview && <>
        <section className="audit-retention-card" aria-labelledby="retention-settings-heading">
          <h3 id="retention-settings-heading">Expiry notice settings</h3>
          <p className="identity-note">Audit events expire ten years after they occurred. Purge stays disabled until you set an advance notice interval. Every deletion also requires a completed notice, no active hold, and backup clearance.</p>
          <form className="notification-form audit-interval-form" onSubmit={(event) => {
            event.preventDefault();
            const parsed = interval.trim() ? Number(interval) : null;
            if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650)) { setError("Enter an interval from 1 to 3650 days, or leave it blank to disable expiry notices."); return; }
            void request(`${AUDIT_PATH}/retention/config`, "PUT", { noticeIntervalDays: parsed });
          }}>
            <label htmlFor="audit-notice-days">Advance notice interval (days)</label>
            <input id="audit-notice-days" type="number" min="1" max="3650" value={interval} onChange={(event) => setInterval(event.target.value)} placeholder="Unset; expiry purge disabled" />
            <button disabled={saving}>{saving ? "Saving…" : "Save interval"}</button>
          </form>
          <p className="identity-note" role="status">Completed deletion tombstones: {overview.tombstoneCount}</p>
        </section>

        <section className="audit-retention-card" aria-labelledby="expiry-notices-heading">
          <h3 id="expiry-notices-heading">Upcoming expiry notices</h3>
          {overview.notices.length === 0 ? <p className="identity-note" role="status">No unacknowledged expiry notices.</p> : <ul className="audit-event-list">
            {overview.notices.map((notice) => <li key={notice.id}>
              <div><strong>{notice.auditEvent.eventKey}</strong><p>{notice.auditEvent.subjectType} · {notice.auditEvent.subjectId}</p><p>Occurred {time(notice.auditEvent.occurredAt)} · expires {time(notice.auditEvent.retentionExpiresAt)}</p></div>
              <form className="audit-notice-form" onSubmit={(event) => {
                event.preventDefault();
                const selected = disposition[notice.id] ?? "CLEARED";
                const reference = evidence[notice.id]?.trim();
                if (selected === "CLEARED" && !reference) { setError("Enter the opaque backup run reference after the applicable backup has expired."); return; }
                void request(`${AUDIT_PATH}/retention/notices/${notice.id}/acknowledge`, "POST", {
                  backupDisposition: selected,
                  ...(reference ? { evidenceRef: reference } : {})
                });
              }}>
                <label htmlFor={`backup-disposition-${notice.id}`}>Backup disposition</label>
                <select id={`backup-disposition-${notice.id}`} value={disposition[notice.id] ?? "CLEARED"} onChange={(event) => setDisposition((current) => ({ ...current, [notice.id]: event.target.value as "CLEARED" | "NOT_APPLICABLE" }))}>
                  <option value="CLEARED">Applicable backups have expired</option><option value="NOT_APPLICABLE">No applicable backups</option>
                </select>
                {(disposition[notice.id] ?? "CLEARED") === "CLEARED" && <><label htmlFor={`backup-reference-${notice.id}`}>Backup run reference</label><input id={`backup-reference-${notice.id}`} value={evidence[notice.id] ?? ""} onChange={(event) => setEvidence((current) => ({ ...current, [notice.id]: event.target.value }))} pattern="[A-Za-z0-9._:-]+" maxLength={200} required /></>}
                <button disabled={saving}>{saving ? "Saving…" : "Acknowledge notice"}</button>
              </form>
            </li>)}
          </ul>}
        </section>

        <section className="audit-retention-card" aria-labelledby="active-holds-heading">
          <h3 id="active-holds-heading">Active retention holds</h3>
          {overview.activeHolds.length === 0 ? <p className="identity-note" role="status">No active holds.</p> : <ul className="audit-event-list">
            {overview.activeHolds.map((hold) => <li key={hold.id}>
              <div><strong>{hold.auditEventId}</strong><p>{hold.reason}</p><p>Placed {time(hold.heldAt)}</p></div>
              <form className="audit-notice-form" onSubmit={(event) => {
                event.preventDefault();
                void request(`${AUDIT_PATH}/retention/holds/${hold.id}/release`, "POST", { reason: releaseReason[hold.id] ?? "" });
              }}>
                <label htmlFor={`release-reason-${hold.id}`}>Release reason</label>
                <textarea id={`release-reason-${hold.id}`} minLength={10} maxLength={1000} value={releaseReason[hold.id] ?? ""} onChange={(event) => setReleaseReason((current) => ({ ...current, [hold.id]: event.target.value }))} required />
                <button disabled={saving || (releaseReason[hold.id]?.trim().length ?? 0) < 10}>{saving ? "Saving…" : "Release hold"}</button>
              </form>
            </li>)}
          </ul>}
        </section>

        <section className="audit-retention-card" aria-labelledby="audit-search-heading">
          <h3 id="audit-search-heading">Search audit events</h3>
          <form className="audit-search-form" onSubmit={(event) => { event.preventDefault(); void queryEvents(); }}>
            <label htmlFor="audit-event-key">Event key</label><input id="audit-event-key" value={eventKey} onChange={(event) => setEventKey(event.target.value)} maxLength={160} aria-describedby="audit-event-key-help" />
            <small id="audit-event-key-help">Matches the full event key, ignoring letter case.</small>
            <label htmlFor="audit-subject-id">Subject ID</label><input id="audit-subject-id" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} maxLength={200} />
            <button disabled={loading}>{loading ? "Searching…" : "Search"}</button>
          </form>
          {!search?.items.length ? <p className="identity-note" role="status">No audit events match this search.</p> : <ul className="audit-event-list">
            {search.items.map((item) => <li key={item.id}>
              <div className="audit-event-heading"><strong>{item.eventKey}</strong><time dateTime={item.occurredAt}>{time(item.occurredAt)}</time></div>
              <p>{item.subjectType} · {item.subjectId}</p><p>Actor: {json(item.actorSnapshot)}</p>
              {item.reason && <p>Reason: {item.reason}</p>}
              {item.correctsEventId && <p>Correction of audit event: <code>{item.correctsEventId}</code></p>}
              {!item.correctsEventId && search.items.some((candidate) => candidate.correctsEventId === item.id) && <p>Linked correction IDs: {search.items.filter((candidate) => candidate.correctsEventId === item.id).map((candidate) => <code className="audit-correction-id" key={candidate.id}>{candidate.id}</code>)}</p>}
              <p>Expires {time(item.retentionExpiresAt)}</p>
              {(item.before !== null || item.after !== null) && <details><summary>Recorded change</summary><div className="audit-change-grid"><pre>{json(item.before)}</pre><pre>{json(item.after)}</pre></div></details>}
              {!item.correctsEventId && <form className="audit-notice-form" onSubmit={(event) => void createCorrection(event, item)}>
                <strong>Record an audit correction</strong>
                <label htmlFor={`correction-field-${item.id}`}>Field name</label>
                <input id={`correction-field-${item.id}`} maxLength={80} value={correctionForms[item.id]?.field ?? ""} onChange={(event) => setCorrectionForms((current) => ({ ...current, [item.id]: { field: event.target.value, value: current[item.id]?.value ?? "", reason: current[item.id]?.reason ?? "" } }))} required />
                <label htmlFor={`correction-value-${item.id}`}>Corrected value</label>
                <input id={`correction-value-${item.id}`} maxLength={1000} value={correctionForms[item.id]?.value ?? ""} onChange={(event) => setCorrectionForms((current) => ({ ...current, [item.id]: { field: current[item.id]?.field ?? "", value: event.target.value, reason: current[item.id]?.reason ?? "" } }))} />
                <label htmlFor={`correction-reason-${item.id}`}>Reason</label>
                <textarea id={`correction-reason-${item.id}`} minLength={10} maxLength={1000} value={correctionForms[item.id]?.reason ?? ""} onChange={(event) => setCorrectionForms((current) => ({ ...current, [item.id]: { field: current[item.id]?.field ?? "", value: current[item.id]?.value ?? "", reason: event.target.value } }))} required />
                {correctionErrors[item.id] && <p className="auth-error" role="alert">{correctionErrors[item.id]}</p>}
                <button className="secondary-action" disabled={saving || (correctionForms[item.id]?.field.trim().length ?? 0) === 0 || (correctionForms[item.id]?.reason.trim().length ?? 0) < 10}>{saving ? "Saving…" : "Record correction"}</button>
              </form>}
              <form className="audit-notice-form" onSubmit={(event) => {
                event.preventDefault();
                void request(`${AUDIT_PATH}/events/${item.id}/holds`, "POST", { reason: holdReason[item.id] ?? "" });
              }}>
                <label htmlFor={`hold-reason-${item.id}`}>Place a retention hold</label>
                <textarea id={`hold-reason-${item.id}`} minLength={10} maxLength={1000} value={holdReason[item.id] ?? ""} onChange={(event) => setHoldReason((current) => ({ ...current, [item.id]: event.target.value }))} required />
                <button className="secondary-action" disabled={saving || (holdReason[item.id]?.trim().length ?? 0) < 10}>{saving ? "Saving…" : "Place hold"}</button>
              </form>
            </li>)}
          </ul>}
          {search?.nextCursor && <button className="secondary-action" type="button" disabled={loading} onClick={() => void loadMore()}>{loading ? "Loading…" : "Load more audit events"}</button>}
        </section>
      </>}
    </>}
  </section>;
}
