import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import "./crm.css";
const stages = ["NEW", "CONTACTED", "MEETING_DISCUSSION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const label = (s) => s.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
async function request(url, init) {
    const r = await fetch(url, { credentials: "include", cache: "no-store", ...init });
    if (!r.ok) {
        const e = new Error(r.status === 403 ? "You don’t have access to this CRM action." : r.status === 409 ? "This record changed. Reload it and try again." : `CRM request failed (${r.status}).`);
        e.status = r.status;
        throw e;
    }
    return r.status === 204 ? undefined : await r.json();
}
export function CrmWorkspace({ csrfToken, owner }) {
    const [branches, setBranches] = useState([]), [sources, setSources] = useState([]), [branchId, setBranchId] = useState("");
    const [sourceManage, setSourceManage] = useState(false), [sourceName, setSourceName] = useState(""), [sourceReason, setSourceReason] = useState(""), [sourceBusy, setSourceBusy] = useState(false), [sourceReasons, setSourceReasons] = useState({});
    const [items, setItems] = useState([]), [total, setTotal] = useState(0), [offset, setOffset] = useState(0), [selected, setSelected] = useState();
    const [detail, setDetail] = useState();
    const [clients, setClients] = useState([]), [error, setError] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
    const [createOpen, setCreateOpen] = useState(false), [stageTo, setStageTo] = useState(""), [stageReason, setStageReason] = useState(""), [activityKind, setActivityKind] = useState("NOTE"), [activityNote, setActivityNote] = useState("");
    const [form, setForm] = useState({ title: "", contactName: "", email: "", phone: "", sourceId: "", clientId: "", priorLostLeadId: "", reason: "" });
    const [clientForm, setClientForm] = useState({ id: "", name: "", version: 0, contacts: [], reason: "" });
    const [editLead, setEditLead] = useState(false), [editValues, setEditValues] = useState({ title: "", contactName: "", email: "", phone: "", reason: "" });
    const setupRequest = useRef(0), branchRequest = useRef(0), detailRequest = useRef(0);
    const fail = (e) => setError(e instanceof Error ? e.message : "CRM is unavailable. Try again.");
    const loadSetup = useCallback(async () => { const generation = ++setupRequest.current; const d = await request("/api/v1/crm/setup"); if (generation !== setupRequest.current)
        return; const safeBranches = Array.isArray(d?.branches) ? d.branches : []; setBranches(safeBranches); setSources(Array.isArray(d?.sources) ? d.sources : []); setSourceManage(d?.sourceManage === true); setBranchId(v => v || safeBranches.find(b => b.capabilities?.view || b.capabilities?.create)?.id || ""); }, []);
    const loadList = useCallback(async (b, o = 0) => { if (!b || !branches.find(x => x.id === b)?.capabilities.view)
        return { items: [], total: 0 }; return request(`/api/v1/crm/leads?branchId=${encodeURIComponent(b)}&offset=${o}&limit=25`); }, [branches]);
    const loadDetail = useCallback(async (id) => request(`/api/v1/crm/leads/${encodeURIComponent(id)}`), []);
    const refresh = useCallback(async () => { setLoading(true); setError(""); try {
        await loadSetup();
    }
    catch (e) {
        fail(e);
    }
    finally {
        setLoading(false);
    } }, [loadSetup]);
    useEffect(() => { void refresh(); }, [refresh]);
    useEffect(() => {
        if (!branchId || !branches.some(b => b.id === branchId))
            return;
        const generation = ++branchRequest.current;
        setLoading(true);
        setError("");
        setItems([]);
        setTotal(0);
        setClients([]);
        void loadList(branchId, offset).then(d => { if (generation === branchRequest.current) {
            setItems(d.items);
            setTotal(d.total);
        } }).catch(e => { if (generation === branchRequest.current)
            fail(e); }).finally(() => { if (generation === branchRequest.current)
            setLoading(false); });
        if (branches.find(b => b.id === branchId)?.capabilities.view)
            void request(`/api/v1/crm/clients?branchId=${encodeURIComponent(branchId)}`).then(d => { if (generation === branchRequest.current)
                setClients(d.items); }).catch(() => { if (generation === branchRequest.current)
                setClients([]); });
        return () => { branchRequest.current += 1; };
    }, [branchId, offset, loadList, branches]);
    useEffect(() => {
        const generation = ++detailRequest.current;
        if (!selected) {
            setDetail(undefined);
            return;
        }
        setDetail(undefined);
        void loadDetail(selected).then(d => { if (generation === detailRequest.current)
            setDetail(d); }).catch(e => { if (generation === detailRequest.current)
            fail(e); });
        return () => { detailRequest.current += 1; };
    }, [selected, branchId, loadDetail]);
    const mutate = async (path, method, body) => { const branch = branchId, generation = branchRequest.current, chosen = selected, selectedGeneration = detailRequest.current; setBusy(true); setError(""); setNotice(""); try {
        await request(path, { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
        const d = await loadList(branch, offset);
        if (branch === branchId && generation === branchRequest.current) {
            setItems(d.items);
            setTotal(d.total);
        }
        if (chosen) {
            const updated = await loadDetail(chosen);
            if (selectedGeneration === detailRequest.current && generation === branchRequest.current)
                setDetail(updated);
        }
        setNotice("Changes saved.");
        return true;
    }
    catch (e) {
        fail(e);
        return false;
    }
    finally {
        setBusy(false);
    } };
    const createLead = async (ev) => { ev.preventDefault(); const body = { branchId, title: form.title, contactName: form.contactName, ...(form.email.trim() ? { email: form.email.trim() } : {}), ...(form.phone.trim() ? { phone: form.phone.trim() } : {}), sourceId: form.sourceId, ...(form.clientId ? { clientId: form.clientId } : {}), ...(form.priorLostLeadId ? { priorLostLeadId: form.priorLostLeadId } : {}), reason: form.reason }; if (await mutate("/api/v1/crm/leads", "POST", body))
        setCreateOpen(false); };
    const saveClient = async (ev) => { ev.preventDefault(); const targetBranch = branchId, generation = branchRequest.current; const body = { name: clientForm.name, contacts: clientForm.contacts.filter(c => c.name.trim()).map(c => ({ ...(c.id ? { id: c.id } : {}), name: c.name, email: clientForm.id ? (c.email || null) : (c.email || undefined), phone: clientForm.id ? (c.phone || null) : (c.phone || undefined) })), reason: clientForm.reason, ...(clientForm.id ? { expectedVersion: clientForm.version } : {}) }; const ok = await mutate(clientForm.id ? `/api/v1/crm/clients/${encodeURIComponent(clientForm.id)}` : "/api/v1/crm/clients", clientForm.id ? "PUT" : "POST", body); if (ok) {
        setClientForm({ id: "", name: "", version: 0, contacts: [], reason: "" });
        if (targetBranch === branchId && generation === branchRequest.current) {
            const d = await request(`/api/v1/crm/clients?branchId=${encodeURIComponent(targetBranch)}`);
            if (targetBranch === branchId && generation === branchRequest.current)
                setClients(d.items);
        }
    } };
    const saveLeadEdit = async (ev) => { ev.preventDefault(); if (!detail)
        return; const body = { expectedVersion: detail.lead.version, title: editValues.title, contactName: editValues.contactName, email: editValues.email.trim() || null, phone: editValues.phone.trim() || null, reason: editValues.reason }; if (await mutate(`/api/v1/crm/leads/${encodeURIComponent(detail.lead.id)}`, "PUT", body))
        setEditLead(false); };
    const mutateSource = async (path, method, body) => { setSourceBusy(true); setError(""); setNotice(""); try {
        await request(path, { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
        await loadSetup();
        setNotice("Source settings saved.");
        return true;
    }
    catch (e) {
        fail(e);
        return false;
    }
    finally {
        setSourceBusy(false);
    } };
    const createSource = async (ev) => { ev.preventDefault(); if (await mutateSource("/api/v1/crm/sources", "POST", { name: sourceName, reason: sourceReason })) {
        setSourceName("");
        setSourceReason("");
    } };
    const setSourceActive = (source, active) => { const reason = sourceReasons[source.id]?.trim() ?? ""; if (reason.length < 3 || !source.updatedAt)
        return; void mutateSource(`/api/v1/crm/sources/${encodeURIComponent(source.id)}`, "PUT", { active, expectedUpdatedAt: source.updatedAt, reason }); };
    const activeBranch = branches.find(b => b.id === branchId), caps = detail?.capabilities ?? activeBranch?.capabilities;
    return _jsxs("section", { className: "crm", "aria-labelledby": "crm-heading", children: [_jsxs("header", { className: "crm-head", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "CUSTOMER RELATIONSHIPS" }), _jsx("h2", { id: "crm-heading", children: "Leads and clients" }), _jsx("p", { children: "Follow each enquiry from first contact through its recorded outcome." })] }), _jsxs("div", { className: "crm-tools", children: [_jsxs("label", { children: ["Branch", _jsxs("select", { "aria-label": "CRM branch", value: branchId, onChange: e => { setBranchId(e.target.value); setSelected(undefined); setDetail(undefined); setItems([]); setClients([]); setError(""); setOffset(0); }, children: [_jsx("option", { value: "", children: "Choose a branch" }), branches.filter(b => b.capabilities.view || b.capabilities.create || b.capabilities.edit || b.capabilities.activityCreate || b.capabilities.stageChange).map(b => _jsx("option", { value: b.id, children: b.name }, b.id))] })] }), activeBranch?.capabilities.create && _jsx("button", { onClick: () => { setCreateOpen(true); setForm({ title: "", contactName: "", email: "", phone: "", sourceId: sources.find(s => s.active)?.id ?? "", clientId: "", priorLostLeadId: "", reason: "" }); }, children: "New lead" })] })] }), error && _jsxs("div", { className: "crm-error", role: "alert", children: [error, " ", _jsx("button", { onClick: () => selected ? void loadDetail(selected).catch(fail) : void refresh(), children: "Try again" })] }), notice && _jsx("p", { role: "status", className: "crm-notice", children: notice }), loading && _jsx("p", { role: "status", children: "Loading CRM\u2026" }), !loading && !error && branches.length === 0 && _jsx("p", { role: "status", children: "No branches are available to you." }), !loading && branchId && !activeBranch?.capabilities.view && _jsx("p", { role: "status", children: "You can create leads in this branch, but cannot view its existing records." }), branchId && _jsxs("div", { className: "crm-layout", children: [_jsxs("div", { className: "crm-list", children: [_jsxs("div", { className: "crm-list-head", children: [_jsx("strong", { children: "Leads" }), _jsxs("span", { children: [total, " total"] })] }), loading ? _jsx("p", { role: "status", children: "Loading leads\u2026" }) : items.length === 0 ? _jsx("p", { role: "status", children: "No leads in this branch yet." }) : _jsx("ul", { children: items.map(x => _jsx("li", { children: _jsxs("button", { className: selected === x.id ? "selected" : "", onClick: () => setSelected(x.id), children: [_jsx("strong", { children: x.title }), _jsxs("span", { children: [x.contactName, " \u00B7 ", label(x.stage)] }), _jsx("small", { children: x.source?.name ?? x.sourceName ?? "Source unavailable" })] }) }, x.id)) }), _jsxs("div", { className: "crm-pagination", children: [_jsx("button", { disabled: offset === 0, onClick: () => setOffset(Math.max(0, offset - 25)), children: "Previous" }), _jsxs("span", { children: [total ? offset + 1 : 0, "\u2013", Math.min(total, offset + 25), " of ", total] }), _jsx("button", { disabled: offset + 25 >= total, onClick: () => setOffset(offset + 25), children: "Next" })] })] }), _jsx("div", { className: "crm-detail", children: !detail ? _jsx("p", { className: "crm-placeholder", children: "Choose a lead to view its history." }) : _jsxs(_Fragment, { children: [_jsxs("div", { className: "crm-detail-head", children: [_jsxs("div", { children: [_jsx("span", { className: "crm-stage", children: label(detail.lead.stage) }), _jsx("h3", { children: detail.lead.title }), _jsxs("p", { children: [detail.lead.contactName, detail.lead.email ? ` · ${detail.lead.email}` : "", detail.lead.phone ? ` · ${detail.lead.phone}` : ""] }), detail.lead.source?.name && _jsxs("small", { children: ["Source: ", detail.lead.source.name, detail.lead.source.active === false ? " · inactive historical source" : ""] })] }), _jsxs("span", { children: ["Version ", detail.lead.version] })] }), detail.capabilities.edit && _jsx("button", { onClick: () => { setEditValues({ title: detail.lead.title, contactName: detail.lead.contactName, email: detail.lead.email ?? "", phone: detail.lead.phone ?? "", reason: "" }); setEditLead(true); }, children: "Edit lead details" }), (detail.lead.lostReason || detail.lead.lossReason) && _jsxs("p", { className: "crm-outcome", children: [_jsx("strong", { children: "Lost reason:" }), " ", detail.lead.lostReason ?? detail.lead.lossReason] }), detail.candidate && _jsxs("aside", { className: "crm-candidate", children: [_jsx("strong", { children: "Won conversion candidate" }), _jsxs("p", { children: ["Won ", new Date(detail.candidate.wonAt).toLocaleString(), ". Provenance recorded; project creation is not available here."] })] }), detail.priorLostLead && _jsxs("p", { className: "crm-linked", children: ["Returning enquiry linked to prior lost lead: ", detail.priorLostLead.title] }), detail.lead.stage === "LOST" && activeBranch?.capabilities.create && _jsx("button", { onClick: () => { setCreateOpen(true); setForm(f => ({ ...f, priorLostLeadId: detail.lead.id, title: "", contactName: "", email: "", phone: "", sourceId: sources.find(s => s.active)?.id ?? "", clientId: "" })); }, children: "Create returning enquiry" }), caps?.stageChange && !["WON", "LOST"].includes(detail.lead.stage) && _jsxs("form", { className: "crm-inline", onSubmit: e => { e.preventDefault(); if (stageTo)
                                        void mutate(`/api/v1/crm/leads/${encodeURIComponent(detail.lead.id)}/stage`, "POST", { expectedVersion: detail.lead.version, toStage: stageTo, reason: stageReason }); }, children: [_jsx("h4", { children: "Change stage" }), _jsxs("label", { children: ["New stage", _jsxs("select", { value: stageTo, onChange: e => setStageTo(e.target.value), children: [_jsx("option", { value: "", children: "Choose stage" }), stages.filter(s => s !== detail.lead.stage).map(s => _jsx("option", { value: s, children: label(s) }, s))] })] }), _jsxs("label", { children: ["Reason for Lost, skipped or backward move", _jsx("textarea", { value: stageReason, onChange: e => setStageReason(e.target.value), maxLength: 1000 })] }), _jsx("button", { disabled: busy || !stageTo, children: "Save stage" })] }), caps?.activityCreate && _jsxs("form", { className: "crm-inline", onSubmit: e => { e.preventDefault(); if (activityNote.trim().length >= 3)
                                        void mutate(`/api/v1/crm/leads/${encodeURIComponent(detail.lead.id)}/activities`, "POST", { kind: activityKind, note: activityNote }); }, children: [_jsx("h4", { children: "Record interaction" }), _jsxs("label", { children: ["Type", _jsx("select", { value: activityKind, onChange: e => setActivityKind(e.target.value), children: ["NOTE", "CALL", "MEETING", "PROPOSAL", "OTHER"].map(k => _jsx("option", { children: k }, k)) })] }), _jsxs("label", { children: ["Note", _jsx("textarea", { required: true, minLength: 3, maxLength: 2000, value: activityNote, onChange: e => setActivityNote(e.target.value) })] }), _jsx("button", { disabled: busy || activityNote.trim().length < 3, children: "Add activity" })] }), _jsxs("div", { className: "crm-timeline", children: [_jsx("h4", { children: "Stage history" }), detail.stageChanges.length === 0 ? _jsx("p", { children: "No stage history." }) : _jsx("ol", { children: detail.stageChanges.map(h => _jsxs("li", { children: [_jsx("strong", { children: h.direction === "CREATED" ? "Lead created" : `${label(h.fromStage ?? "NEW")} → ${label(h.toStage)}` }), _jsx("time", { children: new Date(h.occurredAt ?? h.createdAt ?? "").toLocaleString() }), h.skippedStages?.length ? _jsxs("p", { className: "crm-skips", children: ["Skipped stages: ", h.skippedStages.map(label).join(", ")] }) : null, h.reason && _jsxs("p", { children: ["Reason: ", h.reason] })] }, h.id)) }), _jsx("h4", { children: "Interactions" }), detail.activities.length === 0 ? _jsx("p", { children: "No interactions recorded." }) : _jsx("ol", { children: detail.activities.map(a => _jsxs("li", { children: [_jsx("strong", { children: label(a.kind) }), _jsx("time", { children: new Date(a.occurredAt ?? a.createdAt ?? "").toLocaleString() }), _jsx("p", { children: a.note })] }, a.id)) })] })] }) })] }), createOpen && _jsx("div", { className: "crm-modal-backdrop", children: _jsxs("form", { className: "crm-modal", onSubmit: createLead, children: [_jsx("h3", { children: "New lead" }), _jsxs("label", { children: ["Title", _jsx("input", { required: true, minLength: 2, maxLength: 160, value: form.title, onChange: e => setForm({ ...form, title: e.target.value }) })] }), _jsxs("label", { children: ["Contact name", _jsx("input", { required: true, minLength: 2, maxLength: 160, value: form.contactName, onChange: e => setForm({ ...form, contactName: e.target.value }) })] }), _jsxs("label", { children: ["Email", _jsx("input", { type: "email", maxLength: 320, value: form.email, onChange: e => setForm({ ...form, email: e.target.value }) })] }), _jsxs("label", { children: ["Phone", _jsx("input", { maxLength: 64, value: form.phone, onChange: e => setForm({ ...form, phone: e.target.value }) })] }), _jsxs("label", { children: ["Source", _jsxs("select", { required: true, value: form.sourceId, onChange: e => setForm({ ...form, sourceId: e.target.value }), children: [_jsx("option", { value: "", children: "Choose source" }), sources.filter(s => s.active).map(s => _jsx("option", { value: s.id, children: s.name }, s.id))] })] }), _jsxs("label", { children: ["Visible client (optional)", _jsxs("select", { value: form.clientId, onChange: e => setForm({ ...form, clientId: e.target.value }), children: [_jsx("option", { value: "", children: "No client selected" }), clients.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), form.priorLostLeadId && _jsx("p", { className: "crm-linked", children: "Creates a separate lead linked to the selected lost record. Previous history remains unchanged." }), _jsxs("label", { children: ["Creation reason", _jsx("textarea", { required: true, minLength: 3, maxLength: 1000, value: form.reason, onChange: e => setForm({ ...form, reason: e.target.value }) })] }), _jsxs("div", { className: "crm-modal-actions", children: [_jsx("button", { type: "button", onClick: () => setCreateOpen(false), children: "Cancel" }), _jsx("button", { disabled: busy, children: "Create lead" })] })] }) }), sourceManage && _jsxs("details", { className: "crm-sources", children: [_jsx("summary", { children: "Lead source settings" }), _jsx("p", { children: "Inactive sources remain visible on existing lead records and cannot be selected for new leads." }), _jsxs("form", { onSubmit: createSource, children: [_jsxs("label", { children: ["New source name", _jsx("input", { required: true, minLength: 2, maxLength: 120, value: sourceName, onChange: e => setSourceName(e.target.value) })] }), _jsxs("label", { children: ["Reason", _jsx("input", { required: true, minLength: 3, maxLength: 1000, value: sourceReason, onChange: e => setSourceReason(e.target.value) })] }), _jsx("button", { disabled: sourceBusy, children: "Add source" })] }), _jsx("ul", { children: sources.map(source => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: source.name }), _jsxs("span", { children: [source.active ? "Active" : "Inactive · historical leads keep this source", source.builtIn ? " · built-in" : ""] })] }), _jsxs("div", { className: "crm-source-action", children: [_jsxs("label", { htmlFor: `source-reason-${source.id}`, children: ["Reason to ", source.active ? "deactivate" : "activate", _jsx("input", { id: `source-reason-${source.id}`, minLength: 3, maxLength: 1000, value: sourceReasons[source.id] ?? "", onChange: e => setSourceReasons(v => ({ ...v, [source.id]: e.target.value })) })] }), _jsx("button", { disabled: sourceBusy || !source.updatedAt || (sourceReasons[source.id]?.trim().length ?? 0) < 3, onClick: () => setSourceActive(source, !source.active), children: source.active ? "Deactivate" : "Activate" })] })] }, source.id)) })] }), editLead && detail && _jsx("div", { className: "crm-modal-backdrop", children: _jsxs("form", { className: "crm-modal", onSubmit: saveLeadEdit, children: [_jsx("h3", { children: "Edit lead details" }), _jsxs("label", { children: ["Title", _jsx("input", { required: true, minLength: 2, maxLength: 160, value: editValues.title, onChange: e => setEditValues({ ...editValues, title: e.target.value }) })] }), _jsxs("label", { children: ["Contact name", _jsx("input", { required: true, minLength: 2, maxLength: 160, value: editValues.contactName, onChange: e => setEditValues({ ...editValues, contactName: e.target.value }) })] }), _jsxs("label", { children: ["Email", _jsx("input", { type: "email", maxLength: 320, value: editValues.email, onChange: e => setEditValues({ ...editValues, email: e.target.value }) })] }), _jsxs("label", { children: ["Phone", _jsx("input", { maxLength: 64, value: editValues.phone, onChange: e => setEditValues({ ...editValues, phone: e.target.value }) })] }), _jsxs("label", { children: ["Reason", _jsx("textarea", { required: true, minLength: 3, maxLength: 1000, value: editValues.reason, onChange: e => setEditValues({ ...editValues, reason: e.target.value }) })] }), _jsxs("div", { className: "crm-modal-actions", children: [_jsx("button", { type: "button", onClick: () => setEditLead(false), children: "Cancel" }), _jsx("button", { disabled: busy, children: "Save details" })] })] }) }), owner && branchId && _jsxs("details", { className: "crm-clients", children: [_jsx("summary", { children: "Shared clients \u00B7 Owner management" }), _jsx("p", { children: "Staff can select clients visible through authorized branch leads. Existing contact IDs remain attached on edits." }), _jsxs("label", { children: ["Existing visible client", _jsxs("select", { value: clientForm.id, onChange: e => { const c = clients.find(x => x.id === e.target.value); setClientForm(c ? { id: c.id, name: c.name, version: c.version, contacts: c.contacts.map(p => ({ id: p.id, name: p.name, email: p.email ?? "", phone: p.phone ?? "" })), reason: "" } : { id: "", name: "", version: 0, contacts: [], reason: "" }); }, children: [_jsx("option", { value: "", children: "Create a client" }), clients.map(c => _jsx("option", { value: c.id, children: c.name }, c.id))] })] }), _jsxs("form", { className: "crm-client-form", onSubmit: saveClient, children: [_jsxs("label", { children: ["Client name", _jsx("input", { required: true, minLength: 2, maxLength: 160, value: clientForm.name, onChange: e => setClientForm({ ...clientForm, name: e.target.value }) })] }), clientForm.contacts.map((c, i) => _jsxs("fieldset", { children: [_jsxs("legend", { children: ["Contact ", i + 1] }), _jsxs("label", { children: ["Name", _jsx("input", { value: c.name, maxLength: 160, onChange: e => setClientForm(f => ({ ...f, contacts: f.contacts.map((p, j) => j === i ? { ...p, name: e.target.value } : p) })) })] }), _jsxs("label", { children: ["Email", _jsx("input", { type: "email", maxLength: 320, value: c.email, onChange: e => setClientForm(f => ({ ...f, contacts: f.contacts.map((p, j) => j === i ? { ...p, email: e.target.value } : p) })) })] }), _jsxs("label", { children: ["Phone", _jsx("input", { maxLength: 64, value: c.phone, onChange: e => setClientForm(f => ({ ...f, contacts: f.contacts.map((p, j) => j === i ? { ...p, phone: e.target.value } : p) })) })] })] }, c.id ?? `new-${i}`)), _jsx("button", { type: "button", onClick: () => setClientForm(f => ({ ...f, contacts: [...f.contacts, { name: "", email: "", phone: "" }] })), children: "Add contact" }), _jsxs("label", { children: ["Reason", _jsx("input", { required: true, minLength: 3, maxLength: 1000, value: clientForm.reason, onChange: e => setClientForm({ ...clientForm, reason: e.target.value }) })] }), _jsx("button", { disabled: busy, children: clientForm.id ? "Save client" : "Create client" })] })] })] });
}
