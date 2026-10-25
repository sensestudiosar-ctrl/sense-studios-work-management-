import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./project-template.css";
const API = "/api/v1/project-templates";
const defaultDefinition = (type, stages) => ({
    deliveryType: type,
    scopes: [], stages: stages.map((stage) => ({ ...stage })), milestones: [], folders: [],
});
const responseJson = async (response) => {
    if (!response.ok)
        throw Object.assign(new Error("request"), { status: response.status });
    return response.json();
};
const lines = (value) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
export function ProjectTemplatePanel({ owner, csrfToken, onTemplateChange, resetKey = 0 }) {
    const [data, setData] = useState();
    const [selectedVersionId, setSelectedVersionId] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState("");
    const [reason, setReason] = useState("");
    const [editTemplateId, setEditTemplateId] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [definition, setDefinition] = useState({ deliveryType: "DESIGN", scopes: [], stages: [], milestones: [], folders: [] });
    const [scopesText, setScopesText] = useState("");
    const [foldersText, setFoldersText] = useState("");
    const [stageRows, setStageRows] = useState([]);
    const [milestoneRows, setMilestoneRows] = useState([]);
    const [naming, setNaming] = useState("");
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [denied, setDenied] = useState(false);
    useEffect(() => { setSelectedVersionId(""); }, [resetKey]);
    useEffect(() => {
        let live = true;
        setLoading(true);
        setError("");
        void fetch(API, { credentials: "include", cache: "no-store" }).then(responseJson).then((value) => { if (live)
            setData(value); }).catch((cause) => {
            // A denied template endpoint is intentionally silent for non-managers.
            if (live) {
                const isDenied = cause instanceof Error && cause.status === 403;
                setDenied(isDenied);
                if (!isDenied)
                    setError("Project templates could not be loaded.");
            }
        }).finally(() => { if (live)
            setLoading(false); });
        return () => { live = false; };
    }, [reload]);
    const selected = useMemo(() => data?.templates.flatMap((template) => template.versions).find((version) => version.id === selectedVersionId), [data, selectedVersionId]);
    useEffect(() => { onTemplateChange(selected); }, [selected, onTemplateChange]);
    const initNew = (type) => {
        const next = defaultDefinition(type, data?.defaults[type] ?? []);
        setDefinition(next);
        setScopesText(next.scopes.join("\n"));
        setFoldersText(next.folders.join("\n"));
        setStageRows(next.stages);
        setMilestoneRows([]);
        setNaming(next.fileNamingConvention ?? "");
        setEditTemplateId("");
        setFormOpen(true);
    };
    const beginVersion = (template) => {
        const current = template.versions.at(-1)?.definition;
        if (!current)
            return;
        setEditTemplateId(template.id);
        setFormOpen(true);
        setName(template.name);
        setDefinition(current);
        setScopesText(current.scopes.join("\n"));
        setFoldersText(current.folders.join("\n"));
        setStageRows(current.stages.map((row) => ({ ...row })));
        setMilestoneRows(current.milestones.map((row) => ({ ...row })));
        setNaming(current.fileNamingConvention ?? "");
        setReason("");
        setNotice("");
    };
    const payloadDefinition = () => ({
        deliveryType: definition.deliveryType, scopes: lines(scopesText), stages: stageRows.map((row) => ({ key: row.key.trim(), label: row.label.trim() })).filter((row) => row.key && row.label),
        milestones: milestoneRows.map((row) => ({ ...row, key: row.key.trim(), label: row.label.trim(), stageKey: row.stageKey.trim() })).filter((row) => row.key && row.label && row.stageKey),
        folders: lines(foldersText), ...(naming.trim() ? { fileNamingConvention: naming.trim() } : {}),
    });
    const save = async (event) => {
        event.preventDefault();
        if (busy || !data)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        const body = { ...(editTemplateId ? {} : { name: name.trim() }), definition: payloadDefinition(), reason: reason.trim() };
        const url = editTemplateId ? `${API}/${encodeURIComponent(editTemplateId)}/versions` : API;
        try {
            const result = await responseJson(await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }));
            const fresh = await responseJson(await fetch(API, { credentials: "include", cache: "no-store" }));
            setData(fresh);
            setNotice(editTemplateId ? "New template version saved." : "Template created.");
            setReason("");
            setEditTemplateId("");
            setFormOpen(false);
            setSelectedVersionId(result.version?.id ?? result.template?.versions.at(-1)?.id ?? selectedVersionId);
        }
        catch (cause) {
            const status = cause instanceof Error ? cause.status : undefined;
            setError(status === 403 ? "You do not have access to manage project templates." : status === 409 ? "The template changed. Refresh and review the latest version." : "The template could not be saved. Check the fields and try again.");
        }
        finally {
            setBusy(false);
        }
    };
    const updateStage = (index, field, value) => setStageRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    const updateMilestone = (index, field, value) => setMilestoneRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
    if (denied)
        return null;
    return _jsxs("section", { className: "project-template-panel", "aria-labelledby": "template-panel-title", children: [loading && _jsx("p", { role: "status", children: "Loading project templates\u2026" }), owner && data && _jsxs(_Fragment, { children: [_jsxs("h3", { id: "template-panel-title", children: ["Choose a project template ", _jsx("span", { children: "(optional)" })] }), _jsxs("label", { children: ["Project template", _jsxs("select", { "aria-label": "Project template", value: selectedVersionId, onChange: (event) => setSelectedVersionId(event.target.value), children: [_jsx("option", { value: "", children: "Use current project setup" }), data.templates.filter((template) => template.active).flatMap((template) => template.versions.map((version) => _jsxs("option", { value: version.id, children: [template.name, " \u00B7 version ", version.number] }, version.id)))] })] }), selected && _jsx("p", { className: "template-selection-note", children: "Selecting this version fills delivery type and initial service scopes. The applied version is kept with the project." })] }), (data?.canManage || owner) && data && _jsxs("div", { className: "template-manager", children: [_jsx("h3", { id: owner ? undefined : "template-panel-title", children: "Project templates" }), _jsx("p", { children: "Template changes create a new version. Existing projects keep their applied version." }), data.templates.length === 0 && _jsx("p", { children: "No project templates yet." }), _jsx("div", { className: "template-list", children: data.templates.map((template) => _jsxs("div", { className: "template-list-row", children: [_jsxs("span", { children: [_jsx("strong", { children: template.name }), _jsxs("small", { children: [template.versions.length ? `Latest version ${template.versions.at(-1)?.number}` : "No versions", template.active ? " · Active" : " · Inactive"] })] }), _jsx("button", { type: "button", onClick: () => beginVersion(template), children: "New version" })] }, template.id)) }), _jsx("button", { type: "button", className: "template-new-button", onClick: () => { setName(""); setReason(""); initNew("DESIGN"); }, children: "Create template" }), formOpen && _jsxs("form", { className: "template-form", onSubmit: (event) => void save(event), children: [_jsx("h4", { children: editTemplateId ? `New version of ${name}` : "New template" }), !editTemplateId && _jsxs("label", { children: ["Template name", _jsx("input", { value: name, onChange: (event) => setName(event.target.value), minLength: 2, maxLength: 120, required: true })] }), _jsxs("label", { children: ["Delivery type", _jsxs("select", { value: definition.deliveryType, disabled: !!editTemplateId, onChange: (event) => initNew(event.target.value), children: [_jsx("option", { value: "DESIGN", children: "Design" }), _jsx("option", { value: "TURNKEY", children: "Turnkey" })] })] }), _jsxs("label", { children: ["Initial service scopes", _jsx("textarea", { value: scopesText, onChange: (event) => setScopesText(event.target.value), rows: 3, required: true }), _jsx("small", { children: "One scope per line." })] }), _jsxs("div", { className: "template-edit-heading", children: [_jsx("strong", { children: "Stages" }), _jsx("button", { type: "button", onClick: () => setStageRows((rows) => [...rows, { key: "", label: "" }]), children: "Add stage" })] }), stageRows.map((stage, index) => _jsxs("div", { className: "template-row", children: [_jsxs("label", { children: ["Stage key", _jsx("input", { "aria-label": `Stage ${index + 1} key`, value: stage.key, onChange: (event) => updateStage(index, "key", event.target.value), required: true })] }), _jsxs("label", { children: ["Stage name", _jsx("input", { "aria-label": `Stage ${index + 1} name`, value: stage.label, onChange: (event) => updateStage(index, "label", event.target.value), required: true })] }), _jsx("button", { type: "button", "aria-label": `Remove stage ${index + 1}`, onClick: () => setStageRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index)), children: "Remove" })] }, `stage-${index}`)), _jsxs("div", { className: "template-edit-heading", children: [_jsx("strong", { children: "Milestones" }), _jsx("button", { type: "button", onClick: () => setMilestoneRows((rows) => [...rows, { key: "", label: "", stageKey: stageRows[0]?.key ?? "", required: false }]), children: "Add milestone" })] }), milestoneRows.map((milestone, index) => _jsxs("div", { className: "template-milestone", children: [_jsxs("label", { children: ["Milestone key", _jsx("input", { "aria-label": `Milestone ${index + 1} key`, value: milestone.key, onChange: (event) => updateMilestone(index, "key", event.target.value), required: true })] }), _jsxs("label", { children: ["Milestone name", _jsx("input", { "aria-label": `Milestone ${index + 1} name`, value: milestone.label, onChange: (event) => updateMilestone(index, "label", event.target.value), required: true })] }), _jsxs("label", { children: ["Stage", _jsxs("select", { "aria-label": `Milestone ${index + 1} stage`, value: milestone.stageKey, onChange: (event) => updateMilestone(index, "stageKey", event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose stage" }), stageRows.map((row) => _jsx("option", { value: row.key, children: row.label || row.key }, row.key))] })] }), _jsxs("label", { children: ["Target offset in days", _jsx("input", { "aria-label": `Milestone ${index + 1} target offset`, type: "number", min: "0", max: "3650", value: milestone.targetOffsetDays ?? "", onChange: (event) => updateMilestone(index, "targetOffsetDays", event.target.value ? Number(event.target.value) : undefined) })] }), _jsxs("label", { className: "template-checkbox", children: [_jsx("input", { type: "checkbox", checked: milestone.required, onChange: (event) => updateMilestone(index, "required", event.target.checked) }), "Required"] }), _jsx("button", { type: "button", "aria-label": `Remove milestone ${index + 1}`, onClick: () => setMilestoneRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index)), children: "Remove" })] }, `milestone-${index}`)), _jsxs("label", { children: ["Planned folders", _jsx("textarea", { value: foldersText, onChange: (event) => setFoldersText(event.target.value), rows: 3 }), _jsx("small", { children: "One folder name per line. File storage will be available in a later workflow." })] }), _jsxs("label", { children: ["File naming convention", _jsx("input", { value: naming, onChange: (event) => setNaming(event.target.value), maxLength: 160 })] }), _jsxs("label", { children: ["Reason for change", _jsx("input", { value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { className: "project-primary-button", disabled: busy || stageRows.length === 0 || payloadDefinition().scopes.length === 0, children: busy ? "Saving…" : editTemplateId ? "Save new version" : "Create template" })] })] }), error && _jsxs("div", { role: "alert", className: "project-inline-error", children: [error, _jsx("button", { type: "button", onClick: () => setReload((value) => value + 1), children: "Reload templates" })] }), notice && _jsx("p", { role: "status", className: "project-success", children: notice })] });
}
export function ProjectPlan({ projectId, projectVersion, csrfToken, onSaved }) {
    const [data, setData] = useState();
    const [error, setError] = useState("");
    const [reason, setReason] = useState("");
    const [busyId, setBusyId] = useState("");
    const readSequence = useRef(0);
    const load = useCallback(async () => { const requestId = ++readSequence.current; setError(""); try {
        const next = await responseJson(await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/plan`, { credentials: "include", cache: "no-store" }));
        if (requestId === readSequence.current)
            setData(next);
    }
    catch (cause) {
        if (requestId !== readSequence.current)
            return;
        const status = cause instanceof Error ? cause.status : undefined;
        setError(status === 403 ? "This project plan is not available to you." : "Project plan could not be loaded. Try again.");
    } }, [projectId]);
    useEffect(() => { setData(undefined); setReason(""); void load(); return () => { ++readSequence.current; }; }, [load, projectVersion]);
    const complete = async (item) => {
        if (!data?.capabilities.complete || reason.trim().length < 3 || busyId)
            return;
        setBusyId(item.id);
        setError("");
        try {
            await responseJson(await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/plan-items/${encodeURIComponent(item.id)}/complete`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ expectedVersion: projectVersion, reason: reason.trim() }) }));
            setReason("");
            await load();
            onSaved();
        }
        catch (cause) {
            const status = cause instanceof Error ? cause.status : undefined;
            if (status === 409)
                onSaved();
            setError(status === 403 ? "You cannot complete this plan item." : status === 409 ? "The project changed. The latest project details are being loaded." : "The plan item could not be completed. Try again.");
        }
        finally {
            setBusyId("");
        }
    };
    const completed = data?.items.filter((item) => item.completedAt).length ?? 0;
    return _jsxs("section", { className: "project-plan", "aria-labelledby": "project-plan-heading", children: [_jsx("h4", { id: "project-plan-heading", children: "Project plan" }), error && _jsxs("div", { role: "alert", className: "project-inline-error", children: [error, _jsx("button", { type: "button", onClick: () => void load(), children: "Reload plan" })] }), !data && !error ? _jsx("p", { role: "status", children: "Loading project plan\u2026" }) : !data ? null : !data.plan ? _jsx("p", { children: "No template version was applied to this project." }) : _jsxs(_Fragment, { children: [_jsxs("p", { className: "project-plan-provenance", children: [data.plan.templateVersion.template.name, " \u00B7 version ", data.plan.templateVersion.number] }), _jsxs("p", { children: [completed, " of ", data.items.length, " plan items complete"] }), _jsx("p", { className: "project-decision-help", children: "Review and approval decisions require their dedicated workflows." }), _jsx("ol", { className: "project-plan-items", children: data.items.slice().sort((a, b) => a.kind === b.kind ? a.position - b.position : a.kind === "STAGE" ? -1 : 1).map((item) => _jsxs("li", { className: item.completedAt ? "is-complete" : "", children: [_jsxs("span", { children: [_jsx("strong", { children: item.label }), _jsxs("small", { children: [item.kind === "STAGE" ? "Stage" : `Milestone${item.required ? " · required" : ""} · ${data.items.find((stage) => stage.kind === "STAGE" && stage.key === item.stageKey)?.label ?? item.stageKey}`, item.targetAt ? ` · target ${new Date(item.targetAt).toLocaleDateString()}` : ""] })] }), item.completedAt ? _jsx("span", { children: "Complete" }) : data.capabilities.complete && _jsx("button", { type: "button", disabled: !!busyId || reason.trim().length < 3, onClick: () => void complete(item), children: busyId === item.id ? "Saving…" : "Mark complete" })] }, item.id)) }), _jsx("h5", { children: "Planned folders" }), data.plan.definition.folders.length ? _jsx("ul", { className: "project-plan-folders", children: data.plan.definition.folders.map((folder) => _jsx("li", { children: folder }, folder)) }) : _jsx("p", { children: "No planned folders." }), _jsx("p", { className: "project-decision-help", children: "File storage will be available in a later workflow." }), data.plan.definition.fileNamingConvention && _jsxs("p", { children: ["File naming convention: ", data.plan.definition.fileNamingConvention] }), data.capabilities.complete && data.items.some((item) => !item.completedAt) && _jsxs("label", { className: "project-plan-reason", children: ["Reason for plan update", _jsx("input", { value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000 })] }), !!data.history.length && _jsxs(_Fragment, { children: [_jsx("h5", { children: "Plan history" }), _jsx("ul", { className: "project-history", children: data.history.map((entry) => _jsxs("li", { children: [entry.reason, " \u00B7 ", new Date(entry.occurredAt).toLocaleString()] }, entry.id)) })] })] })] });
}
