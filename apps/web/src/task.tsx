import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./task.css";

type Project = { id: string; title: string; status: string; branchId: string; canApproveCloseout?: boolean };
type Employee = { id: string; name: string; homeBranchId: string };
type PlanItem = { id: string; projectId: string; kind: "STAGE" | "MILESTONE"; label: string };
type Setup = { actorEmployeeId: string | null; projects: Project[]; employees: Employee[]; planItems: PlanItem[]; canAssign: boolean };
export type Task = {
  id: string; title: string; type: string; priority: string; targetDate: string; description?: string | null; startDate?: string | null; estimatedHours?: number | string | null;
  projectId?: string | null; planItemId?: string | null; tags: string[]; checklist: Array<{ label: string; checked: boolean }>; primaryOwnerEmployeeId: string; requiresReassignment?: boolean; status: string; version: number;
  reviewRequirement: string; createdAt: string; committedDueDate?: string | null; waitingReason?: string | null; waitingDelayCause?: string | null; waitingResponsibleParty?: string | null;
};
type TaskPage = { total: number; items: Task[] };
type HistoryEntry = { id?: string; reason?: string; action?: string; fromStatus?: string; toStatus?: string; delayCause?: string | null; responsibleParty?: string | null; oldOwnerEmployeeId?: string; newOwnerEmployeeId?: string; occurredAt?: string };
type CommittedDateChange = { id: string; oldDate: string | null; newDate: string; actorId: string; reason: string; taskVersion: number; occurredAt: string };
type DependencySummary = { id: string; title: string; status: string };
type Extension = { id: string; previousDate: string; proposedDate: string; reason: string; state: string; requesterId: string; approverId: string; requestedAt: string; decision?: { outcome: string; reason: string; decidedAt: string } | null; canDecide: boolean; canWithdraw?: boolean };
type ExtensionApprover = { accountId: string; name: string; kind: string };
type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
type RecurrenceRule = { id: string; sourceTaskId: string; frequency: RecurrenceFrequency; anchorDate: string; effectiveFromDate: string; paused: boolean; version: number; configuredById: string; createdAt: string; updatedAt: string };
type RecurrenceHistory = { id: string; ruleVersion: number; action: "configured" | "paused" | "resumed"; actorId: string; reason: string; before: unknown; after: unknown; occurredAt: string };
type RecurrenceData = { rule: RecurrenceRule | null; history: RecurrenceHistory[]; capabilities: { configure: boolean; pause: boolean; resume: boolean }; timezone: string };
export type Detail = { task: Task; linkedReviewTaskId?: string | null; collaborators: Array<{ employeeId: string; name: string; estimatedHours?: number }>; history: { statusChanges: HistoryEntry[]; ownerChanges: HistoryEntry[]; committedDateChanges?: CommittedDateChange[] }; extensions?: Extension[]; dependencies?: { predecessors: DependencySummary[]; hasUnfinished: boolean; hiddenCount: number }; closeoutApproval?: { approverId: string; reason: string; workScope: string; approvedAt: string; revokedAt: string | null; revocationReason: string | null } | null; capabilities: { edit: boolean; transition: boolean; reassign: boolean; wait?: boolean; resume?: boolean; changeCommittedDate?: boolean; requestExtension?: boolean; manageDependencies?: boolean; revokeCloseout?: boolean } };
type Props = { csrfToken: string; owner: boolean };

const ROOT = "/api/v1/tasks";
const TYPES = ["PROJECT", "NON_PROJECT", "RECURRING", "CORRECTION", "SITE", "TRAINING_PRACTICAL"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.clone().json().catch(() => ({})) as { message?: string; error?: { message?: string } };
    const error = new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}
function statusOf(error: unknown): number | undefined { return error instanceof Error ? (error as Error & { status?: number }).status : undefined; }
function stateLabel(value: string): string { return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }

