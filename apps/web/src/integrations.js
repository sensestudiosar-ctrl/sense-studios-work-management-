import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import "./integrations.css";
const API = "/api/v1/integrations";
const commandId = () => crypto.randomUUID();
async function request(path, csrf, init = {}) {
    const headers = new Headers(init.headers);
    if (init.body) {
        headers.set("Content-Type", "application/json");
        headers.set("X-CSRF-Token", csrf);
    }
    const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = body.error?.message ?? body.message;
        if (response.status === 409 && path.startsWith("/website-connectors"))
            throw new Error(message ?? "This connector changed elsewhere. Refresh and try again.");
        if (response.status === 409)
            throw new Error("This calendar item changed elsewhere. Refresh the list and try again.");
        throw new Error(message ?? `Request failed (${response.status})`);
    }
    return body;
}
const localInput = (value) => {
    if (!value)
        return "";
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const eventLabel = (kind) => kind === "MEETING" ? "Meeting" : "Site visit";
const dateLabel = (value) => new Date(value).toLocaleString();
export function IntegrationsWorkspace({ csrfToken }) {
    const [setup, setSetup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [secret, setSecret] = useState(null);
    const [kind, setKind] = useState("MEETING");
    const [projectId, setProjectId] = useState("");
    const [startAt, setStartAt] = useState("");
    const [endAt, setEndAt] = useState("");
    const [reason, setReason] = useState("");
    const [editing, setEditing] = useState(null);
    const [connectorLabel, setConnectorLabel] = useState("");
    const [branchId, setBranchId] = useState("");
    const [sourceId, setSourceId] = useState("");
    const [actorId, setActorId] = useState("");
    const [connectorReason, setConnectorReason] = useState("");
    const [connectorSecret, setConnectorSecret] = useState("");
    const connectorCommand = useRef(null);
    const connectorCommandId = (signature) => {
        if (connectorCommand.current?.signature !== signature)
            connectorCommand.current = { signature, id: commandId() };
        return connectorCommand.current.id;
    };
    const load = useCallback(async (initial = false) => {
        if (initial)
            setLoading(true);
        setError("");
        try {
            setSetup(await request("/setup", csrfToken));
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Calendar settings could not be loaded.");
        }
        finally {
            if (initial)
                setLoading(false);
        }
    }, [csrfToken]);
    useEffect(() => { void load(true); }, [load]);
    const download = async () => {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const response = await fetch(`${API}/calendar.ics`, { credentials: "include", cache: "no-store" });
            if (!response.ok)
                throw new Error(response.status === 401 || response.status === 403 ? "Your calendar access is no longer available. Sign in again or refresh access." : `Calendar download failed (${response.status}).`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "sense-calendar.ics";
            anchor.hidden = true;
            document.body.append(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setNotice("Calendar file downloaded.");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Calendar download failed.");
        }
        finally {
            setBusy(false);
        }
    };
    const subscription = async () => {
        setBusy(true);
        setError("");
        setNotice("");
        setSecret(null);
        try {
            const result = await request("/calendar/subscription", csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), reason: "Create or rotate my calendar subscription." }) });
            setSecret(result);
            setNotice("Copy the subscription URL now. Its secret is shown only once.");
            await load();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Subscription could not be created.");
        }
        finally {
            setBusy(false);
        }
    };
    const revoke = async () => {
        setBusy(true);
        setError("");
        setNotice("");
        setSecret(null);
        try {
            await request("/calendar/subscription", csrfToken, { method: "DELETE", body: JSON.stringify({ commandId: commandId(), reason: "Revoke my calendar subscription." }) });
            setNotice("Subscription revoked. Calendar copies already imported may remain in other apps.");
            await load();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Subscription could not be revoked.");
        }
        finally {
            setBusy(false);
        }
    };
    const saveEvent = async (event) => {
        event.preventDefault();
        if (!startAt || !endAt || !reason.trim())
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const body = { commandId: commandId(), reason: reason.trim(), startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() };
            if (editing)
                await request(`/calendar/events/${encodeURIComponent(editing.id)}`, csrfToken, { method: "PUT", body: JSON.stringify({ ...body, expectedVersion: editing.version }) });
            else
                await request("/calendar/events", csrfToken, { method: "POST", body: JSON.stringify({ ...body, kind, ...(projectId ? { projectId } : {}) }) });
            setNotice(editing ? "Calendar event updated." : "Calendar event saved.");
            setEditing(null);
            setStartAt("");
            setEndAt("");
            setReason("");
            setProjectId("");
            await load();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Calendar event could not be saved.");
        }
        finally {
            setBusy(false);
        }
    };
    const beginEdit = (item) => { setEditing(item); setKind(item.kind); setProjectId(item.projectId ?? ""); setStartAt(localInput(item.startAt)); setEndAt(localInput(item.endAt)); setReason(""); };
    const cancelEvent = async (item) => {
        const why = window.prompt("Reason for cancelling this event");
        if (!why?.trim())
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`/calendar/events/${encodeURIComponent(item.id)}/cancel`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), reason: why.trim(), expectedVersion: item.version }) });
            setNotice("Calendar event cancelled.");
            await load();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Calendar event could not be cancelled.");
        }
        finally {
            setBusy(false);
        }
    };
    const createConnector = async (event) => {
        event.preventDefault();
        if (!setup?.owner || !connectorLabel.trim() || !branchId || !sourceId || !actorId || connectorReason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        setConnectorSecret("");
        try {
            const fields = { reason: connectorReason.trim(), label: connectorLabel.trim(), branchId, sourceId, actorId };
            const signature = `create:${JSON.stringify(fields)}`;
            const result = await request("/website-connectors", csrfToken, { method: "POST", body: JSON.stringify({ ...fields, commandId: connectorCommandId(signature) }) });
            if (result.secret) {
                setConnectorSecret(result.secret);
                setNotice("Copy this website signing secret now. It is shown only once.");
            }
            else
                setNotice("The connector already exists, but its one-time secret is unavailable. Rotate the connector to create a new secret.");
            connectorCommand.current = null;
            setConnectorLabel("");
            setConnectorReason("");
            setBranchId("");
            setSourceId("");
            setActorId("");
            await load();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Website connector could not be created.");
        }
        finally {
            setBusy(false);
        }
    };
    const connectorAction = async (item, action) => {
        if (!setup?.owner || busy)
            return;
        const why = window.prompt(`Reason to ${action} ${item.label}`);
        if (!why?.trim())
            return;
        setBusy(true);
        setError("");
        setNotice("");
        setConnectorSecret("");
        try {
            const fields = { reason: why.trim(), expectedVersion: item.version };
            const signature = `${action}:${item.id}:${JSON.stringify(fields)}`;
            const result = await request(`/website-connectors/${encodeURIComponent(item.id)}/${action}`, csrfToken, { method: "POST", body: JSON.stringify({ ...fields, commandId: connectorCommandId(signature) }) });
            if (action === "rotate" && "secret" in result && result.secret) {
                setConnectorSecret(result.secret);
                setNotice("Copy this website signing secret now. It is shown only once.");
            }
            else if (action === "rotate")
                setNotice("This rotation was already completed, but its one-time secret is unavailable. Start a new rotation to create another secret.");
            else
                setNotice("Website connector disabled.");
            connectorCommand.current = null;
            await load();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : `Website connector could not be ${action === "rotate" ? "rotated" : "disabled"}.`);
        }
        finally {
            setBusy(false);
        }
    };
    return _jsxs("section", { className: "identity-section integrations-workspace", "aria-labelledby": "integrations-heading", children: [_jsxs("div", { className: "integrations-heading", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "CONNECTED WORK" }), _jsx("h2", { id: "integrations-heading", children: "Calendar" }), _jsx("p", { children: "Export authorized deadlines, milestones, reviews and your entered events." })] }), _jsxs("div", { className: "integrations-actions", children: [_jsx("button", { type: "button", className: "integrations-secondary", onClick: () => void load(), disabled: busy, children: "Refresh calendar" }), _jsx("button", { className: "primary-action", type: "button", onClick: () => void download(), disabled: busy, children: "Download .ics" })] })] }), error && _jsx("p", { className: "integrations-error", role: "alert", children: error }), notice && _jsx("p", { className: "integrations-notice", role: "status", children: notice }), loading ? _jsx("p", { role: "status", children: "Loading calendar settings\u2026" }) : setup && _jsxs(_Fragment, { children: [_jsxs("div", { className: "integrations-panels", children: [_jsxs("section", { className: "integrations-panel", "aria-labelledby": "subscription-heading", children: [_jsx("h3", { id: "subscription-heading", children: "Calendar subscription" }), _jsx("p", { children: "A private link refreshes from your current authorized calendar items." }), _jsx("p", { className: "integrations-copy-limit", children: "Revoking the link stops future access. Copies already imported into another calendar may remain there." }), _jsxs("div", { className: "integrations-actions", children: [_jsx("button", { type: "button", onClick: () => void subscription(), disabled: busy, children: setup.subscription.active ? "Rotate subscription link" : "Create subscription link" }), setup.subscription.active && _jsx("button", { type: "button", className: "integrations-secondary", onClick: () => void revoke(), disabled: busy, children: "Revoke link" })] }), secret && _jsxs("div", { className: "integrations-secret", children: [_jsx("strong", { children: "Copy this URL now. It will not be shown again." }), _jsx("label", { htmlFor: "calendar-subscription-url", children: "Private subscription URL" }), _jsx("input", { id: "calendar-subscription-url", readOnly: true, value: new URL(secret.relativeUrl, window.location.origin).toString(), onFocus: (event) => event.currentTarget.select() }), _jsx("button", { type: "button", onClick: () => void navigator.clipboard?.writeText(new URL(secret.relativeUrl, window.location.origin).toString()).then(() => setNotice("Subscription URL copied.")), children: "Copy URL" })] })] }), _jsxs("section", { className: "integrations-panel", children: [_jsx("h3", { children: editing ? "Edit calendar event" : "Add a meeting or site visit" }), _jsxs("form", { onSubmit: (event) => void saveEvent(event), children: [_jsxs("div", { className: "integrations-form-grid", children: [_jsxs("label", { children: ["Event type", _jsxs("select", { value: kind, onChange: (event) => setKind(event.target.value), disabled: Boolean(editing), children: [_jsx("option", { value: "MEETING", children: "Meeting" }), _jsx("option", { value: "SITE_VISIT", children: "Site visit" })] })] }), _jsxs("label", { children: ["Project (optional)", _jsxs("select", { value: projectId, onChange: (event) => setProjectId(event.target.value), disabled: Boolean(editing), children: [_jsx("option", { value: "", children: "Personal event" }), setup.projects.filter((project) => project.canManageEvents).map((project) => _jsx("option", { value: project.id, children: project.title }, project.id))] })] }), _jsxs("label", { children: ["Starts", _jsx("input", { type: "datetime-local", value: startAt, onChange: (event) => setStartAt(event.target.value), required: true })] }), _jsxs("label", { children: ["Ends", _jsx("input", { type: "datetime-local", value: endAt, onChange: (event) => setEndAt(event.target.value), required: true })] }), _jsxs("label", { className: "integrations-span", children: ["Reason", _jsx("textarea", { value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000, required: true, placeholder: "Why is this event being recorded?" })] })] }), _jsxs("div", { className: "integrations-actions", children: [_jsx("button", { type: "submit", disabled: busy || !startAt || !endAt || !reason.trim(), children: editing ? "Save changes" : "Save event" }), editing && _jsx("button", { type: "button", className: "integrations-secondary", onClick: () => { setEditing(null); setStartAt(""); setEndAt(""); setReason(""); }, children: "Stop editing" })] })] })] })] }), _jsxs("section", { className: "integrations-events", "aria-labelledby": "events-heading", children: [_jsx("h3", { id: "events-heading", children: "Entered events" }), setup.events.length === 0 ? _jsx("p", { role: "status", children: "No meetings or site visits have been entered." }) : _jsx("ul", { children: setup.events.map((item) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: eventLabel(item.kind) }), _jsxs("span", { children: [dateLabel(item.startAt), " \u2013 ", dateLabel(item.endAt)] }), _jsxs("small", { children: [item.projectId ? setup.projects.find((project) => project.id === item.projectId)?.title ?? "Project event" : "Personal event", " \u00B7 ", item.state === "ACTIVE" ? "Active" : "Cancelled"] })] }), item.canManage && item.state === "ACTIVE" && _jsxs("div", { className: "integrations-actions", children: [_jsx("button", { type: "button", className: "integrations-secondary", disabled: busy, onClick: () => beginEdit(item), children: "Edit" }), _jsx("button", { type: "button", className: "integrations-secondary", disabled: busy, onClick: () => void cancelEvent(item), children: "Cancel" })] })] }, item.id)) })] }), _jsx("p", { className: "integrations-minimal-note", children: "Calendar labels are minimal. They exclude project and task names, contact details, notes and location evidence." }), setup.owner && _jsxs("section", { className: "integrations-events", "aria-labelledby": "website-heading", children: [_jsx("h3", { id: "website-heading", children: "Website enquiries" }), _jsx("p", { children: "Connect a signed website enquiry source. Each accepted enquiry creates one new lead." }), _jsxs("form", { onSubmit: (event) => void createConnector(event), children: [_jsxs("div", { className: "integrations-form-grid", children: [_jsxs("label", { children: ["Connector label", _jsx("input", { value: connectorLabel, onChange: (event) => setConnectorLabel(event.target.value), minLength: 1, maxLength: 160, required: true })] }), _jsxs("label", { children: ["Branch", _jsxs("select", { value: branchId, onChange: (event) => setBranchId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an active branch" }), setup.connectorOptions.branches.map((item) => _jsx("option", { value: item.id, children: item.name }, item.id))] })] }), _jsxs("label", { children: ["Website source", _jsxs("select", { value: sourceId, onChange: (event) => setSourceId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an active Website source" }), setup.connectorOptions.sources.map((item) => _jsx("option", { value: item.id, children: item.label }, item.id))] })] }), _jsxs("label", { children: ["Authorized actor", _jsxs("select", { value: actorId, onChange: (event) => setActorId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an authorized internal actor" }), setup.connectorOptions.actors.map((item) => _jsx("option", { value: item.id, children: item.label }, item.id))] })] }), _jsxs("label", { className: "integrations-span", children: ["Reason", _jsx("textarea", { value: connectorReason, onChange: (event) => setConnectorReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] })] }), _jsx("div", { className: "integrations-actions", children: _jsx("button", { type: "submit", disabled: busy || !connectorLabel.trim() || !branchId || !sourceId || !actorId || connectorReason.trim().length < 3, children: "Create website connector" }) })] }), connectorSecret && _jsxs("div", { className: "integrations-secret", children: [_jsx("strong", { children: "Copy this signing secret now. It is shown only once." }), _jsx("label", { htmlFor: "website-signing-secret", children: "Website signing secret" }), _jsx("input", { id: "website-signing-secret", readOnly: true, value: connectorSecret, onFocus: (event) => event.currentTarget.select() }), _jsx("button", { type: "button", onClick: () => void navigator.clipboard?.writeText(connectorSecret).then(() => setNotice("Website signing secret copied.")), children: "Copy secret" })] }), setup.websiteConnectors.length === 0 ? _jsx("p", { role: "status", children: "No website connectors configured." }) : _jsx("ul", { children: setup.websiteConnectors.map((item) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: item.label }), _jsx("span", { children: item.state }), _jsxs("small", { children: ["Version ", item.version, " \u00B7 Updated ", dateLabel(item.updatedAt)] })] }), _jsx("div", { className: "integrations-actions", children: item.state === "ACTIVE" && _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "integrations-secondary", disabled: busy, onClick: () => void connectorAction(item, "rotate"), children: "Rotate secret" }), _jsx("button", { type: "button", className: "integrations-secondary", disabled: busy, onClick: () => void connectorAction(item, "disable"), children: "Disable connector" })] }) })] }, item.id)) }), _jsx("h4", { children: "Recent delivery status" }), setup.deliveries.length === 0 ? _jsx("p", { role: "status", children: "No website enquiry deliveries recorded." }) : _jsx("ul", { children: setup.deliveries.map((item) => _jsx("li", { children: _jsxs("div", { children: [_jsx("strong", { children: setup.websiteConnectors.find((connector) => connector.id === item.connectorId)?.label ?? "Website connector" }), _jsx("span", { children: item.status }), _jsx("small", { children: dateLabel(item.occurredAt) })] }) }, item.id)) }), connectorSecret && _jsx("p", { className: "integrations-copy-limit", children: "Keep this signing secret private. It is never shown again after leaving this page." })] }), setup.locations.length > 0 && _jsxs("section", { className: "integrations-events", "aria-labelledby": "locations-heading", children: [_jsx("h3", { id: "locations-heading", children: "Project locations" }), _jsx("ul", { children: setup.locations.map((item) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: item.label }), _jsx("span", { children: setup.projects.find((project) => project.id === item.projectId)?.title ?? "Authorized project" })] }), _jsx("a", { className: "integrations-map-link", href: item.mapUrl, target: "_blank", rel: "noopener noreferrer", children: "Open map" })] }, item.id)) }), _jsx("p", { className: "integrations-minimal-note", children: "Maps open only when you choose a link. No location is sent to a map service automatically." })] })] })] });
}
