import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./revision.css";
const API = "/api/v1";
function statusOf(error) { return error instanceof Error ? error.status ?? 0 : 0; }
async function json(response) {
    if (!response.ok)
        throw Object.assign(new Error("request-failed"), { status: response.status });
    return response.json();
}
function errorText(error) {
    const status = statusOf(error);
    if (status === 403 || status === 404)
        return "You do not have access to this project’s drawing register.";
    if (status === 409)
        return "The register changed or this file is already attached to a revision. Refresh the register and choose another file.";
    if (status === 413)
        return "This file is larger than the server’s configured upload limit.";
    if (status >= 500)
        return "The revision service is unavailable. Try again shortly.";
    return "The revision service could not complete the request. Try again.";
}
function displayDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}
function humanSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes;
    let index = -1;
    do {
        value /= 1024;
        index += 1;
    } while (value >= 1024 && index < units.length - 1);
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}
function stateLabel(state) {
    return state === "SUPERSEDED" ? "Superseded — Do Not Use" : state.charAt(0) + state.slice(1).toLowerCase();
}
export function RevisionWorkspace({ csrfToken }) {
    const [branches, setBranches] = useState([]);
    const [branchId, setBranchId] = useState("");
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState("");
    const [requestedProjectId, setRequestedProjectId] = useState(() => new URLSearchParams(window.location.search).get("projectId") ?? "");
    const requestedProjectIdRef = useRef(requestedProjectId);
    const [files, setFiles] = useState([]);
    const [register, setRegister] = useState();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [denied, setDenied] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const requestEpoch = useRef(0);
    const [documentNumber, setDocumentNumber] = useState("");
    const [title, setTitle] = useState("");
    const [initialFileId, setInitialFileId] = useState("");
    const [initialReason, setInitialReason] = useState("");
    const [selectedDrawingId, setSelectedDrawingId] = useState("");
    const [series, setSeries] = useState("R");
    const [revisionFileId, setRevisionFileId] = useState("");
    const [revisionReason, setRevisionReason] = useState("");
    const [clientReviewDrawingId, setClientReviewDrawingId] = useState("");
    const [clientReviewReason, setClientReviewReason] = useState("");
    const [issueRevisionIds, setIssueRevisionIds] = useState([]);
    const [issueRecipientIds, setIssueRecipientIds] = useState([]);
    const [issuePurpose, setIssuePurpose] = useState("");
    const [issueReason, setIssueReason] = useState("");
    const [acknowledgementRequired, setAcknowledgementRequired] = useState(false);
    const [acknowledgementInputs, setAcknowledgementInputs] = useState({});
    const loadProject = useCallback(async (id, epoch) => {
        const [nextRegister, fileRegister] = await Promise.all([
            json(await fetch(`${API}/revisions/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" })),
            json(await fetch(`${API}/documents/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" })),
        ]);
        if (epoch !== requestEpoch.current)
            return;
        setRegister(nextRegister);
        setFiles(fileRegister.files);
        setSelectedDrawingId((current) => nextRegister.drawings.some((drawing) => drawing.id === current) ? current : nextRegister.drawings[0]?.id ?? "");
    }, []);
    const loadSetup = useCallback(async (requestedId = requestedProjectIdRef.current) => {
        const epoch = ++requestEpoch.current;
        setLoading(true);
        setError("");
        setDenied(false);
        try {
            const setup = await json(await fetch(`${API}/projects/setup`, { credentials: "include", cache: "no-store" }));
            if (epoch !== requestEpoch.current)
                return;
            const preferredBranch = setup.branches.find((branch) => branch.id === branchId) ?? setup.branches[0];
            if (!preferredBranch) {
                setBranches([]);
                setProjects([]);
                setBranchId("");
                setProjectId("");
                setFiles([]);
                setRegister(undefined);
                return;
            }
            let nextBranch = preferredBranch.id;
            let nextProjects = [];
            if (requestedId) {
                for (const branch of setup.branches) {
                    const branchProjects = [];
                    for (let offset = 0; offset <= 100_000; offset += 50) {
                        const page = await json(await fetch(`${API}/projects?branchId=${encodeURIComponent(branch.id)}&offset=${offset}&limit=50`, { credentials: "include", cache: "no-store" }));
                        if (epoch !== requestEpoch.current)
                            return;
                        branchProjects.push(...page.items);
                        if (page.items.length < 50)
                            break;
                    }
                    if (branchProjects.some((project) => project.id === requestedId)) {
                        nextBranch = branch.id;
                        nextProjects = branchProjects;
                        break;
                    }
                    if (branch.id === preferredBranch.id)
                        nextProjects = branchProjects;
                }
            }
            else {
                const page = await json(await fetch(`${API}/projects?branchId=${encodeURIComponent(nextBranch)}&offset=0&limit=50`, { credentials: "include", cache: "no-store" }));
                nextProjects = page.items;
            }
            if (epoch !== requestEpoch.current)
                return;
            const nextProject = requestedId && nextProjects.some((project) => project.id === requestedId) ? requestedId : "";
            setBranches(setup.branches);
            setBranchId(nextBranch);
            setProjects(nextProjects);
            setProjectId(nextProject);
            if (nextProject)
                await loadProject(nextProject, epoch);
            else {
                setFiles([]);
                setRegister(undefined);
            }
        }
        catch (cause) {
            if (epoch !== requestEpoch.current)
                return;
            setFiles([]);
            setRegister(undefined);
            if (statusOf(cause) === 403 || statusOf(cause) === 404)
                setDenied(true);
            else
                setError(errorText(cause));
        }
        finally {
            if (epoch === requestEpoch.current)
                setLoading(false);
        }
    }, [branchId, loadProject]);
    useEffect(() => { void loadSetup(); }, []);
    useEffect(() => {
        const onPopState = () => {
            const requested = new URLSearchParams(window.location.search).get("projectId") ?? "";
            requestedProjectIdRef.current = requested;
            setRequestedProjectId(requested);
            void loadSetup(requested);
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [loadSetup]);
    const refresh = async () => {
        if (busy)
            return;
        const epoch = ++requestEpoch.current;
        setLoading(true);
        setError("");
        setDenied(false);
        try {
            if (projectId)
                await loadProject(projectId, epoch);
            else
                await loadSetup();
        }
        catch (cause) {
            if (epoch === requestEpoch.current) {
                if (statusOf(cause) === 403 || statusOf(cause) === 404)
                    setDenied(true);
                else
                    setError(errorText(cause));
            }
        }
        finally {
            if (epoch === requestEpoch.current)
                setLoading(false);
        }
    };
    const selectBranch = async (id) => {
        const url = new URL(window.location.href);
        url.searchParams.delete("projectId");
        window.history.pushState(null, "", url);
        requestedProjectIdRef.current = "";
        setRequestedProjectId("");
        const epoch = ++requestEpoch.current;
        setBranchId(id);
        setProjectId("");
        setProjects([]);
        setFiles([]);
        setRegister(undefined);
        setLoading(true);
        setError("");
        setDenied(false);
        try {
            const page = await json(await fetch(`${API}/projects?branchId=${encodeURIComponent(id)}&offset=0&limit=50`, { credentials: "include", cache: "no-store" }));
            if (epoch !== requestEpoch.current)
                return;
            setProjects(page.items);
        }
        catch (cause) {
            if (epoch === requestEpoch.current) {
                if (statusOf(cause) === 403 || statusOf(cause) === 404)
                    setDenied(true);
                else
                    setError(errorText(cause));
            }
        }
        finally {
            if (epoch === requestEpoch.current)
                setLoading(false);
        }
    };
    const selectProject = async (id) => {
        const url = new URL(window.location.href);
        if (id)
            url.searchParams.set("projectId", id);
        else
            url.searchParams.delete("projectId");
        window.history.pushState({ revisionProjectSelection: true }, "", url);
        requestedProjectIdRef.current = id;
        setRequestedProjectId(id);
        const epoch = ++requestEpoch.current;
        setProjectId(id);
        setRegister(undefined);
        setFiles([]);
        setLoading(true);
        setError("");
        setDenied(false);
        try {
            if (!id)
                return;
            await loadProject(id, epoch);
        }
        catch (cause) {
            if (epoch === requestEpoch.current) {
                if (statusOf(cause) === 403 || statusOf(cause) === 404)
                    setDenied(true);
                else
                    setError(errorText(cause));
            }
        }
        finally {
            if (epoch === requestEpoch.current)
                setLoading(false);
        }
    };
    const post = async (url, body) => {
        await json(await fetch(url, {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body),
        }));
    };
    const createDrawing = async (event) => {
        event.preventDefault();
        if (!projectId || !register?.capabilities.createRevision || busy || !initialFileId || initialReason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await post(`${API}/revisions/projects/${encodeURIComponent(projectId)}/drawings`, {
                documentNumber: documentNumber.trim(), title: title.trim(), fileId: initialFileId, reason: initialReason.trim(),
            });
            setDocumentNumber("");
            setTitle("");
            setInitialFileId("");
            setInitialReason("");
            const epoch = ++requestEpoch.current;
            await loadProject(projectId, epoch);
            setNotice("Drawing created with immutable revision R0.");
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const addRevision = async (event) => {
        event.preventDefault();
        const drawing = register?.drawings.find((item) => item.id === selectedDrawingId);
        if (!projectId || !register?.capabilities.createRevision || !drawing || busy || !revisionFileId || revisionReason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await post(`${API}/revisions/drawings/${encodeURIComponent(drawing.id)}`, {
                fileId: revisionFileId, series, expectedVersion: drawing.version, reason: revisionReason.trim(),
            });
            setRevisionFileId("");
            setRevisionReason("");
            const epoch = ++requestEpoch.current;
            await loadProject(projectId, epoch);
            setNotice(`Revision added to ${drawing.documentNumber}. The new revision is in Working state.`);
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const requireClientReview = async (event) => {
        event.preventDefault();
        const drawing = register?.drawings.find((item) => item.id === clientReviewDrawingId);
        if (!drawing || !projectId || !register?.capabilities.selectClientReview || busy || clientReviewReason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await post(`${API}/revisions/drawings/${encodeURIComponent(drawing.id)}/client-review`, { expectedVersion: drawing.version, reason: clientReviewReason.trim() });
            setClientReviewReason("");
            setClientReviewDrawingId("");
            const epoch = ++requestEpoch.current;
            await loadProject(projectId, epoch);
            setNotice(`Client review was recorded for ${drawing.documentNumber}. Client decisions remain in S14.`);
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const issueRevisions = async (event) => {
        event.preventDefault();
        const eligibleIds = (register?.eligibleRecipients ?? []).filter((recipient) => issueRevisionIds.every((id) => recipient.revisionIds.includes(id))).map((recipient) => recipient.accountId);
        const recipientAccountIds = issueRecipientIds.filter((id) => eligibleIds.includes(id));
        if (!projectId || !register?.capabilities.issue || busy || !issueRevisionIds.length || !recipientAccountIds.length || issuePurpose.trim().length < 3 || issueReason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await post(`${API}/revisions/projects/${encodeURIComponent(projectId)}/issues`, {
                revisionIds: issueRevisionIds, recipientAccountIds, purpose: issuePurpose.trim(), reason: issueReason.trim(), acknowledgementRequired,
            });
            setIssueRevisionIds([]);
            setIssueRecipientIds([]);
            setIssuePurpose("");
            setIssueReason("");
            setAcknowledgementRequired(false);
            const epoch = ++requestEpoch.current;
            await loadProject(projectId, epoch);
            setNotice("Transmittal recorded.");
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const acknowledge = async (transmittalId) => {
        const value = acknowledgementInputs[transmittalId] ?? { reason: "", note: "" };
        if (busy || value.reason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await post(`${API}/revisions/transmittals/${encodeURIComponent(transmittalId)}/acknowledge`, { reason: value.reason.trim(), ...(value.note.trim() ? { note: value.note.trim() } : {}) });
            setAcknowledgementInputs((current) => ({ ...current, [transmittalId]: { reason: "", note: "" } }));
            const epoch = ++requestEpoch.current;
            await loadProject(projectId, epoch);
            setNotice("Transmittal acknowledged.");
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const claimedFileIds = useMemo(() => new Set(register?.drawings.flatMap((drawing) => drawing.revisions.map((revision) => revision.fileId)) ?? []), [register]);
    const availableFiles = useMemo(() => files.filter((file) => !claimedFileIds.has(file.id)), [claimedFileIds, files]);
    const selectedDrawing = register?.drawings.find((drawing) => drawing.id === selectedDrawingId);
    const issueableRevisions = register?.drawings.flatMap((drawing) => drawing.revisions.filter((revision) => revision.issueEligible).map((revision) => ({ drawing, revision }))) ?? [];
    const selectedIssueRecipients = (register?.eligibleRecipients ?? []).filter((recipient) => issueRevisionIds.length
        ? issueRevisionIds.every((revisionId) => recipient.revisionIds.includes(revisionId))
        : recipient.revisionIds.length > 0);
    const issueGateText = register?.issueBlocker || (register && !register.capabilities.issue ? "Formal issue is unavailable for this account or project." : "");
    return _jsxs("section", { className: "revision-workspace", "aria-labelledby": "revisions-heading", children: [_jsxs("header", { className: "revision-header", children: [_jsxs("div", { children: [_jsx("p", { className: "revision-eyebrow", children: "DESIGN CONTROL" }), _jsx("h1", { id: "revisions-heading", children: "Drawing register" }), _jsx("p", { children: "Revision files are retained as immutable, checksum-bound project records." })] }), _jsx("button", { type: "button", onClick: () => void refresh(), disabled: loading || busy, children: "Refresh" })] }), error && _jsxs("p", { className: "revision-error", role: "alert", children: [error, " ", _jsx("button", { type: "button", onClick: () => void refresh(), disabled: loading || busy, children: "Try again" })] }), denied && _jsx("p", { className: "revision-denied", role: "alert", children: "You are not authorized to view this project\u2019s drawing register. Ask the Owner to review your project assignment and document access." }), notice && _jsx("p", { className: "revision-notice", role: "status", children: notice }), loading && _jsx("p", { className: "revision-muted", role: "status", children: "Loading project drawing access\u2026" }), !loading && !denied && !error && _jsxs(_Fragment, { children: [branches.length ? _jsxs("label", { className: "revision-picker", children: ["Owning branch", _jsxs("select", { "aria-label": "Revision project branch", value: branchId, onChange: (event) => void selectBranch(event.target.value), disabled: busy, children: [_jsx("option", { value: "", children: "Choose branch" }), branches.map((branch) => _jsx("option", { value: branch.id, children: branch.name }, branch.id))] })] }) : _jsx("p", { className: "revision-muted", children: "No active branches are available." }), branchId && _jsxs("label", { className: "revision-picker", children: ["Project", _jsxs("select", { "aria-label": "Revision project", value: projectId, onChange: (event) => void selectProject(event.target.value), disabled: busy, children: [_jsx("option", { value: "", children: "Choose a project" }), projects.map((project) => _jsx("option", { value: project.id, children: project.title }, project.id))] })] }), !projectId && !projects.length && branchId && !requestedProjectId && _jsx("p", { className: "revision-muted", role: "status", children: "No projects are available for this branch." }), requestedProjectId && !projectId && !loading && !error && !denied && _jsx("p", { className: "revision-unavailable", role: "status", children: "The requested project is unavailable or your access has changed. Choose an authorized project." }), register && _jsxs(_Fragment, { children: [_jsxs("div", { className: "revision-register-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "revision-eyebrow", children: "REGISTER" }), _jsx("h2", { children: projects.find((project) => project.id === projectId)?.title ?? "Project drawings" })] }), _jsxs("span", { children: [register.drawings.length, " ", register.drawings.length === 1 ? "drawing" : "drawings"] })] }), issueGateText && _jsxs("aside", { className: "revision-issue-gate", "aria-label": "Formal issue gate", children: [_jsx("strong", { children: "Formal issue is gated" }), _jsx("p", { children: issueGateText }), register.drawings.some((drawing) => drawing.clientApprovalRequired || drawing.revisions.some((revision) => revision.series === "CR")) && _jsx("p", { children: "Drawings requiring client approval and CR revisions also need the exact client decision and portal evidence from S14." })] }), _jsxs("div", { className: "revision-columns", children: [_jsxs("section", { className: "revision-list", "aria-labelledby": "drawing-list-heading", children: [_jsx("h2", { id: "drawing-list-heading", children: "Drawings and revision history" }), !register.drawings.length ? _jsx("p", { className: "revision-muted", role: "status", children: "No drawings have been registered for this project." }) : register.drawings.map((drawing) => {
                                                const current = drawing.revisions.find((revision) => revision.isCurrent);
                                                return _jsxs("article", { className: "revision-drawing", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("p", { className: "revision-eyebrow", children: drawing.documentNumber }), _jsx("h3", { children: drawing.title })] }), _jsx("span", { className: "revision-current", children: current ? `Current ${current.label}` : "No current approved revision" })] }), (drawing.clientApprovalRequired || drawing.revisions.some((revision) => revision.series === "CR")) && _jsx("p", { className: "revision-client-gate", children: "Client approval is required before formal issue. Exact client decisions and portal evidence belong to S14." }), register.capabilities.selectClientReview && !drawing.clientApprovalRequired && (clientReviewDrawingId === drawing.id ? _jsxs("form", { className: "revision-client-review-form", onSubmit: (event) => void requireClientReview(event), children: [_jsxs("label", { children: ["Reason for requiring client review", _jsx("input", { "aria-label": `Client review reason for ${drawing.documentNumber}`, value: clientReviewReason, onChange: (event) => setClientReviewReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { className: "revision-primary", type: "submit", disabled: busy || clientReviewReason.trim().length < 3, children: busy ? "Saving…" : "Confirm client review requirement" }), _jsx("button", { type: "button", onClick: () => { setClientReviewDrawingId(""); setClientReviewReason(""); }, disabled: busy, children: "Cancel" })] }) : _jsx("button", { className: "revision-secondary", type: "button", onClick: () => setClientReviewDrawingId(drawing.id), children: "Require client review" })), !current && _jsx("p", { className: "revision-muted", children: "No approved revision is current. New revisions remain Working until the review workflow in S13 is available." }), !drawing.revisions.length ? _jsx("p", { className: "revision-muted", children: "No revisions are available." }) : _jsx("ol", { className: "revision-history", children: drawing.revisions.map((revision) => _jsxs("li", { className: revision.isCurrent ? "is-current" : "", children: [_jsxs("div", { className: "revision-item-heading", children: [_jsx("strong", { children: revision.label }), _jsx("span", { className: `revision-state revision-state-${revision.state.toLowerCase()}`, children: stateLabel(revision.state) })] }), _jsxs("p", { children: [revision.fileName, " \u00B7 ", humanSize(revision.sizeBytes), " \u00B7 ", displayDate(revision.createdAt)] }), _jsxs("p", { className: "revision-reason", children: ["Reason: ", revision.reason] }), _jsxs("p", { className: "revision-checksum", children: ["SHA-256 ", revision.sha256] }), revision.issueBlocker && _jsxs("p", { className: "revision-client-gate", children: ["Issue unavailable: ", revision.issueBlocker] }), revision.state === "SUPERSEDED" && _jsx("p", { className: "revision-superseded", children: "Superseded \u2014 Do Not Use" }), _jsx("a", { href: `${API}/revisions/${encodeURIComponent(revision.id)}/stream`, className: "revision-download", children: "Download retained revision" })] }, revision.id)) })] }, drawing.id);
                                            })] }), _jsxs("div", { className: "revision-forms", children: [register.capabilities.createRevision && _jsxs("form", { className: "revision-panel revision-form", onSubmit: (event) => void createDrawing(event), children: [_jsx("h2", { children: "Create drawing" }), _jsx("p", { className: "revision-muted", children: "The selected file becomes the immutable initial revision R0." }), _jsxs("label", { children: ["Document number", _jsx("input", { "aria-label": "Drawing document number", value: documentNumber, onChange: (event) => setDocumentNumber(event.target.value), maxLength: 80, required: true })] }), _jsxs("label", { children: ["Drawing title", _jsx("input", { "aria-label": "Drawing title", value: title, onChange: (event) => setTitle(event.target.value), maxLength: 160, required: true })] }), _jsxs("label", { children: ["Initial file", _jsxs("select", { "aria-label": "Drawing file", value: initialFileId, onChange: (event) => setInitialFileId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an available project file" }), availableFiles.map((file) => _jsxs("option", { value: file.id, children: [file.fileName, " \u00B7 ", humanSize(file.sizeBytes)] }, file.id))] })] }), _jsxs("label", { children: ["Revision reason", _jsx("input", { "aria-label": "Initial revision reason", value: initialReason, onChange: (event) => setInitialReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("p", { className: "revision-client-gate", children: "Client approval is required for formal issue." }), _jsx("button", { className: "revision-primary", type: "submit", disabled: busy || !documentNumber.trim() || !title.trim() || !initialFileId || initialReason.trim().length < 3, children: busy ? "Saving…" : "Create drawing as R0" }), !availableFiles.length && _jsx("p", { className: "revision-muted", children: "Upload an unclaimed file in Project documents before creating a drawing." })] }), register.capabilities.createRevision && !!register.drawings.length && _jsxs("form", { className: "revision-panel revision-form", onSubmit: (event) => void addRevision(event), children: [_jsx("h2", { children: "Add revision" }), _jsx("p", { className: "revision-muted", children: "Revision labels are assigned automatically and cannot replace prior files." }), _jsxs("label", { children: ["Drawing", _jsxs("select", { "aria-label": "Drawing to revise", value: selectedDrawingId, onChange: (event) => setSelectedDrawingId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose a drawing" }), register.drawings.map((drawing) => _jsxs("option", { value: drawing.id, children: [drawing.documentNumber, " \u00B7 ", drawing.title] }, drawing.id))] })] }), _jsxs("label", { children: ["Revision series", _jsxs("select", { "aria-label": "Revision series", value: series, onChange: (event) => setSeries(event.target.value), children: [_jsx("option", { value: "R", children: "Internal revision (R)" }), _jsx("option", { value: "CR", children: "Client review revision (CR)" })] })] }), _jsxs("label", { children: ["Revision file", _jsxs("select", { "aria-label": "Revision file", value: revisionFileId, onChange: (event) => setRevisionFileId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an available project file" }), availableFiles.map((file) => _jsxs("option", { value: file.id, children: [file.fileName, " \u00B7 ", humanSize(file.sizeBytes)] }, file.id))] })] }), _jsxs("label", { children: ["Revision reason", _jsx("input", { "aria-label": "Append revision reason", value: revisionReason, onChange: (event) => setRevisionReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { className: "revision-primary", type: "submit", disabled: busy || !selectedDrawing || !revisionFileId || revisionReason.trim().length < 3, children: busy ? "Saving…" : "Add revision" }), selectedDrawing && _jsxs("p", { className: "revision-muted", children: ["Current register version: ", selectedDrawing.version, ". A new revision remains Working and does not become current."] }), !availableFiles.length && _jsx("p", { className: "revision-muted", children: "No unclaimed project files are available for a new revision." })] })] })] }), register.capabilities.issue && _jsxs("form", { className: "revision-panel revision-issue-form", onSubmit: (event) => void issueRevisions(event), children: [_jsxs("div", { children: [_jsx("p", { className: "revision-eyebrow", children: "FORMAL ISSUE" }), _jsx("h2", { children: "Create transmittal" })] }), _jsx("p", { className: "revision-muted", children: "Only exact current approved revisions can be issued. Sending client-review material and recording client decisions remain in S14." }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Approved current revisions" }), issueableRevisions.length ? issueableRevisions.map(({ drawing, revision }) => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: issueRevisionIds.includes(revision.id), onChange: (event) => setIssueRevisionIds((current) => event.target.checked ? [...current, revision.id] : current.filter((id) => id !== revision.id)) }), " ", drawing.documentNumber, " \u00B7 ", drawing.title, " \u00B7 ", revision.label] }, revision.id)) : _jsx("p", { className: "revision-muted", children: "No current approved revisions are eligible to issue." })] }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Named recipients" }), selectedIssueRecipients.length ? selectedIssueRecipients.map((recipient) => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: issueRecipientIds.includes(recipient.accountId), onChange: (event) => setIssueRecipientIds((current) => event.target.checked ? [...current, recipient.accountId] : current.filter((id) => id !== recipient.accountId)) }), " ", recipient.name] }, recipient.accountId)) : _jsx("p", { className: "revision-muted", children: "Choose revisions to see people who can access each selected file." })] }), _jsxs("label", { children: ["Transmittal purpose", _jsx("input", { value: issuePurpose, onChange: (event) => setIssuePurpose(event.target.value), minLength: 3, maxLength: 500, required: true })] }), _jsxs("label", { children: ["Issue reason", _jsx("input", { value: issueReason, onChange: (event) => setIssueReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsxs("label", { className: "revision-checkbox", children: [_jsx("input", { type: "checkbox", checked: acknowledgementRequired, onChange: (event) => setAcknowledgementRequired(event.target.checked) }), " Require acknowledgement"] }), _jsx("button", { className: "revision-primary", type: "submit", disabled: busy || !issueRevisionIds.length || !issueRecipientIds.some((id) => selectedIssueRecipients.some((recipient) => recipient.accountId === id)) || issuePurpose.trim().length < 3 || issueReason.trim().length < 3, children: busy ? "Issuing…" : "Issue selected revisions" })] }), _jsxs("section", { className: "revision-panel revision-transmittals", "aria-labelledby": "transmittals-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "revision-eyebrow", children: "ISSUE HISTORY" }), _jsx("h2", { id: "transmittals-heading", children: "Transmittals" })] }), !register.transmittals.length ? _jsx("p", { className: "revision-muted", role: "status", children: "No transmittals have been issued for this project. Formal issue remains gated until the required review evidence is available." }) : _jsx("ul", { className: "revision-transmittal-list", children: register.transmittals.map((transmittal) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: transmittal.purpose }), _jsxs("small", { children: ["Issued ", displayDate(transmittal.issuedAt), " \u00B7 Sender ", transmittal.senderName ?? "Authorized sender"] }), _jsxs("small", { children: [transmittal.items.length, " document ", transmittal.items.length === 1 ? "item" : "items", ": ", transmittal.items.map((item) => item.label).join(", ")] })] }), _jsx("ul", { children: transmittal.recipients.map((recipient) => _jsxs("li", { children: [_jsx("span", { children: recipient.name ?? "Named recipient" }), _jsxs("span", { children: [recipient.acknowledgementRequired ? recipient.acknowledgedAt ? `Acknowledged ${displayDate(recipient.acknowledgedAt)}` : "Acknowledgement required · pending" : "Acknowledgement not required", recipient.note ? ` · ${recipient.note}` : ""] })] }, recipient.accountId)) }), transmittal.canAcknowledge && _jsxs("div", { className: "revision-acknowledge", children: [_jsxs("label", { children: ["Acknowledgement reason", _jsx("input", { value: acknowledgementInputs[transmittal.id]?.reason ?? "", onChange: (event) => setAcknowledgementInputs((current) => ({ ...current, [transmittal.id]: { reason: event.target.value, note: current[transmittal.id]?.note ?? "" } })), minLength: 3, maxLength: 1000, required: true })] }), _jsxs("label", { children: ["Acknowledgement note", _jsx("input", { value: acknowledgementInputs[transmittal.id]?.note ?? "", onChange: (event) => setAcknowledgementInputs((current) => ({ ...current, [transmittal.id]: { reason: current[transmittal.id]?.reason ?? "", note: event.target.value } })), maxLength: 1000 })] }), _jsx("button", { type: "button", onClick: () => void acknowledge(transmittal.id), disabled: busy || (acknowledgementInputs[transmittal.id]?.reason.trim().length ?? 0) < 3, children: busy ? "Saving…" : "Acknowledge transmittal" })] })] }, transmittal.id)) })] })] })] })] });
}