export function TaskWorkspace({ csrfToken }: Props): React.JSX.Element {
  const initialTaskId = useRef(new URLSearchParams(window.location.search).get("taskId") ?? "");
  const [setup, setSetup] = useState<Setup>();
  const [scope, setScope] = useState<"mine" | "assigned">("mine");
  const [page, setPage] = useState<TaskPage>();
  const [detail, setDetail] = useState<Detail>();
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [overloadPrompt, setOverloadPrompt] = useState<{ kind: "create" | "reassign"; body: Record<string, unknown>; message: string }>();
  const [showForm, setShowForm] = useState(false);
  const [showCloseoutForm, setShowCloseoutForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [assignTo, setAssignTo] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("NON_PROJECT");
  const [priority, setPriority] = useState("MEDIUM");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [collaboratorHours, setCollaboratorHours] = useState<Record<string, string>>({});
  const [workScope, setWorkScope] = useState("");
  const [planItemId, setPlanItemId] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [reason, setReason] = useState("");
  const [reassignId, setReassignId] = useState("");
  const [waitReason, setWaitReason] = useState("");
  const [delayCause, setDelayCause] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [resumeReason, setResumeReason] = useState("");
  const [dependencyCandidates, setDependencyCandidates] = useState<DependencySummary[]>([]);
  const [dependencySearch, setDependencySearch] = useState("");
  const [predecessorId, setPredecessorId] = useState("");
  const [dependencyReason, setDependencyReason] = useState("");
  const [confirmEarlyStart, setConfirmEarlyStart] = useState(false);
  const [committedDate, setCommittedDate] = useState("");
  const [committedDateReason, setCommittedDateReason] = useState("");
  const [extensionApprovers, setExtensionApprovers] = useState<ExtensionApprover[]>([]);
  const [extensionApproversLoading, setExtensionApproversLoading] = useState(false);
  const [extensionApproversError, setExtensionApproversError] = useState("");
  const [extensionApproverRetry, setExtensionApproverRetry] = useState(0);
  const [extensionDate, setExtensionDate] = useState("");
  const [extensionReason, setExtensionReason] = useState("");
  const [extensionApproverId, setExtensionApproverId] = useState("");
  const [extensionDecisionReason, setExtensionDecisionReason] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceData>();
  const [recurrenceLoading, setRecurrenceLoading] = useState(false);
  const [recurrenceError, setRecurrenceError] = useState("");
  const [recurrenceRetry, setRecurrenceRetry] = useState(0);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>("WEEKLY");
  const [recurrenceDate, setRecurrenceDate] = useState("");
  const [recurrenceReason, setRecurrenceReason] = useState("");
  const [recurrenceActionReason, setRecurrenceActionReason] = useState("");

  const load = useCallback(async (preferredId = "") => {
    setLoading(true); setError(""); setDenied(false);
    try {
      const [nextSetup, nextPage] = await Promise.all([
        fetch(`${ROOT}/setup`, { credentials: "include", cache: "no-store" }).then((response) => json<Setup>(response)),
        fetch(`${ROOT}?scope=${scope}&offset=0&limit=50`, { credentials: "include", cache: "no-store" }).then((response) => json<TaskPage>(response))
      ]);
      setSetup(nextSetup); setPage(nextPage);
      const id = preferredId || nextPage.items[0]?.id || "";
      setSelectedId(id);
      if (id) {
        const value = await fetch(`${ROOT}/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }).then((response) => json<Detail>(response));
        setDetail(value);
      } else setDetail(undefined);
    } catch (cause) {
      setDetail(undefined);
      if (statusOf(cause) === 403) setDenied(true);
      else setError("Tasks could not be loaded. Try again.");
    } finally { setLoading(false); }
  }, [scope]);

  useEffect(() => { const id = initialTaskId.current; initialTaskId.current = ""; void load(id); }, [load]);
  useEffect(() => {
    if (!detail?.capabilities.manageDependencies) { setDependencyCandidates([]); return; }
    let active = true;
    const query = dependencySearch.trim();
    void fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/dependency-candidates${query ? `?q=${encodeURIComponent(query)}` : ""}`, { credentials: "include", cache: "no-store" })
      .then((response) => json<{ items: DependencySummary[] }>(response)).then((value) => { if (active) setDependencyCandidates(value.items); })
      .catch(() => { if (active) setDependencyCandidates([]); });
    return () => { active = false; };
  }, [detail?.task.id, detail?.task.version, detail?.capabilities.manageDependencies, dependencySearch]);
  useEffect(() => {
    if (!detail?.capabilities.requestExtension) { setExtensionApprovers([]); setExtensionApproversLoading(false); setExtensionApproversError(""); return; }
    let active = true;
    setExtensionApproversLoading(true); setExtensionApproversError("");
    void fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/extension-approvers`, { credentials: "include", cache: "no-store" })
      .then((response) => json<{ items: ExtensionApprover[] }>(response)).then((value) => { if (active) setExtensionApprovers(value.items); })
      .catch(() => { if (active) { setExtensionApprovers([]); setExtensionApproversError("Eligible approvers could not be loaded."); } })
      .finally(() => { if (active) setExtensionApproversLoading(false); });
    return () => { active = false; };
  }, [detail?.task.id, detail?.task.version, detail?.capabilities.requestExtension, extensionApproverRetry]);
  useEffect(() => {
    if (detail?.task.type !== "RECURRING") { setRecurrence(undefined); setRecurrenceError(""); setRecurrenceLoading(false); return; }
    let active = true;
    setRecurrenceLoading(true); setRecurrenceError("");
    void fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/recurrence`, { credentials: "include", cache: "no-store" })
      .then((response) => json<RecurrenceData>(response)).then((value) => { if (active) { setRecurrence(value); setRecurrenceFrequency(value.rule?.frequency ?? "WEEKLY"); setRecurrenceDate(""); setRecurrenceReason(""); setRecurrenceActionReason(""); } })
      .catch(() => { if (active) { setRecurrence(undefined); setRecurrenceError("Recurrence details could not be loaded."); } })
      .finally(() => { if (active) setRecurrenceLoading(false); });
    return () => { active = false; };
  }, [detail?.task.id, detail?.task.type, detail?.task.version, recurrenceRetry]);
  const refresh = () => { void load(selectedId); if (detail?.task.type === "RECURRING") setRecurrenceRetry((count) => count + 1); };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || reason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    const body: Record<string, unknown> = {
      title: title.trim(), type, priority, targetDate,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(startDate ? { startDate } : {}),
      ...(estimatedHours ? { estimatedHours: Number(estimatedHours) } : {}),
      ...(projectId ? { projectId } : {}),
      ...(planItemId ? { planItemId } : {}),
      ...(tagsText.trim() ? { tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean) } : {}),
      ...(checklistText.trim() ? { checklist: checklistText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => ({ label: line.replace(/^\[x\]\s*/i, "").replace(/^\[ \]\s*/, ""), checked: /^\[x\]\s*/i.test(line) })) } : {}),
      ...(assignTo && setup?.canAssign && ownerId ? { ownerEmployeeId: ownerId } : {}),
      ...(collaboratorIds.length ? { collaborators: collaboratorIds.map((employeeId) => ({ employeeId, ...(collaboratorHours[employeeId] ? { estimatedHours: Number(collaboratorHours[employeeId]) } : {}) })) } : {}),
      reason: reason.trim()
    };
    try {
      await fetch(ROOT, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }).then((response) => json(response));
      setTitle(""); setDescription(""); setReason(""); setTargetDate(""); setStartDate(""); setEstimatedHours(""); setProjectId(""); setPlanItemId(""); setTagsText(""); setChecklistText(""); setAssignTo(false); setShowForm(false); setCollaboratorIds([]); setCollaboratorHours({});
      setNotice("Task created."); await load("");
    } catch (cause) { const message = cause instanceof Error ? cause.message : ""; if (statusOf(cause) === 409 && message.includes("Overload warning")) setOverloadPrompt({ kind: "create", body, message }); else setError(statusOf(cause) === 403 ? "You do not have permission to create this task." : statusOf(cause) === 409 ? "The task changed. Refresh and review the latest details." : "Task could not be created. Check the fields and try again."); }
    finally { setBusy(false); }
  };
  const acknowledgeOverload = async (): Promise<void> => {
    if (!overloadPrompt || busy) return;
    const pending = overloadPrompt; setBusy(true); setError(""); setNotice("");
    try {
      if (pending.kind === "create") {
        await fetch(ROOT, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ ...pending.body, acknowledgeOverload: true }) }).then(response => json(response));
        setTitle(""); setDescription(""); setReason(""); setTargetDate(""); setStartDate(""); setEstimatedHours(""); setProjectId(""); setPlanItemId(""); setTagsText(""); setChecklistText(""); setAssignTo(false); setShowForm(false); setCollaboratorIds([]); setCollaboratorHours({}); setNotice("Task created after overload acknowledgement."); setOverloadPrompt(undefined); await load("");
      } else if (detail) {
        await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/reassign`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ ...pending.body, acknowledgeOverload: true }) }).then(response => json(response));
        setReason(""); setReassignId(""); setOverloadPrompt(undefined); setNotice("Task owner reassigned after overload acknowledgement."); await load(detail.task.id);
      }
    } catch (cause) { setError(statusOf(cause) === 403 ? "You do not have permission to make this assignment." : statusOf(cause) === 409 ? "Capacity or task state changed. Review the latest details and retry." : "The task could not be assigned."); if (statusOf(cause) === 409) setOverloadPrompt(undefined); }
    finally { setBusy(false); }
  };
  const editTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail || busy || reason.trim().length < 3) return;
    setBusy(true); setError("");
    const body = { expectedVersion: detail.task.version, reason: reason.trim(), title: title.trim(), targetDate, priority, ...(description.trim() ? { description: description.trim() } : {}), ...(startDate ? { startDate } : {}), ...(estimatedHours ? { estimatedHours: Number(estimatedHours) } : {}), planItemId: planItemId || null, tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean), checklist: checklistText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => ({ label: line.replace(/^\[x\]\s*/i, "").replace(/^\[ \]\s*/, ""), checked: /^\[x\]\s*/i.test(line) })) };
    try {
      await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }).then((response) => json(response));
      setEditing(false); setNotice("Task details updated."); await load(detail.task.id);
    } catch (cause) { setError(statusOf(cause) === 409 ? "This task changed elsewhere. Reloaded the latest details." : statusOf(cause) === 403 ? "You do not have permission to edit this task." : "Task details could not be updated. Try again."); if (statusOf(cause) === 409) await load(detail.task.id); }
    finally { setBusy(false); }
  };
  const createCloseout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !projectId || !ownerId || reason.trim().length < 3) return;
    setBusy(true); setError("");
    try {
      await fetch(`${ROOT}/closeout`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ projectId, ownerEmployeeId: ownerId, title: title.trim(), workScope: workScope.trim(), targetDate, priority, reason: reason.trim() }) }).then((response) => json(response));
      setShowCloseoutForm(false); setNotice("Approved closeout task created."); setTitle(""); setWorkScope(""); setTargetDate(""); setProjectId(""); setOwnerId(""); setReason(""); await load("");
    } catch (cause) { setError(statusOf(cause) === 403 ? "You are not authorized to approve closeout work for this project." : statusOf(cause) === 409 ? "The project changed or is no longer eligible for closeout." : "Closeout task could not be created. Check the fields and try again."); }
    finally { setBusy(false); }
  };
  const revokeCloseout = () => { if (!detail) return; void mutate("/closeout/revoke", { reason: reason.trim() }, "Closeout approval revoked."); };
  const mutate = async (path: string, body: unknown, success: string) => {
    if (!detail || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }).then((response) => json(response));
      setReason("");
      if (path.includes("/dependencies")) { setDependencyReason(""); setPredecessorId(""); }
      if (path === "/state") setConfirmEarlyStart(false);
      if (path === "/committed-date") setCommittedDateReason("");
      if (path.includes("/extension-requests")) { setExtensionReason(""); setExtensionDecisionReason(""); setExtensionApproverId(""); setExtensionDate(""); }
      if (path === "/wait" || path === "/resume") clearWaitingForm();
      setNotice(success); await load(detail.task.id);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      if (path === "/reassign" && statusOf(cause) === 409 && message.includes("Overload warning")) setOverloadPrompt({ kind: "reassign", body: body as Record<string, unknown>, message });
      else if (statusOf(cause) === 409) { await load(detail.task.id); setError("This task changed elsewhere. The latest details are now loaded."); }
      else setError(statusOf(cause) === 403 ? "You do not have permission to make this change." : "The task could not be updated. Try again.");
    } finally { setBusy(false); }
  };
  const transition = (toState: "IN_PROGRESS" | "COMPLETED", acknowledgeUnfinishedDependencies = false) => {
    if (!detail) return;
    void mutate("/state", { toState, expectedVersion: detail.task.version, reason: reason.trim(), ...(acknowledgeUnfinishedDependencies ? { acknowledgeUnfinishedDependencies: true } : {}) }, `Task marked ${stateLabel(toState).toLowerCase()}.`);
  };
  const mutateRecurrence = async (method: "PUT" | "POST", suffix: string, reasonText: string, frequency?: RecurrenceFrequency, firstOccurrenceDate?: string) => {
    if (!detail || !recurrence || busy) return;
    setBusy(true); setRecurrenceError(""); setNotice("");
    const body = method === "PUT"
      ? { expectedTaskVersion: detail.task.version, expectedVersion: recurrence.rule?.version ?? 0, frequency, firstOccurrenceDate, reason: reasonText.trim() }
      : { expectedTaskVersion: detail.task.version, expectedVersion: recurrence.rule!.version, reason: reasonText.trim() };
    try {
      await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/recurrence${suffix}`, { method, credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }).then((response) => json(response));
      setRecurrenceReason(""); setRecurrenceActionReason(""); setRecurrenceDate("");
      const current = await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/recurrence`, { credentials: "include", cache: "no-store" }).then((response) => json<RecurrenceData>(response));
      setRecurrence(current); setNotice(suffix === "/pause" ? "Recurrence paused." : suffix === "/resume" ? "Recurrence resumed." : "Recurrence rule saved.");
    } catch (cause) {
      setRecurrenceError(statusOf(cause) === 409 ? "The task or recurrence changed elsewhere. Refresh and review the latest rule." : statusOf(cause) === 403 ? "You do not have permission to change this recurrence." : "The recurrence could not be updated. Try again.");
      if (statusOf(cause) === 409) { void load(detail.task.id); setRecurrenceRetry((count) => count + 1); }
    } finally { setBusy(false); }
  };
  const clearWaitingForm = () => { setWaitReason(""); setDelayCause(""); setResponsibleParty(""); setResumeReason(""); };
  const canCreate = !!setup && (setup.canAssign || !!setup.actorEmployeeId);
  const selected = detail?.task;
  useEffect(() => {
    setCommittedDate(selected?.committedDueDate?.slice(0, 10) ?? "");
    setCommittedDateReason("");
    setConfirmEarlyStart(false);
  }, [selectedId, selected?.committedDueDate]);

  return <section className="task-workspace" aria-labelledby="task-workspace-title">
    <header className="task-header"><div><p className="task-eyebrow">Work management</p><h2 id="task-workspace-title">Tasks</h2><p>Track your work, collaborators and progress.</p></div><div className="task-header-actions">{setup?.projects.some((project) => project.status === "CANCELLED" && project.canApproveCloseout) && <button type="button" onClick={() => { setShowCloseoutForm((open) => !open); setShowForm(false); }}>{showCloseoutForm ? "Close closeout form" : "Approve closeout task"}</button>}<button type="button" className="task-primary" onClick={() => setShowForm((open) => !open)} disabled={!canCreate}>{showForm ? "Close form" : "Create task"}</button></div></header>
    <div className="task-toolbar"><div role="group" aria-label="Task list scope" className="task-tabs"><button type="button" aria-pressed={scope === "mine"} onClick={() => { clearWaitingForm(); setScope("mine"); }}>My tasks</button><button type="button" aria-pressed={scope === "assigned"} onClick={() => { clearWaitingForm(); setScope("assigned"); }}>Assigned tasks</button></div><button type="button" onClick={refresh}>Refresh</button></div>
    {notice && <p className="task-notice" role="status">{notice}</p>}{error && <p className="task-error" role="alert">{error} <button type="button" onClick={refresh}>Reload</button></p>}
    {overloadPrompt && <section className="task-overload-warning" role="alert" aria-label="Capacity warning"><h3>Capacity warning</h3><p>{overloadPrompt.message}</p><p>Assignment remains unchanged unless you acknowledge this warning.</p><button type="button" className="task-primary" disabled={busy} onClick={() => void acknowledgeOverload()}>Acknowledge and {overloadPrompt.kind === "create" ? "create task" : "reassign owner"}</button><button type="button" disabled={busy} onClick={() => setOverloadPrompt(undefined)}>Cancel assignment</button></section>}
    {showForm && <form className="task-form" onSubmit={(event) => void submit(event)} aria-label="Create task"><h3>Create a task</h3><p>Self-task creation keeps you as the owner. Authorized managers can choose an owner explicitly.</p>
      <label>Task name<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={160} required /></label>
      <div className="task-form-grid"><label>Type<select value={type} onChange={(event) => setType(event.target.value)}>{TYPES.map((item) => <option key={item} value={item}>{stateLabel(item)}</option>)}</select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}>{PRIORITIES.map((item) => <option key={item} value={item}>{stateLabel(item)}</option>)}</select></label><label>Target date<input aria-label="Target date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required /></label></div>
      <label>Project (optional)<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setPlanItemId(""); }}><option value="">No project</option>{setup?.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
      <label>Stage or milestone (optional)<select aria-label="Stage or milestone" value={planItemId} onChange={(event) => setPlanItemId(event.target.value)} disabled={!projectId}><option value="">No plan item</option>{setup?.planItems.filter((item) => item.projectId === projectId).map((item) => <option key={item.id} value={item.id}>{item.kind === "STAGE" ? "Stage" : "Milestone"} · {item.label}</option>)}</select></label>
      <label>Description (optional)<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={3} /></label>
      <label>Tags (optional, comma separated)<input aria-label="Tags" value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Concept, client feedback" /></label>
      <label>Checklist (optional, one item per line)<textarea aria-label="Checklist" value={checklistText} onChange={(event) => setChecklistText(event.target.value)} placeholder={"[ ] Confirm brief\n[x] Collect references"} rows={3} /></label>
      <div className="task-form-grid"><label>Start date (optional)<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Estimated hours (optional)<input type="number" min="0" step="0.25" value={estimatedHours} onChange={(event) => setEstimatedHours(event.target.value)} /></label></div>
      {setup?.canAssign && <fieldset className="task-assignment"><legend>Collaborators (optional)</legend>{setup.employees.filter((employee) => employee.id !== (assignTo ? ownerId : setup.actorEmployeeId)).map((employee) => <div className="task-collaborator-choice" key={employee.id}><label className="task-inline"><input type="checkbox" checked={collaboratorIds.includes(employee.id)} onChange={(event) => setCollaboratorIds((ids) => event.target.checked ? [...ids, employee.id] : ids.filter((id) => id !== employee.id))} /> {employee.name}</label>{collaboratorIds.includes(employee.id) && <label>Estimated hours<input aria-label={`${employee.name} estimated hours`} type="number" min="0" step="0.25" value={collaboratorHours[employee.id] ?? ""} onChange={(event) => setCollaboratorHours((hours) => ({ ...hours, [employee.id]: event.target.value }))} /></label>}</div>)}</fieldset>}
      {setup?.canAssign && <fieldset className="task-assignment"><legend>Ownership</legend><label className="task-inline"><input type="checkbox" checked={assignTo} onChange={(event) => setAssignTo(event.target.checked)} /> Assign to an employee</label>{assignTo ? <label>Primary owner<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} required><option value="">Choose an employee</option>{setup.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label> : <p>This will be created as your self-task.</p>}</fieldset>}
      <label>Reason<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" className="task-primary" disabled={busy || reason.trim().length < 3 || (assignTo && !ownerId)}>{busy ? "Creating…" : "Create task"}</button>
    </form>}
    {showCloseoutForm && <form className="task-form task-closeout-form" onSubmit={(event) => void createCloseout(event)} aria-label="Approve closeout task"><h3>Approve closeout task</h3><p>This creates separately identified work on a cancelled project and records your approval.</p><label>Cancelled project<select value={projectId} onChange={(event) => setProjectId(event.target.value)} required><option value="">Choose an eligible project</option>{setup?.projects.filter((project) => project.status === "CANCELLED" && project.canApproveCloseout).map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label><label>Task name<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={160} required /></label><label>Approved work scope<textarea value={workScope} onChange={(event) => setWorkScope(event.target.value)} minLength={3} maxLength={2000} required rows={3} /></label><div className="task-form-grid"><label>Primary owner<select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} required><option value="">Choose an eligible employee</option>{setup?.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}>{PRIORITIES.map((item) => <option key={item} value={item}>{stateLabel(item)}</option>)}</select></label><label>Target date<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required /></label></div><label>Reason for approval<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" className="task-primary" disabled={busy || !projectId || !ownerId || workScope.trim().length < 3 || reason.trim().length < 3}>Create approved closeout task</button></form>}
    {loading ? <p role="status">Loading tasks…</p> : denied ? <p role="alert">You do not have access to these tasks.</p> : !page ? null : <div className="task-columns">
      <nav className="task-list" aria-label={scope === "mine" ? "My tasks" : "Assigned tasks"}><h3>{scope === "mine" ? "My tasks" : "Assigned tasks"}<span>{page.total}</span></h3>{page.items.length === 0 ? <p className="task-empty">No {scope === "mine" ? "tasks assigned to you" : "tasks assigned by you"} yet.</p> : page.items.map((task) => <button type="button" key={task.id} className={`task-list-item${task.id === selectedId ? " is-selected" : ""}`} aria-current={task.id === selectedId ? "true" : undefined} onClick={() => { if (task.id !== selectedId) clearWaitingForm(); setSelectedId(task.id); void load(task.id); }}><strong>{task.title}</strong><span>{stateLabel(task.status)} · {stateLabel(task.priority)}</span>{task.requiresReassignment && <span className="task-reassignment-alert">Needs reassignment after employee exit</span>}<small>Target {task.targetDate.slice(0, 10)}</small></button>)}</nav>
      <article className="task-detail" aria-label="Task details">{selected ? <><div className="task-detail-heading"><div><p className="task-eyebrow">{stateLabel(selected.type)}{selected.projectId ? " · Project task" : " · No project"}</p><h3>{selected.title}</h3></div><span className={`task-state task-state-${selected.status.toLowerCase()}`}>{stateLabel(selected.status)}</span></div>
      {selected.projectId && detail.linkedReviewTaskId && <p><a className="task-review-link" href={`/reviews?taskId=${encodeURIComponent(detail.linkedReviewTaskId)}`}>Open correction instructions in internal review</a></p>}
      {selected.projectId && !detail.linkedReviewTaskId && <p><a className="task-review-link" href={`/reviews?taskId=${encodeURIComponent(selected.id)}`}>Open internal review</a></p>}
        {selected.requiresReassignment && <p className="task-reassignment-alert" role="status">Needs reassignment after employee exit. A manager must reassign this task before it can resume.</p>}
        {selected.status === "WAITING" && !selected.requiresReassignment && <section className="task-waiting-details" aria-label="Waiting details"><h4>Waiting details</h4><dl><div><dt>Reason</dt><dd>{selected.waitingReason || "Not recorded"}</dd></div><div><dt>Delay cause</dt><dd>{selected.waitingDelayCause || "Not recorded"}</dd></div><div><dt>Responsible party</dt><dd>{selected.waitingResponsibleParty || "Not specified"}</dd></div></dl></section>}
        <dl className="task-facts"><div><dt>Priority</dt><dd>{stateLabel(selected.priority)}</dd></div><div><dt>Target date</dt><dd>{selected.targetDate.slice(0, 10)}</dd></div><div><dt>Committed due date</dt><dd>{selected.committedDueDate?.slice(0, 10) ?? "Not set"}</dd></div><div><dt>Owner</dt><dd>{setup?.employees.find((employee) => employee.id === selected.primaryOwnerEmployeeId)?.name ?? (selected.primaryOwnerEmployeeId === setup?.actorEmployeeId ? "You" : "Task owner")}</dd></div><div><dt>Version</dt><dd>{selected.version}</dd></div></dl>
        {selected.projectId && <section className="task-dependencies" aria-label="Task dependencies"><h4>Finish-to-start dependencies</h4>{detail.dependencies?.predecessors.length ? <ul>{detail.dependencies.predecessors.map((predecessor) => <li key={predecessor.id}><span>{predecessor.title} · {stateLabel(predecessor.status)}</span>{detail.capabilities.manageDependencies && <button type="button" disabled={busy || dependencyReason.trim().length < 3} onClick={() => void mutate(`/dependencies/${encodeURIComponent(predecessor.id)}/remove`, { expectedVersion: selected.version, reason: dependencyReason.trim() }, "Dependency removed.")}>Remove</button>}</li>)}</ul> : <p>No visible predecessor tasks linked.</p>}{(detail.dependencies?.hiddenCount ?? 0) > 0 && <p>Additional linked tasks are unavailable under your current access.</p>}{detail.dependencies?.hasUnfinished && <p className="task-dependency-warning" role="status">At least one predecessor is unfinished. Starting this task early requires an explicit acknowledgement.</p>}{detail.capabilities.manageDependencies && <form onSubmit={(event) => { event.preventDefault(); if (predecessorId) void mutate("/dependencies", { predecessorTaskId: predecessorId, expectedVersion: selected.version, reason: dependencyReason.trim() }, "Dependency added."); }}><label>Search predecessor tasks<input value={dependencySearch} onChange={(event) => { setDependencySearch(event.target.value); setPredecessorId(""); }} maxLength={160} /></label><label>Link an accessible predecessor<select value={predecessorId} onChange={(event) => setPredecessorId(event.target.value)}><option value="">Choose a task</option>{dependencyCandidates.filter((candidate) => !detail.dependencies?.predecessors.some((linked) => linked.id === candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} · {stateLabel(candidate.status)}</option>)}</select></label><label>Reason for dependency change<input value={dependencyReason} onChange={(event) => setDependencyReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || !predecessorId || dependencyReason.trim().length < 3}>Add dependency</button></form>}</section>}
        {selected.planItemId && <p className="task-linked-plan">Linked plan item: {setup?.planItems.find((item) => item.id === selected.planItemId)?.label ?? "Project plan item"}</p>}
        {!!selected.tags.length && <><h4>Tags</h4><ul className="task-tags">{selected.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul></>}
        {!!selected.checklist.length && <><h4>Checklist <span className="task-checklist-count">{selected.checklist.filter((item) => item.checked).length}/{selected.checklist.length}</span></h4><ul className="task-checklist">{selected.checklist.map((item, index) => <li key={`${item.label}-${index}`}><input type="checkbox" checked={item.checked} disabled aria-label={item.label} /><span>{item.label}</span></li>)}</ul><p className="task-decision-help">Checklist progress does not complete the task automatically.</p></>}
        {detail.capabilities.edit && !editing && <button type="button" onClick={() => { setTitle(selected.title); setDescription(selected.description ?? ""); setTargetDate(selected.targetDate.slice(0, 10)); setPriority(selected.priority); setStartDate(selected.startDate?.slice(0, 10) ?? ""); setEstimatedHours(selected.estimatedHours == null ? "" : String(selected.estimatedHours)); setPlanItemId(selected.planItemId ?? ""); setTagsText(selected.tags.join(", ")); setChecklistText(selected.checklist.map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.label}`).join("\n")); setEditing(true); }}>Edit task</button>}
        {editing && <form className="task-edit-form" onSubmit={(event) => void editTask(event)}><h4>Edit task</h4><label>Task name<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={160} required /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} /></label><div className="task-form-grid"><label>Target date<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required /></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}>{PRIORITIES.map((item) => <option key={item} value={item}>{stateLabel(item)}</option>)}</select></label><label>Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Estimated hours<input type="number" min="0" step="0.25" value={estimatedHours} onChange={(event) => setEstimatedHours(event.target.value)} /></label></div><label>Stage or milestone<select aria-label="Edit plan item" value={planItemId} onChange={(event) => setPlanItemId(event.target.value)} disabled={!selected.projectId}><option value="">No plan item</option>{setup?.planItems.filter((item) => item.projectId === selected.projectId).map((item) => <option key={item.id} value={item.id}>{item.kind === "STAGE" ? "Stage" : "Milestone"} · {item.label}</option>)}</select></label><label>Tags (comma separated)<input aria-label="Edit tags" value={tagsText} onChange={(event) => setTagsText(event.target.value)} /></label><label>Checklist (one item per line; prefix with [x] when checked)<textarea aria-label="Edit checklist" value={checklistText} onChange={(event) => setChecklistText(event.target.value)} rows={3} /></label><label>Reason<input aria-label="Edit reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label><div className="task-edit-actions"><button type="submit" disabled={busy || reason.trim().length < 3}>{busy ? "Saving…" : "Save task"}</button><button type="button" onClick={() => setEditing(false)}>Cancel edit</button></div></form>}
        {selected.description && !editing && <><h4>Description</h4><p className="task-description">{selected.description}</p></>}
        {detail.collaborators.length > 0 && <><h4>Collaborators</h4><ul>{detail.collaborators.map((person) => <li key={person.employeeId}>{person.name}{person.estimatedHours !== undefined ? ` · ${person.estimatedHours} estimated hours` : ""}</li>)}</ul></>}
        {detail.capabilities.changeCommittedDate && selected.type !== "CLOSEOUT" && <form className="task-committed-date" aria-label="Set committed due date" onSubmit={(event) => { event.preventDefault(); void mutate("/committed-date", { expectedVersion: selected.version, committedDueDate: committedDate, reason: committedDateReason.trim() }, selected.committedDueDate ? "Committed due date updated." : "Committed due date set."); }}><h4>{selected.committedDueDate ? "Change committed due date" : "Set committed due date"}</h4><p>This commitment is separate from the operational target date.</p><label>Committed due date<input type="date" value={committedDate} onChange={(event) => setCommittedDate(event.target.value)} required /></label><label>Reason<input value={committedDateReason} onChange={(event) => setCommittedDateReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || !committedDate || committedDateReason.trim().length < 3}>{busy ? "Saving…" : selected.committedDueDate ? "Change committed date" : "Set committed date"}</button></form>}
        {selected.type === "RECURRING" && <section className="task-recurrence" aria-label="Recurrence schedule"><h4>Recurrence schedule</h4>
          {recurrenceLoading && <p role="status">Loading recurrence…</p>}{recurrenceError && <p role="alert">{recurrenceError} <button type="button" onClick={() => setRecurrenceRetry((count) => count + 1)}>Retry</button></p>}
          {recurrence && <><p>Organization timezone: <strong>{recurrence.timezone}</strong></p>
            {recurrence.rule ? <dl className="task-recurrence-facts"><div><dt>Frequency</dt><dd>{stateLabel(recurrence.rule.frequency)}</dd></div><div><dt>Anchor date</dt><dd>{recurrence.rule.anchorDate.slice(0, 10)}</dd></div><div><dt>Effective first date</dt><dd>{recurrence.rule.effectiveFromDate.slice(0, 10)}</dd></div><div><dt>Schedule status</dt><dd>{recurrence.rule.paused ? "Paused" : "Active"}</dd></div><div><dt>Rule version</dt><dd>{recurrence.rule.version}</dd></div></dl> : <p>No recurrence rule has been configured.</p>}
            {recurrence.capabilities.configure && <form className="task-recurrence-form" aria-label="Configure recurrence" onSubmit={(event) => { event.preventDefault(); void mutateRecurrence("PUT", "", recurrenceReason, recurrenceFrequency, recurrenceDate); }}><h5>{recurrence.rule ? "Change schedule" : "Configure schedule"}</h5><p>Choose a future first occurrence date in the organization timezone. Missed dates are skipped.</p><label>Frequency<select value={recurrenceFrequency} onChange={(event) => setRecurrenceFrequency(event.target.value as RecurrenceFrequency)}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select></label><label>First occurrence date<input type="date" value={recurrenceDate} onChange={(event) => setRecurrenceDate(event.target.value)} required /></label><label>Reason<input value={recurrenceReason} onChange={(event) => setRecurrenceReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || recurrenceLoading || !recurrenceDate || recurrenceReason.trim().length < 3}>{busy ? "Saving…" : "Save recurrence rule"}</button></form>}
            {(recurrence.capabilities.pause || recurrence.capabilities.resume) && <div className="task-recurrence-control"><h5>{recurrence.rule?.paused ? "Resume schedule" : "Pause schedule"}</h5><label>{recurrence.rule?.paused ? "Reason for resuming" : "Reason for pausing"}<input value={recurrenceActionReason} onChange={(event) => setRecurrenceActionReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="button" disabled={busy || recurrenceActionReason.trim().length < 3} onClick={() => void mutateRecurrence("POST", recurrence.rule?.paused ? "/resume" : "/pause", recurrenceActionReason)}>{busy ? "Saving…" : recurrence.rule?.paused ? "Resume recurrence" : "Pause recurrence"}</button></div>}
            {recurrence.history.length > 0 && <div className="task-recurrence-history"><h5>Schedule history</h5><ol>{recurrence.history.map((entry) => <li key={entry.id}><p><strong>{stateLabel(entry.action)}</strong> · {entry.reason}{entry.occurredAt ? ` · ${new Date(entry.occurredAt).toLocaleString()}` : ""}</p><details><summary>Recorded rule details</summary><dl><div><dt>Before</dt><dd><code>{entry.before === null ? "No prior rule" : JSON.stringify(entry.before)}</code></dd></div><div><dt>After</dt><dd><code>{JSON.stringify(entry.after)}</code></dd></div></dl></details></li>)}</ol></div>}
          </>}
        </section>}
        {(detail.capabilities.requestExtension || (detail.extensions?.length ?? 0) > 0) && <section className="task-extensions" aria-label="Deadline extensions"><h4>Deadline extension requests</h4>
          {detail.capabilities.requestExtension && <form onSubmit={(event) => { event.preventDefault(); void mutate("/extension-requests", { expectedVersion: selected.version, proposedDate: extensionDate, approverAccountId: extensionApproverId, reason: extensionReason.trim() }, "Deadline extension requested."); }}><p>The current primary owner can ask a scoped manager or Owner to approve a later committed date.</p>{extensionApproversLoading && <p role="status">Loading eligible approvers…</p>}{extensionApproversError && <p role="alert">{extensionApproversError} <button type="button" onClick={() => setExtensionApproverRetry((count) => count + 1)}>Retry</button></p>}<label>Proposed new date<input type="date" min={selected.committedDueDate?.slice(0, 10)} value={extensionDate} onChange={(event) => setExtensionDate(event.target.value)} required /></label><label>Approver<select value={extensionApproverId} onChange={(event) => setExtensionApproverId(event.target.value)} required disabled={extensionApproversLoading || !!extensionApproversError || extensionApprovers.length === 0}><option value="">Choose an approver</option>{extensionApprovers.map((item) => <option key={item.accountId} value={item.accountId}>{item.name} · {item.kind === "OWNER" ? "Owner" : "Scoped manager"}</option>)}</select></label><label>Reason<input value={extensionReason} onChange={(event) => setExtensionReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || extensionApproversLoading || !!extensionApproversError || extensionApprovers.length === 0 || !extensionDate || extensionDate <= (selected.committedDueDate?.slice(0, 10) ?? "") || !extensionApproverId || extensionReason.trim().length < 3}>Request extension</button></form>}
          {detail.extensions?.length ? <ol className="task-extension-list">{detail.extensions.map((item) => <li key={item.id}><p><strong>{stateLabel(item.state)}</strong> · {item.previousDate} → {item.proposedDate}</p><p>{item.reason}</p>{item.decision && <p>{stateLabel(item.decision.outcome)}: {item.decision.reason}</p>}{(item.canDecide || item.canWithdraw) && <div><label>{item.canDecide ? "Decision reason" : "Reason for withdrawing request"}<input value={extensionDecisionReason} onChange={(event) => setExtensionDecisionReason(event.target.value)} minLength={3} maxLength={1000} /></label><div className="task-actions">{item.canDecide && <><button type="button" disabled={busy || extensionDecisionReason.trim().length < 3} onClick={() => void mutate(`/extension-requests/${encodeURIComponent(item.id)}/decision`, { outcome: "APPROVED", reason: extensionDecisionReason.trim() }, "Deadline extension approved.")}>Approve extension</button><button type="button" disabled={busy || extensionDecisionReason.trim().length < 3} onClick={() => void mutate(`/extension-requests/${encodeURIComponent(item.id)}/decision`, { outcome: "REJECTED", reason: extensionDecisionReason.trim() }, "Deadline extension rejected.")}>Reject extension</button></>}{item.canWithdraw && <button type="button" disabled={busy || extensionDecisionReason.trim().length < 3} onClick={() => void mutate(`/extension-requests/${encodeURIComponent(item.id)}/withdraw`, { reason: extensionDecisionReason.trim() }, "Deadline extension request withdrawn.")}>Withdraw extension request</button>}</div></div>}</li>)}</ol> : <p>No extension requests yet.</p>}
        </section>}
        {selected.type === "CLOSEOUT" && detail.closeoutApproval && <section className="task-approval" aria-label="Closeout approval"><h4>Closeout approval</h4><p>{detail.closeoutApproval.revokedAt ? `Revoked · ${detail.closeoutApproval.revocationReason ?? "No reason provided"}` : `Approved · ${new Date(detail.closeoutApproval.approvedAt).toLocaleString()}`}</p><p><strong>Approved scope:</strong> {detail.closeoutApproval.workScope}</p>{detail.capabilities.revokeCloseout && !detail.closeoutApproval.revokedAt && <><label>Revocation reason<input aria-label="Revocation reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} /></label><button type="button" disabled={busy || reason.trim().length < 3} onClick={revokeCloseout}>Revoke closeout approval</button></>}</section>}
        {(detail.capabilities.reassign || detail.capabilities.transition) && <label>Reason for change<input aria-label="Reason for change" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} /></label>}
        {detail.capabilities.wait && selected.status === "IN_PROGRESS" && !selected.requiresReassignment && <form className="task-wait-form" aria-label="Wait on task" onSubmit={(event) => { event.preventDefault(); void mutate("/wait", { expectedVersion: selected.version, reason: waitReason.trim(), delayCause: delayCause.trim(), ...(responsibleParty.trim() ? { responsibleParty: responsibleParty.trim() } : {}) }, "Task moved to waiting."); }}><h4>Wait on this task</h4><label>Reason for waiting<input value={waitReason} onChange={(event) => setWaitReason(event.target.value)} minLength={3} maxLength={1000} required /></label><label>Delay cause<input value={delayCause} onChange={(event) => setDelayCause(event.target.value)} minLength={3} maxLength={1000} required /></label><label>Known responsible party (optional)<input list="task-responsible-parties" value={responsibleParty} onChange={(event) => setResponsibleParty(event.target.value)} maxLength={160} /><datalist id="task-responsible-parties">{setup?.employees.map((employee) => <option key={employee.id} value={employee.name} />)}</datalist></label><button type="submit" disabled={busy || waitReason.trim().length < 3 || delayCause.trim().length < 3 || responsibleParty.trim().length > 160}>{busy ? "Saving…" : "Move to waiting"}</button></form>}
        {detail.capabilities.resume && selected.status === "WAITING" && !selected.requiresReassignment && <form className="task-wait-form" aria-label="Resume task" onSubmit={(event) => { event.preventDefault(); void mutate("/resume", { expectedVersion: selected.version, reason: resumeReason.trim() }, "Task resumed."); }}><h4>Resume work</h4><p>The task will return to In progress.</p><label>Reason for resuming<input value={resumeReason} onChange={(event) => setResumeReason(event.target.value)} minLength={3} maxLength={1000} required /></label><button type="submit" disabled={busy || resumeReason.trim().length < 3}>{busy ? "Saving…" : "Resume task"}</button></form>}
        {detail.capabilities.reassign && setup?.canAssign && <div className="task-change-owner"><h4>Reassign owner</h4><label>New owner<select aria-label="New owner" value={reassignId} onChange={(event) => setReassignId(event.target.value)}><option value="">Choose an employee</option>{setup.employees.filter((employee) => employee.id !== selected.primaryOwnerEmployeeId).map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><button type="button" disabled={!reassignId || busy || reason.trim().length < 3} onClick={() => void mutate("/reassign", { newOwnerEmployeeId: reassignId, expectedVersion: selected.version, reason: reason.trim() }, "Task owner reassigned.")}>Reassign</button></div>}
        {detail.capabilities.transition && !selected.requiresReassignment && <div className="task-actions">{selected.status === "NOT_STARTED" && (detail.dependencies?.hasUnfinished ? <>{!confirmEarlyStart ? <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => setConfirmEarlyStart(true)}>Review early start</button> : <><p className="task-dependency-warning">Linked predecessor work is unfinished. Your start will be recorded as an early start.</p><button type="button" disabled={busy || reason.trim().length < 3} onClick={() => transition("IN_PROGRESS", true)}>Start anyway</button><button type="button" onClick={() => setConfirmEarlyStart(false)}>Cancel</button></>}</> : <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => transition("IN_PROGRESS")}>Start task</button>)}{selected.status === "IN_PROGRESS" && <button type="button" disabled={busy || reason.trim().length < 3 || selected.reviewRequirement !== "NONE"} title={selected.reviewRequirement !== "NONE" ? "Required review workflow is not available yet." : undefined} onClick={() => transition("COMPLETED")}>Complete task</button>}</div>}
        {(detail.history.statusChanges.length > 0 || detail.history.ownerChanges.length > 0 || (detail.history.committedDateChanges?.length ?? 0) > 0) && <><h4>Task history</h4><ol className="task-history">{[...detail.history.statusChanges.map((event) => ({ ...event, kind: "status" as const })), ...detail.history.ownerChanges.map((event) => ({ ...event, kind: "owner" as const })), ...(detail.history.committedDateChanges ?? []).map((event) => ({ ...event, kind: "committed-date" as const }))].sort((a, b) => (a.occurredAt ?? "").localeCompare(b.occurredAt ?? "")).map((event, index) => <li key={event.id ?? index}><span>{event.kind === "committed-date" ? `Committed due date ${event.oldDate ? `changed from ${event.oldDate.slice(0, 10)}` : "set"} to ${event.newDate.slice(0, 10)}: ${event.reason}` : event.reason ?? (event.toStatus ? `${stateLabel(event.fromStatus ?? "Created")} → ${stateLabel(event.toStatus)}` : event.kind === "owner" ? `Owner reassigned: ${setup?.employees.find((employee) => employee.id === event.oldOwnerEmployeeId)?.name ?? "Previous owner"} → ${setup?.employees.find((employee) => employee.id === event.newOwnerEmployeeId)?.name ?? "New owner"}` : event.action ?? "Task updated")}{event.occurredAt ? ` · ${new Date(event.occurredAt).toLocaleString()}` : ""}</span>{"delayCause" in event && event.delayCause && <span className="task-history-waiting">Delay cause: {event.delayCause}{event.responsibleParty ? ` · Responsible party: ${event.responsibleParty}` : ""}</span>}</li>)}</ol></>}
      </> : <p className="task-empty">Select a task to see its details.</p>}</article>
    </div>}
  </section>;
}
