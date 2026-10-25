import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowSearchParams } from "./use-window-search-params.js";
import "./ai-assistance.css";
const API = "/api/v1/ai";
const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
async function api(path, csrf, init = {}) {
    const headers = new Headers(init.headers);
    if (init.body) {
        headers.set("Content-Type", "application/json");
        headers.set("X-CSRF-Token", csrf);
    }
    const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return body;
}
const reasonText = (cause, action) => {
    const status = cause?.status;
    if (status === 401 || status === 403 || status === 404)
        return "Access changed or this evidence is no longer available. Refresh to recheck current permissions.";
    if (status === 409)
        return "The saved evidence changed. Refresh it before making another decision.";
    return cause instanceof Error ? cause.message : `${action} failed.`;
};
const nameOf = (record) => record.title ?? record.name ?? record.id;
const boundedWindow = (from, to) => {
    if (!from || !to)
        return false;
    const start = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`);
    return Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 30 * 24 * 60 * 60 * 1000;
};
const allowed = (context, kind) => {
    if (!context)
        return false;
    const capability = context.capabilities ?? {};
    const explicit = capability[kind] ?? capability[`can${kind[0] + kind.slice(1).toLowerCase()}`];
    return typeof explicit === "boolean" ? explicit : (context.requestKinds ?? context.supportedKinds ?? []).includes(kind);
};
function jsonText(value) { return typeof value === "string" ? value : value == null ? "Unavailable" : JSON.stringify(value); }
const readableField = (field) => ({ title: "Title", status: "Status", priority: "Priority", targetDate: "Target date", committedDueDate: "Committed due date", dueDate: "Due date", version: "Version", publishedText: "Published text" }[field ?? ""] ?? (field ? field.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, value => value.toUpperCase()) : "Source"));
const readableState = (state) => state?.replaceAll("_", " ").toLowerCase() ?? "Unavailable";
function sourceHref(source) {
    if (!source?.kind || !source.id)
        return undefined;
    const query = new URLSearchParams();
    switch (source.kind) {
        case "TASK":
            query.set("taskId", source.id);
            return `/tasks?${query}`;
        case "PROJECT":
            query.set("projectId", source.id);
            return `/projects?${query}`;
        case "SKILL_RATING":
            if (!source.employeeId)
                return undefined;
            query.set("panel", "skills");
            query.set("employeeId", source.employeeId);
            query.set("ratingId", source.id);
            return `/learning?${query}`;
        case "SKILL_CHANGE":
            if (!source.employeeId)
                return undefined;
            query.set("panel", "skills");
            query.set("employeeId", source.employeeId);
            query.set("changeId", source.id);
            return `/learning?${query}`;
        case "TRAINING_ASSIGNMENT":
            if (!source.employeeId)
                return undefined;
            query.set("panel", "training");
            query.set("employeeId", source.employeeId);
            query.set("assignmentId", source.id);
            return `/learning?${query}`;
        case "TRAINING_ASSESSMENT":
        case "TRAINING_EFFECTIVENESS":
            if (!source.employeeId || !source.assignmentId)
                return undefined;
            query.set("panel", "training");
            query.set("employeeId", source.employeeId);
            query.set("assignmentId", source.assignmentId);
            return `/learning?${query}`;
        case "LIBRARY_SOP_VERSION":
            if (!source.recordId)
                return undefined;
            query.set("panel", "library");
            query.set("recordId", source.recordId);
            query.set("versionId", source.id);
            return `/learning?${query}`;
        default: return undefined;
    }
}
function SourceLink({ source }) {
    const href = sourceHref(source);
    if (!href)
        return null;
    const label = source?.kind === "TASK" ? "task" : source?.kind === "PROJECT" ? "project" : source?.kind === "SKILL_RATING" || source?.kind === "SKILL_CHANGE" ? "Skills record" : source?.kind === "TRAINING_ASSESSMENT" ? "Training assessment" : source?.kind === "TRAINING_EFFECTIVENESS" ? "Effectiveness observation" : source?.kind === "LIBRARY_SOP_VERSION" ? "SOP version" : "Training assignment";
    return _jsxs("a", { className: "ai-assist-source-link", href: href, children: ["Open exact ", label] });
}
export function AiAssistanceWorkspace({ csrfToken }) {
    const [searchParams, setSearchParams] = useWindowSearchParams();
    const requestedRunId = searchParams.get("runId") ?? "";
    const [context, setContext] = useState(null);
    const [runs, setRuns] = useState([]);
    const [detail, setDetail] = useState(null);
    const [kind, setKind] = useState("DAILY");
    const [projectId, setProjectId] = useState("");
    const [taskId, setTaskId] = useState("");
    const [purpose, setPurpose] = useState("PRIMARY_OWNER");
    const [broaderSearch, setBroaderSearch] = useState(false);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [requestReason, setRequestReason] = useState("");
    const [decisionReason, setDecisionReason] = useState("");
    const [selection, setSelection] = useState("");
    const [outcomeReason, setOutcomeReason] = useState("");
    const [loading, setLoading] = useState(true);
    const [opening, setOpening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const commandRef = useRef(null);
    const detailId = useRef("");
    const load = useCallback(async (initial = false) => {
        if (initial)
            setLoading(true);
        setError("");
        try {
            const [nextContext, nextRuns] = await Promise.all([api("/context", csrfToken), api("/runs", csrfToken)]);
            setContext(nextContext);
            setRuns(Array.isArray(nextRuns) ? nextRuns : nextRuns.items ?? nextRuns.runs ?? []);
            const selectedId = detailId.current;
            if (selectedId) {
                setOpening(true);
                setDetail(null);
                try {
                    const nextDetail = await api(`/runs/${encodeURIComponent(selectedId)}`, csrfToken);
                    if (detailId.current === selectedId)
                        setDetail(nextDetail);
                }
                catch (cause) {
                    if (detailId.current === selectedId) {
                        setError(reasonText(cause, "Saved evidence"));
                        setDetail(null);
                        if ([401, 403, 404].includes(cause?.status ?? 0))
                            setRuns(current => current.filter(run => run.id !== selectedId));
                    }
                }
                finally {
                    if (detailId.current === selectedId)
                        setOpening(false);
                }
            }
        }
        catch (cause) {
            setError(reasonText(cause, "Evidence assistance"));
            if ([401, 403].includes(cause?.status ?? 0)) {
                setContext(null);
                setRuns([]);
                setDetail(null);
            }
        }
        finally {
            if (initial)
                setLoading(false);
        }
    }, [csrfToken]);
    useEffect(() => { void load(true); }, [load]);
    const openRun = useCallback(async (id) => {
        if (!id)
            return;
        detailId.current = id;
        setOpening(true);
        setDetail(null);
        setError("");
        setDecisionReason("");
        setSelection("");
        setOutcomeReason("");
        if (requestedRunId !== id)
            setSearchParams(current => { const next = new URLSearchParams(current); next.set("runId", id); return next; }, { replace: false });
        try {
            const result = await api(`/runs/${encodeURIComponent(id)}`, csrfToken);
            if (detailId.current === id)
                setDetail(result);
        }
        catch (cause) {
            setError(reasonText(cause, "Saved evidence"));
            if ([401, 403, 404].includes(cause?.status ?? 0)) {
                setDetail(null);
                setRuns(current => current.filter(run => run.id !== id));
            }
        }
        finally {
            if (detailId.current === id)
                setOpening(false);
        }
    }, [csrfToken, requestedRunId, setSearchParams]);
    useEffect(() => {
        if (requestedRunId) {
            if (requestedRunId !== detailId.current)
                void openRun(requestedRunId);
            return;
        }
        detailId.current = "";
        setDetail(null);
        setOpening(false);
        setDecisionReason("");
        setSelection("");
        setOutcomeReason("");
    }, [openRun, requestedRunId]);
    const runRequest = async (event) => {
        event.preventDefault();
        if (requestReason.trim().length < 3 || !boundedWindow(from, to) || !allowed(context, kind))
            return;
        const payload = { kind, reason: requestReason.trim(), from, to, ...(kind === "PROJECT" ? { projectId } : {}), ...(kind === "ASSIGNMENT" ? { taskId, purpose, broaderSearch } : {}) };
        if ((kind === "PROJECT" && !projectId) || (kind === "ASSIGNMENT" && !taskId))
            return;
        const key = JSON.stringify(payload);
        if (commandRef.current?.key !== key)
            commandRef.current = { key, id: uuid() };
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const created = await api("/runs", csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandRef.current.id, ...payload }) });
            commandRef.current = null;
            setNotice("Evidence summary saved. Review it as advice only; complete any business action through its ordinary workflow.");
            setRequestReason("");
            await load();
            await openRun(created.id ?? created.run?.id ?? "");
        }
        catch (cause) {
            setError(reasonText(cause, "Evidence request"));
        }
        finally {
            setBusy(false);
        }
    };
    const decide = async (outcome) => {
        if (!detail || decisionReason.trim().length < 3)
            return;
        const selected = outcome === "REJECTED" ? undefined : selection;
        if (detail.result?.kind === "ASSIGNMENT" && outcome !== "REJECTED" && !selected)
            return;
        const payload = { expectedDecisionVersion: detail.decisionVersion ?? 0, outcome, reason: decisionReason.trim(), ...(selected ? { selection: { purpose: detail.result?.candidates?.find(candidate => candidate.employeeId === selected)?.purpose ?? purpose, employeeId: selected } } : {}) };
        const key = JSON.stringify({ runId: detail.id, ...payload });
        if (commandRef.current?.key !== key)
            commandRef.current = { key, id: uuid() };
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await api(`/runs/${encodeURIComponent(detail.id)}/decisions`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandRef.current.id, ...payload }) });
            commandRef.current = null;
            setDecisionReason("");
            setNotice("Nonbinding human decision recorded. No task, reviewer, deadline, or other domain record was changed.");
            await load();
            await openRun(detail.id);
        }
        catch (cause) {
            setError(reasonText(cause, "Decision"));
        }
        finally {
            setBusy(false);
        }
    };
    const recordOutcome = async () => {
        const taskId = detail?.taskId ?? detail?.request?.taskId ?? "";
        if (!detail || !taskId || outcomeReason.trim().length < 3)
            return;
        const accepted = [...(detail.decisions ?? [])].reverse().find(decision => ["ACCEPTED", "OVERRIDDEN"].includes(decision.outcome ?? ""));
        if (!accepted)
            return;
        const payload = { expectedDecisionVersion: detail.decisionVersion ?? 0, decisionId: accepted.id, taskId, reason: outcomeReason.trim() };
        const key = JSON.stringify({ runId: detail.id, ...payload });
        if (commandRef.current?.key !== key)
            commandRef.current = { key, id: uuid() };
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await api(`/runs/${encodeURIComponent(detail.id)}/outcomes`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandRef.current.id, ...payload }) });
            commandRef.current = null;
            setOutcomeReason("");
            setNotice("Source-linked observation saved. This records current state; it does not imply the suggestion caused it.");
            await load();
            await openRun(detail.id);
        }
        catch (cause) {
            setError(reasonText(cause, "Outcome observation"));
        }
        finally {
            setBusy(false);
        }
    };
    const result = detail?.result;
    const assignment = result?.kind === "ASSIGNMENT";
    const canDecide = detail?.capabilities?.canDecide === true;
    const canRecordOutcome = detail?.capabilities?.canRecordOutcome === true;
    const outcomeTaskId = detail?.taskId ?? detail?.request?.taskId ?? "";
    return _jsxs("section", { className: "ai-assist", "aria-labelledby": "ai-assist-title", children: [_jsxs("header", { className: "ai-assist-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "ai-assist-kicker", children: "Internal workspace" }), _jsx("h2", { id: "ai-assist-title", children: "Evidence assistance" }), _jsx("p", { children: "Deterministic evidence summaries and explainable candidates, using only your currently authorized records." })] }), _jsx("button", { type: "button", className: "ai-assist-secondary", onClick: () => void load(), disabled: loading || busy, children: "Refresh" })] }), _jsx("p", { className: "ai-assist-limit", role: "note", children: "Provider-independent deterministic assistance \u00B7 no live inference or external data transmission. Suggestions never finalize assignments, reviews, deadlines, skills, publications, or other business actions." }), error && _jsx("p", { className: "ai-assist-error", role: "alert", children: error }), notice && _jsx("p", { className: "ai-assist-notice", role: "status", children: notice }), loading && _jsx("p", { role: "status", children: "Loading current permissions and saved assistance\u2026" }), !loading && !context && _jsxs("div", { className: "ai-assist-panel", children: [_jsx("h3", { children: "Unavailable" }), _jsx("p", { children: "Current assistance access could not be confirmed. Refresh to check again." })] }), !loading && context && _jsxs(_Fragment, { children: [_jsxs("form", { className: "ai-assist-panel", onSubmit: event => void runRequest(event), children: [_jsx("h3", { children: "Request a bounded evidence summary" }), _jsxs("div", { className: "ai-assist-grid", children: [_jsxs("label", { children: ["Request type", _jsx("select", { value: kind, onChange: event => setKind(event.target.value), children: ["DAILY", "PROJECT", "MANAGEMENT", "ASSIGNMENT"].filter(value => allowed(context, value)).map(value => _jsx("option", { value: value, children: value === "DAILY" ? "Daily priorities" : value === "PROJECT" ? "Project summary" : value === "MANAGEMENT" ? "Management evidence" : "Assignment candidates" }, value)) })] }), kind === "PROJECT" && _jsxs("label", { children: ["Project", _jsxs("select", { value: projectId, onChange: event => setProjectId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an accessible project" }), (context.projects ?? []).map(project => _jsx("option", { value: project.id, children: nameOf(project) }, project.id))] })] }), kind === "ASSIGNMENT" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Task", _jsxs("select", { value: taskId, onChange: event => setTaskId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an accessible task" }), (context.tasks ?? []).map(task => _jsx("option", { value: task.id, children: nameOf(task) }, task.id))] })] }), _jsxs("label", { children: ["Candidate purpose", _jsxs("select", { value: purpose, onChange: event => setPurpose(event.target.value), children: [_jsx("option", { value: "PRIMARY_OWNER", children: "Primary owner" }), _jsx("option", { value: "COLLABORATOR", children: "Collaborator" }), _jsx("option", { value: "REVIEWER", children: "Independent reviewer" })] })] }), context.capabilities?.canBroaderSearch && _jsxs("label", { className: "ai-assist-check", children: [_jsx("input", { type: "checkbox", checked: broaderSearch, onChange: event => setBroaderSearch(event.target.checked) }), " Search beyond the task\u2019s current Team (authorized leaders only)"] })] }), _jsxs("label", { children: ["From", _jsx("input", { type: "date", value: from, onChange: event => setFrom(event.target.value), required: true })] }), _jsxs("label", { children: ["To", _jsx("input", { type: "date", value: to, onChange: event => setTo(event.target.value), required: true })] }), _jsxs("label", { className: "ai-assist-wide", children: ["Request reason", _jsx("textarea", { value: requestReason, onChange: event => setRequestReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] })] }), _jsx("div", { className: "ai-assist-actions", children: _jsx("button", { type: "submit", disabled: busy || !allowed(context, kind) || !boundedWindow(from, to) || requestReason.trim().length < 3, children: "Generate evidence summary" }) }), (from && to && !boundedWindow(from, to)) && _jsx("p", { className: "ai-assist-error", role: "status", children: "Choose an ordered date range of no more than 31 calendar days." }), Object.keys(context.capabilities ?? {}).length === 0 && _jsx("p", { className: "ai-assist-muted", children: "No supported request is currently available for this role." }), (context.unavailableCapabilities ?? context.unavailable ?? []).map((item, index) => _jsx("p", { className: "ai-assist-muted", children: item }, `${index}-${item}`))] }), _jsxs("div", { className: "ai-assist-columns", children: [_jsxs("section", { className: "ai-assist-panel", "aria-label": "Saved evidence", children: [_jsx("h3", { children: "Saved evidence" }), runs.length === 0 ? _jsx("p", { role: "status", children: "No evidence summaries are available in your current scope." }) : _jsx("ul", { className: "ai-assist-list", children: runs.map(run => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: run.kind ?? "Evidence summary" }), _jsx("span", { children: run.createdAt ? new Date(run.createdAt).toLocaleString() : "Date unavailable" })] }), _jsx("button", { type: "button", className: "ai-assist-secondary", onClick: () => void openRun(run.id), children: "Open" })] }, run.id)) })] }), _jsxs("section", { className: "ai-assist-panel", "aria-label": "Selected evidence", children: [_jsx("h3", { children: "Selected evidence" }), opening && !detail && _jsx("p", { role: "status", children: "Rechecking access and loading saved evidence\u2026" }), !detail && !opening && _jsx("p", { role: "status", children: "Choose a saved item to review its currently authorized evidence." }), detail && _jsxs(_Fragment, { children: [_jsxs("p", { className: "ai-assist-provider", children: [result?.provider ?? (typeof context.provider === "string" ? context.provider : context.provider?.name) ?? "deterministic-evidence-v1", " \u00B7 ", result?.providerVersion ?? context.providerVersion ?? "model none"] }), _jsx("p", { children: result?.summary ?? detail.summary ?? "No summary was returned." }), _jsx("p", { className: "ai-assist-muted", children: "This is an unranked, source-grounded aid. Review the evidence and unavailable factors; it is not a decision or action." }), !!result?.facts?.length && _jsxs("div", { children: [_jsx("h4", { children: "Evidence" }), _jsx("ul", { children: result.facts.map((fact, index) => _jsxs("li", { children: [_jsxs("strong", { children: [fact.label ?? fact.title ?? fact.type ?? "Source", " \u00B7 ", readableField(fact.field)] }), ": ", jsonText(fact.value ?? fact.summary), fact.sourceDate ? ` · Source date ${fact.sourceDate}` : fact.observedAt ? ` · Observed ${fact.observedAt}` : "", sourceHref(fact.source) && _jsx("span", { className: "ai-assist-source", children: _jsx(SourceLink, { source: fact.source }) })] }, fact.id ?? fact.sourceId ?? index)) })] }), !!result?.candidates?.length && _jsxs("div", { children: [_jsx("h4", { children: "Eligible candidates (unranked)" }), _jsx("ul", { className: "ai-assist-candidates", children: result.candidates.map(candidate => _jsxs("li", { children: [_jsxs("label", { children: [_jsx("input", { type: "radio", name: "ai-selection", value: candidate.employeeId, checked: selection === candidate.employeeId, onChange: () => setSelection(candidate.employeeId), disabled: !assignment }), _jsx("strong", { children: candidate.label ?? candidate.displayName ?? "Authorized candidate" })] }), _jsxs("span", { children: [typeof candidate.team === "string" ? candidate.team : candidate.team?.label ?? (candidate.teamId ? `Team ${candidate.teamId}` : "Team unavailable"), " \u00B7 ", candidate.eligible === false ? "Currently unavailable" : "Eligible when checked"] }), candidate.factors?.map((factor, index) => _jsxs("span", { children: [factor.label ?? factor.key ?? "Factor", ": ", jsonText(factor.value), factor.status ? ` (${factor.status})` : "", sourceHref(factor.source) && _jsx("span", { className: "ai-assist-source", children: _jsx(SourceLink, { source: factor.source }) })] }, `${factor.key ?? index}`)), assignment && candidate.purpose === "PRIMARY_OWNER" && outcomeTaskId && _jsx("a", { className: "ai-assist-source-link", href: `/tasks?taskId=${encodeURIComponent(outcomeTaskId)}`, children: "Open task workflow" }), assignment && candidate.purpose === "REVIEWER" && outcomeTaskId && _jsx("a", { className: "ai-assist-source-link", href: `/reviews?taskId=${encodeURIComponent(outcomeTaskId)}`, children: "Open review workflow" }), assignment && candidate.purpose === "COLLABORATOR" && _jsx("p", { className: "ai-assist-handoff-unavailable", children: "Collaborator handoff is unavailable here. The current task API has no add or remove participant operation; use the ordinary task workflow if collaboration needs to change." })] }, `${candidate.purpose ?? "candidate"}:${candidate.employeeId}`)) })] }), [...(result?.unavailableFactors ?? []), ...(result?.limitations ?? [])].length > 0 && _jsxs("div", { className: "ai-assist-limitations", children: [_jsx("h4", { children: "Unavailable factors and limitations" }), _jsx("ul", { children: [...(result?.unavailableFactors ?? []), ...(result?.limitations ?? [])].map((item, index) => _jsx("li", { children: item }, `${index}-${item}`)) })] }), !!detail.decisions?.length && _jsxs("div", { children: [_jsx("h4", { children: "Decision and observation history" }), _jsx("ol", { children: detail.decisions.map(decision => decision.kind === "OUTCOME" ? _jsxs("li", { children: [_jsx("strong", { children: "Verified source observation" }), decision.observation ? _jsxs(_Fragment, { children: [_jsxs("p", { children: ["Current task state: ", readableState(decision.observation.observedState), " \u00B7 Task version ", decision.observation.taskVersion ?? "Unavailable", decision.observation.observedAt ? ` · Observed ${decision.observation.observedAt}` : ""] }), decision.observation.taskId && _jsxs("p", { children: ["Source task: ", decision.observation.taskId] })] }) : _jsx("p", { children: "Observation details are unavailable under current access." }), decision.reason && _jsxs("p", { children: ["Reason: ", decision.reason] }), _jsx("p", { className: "ai-assist-muted", children: "This records the observed source state; it does not imply the suggestion caused it." })] }, decision.id) : _jsxs("li", { children: [_jsx("strong", { children: decision.outcome ?? decision.kind ?? "Decision" }), decision.actorLabel ? ` · ${decision.actorLabel}` : "", decision.reason ? ` · ${decision.reason}` : ""] }, decision.id)) })] }), canDecide && _jsxs("div", { className: "ai-assist-decision", children: [_jsx("h4", { children: "Record a nonbinding human decision" }), _jsxs("label", { children: ["Decision reason", _jsx("textarea", { value: decisionReason, onChange: event => setDecisionReason(event.target.value), minLength: 3, maxLength: 1000 })] }), _jsxs("div", { className: "ai-assist-actions", children: [_jsx("button", { type: "button", disabled: busy || decisionReason.trim().length < 3 || (assignment && !selection), onClick: () => void decide("ACCEPTED"), children: "Accept suggestion" }), _jsx("button", { type: "button", className: "ai-assist-secondary", disabled: busy || decisionReason.trim().length < 3, onClick: () => void decide("REJECTED"), children: "Reject" }), assignment && _jsx("button", { type: "button", className: "ai-assist-secondary", disabled: busy || decisionReason.trim().length < 3 || !selection, onClick: () => void decide("OVERRIDDEN"), children: "Record override" })] }), _jsx("p", { className: "ai-assist-muted", children: "Acceptance records your choice only. Use the ordinary authorized task or review workflow to make any change." })] }), detail.result?.kind === "ASSIGNMENT" && canRecordOutcome && _jsxs("div", { className: "ai-assist-decision", children: [_jsx("h4", { children: "Record a later source observation" }), _jsx("p", { children: outcomeTaskId ? `Bound to task ${outcomeTaskId}` : "The original task reference is unavailable; outcome recording is unavailable." }), _jsxs("label", { children: ["Outcome reason", _jsx("textarea", { value: outcomeReason, onChange: event => setOutcomeReason(event.target.value), minLength: 3, maxLength: 1000 })] }), _jsx("button", { type: "button", className: "ai-assist-secondary", disabled: busy || !outcomeTaskId || outcomeReason.trim().length < 3, onClick: () => void recordOutcome(), children: "Record verified outcome" }), _jsx("p", { className: "ai-assist-muted", children: "The current task state is verified by its owning workflow; this observation does not infer causation or success." })] })] })] })] })] })] });
}
