import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowSearchParams } from "./use-window-search-params.js";
import "./learning.css";
import { TrainingWorkspace } from "./learning-training.js";
const API = "/api/v1/skills";
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const LEVEL_LABELS = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert" };
const commandId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
async function api(url, csrf, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("X-CSRF-Token", csrf);
    if (init.body)
        headers.set("Content-Type", "application/json");
    const response = await fetch(url, { ...init, headers, credentials: "include" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new ApiError(body.error?.message ?? body.message ?? `Request failed (${response.status})`, response.status);
    return body;
}
const labelLevel = (value) => value ? LEVEL_LABELS[value] ?? value : "No previous rating";
export function SkillsWorkspace({ csrfToken }) {
    const [searchParams, setSearchParams] = useWindowSearchParams();
    const queryEmployeeId = searchParams.get("employeeId") ?? "";
    const queryRatingId = searchParams.get("ratingId") ?? "";
    const queryChangeId = searchParams.get("changeId") ?? "";
    const [setup, setSetup] = useState(null);
    const [profile, setProfile] = useState(null);
    const [employeeId, setEmployeeId] = useState(queryEmployeeId);
    const [loading, setLoading] = useState(true);
    const [profileLoading, setProfileLoading] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [skillChoice, setSkillChoice] = useState("");
    const [proposedSkillName, setProposedSkillName] = useState("");
    const [requestedLevel, setRequestedLevel] = useState("BEGINNER");
    const [approverAccountId, setApproverAccountId] = useState("");
    const [requestReason, setRequestReason] = useState("");
    const [directSkillId, setDirectSkillId] = useState("");
    const [directLevel, setDirectLevel] = useState("BEGINNER");
    const [directReason, setDirectReason] = useState("");
    const [catalogueName, setCatalogueName] = useState("");
    const [catalogueReason, setCatalogueReason] = useState("");
    const [decisionReasons, setDecisionReasons] = useState({});
    const requestSequence = useRef(0);
    useEffect(() => {
        if (!profile)
            return;
        const id = profile.ratings.some(row => row.id === queryRatingId) ? `skill-rating-${queryRatingId}` : profile.changes.some(row => row.id === queryChangeId) ? `skill-change-${queryChangeId}` : "";
        if (id)
            document.getElementById(id)?.focus({ preventScroll: false });
    }, [profile, queryChangeId, queryRatingId]);
    const updateEmployeeQuery = useCallback((id, replace = false) => {
        setSearchParams(current => { const next = new URLSearchParams(current); if (id)
            next.set("employeeId", id);
        else
            next.delete("employeeId"); return next; }, { replace });
    }, [setSearchParams]);
    useEffect(() => { setEmployeeId(queryEmployeeId); }, [queryEmployeeId]);
    const loadSetup = useCallback(async () => {
        const result = await api(`${API}/setup`, csrfToken);
        setSetup(result);
        const requestedEmployeeId = new URLSearchParams(window.location.search).get("employeeId");
        setEmployeeId(current => requestedEmployeeId ? (result.employees.some(e => e.id === requestedEmployeeId) ? requestedEmployeeId : "") : current && result.employees.some(e => e.id === current) ? current : result.employees[0]?.id ?? "");
    }, [csrfToken]);
    const loadProfile = useCallback(async (id, initial = false) => {
        const sequence = ++requestSequence.current;
        if (!id) {
            setProfile(null);
            setProfileLoading(false);
            return;
        }
        if (initial)
            setProfileLoading(true);
        try {
            const result = await api(`${API}/employees/${encodeURIComponent(id)}`, csrfToken);
            if (sequence === requestSequence.current) {
                setProfile(result);
                setError("");
            }
        }
        catch (cause) {
            if (sequence === requestSequence.current) {
                setProfile(null);
                setError(cause instanceof Error ? cause.message : "Couldn’t load employee skills.");
            }
        }
        finally {
            if (sequence === requestSequence.current && initial)
                setProfileLoading(false);
        }
    }, [csrfToken]);
    const refresh = useCallback(async () => { await loadSetup(); await loadProfile(employeeId); }, [employeeId, loadProfile, loadSetup]);
    useEffect(() => {
        let current = true;
        setLoading(true);
        setError("");
        void loadSetup().catch(cause => { if (current)
            setError(cause instanceof Error ? cause.message : "Couldn’t load Skills."); }).finally(() => { if (current)
            setLoading(false); });
        return () => { current = false; requestSequence.current++; };
    }, [loadSetup]);
    useEffect(() => {
        setProfile(null);
        setError("");
        setSkillChoice("");
        setProposedSkillName("");
        setApproverAccountId("");
        setRequestReason("");
        setDirectSkillId("");
        setDecisionReasons({});
        void loadProfile(employeeId, true);
    }, [employeeId, loadProfile]);
    const employee = setup?.employees.find(item => item.id === employeeId);
    const approvers = setup?.eligibleApprovers.find(item => item.employeeId === employeeId)?.approvers ?? [];
    const ratingForSkill = useMemo(() => new Map(profile?.ratings.map(r => [r.skillId, r]) ?? []), [profile]);
    const currentSkillName = (skillId) => setup?.skills.find(skill => skill.id === skillId)?.name ?? "Proposed skill";
    const mutate = async (path, body, success) => {
        setPending(true);
        setError("");
        setNotice("");
        try {
            await api(path, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), ...body }) });
            setNotice(success);
            await refresh();
        }
        catch (cause) {
            setError(cause instanceof ApiError && cause.status === 409 ? "This skill record changed or the request conflicts with current history. Refresh and review the latest version, then try again." : cause instanceof Error ? cause.message : "The skill action could not be saved.");
        }
        finally {
            setPending(false);
        }
    };
    const submitRequest = (event) => {
        event.preventDefault();
        if (!profile || !employeeId || !approverAccountId)
            return;
        const skillId = skillChoice && skillChoice !== "__new__" ? skillChoice : undefined;
        const expectedRatingVersion = skillId ? ratingForSkill.get(skillId)?.version ?? 0 : 0;
        void mutate(`${API}/requests`, {
            employeeId, ...(skillId ? { skillId } : { proposedSkillName: proposedSkillName.trim() }), requestedLevel,
            expectedRatingVersion, approverAccountId, reason: requestReason.trim()
        }, "Request saved. The official rating changes only after approval.");
    };
    const submitDirectRate = (event) => {
        event.preventDefault();
        if (!employeeId || !directSkillId)
            return;
        void mutate(`${API}/ratings`, { employeeId, skillId: directSkillId, level: directLevel, expectedRatingVersion: ratingForSkill.get(directSkillId)?.version ?? 0, reason: directReason.trim() }, "Official rating saved.");
    };
    const submitCatalogue = (event) => {
        event.preventDefault();
        void mutate(`${API}/catalogue`, { name: catalogueName.trim(), reason: catalogueReason.trim() }, "Skill added to the catalogue.");
    };
    const decide = (row, outcome) => {
        const reason = decisionReasons[row.id]?.trim() ?? "";
        if (reason.length < 3) {
            setError("Enter a decision reason of at least 3 characters.");
            return;
        }
        void mutate(`${API}/requests/${encodeURIComponent(row.id)}/decision`, { outcome, reason }, outcome === "APPROVED" ? "Skill request approved." : "Skill request rejected.");
    };
    if (loading)
        return _jsx("section", { className: "learning-workspace", "aria-busy": "true", children: _jsx("p", { role: "status", children: "Loading Skills\u2026" }) });
    if (error && !setup)
        return _jsxs("section", { className: "learning-workspace", children: [_jsx("h2", { children: "Skills" }), _jsx("div", { className: "learning-alert", role: "alert", children: error }), _jsx("button", { type: "button", onClick: () => { setLoading(true); void loadSetup().catch(cause => setError(cause instanceof Error ? cause.message : "Couldn’t load Skills.")).finally(() => setLoading(false)); }, children: "Retry" })] });
    if (!setup || setup.employees.length === 0)
        return _jsxs("section", { className: "learning-workspace", children: [_jsx("header", { className: "learning-heading", children: _jsxs("div", { children: [_jsx("h2", { children: "Skills" }), _jsx("p", { children: "Official skills are recorded through a reasoned request and approval." })] }) }), _jsx("p", { className: "learning-empty", role: "status", children: "No active employee profiles are available to you." })] });
    return _jsxs("section", { className: "learning-workspace", "aria-busy": pending || profileLoading, children: [_jsxs("header", { className: "learning-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Skills" }), _jsx("p", { children: "Official levels: Beginner, Intermediate, Advanced and Expert. Requests do not change an official rating until approved." })] }), _jsx("button", { className: "learning-secondary", type: "button", disabled: pending, onClick: () => void refresh(), children: "Refresh" })] }), _jsxs("div", { className: "learning-toolbar", children: [_jsx("label", { htmlFor: "learning-employee", children: "Employee profile" }), _jsxs("select", { id: "learning-employee", value: employeeId, onChange: event => { setEmployeeId(event.target.value); updateEmployeeQuery(event.target.value); }, children: [_jsx("option", { value: "", children: "Choose employee" }), setup.employees.map(item => _jsx("option", { value: item.id, children: item.label }, item.id))] })] }), error && _jsx("div", { className: "learning-alert", role: "alert", children: error }), notice && _jsx("div", { className: "learning-notice", role: "status", children: notice }), profileLoading && _jsx("p", { role: "status", children: "Loading profile\u2026" }), employee && profile && _jsxs(_Fragment, { children: [_jsxs("section", { className: "learning-panel", children: [_jsx("div", { className: "learning-section-heading", children: _jsxs("div", { children: [_jsx("h3", { children: "Official ratings" }), _jsxs("p", { children: ["Current approved level and version for ", employee.label, "."] })] }) }), profile.ratings.length === 0 ? _jsx("p", { className: "learning-empty", role: "status", children: "No official skill ratings yet." }) : _jsx("div", { className: "learning-list", children: profile.ratings.map(rating => _jsx("article", { id: `skill-rating-${rating.id}`, tabIndex: queryRatingId === rating.id ? -1 : undefined, className: `learning-card ${queryRatingId === rating.id ? "is-focused" : ""}`, children: _jsxs("div", { children: [_jsx("strong", { children: currentSkillName(rating.skillId) }), _jsxs("p", { children: [labelLevel(rating.level), " \u00B7 Version ", rating.version] })] }) }, rating.id)) })] }), profile.capabilities.canRequest && _jsxs("section", { className: "learning-panel", children: [_jsx("h3", { children: "Request a skill rating" }), _jsx("p", { children: "Choose a catalogue skill or propose a new name. A named eligible approver must decide before the official rating changes." }), _jsxs("form", { className: "learning-form", onSubmit: submitRequest, children: [_jsxs("label", { children: ["Skill", _jsxs("select", { value: skillChoice, onChange: event => setSkillChoice(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose a catalogue skill" }), setup.skills.map(skill => _jsx("option", { value: skill.id, children: skill.name }, skill.id)), _jsx("option", { value: "__new__", children: "Propose a new skill" })] })] }), skillChoice === "__new__" && _jsxs("label", { children: ["Proposed skill name", _jsx("input", { value: proposedSkillName, onChange: event => setProposedSkillName(event.target.value), minLength: 1, maxLength: 120, required: true })] }), _jsxs("label", { children: ["Requested level", _jsx("select", { value: requestedLevel, onChange: event => setRequestedLevel(event.target.value), children: LEVELS.map(value => _jsx("option", { value: value, children: labelLevel(value) }, value)) })] }), _jsxs("label", { children: ["Approver", _jsxs("select", { value: approverAccountId, onChange: event => setApproverAccountId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an eligible approver" }), approvers.map(person => _jsx("option", { value: person.accountId, children: person.label }, person.accountId))] })] }), !approvers.length && _jsx("p", { className: "learning-empty", role: "status", children: "No eligible approver is available for this employee." }), _jsxs("label", { className: "learning-wide", children: ["Reason", _jsx("textarea", { value: requestReason, onChange: event => setRequestReason(event.target.value), minLength: 3, maxLength: 1000, rows: 3, required: true })] }), _jsx("button", { type: "submit", disabled: pending || !approvers.length || !skillChoice || skillChoice === "__new__" && !proposedSkillName.trim() || requestReason.trim().length < 3, children: "Submit request" })] })] }), profile.capabilities.canDirectRate && _jsxs("section", { className: "learning-panel", children: [_jsx("h3", { children: "Owner direct rating" }), _jsx("p", { children: "Direct changes are reasoned and retained in immutable rating history." }), _jsxs("form", { className: "learning-form", onSubmit: submitDirectRate, children: [_jsxs("label", { children: ["Skill", _jsxs("select", { value: directSkillId, onChange: event => setDirectSkillId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose skill" }), setup.skills.map(skill => _jsx("option", { value: skill.id, children: skill.name }, skill.id))] })] }), _jsxs("label", { children: ["Official level", _jsx("select", { value: directLevel, onChange: event => setDirectLevel(event.target.value), children: LEVELS.map(value => _jsx("option", { value: value, children: labelLevel(value) }, value)) })] }), _jsxs("label", { className: "learning-wide", children: ["Reason", _jsx("textarea", { value: directReason, onChange: event => setDirectReason(event.target.value), minLength: 3, maxLength: 1000, rows: 3, required: true })] }), _jsx("button", { type: "submit", disabled: pending || !directSkillId || directReason.trim().length < 3, children: "Save official rating" })] })] }), profile.capabilities.canDirectRate && _jsxs("section", { className: "learning-panel", children: [_jsx("h3", { children: "Owner catalogue" }), _jsxs("form", { className: "learning-form", onSubmit: submitCatalogue, children: [_jsxs("label", { children: ["New skill name", _jsx("input", { value: catalogueName, onChange: event => setCatalogueName(event.target.value), maxLength: 120, required: true })] }), _jsxs("label", { className: "learning-wide", children: ["Reason", _jsx("textarea", { value: catalogueReason, onChange: event => setCatalogueReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2, required: true })] }), _jsx("button", { type: "submit", disabled: pending || !catalogueName.trim() || catalogueReason.trim().length < 3, children: "Add skill" })] })] }), _jsxs("section", { className: "learning-panel", children: [_jsx("h3", { children: "Requests and decisions" }), profile.requests.length === 0 ? _jsx("p", { className: "learning-empty", role: "status", children: "No skill requests for this employee." }) : _jsx("div", { className: "learning-list", children: profile.requests.map(row => _jsxs("article", { className: "learning-card", children: [_jsxs("div", { className: "learning-card-main", children: [_jsx("strong", { children: row.proposedSkillName ?? currentSkillName(row.skillId) }), _jsxs("p", { children: [labelLevel(row.requestedLevel), " \u00B7 ", row.approvalState ?? "Approval unavailable", " \u00B7 Approver: ", row.approverLabel] }), _jsxs("p", { children: ["Expected rating version: ", row.expectedRatingVersion, " \u00B7 ", row.reason] }), row.proposedSkillName && _jsx("p", { children: "Proposed skill" }), row.decisionEvidence && _jsxs("div", { className: "learning-decision", children: [_jsx("strong", { children: row.decisionEvidence.outcome === "APPROVED" ? "Approved" : "Rejected" }), _jsx("p", { children: row.decisionEvidence.reason }), _jsx("small", { children: new Date(row.decisionEvidence.decidedAt).toLocaleString() })] })] }), row.canDecide && _jsxs("div", { className: "learning-decision-actions", children: [_jsxs("label", { children: ["Decision reason", _jsx("textarea", { "aria-label": `Decision reason for ${row.proposedSkillName ?? currentSkillName(row.skillId)}`, value: decisionReasons[row.id] ?? "", onChange: event => setDecisionReasons(current => ({ ...current, [row.id]: event.target.value })), minLength: 3, maxLength: 1000, rows: 2 })] }), _jsxs("div", { children: [_jsx("button", { type: "button", disabled: pending || (decisionReasons[row.id]?.trim().length ?? 0) < 3, onClick: () => decide(row, "APPROVED"), children: "Approve" }), _jsx("button", { className: "learning-secondary", type: "button", disabled: pending || (decisionReasons[row.id]?.trim().length ?? 0) < 3, onClick: () => decide(row, "REJECTED"), children: "Reject" })] })] })] }, row.id)) })] }), _jsxs("section", { className: "learning-panel", children: [_jsx("h3", { children: "Immutable rating history" }), profile.changes.length === 0 ? _jsx("p", { className: "learning-empty", role: "status", children: "No approved rating changes have been recorded." }) : _jsx("div", { className: "learning-list", children: profile.changes.map(change => { const rating = profile.ratings.find(item => item.id === change.ratingId); return _jsx("article", { id: `skill-change-${change.id}`, tabIndex: queryChangeId === change.id ? -1 : undefined, className: `learning-card learning-history ${queryChangeId === change.id ? "is-focused" : ""}`, children: _jsxs("div", { children: [_jsxs("strong", { children: [rating ? currentSkillName(rating.skillId) : "Skill", " \u00B7 Version ", change.version] }), _jsxs("p", { children: [labelLevel(change.fromLevel), " \u2192 ", labelLevel(change.toLevel), " \u00B7 ", new Date(change.occurredAt).toLocaleString()] }), _jsx("p", { children: change.reason })] }) }, change.id); }) })] })] })] });
}
export function SkillsTrainingWorkspace({ csrfToken }) {
    return _jsxs(_Fragment, { children: [_jsx(SkillsWorkspace, { csrfToken: csrfToken }), _jsx(TrainingWorkspace, { csrfToken: csrfToken, preserveEmployeeQuery: true })] });
}
