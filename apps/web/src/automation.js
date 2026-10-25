import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import "./automation.css";
const API = "/api/v1/automation";
const id = () => crypto.randomUUID();
const displayChartLabel = (label) => label.length > 18 ? `${label.slice(0, 17)}…` : label;
async function request(path, csrf, init = {}) {
    const headers = new Headers(init.headers);
    if (init.body) {
        headers.set("Content-Type", "application/json");
        headers.set("X-CSRF-Token", csrf);
    }
    const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`);
    return body;
}
const emptyDefinition = () => ({ title: "", category: "", from: "", to: "", columns: [], filters: [], chart: "NONE" });
const pieSlice = (start, end) => {
    const point = (angle) => [80 + 66 * Math.cos(angle - Math.PI / 2), 80 + 66 * Math.sin(angle - Math.PI / 2)];
    const [x1, y1] = point(start);
    const [x2, y2] = point(end);
    return `M 80 80 L ${x1} ${y1} A 66 66 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
};
export function AutomationWorkspace({ csrfToken, mode = "automation" }) {
    const [context, setContext] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [definition, setDefinition] = useState(emptyDefinition());
    const [reportReason, setReportReason] = useState("");
    const [preview, setPreview] = useState(null);
    const [runPreview, setRunPreview] = useState(null);
    const [editingReport, setEditingReport] = useState(null);
    const [ruleTitle, setRuleTitle] = useState("");
    const [editingRule, setEditingRule] = useState(null);
    const [ruleReason, setRuleReason] = useState("");
    const [ruleEnabled, setRuleEnabled] = useState(true);
    const [ruleEvents, setRuleEvents] = useState([]);
    const [ruleProject, setRuleProject] = useState("");
    const [subjectType, setSubjectType] = useState("");
    const [actionKind, setActionKind] = useState("NOTIFY");
    const [recipientId, setRecipientId] = useState("");
    const [reportId, setReportId] = useState("");
    const [recommendation, setRecommendation] = useState("");
    const load = useCallback(async (initial = false) => {
        if (initial)
            setLoading(true);
        setError("");
        try {
            setContext(await request("/context", csrfToken));
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Automation settings could not be loaded.");
        }
        finally {
            if (initial)
                setLoading(false);
        }
    }, [csrfToken]);
    useEffect(() => { void load(true); }, [load]);
    const saveReport = async (event) => {
        event.preventDefault();
        if (!definition.title.trim() || !definition.category || !definition.from || !definition.to || definition.columns.length === 0 || reportReason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const fields = { ...definition, title: definition.title.trim() };
            if (editingReport)
                await request(`/reports/${encodeURIComponent(editingReport.id)}`, csrfToken, { method: "PUT", body: JSON.stringify({ ...fields, commandId: id(), reason: reportReason.trim(), expectedVersion: editingReport.version }) });
            else
                await request("/reports", csrfToken, { method: "POST", body: JSON.stringify({ ...fields, commandId: id(), reason: reportReason.trim() }) });
            setEditingReport(null);
            setReportReason("");
            setNotice("Report saved.");
            await load();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Report could not be saved.");
        }
        finally {
            setBusy(false);
        }
    };
    const previewReport = async (event, saved) => {
        event?.preventDefault();
        const current = saved?.data ?? definition;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            setPreview({ ...await request(saved ? `/reports/${encodeURIComponent(saved.id)}/preview` : "/reports/preview", csrfToken, saved ? {} : { method: "POST", body: JSON.stringify(current) }), chartKind: current.chart });
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Report preview could not be generated.");
        }
        finally {
            setBusy(false);
        }
    };
    const saveRule = async (event) => {
        event.preventDefault();
        if (!context || !ruleTitle.trim() || !ruleReason.trim() || ruleEvents.length === 0 || !recipientId)
            return;
        if (!context.owner && !ruleProject)
            return;
        const action = { kind: actionKind, recipientId, ...(actionKind === "REPORT" && reportId ? { reportId } : {}), ...(actionKind === "RECOMMENDATION" && recommendation.trim() ? { recommendation: recommendation.trim() } : {}) };
        if ((actionKind === "REPORT" && !reportId) || (actionKind === "RECOMMENDATION" && !recommendation.trim()))
            return;
        const data = { title: ruleTitle.trim(), enabled: ruleEnabled, eventNames: ruleEvents, ...(ruleProject ? { projectId: ruleProject } : {}), condition: subjectType ? { subjectType } : {}, action };
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(editingRule ? `/rules/${encodeURIComponent(editingRule.id)}` : "/rules", csrfToken, { method: editingRule ? "PUT" : "POST", body: JSON.stringify({ commandId: id(), reason: ruleReason.trim(), ...data, ...(editingRule ? { expectedVersion: editingRule.version } : {}) }) });
            setNotice("Automation rule saved.");
            setEditingRule(null);
            setRuleTitle("");
            setRuleReason("");
            setRuleEnabled(true);
            setRuleEvents([]);
            setRuleProject("");
            setSubjectType("");
            setRecipientId("");
            setReportId("");
            setRecommendation("");
            await load();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Automation rule could not be saved.");
        }
        finally {
            setBusy(false);
        }
    };
    const decide = async (run, outcome) => {
        const reason = window.prompt(outcome === "APPROVED" ? "Reason for approving this recommendation" : "Reason for rejecting this recommendation");
        if (!reason?.trim())
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await request(`/runs/${encodeURIComponent(run.id)}/decision`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: id(), reason: reason.trim(), outcome }) });
            setNotice(outcome === "APPROVED" ? "Recommendation approved. The proposed change still requires the ordinary authorized workflow." : "Recommendation rejected.");
            await load();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Recommendation decision could not be saved.");
        }
        finally {
            setBusy(false);
        }
    };
    const showRunReport = async (run) => {
        setBusy(true);
        setError("");
        setNotice("");
        try {
            setRunPreview({ runId: run.id, data: await request(`/runs/${encodeURIComponent(run.id)}/report`, csrfToken) });
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "Generated report could not be loaded.");
        }
        finally {
            setBusy(false);
        }
    };
    const updateDefinition = (patch) => setDefinition((value) => ({ ...value, ...patch }));
    const updateFilter = (index, patch) => updateDefinition({ filters: definition.filters.map((filter, current) => current === index ? { ...filter, ...patch } : filter) });
    const savedReportsOnly = mode === "saved-reports";
    return _jsxs("section", { className: "identity-section automation-workspace", "aria-labelledby": "automation-heading", children: [_jsxs("div", { className: "automation-heading", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: savedReportsOnly ? "INSIGHTS" : "MANAGEMENT" }), _jsx("h2", { id: "automation-heading", children: savedReportsOnly ? "Saved reports" : "Automation & reports" }), _jsx("p", { children: savedReportsOnly ? "Create, preview and manage versioned report definitions using your current access." : "Build scoped reports and event rules. Actions run only for authorized recipients." })] }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => void load(), disabled: busy, children: "Refresh" })] }), error && _jsx("p", { className: "automation-error", role: "alert", children: error }), notice && _jsx("p", { className: "automation-notice", role: "status", children: notice }), loading ? _jsx("p", { role: "status", children: "Loading automation settings\u2026" }) : context && _jsxs(_Fragment, { children: [_jsxs("section", { className: "automation-panel", "aria-labelledby": "report-builder-heading", children: [_jsx("h3", { id: "report-builder-heading", children: editingReport ? "Edit saved report" : "Custom report builder" }), _jsx("p", { children: "Choose a category, date range, columns, filters, grouping and chart. Report data follows your current access." }), _jsxs("form", { onSubmit: (event) => void saveReport(event), children: [_jsxs("div", { className: "automation-form-grid", children: [_jsxs("label", { children: ["Report name", _jsx("input", { value: definition.title, onChange: (e) => updateDefinition({ title: e.target.value }), maxLength: 160, required: true })] }), _jsxs("label", { children: ["Category", _jsxs("select", { value: definition.category, onChange: (e) => updateDefinition({ category: e.target.value }), required: true, children: [_jsx("option", { value: "", children: "Choose a category" }), context.categories.map((item) => _jsx("option", { value: item.key, children: item.label }, item.key))] })] }), _jsxs("label", { children: ["From", _jsx("input", { type: "date", value: definition.from, onChange: (e) => updateDefinition({ from: e.target.value }), required: true })] }), _jsxs("label", { children: ["To", _jsx("input", { type: "date", value: definition.to, onChange: (e) => updateDefinition({ to: e.target.value }), required: true })] }), _jsxs("fieldset", { className: "automation-span", children: [_jsx("legend", { children: "Columns" }), _jsx("div", { className: "automation-column-options", children: context.columns.map((column) => _jsxs("label", { className: "automation-check", children: [_jsx("input", { type: "checkbox", checked: definition.columns.includes(column.key), onChange: (e) => updateDefinition({ columns: e.target.checked ? [...definition.columns, column.key] : definition.columns.filter((key) => key !== column.key) }) }), column.label] }, column.key)) })] }), _jsxs("fieldset", { className: "automation-span", children: [_jsx("legend", { children: "Filters" }), definition.filters.map((filter, index) => _jsxs("div", { className: "automation-filter-row", children: [_jsxs("label", { children: ["Column", _jsx("select", { "aria-label": `Filter ${index + 1} column`, value: filter.column, onChange: (e) => updateFilter(index, { column: e.target.value }), children: context.columns.map((column) => _jsx("option", { value: column.key, children: column.label }, column.key)) })] }), _jsxs("label", { children: ["Match", _jsxs("select", { "aria-label": `Filter ${index + 1} match`, value: filter.operator, onChange: (e) => updateFilter(index, { operator: e.target.value }), children: [_jsx("option", { value: "equals", children: "Equals" }), _jsx("option", { value: "contains", children: "Contains" })] })] }), _jsxs("label", { children: ["Value", _jsx("input", { "aria-label": `Filter ${index + 1} value`, value: filter.value, onChange: (e) => updateFilter(index, { value: e.target.value }) })] }), _jsx("button", { type: "button", className: "secondary-action", "aria-label": `Remove filter ${index + 1}`, onClick: () => updateDefinition({ filters: definition.filters.filter((_, current) => current !== index) }), children: "Remove" })] }, index)), _jsx("button", { type: "button", className: "secondary-action", disabled: definition.filters.length >= 10, onClick: () => updateDefinition({ filters: [...definition.filters, { column: context.columns[0].key, operator: "equals", value: "" }] }), children: "Add filter" })] }), _jsxs("label", { children: ["Group by", _jsxs("select", { value: definition.groupBy ?? "", onChange: (e) => updateDefinition(e.target.value ? { groupBy: e.target.value } : { groupBy: undefined }), children: [_jsx("option", { value: "", children: "No grouping" }), context.columns.map((column) => _jsx("option", { value: column.key, children: column.label }, column.key))] })] }), _jsxs("label", { children: ["Chart", _jsxs("select", { value: definition.chart, onChange: (e) => updateDefinition({ chart: e.target.value }), children: [_jsx("option", { value: "NONE", children: "No chart" }), _jsx("option", { value: "BAR", children: "Bar chart" }), _jsx("option", { value: "PIE", children: "Pie chart" })] })] }), _jsxs("label", { className: "automation-span", children: ["Reason for saving report", _jsx("textarea", { value: reportReason, onChange: (e) => setReportReason(e.target.value), minLength: 3, maxLength: 1000, required: true })] })] }), _jsxs("div", { className: "automation-actions", children: [_jsx("button", { type: "button", className: "secondary-action", onClick: () => void previewReport(), disabled: busy || !definition.category || !definition.from || !definition.to || definition.columns.length === 0, children: busy ? "Working…" : "Preview report" }), _jsx("button", { type: "submit", disabled: busy || !definition.title.trim() || definition.columns.length === 0 || reportReason.trim().length < 3, children: editingReport ? "Save report changes" : "Save report" }), editingReport && _jsx("button", { className: "secondary-action", type: "button", onClick: () => { setEditingReport(null); setDefinition(emptyDefinition()); setPreview(null); setReportReason(""); }, children: "Cancel edit" })] })] })] }), preview && _jsxs("section", { className: "automation-panel", "aria-labelledby": "report-preview-heading", children: [_jsx("h3", { id: "report-preview-heading", children: "Report preview" }), preview.table.unavailable?.length ? _jsx("ul", { className: "automation-reminder", "aria-label": "Unavailable report sources", children: preview.table.unavailable.map((message) => _jsx("li", { children: message }, message)) }) : null, _jsx("div", { className: "automation-table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: preview.table.columns.map((column) => _jsx("th", { scope: "col", children: column.label }, column.key)) }) }), _jsx("tbody", { children: preview.table.rows.map((row, index) => _jsx("tr", { children: preview.table.columns.map((column) => _jsx("td", { children: String(row[column.key] ?? "—") }, column.key)) }, index)) })] }) }), preview.table.rows.length === 0 && _jsx("p", { role: "status", children: "No rows match this report." }), preview.chart.length > 0 && preview.chartKind !== "NONE" && _jsx("div", { className: "automation-chart", role: "img", "aria-label": `${preview.chartKind === "PIE" ? "Pie" : "Bar"} chart with ${preview.chart.length} groups`, children: preview.chartKind === "PIE" ? _jsxs("svg", { viewBox: `0 0 320 ${Math.max(160, preview.chart.length * 24 + 40)}`, "aria-hidden": "true", children: [preview.chart.length === 1 ? _jsx("circle", { cx: "80", cy: "80", r: "66", fill: "hsl(0 34% 48%)" }) : (() => { const total = preview.chart.reduce((sum, item) => sum + Math.max(0, item.count), 0); let cursor = 0; return preview.chart.map((point, index) => { const start = cursor; cursor += total ? Math.max(0, point.count) / total * Math.PI * 2 : 0; return _jsx("path", { d: pieSlice(start, cursor), fill: `hsl(${index * 67 % 360} 34% 48%)` }, point.label); }); })(), _jsx("circle", { cx: "80", cy: "80", r: "35", fill: "#fffdf7" }), _jsx("g", { transform: "translate(165 20)", children: preview.chart.map((point, index) => _jsxs("g", { transform: `translate(0 ${index * 24})`, children: [_jsx("rect", { width: "12", height: "12", fill: `hsl(${index * 67 % 360} 34% 48%)` }), _jsxs("text", { x: "18", y: "11", children: [_jsxs("title", { children: [point.label, ": ", point.count] }), displayChartLabel(point.label), ": ", point.count] })] }, point.label)) })] }) : preview.chart.map((point) => { const maximum = Math.max(1, ...preview.chart.map((item) => item.count)); return _jsxs("div", { className: "automation-chart-row", children: [_jsx("span", { title: point.label, children: displayChartLabel(point.label) }), _jsx("div", { children: _jsx("span", { style: { width: `${Math.max(2, point.count / maximum * 100)}%` } }) }), _jsx("strong", { children: point.count })] }, point.label); }) })] }), _jsxs("section", { className: "automation-panel", "aria-labelledby": "saved-reports-heading", children: [_jsx("h3", { id: "saved-reports-heading", children: "Saved reports" }), context.reports.length === 0 ? _jsx("p", { role: "status", children: "No saved reports yet." }) : _jsx("ul", { className: "automation-list", children: context.reports.map((item) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: item.data.title }), _jsxs("span", { children: [item.data.category, " \u00B7 Version ", item.version] })] }), _jsxs("div", { className: "automation-actions", children: [_jsx("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => void previewReport(undefined, item), children: "Preview" }), ["csv", "xlsx", "pdf", "print"].map((format) => _jsx("a", { href: `${API}/reports/${encodeURIComponent(item.id)}/export?format=${format}`, target: format === "print" ? "_blank" : undefined, rel: format === "print" ? "noopener noreferrer" : undefined, children: format.toUpperCase() }, format)), _jsx("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => { setEditingReport(item); setDefinition(item.data); setReportReason(""); setPreview(null); }, children: "Edit" })] })] }, item.id)) })] }), !savedReportsOnly && _jsxs("section", { className: "automation-panel", "aria-labelledby": "rule-builder-heading", children: [_jsx("h3", { id: "rule-builder-heading", children: "Event automation" }), _jsx("p", { children: "Choose one or more events and a low-risk internal action. Scope is enforced by the server." }), _jsxs("form", { onSubmit: (event) => void saveRule(event), children: [_jsxs("div", { className: "automation-form-grid", children: [_jsxs("label", { children: ["Rule name", _jsx("input", { value: ruleTitle, onChange: (e) => setRuleTitle(e.target.value), required: true, maxLength: 160 })] }), _jsxs("label", { className: "automation-check", children: [_jsx("input", { type: "checkbox", checked: ruleEnabled, onChange: (e) => setRuleEnabled(e.target.checked) }), "Rule enabled"] }), _jsxs("label", { children: ["Project scope", _jsxs("select", { value: ruleProject, onChange: (e) => setRuleProject(e.target.value), required: !context.owner, children: [_jsx("option", { value: "", children: context.owner ? "Organization-wide" : "Choose a project" }), context.projects.map((item) => _jsx("option", { value: item.id, children: item.title }, item.id))] })] }), _jsxs("fieldset", { className: "automation-span", children: [_jsx("legend", { children: "When these events occur" }), context.eventNames.map((name) => _jsxs("label", { className: "automation-check", children: [_jsx("input", { type: "checkbox", checked: ruleEvents.includes(name), onChange: (e) => setRuleEvents((current) => e.target.checked ? [...current, name] : current.filter((entry) => entry !== name)) }), name] }, name))] }), _jsxs("label", { children: ["Condition: subject type (optional)", _jsx("input", { value: subjectType, onChange: (e) => setSubjectType(e.target.value) })] }), _jsxs("label", { children: ["Action", _jsxs("select", { value: actionKind, onChange: (e) => setActionKind(e.target.value), children: [_jsx("option", { value: "NOTIFY", children: "Internal notice" }), _jsx("option", { value: "REPORT", children: "Generate report" }), _jsx("option", { value: "RECOMMENDATION", children: "Propose recommendation" })] })] }), _jsxs("label", { children: ["Authorized recipient", _jsxs("select", { value: recipientId, onChange: (e) => setRecipientId(e.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose a recipient" }), context.recipients.map((item) => _jsx("option", { value: item.id, children: item.label }, item.id))] })] }), actionKind === "REPORT" && _jsxs("label", { children: ["Saved report", _jsxs("select", { value: reportId, onChange: (e) => setReportId(e.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose a report" }), (context.ruleReports ?? context.reports.filter((item) => item.data.category !== "skills_training")).map((item) => _jsx("option", { value: item.id, children: item.data.title }, item.id))] })] }), actionKind === "RECOMMENDATION" && _jsxs("label", { className: "automation-span", children: ["Recommendation", _jsx("textarea", { value: recommendation, onChange: (e) => setRecommendation(e.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsxs("label", { className: "automation-span", children: ["Reason for rule change", _jsx("textarea", { value: ruleReason, onChange: (e) => setRuleReason(e.target.value), minLength: 3, maxLength: 1000, required: true })] })] }), _jsxs("div", { className: "automation-actions", children: [_jsx("button", { type: "submit", disabled: busy || !ruleTitle.trim() || !ruleReason.trim() || ruleEvents.length === 0 || !recipientId || (!context.owner && !ruleProject), children: editingRule ? "Save rule changes" : "Save automation rule" }), editingRule && _jsx("button", { type: "button", className: "secondary-action", onClick: () => { setEditingRule(null); setRuleTitle(""); setRuleReason(""); setRuleEnabled(true); setRuleEvents([]); setRuleProject(""); setSubjectType(""); setRecipientId(""); setReportId(""); setRecommendation(""); }, children: "Cancel edit" })] })] })] }), !savedReportsOnly && _jsxs("section", { className: "automation-panel", "aria-labelledby": "rules-heading", children: [_jsx("h3", { id: "rules-heading", children: "Configured rules" }), context.rules.length === 0 ? _jsx("p", { role: "status", children: "No automation rules configured." }) : _jsx("ul", { className: "automation-list", children: context.rules.map((rule) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: rule.data.title }), _jsxs("span", { children: ["Version ", rule.version, " \u00B7 ", rule.data.enabled ? "Enabled" : "Disabled", " \u00B7 ", rule.data.eventNames.join(", "), " \u00B7 ", rule.data.action.kind] })] }), _jsx("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => { setEditingRule(rule); setRuleTitle(rule.data.title); setRuleEnabled(rule.data.enabled); setRuleReason(""); setRuleEvents(rule.data.eventNames); setRuleProject(rule.data.projectId ?? ""); setSubjectType(rule.data.condition.subjectType ?? ""); setActionKind(rule.data.action.kind); setRecipientId(rule.data.action.recipientId); setReportId(rule.data.action.reportId ?? ""); setRecommendation(rule.data.action.recommendation ?? ""); }, children: "Edit" })] }, rule.id)) })] }), !savedReportsOnly && _jsxs("section", { className: "automation-panel", "aria-labelledby": "runs-heading", children: [_jsx("h3", { id: "runs-heading", children: "Recent automation activity" }), _jsx("p", { children: "Notice status means an internal notice was created. Email delivery and read receipts are managed separately." }), context.runs.length === 0 ? _jsx("p", { role: "status", children: "No automation activity recorded." }) : _jsx("ul", { className: "automation-list", children: context.runs.map((run) => _jsxs("li", { children: [_jsxs("div", { children: [_jsxs("strong", { children: [run.actionKind, " \u00B7 ", run.actionKind === "NOTIFY" && run.status === "DELIVERED" ? "Notice created" : run.status] }), _jsx("span", { children: new Date(run.createdAt).toLocaleString() }), run.recommendation && _jsx("p", { children: run.recommendation }), run.approvalRequestId && _jsx("p", { className: "automation-reminder", children: "Approving a recommendation records review only. The proposed change still requires the ordinary authorized workflow." }), run.approvalRequestId && run.status === "PENDING" && !run.canDecide && _jsx("p", { children: "Only the named authorized reviewer can decide this recommendation." })] }), _jsxs("div", { className: "automation-actions", children: [run.actionKind === "REPORT" && _jsx("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => void showRunReport(run), children: "Preview generated report" }), run.approvalRequestId && run.status === "PENDING" && run.canDecide && _jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => void decide(run, "APPROVED"), children: "Approve recommendation" }), _jsx("button", { type: "button", className: "secondary-action", disabled: busy, onClick: () => void decide(run, "REJECTED"), children: "Reject recommendation" })] })] })] }, run.id)) }), runPreview && _jsxs("div", { className: "automation-run-report", children: [_jsx("h4", { children: "Generated report" }), runPreview.data.table.unavailable?.length ? _jsx("ul", { className: "automation-reminder", "aria-label": "Unavailable report sources", children: runPreview.data.table.unavailable.map((message) => _jsx("li", { children: message }, message)) }) : null, _jsx("div", { className: "automation-actions", children: ["csv", "xlsx", "pdf", "print"].map((format) => _jsx("a", { href: `${API}/runs/${encodeURIComponent(runPreview.runId)}/report/export?format=${format}`, target: format === "print" ? "_blank" : undefined, rel: format === "print" ? "noopener noreferrer" : undefined, children: format.toUpperCase() }, format)) }), _jsx("div", { className: "automation-table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: runPreview.data.table.columns.map((column) => _jsx("th", { scope: "col", children: column.label }, column.key)) }) }), _jsx("tbody", { children: runPreview.data.table.rows.map((row, index) => _jsx("tr", { children: runPreview.data.table.columns.map((column) => _jsx("td", { children: String(row[column.key] ?? "—") }, column.key)) }, index)) })] }) }), runPreview.data.chart.length > 0 && _jsx("div", { className: "automation-chart", role: "img", "aria-label": `Generated count chart with ${runPreview.data.chart.length} groups`, children: runPreview.data.chart.map((point) => { const maximum = Math.max(1, ...runPreview.data.chart.map((item) => item.count)); return _jsxs("div", { className: "automation-chart-row", children: [_jsx("span", { title: point.label, children: displayChartLabel(point.label) }), _jsx("div", { children: _jsx("span", { style: { width: `${Math.max(2, point.count / maximum * 100)}%` } }) }), _jsx("strong", { children: point.count })] }, point.label); }) })] })] })] })] });
}
