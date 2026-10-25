import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import "./site.css";
import { SiteOfflineCapture } from "./site-offline-capture.js";
import { clearOfflinePointer, purgeOfflineAccount, purgeOfflineProject, purgeOfflineProjectPhotos, readOfflinePointer } from "./site-offline.js";
import { useWindowSearchParams } from "./use-window-search-params.js";
const API = "/api/v1/site";
const DOCS = "/api/v1/documents";
function statusOf(error) { return error instanceof Error ? error.status ?? 0 : 0; }
async function json(response) { if (!response.ok)
    throw Object.assign(new Error("request-failed"), { status: response.status }); return response.json(); }
function message(error) {
    const status = statusOf(error);
    if (status === 403 || status === 404)
        return "You no longer have access to this project or action. Refresh the project list to check current access.";
    if (status === 409)
        return "This project changed while you were working. The current project was refreshed; review its latest version before trying again.";
    if (status >= 500)
        return "The site service is unavailable. Try again shortly.";
    return "The request could not be completed. Check the current record and try again.";
}
const blankReport = () => ({ workCompleted: "", manpowerTrade: "", manpowerCount: "", materialsReceived: "", issues: "", delayCauses: "", tomorrowPlan: "", photoIds: [] });
const evidenceLabel = (item) => item.hidden ? item.indication ?? "Evidence is retained but unavailable to this account." : item.name ?? "Authorized photo evidence";
export function SiteWorkspace({ csrfToken, accountId }) {
    const [searchParams, setSearchParams] = useWindowSearchParams();
    const requestedProjectId = searchParams.get("projectId") ?? "";
    const requestedRecordKind = searchParams.get("recordKind") ?? "";
    const requestedRecordId = searchParams.get("recordId") ?? "";
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState(() => new URLSearchParams(window.location.search).get("projectId") ?? "");
    const [unavailableRequestedProject, setUnavailableRequestedProject] = useState(false);
    const [detail, setDetail] = useState();
    const [documents, setDocuments] = useState([]);
    const [documentsError, setDocumentsError] = useState("");
    const [offlineFolders, setOfflineFolders] = useState([]);
    const [canUploadOfflinePhotos, setCanUploadOfflinePhotos] = useState(false);
    const [clearingOfflinePhotos, setClearingOfflinePhotos] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const epoch = useRef(0);
    const [reason, setReason] = useState("");
    const [report, setReport] = useState(blankReport);
    const [manpower, setManpower] = useState({ date: "", trade: "", count: "", note: "", employeeAccountIds: [] });
    const [packageDraft, setPackageDraft] = useState({ title: "", date: "", tomorrowPlan: "", plannedPercent: "", plannedQuantity: "", unit: "", critical: false });
    const [packagePhotoIds, setPackagePhotoIds] = useState([]);
    const [snagDraft, setSnagDraft] = useState({ title: "", description: "", packageId: "" });
    const [snagPhotoIds, setSnagPhotoIds] = useState([]);
    const [responsibleAccountId, setResponsibleAccountId] = useState("");
    const [snagAction, setSnagAction] = useState({});
    const current = useRef(undefined);
    const projectIdRef = useRef(new URLSearchParams(window.location.search).get("projectId") ?? "");
    const selectedSiteRecord = detail && requestedRecordId ? requestedRecordKind === "PACKAGE" ? detail.packages.find(item => item.id === requestedRecordId)
        : requestedRecordKind === "REPORT" ? detail.reports.find(item => item.id === requestedRecordId)
            : requestedRecordKind === "SNAG" ? detail.snags.find(item => item.id === requestedRecordId)
                : requestedRecordKind === "MANPOWER" ? detail.manpower.find(item => item.id === requestedRecordId)
                    : requestedRecordKind === "NOTE" ? detail.notes?.find(item => item.id === requestedRecordId)
                        : requestedRecordKind === "HANDOVER" ? detail.handovers.find(item => item.id === requestedRecordId) : undefined : undefined;
    useEffect(() => {
        if (!requestedRecordId || !detail || detail.project.id !== projectId)
            return;
        if (!selectedSiteRecord)
            return;
        document.getElementById(`site-record-${requestedRecordKind}-${requestedRecordId}`)?.focus();
    }, [detail, projectId, requestedRecordId, requestedRecordKind, selectedSiteRecord]);
    const loadDetail = useCallback(async (id, request) => {
        let next;
        try {
            next = await json(await fetch(`${API}/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }));
        }
        catch (cause) {
            const status = statusOf(cause);
            if (status === 401 || status === 403 || status === 404) {
                const pointer = readOfflinePointer();
                if (pointer?.accountId === accountId && pointer.projectId === id)
                    clearOfflinePointer(accountId);
                await purgeOfflineProject(accountId, id).catch(() => undefined);
            }
            throw cause;
        }
        if (request !== epoch.current)
            return;
        current.current = next;
        setDetail(next);
        setDocumentsError("");
        try {
            const fileResult = await json(await fetch(`${DOCS}/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }));
            if (request !== epoch.current)
                return;
            setDocuments(fileResult.files.filter((file) => file.mimeType.startsWith("image/")).map((file) => ({ documentId: file.id, sha256: file.sha256, name: file.fileName, mimeType: file.mimeType })));
            setOfflineFolders((fileResult.folders ?? []).filter((folder) => folder.offlineUploadAllowed === true));
            setCanUploadOfflinePhotos(fileResult.capabilities?.upload === true);
            if (fileResult.capabilities?.upload === false) {
                setClearingOfflinePhotos(true);
                await purgeOfflineProjectPhotos(accountId, id).catch(() => undefined);
                setClearingOfflinePhotos(false);
            }
        }
        catch (cause) {
            if (request !== epoch.current)
                return;
            const documentStatus = statusOf(cause);
            if (documentStatus === 401 || documentStatus === 403 || documentStatus === 404) {
                setClearingOfflinePhotos(true);
                await purgeOfflineProjectPhotos(accountId, id).catch(() => undefined);
                setClearingOfflinePhotos(false);
            }
            setDocuments([]);
            setOfflineFolders([]);
            setCanUploadOfflinePhotos(false);
            setDocumentsError(documentStatus === 401 || documentStatus === 403 || documentStatus === 404
                ? "Document access is unavailable. Offline commands containing photos were discarded; photo selection is unavailable until document access is restored."
                : "Authorized evidence files could not be loaded. Site records remain available; photo selection is unavailable until document access is restored.");
        }
    }, [accountId]);
    const loadProjects = useCallback(async () => {
        const request = ++epoch.current;
        setLoading(true);
        setError("");
        try {
            const result = await json(await fetch(`${API}/projects`, { credentials: "include", cache: "no-store" }));
            if (request !== epoch.current)
                return;
            const active = result.items.filter((item) => item.status === "ACTIVE");
            const pointer = readOfflinePointer();
            if (pointer?.accountId === accountId && !active.some((item) => item.id === pointer.projectId)) {
                await purgeOfflineProject(accountId, pointer.projectId).catch(() => undefined);
                clearOfflinePointer(accountId);
            }
            setProjects(active);
            const selectedId = projectIdRef.current;
            const nextId = active.some((item) => item.id === selectedId) ? selectedId : "";
            setUnavailableRequestedProject(!!selectedId && !nextId);
            projectIdRef.current = nextId;
            setProjectId(nextId);
            if (nextId)
                await loadDetail(nextId, request);
            else {
                current.current = undefined;
                setDetail(undefined);
                setDocuments([]);
                setOfflineFolders([]);
                setCanUploadOfflinePhotos(false);
                setDocumentsError("");
            }
        }
        catch (cause) {
            if (request === epoch.current) {
                current.current = undefined;
                setProjects([]);
                setDetail(undefined);
                setError(message(cause));
                const status = statusOf(cause);
                if (status === 401 || status === 403 || status === 404) {
                    clearOfflinePointer(accountId);
                    window.dispatchEvent(new Event("sense-session-ended"));
                    await purgeOfflineAccount(accountId).catch(() => undefined);
                }
            }
        }
        finally {
            if (request === epoch.current)
                setLoading(false);
        }
    }, [loadDetail]);
    useEffect(() => { void loadProjects(); return () => { epoch.current++; }; }, [loadProjects]);
    const selectProject = useCallback(async (id) => {
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            if (id)
                next.set("projectId", id);
            else
                next.delete("projectId");
            if (id !== projectIdRef.current) {
                next.delete("recordKind");
                next.delete("recordId");
            }
            return next;
        });
        setUnavailableRequestedProject(false);
        const request = ++epoch.current;
        projectIdRef.current = id;
        setProjectId(id);
        setDetail(undefined);
        current.current = undefined;
        setDocuments([]);
        setOfflineFolders([]);
        setCanUploadOfflinePhotos(false);
        setDocumentsError("");
        setError("");
        setNotice("");
        if (!id)
            return;
        setLoading(true);
        try {
            await loadDetail(id, request);
        }
        catch (cause) {
            if (request === epoch.current)
                setError(message(cause));
        }
        finally {
            if (request === epoch.current)
                setLoading(false);
        }
    }, [loadDetail, setSearchParams]);
    useEffect(() => {
        if (requestedProjectId !== projectIdRef.current)
            void selectProject(requestedProjectId);
    }, [requestedProjectId, selectProject]);
    const refresh = async () => {
        if (busy)
            return;
        const request = ++epoch.current;
        setLoading(true);
        setError("");
        try {
            if (projectId)
                await loadDetail(projectId, request);
            else
                await loadProjects();
        }
        catch (cause) {
            if (request === epoch.current) {
                current.current = undefined;
                setDetail(undefined);
                setError(message(cause));
            }
        }
        finally {
            if (request === epoch.current)
                setLoading(false);
        }
    };
    const post = async (path, body) => {
        await json(await fetch(`${API}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }));
    };
    const mutate = async (path, version, body, success) => {
        if (busy || !projectId || reason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await post(path, { ...body, expectedVersion: version, reason: reason.trim() });
            setReason("");
            await refreshAfterMutation(success);
        }
        catch (cause) {
            setError(message(cause));
            if (statusOf(cause) === 409)
                await refreshAfterMutation("");
        }
        finally {
            setBusy(false);
        }
    };
    const refreshAfterMutation = async (success) => {
        const request = ++epoch.current;
        try {
            await loadDetail(projectId, request);
            if (request === epoch.current)
                setNotice(success);
        }
        catch (cause) {
            if (request === epoch.current) {
                current.current = undefined;
                setDetail(undefined);
                setError(message(cause));
            }
        }
    };
    const actionsFor = (snag) => snagAction[snag.id] ?? { fixer: "", verifier: "", note: "", photoIds: [], outcome: "PASSED" };
    const updateSnag = (id, change) => setSnagAction((all) => ({ ...all, [id]: { ...actionsFor({ id }), ...change } }));
    const photoPicker = (label, selected, onChange) => _jsxs("fieldset", { className: "site-photos", children: [_jsx("legend", { children: label }), documentsError ? _jsx("p", { role: "status", children: documentsError }) : documents.length === 0 ? _jsx("p", { role: "status", children: "No authorized image evidence is available for this project." }) : documents.map((file) => _jsxs("label", { children: [_jsx("input", { type: "checkbox", name: "photoIds", value: file.documentId, checked: selected.includes(file.documentId), onChange: (event) => onChange(event.target.checked ? [...selected, file.documentId] : selected.filter((id) => id !== file.documentId)) }), file.name, " \u00B7 ", file.mimeType] }, file.documentId))] });
    return _jsxs("main", { className: "site-workspace", "aria-labelledby": "site-title", children: [_jsxs("header", { className: "site-workspace-header", children: [_jsxs("div", { children: [_jsx("p", { className: "site-eyebrow", children: "TURNKEY \u00B7 SITE DELIVERY" }), _jsx("h1", { id: "site-title", children: "Site progress and daily work" }), _jsx("p", { children: "Record site observations, retain named decisions, and review current evidence." })] }), _jsx("button", { type: "button", className: "site-secondary", onClick: () => void refresh(), disabled: busy || loading, children: "Refresh" })] }), error && _jsx("p", { className: "site-error", role: "alert", children: error }), notice && _jsx("p", { className: "site-notice", role: "status", children: notice }), documentsError && _jsx("p", { className: "site-note", role: "status", children: documentsError }), _jsxs("label", { className: "site-project-picker", children: ["Active Turnkey project", _jsxs("select", { "aria-label": "Active Turnkey project", disabled: busy, value: projectId, onChange: (event) => void selectProject(event.target.value), children: [_jsx("option", { value: "", children: "Choose a project" }), projects.map((project) => _jsxs("option", { value: project.id, children: [project.title, " \u00B7 ", project.branchName] }, project.id))] })] }), !loading && !error && unavailableRequestedProject && _jsx("p", { className: "site-error", role: "status", children: "The requested site project is unavailable or your access has changed. Choose an authorized active Turnkey project." }), !loading && !error && requestedRecordId && detail && !selectedSiteRecord && _jsx("p", { className: "site-error", role: "status", children: "The requested site record is unavailable in the current project context." }), loading && _jsx("p", { role: "status", className: "site-note", children: "Loading current site records\u2026" }), !loading && !error && !detail && _jsx("p", { role: "status", className: "site-empty", children: projects.length ? "Choose an active Turnkey project to review its site records." : "No active Turnkey projects are available to you." }), detail && _jsxs(_Fragment, { children: [_jsxs("label", { className: "site-reason", children: ["Reason for the next site action", _jsx("input", { minLength: 3, maxLength: 1000, value: reason, onChange: (e) => setReason(e.target.value), required: true })] }), detail.capabilities.manage && _jsxs("form", { className: "site-form site-responsible", onSubmit: (event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/responsible`, detail.version, { accountId: responsibleAccountId }, "Site responsible person appointed; the appointment does not grant project access."); }, children: [_jsxs("label", { children: ["Appoint the responsible person", _jsxs("select", { value: responsibleAccountId, onChange: (e) => setResponsibleAccountId(e.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an already assigned person" }), detail.people.filter((person) => person.canWork).map((person) => _jsx("option", { value: person.accountId, children: person.label }, person.accountId))] })] }), _jsx("button", { disabled: busy || reason.trim().length < 3 || !responsibleAccountId, children: "Appoint responsible person" })] }), _jsxs("section", { className: "site-overview", "aria-labelledby": "site-overview-title", children: [_jsxs("div", { className: "site-overview-heading", children: [_jsxs("div", { children: [_jsxs("p", { className: "site-eyebrow", children: [detail.project.status, " \u00B7 VERSION ", detail.version] }), _jsx("h2", { id: "site-overview-title", children: detail.project.title }), _jsxs("p", { children: ["Responsible person: ", detail.responsible?.label ?? "Not appointed"] })] }), _jsxs("p", { children: [_jsx("strong", { children: "Today" }), " ", detail.today, _jsx("br", {}), _jsx("strong", { children: "Tomorrow" }), " ", detail.tomorrow] })] }), _jsxs("div", { className: "site-dashboard", children: [_jsxs("article", { children: [_jsx("h3", { children: "Today\u2019s work" }), _jsx("p", { children: detail.packages.filter((item) => item.data.date === detail.today).map((item) => item.data.title).join(", ") || "No work package scheduled today." })] }), _jsxs("article", { children: [_jsx("h3", { children: "Tomorrow\u2019s plan" }), _jsx("p", { children: detail.packages.map((item) => item.data.tomorrowPlan).filter(Boolean).join(" · ") || "No plan recorded." })] }), _jsxs("article", { children: [_jsx("h3", { children: "Workers today" }), _jsxs("p", { children: [detail.workforce.count, " assigned people \u00B7 ", detail.manpower.filter((item) => item.data.date === detail.today).reduce((n, item) => n + item.data.count, 0), " manual trade count"] }), _jsx("small", { children: "Attendance and reported manpower are separate records." })] }), _jsxs("article", { children: [_jsx("h3", { children: "Progress and quality" }), _jsxs("p", { children: [detail.packages.filter((item) => item.data.actualPercent !== null).length, " packages with reported progress \u00B7 ", detail.packages.filter((item) => item.data.qualityStatus === "PENDING").length, " quality checks pending"] })] }), _jsxs("article", { children: [_jsx("h3", { children: "Photos and evidence" }), _jsxs("p", { children: [detail.packages.reduce((n, item) => n + item.data.photoEvidence.length, 0) + detail.reports.reduce((n, item) => n + item.data.photoEvidence.length, 0), " attached evidence items"] })] }), _jsxs("article", { children: [_jsx("h3", { children: "Snags" }), _jsxs("p", { children: [detail.snags.filter((item) => item.state !== "CLOSED").length, " open \u00B7 ", detail.snags.filter((item) => item.state === "READY_FOR_VERIFICATION").length, " awaiting independent verification"] })] }), _jsxs("article", { children: [_jsx("h3", { children: "Site approvals" }), _jsxs("p", { children: [detail.reports.filter((item) => item.state === "DRAFT").length, " reports awaiting responsible-person confirmation \u00B7 ", detail.packages.filter((item) => item.data.actualPercent !== null).length, " current progress entries"] })] }), _jsxs("article", { children: [_jsx("h3", { children: "Pending decisions" }), _jsxs("p", { children: [detail.snags.filter((item) => item.state === "VERIFIED").length, " verified snags awaiting management closure \u00B7 ", detail.packages.filter((item) => item.state === "OPEN" && item.data.actualPercent !== null).length, " packages with reported progress"] })] }), _jsxs("article", { children: [_jsx("h3", { children: "Materials" }), _jsxs("p", { children: [detail.materials.length, " released Turnkey material sets \u00B7 costs remain in Turnkey approvals."] })] }), _jsxs("article", { children: [_jsx("h3", { children: "Blockers" }), _jsx("p", { children: detail.packages.map((item) => item.data.blockers).filter(Boolean).join(" · ") || "No blockers reported." })] }), _jsxs("article", { className: "site-critical", children: [_jsx("h3", { children: "Critical activities" }), _jsx("p", { children: detail.packages.filter((item) => item.data.critical).map((item) => item.data.title).join(", ") || "No critical work package is flagged." })] })] })] }), !clearingOfflinePhotos && _jsx(SiteOfflineCapture, { accountId: accountId, projectId: projectId, projectTitle: detail.project.title, csrfToken: csrfToken, today: detail.today, canWork: detail.capabilities.work, canUpload: canUploadOfflinePhotos, packages: detail.packages, folders: offlineFolders, onAccessLost: () => { current.current = undefined; setDetail(undefined); setDocuments([]); setError("Current site access could not be confirmed. Offline project content was removed; refresh after reviewing access."); }, onSynced: () => { void refresh(); } }, projectId), detail.notes && _jsxs("section", { className: "site-panel", children: [_jsx("h2", { children: "Site notes" }), detail.notes.length === 0 ? _jsx("p", { role: "status", children: "No site notes have synchronized for this project." }) : detail.notes.map((item) => _jsxs("article", { id: `site-record-NOTE-${item.id}`, tabIndex: requestedRecordKind === "NOTE" && requestedRecordId === item.id ? -1 : undefined, className: "site-record", children: [_jsx("p", { children: item.data.note }), item.data.photoEvidence.length > 0 && _jsxs("p", { children: ["Photos: ", item.data.photoEvidence.map(evidenceLabel).join(", ")] })] }, item.id))] }), detail.capabilities.manage && _jsxs("section", { className: "site-panel", children: [_jsx("h2", { children: "Plan a work package" }), _jsxs("form", { className: "site-form", onSubmit: (event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/packages`, detail.version, { ...packageDraft, plannedPercent: packageDraft.plannedPercent.trim(), plannedQuantity: packageDraft.plannedQuantity.trim() }, "Work package saved."); }, children: [_jsxs("label", { children: ["Package title", _jsx("input", { required: true, maxLength: 160, value: packageDraft.title, onChange: (e) => setPackageDraft({ ...packageDraft, title: e.target.value }) })] }), _jsxs("label", { children: ["Work date", _jsx("input", { type: "date", required: true, value: packageDraft.date, onChange: (e) => setPackageDraft({ ...packageDraft, date: e.target.value }) })] }), _jsxs("label", { children: ["Planned progress (%)", _jsx("input", { type: "number", min: "0", max: "100", step: "0.01", required: true, value: packageDraft.plannedPercent, onChange: (e) => setPackageDraft({ ...packageDraft, plannedPercent: e.target.value }) })] }), _jsxs("label", { children: ["Planned quantity", _jsx("input", { inputMode: "decimal", required: true, value: packageDraft.plannedQuantity, onChange: (e) => setPackageDraft({ ...packageDraft, plannedQuantity: e.target.value }) })] }), _jsxs("label", { children: ["Quantity unit", _jsx("input", { required: true, maxLength: 40, value: packageDraft.unit, onChange: (e) => setPackageDraft({ ...packageDraft, unit: e.target.value }) })] }), _jsxs("label", { children: ["Plan for tomorrow", _jsx("textarea", { maxLength: 2000, value: packageDraft.tomorrowPlan, onChange: (e) => setPackageDraft({ ...packageDraft, tomorrowPlan: e.target.value }) })] }), _jsxs("label", { className: "site-check", children: [_jsx("input", { type: "checkbox", checked: packageDraft.critical, onChange: (e) => setPackageDraft({ ...packageDraft, critical: e.target.checked }) }), "Critical activity"] }), _jsx("button", { disabled: busy || reason.trim().length < 3 || !packageDraft.title.trim() || !packageDraft.date || !packageDraft.plannedPercent || !packageDraft.plannedQuantity || !packageDraft.unit.trim(), children: "Create package" })] })] }), _jsxs("section", { className: "site-panel", children: [_jsx("h2", { children: "Work packages" }), detail.packages.length === 0 && _jsx("p", { role: "status", children: "No site work packages have been created." }), detail.packages.map((item) => _jsxs("article", { id: `site-record-PACKAGE-${item.id}`, tabIndex: requestedRecordKind === "PACKAGE" && requestedRecordId === item.id ? -1 : undefined, className: "site-record", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h3", { children: item.data.title }), _jsxs("p", { children: [item.data.date, " \u00B7 ", item.state, " \u00B7 version ", item.version, item.data.critical ? " · CRITICAL" : ""] })] }), _jsx("span", { className: `site-state site-state-${item.state.toLowerCase()}`, children: item.state })] }), _jsxs("dl", { className: "site-facts", children: [_jsxs("div", { children: [_jsx("dt", { children: "Planned" }), _jsxs("dd", { children: [item.data.plannedPercent, "% \u00B7 ", item.data.plannedQuantity, " ", item.data.unit] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Actual" }), _jsxs("dd", { children: [item.data.actualPercent ?? "Not reported", item.data.actualPercent !== null ? "%" : "", " \u00B7 ", item.data.actualQuantity ?? "Not reported", " ", item.data.unit] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Quality / materials" }), _jsxs("dd", { children: [item.data.qualityStatus, " / ", item.data.materialStatus] })] })] }), item.data.blockers && _jsxs("p", { children: [_jsx("strong", { children: "Blockers:" }), " ", item.data.blockers] }), item.data.photoEvidence.length > 0 && _jsxs("p", { children: [_jsx("strong", { children: "Evidence:" }), " ", item.data.photoEvidence.map(evidenceLabel).join(", ")] }), detail.capabilities.work && _jsxs("form", { className: "site-form", onSubmit: (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void mutate(`/packages/${encodeURIComponent(item.id)}/progress`, detail.version, { actualPercent: String(form.get("actualPercent")), actualQuantity: String(form.get("actualQuantity")), qualityStatus: String(form.get("qualityStatus")), materialStatus: String(form.get("materialStatus")), blockers: String(form.get("blockers")), tomorrowPlan: String(form.get("tomorrowPlan")), photoIds: packagePhotoIds }, "Progress observation saved."); }, children: [_jsx("h4", { children: "Report current progress" }), _jsxs("label", { children: ["Actual progress (%)", _jsx("input", { name: "actualPercent", type: "number", min: "0", max: "100", step: "0.01", defaultValue: item.data.actualPercent ?? "", required: true })] }), _jsxs("label", { children: ["Actual quantity", _jsx("input", { name: "actualQuantity", inputMode: "decimal", defaultValue: item.data.actualQuantity ?? "", required: true })] }), _jsxs("label", { children: ["Quality status", _jsxs("select", { name: "qualityStatus", defaultValue: item.data.qualityStatus, children: [_jsx("option", { children: "PENDING" }), _jsx("option", { children: "PASSED" }), _jsx("option", { children: "FAILED" })] })] }), _jsxs("label", { children: ["Material status", _jsx("input", { name: "materialStatus", defaultValue: item.data.materialStatus, required: true })] }), _jsxs("label", { children: ["Blockers", _jsx("textarea", { name: "blockers", defaultValue: item.data.blockers })] }), _jsxs("label", { children: ["Plan for tomorrow", _jsx("textarea", { name: "tomorrowPlan", defaultValue: item.data.tomorrowPlan })] }), photoPicker("Attach authorized image evidence", packagePhotoIds, setPackagePhotoIds), _jsx("button", { disabled: busy || reason.trim().length < 3, children: "Save progress" })] }), detail.capabilities.manage && item.state === "OPEN" && _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => void mutate(`/packages/${encodeURIComponent(item.id)}/complete`, detail.version, {}, "Package completion decision recorded."), children: "Decide package complete" })] }, item.id))] }), _jsxs("section", { className: "site-panel", children: [_jsx("h2", { children: "Manpower and attendance" }), _jsx("p", { children: "Manual trade counts are site observations. Workforce attendance is displayed separately." }), _jsxs("p", { children: ["Assigned attendance today: ", detail.workforce.attendance.map((person) => `${person.label} (${person.state.toLowerCase()}, ${person.mode.toLowerCase()}${person.provisional ? ", provisional" : ""})`).join(" · ") || "No relevant attendance records."] }), detail.capabilities.work && _jsxs("form", { className: "site-form", onSubmit: (event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/manpower`, detail.version, { date: manpower.date, trade: manpower.trade.trim(), count: Number(manpower.count), employeeAccountIds: manpower.employeeAccountIds, note: manpower.note.trim() }, "Manpower observation saved."); }, children: [_jsx("h3", { children: "Record a trade count" }), _jsxs("label", { children: ["Date", _jsx("input", { type: "date", required: true, value: manpower.date, onChange: (e) => setManpower({ ...manpower, date: e.target.value }) })] }), _jsxs("label", { children: ["Trade", _jsx("input", { required: true, maxLength: 120, value: manpower.trade, onChange: (e) => setManpower({ ...manpower, trade: e.target.value }) })] }), _jsxs("label", { children: ["People counted", _jsx("input", { type: "number", min: "0", step: "1", required: true, value: manpower.count, onChange: (e) => setManpower({ ...manpower, count: e.target.value }) })] }), _jsxs("label", { children: ["Note", _jsx("textarea", { value: manpower.note, onChange: (e) => setManpower({ ...manpower, note: e.target.value }) })] }), _jsxs("label", { children: ["Assigned people, if known", _jsx("select", { multiple: true, value: manpower.employeeAccountIds, onChange: (e) => setManpower({ ...manpower, employeeAccountIds: Array.from(e.target.selectedOptions).map((o) => o.value) }), children: detail.people.filter((person) => person.canWork).map((person) => _jsx("option", { value: person.accountId, children: person.label }, person.accountId)) })] }), _jsx("button", { disabled: busy || reason.trim().length < 3 || !manpower.date || !manpower.trade.trim() || manpower.count === "", children: "Save manpower" })] }), _jsx("ul", { children: detail.manpower.map((item) => _jsxs("li", { id: `site-record-MANPOWER-${item.id}`, tabIndex: requestedRecordKind === "MANPOWER" && requestedRecordId === item.id ? -1 : undefined, children: [item.data.date, " \u00B7 ", item.data.trade, ": ", item.data.count, " \u00B7 ", item.data.note] }, item.id)) })] }), _jsxs("section", { className: "site-panel", children: [_jsx("h2", { children: "Daily reports" }), detail.capabilities.work && _jsxs("form", { className: "site-form", onSubmit: (event) => { event.preventDefault(); const { manpowerTrade, manpowerCount, ...reportFields } = report; void mutate(`/projects/${encodeURIComponent(projectId)}/reports`, detail.version, { date: detail.today, ...reportFields, manpower: manpowerTrade.trim() && manpowerCount !== "" ? [{ trade: manpowerTrade.trim(), count: Number(manpowerCount) }] : [] }, "Daily report draft saved."); setReport(blankReport()); }, children: [_jsx("h3", { children: "Save a new daily report draft" }), _jsxs("label", { children: ["Work completed today", _jsx("textarea", { required: true, value: report.workCompleted, onChange: (e) => setReport({ ...report, workCompleted: e.target.value }) })] }), _jsxs("label", { children: ["Manpower trade", _jsx("input", { value: report.manpowerTrade, onChange: (e) => setReport({ ...report, manpowerTrade: e.target.value }) })] }), _jsxs("label", { children: ["People reported for trade", _jsx("input", { type: "number", min: "0", step: "1", value: report.manpowerCount, onChange: (e) => setReport({ ...report, manpowerCount: e.target.value }) })] }), _jsxs("label", { children: ["Materials received", _jsx("textarea", { value: report.materialsReceived, onChange: (e) => setReport({ ...report, materialsReceived: e.target.value }) })] }), _jsxs("label", { children: ["Issues", _jsx("textarea", { value: report.issues, onChange: (e) => setReport({ ...report, issues: e.target.value }) })] }), _jsxs("label", { children: ["Delay causes", _jsx("textarea", { value: report.delayCauses, onChange: (e) => setReport({ ...report, delayCauses: e.target.value }) })] }), _jsxs("label", { children: ["Plan for tomorrow", _jsx("textarea", { required: true, value: report.tomorrowPlan, onChange: (e) => setReport({ ...report, tomorrowPlan: e.target.value }) })] }), photoPicker("Authorized photo evidence", report.photoIds, (ids) => setReport({ ...report, photoIds: ids })), _jsx("button", { disabled: busy || reason.trim().length < 3 || !report.workCompleted.trim() || !report.tomorrowPlan.trim() || Boolean(report.manpowerTrade.trim() && report.manpowerCount === ""), children: "Save report draft" })] }), detail.reports.map((item) => _jsxs("article", { id: `site-record-REPORT-${item.id}`, tabIndex: requestedRecordKind === "REPORT" && requestedRecordId === item.id ? -1 : undefined, className: "site-record", children: [_jsxs("h3", { children: [item.data.date, " \u00B7 ", item.state] }), _jsx("p", { children: item.data.workCompleted }), _jsxs("p", { children: [_jsx("strong", { children: "Materials:" }), " ", item.data.materialsReceived || "None recorded"] }), _jsxs("p", { children: [_jsx("strong", { children: "Issues:" }), " ", item.data.issues || "None recorded", " \u00B7 ", _jsx("strong", { children: "Delay:" }), " ", item.data.delayCauses || "None recorded"] }), _jsxs("p", { children: [_jsx("strong", { children: "Tomorrow:" }), " ", item.data.tomorrowPlan] }), item.data.photoEvidence.length > 0 && _jsxs("p", { children: ["Photos: ", item.data.photoEvidence.map(evidenceLabel).join(", ")] }), item.state === "CONFIRMED" && _jsxs("p", { role: "status", children: ["Confirmed by ", item.data.confirmedBy, " \u00B7 ", item.data.confirmedAt] }), item.state === "DRAFT" && detail.capabilities.confirm && _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => void mutate(`/reports/${encodeURIComponent(item.id)}/confirm`, detail.version, {}, "Daily report confirmed by the named responsible person."), children: "Confirm daily report" })] }, item.id))] }), _jsxs("section", { className: "site-panel", children: [_jsx("h2", { children: "Snags and independent checks" }), detail.capabilities.work && _jsxs("form", { className: "site-form", onSubmit: (event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/snags`, detail.version, { title: snagDraft.title.trim(), description: snagDraft.description.trim(), ...(snagDraft.packageId ? { packageId: snagDraft.packageId } : {}), photoIds: snagPhotoIds }, "Snag recorded."); }, children: [_jsx("h3", { children: "Record a snag" }), _jsxs("label", { children: ["Title", _jsx("input", { required: true, value: snagDraft.title, onChange: (e) => setSnagDraft({ ...snagDraft, title: e.target.value }) })] }), _jsxs("label", { children: ["Description", _jsx("textarea", { required: true, value: snagDraft.description, onChange: (e) => setSnagDraft({ ...snagDraft, description: e.target.value }) })] }), _jsxs("label", { children: ["Related work package", _jsxs("select", { value: snagDraft.packageId, onChange: (e) => setSnagDraft({ ...snagDraft, packageId: e.target.value }), children: [_jsx("option", { value: "", children: "No package" }), detail.packages.map((item) => _jsx("option", { value: item.id, children: item.data.title }, item.id))] })] }), photoPicker("Initial snag photos", snagPhotoIds, setSnagPhotoIds), _jsx("button", { disabled: busy || reason.trim().length < 3 || !snagDraft.title.trim() || !snagDraft.description.trim(), children: "Create snag" })] }), detail.snags.map((snag) => {
                                const action = actionsFor(snag);
                                return _jsxs("article", { id: `site-record-SNAG-${snag.id}`, tabIndex: requestedRecordKind === "SNAG" && requestedRecordId === snag.id ? -1 : undefined, className: "site-record", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h3", { children: snag.data.title }), _jsxs("p", { children: [snag.state.replaceAll("_", " "), " \u00B7 repair ", snag.data.repairGeneration, " \u00B7 version ", snag.version] })] }), _jsx("span", { className: "site-state", children: snag.state.replaceAll("_", " ") })] }), _jsx("p", { children: snag.data.description }), snag.data.repairNote && _jsxs("p", { children: [_jsx("strong", { children: "Latest repair note:" }), " ", snag.data.repairNote] }), snag.capabilities.assign && _jsxs("form", { className: "site-form site-inline", onSubmit: (event) => { event.preventDefault(); void mutate(`/snags/${encodeURIComponent(snag.id)}/assign`, detail.version, { fixerAccountId: action.fixer }, "Fixer assigned; prior repair history is retained."); }, children: [_jsxs("label", { children: ["Assign fixer", _jsxs("select", { required: true, value: action.fixer, onChange: (e) => updateSnag(snag.id, { fixer: e.target.value }), children: [_jsx("option", { value: "", children: "Choose assigned person" }), detail.people.filter((person) => person.canWork && person.accountId !== action.verifier).map((person) => _jsx("option", { value: person.accountId, children: person.label }, person.accountId))] })] }), _jsx("button", { disabled: busy || reason.trim().length < 3 || !action.fixer, children: "Assign fixer" })] }), snag.capabilities.start && _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => void mutate(`/snags/${encodeURIComponent(snag.id)}/start`, detail.version, {}, "Repair started by the assigned fixer."), children: "Start repair" }), snag.capabilities.ready && _jsxs("form", { className: "site-form site-inline", onSubmit: (event) => { event.preventDefault(); void mutate(`/snags/${encodeURIComponent(snag.id)}/ready`, detail.version, { note: action.note.trim(), photoIds: action.photoIds }, "Repair submitted for independent verification."); }, children: [_jsxs("label", { children: ["Repair note", _jsx("textarea", { required: true, value: action.note, onChange: (e) => updateSnag(snag.id, { note: e.target.value }) })] }), photoPicker("Repair evidence", action.photoIds, (ids) => updateSnag(snag.id, { photoIds: ids })), _jsx("button", { disabled: busy || reason.trim().length < 3 || !action.note.trim(), children: "Ready for verification" })] }), snag.capabilities.appointVerifier && _jsxs("form", { className: "site-form site-inline", onSubmit: (event) => { event.preventDefault(); void mutate(`/snags/${encodeURIComponent(snag.id)}/verifier`, detail.version, { verifierAccountId: action.verifier }, "Independent verifier appointed."); }, children: [_jsxs("label", { children: ["Name verifier", _jsxs("select", { required: true, value: action.verifier, onChange: (e) => updateSnag(snag.id, { verifier: e.target.value }), children: [_jsx("option", { value: "", children: "Choose a verifier who did not perform the repair" }), detail.people.filter((person) => person.canWork && person.accountId !== snag.data.fixerAccountId).map((person) => _jsx("option", { value: person.accountId, children: person.label }, person.accountId))] })] }), _jsx("button", { disabled: busy || reason.trim().length < 3 || !action.verifier, children: "Appoint verifier" })] }), snag.capabilities.verify && _jsxs("form", { className: "site-form site-inline", onSubmit: (event) => { event.preventDefault(); void mutate(`/snags/${encodeURIComponent(snag.id)}/verify`, detail.version, { outcome: action.outcome, note: action.note.trim(), photoIds: action.photoIds }, action.outcome === "PASSED" ? "Verification passed; management must decide separately whether to close." : "Verification failed; the same snag returns to repair with the failed attempt retained."); }, children: [_jsxs("label", { children: ["Verification outcome", _jsxs("select", { value: action.outcome, onChange: (e) => updateSnag(snag.id, { outcome: e.target.value }), children: [_jsx("option", { value: "PASSED", children: "Pass current repair" }), _jsx("option", { value: "FAILED", children: "Fail current repair" })] })] }), _jsxs("label", { children: ["Verification note", _jsx("textarea", { required: true, minLength: 3, value: action.note, onChange: (e) => updateSnag(snag.id, { note: e.target.value }) })] }), photoPicker("Verification evidence", action.photoIds, (ids) => updateSnag(snag.id, { photoIds: ids })), _jsx("button", { disabled: busy || reason.trim().length < 3 || action.note.trim().length < 3, children: "Record independent check" })] }), snag.capabilities.close && _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => void mutate(`/snags/${encodeURIComponent(snag.id)}/close`, detail.version, {}, "Separate management closure recorded against the latest passed verification."), children: "Close verified snag" }), snag.attempts.length > 0 && _jsxs("details", { children: [_jsxs("summary", { children: ["Verification attempts (", snag.attempts.length, ")"] }), _jsx("ol", { children: snag.attempts.map((attempt) => _jsxs("li", { children: [attempt.outcome, " \u00B7 repair ", attempt.repairGeneration, " \u00B7 fixer ", attempt.fixerAccountId, " \u00B7 verifier ", attempt.verifierAccountId, " \u00B7 ", attempt.occurredAt, _jsx("p", { children: attempt.note })] }, attempt.id)) })] })] }, snag.id);
                            })] }), _jsxs("section", { className: "site-panel", children: [_jsx("h2", { children: "Site handover" }), _jsx("p", { children: "Management makes a separate handover decision after every current package is complete, package quality has passed, and all snags are closed. Client acceptance and project completion remain separate." }), detail.capabilities.handover && _jsxs("form", { className: "site-form", onSubmit: (event) => { event.preventDefault(); void mutate(`/projects/${encodeURIComponent(projectId)}/handover`, detail.version, { note: event.currentTarget.elements.namedItem("handoverNote").value.trim() }, "Site handover decision recorded with its current package, snag, and report evidence."); }, children: [_jsxs("label", { children: ["Handover decision note", _jsx("textarea", { name: "handoverNote", required: true, minLength: 3, maxLength: 1000 })] }), _jsx("button", { disabled: busy || reason.trim().length < 3, children: "Record site handover" })] }), detail.handovers.map((item) => _jsxs("article", { id: `site-record-HANDOVER-${item.id}`, tabIndex: requestedRecordKind === "HANDOVER" && requestedRecordId === item.id ? -1 : undefined, className: "site-record", children: [_jsxs("h3", { children: ["Handover ", item.data.decidedAt] }), _jsx("p", { children: item.data.note }), _jsxs("p", { children: ["Decision by ", item.data.decidedBy, ". Snapshots: ", item.data.packages.length, " packages, ", item.data.snags.length, " closed snags, ", item.data.reportIds.length, " reports."] })] }, item.id))] }), _jsxs("details", { className: "site-history", children: [_jsxs("summary", { children: ["Project site history (", detail.history.length, " events)"] }), _jsx("ol", { children: detail.history.map((entry, index) => _jsxs("li", { children: [_jsx("strong", { children: entry.safeLabel ?? entry.eventName.replaceAll("_", " ") }), _jsxs("span", { children: [entry.occurredAt, " \u00B7 ", entry.actorId, " \u00B7 ", entry.reason] }), _jsxs("small", { children: ["Version ", entry.beforeVersion ?? "—", " \u2192 ", entry.afterVersion ?? "—"] })] }, `${entry.eventName}-${entry.occurredAt}-${index}`)) })] })] })] });
}
