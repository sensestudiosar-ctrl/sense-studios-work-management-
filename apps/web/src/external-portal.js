import { jsxs as _jsxs, Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import "./external-portal.css";
import { AuthFrame } from "./auth-flow.js";
const AUTH = "/api/v1/external-portal/auth";
const PORTAL = "/api/v1/external-portal";
const STAFF = "/api/v1/external-access";
class RequestFailure extends Error {
    status;
    constructor(status) {
        super("Request failed");
        this.status = status;
    }
}
async function request(url, init = {}) {
    const headers = { ...(init.headers ?? {}) };
    if (init.body !== undefined && !(init.body instanceof Blob))
        headers["Content-Type"] = "application/json";
    if (init.body instanceof Blob)
        headers["Content-Type"] = "application/octet-stream";
    if (init.csrf)
        headers["x-csrf-token"] = init.csrf;
    const response = await fetch(url, { method: init.method ?? "GET", credentials: "same-origin", cache: "no-store", headers, ...(init.body !== undefined ? { body: init.body instanceof Blob ? init.body : JSON.stringify(init.body) } : {}) });
    if (!response.ok)
        throw new RequestFailure(response.status);
    if (response.status === 204)
        return undefined;
    return await response.json();
}
const uuid = () => crypto.randomUUID();
const iso = (value) => value ? new Date(value).toLocaleString() : "No expiry";
const reasonLabel = "Reason";
function ProductionDetails({ requirements }) {
    if (!requirements)
        return null;
    return _jsxs(_Fragment, { children: [requirements.lines.map((line) => _jsxs("span", { children: [line.description, " \u00B7 ", line.quantity, " ", line.unit] }, line.key)), requirements.materials.map((material, index) => _jsxs("span", { children: ["Material: ", material.material] }, `${material.lineKey}:${index}`))] });
}
export function ExternalPortalWorkspace() {
    const audience = window.location.pathname.includes("/consultant/") ? "Consultant" : window.location.pathname.includes("/factory/") ? "Factory / production" : window.location.pathname.includes("/vendor/") ? "Vendor" : "";
    const [session, setSession] = useState();
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [requested, setRequested] = useState(false);
    const [devices, setDevices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState("");
    const [workspace, setWorkspace] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [kind, setKind] = useState("REQUEST");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [resourceId, setResourceId] = useState("");
    const [reason, setReason] = useState("");
    const [ackNotes, setAckNotes] = useState({});
    const [cad, setCad] = useState({});
    const submissionAttempt = useRef(null);
    const [uploadReason, setUploadReason] = useState("");
    const [uploadGrantId, setUploadGrantId] = useState("");
    const pendingUpload = useRef(null);
    const [pendingUploadLabel, setPendingUploadLabel] = useState("");
    const loadWorkspace = useCallback(async (id) => { if (!id) {
        setWorkspace(null);
        return;
    } setLoading(true); setError(""); try {
        setWorkspace(await request(`${PORTAL}/projects/${encodeURIComponent(id)}`));
    }
    catch (e) {
        setWorkspace(null);
        if (e instanceof RequestFailure && e.status === 401) {
            setSession(null);
            setProjects([]);
            setDevices([]);
            setProjectId("");
            setError("Your session expired or external access was revoked. Sign in again.");
        }
        else
            setError("Project information could not be loaded. Refresh to try again.");
    }
    finally {
        setLoading(false);
    } }, []);
    const restore = useCallback(async () => { try {
        const value = await request(`${AUTH}/session`);
        if (value.account.kind !== "EXTERNAL")
            throw new RequestFailure(403);
        setSession(value);
        const [p, d] = await Promise.all([request(`${PORTAL}/projects`), request(`${AUTH}/sessions`)]);
        setProjects(p.projects);
        setDevices(d);
        const selected = p.projects[0]?.id ?? "";
        setProjectId((prior) => p.projects.some((item) => item.id === prior) ? prior : selected);
        if (selected)
            await loadWorkspace(selected);
        else {
            setWorkspace(null);
            setLoading(false);
        }
    }
    catch (e) {
        setSession(null);
        setLoading(false);
        if (!(e instanceof RequestFailure && e.status === 401))
            setError("The external portal session could not be checked. Try again.");
    } }, [loadWorkspace]);
    useEffect(() => { void restore(); }, [restore]);
    useEffect(() => { if (projectId && session)
        void loadWorkspace(projectId); }, [projectId, session, loadWorkspace]);
    useEffect(() => { const active = workspace?.grants.filter((g) => !g.revokedAt && (!g.expiresAt || new Date(g.expiresAt).getTime() > Date.now())) ?? []; setUploadGrantId((current) => active.some((g) => g.id === current) ? current : active[0]?.id ?? ""); }, [workspace]);
    const signIn = async (verify) => { setBusy(true); setError(""); setNotice(""); try {
        if (!verify) {
            await request(`${AUTH}/code`, { method: "POST", body: { email: email.trim() } });
            setRequested(true);
            setNotice("If this address has access, a sign-in code has been sent.");
        }
        else {
            await request(`${AUTH}/verify`, { method: "POST", body: { email: email.trim(), code } });
            setCode("");
            await restore();
            setNotice("You are signed in to the external portal.");
        }
    }
    catch {
        setError("Sign-in could not be completed. Check the details and try again.");
    }
    finally {
        setBusy(false);
    } };
    const signOut = async () => { if (!session)
        return; setBusy(true); try {
        await request(`${AUTH}/logout`, { method: "POST", csrf: session.csrfToken });
        setSession(null);
        setProjects([]);
        setWorkspace(null);
        setDevices([]);
        setNotice("You have signed out.");
    }
    catch {
        setError("Sign out could not be completed. Try again.");
    }
    finally {
        setBusy(false);
    } };
    const run = async (path, payload, success, idem = false) => { if (!session)
        return; setBusy(true); setError(""); setNotice(""); try {
        const fingerprint = `${path}:${JSON.stringify(payload)}`;
        if (idem && submissionAttempt.current?.fingerprint !== fingerprint)
            submissionAttempt.current = { fingerprint, key: uuid() };
        const key = idem ? submissionAttempt.current?.key : undefined;
        await request(path, { method: "POST", body: payload, csrf: session.csrfToken, ...(key ? { headers: { "x-idempotency-key": key } } : {}) });
        if (idem)
            submissionAttempt.current = null;
        setNotice(success);
        setTitle("");
        setBody("");
        setReason("");
        await loadWorkspace(projectId);
    }
    catch (e) {
        setError(e instanceof RequestFailure && e.status === 409 ? "The access or project information changed. Refresh and retry." : "The action could not be completed. Check access and try again.");
        if (e instanceof RequestFailure && e.status === 401) {
            setWorkspace(null);
            setSession(null);
            setProjects([]);
            setDevices([]);
        }
        else if (e instanceof RequestFailure && [403, 404].includes(e.status))
            setWorkspace(null);
    }
    finally {
        setBusy(false);
    } };
    const submit = (event) => { event.preventDefault(); const persona = kind === "PRODUCTION_STATUS" ? "VENDOR_FACTORY" : undefined; const grant = workspace?.grants.find((g) => { const expiryOkay = !g.expiresAt || new Date(g.expiresAt).getTime() > Date.now(); if (g.revokedAt || !expiryOkay || (persona && g.portalType !== persona))
        return false; if (kind === "REQUEST")
        return true; if (kind === "REVIEW" || kind === "COMMENT")
        return g.portalType === "CONSULTANT" && g.revisionIds.includes(resourceId); if (workspace?.packages.some((p) => p.id === resourceId))
        return g.portalType === "VENDOR_FACTORY" && g.packageIds.includes(resourceId); return g.portalType === "VENDOR_FACTORY" && g.releaseIds.includes(resourceId); }); if (!grant) {
        setError("No current grant covers this exact submission context.");
        return;
    } const resource = resourceId; void run(`${PORTAL}/projects/${encodeURIComponent(projectId)}/submissions`, { grantId: grant.id, kind, title: title.trim(), body: body.trim(), ...(kind === "REVIEW" || kind === "COMMENT" ? { revisionId: resource } : kind === "PRODUCTION_STATUS" ? (workspace?.packages.some((p) => p.id === resource) ? { packageId: resource } : { releaseId: resource }) : {}), reason: reason.trim() }, "Your submission was recorded for staff review. It does not approve work or update formal production progress.", true); };
    const uploadFile = async (file) => {
        if (!file || !session || !workspace)
            return;
        const grant = workspace.grants.find((g) => g.id === uploadGrantId && !g.revokedAt && (!g.expiresAt || new Date(g.expiresAt).getTime() > Date.now()));
        if (!grant || uploadReason.trim().length < 1) {
            setError("A current grant and reason are required to upload.");
            return;
        }
        const fingerprint = JSON.stringify([file.name, file.size, file.lastModified, file.type]);
        let pending = pendingUpload.current;
        if (!pending || pending.accountId !== session.account.id || pending.projectId !== projectId || pending.grantId !== grant.id || pending.fingerprint !== fingerprint) {
            pending = { file, accountId: session.account.id, projectId, grantId: grant.id, fingerprint, uploadId: null, chunkSize: 0, nextIndex: 0 };
            pendingUpload.current = pending;
            setPendingUploadLabel(file.name);
        }
        const sourceFile = pending.file;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            if (!pending.uploadId) {
                const started = await request(`${PORTAL}/projects/${encodeURIComponent(projectId)}/uploads`, { method: "POST", csrf: session.csrfToken, body: { grantId: grant.id, fileName: sourceFile.name, mimeType: sourceFile.type || "application/octet-stream", sizeBytes: sourceFile.size, reason: uploadReason.trim() } });
                const chunkSize = Math.min(started.chunkSize, 8 * 1024 * 1024);
                if (chunkSize <= 0)
                    throw new Error("Invalid upload chunk size");
                pending.uploadId = started.uploadId;
                pending.chunkSize = chunkSize;
            }
            const uploadId = pending.uploadId;
            if (!uploadId)
                throw new Error("Upload was not initialized");
            const chunkCount = Math.ceil(sourceFile.size / pending.chunkSize);
            while (pending.nextIndex < chunkCount) {
                const index = pending.nextIndex;
                const chunk = sourceFile.slice(index * pending.chunkSize, Math.min((index + 1) * pending.chunkSize, sourceFile.size));
                const digest = await crypto.subtle.digest("SHA-256", await chunk.arrayBuffer());
                const hash = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
                await request(`${PORTAL}/uploads/${encodeURIComponent(uploadId)}/chunks/${index}`, { method: "PUT", csrf: session.csrfToken, body: chunk, headers: { "x-chunk-sha256": hash } });
                pending.nextIndex = index + 1;
            }
            await request(`${PORTAL}/uploads/${encodeURIComponent(uploadId)}/finalize`, { method: "POST", csrf: session.csrfToken });
            pendingUpload.current = null;
            setPendingUploadLabel("");
            setUploadReason("");
            setNotice("Upload saved as advisory evidence for staff review.");
            await loadWorkspace(projectId);
        }
        catch {
            setError("The upload could not be completed. Your file is retained in this tab; choose it again or retry the pending upload.");
        }
        finally {
            setBusy(false);
        }
    };
    const retryPendingUpload = () => { const pending = pendingUpload.current; if (!pending || !session || pending.accountId !== session.account.id || pending.projectId !== projectId || pending.grantId !== uploadGrantId) {
        pendingUpload.current = null;
        setPendingUploadLabel("");
        setError("Select the same file, project, and current grant to retry this upload.");
        return;
    } void uploadFile(pending.file); };
    useEffect(() => {
        const pending = pendingUpload.current;
        if (pending && (!session || pending.accountId !== session.account.id || pending.projectId !== projectId || pending.grantId !== uploadGrantId)) {
            pendingUpload.current = null;
            setPendingUploadLabel("");
        }
    }, [session?.account.id, projectId, uploadGrantId]);
    const acknowledge = (t) => { const grant = workspace?.grants.find((g) => !g.revokedAt); if (!grant || !session)
        return; void run(`${PORTAL}/transmittals/${encodeURIComponent(t.id)}/acknowledge`, { note: ackNotes[t.id] ?? "", reason: reason.trim() }, "Acknowledgement recorded for your recipient account."); };
    const showCad = async (shareId) => { setError(""); try {
        const data = await request(`${PORTAL}/cad-shares/${encodeURIComponent(shareId)}`);
        setCad((prior) => ({ ...prior, [shareId]: data }));
    }
    catch {
        setError("This native CAD link is no longer available to your account.");
    } };
    if (session === undefined)
        return _jsx("main", { className: "external-portal", children: _jsx("p", { role: "status", children: "Checking external portal session\u2026" }) });
    if (!session)
        return _jsxs(AuthFrame, { audience: audience ? audience.toUpperCase() + " PORTAL" : "EXTERNAL PROJECT ACCESS", title: requested ? "Check your email" : audience ? audience + " sign in" : "Sign in to your project portal", intro: requested ? "If this address has access, a code has been sent. It expires in 10 minutes." : "Use the invited email address connected to your project access.", children: [!requested ? _jsxs("form", { onSubmit: event => { event.preventDefault(); void signIn(false); }, children: [_jsxs("div", { className: "auth-flow-field", children: [_jsx("label", { htmlFor: "external-login-email", children: "Email address" }), _jsx("input", { id: "external-login-email", type: "email", autoComplete: "email", maxLength: 320, required: true, value: email, onChange: event => setEmail(event.target.value), disabled: busy })] }), _jsx("button", { disabled: busy || !email.trim(), children: busy ? "Sending…" : "Send sign-in code" })] }) : _jsxs("form", { onSubmit: event => { event.preventDefault(); void signIn(true); }, children: [_jsxs("p", { className: "auth-flow-hint", children: ["Email entered: ", _jsx("strong", { children: email })] }), _jsxs("div", { className: "auth-flow-field", children: [_jsx("label", { htmlFor: "external-login-code", children: "One-time code" }), _jsx("input", { id: "external-login-code", name: "code", inputMode: "numeric", autoComplete: "one-time-code", pattern: "[0-9]{6}", maxLength: 6, required: true, value: code, onChange: event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6)), disabled: busy })] }), _jsx("button", { disabled: busy || code.length !== 6, children: busy ? "Checking…" : "Continue" }), _jsx("p", { className: "auth-flow-hint", children: "Can\u2019t find the email? Check spam. You can request a new code after 60 seconds." }), _jsx("button", { className: "auth-secondary", type: "button", disabled: busy, onClick: () => { setRequested(false); setCode(""); setError(""); }, children: "Change email or request another code" })] }), notice && _jsx("p", { className: "auth-flow-success", role: "status", children: notice }), error && _jsx("p", { className: "auth-flow-alert", role: "alert", children: error }), _jsxs("div", { className: "auth-flow-links", children: [_jsx("a", { href: "/sign-in", children: "Other sign-in options" }), audience === "Vendor" && _jsx("a", { href: "/external-portal/factory/login", children: "Factory / production sign in" })] })] });
    return _jsx("main", { className: "external-portal", children: _jsxs("div", { className: "external-shell", children: [_jsxs("header", { className: "external-header", children: [_jsxs("div", { children: [_jsx("p", { className: "external-kicker", children: "Sense Studios \u00B7 External workspace" }), _jsx("h1", { children: "Project portal" }), _jsx("p", { children: session.account.email })] }), _jsx("button", { className: "secondary", onClick: () => void signOut(), disabled: busy, children: "Sign out" })] }), notice && _jsx("p", { className: "external-notice", role: "status", children: notice }), error && _jsx("p", { className: "external-error", role: "alert", children: error }), _jsxs("section", { className: "external-card", children: [_jsxs("div", { className: "external-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Your projects" }), _jsx("p", { children: "Access reflects current project grants." })] }), _jsx("button", { className: "secondary", onClick: () => void restore(), children: "Refresh" })] }), projects.length === 0 ? _jsx("p", { className: "external-empty", children: "No projects are available to this account." }) : _jsxs("label", { children: ["Project", _jsx("select", { value: projectId, onChange: (e) => setProjectId(e.target.value), children: projects.map((p) => _jsxs("option", { value: p.id, children: [p.title, " \u00B7 ", p.portalType === "CONSULTANT" ? "Consultant" : "Vendor / factory"] }, p.id)) })] }), loading && _jsx("p", { role: "status", children: "Loading scoped project information\u2026" }), workspace && _jsxs(_Fragment, { children: [_jsx("p", { className: "external-project-state", children: workspace.project.status }), _jsxs("div", { className: "external-grid", children: [_jsxs("section", { children: [_jsx("h3", { children: "Granted revisions" }), workspace.revisions.length ? _jsx("ul", { children: workspace.revisions.map((r) => _jsxs("li", { children: [_jsx("strong", { children: r.title }), _jsxs("span", { children: [r.documentNumber, " \u00B7 ", r.series, " ", r.number, " \u00B7 ", r.state ?? "Available"] }), r.cad ? _jsx("span", { children: "CAD is shared through a native link and is not available as a portal download." }) : _jsxs("a", { href: `${PORTAL}/revisions/${encodeURIComponent(r.id)}/file`, children: ["Open permitted file: ", r.fileName] })] }, r.id)) }) : _jsx("p", { className: "external-empty", children: "No revisions are currently granted." })] }), _jsxs("section", { children: [_jsx("h3", { children: "Production requirements" }), workspace.production.length || workspace.packages.length ? _jsxs("ul", { children: [workspace.production.map((x) => _jsxs("li", { children: [_jsx("strong", { children: x.label ?? x.title }), _jsx(ProductionDetails, { requirements: x.requirements }), _jsxs("span", { children: ["Deadline: ", iso(x.deadline)] }), _jsxs("span", { children: ["Status: ", x.status] })] }, x.id)), workspace.packages.map((x) => _jsxs("li", { children: [_jsx("strong", { children: x.title }), _jsxs("span", { children: [x.date ? `Date ${x.date} · ` : "", x.state] })] }, x.id))] }) : _jsx("p", { className: "external-empty", children: "No production details are currently granted." })] })] }), _jsxs("section", { children: [_jsx("h3", { children: "Requests from staff" }), workspace.requests.length ? _jsx("ul", { children: workspace.requests.map((x) => _jsxs("li", { children: [_jsx("strong", { children: x.title }), _jsx("span", { children: x.body }), _jsxs("span", { children: [iso(x.createdAt), x.dueDate ? ` · Due ${iso(x.dueDate)}` : ""] })] }, x.id)) }) : _jsx("p", { className: "external-empty", children: "No requests are waiting." })] }), _jsxs("section", { children: [_jsx("h3", { children: "Advisory submissions" }), workspace.submissions.length ? _jsx("ul", { children: workspace.submissions.map((x) => _jsxs("li", { children: [_jsxs("strong", { children: [x.kind, ": ", x.title] }), _jsx("span", { children: x.body }), _jsxs("span", { children: [iso(x.createdAt), " \u00B7 Advisory, not a formal approval or production update"] })] }, x.id)) }) : _jsx("p", { className: "external-empty", children: "No submissions yet." })] }), workspace.capabilities.submit && _jsxs("form", { onSubmit: submit, children: [_jsx("h3", { children: "Send a submission" }), _jsxs("label", { children: ["Type", _jsxs("select", { value: kind, onChange: (e) => { setKind(e.target.value); setResourceId(""); }, children: [_jsx("option", { value: "REQUEST", children: "Request" }), workspace.grants.some((g) => g.portalType === "CONSULTANT") && _jsxs(_Fragment, { children: [_jsx("option", { value: "REVIEW", children: "Consultant review" }), _jsx("option", { value: "COMMENT", children: "Comment" })] }), workspace.grants.some((g) => g.portalType === "VENDOR_FACTORY") && _jsx("option", { value: "PRODUCTION_STATUS", children: "Production status update" })] })] }), kind !== "REQUEST" && _jsxs("label", { children: ["Exact context", _jsxs("select", { required: true, value: resourceId, onChange: (e) => setResourceId(e.target.value), children: [_jsx("option", { value: "", children: "Choose permitted item" }), (kind === "REVIEW" || kind === "COMMENT" ? workspace.revisions.map((x) => ({ id: x.id, label: `${x.documentNumber} · ${x.title}` })) : [...workspace.production, ...workspace.packages].map((x) => ({ id: x.id, label: x.label ?? x.title ?? "Production item" }))).map((x) => _jsx("option", { value: x.id, children: x.label }, x.id))] })] }), _jsxs("label", { children: ["Title", _jsx("input", { required: true, maxLength: 160, value: title, onChange: (e) => setTitle(e.target.value) })] }), _jsxs("label", { children: ["Details", _jsx("textarea", { required: true, maxLength: 2000, value: body, onChange: (e) => setBody(e.target.value) })] }), _jsx(Reason, { value: reason, onChange: setReason }), _jsx("p", { className: "external-muted", children: "Staff retain responsibility for formal approvals and production validation." }), _jsx("button", { disabled: busy || !title.trim() || !body.trim() || !reason.trim() || (kind !== "REQUEST" && !resourceId), children: "Submit" })] }), workspace.capabilities.upload && _jsxs("section", { children: [_jsx("h3", { children: "Upload advisory evidence" }), _jsxs("label", { children: ["Recipient grant", _jsxs("select", { required: true, value: uploadGrantId, onChange: (e) => setUploadGrantId(e.target.value), children: [_jsx("option", { value: "", children: "Choose current access" }), workspace.grants.filter((g) => !g.revokedAt && (!g.expiresAt || new Date(g.expiresAt).getTime() > Date.now())).map((g) => _jsxs("option", { value: g.id, children: [g.portalType === "CONSULTANT" ? "Consultant" : "Vendor / factory", " \u00B7 ", g.id] }, g.id))] })] }), _jsxs("label", { children: ["Reason", _jsx("input", { value: uploadReason, maxLength: 1000, onChange: (e) => setUploadReason(e.target.value) })] }), _jsxs("label", { children: ["File", _jsx("input", { type: "file", onChange: (e) => { const input = e.currentTarget; void uploadFile(input.files?.[0]).finally(() => { input.value = ""; }); }, disabled: busy || !uploadReason.trim() || !uploadGrantId })] }), pendingUploadLabel && _jsxs("div", { className: "external-muted", role: "status", children: [_jsxs("span", { children: ["Pending upload: ", pendingUploadLabel, " \u00B7 retry keeps the original file bytes and upload identity."] }), _jsx("button", { className: "secondary", type: "button", disabled: busy || !uploadReason.trim(), onClick: retryPendingUpload, children: "Retry upload" })] }), _jsx("p", { className: "external-muted", children: "Files are retained for staff review. Uploads do not become approved revisions." })] }), _jsxs("section", { children: [_jsx("h3", { children: "Your uploads" }), workspace.uploads.length ? _jsx("ul", { children: workspace.uploads.map((x) => _jsxs("li", { children: [_jsx("strong", { children: x.fileName }), _jsxs("span", { children: [x.mimeType, " \u00B7 ", x.sizeBytes.toLocaleString(), " bytes \u00B7 ", iso(x.createdAt)] })] }, x.id)) }) : _jsx("p", { className: "external-empty", children: "No uploads yet." })] }), _jsxs("section", { children: [_jsx("h3", { children: "Formal transmittals" }), workspace.transmittals.length ? _jsx("ul", { children: workspace.transmittals.map((t) => _jsxs("li", { children: [_jsx("strong", { children: t.purpose }), _jsxs("span", { children: [t.revisionIds.length, " exact revision(s) \u00B7 Issued ", iso(t.issuedAt)] }), t.acknowledgedAt ? _jsxs("span", { children: ["Acknowledged ", iso(t.acknowledgedAt)] }) : t.acknowledgementRequired && workspace.capabilities.acknowledge && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Acknowledgement note", _jsx("textarea", { required: true, maxLength: 2000, value: ackNotes[t.id] ?? "", onChange: (e) => setAckNotes((v) => ({ ...v, [t.id]: e.target.value })) })] }), _jsx(Reason, { value: reason, onChange: setReason }), _jsx("button", { disabled: busy || !reason.trim() || !ackNotes[t.id]?.trim(), onClick: () => acknowledge(t), children: "Acknowledge receipt" })] })] }, t.id)) }) : _jsx("p", { className: "external-empty", children: "No formal transmittals are available." })] }), _jsxs("section", { children: [_jsx("h3", { children: "Native CAD shares" }), workspace.cadShares.length ? _jsx("ul", { children: workspace.cadShares.map((share) => { const details = cad[share.id]; return _jsxs("li", { children: [_jsxs("strong", { children: ["Native share \u00B7 expires ", iso(share.expiresAt)] }), _jsx("span", { children: "Share only with your authorized recipient account. Do not forward the link or extraction code." }), details ? _jsxs(_Fragment, { children: [_jsx("a", { href: details.url, target: "_blank", rel: "noreferrer", children: "Open native CAD share" }), _jsxs("span", { children: ["Extraction code: ", details.extractionCode] }), _jsx("span", { children: details.warning })] }) : _jsx("button", { className: "secondary", onClick: () => void showCad(share.id), children: "Reveal native link details" })] }, share.id); }) }) : _jsx("p", { className: "external-empty", children: "No native CAD shares are available." })] }), _jsxs("section", { children: [_jsx("h3", { children: "Portal sessions" }), devices.length ? _jsx("ul", { children: devices.map((d) => _jsxs("li", { children: [_jsx("strong", { children: d.current ? "This device" : d.userAgent || "Portal session" }), _jsxs("span", { children: ["Last active ", iso(d.lastUsedAt), " \u00B7 Expires ", iso(d.expiresAt)] }), d.revokedAt ? _jsxs("span", { children: ["Revoked ", iso(d.revokedAt)] }) : _jsx("button", { className: "secondary", onClick: () => { if (session)
                                                            void request(`${AUTH}/sessions/${encodeURIComponent(d.id)}`, { method: "DELETE", csrf: session.csrfToken }).then(() => request(`${AUTH}/sessions`, {})).then(setDevices).catch(() => setError("Session revocation failed. Refresh and retry.")); }, children: "Revoke session" })] }, d.id)) }) : _jsx("p", { className: "external-empty", children: "No sessions are available." })] })] })] })] }) });
}
function Reason({ value, onChange }) { return _jsxs("label", { children: [reasonLabel, _jsx("textarea", { required: true, minLength: 1, maxLength: 1000, value: value, onChange: (e) => onChange(e.target.value) })] }); }
function GrantScopeEditor({ grant, revisionOptions, releaseOptions, packageOptions, busy, onSave }) {
    const [open, setOpen] = useState(false);
    const [revisions, setRevisions] = useState(grant.revisionIds);
    const [releases, setReleases] = useState(grant.releaseIds);
    const [packages, setPackages] = useState(grant.packageIds);
    const [expiry, setExpiry] = useState(grant.expiresAt ? new Date(grant.expiresAt).toISOString().slice(0, 16) : "");
    const [reason, setReason] = useState("");
    const flip = (values, id, set) => set(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
    return _jsxs("section", { className: "external-scope-editor", children: [_jsx("button", { className: "secondary", type: "button", "aria-expanded": open, onClick: () => setOpen((value) => !value), children: open ? "Close scope editor" : "Edit exact scope and expiry" }), open && _jsxs("form", { onSubmit: (e) => { e.preventDefault(); if (!reason.trim() || (!revisions.length && !releases.length && !packages.length) || (grant.closeoutTaskId && !expiry))
                    return; onSave({ revisionIds: revisions, releaseIds: releases, packageIds: packages, ...(expiry ? { expiresAt: new Date(expiry).toISOString() } : {}), reason: reason.trim() }); }, children: [_jsxs("fieldset", { children: [_jsx("legend", { children: "Exact revision scope" }), revisionOptions.map((x) => _jsxs("label", { className: "external-check", children: [_jsx("input", { type: "checkbox", checked: revisions.includes(x.id), onChange: () => flip(revisions, x.id, setRevisions) }), x.documentNumber, " \u00B7 ", x.title] }, x.id))] }), !grant.closeoutTaskId && _jsxs("fieldset", { children: [_jsx("legend", { children: "Exact release scope" }), releaseOptions.map((x) => _jsxs("label", { className: "external-check", children: [_jsx("input", { type: "checkbox", checked: releases.includes(x.id), onChange: () => flip(releases, x.id, setReleases) }), x.label ?? x.title] }, x.id))] }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Exact package scope" }), packageOptions.map((x) => _jsxs("label", { className: "external-check", children: [_jsx("input", { type: "checkbox", checked: packages.includes(x.id), onChange: () => flip(packages, x.id, setPackages) }), x.title] }, x.id))] }), _jsxs("label", { children: ["Expiry", grant.closeoutTaskId ? " (required for closeout)" : " (optional)", _jsx("input", { type: "datetime-local", required: Boolean(grant.closeoutTaskId), value: expiry, onChange: (e) => setExpiry(e.target.value) })] }), grant.expiresAt && !expiry && _jsx("p", { className: "external-muted", children: "Leaving the expiry blank preserves the current expiry. Enter a new date to change it." }), _jsx(Reason, { value: reason, onChange: setReason }), _jsx("button", { disabled: busy || !reason.trim() || (!revisions.length && !releases.length && !packages.length) || (Boolean(grant.closeoutTaskId) && !expiry), children: "Save scope change" })] })] });
}
export function StaffExternalAccessWorkspace({ csrfToken, owner }) {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("projectId") ?? "";
    const [projectId, setProjectId] = useState(initial);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [reason, setReason] = useState("");
    const [email, setEmail] = useState("");
    const [portalType, setPortalType] = useState("CONSULTANT");
    const [revisionIds, setRevisionIds] = useState([]);
    const [releaseIds, setReleaseIds] = useState([]);
    const [packageIds, setPackageIds] = useState([]);
    const [expiresAt, setExpiresAt] = useState("");
    const [closeoutTaskId, setCloseoutTaskId] = useState("");
    const [requestTitle, setRequestTitle] = useState("");
    const [requestBody, setRequestBody] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [cadGrantId, setCadGrantId] = useState("");
    const [cadRevisionId, setCadRevisionId] = useState("");
    const [nativeLinkId, setNativeLinkId] = useState("");
    const [nativeUrl, setNativeUrl] = useState("");
    const [extractionCode, setExtractionCode] = useState("");
    const [cadDetails, setCadDetails] = useState({});
    const load = useCallback(async () => { if (!projectId)
        return; setLoading(true); setError(""); try {
        setData(await request(`${STAFF}/projects/${encodeURIComponent(projectId)}`));
    }
    catch {
        setData(null);
        setError("External access workspace could not be loaded. Check the project ID and your access.");
    }
    finally {
        setLoading(false);
    } }, [projectId]);
    useEffect(() => { if (initial)
        void load(); }, [initial, load]);
    const mutate = async (path, body, success) => { setBusy(true); setError(""); setNotice(""); try {
        await request(path, { method: "POST", body, csrf: csrfToken });
        setNotice(success);
        setReason("");
        await load();
    }
    catch (e) {
        setError(e instanceof RequestFailure && e.status === 409 ? "The project or grant changed. Reload and retry." : "This access action could not be completed. Verify authority and scope.");
    }
    finally {
        setBusy(false);
    } };
    const revealOwnerCadDetails = async (shareId) => { setError(""); try {
        const result = await request(`${STAFF}/cad-shares/${encodeURIComponent(shareId)}`);
        setCadDetails((current) => ({ ...current, [shareId]: result }));
    }
    catch {
        setError("Native link details are unavailable. Confirm access and try again.");
    } };
    const toggle = (list, id, setter) => setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
    const createGrant = (e) => { e.preventDefault(); if (!projectId || !reason.trim())
        return; void mutate(`${STAFF}/projects/${encodeURIComponent(projectId)}/grants`, { email: email.trim(), portalType, revisionIds, releaseIds, packageIds, ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}), ...(closeoutTaskId ? { closeoutTaskId } : {}), reason: reason.trim() }, "Grant created with the exact selected scope."); };
    const changeGrant = (g, revoke) => { const nextReason = window.prompt("Reason for this grant change"); if (!nextReason?.trim())
        return; void mutate(`${STAFF}/grants/${encodeURIComponent(g.id)}/change`, { expectedVersion: g.version, reason: nextReason.trim(), ...(revoke ? { revoke: true } : { revisionIds: g.revisionIds, releaseIds: g.releaseIds, packageIds: g.packageIds, ...(g.expiresAt ? { expiresAt: g.expiresAt } : {}) }) }, revoke ? "Grant revoked. Any native CAD links requiring Owner cancellation remain listed." : "Grant scope updated."); };
    return _jsx("main", { className: "external-portal", children: _jsxs("div", { className: "external-shell", children: [_jsx("header", { className: "external-header", children: _jsxs("div", { children: [_jsx("p", { className: "external-kicker", children: "S21 \u00B7 Staff management" }), _jsx("h1", { children: "External project access" }), _jsx("p", { children: "Manage exact consultant and vendor/factory access." })] }) }), notice && _jsx("p", { className: "external-notice", role: "status", children: notice }), error && _jsx("p", { className: "external-error", role: "alert", children: error }), _jsxs("section", { className: "external-card", children: [_jsxs("form", { onSubmit: (e) => { e.preventDefault(); void load(); }, children: [_jsxs("label", { children: ["Project ID", _jsx("input", { required: true, value: projectId, onChange: (e) => setProjectId(e.target.value) })] }), _jsx("button", { disabled: !projectId || loading, children: loading ? "Loading…" : "Open project access" })] }), data && _jsxs(_Fragment, { children: [_jsx("h2", { children: data.project.title }), _jsxs("p", { children: ["Project status: ", data.project.status] }), _jsxs("section", { children: [_jsx("h3", { children: "Current grants" }), data.grants.length ? _jsx("ul", { children: data.grants.map((g) => _jsxs("li", { children: [_jsxs("strong", { children: [g.email ?? g.accountId, " \u00B7 ", g.portalType === "CONSULTANT" ? "Consultant" : "Vendor / factory"] }), _jsxs("span", { children: ["Revision IDs: ", g.revisionIds.join(", ") || "None"] }), _jsxs("span", { children: ["Release IDs: ", g.releaseIds.join(", ") || "None"] }), _jsxs("span", { children: ["Package IDs: ", g.packageIds.join(", ") || "None"] }), _jsxs("span", { children: ["Expires: ", iso(g.expiresAt), " \u00B7 Version ", g.version, g.closeoutTaskId ? ` · Closeout task ${g.closeoutTaskId}` : "", g.revokedAt ? ` · Revoked ${iso(g.revokedAt)}` : ""] }), data.capabilities.manage && !g.revokedAt && _jsxs(_Fragment, { children: [_jsx(GrantScopeEditor, { grant: g, revisionOptions: data.revisionOptions, releaseOptions: data.releaseOptions, packageOptions: data.packageOptions, busy: busy, onSave: (change) => void mutate(`${STAFF}/grants/${encodeURIComponent(g.id)}/change`, { expectedVersion: g.version, ...change }, "Grant scope updated.") }), _jsx("button", { className: "secondary", disabled: busy, onClick: () => changeGrant(g, true), children: "Revoke access" })] })] }, g.id)) }) : _jsx("p", { className: "external-empty", children: "No grants are configured." })] }), data.capabilities.manage && _jsxs("form", { onSubmit: createGrant, children: [_jsx("h3", { children: "Create exact access grant" }), _jsxs("label", { children: ["External email", _jsx("input", { type: "email", maxLength: 320, required: true, value: email, onChange: (e) => setEmail(e.target.value) })] }), _jsxs("label", { children: ["Portal type", _jsxs("select", { value: portalType, onChange: (e) => setPortalType(e.target.value), children: [_jsx("option", { value: "CONSULTANT", children: "Consultant" }), _jsx("option", { value: "VENDOR_FACTORY", children: "Vendor / factory" })] })] }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Exact revision scope" }), data.revisionOptions.map((x) => _jsxs("label", { className: "external-check", children: [_jsx("input", { type: "checkbox", checked: revisionIds.includes(x.id), onChange: () => toggle(revisionIds, x.id, setRevisionIds) }), x.documentNumber, " \u00B7 ", x.title, " \u00B7 ", x.fileName] }, x.id))] }), !closeoutTaskId && _jsxs("fieldset", { children: [_jsx("legend", { children: "Exact release scope" }), data.releaseOptions.map((x) => _jsxs("label", { className: "external-check", children: [_jsx("input", { type: "checkbox", checked: releaseIds.includes(x.id), onChange: () => toggle(releaseIds, x.id, setReleaseIds) }), x.label ?? x.title] }, x.id))] }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Exact package scope" }), data.packageOptions.map((x) => _jsxs("label", { className: "external-check", children: [_jsx("input", { type: "checkbox", checked: packageIds.includes(x.id), onChange: () => toggle(packageIds, x.id, setPackageIds) }), x.title] }, x.id))] }), _jsxs("label", { children: ["Expiry (required for closeout grants)", _jsx("input", { type: "datetime-local", value: expiresAt, onChange: (e) => setExpiresAt(e.target.value), required: Boolean(closeoutTaskId) })] }), data.closeoutTaskOptions.length > 0 && _jsxs("label", { children: ["Approved closeout task (optional)", _jsxs("select", { value: closeoutTaskId, onChange: (e) => { const value = e.target.value; setCloseoutTaskId(value); if (value)
                                                        setReleaseIds([]); }, children: [_jsx("option", { value: "", children: "Ordinary delivery grant" }), data.closeoutTaskOptions.map((x) => _jsxs("option", { value: x.id, children: [x.title, " \u00B7 ", x.status] }, x.id))] })] }), _jsx(Reason, { value: reason, onChange: setReason }), _jsx("p", { className: "external-muted", children: "A title alone does not grant authority. Only the selected items and named closeout task are in scope." }), _jsx("button", { disabled: busy || !email.trim() || !reason.trim() || (Boolean(closeoutTaskId) && !expiresAt) || (!revisionIds.length && !releaseIds.length && !packageIds.length), children: "Create grant" })] }), data.capabilities.manage && _jsxs("form", { onSubmit: (e) => { e.preventDefault(); const g = data.grants.find((x) => x.id === cadGrantId); if (!g || !requestTitle.trim() || !requestBody.trim() || !reason.trim())
                                        return; void mutate(`${STAFF}/projects/${encodeURIComponent(projectId)}/requests`, { grantId: g.id, title: requestTitle.trim(), body: requestBody.trim(), ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}), expectedGrantVersion: g.version, reason: reason.trim() }, "Request sent to the named external recipient."); }, children: [_jsx("h3", { children: "Send scoped request" }), _jsxs("label", { children: ["Recipient grant", _jsxs("select", { required: true, value: cadGrantId, onChange: (e) => setCadGrantId(e.target.value), children: [_jsx("option", { value: "", children: "Choose a grant" }), data.grants.filter((g) => !g.revokedAt).map((g) => _jsxs("option", { value: g.id, children: [g.email ?? g.accountId, " \u00B7 v", g.version] }, g.id))] })] }), _jsxs("label", { children: ["Title", _jsx("input", { required: true, maxLength: 160, value: requestTitle, onChange: (e) => setRequestTitle(e.target.value) })] }), _jsxs("label", { children: ["Request", _jsx("textarea", { required: true, maxLength: 2000, value: requestBody, onChange: (e) => setRequestBody(e.target.value) })] }), _jsxs("label", { children: ["Due date (optional)", _jsx("input", { type: "date", value: dueDate, onChange: (e) => setDueDate(e.target.value) })] }), _jsx(Reason, { value: reason, onChange: setReason }), _jsx("button", { disabled: busy || !cadGrantId || !requestTitle.trim() || !requestBody.trim() || !reason.trim(), children: "Send request" })] }), owner && data.capabilities.issueCad && _jsxs("form", { onSubmit: (e) => { e.preventDefault(); const g = data.grants.find((x) => x.id === cadGrantId); if (!g || !reason.trim())
                                        return; void mutate(`${STAFF}/projects/${encodeURIComponent(projectId)}/cad-shares`, { grantId: g.id, revisionId: cadRevisionId, nativeLinkId: nativeLinkId.trim(), url: nativeUrl.trim(), extractionCode: extractionCode.trim(), expectedGrantVersion: g.version, reason: reason.trim() }, "Native share recorded. The share expires after seven days and must not be forwarded."); setNativeUrl(""); setExtractionCode(""); }, children: [_jsx("h3", { children: "Record Owner-issued native CAD share" }), _jsx("p", { className: "external-muted", children: "Create the seven-day share in MinisCloud first. The app records it and never creates the native link automatically." }), _jsxs("label", { children: ["Recipient grant", _jsxs("select", { required: true, value: cadGrantId, onChange: (e) => setCadGrantId(e.target.value), children: [_jsx("option", { value: "", children: "Choose a grant" }), data.grants.filter((g) => !g.revokedAt).map((g) => _jsxs("option", { value: g.id, children: [g.email ?? g.accountId, " \u00B7 v", g.version] }, g.id))] })] }), _jsxs("label", { children: ["Granted CAD revision", _jsxs("select", { required: true, value: cadRevisionId, onChange: (e) => setCadRevisionId(e.target.value), children: [_jsx("option", { value: "", children: "Choose exact revision" }), data.revisionOptions.filter((r) => r.cad && data.grants.find((g) => g.id === cadGrantId)?.revisionIds.includes(r.id)).map((r) => _jsxs("option", { value: r.id, children: [r.documentNumber, " \u00B7 ", r.title] }, r.id))] })] }), _jsxs("label", { children: ["Native link identity", _jsx("input", { required: true, value: nativeLinkId, onChange: (e) => setNativeLinkId(e.target.value) })] }), _jsxs("label", { children: ["Native URL", _jsx("input", { type: "url", required: true, value: nativeUrl, onChange: (e) => setNativeUrl(e.target.value) })] }), _jsxs("label", { children: ["Extraction code", _jsx("input", { required: true, autoComplete: "off", value: extractionCode, onChange: (e) => setExtractionCode(e.target.value) })] }), _jsx(Reason, { value: reason, onChange: setReason }), _jsx("button", { disabled: busy || !cadGrantId || !cadRevisionId || !nativeLinkId.trim() || !nativeUrl.trim() || !extractionCode.trim() || !reason.trim(), children: "Record share" })] }), _jsxs("section", { children: [_jsx("h3", { children: "CAD cancellation blockers" }), data.cadShares.filter((s) => !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now()).length ? _jsx("ul", { children: data.cadShares.filter((s) => !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now()).map((s) => _jsxs("li", { children: [_jsxs("strong", { children: [s.revocationRequired ? "Owner action required" : "Active native share", " \u00B7 native link ", s.nativeLinkId ?? s.id] }), _jsxs("span", { children: ["Revision ", s.revisionId, " \u00B7 expires ", iso(s.expiresAt), " \u00B7 version ", s.version ?? "unknown"] }), owner && _jsxs(_Fragment, { children: [_jsx("button", { className: "secondary", disabled: busy, onClick: () => void revealOwnerCadDetails(s.id), children: "Reveal native link details" }), cadDetails[s.id] && _jsxs(_Fragment, { children: [_jsx("a", { href: cadDetails[s.id].url, target: "_blank", rel: "noreferrer", children: "Open native share for cancellation" }), _jsxs("span", { children: ["Extraction code: ", cadDetails[s.id].extractionCode] }), _jsx("span", { children: cadDetails[s.id].warning })] }), _jsx("button", { className: "secondary", disabled: busy, onClick: () => { const confirmation = window.prompt("Confirm native cancellation in MinisCloud and enter evidence"); if (!confirmation?.trim())
                                                                    return; const why = window.prompt("Reason for recording native cancellation"); if (!why?.trim())
                                                                    return; void mutate(`${STAFF}/cad-shares/${encodeURIComponent(s.id)}/revoke`, { expectedVersion: s.version, confirmation: confirmation.trim(), reason: why.trim() }, "Native cancellation confirmation recorded."); }, children: "Record Owner cancellation confirmation" })] })] }, s.id)) }) : _jsx("p", { className: "external-empty", children: "No outstanding CAD cancellation blockers." })] }), _jsxs("section", { children: [_jsx("h3", { children: "External evidence" }), data.requests.map((x) => _jsxs("article", { children: [_jsx("h4", { children: x.title }), _jsx("p", { children: x.body }), _jsxs("span", { children: [data.grants.find((g) => g.id === x.grantId)?.email ?? "Named external recipient", " \u00B7 ", iso(x.createdAt), x.dueDate ? ` · Due ${iso(x.dueDate)}` : ""] })] }, x.id)), data.submissions.map((x) => { const context = x.revisionId ? data.revisionOptions.find((r) => r.id === x.revisionId) : x.releaseId ? data.releaseOptions.find((r) => r.id === x.releaseId) : x.packageId ? data.packageOptions.find((r) => r.id === x.packageId) : undefined; const contextLabel = context ? ("documentNumber" in context ? `${context.documentNumber} · ${context.title}` : context.label ?? context.title ?? context.id) : x.revisionId ?? x.releaseId ?? x.packageId; return _jsxs("article", { children: [_jsxs("h4", { children: [x.kind, ": ", x.title] }), _jsx("p", { children: x.body }), _jsxs("span", { children: [contextLabel ? `Exact context: ${contextLabel} · ` : "", data.grants.find((g) => g.id === x.grantId)?.email ?? "Named external recipient", " \u00B7 ", iso(x.createdAt), " \u00B7 Advisory"] })] }, x.id); }), data.uploads.map((x) => _jsxs("article", { children: [_jsx("h4", { children: x.fileName }), _jsxs("p", { children: [x.mimeType, " \u00B7 ", x.sizeBytes.toLocaleString(), " bytes \u00B7 SHA-256 ", x.sha256 ?? "not supplied"] }), _jsxs("span", { children: [data.grants.find((g) => g.id === x.grantId)?.email ?? "Named external recipient", " \u00B7 ", iso(x.createdAt), " \u00B7 ", _jsx("a", { href: `${STAFF}/uploads/${encodeURIComponent(x.id)}/file`, children: "Download advisory evidence" })] })] }, x.id))] })] })] })] }) });
}
