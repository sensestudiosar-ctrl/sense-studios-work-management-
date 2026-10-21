import { TASK_DESCRIPTION_MAX_LENGTH, type TaskCreationOptions } from "@sense/contracts";

export type TaskComposerDraft = {
  title: string; type: string; priority: string; targetDate: string; description: string; projectId: string;
  ownerId: string; startDate: string; estimatedHours: string; collaboratorIds: string[]; collaboratorHours: Record<string, string>;
  planItemId: string; tagsText: string; checklistText: string; reason: string; assignTo: boolean; reviewRequirement: string;
};
export function taskDraftError(draft: TaskComposerDraft): string | undefined {
  if (draft.title.trim().length < 2 || draft.title.trim().length > 160) return "Task name must be between 2 and 160 characters.";
  const validDate = (value: string): boolean => { const date = new Date(`${value}T00:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; };
  if (!validDate(draft.targetDate)) return "Choose a valid Target date.";
  if (draft.description.trim().length > TASK_DESCRIPTION_MAX_LENGTH) return `Description must be ${TASK_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  if (draft.startDate && (!validDate(draft.startDate) || draft.startDate > draft.targetDate)) return "Start date must be valid and on or before the Target date.";
  if ([draft.estimatedHours, ...draft.collaboratorIds.map(id => draft.collaboratorHours[id] ?? "")].some(value => value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100_000))) return "Estimated hours must be a number between 0 and 100,000.";
  const tags = draft.tagsText.split(",").map(value => value.trim()).filter(Boolean);
  if (tags.length > 10 || tags.some(value => value.length > 30) || new Set(tags).size !== tags.length) return "Use up to 10 distinct tags, each 30 characters or fewer.";
  const checklist = draft.checklistText.split("\n").map(value => value.trim()).filter(Boolean).map(value => value.replace(/^\[(?:x| )\]\s*/i, ""));
  if (checklist.length > 10 || checklist.some(value => !value.length || value.length > 120)) return "Use up to 10 checklist items, each between 1 and 120 characters.";
  if (draft.reason.trim().length < 3 || draft.reason.trim().length > 1000) return "Reason must be between 3 and 1,000 characters.";
  if (draft.type === "NON_PROJECT" && draft.projectId || ["PROJECT", "CORRECTION", "SITE"].includes(draft.type) && !draft.projectId) return "Choose a project for this task type, or use Non project for work without a project.";
  if (draft.collaboratorIds.length > 30 || new Set(draft.collaboratorIds).size !== draft.collaboratorIds.length) return "Choose up to 30 distinct collaborators.";
  return undefined;
}

export function taskCreateBody(d: TaskComposerDraft, options: TaskCreationOptions): Record<string, unknown> {
  return { title: d.title.trim(), type: d.type, priority: d.priority, targetDate: d.targetDate,
    ...(d.description.trim() ? { description: d.description.trim() } : {}), ...(d.startDate ? { startDate: d.startDate } : {}),
    ...(d.estimatedHours ? { estimatedHours: Number(d.estimatedHours) } : {}), ...(d.projectId ? { projectId: d.projectId } : {}),
    ...(d.planItemId ? { planItemId: d.planItemId } : {}),
    ...(d.tagsText.trim() ? { tags: d.tagsText.split(",").map(value => value.trim()).filter(Boolean) } : {}),
    ...(d.checklistText.trim() ? { checklist: d.checklistText.split("\n").map(value => value.trim()).filter(Boolean).map(value => ({ label: value.replace(/^\[(?:x| )\]\s*/i, ""), checked: /^\[x\]\s*/i.test(value) })) } : {}),
    ...((d.assignTo || options.actorEmployeeId === null) && options.canAssign && d.ownerId ? { ownerEmployeeId: d.ownerId } : {}),
    ...(d.collaboratorIds.length ? { collaborators: d.collaboratorIds.map(employeeId => ({ employeeId, ...(d.collaboratorHours[employeeId] ? { estimatedHours: Number(d.collaboratorHours[employeeId]) } : {}) })) } : {}),
    ...(d.reviewRequirement !== "NONE" ? { reviewRequirement: d.reviewRequirement } : {}), reason: d.reason.trim() };
}

type Props = {
  draft: TaskComposerDraft; onChange: (patch: Partial<TaskComposerDraft>) => void;
  projects: Array<{ id: string; title: string; status: string }>;
  planItems: Array<{ id: string; projectId: string; kind: string; label: string }>;
  options: TaskCreationOptions | undefined; optionsError: string | undefined; retryOptions: () => void;
  compact: boolean; busy: boolean; subtask?: boolean; fixedProject?: { id: string; title: string };
};
const label = (value: string): string => value.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());

/** Shared fields for ordinary and child tasks. Domain commands stay with TaskWorkspace. */
export function TaskComposerFields({ draft: d, onChange: change, projects, planItems, options, optionsError, retryOptions, compact, busy, subtask = false, fixedProject }: Props): React.JSX.Element {
  const explicit = options?.actorEmployeeId === null || !!options?.canAssign && d.assignTo;
  const chooseProject = (projectId: string): void => change({ projectId, planItemId: "", ownerId: "", collaboratorIds: [], collaboratorHours: {}, reviewRequirement: projectId ? d.reviewRequirement : "NONE",
    type: projectId && d.type === "NON_PROJECT" ? "PROJECT" : !projectId && ["PROJECT", "CORRECTION", "SITE"].includes(d.type) ? "NON_PROJECT" : d.type });
  const planning = <>
    <label>Stage or milestone (optional)<select aria-label={subtask ? "Subtask stage or milestone" : "Stage or milestone"} value={d.planItemId} onChange={event => change({ planItemId: event.target.value })} disabled={!d.projectId}><option value="">No plan item</option>{planItems.filter(item => item.projectId === d.projectId).map(item => <option key={item.id} value={item.id}>{item.kind === "STAGE" ? "Stage" : "Milestone"} · {item.label}</option>)}</select></label>
    <label>Description (optional)<textarea value={d.description} onChange={event => change({ description: event.target.value })} maxLength={TASK_DESCRIPTION_MAX_LENGTH} rows={3} /></label>
    <label>Tags (optional, comma separated)<input aria-label={subtask ? "Subtask tags" : "Tags"} value={d.tagsText} onChange={event => change({ tagsText: event.target.value })} placeholder="Concept, client feedback" /></label>
    <label>Checklist (optional, one item per line)<textarea aria-label={subtask ? "Subtask checklist" : "Checklist"} value={d.checklistText} onChange={event => change({ checklistText: event.target.value })} placeholder={"[ ] Confirm brief\n[x] Collect references"} rows={3} /></label>
    <div className="task-form-grid"><label>Start date (optional)<input type="date" value={d.startDate} onChange={event => change({ startDate: event.target.value })} /></label><label>Estimated hours (optional)<input type="number" min="0" max="100000" step="0.25" value={d.estimatedHours} onChange={event => change({ estimatedHours: event.target.value })} /></label></div>
    {d.projectId && <><label>Review requirement<select value={d.reviewRequirement} onChange={event => change({ reviewRequirement: event.target.value })}><option value="NONE">No review required</option><option value="INTERNAL">Internal review</option><option value="CLIENT">Client review</option><option value="BOTH">Internal and client review</option></select></label><p className="task-form-note">Reviewer selection, evidence and submission use the task’s review workspace. Required reviews must finish before task completion.</p></>}
  </>;
  return <fieldset disabled={busy} className="task-composer-lock"><legend className="task-sr-only">Task details</legend>
    <label>Task name<input value={d.title} onChange={event => change({ title: event.target.value })} minLength={2} maxLength={160} required /></label>
    <div className="task-form-grid"><label>Type<select value={d.type} onChange={event => change({ type: event.target.value })}>{["PROJECT", "NON_PROJECT", "RECURRING", "CORRECTION", "SITE", "TRAINING_PRACTICAL"].map(type => <option key={type} value={type}>{label(type)}</option>)}</select></label><label>Priority<select value={d.priority} onChange={event => change({ priority: event.target.value })}>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label><label>Target date<input aria-label="Target date" type="date" value={d.targetDate} onChange={event => change({ targetDate: event.target.value })} required /></label></div>
    {fixedProject ? <label>Project<input aria-label={subtask ? "Parent project" : "Task project"} readOnly value={fixedProject.title} /></label> : <label>Project (optional)<select value={d.projectId} onChange={event => chooseProject(event.target.value)}><option value="">No project</option>{projects.filter(project => project.status === "DRAFT" || project.status === "ACTIVE").map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>}
    {optionsError ? <div role="alert"><p>{optionsError}</p><button type="button" onClick={retryOptions} disabled={busy}>Retry participants</button></div> : !options ? <p role="status">Loading eligible task participants…</p> : !options.canCreate ? <p role="status">No eligible primary owner is available in this context. Review employee membership and project assignments.</p> : <>
      <fieldset className="task-assignment"><legend>Ownership</legend>{options.canAssign && options.actorEmployeeId && <label className="task-inline"><input type="checkbox" checked={d.assignTo} onChange={event => change({ assignTo: event.target.checked, ownerId: "", collaboratorIds: [], collaboratorHours: {} })} /> Assign to an employee</label>}{explicit ? <label>Primary owner<select value={d.ownerId} onChange={event => change({ ownerId: event.target.value, collaboratorIds: d.collaboratorIds.filter(id => id !== event.target.value) })} required><option value="">Choose an employee</option>{options.owners.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label> : <p>This will be created as your self-task.</p>}</fieldset>
      {options.canAssign && <fieldset className="task-assignment"><legend>Collaborators (optional)</legend>{options.collaborators.filter(employee => employee.id !== (explicit ? d.ownerId : options.actorEmployeeId)).map(employee => <div className="task-collaborator-choice" key={employee.id}><label className="task-inline"><input type="checkbox" checked={d.collaboratorIds.includes(employee.id)} onChange={event => change({ collaboratorIds: event.target.checked ? [...d.collaboratorIds, employee.id] : d.collaboratorIds.filter(id => id !== employee.id) })} /> {employee.name}</label>{d.collaboratorIds.includes(employee.id) && <label>Estimated hours<input aria-label={`${employee.name} estimated hours`} type="number" min="0" max="100000" step="0.25" value={d.collaboratorHours[employee.id] ?? ""} onChange={event => change({ collaboratorHours: { ...d.collaboratorHours, [employee.id]: event.target.value } })} /></label>}</div>)}</fieldset>}
    </>}
    {compact ? <details className="task-optional-planning"><summary>Optional planning</summary>{planning}</details> : planning}
    <label>Reason<input value={d.reason} onChange={event => change({ reason: event.target.value })} minLength={3} maxLength={1000} required /></label>
  </fieldset>;
}
