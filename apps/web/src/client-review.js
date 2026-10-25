import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { startAuthentication } from "@simplewebauthn/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { ClientProjectGallery, StaffProjectGallery } from "./gallery.js";
import { loadBranchProjects } from "./client-review-project-loader.js";
import "./client-review.css";
const PORTAL = "/api/v1/client-portal";
const STAFF = "/api/v1/client-reviews";
async function request(url, csrfToken, init = {}) {
    const headers = new Headers(init.headers);
    if (csrfToken)
        headers.set("X-CSRF-Token", csrfToken);
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init, headers });
    if (!response.ok)
        throw Object.assign(new Error("request-failed"), { status: response.status });
    if (response.status === 204)
        return undefined;
    return await response.json();
}
function bodyInit(method, body) {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
function errorText(error, fallback) {
    const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
    if (status === 401)
        return "Your session expired or access was revoked. Sign in again.";
    if (status === 403)
        return "This action is not available for your current access.";
    if (status === 409)
        return "This review changed. Refresh it and check the latest status.";
    return fallback;
}
function dateText(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}
export function ClientReviewPortal({ session, requestedProjectId, requestedItemId }) {
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState("");
    const [reviews, setReviews] = useState();
    const [item, setItem] = useState();
    const [selectedItemId, setSelectedItemId] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [comment, setComment] = useState("");
    const [annotationPage, setAnnotationPage] = useState("1");
    const [annotationX, setAnnotationX] = useState("0.5");
    const [annotationY, setAnnotationY] = useState("0.5");
    const [annotationText, setAnnotationText] = useState("");
    const [reason, setReason] = useState("");
    const [signatureName, setSignatureName] = useState("");
    const [consent, setConsent] = useState(false);
    const [proofBusy, setProofBusy] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteReason, setInviteReason] = useState("");
    const [accessUsers, setAccessUsers] = useState([]);
    const [grantUserId, setGrantUserId] = useState("");
    const [grantItemId, setGrantItemId] = useState("");
    const [grantReason, setGrantReason] = useState("");
    const [grantFlags, setGrantFlags] = useState({ view: true, comment: false, review: false, approve: false, download: false });
    const [handover, setHandover] = useState();
    const refresh = async (id = projectId) => {
        if (!id)
            return;
        setError("");
        try {
            const result = await request(`${PORTAL}/reviews/projects/${encodeURIComponent(id)}`);
            setReviews(result);
            try {
                setHandover(await request(`${PORTAL}/projects/${encodeURIComponent(id)}/handover`));
            }
            catch {
                setHandover(undefined);
            }
            if (currentProject?.primary) {
                try {
                    const access = await request(`${PORTAL}/projects/${encodeURIComponent(id)}/access`);
                    setAccessUsers(access.users);
                }
                catch {
                    setAccessUsers([]);
                }
            }
            const stillVisible = result.packages.flatMap((pack) => pack.items).some((value) => value.id === selectedItemId);
            if (selectedItemId && stillVisible)
                await loadItem(id, selectedItemId);
            else {
                setSelectedItemId("");
                setItem(undefined);
            }
        }
        catch (cause) {
            setError(errorText(cause, "Client reviews could not be loaded. Try again."));
            setReviews(undefined);
        }
    };
    const loadItem = async (project, id) => {
        setError("");
        setSelectedItemId(id);
        setItem(undefined);
        try {
            setItem(await request(`${PORTAL}/reviews/items/${encodeURIComponent(id)}`));
        }
        catch (cause) {
            setError(errorText(cause, "This review item could not be opened."));
        }
    };
    useEffect(() => {
        let live = true;
        void request(`${PORTAL}/projects`).then((result) => {
            if (!live)
                return;
            setProjects(result.projects);
            const first = requestedProjectId ?? result.projects[0]?.id ?? "";
            if (requestedProjectId && !result.projects.some(project => project.id === requestedProjectId)) {
                setError("This project is not available under your current access.");
                return;
            }
            setProjectId(first);
            if (first)
                void request(`${PORTAL}/reviews/projects/${encodeURIComponent(first)}`).then((value) => {
                    if (!live)
                        return;
                    setReviews(value);
                    if (requestedItemId) {
                        if (!value.packages.some(pack => pack.items.some(entry => entry.id === requestedItemId))) {
                            setError("This item is not available in the selected project.");
                            return;
                        }
                        setSelectedItemId(requestedItemId);
                        void request(`${PORTAL}/reviews/items/${encodeURIComponent(requestedItemId)}`).then(item => { if (live)
                            setItem(item); }).catch(cause => { if (live)
                            setError(errorText(cause, "This review item could not be opened.")); });
                    }
                }).catch((cause) => { if (live)
                    setError(errorText(cause, "Client reviews could not be loaded. Try again.")); });
            if (first)
                void request(`${PORTAL}/projects/${encodeURIComponent(first)}/handover`).then((value) => { if (live)
                    setHandover(value); }).catch(() => { if (live)
                    setHandover(undefined); });
            if (result.projects.find(project => project.id === first)?.primary)
                void request(`${PORTAL}/projects/${encodeURIComponent(first)}/access`).then((value) => { if (live)
                    setAccessUsers(value.users); }).catch(() => { if (live)
                    setAccessUsers([]); });
        }).catch((cause) => { if (live)
            setError(errorText(cause, "Your client projects could not be loaded. Try again.")); })
            .finally(() => { if (live)
            setLoading(false); });
        return () => { live = false; };
    }, []);
    const allItems = useMemo(() => reviews?.packages.flatMap((pack) => pack.items.map((entry) => ({ ...entry, packageId: pack.id, packageTitle: pack.title, packageStatus: pack.status, packageVersion: pack.version }))) ?? [], [reviews]);
    const selectedSummary = allItems.find((entry) => entry.id === selectedItemId);
    const selected = selectedSummary && item?.id === selectedItemId ? { ...selectedSummary, ...item } : selectedSummary;
    const currentProject = projects.find((project) => project.id === projectId);
    const canComment = Boolean(selected && reviews?.project.status !== "CANCELLED" && (currentProject?.primary || selected.permissions?.comment) && !["WITHDRAWN", "APPROVED", "REVISION_REQUIRED", "REJECTED"].includes(selected.status));
    const canReview = Boolean(selected && reviews?.project.status !== "CANCELLED" && (currentProject?.primary || selected.permissions?.review));
    const canApproveItem = Boolean(selected && reviews?.project.status !== "CANCELLED" && (currentProject?.primary || selected.permissions?.approve));
    const canFinalApprove = Boolean(currentProject?.primary && reviews?.project.status !== "CANCELLED" && selected && selected.packageStatus === "OPEN" && allItems.filter((entry) => entry.packageId === selected.packageId).length > 0 && allItems.filter((entry) => entry.packageId === selected.packageId).every((entry) => entry.status === "APPROVED"));
    const changeProject = async (nextId) => {
        setProjectId(nextId);
        setReviews(undefined);
        setItem(undefined);
        setSelectedItemId("");
        setNotice("");
        setError("");
        setAccessUsers([]);
        setHandover(undefined);
        if (!nextId)
            return;
        setLoading(true);
        try {
            const result = await request(`${PORTAL}/reviews/projects/${encodeURIComponent(nextId)}`);
            setReviews(result);
            try {
                setHandover(await request(`${PORTAL}/projects/${encodeURIComponent(nextId)}/handover`));
            }
            catch {
                setHandover(undefined);
            }
            if (projects.find((project) => project.id === nextId)?.primary) {
                try {
                    const access = await request(`${PORTAL}/projects/${encodeURIComponent(nextId)}/access`);
                    setAccessUsers(access.users);
                }
                catch {
                    setAccessUsers([]);
                }
            }
        }
        catch (cause) {
            setError(errorText(cause, "Client reviews could not be loaded. Try again."));
        }
        finally {
            setLoading(false);
        }
    };
    const submit = async (url, payload, success) => {
        if (!selected)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const updated = await request(url, session.csrfToken, bodyInit("POST", payload));
            setItem(updated);
            setNotice(success);
            await refresh();
        }
        catch (cause) {
            setError(errorText(cause, "We couldn’t save that review action. Try again."));
        }
        finally {
            setBusy(false);
        }
    };
    const startReview = async () => {
        if (!selected || (!currentProject?.primary && !selected.permissions?.review) || reviews?.project.status === "CANCELLED")
            return;
        await submit(`${PORTAL}/reviews/items/${encodeURIComponent(selected.id)}/start`, { expectedVersion: selected.version, reason: "Client opened review" }, "Review started.");
    };
    const postComment = async (event) => {
        event.preventDefault();
        if (!selected || comment.trim().length < 1)
            return;
        const annotations = annotationText.trim() ? [{ page: Number(annotationPage), x: Number(annotationX), y: Number(annotationY), text: annotationText.trim() }] : [];
        await submit(`${PORTAL}/reviews/items/${encodeURIComponent(selected.id)}/comments`, { text: comment.trim(), ...(annotations.length ? { annotations } : {}), reason: reason.trim() || "Client review comment" }, "Comment saved.");
        setComment("");
        setAnnotationText("");
        setReason("");
    };
    const uploadReference = async (file) => {
        if (!selected || !file)
            return;
        if (!/^application\/pdf$|^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
            setError("Choose a PDF or image no larger than 8 MB.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            await request(`${PORTAL}/items/${encodeURIComponent(selected.id)}/references`, session.csrfToken, {
                method: "POST", headers: { "Content-Type": "application/octet-stream", "X-File-Name": file.name, "X-File-Mime": file.type, "X-Reason": reason.trim() || "Client review reference" }, body: file
            });
            setNotice("Reference uploaded securely.");
            setReason("");
            await refresh();
        }
        catch (cause) {
            setError(errorText(cause, "Reference upload failed. Try again."));
        }
        finally {
            setBusy(false);
        }
    };
    const decide = async (kind) => {
        if (!selected)
            return;
        const approval = kind === "APPROVED";
        if (approval && (!(currentProject?.primary || selected.permissions?.approve) || reviews?.project.status === "CANCELLED" || !session.activePasskeyCount || !signatureName.trim() || !consent))
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            let proof;
            if (approval) {
                setProofBusy(true);
                const ceremony = await request(`${PORTAL}/reviews/items/${encodeURIComponent(selected.id)}/approval-options`, session.csrfToken, bodyInit("POST", { expectedVersion: selected.version, signatureName: signatureName.trim(), consent: true, comment: comment.trim() }));
                proof = { ceremonyId: ceremony.ceremonyId, response: await startAuthentication({ optionsJSON: ceremony.options }) };
            }
            const updated = await request(`${PORTAL}/reviews/items/${encodeURIComponent(selected.id)}/decision`, session.csrfToken, bodyInit("POST", { kind, expectedVersion: selected.version, comment: comment.trim(), reason: reason.trim() || "Client review decision", ...(approval ? { signatureName: signatureName.trim(), consent: true, ...proof } : {}) }));
            setItem(updated);
            setNotice(approval ? "Item approved with passkey verification." : kind === "REJECTED" ? "Item rejected." : "Revision requested.");
            setComment("");
            setReason("");
            await refresh();
        }
        catch (cause) {
            setError(errorText(cause, cause instanceof Error && cause.name === "NotAllowedError" ? "Passkey verification was cancelled." : "We couldn’t record that decision."));
        }
        finally {
            setBusy(false);
            setProofBusy(false);
        }
    };
    const finalApprove = async (packageId) => {
        if (!selected || !canFinalApprove || !signatureName.trim() || !consent || !session.activePasskeyCount)
            return;
        setBusy(true);
        setProofBusy(true);
        setError("");
        setNotice("");
        try {
            const currentPackage = reviews?.packages.find((pack) => pack.id === packageId);
            if (!currentPackage)
                throw new Error("Package missing");
            const options = await request(`${PORTAL}/reviews/packages/${encodeURIComponent(packageId)}/approval-options`, session.csrfToken, bodyInit("POST", { expectedVersion: currentPackage.version, signatureName: signatureName.trim(), consent: true, comment: comment.trim() }));
            const response = await startAuthentication({ optionsJSON: options.options });
            await request(`${PORTAL}/reviews/packages/${encodeURIComponent(packageId)}/final-approval`, session.csrfToken, bodyInit("POST", { expectedVersion: currentPackage.version, signatureName: signatureName.trim(), consent: true, comment: comment.trim(), reason: reason.trim() || "Final client approval", ceremonyId: options.ceremonyId, response }));
            setNotice("Final package approval recorded with passkey verification.");
            setComment("");
            setReason("");
            setConsent(false);
            await refresh();
        }
        catch (cause) {
            setError(errorText(cause, cause instanceof Error && cause.name === "NotAllowedError" ? "Passkey verification was cancelled." : "Final approval could not be recorded."));
        }
        finally {
            setBusy(false);
            setProofBusy(false);
        }
    };
    const invite = async (event) => {
        event.preventDefault();
        if (!currentProject?.primary)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`${PORTAL}/projects/${encodeURIComponent(currentProject.id)}/invitations`, session.csrfToken, bodyInit("POST", { email: inviteEmail.trim(), reason: inviteReason.trim() }));
            setInviteEmail("");
            setInviteReason("");
            setNotice("Invitation saved. Delivery status is managed separately.");
        }
        catch (cause) {
            setError(errorText(cause, "Invitation could not be saved."));
        }
        finally {
            setBusy(false);
        }
    };
    const saveItemGrant = async (event) => {
        event.preventDefault();
        if (!currentProject?.primary || !grantUserId || !grantItemId)
            return;
        const targetUser = accessUsers.find((user) => user.id === grantUserId);
        const existing = targetUser?.items.find((grant) => grant.itemId === grantItemId);
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`${PORTAL}/item-grants`, session.csrfToken, bodyInit("POST", {
                itemId: grantItemId, portalGrantId: grantUserId, ...grantFlags,
                expectedVersion: existing?.version ?? 0, reason: grantReason.trim()
            }));
            setNotice("Item access updated.");
            setGrantReason("");
            const access = await request(`${PORTAL}/projects/${encodeURIComponent(currentProject.id)}/access`);
            setAccessUsers(access.users);
        }
        catch (cause) {
            setError(errorText(cause, "Item access could not be updated."));
        }
        finally {
            setBusy(false);
        }
    };
    const acknowledgeHandover = async (issueId) => {
        if (!projectId || !reason.trim() || reviews?.project.status === "CANCELLED")
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`${PORTAL}/handover/${encodeURIComponent(issueId)}/acknowledge`, session.csrfToken, bodyInit("POST", { note: comment.trim(), reason: reason.trim() }));
            setNotice("Handover acknowledged.");
            setComment("");
            setReason("");
            setHandover(await request(`${PORTAL}/projects/${encodeURIComponent(projectId)}/handover`));
        }
        catch (cause) {
            setError(errorText(cause, "Handover acknowledgement could not be saved."));
        }
        finally {
            setBusy(false);
        }
    };
    return _jsxs("section", { className: "client-review-workspace", "aria-labelledby": "client-review-heading", children: [_jsxs("header", { className: "client-review-header", children: [_jsxs("div", { children: [_jsx("p", { className: "client-review-eyebrow", children: "PROJECT REVIEWS" }), _jsx("h2", { id: "client-review-heading", children: "Client review" }), _jsx("p", { children: "Review only the items and files shared with this client account." })] }), _jsxs("label", { children: ["Project", _jsxs("select", { "aria-label": "Client project", value: projectId, onChange: (event) => void changeProject(event.target.value), disabled: loading || projects.length === 0, children: [_jsx("option", { value: "", children: "Choose a project" }), projects.map((project) => _jsxs("option", { value: project.id, children: [project.title, " \u00B7 ", project.status] }, project.id))] })] })] }), loading && _jsx("p", { className: "client-review-muted", role: "status", children: "Loading client projects\u2026" }), error && _jsxs("div", { className: "client-review-error", children: [_jsx("p", { role: "alert", children: error }), _jsx("button", { type: "button", onClick: () => void refresh(), children: "Try again" })] }), notice && _jsx("p", { className: "client-review-notice", role: "status", children: notice }), !loading && !error && projects.length === 0 && _jsx("p", { className: "client-review-empty", role: "status", children: "No client projects are currently available to this account." }), currentProject?.expiresAt && _jsxs("p", { className: "client-review-expiry", role: "note", children: ["Project access expires ", dateText(currentProject.expiresAt), "."] }), currentProject && !loading && _jsx(ClientProjectGallery, { projectId: projectId, session: session }), handover?.issues?.map((issue) => _jsxs("section", { className: "client-review-panel", "aria-label": `Issued handover ${issue.purpose}`, children: [_jsxs("div", { children: [_jsxs("h3", { children: ["Issued handover \u00B7 ", issue.purpose] }), _jsxs("p", { children: ["Issued ", dateText(issue.issuedAt), issue.acknowledgedAt ? ` · acknowledged ${dateText(issue.acknowledgedAt)}` : ""] })] }), _jsx("div", { className: "client-review-file", children: issue.items.filter((file) => !file.superseded).map((file) => _jsxs("div", { className: "client-review-gallery-item", children: [_jsxs("a", { href: `${PORTAL}/items/${encodeURIComponent(file.itemId)}/stream`, target: "_blank", rel: "noreferrer", children: [file.label, " \u00B7 ", file.mime] }), file.mime.startsWith("image/") && _jsx("img", { src: `${PORTAL}/items/${encodeURIComponent(file.itemId)}/stream`, alt: `Issued image: ${file.label}`, loading: "lazy" })] }, file.itemId)) }), issue.acknowledgementRequired && issue.canAcknowledge && !issue.acknowledgedAt && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Handover note", _jsx("textarea", { maxLength: 1000, value: comment, onChange: (event) => setComment(event.target.value) })] }), _jsxs("label", { children: ["Reason", _jsx("input", { minLength: 3, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) })] }), _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => void acknowledgeHandover(issue.id), children: "Acknowledge handover" })] })] }, issue.id)), currentProject?.primary && reviews?.project.status !== "CANCELLED" && _jsxs("section", { className: "client-review-panel", "aria-labelledby": "client-invite-heading", children: [_jsx("h3", { id: "client-invite-heading", children: "Invite and configure client access" }), _jsx("p", { children: "Additional clients receive only the project and exact-item capabilities you grant." }), _jsxs("form", { className: "client-review-form client-review-invite", onSubmit: (event) => void invite(event), children: [_jsxs("label", { children: ["Email", _jsx("input", { type: "email", required: true, maxLength: 320, value: inviteEmail, onChange: (event) => setInviteEmail(event.target.value) })] }), _jsxs("label", { children: ["Reason", _jsx("input", { required: true, minLength: 3, maxLength: 1000, value: inviteReason, onChange: (event) => setInviteReason(event.target.value) })] }), _jsx("button", { disabled: busy || !inviteEmail.trim() || inviteReason.trim().length < 3, children: busy ? "Saving…" : "Invite client" })] }), accessUsers.length > 0 && _jsxs(_Fragment, { children: [_jsx("ul", { className: "client-review-access-list", children: accessUsers.map((user) => _jsxs("li", { children: [_jsx("strong", { children: user.email }), _jsxs("span", { children: ["Access expires ", user.expiresAt ? dateText(user.expiresAt) : "as currently configured"] }), _jsxs("small", { children: [user.items.length, " item grant", user.items.length === 1 ? "" : "s"] })] }, user.id)) }), _jsxs("form", { className: "client-review-form client-review-grant", onSubmit: (event) => void saveItemGrant(event), children: [_jsx("h4", { children: "Set item capabilities" }), _jsxs("label", { children: ["Additional client", _jsxs("select", { required: true, value: grantUserId, onChange: (event) => setGrantUserId(event.target.value), children: [_jsx("option", { value: "", children: "Choose client" }), accessUsers.filter((user) => !user.primary && !user.revokedAt).map((user) => _jsx("option", { value: user.id, children: user.email }, user.id))] })] }), _jsxs("label", { children: ["Review item", _jsxs("select", { required: true, value: grantItemId, onChange: (event) => setGrantItemId(event.target.value), children: [_jsx("option", { value: "", children: "Choose item" }), allItems.map((entry) => _jsx("option", { value: entry.id, children: entry.label || entry.task?.title || "Issued revision" }, entry.id))] })] }), _jsx("div", { className: "client-review-capabilities", children: ["view", "comment", "review", "approve", "download"].map((flag) => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: grantFlags[flag], onChange: (event) => setGrantFlags((current) => ({ ...current, [flag]: event.target.checked })) }), flag[0]?.toUpperCase(), flag.slice(1)] }, flag)) }), _jsxs("label", { children: ["Reason", _jsx("input", { minLength: 3, maxLength: 1000, required: true, value: grantReason, onChange: (event) => setGrantReason(event.target.value) })] }), _jsx("button", { disabled: busy || !grantUserId || !grantItemId || grantReason.trim().length < 3, children: "Save item access" })] })] })] }), !loading && reviews && _jsxs(_Fragment, { children: [((reviews.ownApprovalHistory?.itemDecisions?.length ?? 0) + (reviews.ownApprovalHistory?.finalApprovals?.length ?? 0)) > 0 && _jsxs("section", { className: "client-review-panel", "aria-label": "Your approval history", children: [_jsx("h3", { children: "Your approval history" }), _jsx("ul", { children: [...(reviews.ownApprovalHistory?.itemDecisions ?? []), ...(reviews.ownApprovalHistory?.finalApprovals ?? [])].map((entry) => _jsxs("li", { children: [entry.kind ?? "Approval", entry.signatureName ? ` · ${entry.signatureName}` : "", " \u00B7 ", dateText(entry.createdAt), entry.closedAt ? ` · closed ${dateText(entry.closedAt)}` : ""] }, entry.id)) })] }), _jsxs("div", { className: "client-review-layout", children: [_jsxs("section", { className: "client-review-panel", "aria-labelledby": "client-items-heading", children: [_jsxs("div", { className: "client-review-section-head", children: [_jsx("h3", { id: "client-items-heading", children: "Shared review items" }), _jsx("button", { type: "button", onClick: () => void refresh(), disabled: busy, children: "Refresh" })] }), allItems.length === 0 ? _jsx("p", { className: "client-review-empty", role: "status", children: "There are no review items for this project." }) : _jsx("ul", { className: "client-review-item-list", children: allItems.map((entry) => _jsx("li", { children: _jsxs("button", { type: "button", "aria-current": entry.id === selectedItemId, onClick: () => void loadItem(projectId, entry.id), children: [_jsx("strong", { children: entry.label || entry.task?.title || "Issued revision" }), entry.task && _jsx("span", { children: entry.task.title }), _jsxs("small", { children: [entry.status.replaceAll("_", " "), " \u00B7 ", entry.packageTitle] })] }) }, entry.id)) })] }), _jsxs("section", { className: "client-review-panel", "aria-labelledby": "client-item-detail-heading", children: [!selected && _jsx("p", { className: "client-review-muted", role: "status", children: "Choose a shared review item to see its details." }), selected && _jsxs(_Fragment, { children: [_jsxs("div", { className: "client-review-detail-head", children: [_jsxs("div", { children: [_jsx("p", { className: "client-review-eyebrow", children: selected.packageTitle }), _jsx("h3", { id: "client-item-detail-heading", children: selected.label || selected.task?.title || "Issued revision" }), selected.task && _jsxs("p", { children: [selected.task.title, " \u00B7 ", selected.status.replaceAll("_", " ")] })] }), _jsx("button", { type: "button", onClick: () => void loadItem(projectId, selected.id), children: "Refresh item" })] }), selected.workEvidence?.kind === "LINK" && _jsxs("div", { className: "client-review-file", children: [_jsx("a", { href: selected.workEvidence.url, target: "_blank", rel: "noopener noreferrer", children: "Open submitted review link" }), _jsx("small", { children: "The submitted URL is preserved. External content may change." })] }), selected.workEvidence?.kind === "FILE" && _jsxs("div", { className: "client-review-file", children: [_jsx("a", { href: `${PORTAL}/items/${encodeURIComponent(selected.id)}/stream`, target: "_blank", rel: "noopener noreferrer", children: "View submitted file" }), selected.permissions?.download && _jsx("a", { href: `${PORTAL}/items/${encodeURIComponent(selected.id)}/stream?download=1`, children: "Download submitted file" })] }), selected.revision && _jsxs("div", { className: "client-review-file", children: [_jsxs("span", { children: [selected.revision.label, " \u00B7 ", selected.revision.mimeType] }), (currentProject?.primary || selected.permissions?.view) && _jsx("a", { href: `${PORTAL}/items/${encodeURIComponent(selected.id)}/stream`, target: "_blank", rel: "noreferrer", children: "View issued file" }), (currentProject?.primary || selected.permissions?.download) && _jsx("a", { href: `${PORTAL}/items/${encodeURIComponent(selected.id)}/stream?download=1`, children: "Download if permitted" })] }), (selected.decision ?? selected.ownDecision) && _jsxs("p", { className: "client-review-decision", role: "status", children: ["Recorded: ", (selected.decision ?? selected.ownDecision)?.kind.replaceAll("_", " "), " \u00B7 ", dateText((selected.decision ?? selected.ownDecision).createdAt), (selected.decision ?? selected.ownDecision)?.comment ? ` — ${(selected.decision ?? selected.ownDecision)?.comment}` : ""] }), reviews?.project.status !== "CANCELLED" && _jsxs(_Fragment, { children: [_jsx("h4", { children: "Comments and annotations" }), (selected.comments ?? []).length === 0 ? _jsx("p", { className: "client-review-muted", children: "No comments yet." }) : _jsx("ol", { className: "client-review-comments", children: selected.comments?.map((entry) => _jsxs("li", { children: [_jsx("strong", { children: entry.authorEmail }), _jsx("time", { children: dateText(entry.createdAt) }), _jsx("p", { children: entry.text }), entry.annotations.map((mark, index) => _jsxs("p", { className: "client-review-annotation", children: ["Page ", mark.page, " \u00B7 x ", mark.x.toFixed(3), ", y ", mark.y.toFixed(3), " \u2014 ", mark.text] }, `${entry.id}-${index}`)), entry.referenceId && _jsx("a", { href: `${PORTAL}/references/${encodeURIComponent(entry.referenceId)}/stream`, target: "_blank", rel: "noreferrer", children: "View attached reference" })] }, entry.id)) })] }), canComment && _jsxs(_Fragment, { children: [_jsxs("form", { className: "client-review-form", onSubmit: (event) => void postComment(event), children: [_jsxs("label", { children: ["Comment", _jsx("textarea", { maxLength: 2000, value: comment, onChange: (event) => setComment(event.target.value) })] }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Add annotation" }), _jsxs("div", { className: "client-review-grid", children: [_jsxs("label", { children: ["Page", _jsx("input", { type: "number", min: "1", value: annotationPage, onChange: (event) => setAnnotationPage(event.target.value) })] }), _jsxs("label", { children: ["X (0\u20131)", _jsx("input", { type: "number", min: "0", max: "1", step: "0.001", value: annotationX, onChange: (event) => setAnnotationX(event.target.value) })] }), _jsxs("label", { children: ["Y (0\u20131)", _jsx("input", { type: "number", min: "0", max: "1", step: "0.001", value: annotationY, onChange: (event) => setAnnotationY(event.target.value) })] })] }), _jsxs("label", { children: ["Annotation text", _jsx("input", { maxLength: 1000, value: annotationText, onChange: (event) => setAnnotationText(event.target.value) })] })] }), _jsxs("label", { children: ["Reason", _jsx("input", { minLength: 3, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) })] }), _jsx("button", { type: "submit", disabled: busy || !comment.trim(), children: busy ? "Saving…" : "Send comment" })] }), _jsxs("label", { className: "client-review-upload", children: ["Upload a private PDF or image reference", _jsx("input", { type: "file", accept: "application/pdf,image/png,image/jpeg,image/webp", onChange: (event) => void uploadReference(event.currentTarget.files?.[0]), disabled: busy })] })] }), selected.status === "PENDING" && canReview && _jsx("button", { type: "button", disabled: busy, onClick: () => void startReview(), children: "Start review" }), selected.status === "IN_REVIEW" && canReview && _jsxs("div", { className: "client-review-actions", children: [_jsx("button", { type: "button", className: "client-review-secondary", disabled: busy, onClick: () => void submit(`${PORTAL}/reviews/items/${encodeURIComponent(selected.id)}/decision`, { kind: "REVISION_REQUIRED", expectedVersion: selected.version, comment: comment.trim(), reason: reason.trim() || "Revision requested" }, "Revision requested."), children: "Request revision" }), _jsx("button", { type: "button", className: "client-review-secondary", disabled: busy, onClick: () => void submit(`${PORTAL}/reviews/items/${encodeURIComponent(selected.id)}/decision`, { kind: "REJECTED", expectedVersion: selected.version, comment: comment.trim(), reason: reason.trim() || "Review rejected" }, "Item rejected."), children: "Reject item" })] }), canApproveItem && selected.status === "IN_REVIEW" && _jsxs("section", { className: "client-review-approval", children: [_jsx("h4", { children: "Approve this item" }), !currentProject?.primary && _jsx("p", { children: "Item approval is delegated to this account for this review item." }), _jsxs("label", { children: ["Typed signature", _jsx("input", { autoComplete: "name", maxLength: 200, value: signatureName, onChange: (event) => setSignatureName(event.target.value) })] }), _jsxs("label", { className: "client-review-consent", children: [_jsx("input", { type: "checkbox", checked: consent, onChange: (event) => setConsent(event.target.checked) }), "I consent to record this as my electronic approval."] }), _jsx("button", { type: "button", disabled: busy || proofBusy || !session.activePasskeyCount || !signatureName.trim() || !consent, onClick: () => void decide("APPROVED"), children: proofBusy ? "Verifying passkey…" : "Approve with passkey" }), !session.activePasskeyCount && _jsx("p", { role: "note", children: "Register a passkey in Account security before approving." })] }), canFinalApprove && currentProject?.primary && _jsxs("section", { className: "client-review-approval", children: [_jsx("h4", { children: "Final overall approval" }), _jsx("p", { children: "All items in this package are approved. Only the Primary Client can record final overall approval." }), _jsxs("label", { children: ["Typed signature", _jsx("input", { autoComplete: "name", maxLength: 200, value: signatureName, onChange: (event) => setSignatureName(event.target.value) })] }), _jsxs("label", { className: "client-review-consent", children: [_jsx("input", { type: "checkbox", checked: consent, onChange: (event) => setConsent(event.target.checked) }), "I consent to record this as my final electronic approval."] }), _jsx("button", { type: "button", disabled: busy || proofBusy || !session.activePasskeyCount || !signatureName.trim() || !consent, onClick: () => void finalApprove(selected.packageId), children: proofBusy ? "Verifying passkey…" : "Record final approval" })] })] })] })] })] })] });
}
export function StaffClientReviewWorkspace({ csrfToken, owner }) {
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState("");
    const [requestedProjectId, setRequestedProjectId] = useState(() => new URLSearchParams(window.location.search).get("projectId") ?? "");
    const [unavailableProjectId, setUnavailableProjectId] = useState("");
    const [reviews, setReviews] = useState();
    const [tasks, setTasks] = useState([]);
    const [revisions, setRevisions] = useState([]);
    const [selectedTask, setSelectedTask] = useState("");
    const [selectedRevision, setSelectedRevision] = useState("");
    const [label, setLabel] = useState("");
    const [packageTitle, setPackageTitle] = useState("");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [ownerAccess, setOwnerAccess] = useState();
    const projectLoad = useRef(0);
    const [correctionOwnerByItem, setCorrectionOwnerByItem] = useState({});
    const [primaryEmail, setPrimaryEmail] = useState("");
    const [ownerReason, setOwnerReason] = useState("");
    const [grantExpiry, setGrantExpiry] = useState({});
    useEffect(() => {
        let live = true;
        void (async () => {
            try {
                const setup = await request("/api/v1/projects/setup");
                const items = await loadBranchProjects(setup.branches, (branchId, offset, limit) => request(`/api/v1/projects?branchId=${encodeURIComponent(branchId)}&offset=${offset}&limit=${limit}`), () => live);
                if (!live)
                    return;
                setProjects(items.filter((project) => project.status === "ACTIVE"));
                const active = items.filter((project) => project.status === "ACTIVE");
                const requested = new URLSearchParams(window.location.search).get("projectId") ?? "";
                setRequestedProjectId(requested);
                setProjectId(requested ? (active.some((project) => project.id === requested) ? requested : "") : active[0]?.id ?? "");
            }
            catch (cause) {
                if (live)
                    setError(errorText(cause, "Internal project list could not be loaded."));
            }
            finally {
                if (live)
                    setLoading(false);
            }
        })();
        return () => { live = false; };
    }, []);
    const loadProject = async (id) => {
        const generation = ++projectLoad.current;
        setReviews(undefined);
        setTasks([]);
        setRevisions([]);
        setOwnerAccess(undefined);
        setError("");
        setSelectedTask("");
        setSelectedRevision("");
        if (!id)
            return;
        setLoading(true);
        try {
            const data = await request(`${STAFF}/projects/${encodeURIComponent(id)}`);
            const access = owner ? await request(`/api/v1/client-access/projects/${encodeURIComponent(id)}`) : undefined;
            if (generation !== projectLoad.current)
                return;
            setReviews(data);
            setTasks(data.eligibleTasks ?? []);
            setRevisions((data.eligibleTasks ?? []).flatMap((task) => task.revisions.filter((revision) => ["INTERNAL_APPROVED", "APPROVED", "ISSUED"].includes(revision.state)).map((revision) => ({ ...revision, taskId: task.id }))));
            setOwnerAccess(access);
        }
        catch (cause) {
            if (generation === projectLoad.current) {
                const status = typeof cause === "object" && cause !== null && "status" in cause ? cause.status : undefined;
                if (status === 403 || status === 404) {
                    setUnavailableProjectId(id);
                    setProjectId("");
                    setError("");
                }
                else
                    setError(errorText(cause, "Project review details could not be loaded."));
            }
        }
        finally {
            if (generation === projectLoad.current)
                setLoading(false);
        }
    };
    useEffect(() => {
        const onPopState = () => {
            const requested = new URLSearchParams(window.location.search).get("projectId") ?? "";
            setRequestedProjectId(requested);
            setUnavailableProjectId("");
            const activeProjects = projects.filter((project) => project.status === "ACTIVE");
            setProjectId(requested ? (activeProjects.some((project) => project.id === requested) ? requested : "") : activeProjects[0]?.id ?? "");
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [projects]);
    useEffect(() => {
        if (projectId && projects.some((project) => project.id === projectId && project.status === "ACTIVE"))
            void loadProject(projectId);
        else {
            projectLoad.current += 1;
            setReviews(undefined);
            setTasks([]);
            setRevisions([]);
            setOwnerAccess(undefined);
            setSelectedTask("");
            setSelectedRevision("");
        }
    }, [projectId, projects]);
    const selectProject = (id) => {
        const url = new URL(window.location.href);
        if (id)
            url.searchParams.set("projectId", id);
        else
            url.searchParams.delete("projectId");
        window.history.pushState({ clientReviewProjectSelection: true }, "", url);
        setRequestedProjectId(id);
        setUnavailableProjectId("");
        setProjectId(id);
    };
    const createPackage = async (event) => {
        event.preventDefault();
        if (!projectId || !selectedTask || !selectedRevision || !packageTitle.trim())
            return;
        const work = reviews?.eligibleTasks?.find(task => task.id === selectedTask)?.approvedWork;
        if (selectedRevision === "approved-work" && !work)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`${STAFF}/projects/${encodeURIComponent(projectId)}/packages`, csrfToken, bodyInit("POST", { title: packageTitle.trim(), reason: reason.trim(), items: [{ taskId: selectedTask, expectedTaskVersion: tasks.find((task) => task.id === selectedTask)?.version, ...(selectedRevision === "approved-work" && work ? { workSubmissionId: work.submissionId, ...(work.revisionId ? { revisionId: work.revisionId } : {}) } : { revisionId: selectedRevision }), label: label.trim() || tasks.find((task) => task.id === selectedTask)?.title }] }));
            setNotice("Client review package sent.");
            setPackageTitle("");
            setLabel("");
            setReason("");
            await loadProject(projectId);
        }
        catch (cause) {
            setError(errorText(cause, "Client review package could not be sent."));
        }
        finally {
            setBusy(false);
        }
    };
    const classify = async (itemId, version, category) => {
        if (!reviews?.capabilities?.classify || !reason.trim())
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`${STAFF}/items/${encodeURIComponent(itemId)}/classification`, csrfToken, bodyInit("POST", { category, expectedVersion: version, reason: reason.trim() }));
            setNotice("Revision classification saved.");
            await loadProject(projectId);
        }
        catch (cause) {
            setError(errorText(cause, "Classification could not be saved."));
        }
        finally {
            setBusy(false);
        }
    };
    const assignCorrection = async (itemId) => {
        const ownerEmployeeId = correctionOwnerByItem[itemId];
        if (!reviews?.capabilities?.assignCorrection || !ownerEmployeeId || reason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`${STAFF}/items/${encodeURIComponent(itemId)}/correction`, csrfToken, bodyInit("POST", { ownerEmployeeId, reason: reason.trim() }));
            setNotice("Correction task assigned.");
            setReason("");
            await loadProject(projectId);
        }
        catch (cause) {
            setError(errorText(cause, "Correction could not be assigned."));
        }
        finally {
            setBusy(false);
        }
    };
    const resumeCorrection = async (itemId, taskId) => {
        if (!reviews?.capabilities?.assignCorrection || reason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const { task } = await request(`/api/v1/tasks/${encodeURIComponent(taskId)}`);
            await request(`${STAFF}/items/${encodeURIComponent(itemId)}/resume`, csrfToken, bodyInit("POST", { expectedTaskVersion: task.version, reason: reason.trim() }));
            setNotice("Completed correction resumed for internal review.");
            setReason("");
            await loadProject(projectId);
        }
        catch (cause) {
            setError(errorText(cause, "Correction could not be resumed."));
        }
        finally {
            setBusy(false);
        }
    };
    const completeCorrection = async (taskId) => {
        if (!reviews?.capabilities?.assignCorrection || reason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const { task } = await request(`/api/v1/tasks/${encodeURIComponent(taskId)}`);
            if (task.status === "NOT_STARTED") {
                const started = await request(`/api/v1/tasks/${encodeURIComponent(taskId)}/state`, csrfToken, bodyInit("POST", { toState: "IN_PROGRESS", expectedVersion: task.version, reason: reason.trim() }));
                task.version = started.version;
                task.status = started.status;
            }
            await request(`/api/v1/tasks/${encodeURIComponent(taskId)}/state`, csrfToken, bodyInit("POST", { toState: "COMPLETED", expectedVersion: task.version, reason: reason.trim() }));
            setNotice("Correction task completed.");
            setReason("");
            await loadProject(projectId);
        }
        catch (cause) {
            setError(errorText(cause, "Correction task could not be completed."));
        }
        finally {
            setBusy(false);
        }
    };
    const completeApprovedTask = async (taskId) => {
        if (!reviews?.capabilities?.manage || reason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const { task } = await request(`/api/v1/tasks/${encodeURIComponent(taskId)}`);
            await request(`${STAFF}/tasks/${encodeURIComponent(taskId)}/complete`, csrfToken, bodyInit("POST", { expectedVersion: task.version, reason: reason.trim() }));
            setNotice("Approved task completed.");
            setReason("");
            await loadProject(projectId);
        }
        catch (cause) {
            setError(errorText(cause, "Approved task could not be completed."));
        }
        finally {
            setBusy(false);
        }
    };
    const setPrimary = async (event) => {
        event.preventDefault();
        if (!owner || !projectId || !ownerAccess || !primaryEmail.trim() || ownerReason.trim().length < 3)
            return;
        const currentPrimary = ownerAccess.grants.find((grant) => grant.primary && !grant.revokedAt);
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`/api/v1/client-access/projects/${encodeURIComponent(projectId)}/primary`, csrfToken, bodyInit("POST", { email: primaryEmail.trim(), expectedProjectVersion: ownerAccess.projectVersion, expectedPrimaryGrantId: currentPrimary?.id ?? null, ...(currentPrimary ? { expectedPrimaryGrantVersion: currentPrimary.version } : {}), reason: ownerReason.trim() }));
            setNotice("Primary Client appointment updated.");
            setPrimaryEmail("");
            setOwnerReason("");
            await loadProject(projectId);
        }
        catch (cause) {
            setError(errorText(cause, "Primary Client appointment could not be updated."));
        }
        finally {
            setBusy(false);
        }
    };
    const updateOwnerGrant = async (grant, action) => {
        if (!owner || !projectId || ownerReason.trim().length < 3)
            return;
        const date = grantExpiry[grant.id];
        if (action === "SET_EXPIRY" && !date)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`/api/v1/client-access/grants/${encodeURIComponent(grant.id)}`, csrfToken, bodyInit("POST", { action, expectedVersion: grant.version, reason: ownerReason.trim(), ...(action === "SET_EXPIRY" ? { expiresAt: new Date(`${date}T23:59:59.000Z`).toISOString() } : {}) }));
            setNotice(action === "REVOKE" ? "Client access revoked." : "Client access expiry updated.");
            setOwnerReason("");
            await loadProject(projectId);
        }
        catch (cause) {
            setError(errorText(cause, "Client access could not be updated."));
        }
        finally {
            setBusy(false);
        }
    };
    return _jsxs("section", { className: "client-review-workspace", "aria-labelledby": "staff-client-review-heading", children: [_jsxs("header", { className: "client-review-header", children: [_jsxs("div", { children: [_jsx("p", { className: "client-review-eyebrow", children: "INTERNAL WORKSPACE" }), _jsx("h2", { id: "staff-client-review-heading", children: "Client reviews" }), _jsx("p", { children: "Publish exact task and revision snapshots, then track client outcomes." })] }), _jsxs("label", { children: ["Active project", _jsxs("select", { disabled: busy, value: projectId, onChange: (event) => selectProject(event.target.value), children: [_jsx("option", { value: "", children: "Choose a project" }), projects.filter((project) => project.status === "ACTIVE").map((project) => _jsx("option", { value: project.id, children: project.title }, project.id))] })] })] }), requestedProjectId && !loading && !error && (unavailableProjectId === requestedProjectId || !projects.some((project) => project.id === requestedProjectId && project.status === "ACTIVE")) && _jsx("p", { className: "client-review-muted", role: "status", children: "The requested project is unavailable or your access has changed. Choose an authorized project." }), loading && _jsx("p", { role: "status", children: "Loading projects and review details\u2026" }), error && _jsx("p", { className: "client-review-error", role: "alert", children: error }), notice && _jsx("p", { className: "client-review-notice", role: "status", children: notice }), owner && projectId && ownerAccess && _jsxs("section", { className: "client-review-panel", "aria-labelledby": "owner-client-access-heading", children: [_jsx("h3", { id: "owner-client-access-heading", children: "Owner client access" }), _jsxs("form", { className: "client-review-form", onSubmit: (event) => void setPrimary(event), children: [_jsxs("label", { children: ["Primary Client email", _jsx("input", { type: "email", required: true, maxLength: 320, value: primaryEmail, onChange: (event) => setPrimaryEmail(event.target.value) })] }), _jsxs("label", { children: ["Reason for appointment or replacement", _jsx("input", { required: true, minLength: 3, maxLength: 1000, value: ownerReason, onChange: (event) => setOwnerReason(event.target.value) })] }), _jsx("button", { disabled: busy || ownerReason.trim().length < 3, children: busy ? "Saving…" : "Set Primary Client" })] }), _jsx("ul", { className: "client-review-access-list", children: ownerAccess.grants.map((grant) => _jsxs("li", { children: [_jsxs("strong", { children: [grant.email ?? grant.accountId, grant.primary ? " · Primary" : " · Additional"] }), _jsx("span", { children: grant.revokedAt ? "Revoked" : `Expires ${grant.expiresAt ? dateText(grant.expiresAt) : "not set"}` }), !grant.revokedAt && _jsxs("div", { className: "client-review-owner-actions", children: [_jsxs("label", { children: ["New expiry", _jsx("input", { type: "date", value: grantExpiry[grant.id] ?? "", onChange: (event) => setGrantExpiry((value) => ({ ...value, [grant.id]: event.target.value })) })] }), _jsx("button", { type: "button", disabled: busy || !grantExpiry[grant.id] || ownerReason.trim().length < 3, onClick: () => void updateOwnerGrant(grant, "SET_EXPIRY"), children: "Set expiry" }), _jsx("button", { type: "button", className: "client-review-secondary", disabled: busy || ownerReason.trim().length < 3, onClick: () => void updateOwnerGrant(grant, "REVOKE"), children: "Revoke" })] })] }, grant.id)) }), _jsx("p", { className: "client-review-muted", children: "Set future expiry for each active client grant before project cancellation." })] }), projectId && reviews && _jsxs("form", { className: "client-review-form client-review-publish", onSubmit: (event) => void createPackage(event), children: [_jsx("h3", { children: "Send a task for client review" }), _jsxs("label", { children: ["Package title", _jsx("input", { required: true, maxLength: 200, value: packageTitle, onChange: (event) => setPackageTitle(event.target.value) })] }), _jsxs("label", { children: ["Task", _jsxs("select", { "aria-label": "Task", required: true, value: selectedTask, onChange: (event) => { setSelectedTask(event.target.value); setSelectedRevision(""); }, children: [_jsx("option", { value: "", children: "Choose internally approved work" }), tasks.map((task) => _jsxs("option", { value: task.id, children: [task.title, " \u00B7 ", task.status] }, task.id))] })] }), _jsxs("label", { children: ["Approved evidence", _jsxs("select", { required: true, value: selectedRevision, onChange: (event) => setSelectedRevision(event.target.value), children: [_jsx("option", { value: "", children: "Choose an approved file, drawing or link" }), reviews.eligibleTasks?.find(task => task.id === selectedTask)?.approvedWork && _jsxs("option", { value: "approved-work", children: ["Exact internally approved ", reviews.eligibleTasks.find(task => task.id === selectedTask)?.approvedWork?.kind.toLowerCase()] }), revisions.filter((revision) => revision.taskId === selectedTask).map((revision) => _jsx("option", { value: revision.id, children: revision.label }, revision.id))] })] }), _jsxs("label", { children: ["Client label", _jsx("input", { maxLength: 200, value: label, onChange: (event) => setLabel(event.target.value) })] }), _jsxs("label", { children: ["Reason", _jsx("input", { minLength: 3, maxLength: 1000, required: true, value: reason, onChange: (event) => setReason(event.target.value) })] }), _jsx("button", { disabled: busy || !selectedTask || !selectedRevision || !packageTitle.trim() || reason.trim().length < 3, children: busy ? "Sending…" : "Send for client review" })] }), owner && projectId && _jsx(StaffProjectGallery, { projectId: projectId, csrfToken: csrfToken, owner: owner }), reviews && _jsxs("section", { className: "client-review-panel", children: [_jsx("h3", { children: "Packages and outcomes" }), reviews.packages.length === 0 ? _jsx("p", { role: "status", children: "No client review packages have been sent." }) : _jsx("ul", { className: "client-review-staff-list", children: reviews.packages.flatMap((pack) => pack.items.map((entry) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: entry.label }), _jsxs("span", { children: [pack.title, " \u00B7 ", entry.status.replaceAll("_", " ")] }), entry.classification && _jsx("small", { children: entry.classification.category.replaceAll("_", " ") }), entry.correctionTaskId && _jsxs("small", { children: ["Correction task: ", entry.correctionTaskId] })] }), entry.status === "APPROVED" && pack.status === "APPROVED" && entry.taskId && entry.taskStatus !== "COMPLETED" && reviews.capabilities?.manage && _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => void completeApprovedTask(entry.taskId), children: "Complete approved task" }), (entry.status === "REVISION_REQUIRED" || entry.status === "REJECTED" || entry.revision?.label.startsWith("CR")) && entry.status !== "WITHDRAWN" && reviews.capabilities?.classify && _jsxs("label", { children: ["Classify CR outcome", _jsxs("select", { "aria-label": `Classification for ${entry.label}`, value: entry.classification?.category ?? "", onChange: (event) => void classify(entry.id, entry.version, event.target.value), disabled: busy || !reason.trim(), children: [_jsx("option", { value: "", children: "Choose category" }), _jsx("option", { value: "PREFERENCE_NEW_REQUIREMENT", children: "Preference / New Requirement" }), _jsx("option", { value: "EMPLOYEE_WORK_ERROR", children: "Employee Work Error" })] })] }), entry.status === "REVISION_REQUIRED" && reviews.capabilities?.assignCorrection && _jsxs("div", { className: "client-review-correction-actions", children: [_jsxs("label", { children: ["Correction owner", _jsxs("select", { "aria-label": `Correction owner for ${entry.label}`, value: correctionOwnerByItem[entry.id] ?? "", onChange: (event) => setCorrectionOwnerByItem((value) => ({ ...value, [entry.id]: event.target.value })), children: [_jsx("option", { value: "", children: "Choose eligible owner" }), (reviews.correctionOwners ?? []).map((candidate) => _jsx("option", { value: candidate.employeeId, children: candidate.name }, candidate.employeeId))] })] }), _jsx("button", { type: "button", disabled: busy || !correctionOwnerByItem[entry.id] || reason.trim().length < 3, onClick: () => void assignCorrection(entry.id), children: "Assign correction" }), entry.correctionTaskId && _jsx("button", { type: "button", className: "client-review-secondary", disabled: busy || reason.trim().length < 3, onClick: () => void completeCorrection(entry.correctionTaskId), children: "Complete correction" })] }), entry.correctionTaskId && entry.taskId && entry.status === "REVISION_REQUIRED" && reviews.capabilities?.assignCorrection && _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => void resumeCorrection(entry.id, entry.taskId), children: "Resume after completion" })] }, entry.id))) })] }), reviews && (!reviews.capabilities?.classify || !reviews.capabilities?.assignCorrection) && _jsx("p", { className: "client-review-muted", role: "note", children: "Some workflow actions require additional project authority." })] });
}
