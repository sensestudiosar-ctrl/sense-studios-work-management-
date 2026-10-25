import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const AUDIT_PATH = "/api/v1/audit";
function time(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}
function json(value) {
    return value === null ? "None recorded" : JSON.stringify(value, null, 2);
}
export function AuditRetentionCenter({ csrfToken }) {
    const [open, setOpen] = useState(false);
    const [overview, setOverview] = useState(null);
    const [search, setSearch] = useState(null);
    const [eventKey, setEventKey] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [interval, setInterval] = useState("");
    const [disposition, setDisposition] = useState({});
    const [evidence, setEvidence] = useState({});
    const [holdReason, setHoldReason] = useState({});
    const [releaseReason, setReleaseReason] = useState({});
    const [correctionForms, setCorrectionForms] = useState({});
    const [correctionErrors, setCorrectionErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState();
    const load = async () => {
        setLoading(true);
        setError(undefined);
        try {
            const [overviewResponse, searchResponse] = await Promise.all([
                fetch(`${AUDIT_PATH}/retention`, { credentials: "include", cache: "no-store" }),
                fetch(`${AUDIT_PATH}/events?limit=30`, { credentials: "include", cache: "no-store" })
            ]);
            if (!overviewResponse.ok || !searchResponse.ok)
                throw new Error("load");
            const [nextOverview, nextSearch] = await Promise.all([overviewResponse.json(), searchResponse.json()]);
            setOverview(nextOverview);
            setSearch(nextSearch);
            setInterval(nextOverview.configuration?.noticeIntervalDays?.toString() ?? "");
        }
        catch {
            setError("We couldn’t load audit records and retention status. Try again.");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { if (open)
        void load(); }, [open]);
    const request = async (url, method, body) => {
        setSaving(true);
        setError(undefined);
        try {
            const response = await fetch(url, {
                method, credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
                body: JSON.stringify(body)
            });
            if (!response.ok)
                throw new Error("save");
            await load();
        }
        catch {
            setError("We couldn’t save that retention change. Try again.");
        }
        finally {
            setSaving(false);
        }
    };
    const queryEvents = async () => {
        setLoading(true);
        setError(undefined);
        const params = new URLSearchParams({ limit: "30" });
        if (eventKey.trim())
            params.set("eventKey", eventKey.trim());
        if (subjectId.trim())
            params.set("subjectId", subjectId.trim());
        try {
            const response = await fetch(`${AUDIT_PATH}/events?${params.toString()}`, { credentials: "include", cache: "no-store" });
            if (!response.ok)
                throw new Error("search");
            setSearch(await response.json());
        }
        catch {
            setError("We couldn’t search audit events. Try again.");
        }
        finally {
            setLoading(false);
        }
    };
    const loadMore = async () => {
        if (!search?.nextCursor)
            return;
        setLoading(true);
        setError(undefined);
        try {
            const response = await fetch(`${AUDIT_PATH}/events?limit=30&cursor=${encodeURIComponent(search.nextCursor)}`, { credentials: "include", cache: "no-store" });
            if (!response.ok)
                throw new Error("page");
            const next = await response.json();
            setSearch({ items: [...search.items, ...next.items], nextCursor: next.nextCursor });
        }
        catch {
            setError("We couldn’t load more audit events. Try again.");
        }
        finally {
            setLoading(false);
        }
    };
    const createCorrection = async (event, item) => {
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
            if (!response.ok)
                throw new Error("correction");
            setCorrectionForms((current) => ({ ...current, [item.id]: { field: "", value: "", reason: "" } }));
            await load();
        }
        catch {
            setCorrectionErrors((current) => ({ ...current, [item.id]: "We couldn’t record that correction. Try again." }));
        }
        finally {
            setSaving(false);
        }
    };
    return _jsxs("section", { className: "identity-section audit-retention", "aria-labelledby": "audit-retention-heading", children: [_jsxs("div", { className: "sessions-heading-row", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "OWNER CONTROLS" }), _jsx("h2", { id: "audit-retention-heading", children: "Audit and retention" })] }), _jsx("button", { className: "secondary-action", type: "button", "aria-expanded": open, onClick: () => setOpen((value) => !value), children: open ? "Close" : "Open audit controls" })] }), !open && _jsx("p", { className: "identity-note", children: "Search immutable change evidence, review expiry notices, and manage retention holds." }), open && _jsxs(_Fragment, { children: [loading && _jsx("p", { role: "status", className: "identity-note", children: "Loading audit and retention status\u2026" }), error && _jsxs("div", { className: "sessions-error", children: [_jsx("p", { role: "alert", className: "auth-error", children: error }), _jsx("button", { className: "secondary-action", type: "button", onClick: () => void load(), children: "Try again" })] }), !loading && overview && _jsxs(_Fragment, { children: [_jsxs("section", { className: "audit-retention-card", "aria-labelledby": "retention-settings-heading", children: [_jsx("h3", { id: "retention-settings-heading", children: "Expiry notice settings" }), _jsx("p", { className: "identity-note", children: "Audit events expire ten years after they occurred. Purge stays disabled until you set an advance notice interval. Every deletion also requires a completed notice, no active hold, and backup clearance." }), _jsxs("form", { className: "notification-form audit-interval-form", onSubmit: (event) => {
                                            event.preventDefault();
                                            const parsed = interval.trim() ? Number(interval) : null;
                                            if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650)) {
                                                setError("Enter an interval from 1 to 3650 days, or leave it blank to disable expiry notices.");
                                                return;
                                            }
                                            void request(`${AUDIT_PATH}/retention/config`, "PUT", { noticeIntervalDays: parsed });
                                        }, children: [_jsx("label", { htmlFor: "audit-notice-days", children: "Advance notice interval (days)" }), _jsx("input", { id: "audit-notice-days", type: "number", min: "1", max: "3650", value: interval, onChange: (event) => setInterval(event.target.value), placeholder: "Unset; expiry purge disabled" }), _jsx("button", { disabled: saving, children: saving ? "Saving…" : "Save interval" })] }), _jsxs("p", { className: "identity-note", role: "status", children: ["Completed deletion tombstones: ", overview.tombstoneCount] })] }), _jsxs("section", { className: "audit-retention-card", "aria-labelledby": "expiry-notices-heading", children: [_jsx("h3", { id: "expiry-notices-heading", children: "Upcoming expiry notices" }), overview.notices.length === 0 ? _jsx("p", { className: "identity-note", role: "status", children: "No unacknowledged expiry notices." }) : _jsx("ul", { className: "audit-event-list", children: overview.notices.map((notice) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: notice.auditEvent.eventKey }), _jsxs("p", { children: [notice.auditEvent.subjectType, " \u00B7 ", notice.auditEvent.subjectId] }), _jsxs("p", { children: ["Occurred ", time(notice.auditEvent.occurredAt), " \u00B7 expires ", time(notice.auditEvent.retentionExpiresAt)] })] }), _jsxs("form", { className: "audit-notice-form", onSubmit: (event) => {
                                                        event.preventDefault();
                                                        const selected = disposition[notice.id] ?? "CLEARED";
                                                        const reference = evidence[notice.id]?.trim();
                                                        if (selected === "CLEARED" && !reference) {
                                                            setError("Enter the opaque backup run reference after the applicable backup has expired.");
                                                            return;
                                                        }
                                                        void request(`${AUDIT_PATH}/retention/notices/${notice.id}/acknowledge`, "POST", {
                                                            backupDisposition: selected,
                                                            ...(reference ? { evidenceRef: reference } : {})
                                                        });
                                                    }, children: [_jsx("label", { htmlFor: `backup-disposition-${notice.id}`, children: "Backup disposition" }), _jsxs("select", { id: `backup-disposition-${notice.id}`, value: disposition[notice.id] ?? "CLEARED", onChange: (event) => setDisposition((current) => ({ ...current, [notice.id]: event.target.value })), children: [_jsx("option", { value: "CLEARED", children: "Applicable backups have expired" }), _jsx("option", { value: "NOT_APPLICABLE", children: "No applicable backups" })] }), (disposition[notice.id] ?? "CLEARED") === "CLEARED" && _jsxs(_Fragment, { children: [_jsx("label", { htmlFor: `backup-reference-${notice.id}`, children: "Backup run reference" }), _jsx("input", { id: `backup-reference-${notice.id}`, value: evidence[notice.id] ?? "", onChange: (event) => setEvidence((current) => ({ ...current, [notice.id]: event.target.value })), pattern: "[A-Za-z0-9._:-]+", maxLength: 200, required: true })] }), _jsx("button", { disabled: saving, children: saving ? "Saving…" : "Acknowledge notice" })] })] }, notice.id)) })] }), _jsxs("section", { className: "audit-retention-card", "aria-labelledby": "active-holds-heading", children: [_jsx("h3", { id: "active-holds-heading", children: "Active retention holds" }), overview.activeHolds.length === 0 ? _jsx("p", { className: "identity-note", role: "status", children: "No active holds." }) : _jsx("ul", { className: "audit-event-list", children: overview.activeHolds.map((hold) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: hold.auditEventId }), _jsx("p", { children: hold.reason }), _jsxs("p", { children: ["Placed ", time(hold.heldAt)] })] }), _jsxs("form", { className: "audit-notice-form", onSubmit: (event) => {
                                                        event.preventDefault();
                                                        void request(`${AUDIT_PATH}/retention/holds/${hold.id}/release`, "POST", { reason: releaseReason[hold.id] ?? "" });
                                                    }, children: [_jsx("label", { htmlFor: `release-reason-${hold.id}`, children: "Release reason" }), _jsx("textarea", { id: `release-reason-${hold.id}`, minLength: 10, maxLength: 1000, value: releaseReason[hold.id] ?? "", onChange: (event) => setReleaseReason((current) => ({ ...current, [hold.id]: event.target.value })), required: true }), _jsx("button", { disabled: saving || (releaseReason[hold.id]?.trim().length ?? 0) < 10, children: saving ? "Saving…" : "Release hold" })] })] }, hold.id)) })] }), _jsxs("section", { className: "audit-retention-card", "aria-labelledby": "audit-search-heading", children: [_jsx("h3", { id: "audit-search-heading", children: "Search audit events" }), _jsxs("form", { className: "audit-search-form", onSubmit: (event) => { event.preventDefault(); void queryEvents(); }, children: [_jsx("label", { htmlFor: "audit-event-key", children: "Event key" }), _jsx("input", { id: "audit-event-key", value: eventKey, onChange: (event) => setEventKey(event.target.value), maxLength: 160, "aria-describedby": "audit-event-key-help" }), _jsx("small", { id: "audit-event-key-help", children: "Matches the full event key, ignoring letter case." }), _jsx("label", { htmlFor: "audit-subject-id", children: "Subject ID" }), _jsx("input", { id: "audit-subject-id", value: subjectId, onChange: (event) => setSubjectId(event.target.value), maxLength: 200 }), _jsx("button", { disabled: loading, children: loading ? "Searching…" : "Search" })] }), !search?.items.length ? _jsx("p", { className: "identity-note", role: "status", children: "No audit events match this search." }) : _jsx("ul", { className: "audit-event-list", children: search.items.map((item) => _jsxs("li", { children: [_jsxs("div", { className: "audit-event-heading", children: [_jsx("strong", { children: item.eventKey }), _jsx("time", { dateTime: item.occurredAt, children: time(item.occurredAt) })] }), _jsxs("p", { children: [item.subjectType, " \u00B7 ", item.subjectId] }), _jsxs("p", { children: ["Actor: ", json(item.actorSnapshot)] }), item.reason && _jsxs("p", { children: ["Reason: ", item.reason] }), item.correctsEventId && _jsxs("p", { children: ["Correction of audit event: ", _jsx("code", { children: item.correctsEventId })] }), !item.correctsEventId && search.items.some((candidate) => candidate.correctsEventId === item.id) && _jsxs("p", { children: ["Linked correction IDs: ", search.items.filter((candidate) => candidate.correctsEventId === item.id).map((candidate) => _jsx("code", { className: "audit-correction-id", children: candidate.id }, candidate.id))] }), _jsxs("p", { children: ["Expires ", time(item.retentionExpiresAt)] }), (item.before !== null || item.after !== null) && _jsxs("details", { children: [_jsx("summary", { children: "Recorded change" }), _jsxs("div", { className: "audit-change-grid", children: [_jsx("pre", { children: json(item.before) }), _jsx("pre", { children: json(item.after) })] })] }), !item.correctsEventId && _jsxs("form", { className: "audit-notice-form", onSubmit: (event) => void createCorrection(event, item), children: [_jsx("strong", { children: "Record an audit correction" }), _jsx("label", { htmlFor: `correction-field-${item.id}`, children: "Field name" }), _jsx("input", { id: `correction-field-${item.id}`, maxLength: 80, value: correctionForms[item.id]?.field ?? "", onChange: (event) => setCorrectionForms((current) => ({ ...current, [item.id]: { field: event.target.value, value: current[item.id]?.value ?? "", reason: current[item.id]?.reason ?? "" } })), required: true }), _jsx("label", { htmlFor: `correction-value-${item.id}`, children: "Corrected value" }), _jsx("input", { id: `correction-value-${item.id}`, maxLength: 1000, value: correctionForms[item.id]?.value ?? "", onChange: (event) => setCorrectionForms((current) => ({ ...current, [item.id]: { field: current[item.id]?.field ?? "", value: event.target.value, reason: current[item.id]?.reason ?? "" } })) }), _jsx("label", { htmlFor: `correction-reason-${item.id}`, children: "Reason" }), _jsx("textarea", { id: `correction-reason-${item.id}`, minLength: 10, maxLength: 1000, value: correctionForms[item.id]?.reason ?? "", onChange: (event) => setCorrectionForms((current) => ({ ...current, [item.id]: { field: current[item.id]?.field ?? "", value: current[item.id]?.value ?? "", reason: event.target.value } })), required: true }), correctionErrors[item.id] && _jsx("p", { className: "auth-error", role: "alert", children: correctionErrors[item.id] }), _jsx("button", { className: "secondary-action", disabled: saving || (correctionForms[item.id]?.field.trim().length ?? 0) === 0 || (correctionForms[item.id]?.reason.trim().length ?? 0) < 10, children: saving ? "Saving…" : "Record correction" })] }), _jsxs("form", { className: "audit-notice-form", onSubmit: (event) => {
                                                        event.preventDefault();
                                                        void request(`${AUDIT_PATH}/events/${item.id}/holds`, "POST", { reason: holdReason[item.id] ?? "" });
                                                    }, children: [_jsx("label", { htmlFor: `hold-reason-${item.id}`, children: "Place a retention hold" }), _jsx("textarea", { id: `hold-reason-${item.id}`, minLength: 10, maxLength: 1000, value: holdReason[item.id] ?? "", onChange: (event) => setHoldReason((current) => ({ ...current, [item.id]: event.target.value })), required: true }), _jsx("button", { className: "secondary-action", disabled: saving || (holdReason[item.id]?.trim().length ?? 0) < 10, children: saving ? "Saving…" : "Place hold" })] })] }, item.id)) }), search?.nextCursor && _jsx("button", { className: "secondary-action", type: "button", disabled: loading, onClick: () => void loadMore(), children: loading ? "Loading…" : "Load more audit events" })] })] })] })] });
}
