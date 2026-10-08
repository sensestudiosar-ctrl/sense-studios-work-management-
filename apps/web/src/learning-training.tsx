import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./learning-training.css";

type Employee = { id: string; label: string };
type Reviewer = { accountId: string; label: string };
type ModuleChoice = { id: string; versionId: string; version: number; title: string; category: string; assessment: { criteria: string; practicalRequired: boolean; questionCount: number } };
type PracticalTask = { employeeId: string; id: string; title: string; targetDate: string; status: string };
type Assignment = { id: string; employeeId: string; moduleVersionId: string; reviewerAccountId: string | null; state: string; version: number; data?: Record<string, unknown>; createdAt?: string };
type Setup = { employees: Employee[]; modulesByEmployee: Array<{ employeeId: string; modules: ModuleChoice[] }>; reviewers: Array<{ employeeId: string; reviewers: Reviewer[] }>; practicalTasks: PracticalTask[]; assignments: Assignment[]; capabilities: { currentAccountId: string; manageableEmployeeIds: string[]; canManage: boolean; canSubmit: boolean } };
type Question = { id: string; prompt: string; options: Array<{ id: string; label: string }> };
type ModuleContent = { blocks: Array<Record<string, unknown>>; assessment?: { criteria: string; quiz?: Question[]; minimumCorrect?: number; practicalRequired: boolean } };
type SopReference = { versionId: string; version: number; title: string; content: { blocks?: Array<Record<string, unknown>> } };
type Attempt = { id: string; kind: string; sequence: number; payload: Record<string, unknown>; reason: string; occurredAt: string };
type History = { id: string; version: number; state: string; reason: string; occurredAt: string; data: Record<string, unknown> };
type Detail = { assignment: Assignment; module: { id: string; version: number; title: string; content: ModuleContent; references?: SopReference[] }; attempts: Attempt[]; history: History[]; capabilities: { isTrainee: boolean; canSubmit: boolean; canAssess: boolean; canRecordEffectiveness: boolean } };
type SkillLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
type SkillSetup = { skills: Array<{ id: string; name: string }>; eligibleApprovers: Array<{ employeeId: string; approvers: Array<{ accountId: string; label: string }> }> };
type SkillProfile = { ratings: Array<{ skillId: string; version: number }>; requests: Array<{ id: string; skillId: string | null; proposedSkillName: string | null; requestedLevel: SkillLevel; trainingSourceId: string | null; approvalState: string | null; approverLabel: string; decisionEvidence: { outcome: string; reason: string; decidedAt: string } | null }>; capabilities: { canRequest: boolean } };
type ApiError = Error & { status?: number };
const apiBase = "/api/v1/training";
const commandId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function request<T>(url: string, csrf: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); headers.set("X-CSRF-Token", csrf);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers, credentials: "include" });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
  if (!response.ok) { const error = new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`) as ApiError; error.status = response.status; throw error; }
  return body as T;
}

const stateLabel: Record<string, string> = { ASSIGNED: "Assigned", SUBMITTED: "Submitted for review", CHANGES_REQUIRED: "Changes required", COMPLETED: "Completed" };
const asText = (value: unknown) => typeof value === "string" ? value : "";

export function TrainingWorkspace({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  const [setup, setSetup] = useState<Setup | null>(null), [selectedEmployeeId, setSelectedEmployeeId] = useState(""), [selectedAssignmentId, setSelectedAssignmentId] = useState(() => new URLSearchParams(window.location.search).get("assignmentId") ?? "");
  const [detail, setDetail] = useState<Detail | null>(null), [loading, setLoading] = useState(true), [detailLoading, setDetailLoading] = useState(false), [pending, setPending] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [moduleVersionId, setModuleVersionId] = useState(""), [reviewerAccountId, setReviewerAccountId] = useState(""), [assignReason, setAssignReason] = useState(""), [recommendationReason, setRecommendationReason] = useState(""), [assignPracticalTaskId, setAssignPracticalTaskId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string[]>>({}), [submissionNote, setSubmissionNote] = useState(""), [submissionReason, setSubmissionReason] = useState(""), [submissionTaskId, setSubmissionTaskId] = useState("");
  const [assessmentObservation, setAssessmentObservation] = useState(""), [assessmentReason, setAssessmentReason] = useState(""), [effectivenessDate, setEffectivenessDate] = useState(""), [effectivenessObservation, setEffectivenessObservation] = useState(""), [effectivenessReason, setEffectivenessReason] = useState(""), [effectivenessTaskId, setEffectivenessTaskId] = useState("");
  const detailSequence = useRef(0);

  const loadSetup = useCallback(async (preferredAssignment?: string) => {
    const result = await request<Setup>(`${apiBase}/setup`, csrfToken); setSetup(result);
    setSelectedEmployeeId(current => result.employees.some(item => item.id === current) ? current : result.employees[0]?.id ?? "");
    const requestedAssignmentId = new URLSearchParams(window.location.search).get("assignmentId");
    setSelectedAssignmentId(current => requestedAssignmentId ? (result.assignments.some(item => item.id === requestedAssignmentId) ? requestedAssignmentId : "") : result.assignments.some(item => item.id === current) ? current : preferredAssignment && result.assignments.some(item => item.id === preferredAssignment) ? preferredAssignment : result.assignments[0]?.id ?? "");
    return result;
  }, [csrfToken]);
  const loadDetail = useCallback(async (id: string) => {
    const seq = ++detailSequence.current;
    if (!id) { setDetail(null); setDetailLoading(false); return; }
    setDetailLoading(true);
    try { const result = await request<Detail>(`${apiBase}/assignments/${encodeURIComponent(id)}`, csrfToken); if (seq === detailSequence.current) { setDetail(result); setError(""); } }
    catch (cause) { if (seq === detailSequence.current) { setDetail(null); setError(cause instanceof Error ? cause.message : "Could not load this assignment."); } }
    finally { if (seq === detailSequence.current) setDetailLoading(false); }
  }, [csrfToken]);
  const refresh = useCallback(async (preferred?: string) => {
    const result = await loadSetup(preferred);
    const targetId = preferred && result.assignments.some(item => item.id === preferred) ? preferred : result.assignments.some(item => item.id === selectedAssignmentId) ? selectedAssignmentId : result.assignments[0]?.id ?? "";
    setSelectedAssignmentId(targetId); await loadDetail(targetId);
  }, [loadDetail, loadSetup, selectedAssignmentId]);
  useEffect(() => {
    let current = true; setLoading(true); setError("");
    void loadSetup().catch(cause => { if (current) setError(cause instanceof Error ? cause.message : "Could not load Training."); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; detailSequence.current++; };
  }, [loadSetup]);
  useEffect(() => {
    setDetail(null); setAnswers({}); setSubmissionNote(""); setSubmissionReason(""); setAssessmentObservation(""); setAssessmentReason(""); setEffectivenessDate(""); setEffectivenessObservation(""); setEffectivenessReason("");
    void loadDetail(selectedAssignmentId);
  }, [selectedAssignmentId, loadDetail]);

  const selectedModules = setup?.modulesByEmployee.find(item => item.employeeId === selectedEmployeeId)?.modules ?? [];
  const selectedReviewers = setup?.reviewers.find(item => item.employeeId === selectedEmployeeId)?.reviewers ?? [];
  const targetTasks = setup?.practicalTasks.filter(task => task.employeeId === selectedEmployeeId) ?? [];
  const selectedModule = selectedModules.find(item => item.versionId === moduleVersionId);
  const manageable = !!setup && setup.capabilities.manageableEmployeeIds.includes(selectedEmployeeId);
  const employeeLabel = (id: string) => setup?.employees.find(employee => employee.id === id)?.label ?? "Employee";
  const moduleLabel = (id: string) => setup?.modulesByEmployee.flatMap(item => item.modules).find(module => module.versionId === id)?.title ?? "Training module";
  const activeTasks = targetTasks.filter(task => task.status !== "COMPLETED");
  const questionList = useMemo(() => detail?.module.content.assessment?.quiz ?? [], [detail]);

  const act = async (path: string, payload: Record<string, unknown>, success: string, assignmentId = selectedAssignmentId) => {
    setPending(true); setError(""); setNotice("");
    try {
      const result = await request<{ id?: string }>(`${apiBase}${path}`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), ...payload }) });
      setNotice(success); await refresh(result.id ?? assignmentId);
    } catch (cause) {
      const err = cause as ApiError;
      if (err.status === 409 || err.status === 403) {
        const message = err.status === 409 ? "Training changed since it was loaded. Current state was refreshed; review it before trying again." : "Your current training access changed. The available training state was refreshed.";
        setDetail(null); setError(message);
        try { await refresh(assignmentId); } catch { setSetup(null); setSelectedAssignmentId(""); }
      }
      else setError(cause instanceof Error ? cause.message : "The training action could not be saved.");
    } finally { setPending(false); }
  };
  const assign = (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedEmployeeId || !moduleVersionId || !reviewerAccountId) return;
    void act("/assignments", { employeeId: selectedEmployeeId, moduleVersionId, reviewerAccountId, reason: assignReason.trim(), ...(recommendationReason.trim() ? { recommendationReason: recommendationReason.trim() } : {}), ...(assignPracticalTaskId ? { practicalTaskId: assignPracticalTaskId } : {}) }, "Training assigned.", "");
    setSelectedAssignmentId("");
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); if (!detail) return;
    const answersBody = questionList.map(question => ({ questionId: question.id, optionIds: answers[question.id] ?? [] }));
    void act(`/assignments/${encodeURIComponent(detail.assignment.id)}/submissions`, { expectedVersion: detail.assignment.version, ...(questionList.length ? { answers: answersBody } : {}), ...(submissionTaskId ? { practicalTaskId: submissionTaskId } : {}), note: submissionNote.trim(), reason: submissionReason.trim() }, "Submission saved for the named reviewer.");
  };
  const assess = (outcome: "PASSED" | "CHANGES_REQUIRED") => {
    if (!detail) return;
    void act(`/assignments/${encodeURIComponent(detail.assignment.id)}/assessments`, { expectedVersion: detail.assignment.version, outcome, observation: assessmentObservation.trim(), reason: assessmentReason.trim() }, outcome === "PASSED" ? "Training marked complete by the reviewer." : "Changes requested. The trainee may submit again.");
  };
  const recordEffectiveness = (event: React.FormEvent) => {
    event.preventDefault(); if (!detail) return;
    void act(`/assignments/${encodeURIComponent(detail.assignment.id)}/effectiveness`, { date: effectivenessDate, observation: effectivenessObservation.trim(), ...(effectivenessTaskId ? { practicalTaskId: effectivenessTaskId } : {}), reason: effectivenessReason.trim() }, "Effectiveness observation recorded.");
  };
  const toggleOption = (questionId: string, optionId: string, checked: boolean) => setAnswers(current => {
    const options = new Set(current[questionId] ?? []); if (checked) options.add(optionId); else options.delete(optionId);
    return { ...current, [questionId]: [...options] };
  });

  if (loading) return <section className="training-workspace" aria-busy="true"><p role="status">Loading Training…</p></section>;
  if (!setup) return <section className="training-workspace"><h2>Training</h2><div className="training-alert" role="alert">{error || "Training is unavailable."}</div><button type="button" onClick={() => { setLoading(true); void loadSetup().catch(cause => setError(cause instanceof Error ? cause.message : "Could not load Training.")).finally(() => setLoading(false)); }}>Retry</button></section>;
  return <section className="training-workspace" aria-busy={pending || detailLoading}>
    <header className="training-heading"><div><h2>Training</h2><p>Complete the exact assigned module. A named reviewer records the decision; completion does not change an official skill rating.</p></div><button type="button" className="training-secondary" disabled={pending} onClick={() => void refresh()}>Refresh</button></header>
    {error && <div className="training-alert" role="alert">{error}</div>}{notice && <div className="training-notice" role="status">{notice}</div>}
    {setup.assignments.length === 0 && !setup.capabilities.canManage && <p className="training-empty" role="status">No training assignments are available to you.</p>}
    {setup.assignments.length > 0 && <div className="training-picker"><label htmlFor="training-assignment">Assignment</label><select id="training-assignment" value={selectedAssignmentId} onChange={event => setSelectedAssignmentId(event.target.value)}><option value="">Choose assignment</option>{setup.assignments.map(item => <option value={item.id} key={item.id}>{employeeLabel(item.employeeId)} · {moduleLabel(item.moduleVersionId)} · {stateLabel[item.state] ?? item.state}</option>)}</select></div>}

    {setup.capabilities.canManage && <section className="training-panel"><h3>Assign training</h3><p>Select an employee, a module version they can currently access, and a named eligible reviewer.</p>
      <form className="training-form" onSubmit={assign}>
        <label>Employee<select value={selectedEmployeeId} onChange={event => { setSelectedEmployeeId(event.target.value); setModuleVersionId(""); setReviewerAccountId(""); setAssignPracticalTaskId(""); }} required><option value="">Choose employee</option>{setup.employees.filter(item => setup.capabilities.manageableEmployeeIds.includes(item.id)).map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
        <label>Module<select value={moduleVersionId} onChange={event => setModuleVersionId(event.target.value)} required><option value="">Choose an accessible module</option>{selectedModules.map(item => <option value={item.versionId} key={item.versionId}>{item.title} · Version {item.version}</option>)}</select></label>
        {selectedModule && <p className="training-wide"><strong>Assessment criteria:</strong> {selectedModule.assessment.criteria}{selectedModule.assessment.questionCount > 0 && ` · Quiz questions: ${selectedModule.assessment.questionCount}`}{selectedModule.assessment.practicalRequired && " · Practical evidence required"}</p>}
        <label>Named reviewer<select value={reviewerAccountId} onChange={event => setReviewerAccountId(event.target.value)} required><option value="">Choose eligible reviewer</option>{selectedReviewers.map(item => <option value={item.accountId} key={item.accountId}>{item.label}</option>)}</select></label>
        <label>Practical task (optional)<select value={assignPracticalTaskId} onChange={event => setAssignPracticalTaskId(event.target.value)}><option value="">No task selected</option>{activeTasks.map(task => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label>
        <label className="training-wide">Assignment reason<textarea value={assignReason} onChange={event => setAssignReason(event.target.value)} minLength={3} maxLength={1000} rows={2} required /></label>
        <label className="training-wide">Recommendation reason (optional)<textarea value={recommendationReason} onChange={event => setRecommendationReason(event.target.value)} minLength={3} maxLength={1000} rows={2} /></label>
        <button type="submit" disabled={pending || !manageable || !moduleVersionId || !reviewerAccountId || assignReason.trim().length < 3}>Assign</button>
        {!selectedModules.length && <p className="training-empty" role="status">No currently accessible published modules are available for this employee.</p>}
        {!selectedReviewers.length && <p className="training-empty" role="status">No eligible independent reviewer is available.</p>}
      </form>
    </section>}

    {detailLoading && <p role="status">Loading assignment…</p>}
    {detail && <section className="training-panel" aria-label="Training assignment detail">
      <div className="training-assignment-heading"><div><h3>{detail.module.title} · Version {detail.module.version}</h3><p>{employeeLabel(detail.assignment.employeeId)} · {stateLabel[detail.assignment.state] ?? detail.assignment.state} · Version {detail.assignment.version}</p></div></div>
      <div className="training-module-content"><h4>Module content</h4>{detail.module.content.blocks.map((block, index) => <ModuleBlock block={block} references={detail.module.references ?? []} key={`${String(block.type)}-${index}`} />)}
        {detail.module.content.assessment && <div className="training-criteria"><h4>Assessment criteria</h4><p>{detail.module.content.assessment.criteria}</p>{detail.module.content.assessment.minimumCorrect !== undefined && <p>Quiz threshold: {detail.module.content.assessment.minimumCorrect} correct out of {questionList.length}.</p>}{detail.module.content.assessment.practicalRequired && <p>Practical evidence is required.</p>}</div>}
      </div>
      {detail.capabilities.canSubmit && <form className="training-form training-action" onSubmit={submit}>
        <h4 className="training-wide">Your submission</h4>
        {questionList.map(question => <fieldset className="training-question training-wide" key={question.id}><legend>{question.prompt}</legend>{question.options.map(option => <label className="training-option" key={option.id}><input type="checkbox" checked={(answers[question.id] ?? []).includes(option.id)} onChange={event => toggleOption(question.id, option.id, event.target.checked)} />{option.label}</label>)}</fieldset>)}
        {(detail.module.content.assessment?.practicalRequired || typeof detail.assignment.data?.practicalTaskId === "string") && <label>Completed practical task<select value={submissionTaskId} onChange={event => setSubmissionTaskId(event.target.value)} required={detail.module.content.assessment?.practicalRequired}><option value="">{detail.module.content.assessment?.practicalRequired ? "Choose completed task" : "Use assigned task"}</option>{setup.practicalTasks.filter(task => task.employeeId === detail.assignment.employeeId && task.status === "COMPLETED").map(task => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label>}
        <label className="training-wide">Submission note<textarea value={submissionNote} onChange={event => setSubmissionNote(event.target.value)} minLength={3} maxLength={2000} rows={3} required /></label>
        <label className="training-wide">Reason<textarea value={submissionReason} onChange={event => setSubmissionReason(event.target.value)} minLength={3} maxLength={1000} rows={2} required /></label>
        <button type="submit" disabled={pending || submissionNote.trim().length < 3 || submissionReason.trim().length < 3 || detail.module.content.assessment?.practicalRequired && !submissionTaskId}>Submit for review</button>
      </form>}
      {detail.capabilities.canAssess && <div className="training-action">
        <h4>Reviewer assessment</h4><p>Review the authored criteria and submitted evidence. Passing is an explicit human decision.</p>
        <label>Observation<textarea value={assessmentObservation} onChange={event => setAssessmentObservation(event.target.value)} minLength={3} maxLength={2000} rows={3} /></label>
        <label>Decision reason<textarea value={assessmentReason} onChange={event => setAssessmentReason(event.target.value)} minLength={3} maxLength={1000} rows={2} /></label>
        <div className="training-actions"><button type="button" disabled={pending || assessmentObservation.trim().length < 3 || assessmentReason.trim().length < 3} onClick={() => assess("PASSED")}>Pass and complete</button><button className="training-secondary" type="button" disabled={pending || assessmentObservation.trim().length < 3 || assessmentReason.trim().length < 3} onClick={() => assess("CHANGES_REQUIRED")}>Request changes</button></div>
      </div>}
      {detail.capabilities.canRecordEffectiveness && <form className="training-form training-action" onSubmit={recordEffectiveness}><h4 className="training-wide">Effectiveness observation</h4><label>Date observed<input type="date" value={effectivenessDate} onChange={event => setEffectivenessDate(event.target.value)} required /></label><label>Related completed practical task (optional)<select value={effectivenessTaskId} onChange={event => setEffectivenessTaskId(event.target.value)}><option value="">None</option>{setup.practicalTasks.filter(task => task.employeeId === detail.assignment.employeeId && task.status === "COMPLETED").map(task => <option value={task.id} key={task.id}>{task.title}</option>)}</select></label><label className="training-wide">Observation<textarea value={effectivenessObservation} onChange={event => setEffectivenessObservation(event.target.value)} minLength={3} maxLength={2000} rows={3} required /></label><label className="training-wide">Reason<textarea value={effectivenessReason} onChange={event => setEffectivenessReason(event.target.value)} minLength={3} maxLength={1000} rows={2} required /></label><button type="submit" disabled={pending || !effectivenessDate || effectivenessObservation.trim().length < 3 || effectivenessReason.trim().length < 3}>Record observation</button></form>}
      <section className="training-history"><h4>Training evidence and history</h4>{detail.history.length === 0 && detail.attempts.length === 0 ? <p className="training-empty" role="status">No submissions or reviews yet.</p> : <ol>{detail.history.map(item => <li key={item.id}><strong>{stateLabel[item.state] ?? item.state} · Version {item.version}</strong><p>{item.reason}</p><time>{new Date(item.occurredAt).toLocaleString()}</time></li>)}{detail.attempts.map(item => <li key={item.id}><strong>{item.kind === "EFFECTIVENESS" ? "Effectiveness observation" : item.kind === "ASSESSMENT" ? "Reviewer assessment" : "Submission"} · Attempt {item.sequence}</strong>{item.kind === "ASSESSMENT" && <p>Outcome: {asText(item.payload.outcome)}</p>}{typeof item.payload.quizCorrect === "number" && typeof item.payload.quizCount === "number" && <p>Quiz result: {item.payload.quizCorrect} of {item.payload.quizCount} correct</p>}<p>{item.kind === "EFFECTIVENESS" ? `${asText(item.payload.date)} · ${asText(item.payload.observation)}` : asText(item.payload.observation) || asText(item.payload.note)}</p><p>{item.reason}</p><time>{new Date(item.occurredAt).toLocaleString()}</time></li>)}</ol>}</section>
      {typeof detail.assignment.data?.recommendationReason === "string" && <div className="training-recommendation"><h4>Manager recommendation</h4><p>{detail.assignment.data.recommendationReason}</p><p>This recommendation does not change an official skill rating.</p></div>}
      {detail.assignment.state === "COMPLETED" && <TrainingSkillRecommendation key={detail.assignment.id} csrfToken={csrfToken} employeeId={detail.assignment.employeeId} trainingSourceId={detail.assignment.id} />}
    </section>}
  </section>;
}

function TrainingSkillRecommendation({ csrfToken, employeeId, trainingSourceId }: { csrfToken: string; employeeId: string; trainingSourceId: string }): React.JSX.Element {
  const [setup, setSetup] = useState<SkillSetup | null>(null), [profile, setProfile] = useState<SkillProfile | null>(null), [skillId, setSkillId] = useState(""), [level, setLevel] = useState<SkillLevel | "">(""), [approverId, setApproverId] = useState(""), [reason, setReason] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState(""), [pending, setPending] = useState(false);
  const load = useCallback(async () => {
    const [nextSetup, nextProfile] = await Promise.all([request<SkillSetup>("/api/v1/skills/setup", csrfToken), request<SkillProfile>(`/api/v1/skills/employees/${encodeURIComponent(employeeId)}`, csrfToken)]);
    setSetup(nextSetup); setProfile(nextProfile);
  }, [csrfToken, employeeId]);
  useEffect(() => { let current = true; void load().catch(cause => { if (current) setError(cause instanceof Error ? cause.message : "Could not load skill recommendation status."); }); return () => { current = false; }; }, [load]);
  const relevant = profile?.requests.filter(item => item.trainingSourceId === trainingSourceId) ?? [];
  const approvers = setup?.eligibleApprovers.find(item => item.employeeId === employeeId)?.approvers ?? [];
  const send = async (event: React.FormEvent) => {
    event.preventDefault(); if (!skillId || !level || !approverId || !reason.trim()) return;
    setPending(true); setError(""); setNotice("");
    try {
      await request("/api/v1/skills/requests", csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), employeeId, skillId, requestedLevel: level, expectedRatingVersion: profile?.ratings.find(item => item.skillId === skillId)?.version ?? 0, approverAccountId: approverId, trainingSourceId, reason: reason.trim() }) });
      setNotice("Skill recommendation request submitted. The official rating stays unchanged until approval."); setReason(""); await load();
    } catch (cause) { const err = cause as ApiError; const message = err.status === 409 ? "Skill history changed. Refresh and review the latest rating before retrying." : err.status === 403 ? "Skill request access changed; recheck current permissions." : cause instanceof Error ? cause.message : "Skill recommendation could not be submitted."; setError(message); if (err.status === 403 || err.status === 409) { setProfile(null); try { await load(); } catch { setSetup(null); } } }
    finally { setPending(false); }
  };
  return <section className="training-recommendation" aria-label="Skill recommendation">
    <h4>Skill recommendation status</h4>
    {error && <div className="training-alert" role="alert">{error}</div>}{notice && <div className="training-notice" role="status">{notice}</div>}
    {profile === null && !error && <p className="training-empty" role="status">Loading linked skill recommendation status…</p>}
    {profile === null && error && <p className="training-empty" role="status">Skill recommendation status is unavailable with your current access.</p>}
    {profile && relevant.length > 0 && <div className="training-recommendation-list">{relevant.map(item => <article key={item.id}><strong>{item.approvalState ?? "Approval unavailable"} · {item.requestedLevel}</strong><p>Approver: {item.approverLabel}</p>{item.decisionEvidence && <p>{item.decisionEvidence.outcome}: {item.decisionEvidence.reason} · {new Date(item.decisionEvidence.decidedAt).toLocaleString()}</p>}<p>Training completion and skill approval are separate records. The official level changes only after approval.</p></article>)}</div>}
    {profile?.capabilities.canRequest && <form className="training-form" onSubmit={send}>
      <p className="training-wide">A completed module can support a separate official skill request.</p>
      <label>Skill<select value={skillId} onChange={event => setSkillId(event.target.value)} required><option value="">Choose a catalogue skill</option>{setup?.skills.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Requested official level<select value={level} onChange={event => setLevel(event.target.value as SkillLevel | "")} required><option value="">Choose a level</option>{["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map(item => <option value={item} key={item}>{item[0] + item.slice(1).toLowerCase()}</option>)}</select></label>
      <label>Named approver<select value={approverId} onChange={event => setApproverId(event.target.value)} required><option value="">Choose eligible approver</option>{approvers.map(item => <option value={item.accountId} key={item.accountId}>{item.label}</option>)}</select></label>
      <label className="training-wide">Reason<textarea value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={1000} rows={2} required /></label>
      <button type="submit" disabled={pending || !skillId || !level || !approverId || reason.trim().length < 3}>Request skill rating</button>
      {!approvers.length && <p className="training-empty" role="status">No independent eligible approver is available for this employee.</p>}
    </form>}
    {profile && relevant.length === 0 && !profile.capabilities.canRequest && <p className="training-empty" role="status">No linked skill recommendation request. Training completion alone does not change an official skill rating.</p>}
  </section>;
}

function ModuleBlock({ block, references, nested = false }: { block: Record<string, unknown>; references: SopReference[]; nested?: boolean }): React.JSX.Element {
  const type = asText(block.type);
  if (type === "TEXT") return <p className="training-block-text">{asText(block.text)}</p>;
  if (type === "CHECKLIST" && Array.isArray(block.items)) return <ul>{block.items.map((item, index) => <li key={index}>{asText(item)}</li>)}</ul>;
  if (type === "LINK" && typeof block.url === "string") return <p><a href={block.url} target="_blank" rel="noreferrer">{asText(block.label) || "Open learning reference"}</a></p>;
  if (["IMAGE", "PDF", "VIDEO", "FILE", "TEMPLATE"].includes(type) && typeof block.fileId === "string") return <p><a href={`/api/v1/library/files/${encodeURIComponent(block.fileId)}/stream`}>Open attached {type.toLowerCase()} reference</a></p>;
  if (type === "SOP") {
    if (nested) return <p>This SOP links to another controlled procedure.</p>;
    const reference = references.find(item => item.versionId === block.versionId);
    if (!reference) return <p className="training-empty">This linked SOP is not currently accessible.</p>;
    return <details className="training-sop-reference"><summary>Read {reference.title} · Version {reference.version}</summary>{(reference.content.blocks ?? []).map((item, index) => <ModuleBlock block={item} references={references} nested key={`${String(item.type)}-${index}`} />)}</details>;
  }
  return <p className="training-empty">This module contains an unsupported content block.</p>;
}
