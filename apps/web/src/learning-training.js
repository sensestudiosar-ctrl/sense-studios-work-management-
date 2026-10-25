import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowSearchParams } from "./use-window-search-params.js";
import "./learning-training.css";
const apiBase = "/api/v1/training";
const commandId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
async function request(url, csrf, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("X-CSRF-Token", csrf);
    if (init.body)
        headers.set("Content-Type", "application/json");
    const response = await fetch(url, { ...init, headers, credentials: "include" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return body;
}
const stateLabel = { ASSIGNED: "Assigned", SUBMITTED: "Submitted for review", CHANGES_REQUIRED: "Changes required", COMPLETED: "Completed" };
const asText = (value) => typeof value === "string" ? value : "";
export function TrainingWorkspace({ csrfToken, preserveEmployeeQuery = false }) {
    const [searchParams, setSearchParams] = useWindowSearchParams();
    const queryEmployeeId = searchParams.get("employeeId") ?? "", queryAssignmentId = searchParams.get("assignmentId") ?? "";
    const [setup, setSetup] = useState(null), [selectedEmployeeId, setSelectedEmployeeIdState] = useState(queryEmployeeId), [selectedAssignmentId, setSelectedAssignmentIdState] = useState(queryAssignmentId);
    const [detail, setDetail] = useState(null), [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false), [pending, setPending] = useState(false);
    const [error, setError] = useState(""), [notice, setNotice] = useState("");
    const [moduleVersionId, setModuleVersionId] = useState(""), [reviewerAccountId, setReviewerAccountId] = useState(""), [assignReason, setAssignReason] = useState(""), [recommendationReason, setRecommendationReason] = useState(""), [assignPracticalTaskId, setAssignPracticalTaskId] = useState("");
    const [answers, setAnswers] = useState({}), [submissionNote, setSubmissionNote] = useState(""), [submissionReason, setSubmissionReason] = useState(""), [submissionTaskId, setSubmissionTaskId] = useState("");
    const [assessmentObservation, setAssessmentObservation] = useState(""), [assessmentReason, setAssessmentReason] = useState(""), [effectivenessDate, setEffectivenessDate] = useState(""), [effectivenessObservation, setEffectivenessObservation] = useState(""), [effectivenessReason, setEffectivenessReason] = useState(""), [effectivenessTaskId, setEffectivenessTaskId] = useState("");
    const detailSequence = useRef(0);
    const updateTrainingQuery = useCallback((changes, replace = false) => {
        setSearchParams(current => { const next = new URLSearchParams(current); for (const [key, value] of Object.entries(changes)) {
            if (value)
                next.set(key, value);
            else
                next.delete(key);
        } return next; }, { replace });
    }, [setSearchParams]);
    const setSelectedEmployeeId = useCallback((id, replace = false) => { setSelectedEmployeeIdState(id); updateTrainingQuery({ employeeId: id }, replace); }, [updateTrainingQuery]);
    const setSelectedAssignmentId = useCallback((id, replace = false) => { setSelectedAssignmentIdState(id); updateTrainingQuery({ assignmentId: id }, replace); }, [updateTrainingQuery]);
    useEffect(() => { setSelectedEmployeeIdState(queryEmployeeId); }, [queryEmployeeId]);
    useEffect(() => { setSelectedAssignmentIdState(queryAssignmentId); }, [queryAssignmentId]);
    const loadSetup = useCallback(async (preferredAssignment) => {
        const result = await request(`${apiBase}/setup`, csrfToken);
        setSetup(result);
        const params = new URLSearchParams(window.location.search);
        const requestedEmployeeId = params.get("employeeId"), requestedAssignmentId = params.get("assignmentId");
        const employeeId = requestedEmployeeId && result.employees.some(item => item.id === requestedEmployeeId) ? requestedEmployeeId : result.employees[0]?.id ?? "";
        const assignmentId = requestedAssignmentId ? (result.assignments.some(item => item.id === requestedAssignmentId) ? requestedAssignmentId : "") : preferredAssignment && result.assignments.some(item => item.id === preferredAssignment) ? preferredAssignment : result.assignments[0]?.id ?? "";
        setSelectedEmployeeIdState(employeeId);
        setSelectedAssignmentIdState(assignmentId);
        // Skills has its own authorized employee selection on the legacy combined
        // page; background Training setup must not replace that shared URL value.
        updateTrainingQuery({ ...(preserveEmployeeQuery ? {} : { employeeId }), assignmentId }, true);
        return result;
    }, [csrfToken, preserveEmployeeQuery, updateTrainingQuery]);
    const loadDetail = useCallback(async (id) => {
        const seq = ++detailSequence.current;
        if (!id) {
            setDetail(null);
            setDetailLoading(false);
            return;
        }
        setDetailLoading(true);
        try {
            const result = await request(`${apiBase}/assignments/${encodeURIComponent(id)}`, csrfToken);
            if (seq === detailSequence.current) {
                setDetail(result);
                setError("");
            }
        }
        catch (cause) {
            if (seq === detailSequence.current) {
                setDetail(null);
                setError(cause instanceof Error ? cause.message : "Could not load this assignment.");
            }
        }
        finally {
            if (seq === detailSequence.current)
                setDetailLoading(false);
        }
    }, [csrfToken]);
    const refresh = useCallback(async (preferred) => {
        const result = await loadSetup(preferred);
        const targetId = preferred && result.assignments.some(item => item.id === preferred) ? preferred : result.assignments.some(item => item.id === selectedAssignmentId) ? selectedAssignmentId : result.assignments[0]?.id ?? "";
        setSelectedAssignmentId(targetId, true);
        await loadDetail(targetId);
    }, [loadDetail, loadSetup, selectedAssignmentId, setSelectedAssignmentId]);
    useEffect(() => {
        let current = true;
        setLoading(true);
        setError("");
        void loadSetup().catch(cause => { if (current)
            setError(cause instanceof Error ? cause.message : "Could not load Training."); }).finally(() => { if (current)
            setLoading(false); });
        return () => { current = false; detailSequence.current++; };
    }, [loadSetup]);
    useEffect(() => {
        setDetail(null);
        setAnswers({});
        setSubmissionNote("");
        setSubmissionReason("");
        setAssessmentObservation("");
        setAssessmentReason("");
        setEffectivenessDate("");
        setEffectivenessObservation("");
        setEffectivenessReason("");
        void loadDetail(selectedAssignmentId);
    }, [selectedAssignmentId, loadDetail]);
    const selectedModules = setup?.modulesByEmployee.find(item => item.employeeId === selectedEmployeeId)?.modules ?? [];
    const selectedReviewers = setup?.reviewers.find(item => item.employeeId === selectedEmployeeId)?.reviewers ?? [];
    const targetTasks = setup?.practicalTasks.filter(task => task.employeeId === selectedEmployeeId) ?? [];
    const selectedModule = selectedModules.find(item => item.versionId === moduleVersionId);
    const manageable = !!setup && setup.capabilities.manageableEmployeeIds.includes(selectedEmployeeId);
    const employeeLabel = (id) => setup?.employees.find(employee => employee.id === id)?.label ?? "Employee";
    const moduleLabel = (id) => setup?.modulesByEmployee.flatMap(item => item.modules).find(module => module.versionId === id)?.title ?? "Training module";
    const activeTasks = targetTasks.filter(task => task.status !== "COMPLETED");
    const questionList = useMemo(() => detail?.module.content.assessment?.quiz ?? [], [detail]);
    const act = async (path, payload, success, assignmentId = selectedAssignmentId) => {
        setPending(true);
        setError("");
        setNotice("");
        try {
            const result = await request(`${apiBase}${path}`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), ...payload }) });
            setNotice(success);
            await refresh(result.id ?? assignmentId);
        }
        catch (cause) {
            const err = cause;
            if (err.status === 409 || err.status === 403) {
                const message = err.status === 409 ? "Training changed since it was loaded. Current state was refreshed; review it before trying again." : "Your current training access changed. The available training state was refreshed.";
                setDetail(null);
                setError(message);
                try {
                    await refresh(assignmentId);
                }
                catch {
                    setSetup(null);
                    setSelectedAssignmentId("");
                }
            }
            else
                setError(cause instanceof Error ? cause.message : "The training action could not be saved.");
        }
        finally {
            setPending(false);
        }
    };
    const assign = (event) => {
        event.preventDefault();
        if (!selectedEmployeeId || !moduleVersionId || !reviewerAccountId)
            return;
        void act("/assignments", { employeeId: selectedEmployeeId, moduleVersionId, reviewerAccountId, reason: assignReason.trim(), ...(recommendationReason.trim() ? { recommendationReason: recommendationReason.trim() } : {}), ...(assignPracticalTaskId ? { practicalTaskId: assignPracticalTaskId } : {}) }, "Training assigned.", "");
        setSelectedAssignmentId("");
    };
    const submit = (event) => {
        event.preventDefault();
        if (!detail)
            return;
        const answersBody = questionList.map(question => ({ questionId: question.id, optionIds: answers[question.id] ?? [] }));
        void act(`/assignments/${encodeURIComponent(detail.assignment.id)}/submissions`, { expectedVersion: detail.assignment.version, ...(questionList.length ? { answers: answersBody } : {}), ...(submissionTaskId ? { practicalTaskId: submissionTaskId } : {}), note: submissionNote.trim(), reason: submissionReason.trim() }, "Submission saved for the named reviewer.");
    };
    const assess = (outcome) => {
        if (!detail)
            return;
        void act(`/assignments/${encodeURIComponent(detail.assignment.id)}/assessments`, { expectedVersion: detail.assignment.version, outcome, observation: assessmentObservation.trim(), reason: assessmentReason.trim() }, outcome === "PASSED" ? "Training marked complete by the reviewer." : "Changes requested. The trainee may submit again.");
    };
    const recordEffectiveness = (event) => {
        event.preventDefault();
        if (!detail)
            return;
        void act(`/assignments/${encodeURIComponent(detail.assignment.id)}/effectiveness`, { date: effectivenessDate, observation: effectivenessObservation.trim(), ...(effectivenessTaskId ? { practicalTaskId: effectivenessTaskId } : {}), reason: effectivenessReason.trim() }, "Effectiveness observation recorded.");
    };
    const toggleOption = (questionId, optionId, checked) => setAnswers(current => {
        const options = new Set(current[questionId] ?? []);
        if (checked)
            options.add(optionId);
        else
            options.delete(optionId);
        return { ...current, [questionId]: [...options] };
    });
    if (loading)
        return _jsx("section", { className: "training-workspace", "aria-busy": "true", children: _jsx("p", { role: "status", children: "Loading Training\u2026" }) });
    if (!setup)
        return _jsxs("section", { className: "training-workspace", children: [_jsx("h2", { children: "Training" }), _jsx("div", { className: "training-alert", role: "alert", children: error || "Training is unavailable." }), _jsx("button", { type: "button", onClick: () => { setLoading(true); void loadSetup().catch(cause => setError(cause instanceof Error ? cause.message : "Could not load Training.")).finally(() => setLoading(false)); }, children: "Retry" })] });
    return _jsxs("section", { className: "training-workspace", "aria-busy": pending || detailLoading, children: [_jsxs("header", { className: "training-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Training" }), _jsx("p", { children: "Complete the exact assigned module. A named reviewer records the decision; completion does not change an official skill rating." })] }), _jsx("button", { type: "button", className: "training-secondary", disabled: pending, onClick: () => void refresh(), children: "Refresh" })] }), error && _jsx("div", { className: "training-alert", role: "alert", children: error }), notice && _jsx("div", { className: "training-notice", role: "status", children: notice }), setup.assignments.length === 0 && !setup.capabilities.canManage && _jsx("p", { className: "training-empty", role: "status", children: "No training assignments are available to you." }), setup.assignments.length > 0 && _jsxs("div", { className: "training-picker", children: [_jsx("label", { htmlFor: "training-assignment", children: "Assignment" }), _jsxs("select", { id: "training-assignment", value: selectedAssignmentId, onChange: event => setSelectedAssignmentId(event.target.value), children: [_jsx("option", { value: "", children: "Choose assignment" }), setup.assignments.map(item => _jsxs("option", { value: item.id, children: [employeeLabel(item.employeeId), " \u00B7 ", moduleLabel(item.moduleVersionId), " \u00B7 ", stateLabel[item.state] ?? item.state] }, item.id))] })] }), setup.capabilities.canManage && _jsxs("section", { className: "training-panel", children: [_jsx("h3", { children: "Assign training" }), _jsx("p", { children: "Select an employee, a module version they can currently access, and a named eligible reviewer." }), _jsxs("form", { className: "training-form", onSubmit: assign, children: [_jsxs("label", { children: ["Employee", _jsxs("select", { value: selectedEmployeeId, onChange: event => { setSelectedEmployeeId(event.target.value); setModuleVersionId(""); setReviewerAccountId(""); setAssignPracticalTaskId(""); }, required: true, children: [_jsx("option", { value: "", children: "Choose employee" }), setup.employees.filter(item => setup.capabilities.manageableEmployeeIds.includes(item.id)).map(item => _jsx("option", { value: item.id, children: item.label }, item.id))] })] }), _jsxs("label", { children: ["Module", _jsxs("select", { value: moduleVersionId, onChange: event => setModuleVersionId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an accessible module" }), selectedModules.map(item => _jsxs("option", { value: item.versionId, children: [item.title, " \u00B7 Version ", item.version] }, item.versionId))] })] }), selectedModule && _jsxs("p", { className: "training-wide", children: [_jsx("strong", { children: "Assessment criteria:" }), " ", selectedModule.assessment.criteria, selectedModule.assessment.questionCount > 0 && ` · Quiz questions: ${selectedModule.assessment.questionCount}`, selectedModule.assessment.practicalRequired && " · Practical evidence required"] }), _jsxs("label", { children: ["Named reviewer", _jsxs("select", { value: reviewerAccountId, onChange: event => setReviewerAccountId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose eligible reviewer" }), selectedReviewers.map(item => _jsx("option", { value: item.accountId, children: item.label }, item.accountId))] })] }), _jsxs("label", { children: ["Practical task (optional)", _jsxs("select", { value: assignPracticalTaskId, onChange: event => setAssignPracticalTaskId(event.target.value), children: [_jsx("option", { value: "", children: "No task selected" }), activeTasks.map(task => _jsx("option", { value: task.id, children: task.title }, task.id))] })] }), _jsxs("label", { className: "training-wide", children: ["Assignment reason", _jsx("textarea", { value: assignReason, onChange: event => setAssignReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2, required: true })] }), _jsxs("label", { className: "training-wide", children: ["Recommendation reason (optional)", _jsx("textarea", { value: recommendationReason, onChange: event => setRecommendationReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2 })] }), _jsx("button", { type: "submit", disabled: pending || !manageable || !moduleVersionId || !reviewerAccountId || assignReason.trim().length < 3, children: "Assign" }), !selectedModules.length && _jsx("p", { className: "training-empty", role: "status", children: "No currently accessible published modules are available for this employee." }), !selectedReviewers.length && _jsx("p", { className: "training-empty", role: "status", children: "No eligible independent reviewer is available." })] })] }), detailLoading && _jsx("p", { role: "status", children: "Loading assignment\u2026" }), detail && _jsxs("section", { className: "training-panel", "aria-label": "Training assignment detail", children: [_jsx("div", { className: "training-assignment-heading", children: _jsxs("div", { children: [_jsxs("h3", { children: [detail.module.title, " \u00B7 Version ", detail.module.version] }), _jsxs("p", { children: [employeeLabel(detail.assignment.employeeId), " \u00B7 ", stateLabel[detail.assignment.state] ?? detail.assignment.state, " \u00B7 Version ", detail.assignment.version] })] }) }), _jsxs("div", { className: "training-module-content", children: [_jsx("h4", { children: "Module content" }), detail.module.content.blocks.map((block, index) => _jsx(ModuleBlock, { block: block, references: detail.module.references ?? [] }, `${String(block.type)}-${index}`)), detail.module.content.assessment && _jsxs("div", { className: "training-criteria", children: [_jsx("h4", { children: "Assessment criteria" }), _jsx("p", { children: detail.module.content.assessment.criteria }), detail.module.content.assessment.minimumCorrect !== undefined && _jsxs("p", { children: ["Quiz threshold: ", detail.module.content.assessment.minimumCorrect, " correct out of ", questionList.length, "."] }), detail.module.content.assessment.practicalRequired && _jsx("p", { children: "Practical evidence is required." })] })] }), detail.capabilities.canSubmit && _jsxs("form", { className: "training-form training-action", onSubmit: submit, children: [_jsx("h4", { className: "training-wide", children: "Your submission" }), questionList.map(question => _jsxs("fieldset", { className: "training-question training-wide", children: [_jsx("legend", { children: question.prompt }), question.options.map(option => _jsxs("label", { className: "training-option", children: [_jsx("input", { type: "checkbox", checked: (answers[question.id] ?? []).includes(option.id), onChange: event => toggleOption(question.id, option.id, event.target.checked) }), option.label] }, option.id))] }, question.id)), (detail.module.content.assessment?.practicalRequired || typeof detail.assignment.data?.practicalTaskId === "string") && _jsxs("label", { children: ["Completed practical task", _jsxs("select", { value: submissionTaskId, onChange: event => setSubmissionTaskId(event.target.value), required: detail.module.content.assessment?.practicalRequired, children: [_jsx("option", { value: "", children: detail.module.content.assessment?.practicalRequired ? "Choose completed task" : "Use assigned task" }), setup.practicalTasks.filter(task => task.employeeId === detail.assignment.employeeId && task.status === "COMPLETED").map(task => _jsx("option", { value: task.id, children: task.title }, task.id))] })] }), _jsxs("label", { className: "training-wide", children: ["Submission note", _jsx("textarea", { value: submissionNote, onChange: event => setSubmissionNote(event.target.value), minLength: 3, maxLength: 2000, rows: 3, required: true })] }), _jsxs("label", { className: "training-wide", children: ["Reason", _jsx("textarea", { value: submissionReason, onChange: event => setSubmissionReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2, required: true })] }), _jsx("button", { type: "submit", disabled: pending || submissionNote.trim().length < 3 || submissionReason.trim().length < 3 || detail.module.content.assessment?.practicalRequired && !submissionTaskId, children: "Submit for review" })] }), detail.capabilities.canAssess && _jsxs("div", { className: "training-action", children: [_jsx("h4", { children: "Reviewer assessment" }), _jsx("p", { children: "Review the authored criteria and submitted evidence. Passing is an explicit human decision." }), _jsxs("label", { children: ["Observation", _jsx("textarea", { value: assessmentObservation, onChange: event => setAssessmentObservation(event.target.value), minLength: 3, maxLength: 2000, rows: 3 })] }), _jsxs("label", { children: ["Decision reason", _jsx("textarea", { value: assessmentReason, onChange: event => setAssessmentReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2 })] }), _jsxs("div", { className: "training-actions", children: [_jsx("button", { type: "button", disabled: pending || assessmentObservation.trim().length < 3 || assessmentReason.trim().length < 3, onClick: () => assess("PASSED"), children: "Pass and complete" }), _jsx("button", { className: "training-secondary", type: "button", disabled: pending || assessmentObservation.trim().length < 3 || assessmentReason.trim().length < 3, onClick: () => assess("CHANGES_REQUIRED"), children: "Request changes" })] })] }), detail.capabilities.canRecordEffectiveness && _jsxs("form", { className: "training-form training-action", onSubmit: recordEffectiveness, children: [_jsx("h4", { className: "training-wide", children: "Effectiveness observation" }), _jsxs("label", { children: ["Date observed", _jsx("input", { type: "date", value: effectivenessDate, onChange: event => setEffectivenessDate(event.target.value), required: true })] }), _jsxs("label", { children: ["Related completed practical task (optional)", _jsxs("select", { value: effectivenessTaskId, onChange: event => setEffectivenessTaskId(event.target.value), children: [_jsx("option", { value: "", children: "None" }), setup.practicalTasks.filter(task => task.employeeId === detail.assignment.employeeId && task.status === "COMPLETED").map(task => _jsx("option", { value: task.id, children: task.title }, task.id))] })] }), _jsxs("label", { className: "training-wide", children: ["Observation", _jsx("textarea", { value: effectivenessObservation, onChange: event => setEffectivenessObservation(event.target.value), minLength: 3, maxLength: 2000, rows: 3, required: true })] }), _jsxs("label", { className: "training-wide", children: ["Reason", _jsx("textarea", { value: effectivenessReason, onChange: event => setEffectivenessReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2, required: true })] }), _jsx("button", { type: "submit", disabled: pending || !effectivenessDate || effectivenessObservation.trim().length < 3 || effectivenessReason.trim().length < 3, children: "Record observation" })] }), _jsxs("section", { className: "training-history", children: [_jsx("h4", { children: "Training evidence and history" }), detail.history.length === 0 && detail.attempts.length === 0 ? _jsx("p", { className: "training-empty", role: "status", children: "No submissions or reviews yet." }) : _jsxs("ol", { children: [detail.history.map(item => _jsxs("li", { children: [_jsxs("strong", { children: [stateLabel[item.state] ?? item.state, " \u00B7 Version ", item.version] }), _jsx("p", { children: item.reason }), _jsx("time", { children: new Date(item.occurredAt).toLocaleString() })] }, item.id)), detail.attempts.map(item => _jsxs("li", { children: [_jsxs("strong", { children: [item.kind === "EFFECTIVENESS" ? "Effectiveness observation" : item.kind === "ASSESSMENT" ? "Reviewer assessment" : "Submission", " \u00B7 Attempt ", item.sequence] }), item.kind === "ASSESSMENT" && _jsxs("p", { children: ["Outcome: ", asText(item.payload.outcome)] }), typeof item.payload.quizCorrect === "number" && typeof item.payload.quizCount === "number" && _jsxs("p", { children: ["Quiz result: ", item.payload.quizCorrect, " of ", item.payload.quizCount, " correct"] }), _jsx("p", { children: item.kind === "EFFECTIVENESS" ? `${asText(item.payload.date)} · ${asText(item.payload.observation)}` : asText(item.payload.observation) || asText(item.payload.note) }), _jsx("p", { children: item.reason }), _jsx("time", { children: new Date(item.occurredAt).toLocaleString() })] }, item.id))] })] }), typeof detail.assignment.data?.recommendationReason === "string" && _jsxs("div", { className: "training-recommendation", children: [_jsx("h4", { children: "Manager recommendation" }), _jsx("p", { children: detail.assignment.data.recommendationReason }), _jsx("p", { children: "This recommendation does not change an official skill rating." })] }), detail.assignment.state === "COMPLETED" && _jsx(TrainingSkillRecommendation, { csrfToken: csrfToken, employeeId: detail.assignment.employeeId, trainingSourceId: detail.assignment.id }, detail.assignment.id)] })] });
}
function TrainingSkillRecommendation({ csrfToken, employeeId, trainingSourceId }) {
    const [setup, setSetup] = useState(null), [profile, setProfile] = useState(null), [skillId, setSkillId] = useState(""), [level, setLevel] = useState(""), [approverId, setApproverId] = useState(""), [reason, setReason] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [pending, setPending] = useState(false);
    const load = useCallback(async () => {
        const [nextSetup, nextProfile] = await Promise.all([request("/api/v1/skills/setup", csrfToken), request(`/api/v1/skills/employees/${encodeURIComponent(employeeId)}`, csrfToken)]);
        setSetup(nextSetup);
        setProfile(nextProfile);
    }, [csrfToken, employeeId]);
    useEffect(() => { let current = true; void load().catch(cause => { if (current)
        setError(cause instanceof Error ? cause.message : "Could not load skill recommendation status."); }); return () => { current = false; }; }, [load]);
    const relevant = profile?.requests.filter(item => item.trainingSourceId === trainingSourceId) ?? [];
    const approvers = setup?.eligibleApprovers.find(item => item.employeeId === employeeId)?.approvers ?? [];
    const send = async (event) => {
        event.preventDefault();
        if (!skillId || !level || !approverId || !reason.trim())
            return;
        setPending(true);
        setError("");
        setNotice("");
        try {
            await request("/api/v1/skills/requests", csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), employeeId, skillId, requestedLevel: level, expectedRatingVersion: profile?.ratings.find(item => item.skillId === skillId)?.version ?? 0, approverAccountId: approverId, trainingSourceId, reason: reason.trim() }) });
            setNotice("Skill recommendation request submitted. The official rating stays unchanged until approval.");
            setReason("");
            await load();
        }
        catch (cause) {
            const err = cause;
            const message = err.status === 409 ? "Skill history changed. Refresh and review the latest rating before retrying." : err.status === 403 ? "Skill request access changed; recheck current permissions." : cause instanceof Error ? cause.message : "Skill recommendation could not be submitted.";
            setError(message);
            if (err.status === 403 || err.status === 409) {
                setProfile(null);
                try {
                    await load();
                }
                catch {
                    setSetup(null);
                }
            }
        }
        finally {
            setPending(false);
        }
    };
    return _jsxs("section", { className: "training-recommendation", "aria-label": "Skill recommendation", children: [_jsx("h4", { children: "Skill recommendation status" }), error && _jsx("div", { className: "training-alert", role: "alert", children: error }), notice && _jsx("div", { className: "training-notice", role: "status", children: notice }), profile === null && !error && _jsx("p", { className: "training-empty", role: "status", children: "Loading linked skill recommendation status\u2026" }), profile === null && error && _jsx("p", { className: "training-empty", role: "status", children: "Skill recommendation status is unavailable with your current access." }), profile && relevant.length > 0 && _jsx("div", { className: "training-recommendation-list", children: relevant.map(item => _jsxs("article", { children: [_jsxs("strong", { children: [item.approvalState ?? "Approval unavailable", " \u00B7 ", item.requestedLevel] }), _jsxs("p", { children: ["Approver: ", item.approverLabel] }), item.decisionEvidence && _jsxs("p", { children: [item.decisionEvidence.outcome, ": ", item.decisionEvidence.reason, " \u00B7 ", new Date(item.decisionEvidence.decidedAt).toLocaleString()] }), _jsx("p", { children: "Training completion and skill approval are separate records. The official level changes only after approval." })] }, item.id)) }), profile?.capabilities.canRequest && _jsxs("form", { className: "training-form", onSubmit: send, children: [_jsx("p", { className: "training-wide", children: "A completed module can support a separate official skill request." }), _jsxs("label", { children: ["Skill", _jsxs("select", { value: skillId, onChange: event => setSkillId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose a catalogue skill" }), setup?.skills.map(item => _jsx("option", { value: item.id, children: item.name }, item.id))] })] }), _jsxs("label", { children: ["Requested official level", _jsxs("select", { value: level, onChange: event => setLevel(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose a level" }), ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map(item => _jsx("option", { value: item, children: item[0] + item.slice(1).toLowerCase() }, item))] })] }), _jsxs("label", { children: ["Named approver", _jsxs("select", { value: approverId, onChange: event => setApproverId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose eligible approver" }), approvers.map(item => _jsx("option", { value: item.accountId, children: item.label }, item.accountId))] })] }), _jsxs("label", { className: "training-wide", children: ["Reason", _jsx("textarea", { value: reason, onChange: event => setReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2, required: true })] }), _jsx("button", { type: "submit", disabled: pending || !skillId || !level || !approverId || reason.trim().length < 3, children: "Request skill rating" }), !approvers.length && _jsx("p", { className: "training-empty", role: "status", children: "No independent eligible approver is available for this employee." })] }), profile && relevant.length === 0 && !profile.capabilities.canRequest && _jsx("p", { className: "training-empty", role: "status", children: "No linked skill recommendation request. Training completion alone does not change an official skill rating." })] });
}
function ModuleBlock({ block, references, nested = false }) {
    const type = asText(block.type);
    if (type === "TEXT")
        return _jsx("p", { className: "training-block-text", children: asText(block.text) });
    if (type === "CHECKLIST" && Array.isArray(block.items))
        return _jsx("ul", { children: block.items.map((item, index) => _jsx("li", { children: asText(item) }, index)) });
    if (type === "LINK" && typeof block.url === "string")
        return _jsx("p", { children: _jsx("a", { href: block.url, target: "_blank", rel: "noreferrer", children: asText(block.label) || "Open learning reference" }) });
    if (["IMAGE", "PDF", "VIDEO", "FILE", "TEMPLATE"].includes(type) && typeof block.fileId === "string")
        return _jsx("p", { children: _jsxs("a", { href: `/api/v1/library/files/${encodeURIComponent(block.fileId)}/stream`, children: ["Open attached ", type.toLowerCase(), " reference"] }) });
    if (type === "SOP") {
        if (nested)
            return _jsx("p", { children: "This SOP links to another controlled procedure." });
        const reference = references.find(item => item.versionId === block.versionId);
        if (!reference)
            return _jsx("p", { className: "training-empty", children: "This linked SOP is not currently accessible." });
        return _jsxs("details", { className: "training-sop-reference", children: [_jsxs("summary", { children: ["Read ", reference.title, " \u00B7 Version ", reference.version] }), (reference.content.blocks ?? []).map((item, index) => _jsx(ModuleBlock, { block: item, references: references, nested: true }, `${String(item.type)}-${index}`))] });
    }
    return _jsx("p", { className: "training-empty", children: "This module contains an unsupported content block." });
}
