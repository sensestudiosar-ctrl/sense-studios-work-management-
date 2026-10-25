import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowSearchParams } from "./use-window-search-params.js";
import "./turnkey.css";
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
        return "You do not have access to this Turnkey project or action.";
    if (status === 409)
        return "This release changed while you were working. Refresh the project and review the current record before continuing.";
    if (status >= 500)
        return "The Turnkey service is unavailable. Try again shortly.";
    return "The Turnkey request could not be completed. Check the current record and try again.";
}
function dateLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}
function releaseLabel(state) {
    return ({ DRAFT: "Draft", COST_PENDING: "Cost approval requested", COST_APPROVED: "Cost approved", COST_REJECTED: "Cost approval rejected", PROCUREMENT_PENDING: "Procurement approval requested", PROCUREMENT_REJECTED: "Procurement approval rejected", RELEASED: "Released to production" })[state];
}
function eventLabel(value) { return value.replaceAll("_", " ").toLowerCase(); }
export function TurnkeyWorkspace({ csrfToken }) {
    const [searchParams, setSearchParams] = useWindowSearchParams();
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState(() => new URLSearchParams(window.location.search).get("projectId") ?? "");
    const [detail, setDetail] = useState();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [unavailableRequestedProject, setUnavailableRequestedProject] = useState(false);
    const [notice, setNotice] = useState("");
    const epoch = useRef(0);
    const [selectedRevisionIds, setSelectedRevisionIds] = useState([]);
    const [lines, setLines] = useState([{ key: "line-1", description: "", quantity: "", unit: "" }]);
    const [prices, setPrices] = useState({});
    const [currency, setCurrency] = useState("");
    const [draftReason, setDraftReason] = useState("");
    const [replacesReleaseId, setReplacesReleaseId] = useState("");
    const [changeReason, setChangeReason] = useState("");
    const [requestReason, setRequestReason] = useState("");
    const [costApproverId, setCostApproverId] = useState("");
    const [procurementApproverId, setProcurementApproverId] = useState("");
    const [decisionReason, setDecisionReason] = useState("");
    const [decisionOutcome, setDecisionOutcome] = useState("APPROVED");
    const [materialReason, setMaterialReason] = useState("");
    const [materials, setMaterials] = useState({});
    const [progressReason, setProgressReason] = useState("");
    const [progressStage, setProgressStage] = useState("PROCUREMENT");
    const [shareAccountId, setShareAccountId] = useState("");
    const [shareReason, setShareReason] = useState("");
    useEffect(() => {
        const requested = searchParams.get("projectId") ?? "";
        setProjectId(requested);
    }, [searchParams]);
    const loadProject = useCallback(async (id, request) => {
        const next = await json(await fetch(`${API}/turnkey/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }));
        if (request !== epoch.current)
            return;
        setDetail(next);
        setSelectedRevisionIds((current) => current.filter((revisionId) => next.designCandidates.some((candidate) => candidate.revisionId === revisionId)));
        setCostApproverId((current) => next.eligibleApprovers.some((approver) => approver.cost && approver.accountId === current) ? current : next.eligibleApprovers.find((approver) => approver.cost)?.accountId ?? "");
        setProcurementApproverId((current) => next.eligibleApprovers.some((approver) => approver.procurement && approver.accountId === current) ? current : next.eligibleApprovers.find((approver) => approver.procurement)?.accountId ?? "");
    }, []);
    const loadProjects = useCallback(async () => {
        const request = ++epoch.current;
        setLoading(true);
        setError("");
        try {
            const result = await json(await fetch(`${API}/turnkey/projects`, { credentials: "include", cache: "no-store" }));
            if (request !== epoch.current)
                return;
            setProjects(result.items);
            const nextId = result.items.some((project) => project.id === projectId) ? projectId : "";
            setUnavailableRequestedProject(!!projectId && !nextId);
            setProjectId(nextId);
            if (nextId)
                await loadProject(nextId, request);
            else
                setDetail(undefined);
        }
        catch (cause) {
            if (request === epoch.current) {
                setDetail(undefined);
                setProjects([]);
                setError(errorText(cause));
            }
        }
        finally {
            if (request === epoch.current)
                setLoading(false);
        }
    }, [projectId, loadProject]);
    useEffect(() => { void loadProjects(); }, [loadProjects]);
    const refresh = async () => {
        if (busy)
            return;
        const request = ++epoch.current;
        setLoading(true);
        setError("");
        try {
            if (projectId)
                await loadProject(projectId, request);
            else
                await loadProjects();
        }
        catch (cause) {
            if (request === epoch.current) {
                setDetail(undefined);
                setError(errorText(cause));
            }
        }
        finally {
            if (request === epoch.current)
                setLoading(false);
        }
    };
    const selectProject = async (id) => {
        setSearchParams(current => { const next = new URLSearchParams(current); if (id)
            next.set("projectId", id);
        else
            next.delete("projectId"); return next; });
        const request = ++epoch.current;
        setUnavailableRequestedProject(false);
        setProjectId(id);
        setDetail(undefined);
        setError("");
        setNotice("");
        if (!id)
            return;
        setLoading(true);
        try {
            await loadProject(id, request);
        }
        catch (cause) {
            if (request === epoch.current)
                setError(errorText(cause));
        }
        finally {
            if (request === epoch.current)
                setLoading(false);
        }
    };
    const post = async (url, body) => json(await fetch(url, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body),
    }));
    const act = async (release, action, success) => {
        if (busy || !projectId)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await action(`${API}/turnkey/releases/${encodeURIComponent(release.id)}`);
            await refreshAfterMutation(success);
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const refreshAfterMutation = async (success) => {
        const request = ++epoch.current;
        await loadProject(projectId, request);
        setNotice(success);
    };
    const createRelease = async (event) => {
        event.preventDefault();
        if (!detail?.capabilities.create || busy || !projectId || !selectedRevisionIds.length || !lines.length || lines.some((line) => !line.description.trim() || !line.quantity.trim() || !line.unit.trim() || !prices[line.key]?.trim()) || draftReason.trim().length < 3 || (replacesReleaseId && changeReason.trim().length < 3))
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await post(`${API}/turnkey/projects/${encodeURIComponent(projectId)}/releases`, {
                revisionIds: selectedRevisionIds,
                lines: lines.map((line) => ({ ...line, description: line.description.trim(), quantity: line.quantity.trim(), unit: line.unit.trim() })),
                prices: lines.flatMap((line) => { const unitPrice = prices[line.key]?.trim(); return unitPrice ? [{ key: line.key, unitPrice }] : []; }),
                currency, reason: draftReason.trim(), ...(replacesReleaseId ? { replacesReleaseId, changeReason: changeReason.trim() } : {}),
            });
            setDraftReason("");
            setChangeReason("");
            setReplacesReleaseId("");
            setSelectedRevisionIds([]);
            await refreshAfterMutation("Draft BOQ saved. Its selected design inputs are retained with this release.");
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const startApproval = (release, kind, approverAccountId) => {
        void act(release, async (base) => {
            const eligible = detail?.eligibleApprovers.find((approver) => approver.accountId === approverAccountId);
            if (!eligible || (kind === "cost-request" ? !eligible.cost : !eligible.procurement))
                throw new Error("Choose an eligible approver.");
            await post(`${base}/${kind}`, { expectedVersion: release.version, approverAccountId, reason: requestReason.trim() });
            setRequestReason("");
        }, kind === "cost-request" ? "Cost approval request sent." : "Procurement approval request sent.");
    };
    const decide = (release, kind) => {
        void act(release, async (base) => {
            await post(`${base}/${kind}`, { expectedVersion: release.version, outcome: decisionOutcome, reason: decisionReason.trim() });
            setDecisionReason("");
        }, decisionOutcome === "APPROVED" ? "Decision recorded." : "Rejection recorded and retained in the release history.");
    };
    const nextProgress = (status) => status === "NOT_STARTED" ? "IN_PROGRESS" : status === "IN_PROGRESS" ? "COMPLETED" : null;
    const addLine = () => setLines((current) => [...current, { key: `line-${current.length + 1}`, description: "", quantity: "", unit: "" }]);
    const removeLine = (key) => setLines((current) => current.length > 1 ? current.filter((line) => line.key !== key) : current);
    return _jsxs("section", { className: "turnkey-workspace", "aria-labelledby": "turnkey-heading", children: [_jsxs("header", { className: "turnkey-header", children: [_jsxs("div", { children: [_jsx("p", { className: "turnkey-eyebrow", children: "TURNKEY OPERATIONS" }), _jsx("h1", { id: "turnkey-heading", children: "BOQ and production" }), _jsx("p", { children: "Track approved design inputs, operational materials, procurement and factory progress." })] }), _jsx("button", { type: "button", onClick: () => void refresh(), disabled: loading || busy, children: "Refresh" })] }), error && _jsx("p", { className: "turnkey-error", role: "alert", children: error }), notice && _jsx("p", { className: "turnkey-notice", role: "status", children: notice }), loading && _jsx("p", { className: "turnkey-muted", role: "status", children: "Loading Turnkey projects\u2026" }), !loading && _jsxs("label", { className: "turnkey-project-picker", children: ["Project", _jsxs("select", { "aria-label": "Turnkey project", value: projectId, onChange: (event) => void selectProject(event.target.value), disabled: busy, children: [_jsx("option", { value: "", children: "Choose a Turnkey project" }), projects.map((project) => _jsxs("option", { value: project.id, children: [project.title, " \u00B7 ", project.branchName, " \u00B7 ", project.status] }, project.id))] })] }), !loading && !error && !projects.length && _jsx("p", { className: "turnkey-muted", role: "status", children: "No Turnkey projects are available to this account." }), !loading && !error && unavailableRequestedProject && _jsx("p", { className: "turnkey-error", role: "status", children: "The requested Turnkey project is unavailable or your access has changed. Choose an authorized project." }), !loading && projectId && detail && _jsxs(_Fragment, { children: [_jsxs("div", { className: "turnkey-project-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: detail.project.title }), _jsxs("p", { children: [projects.find((project) => project.id === projectId)?.branchName ?? "Project branch", " \u00B7 ", detail.project.status] })] }), _jsxs("span", { children: [detail.releases.length, " ", detail.releases.length === 1 ? "release" : "releases"] })] }), detail.releases.map((release) => _jsxs("article", { className: "turnkey-release", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsxs("p", { className: "turnkey-eyebrow", children: ["RELEASE \u00B7 V", release.version] }), _jsx("h3", { children: releaseLabel(release.state) }), _jsxs("p", { children: ["Created ", dateLabel(release.createdAt)] })] }), _jsx("span", { className: `turnkey-state turnkey-state-${release.state.toLowerCase()}`, children: release.state.replaceAll("_", " ") })] }), release.replacesReleaseId && release.changeReason && _jsxs("p", { className: "turnkey-change", children: [_jsx("strong", { children: "Replaces prior release" }), " \u00B7 ", release.changeReason] }), _jsxs("section", { className: "turnkey-panel", children: [_jsx("h4", { children: "Released design inputs" }), release.designs.length ? _jsx("ul", { children: release.designs.map((design) => _jsxs("li", { children: [_jsx("strong", { children: design.label }), _jsxs("small", { children: ["SHA-256 ", design.sha256] })] }, design.revisionId)) }) : _jsx("p", { className: "turnkey-muted", children: "No design inputs are attached." })] }), _jsxs("section", { className: "turnkey-panel", children: [_jsx("h4", { children: "Bill of quantities" }), release.lines.length ? _jsx("div", { className: "turnkey-table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { children: "Quantity" }), _jsx("th", { children: "Unit" }), detail.capabilities.costView && release.costs && _jsx("th", { children: "Unit price" })] }) }), _jsx("tbody", { children: release.lines.map((line) => _jsxs("tr", { children: [_jsx("td", { children: line.description }), _jsx("td", { children: line.quantity }), _jsx("td", { children: line.unit }), detail.capabilities.costView && release.costs && _jsxs("td", { children: [release.costs.prices.find((price) => price.key === line.key)?.unitPrice ?? "—", " ", release.currency] })] }, line.key)) })] }) }) : _jsx("p", { className: "turnkey-muted", children: "No BOQ lines are recorded." }), detail.capabilities.costView && release.costs && _jsxs("p", { className: "turnkey-cost-total", children: ["BOQ total: ", release.costs.total, " ", release.currency] })] }), release.materials.length > 0 && _jsxs("section", { className: "turnkey-panel", children: [_jsx("h4", { children: "Materials" }), _jsx("ul", { children: release.materials.map((material) => _jsxs("li", { children: [_jsx("strong", { children: release.lines.find((line) => line.key === material.lineKey)?.description ?? material.lineKey }), _jsx("span", { children: material.material })] }, material.lineKey)) })] }), _jsxs("section", { className: "turnkey-status-grid", "aria-label": "Procurement and factory status", children: [_jsxs("div", { children: [_jsx("h4", { children: "Procurement" }), _jsx("p", { children: release.procurementStatus.replaceAll("_", " ") })] }), _jsxs("div", { children: [_jsx("h4", { children: "Factory" }), _jsx("p", { children: release.factoryStatus.replaceAll("_", " ") })] })] }), release.capabilities.requestCost && release.state === "DRAFT" && _jsxs("form", { className: "turnkey-form", onSubmit: (event) => { event.preventDefault(); startApproval(release, "cost-request", costApproverId); }, children: [_jsx("h4", { children: "Request cost approval" }), _jsxs("label", { children: ["Approver", _jsxs("select", { value: costApproverId, onChange: (event) => setCostApproverId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an eligible approver" }), detail.eligibleApprovers.filter((approver) => approver.cost).map((approver) => _jsx("option", { value: approver.accountId, children: approver.label }, approver.accountId))] })] }), _jsxs("label", { children: ["Cost request reason", _jsx("input", { value: requestReason, onChange: (event) => setRequestReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || !costApproverId || requestReason.trim().length < 3, children: "Send cost approval request" })] }), release.capabilities.decideCost && _jsxs("form", { className: "turnkey-form", onSubmit: (event) => { event.preventDefault(); decide(release, "cost-decision"); }, children: [_jsx("h4", { children: "Cost approval decision" }), _jsxs("label", { children: ["Decision", _jsxs("select", { value: decisionOutcome, onChange: (event) => setDecisionOutcome(event.target.value), children: [_jsx("option", { value: "APPROVED", children: "Approve" }), _jsx("option", { value: "REJECTED", children: "Reject" })] })] }), _jsxs("label", { children: ["Cost decision reason", _jsx("input", { value: decisionReason, onChange: (event) => setDecisionReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || decisionReason.trim().length < 3, children: "Record decision" })] }), release.capabilities.setMaterials && _jsxs("form", { className: "turnkey-form", onSubmit: (event) => { event.preventDefault(); void act(release, async (base) => { await post(`${base}/materials`, { expectedVersion: release.version, selections: release.lines.map((line) => ({ lineKey: line.key, material: materials[line.key] ?? "" })).map((selection) => ({ ...selection, material: selection.material.trim() })), reason: materialReason.trim() }); setMaterialReason(""); }, "Material selections saved."); }, children: [_jsx("h4", { children: "Set materials" }), release.lines.map((line) => _jsxs("label", { children: [line.description, _jsx("input", { value: materials[line.key] ?? release.materials.find((item) => item.lineKey === line.key)?.material ?? "", onChange: (event) => setMaterials((current) => ({ ...current, [line.key]: event.target.value })), minLength: 2, maxLength: 500, required: true })] }, line.key)), _jsxs("label", { children: ["Material update reason", _jsx("input", { value: materialReason, onChange: (event) => setMaterialReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || materialReason.trim().length < 3, children: "Save materials" })] }), release.capabilities.requestProcurement && _jsxs("form", { className: "turnkey-form", onSubmit: (event) => { event.preventDefault(); startApproval(release, "procurement-request", procurementApproverId); }, children: [_jsx("h4", { children: "Request procurement approval" }), _jsxs("label", { children: ["Approver", _jsxs("select", { value: procurementApproverId, onChange: (event) => setProcurementApproverId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an eligible approver" }), detail.eligibleApprovers.filter((approver) => approver.procurement).map((approver) => _jsx("option", { value: approver.accountId, children: approver.label }, approver.accountId))] })] }), _jsxs("label", { children: ["Procurement request reason", _jsx("input", { value: requestReason, onChange: (event) => setRequestReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || !procurementApproverId || requestReason.trim().length < 3, children: "Send procurement approval request" })] }), release.capabilities.decideProcurement && _jsxs("form", { className: "turnkey-form", onSubmit: (event) => { event.preventDefault(); decide(release, "procurement-decision"); }, children: [_jsx("h4", { children: "Procurement decision" }), _jsxs("label", { children: ["Decision", _jsxs("select", { value: decisionOutcome, onChange: (event) => setDecisionOutcome(event.target.value), children: [_jsx("option", { value: "APPROVED", children: "Approve" }), _jsx("option", { value: "REJECTED", children: "Reject" })] })] }), _jsxs("label", { children: ["Procurement decision reason", _jsx("input", { value: decisionReason, onChange: (event) => setDecisionReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || decisionReason.trim().length < 3, children: "Record decision" })] }), release.capabilities.progress && _jsxs("form", { className: "turnkey-form", onSubmit: (event) => { event.preventDefault(); const current = progressStage === "PROCUREMENT" ? release.procurementStatus : release.factoryStatus; const status = nextProgress(current); if (!status)
                                    return; void act(release, async (base) => { await post(`${base}/progress`, { expectedVersion: release.version, stage: progressStage, status, reason: progressReason.trim() }); setProgressReason(""); }, "Production progress updated."); }, children: [_jsx("h4", { children: "Update progress" }), _jsxs("label", { children: ["Stage", _jsxs("select", { value: progressStage, onChange: (event) => setProgressStage(event.target.value), children: [_jsx("option", { value: "PROCUREMENT", children: "Procurement" }), _jsx("option", { value: "FACTORY", disabled: release.procurementStatus !== "COMPLETED", children: "Factory" })] })] }), _jsxs("p", { className: "turnkey-muted", children: ["Next allowed status: ", nextProgress(progressStage === "PROCUREMENT" ? release.procurementStatus : release.factoryStatus)?.replaceAll("_", " ") ?? "This stage is complete"] }), _jsxs("label", { children: ["Production progress reason", _jsx("input", { value: progressReason, onChange: (event) => setProgressReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || progressReason.trim().length < 3 || !nextProgress(progressStage === "PROCUREMENT" ? release.procurementStatus : release.factoryStatus) || (progressStage === "FACTORY" && release.procurementStatus !== "COMPLETED"), children: "Save progress" })] }), _jsxs("details", { className: "turnkey-history", children: [_jsx("summary", { children: detail.capabilities.costView ? "Decision and change history" : "Operational history" }), _jsx("ol", { children: release.history.map((event, index) => _jsxs("li", { children: [_jsx("strong", { children: eventLabel(event.eventName) }), _jsx("span", { children: event.reason }), _jsx("small", { children: dateLabel(event.occurredAt) })] }, `${event.eventName}-${event.occurredAt}-${index}`)) })] }), detail.capabilities.costView && release.capabilities.shareCosts && detail.clients.length > 0 && _jsxs("form", { className: "turnkey-form", onSubmit: (event) => { event.preventDefault(); void act(release, async (base) => { await post(`${base}/cost-share`, { expectedVersion: release.version, accountId: shareAccountId, view: true, reason: shareReason.trim() }); setShareReason(""); }, "Approved cost access shared with the selected client."); }, children: [_jsx("h4", { children: "Share approved costs with a client" }), _jsx("p", { className: "turnkey-muted", children: "This grants read access to approved costs only. The client cannot approve costs." }), _jsxs("label", { children: ["Client", _jsxs("select", { value: shareAccountId, onChange: (event) => setShareAccountId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose a client" }), detail.clients.map((client) => _jsx("option", { value: client.accountId, children: client.label }, client.accountId))] })] }), _jsxs("label", { children: ["Cost sharing reason", _jsx("input", { value: shareReason, onChange: (event) => setShareReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || !shareAccountId || shareReason.trim().length < 3 || !release.costs, children: "Share approved costs" }), (release.costShares ?? []).filter((grant) => !grant.revokedAt).map((grant) => _jsxs("div", { className: "turnkey-share", children: [_jsxs("span", { children: [detail.clients.find((client) => client.accountId === grant.accountId)?.label ?? "Shared client", " has approved cost access"] }), _jsx("button", { type: "button", onClick: () => void act(release, async (base) => { await post(`${base}/cost-share`, { expectedVersion: release.version, accountId: grant.accountId, view: false, reason: shareReason.trim() }); setShareReason(""); }, "Client cost access withdrawn."), disabled: busy || shareReason.trim().length < 3, children: "Withdraw access" })] }, grant.accountId))] })] }, release.id)), detail.capabilities.create && _jsxs("form", { className: "turnkey-create", onSubmit: (event) => void createRelease(event), children: [_jsx("p", { className: "turnkey-eyebrow", children: "NEW BOQ" }), _jsx("h3", { children: "Create an immutable draft" }), _jsx("p", { className: "turnkey-muted", children: "Select exact approved design revisions. Their file checksums are shown and retained on the release." }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Approved design inputs" }), detail.designCandidates.length ? detail.designCandidates.map((design) => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: selectedRevisionIds.includes(design.revisionId), onChange: (event) => setSelectedRevisionIds((current) => event.target.checked ? [...current, design.revisionId] : current.filter((id) => id !== design.revisionId)) }), " ", _jsxs("span", { children: [design.label, _jsxs("small", { children: ["SHA-256 ", design.sha256] })] })] }, design.revisionId)) : _jsx("p", { className: "turnkey-muted", children: "No approved design revisions are available." })] }), _jsxs("div", { className: "turnkey-lines", children: [_jsx("h4", { children: "BOQ lines" }), lines.map((line) => _jsxs("div", { className: "turnkey-line-editor", children: [_jsxs("label", { children: ["Description", _jsx("input", { value: line.description, onChange: (event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, description: event.target.value } : item)), maxLength: 300, required: true })] }), _jsxs("label", { children: ["Quantity", _jsx("input", { type: "number", inputMode: "decimal", min: "0.0001", step: "0.0001", value: line.quantity, onChange: (event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: event.target.value } : item)), required: true })] }), _jsxs("label", { children: ["Unit", _jsx("input", { value: line.unit, onChange: (event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, unit: event.target.value } : item)), maxLength: 40, required: true })] }), detail.capabilities.costView && _jsxs("label", { children: ["Unit price", _jsx("input", { type: "number", inputMode: "decimal", min: "0", step: "0.0001", value: prices[line.key] ?? "", onChange: (event) => setPrices((current) => ({ ...current, [line.key]: event.target.value })) })] }), _jsx("button", { type: "button", onClick: () => removeLine(line.key), disabled: lines.length <= 1, "aria-label": `Remove ${line.description || "BOQ"} line`, children: "Remove" })] }, line.key)), _jsx("button", { type: "button", onClick: addLine, children: "Add BOQ line" })] }), _jsxs("div", { className: "turnkey-form-row", children: [_jsxs("label", { children: ["Currency", _jsx("input", { value: currency, onChange: (event) => setCurrency(event.target.value.toUpperCase()), minLength: 3, maxLength: 3, pattern: "[A-Z]{3}", required: true })] }), _jsxs("label", { children: ["BOQ draft reason", _jsx("input", { value: draftReason, onChange: (event) => setDraftReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] })] }), _jsxs("label", { className: "turnkey-picker", children: ["Replaces a release (optional)", _jsxs("select", { value: replacesReleaseId, onChange: (event) => setReplacesReleaseId(event.target.value), children: [_jsx("option", { value: "", children: "New production inputs" }), detail.releases.filter((release) => release.state === "RELEASED").map((release) => _jsxs("option", { value: release.id, children: ["Release ", release.version] }, release.id))] })] }), replacesReleaseId && _jsxs("label", { className: "turnkey-picker", children: ["Change request reason", _jsx("input", { value: changeReason, onChange: (event) => setChangeReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { className: "turnkey-primary", type: "submit", disabled: busy || !selectedRevisionIds.length || !detail.designCandidates.length || lines.some((line) => !prices[line.key]?.trim()) || draftReason.trim().length < 3 || (replacesReleaseId !== "" && changeReason.trim().length < 3), children: "Save draft BOQ" })] })] })] });
}
