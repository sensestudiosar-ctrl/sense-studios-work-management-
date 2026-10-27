import { TASK_DESCRIPTION_MAX_LENGTH, type TaskCreationOptions } from "@sense/contracts";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import "./task-composer-v15.css";

export type TaskComposerDraft = {
  title: string; type: string; priority: string; targetDate: string; description: string; projectId: string;
  ownerId: string; startDate: string; estimatedHours: string; collaboratorIds: string[]; collaboratorHours: Record<string, string>;
  planItemId: string; tagsText: string; checklistText: string; reason: string; assignTo: boolean; reviewRequirement: string;
};
export function taskDraftError(draft: TaskComposerDraft): string | undefined {
  return Object.values(taskDraftErrors(draft))[0];
}

/** Live footer readiness line (demo "N required details remaining"): counts only the
    required essentials, so a draft needing just a Target date reads "1 required detail remaining". */
export function taskDraftReadiness(draft: TaskComposerDraft, options: TaskCreationOptions | undefined): string {
  const errors = taskDraftErrors(draft);
  const explicit = options ? options.actorEmployeeId === null || options.canAssign && draft.assignTo : false;
  const ownerMissing = explicit && options?.canCreate === true && !options.owners.some(person => person.id === draft.ownerId);
  const missing = [errors.title, errors.targetDate, errors.reason, errors.projectId, ownerMissing ? "owner" : undefined].filter(Boolean).length;
  return missing === 0 ? "Ready to create" : `${missing} required ${missing === 1 ? "detail" : "details"} remaining`;
}

/** One validation pass supplies both the command guard and field-level errors. */
export function taskDraftErrors(draft: TaskComposerDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (draft.title.trim().length < 2 || draft.title.trim().length > 160) errors.title = "Task name must be between 2 and 160 characters.";
  const validDate = (value: string): boolean => { const date = new Date(`${value}T00:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; };
  if (!validDate(draft.targetDate)) errors.targetDate = "Choose a valid Target date.";
  if (draft.description.trim().length > TASK_DESCRIPTION_MAX_LENGTH) errors.description = `Task brief must be ${TASK_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
  if (draft.startDate && (!validDate(draft.startDate) || draft.startDate > draft.targetDate)) errors.startDate = "Start date must be valid and on or before the Target date.";
  const invalidHours = (value: string): boolean => value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100_000);
  if (invalidHours(draft.estimatedHours)) errors.estimatedHours = "Estimated hours must be a number between 0 and 100,000.";
  if (draft.collaboratorIds.some(id => invalidHours(draft.collaboratorHours[id] ?? ""))) errors.collaboratorIds = "Collaborator estimated hours must be a number between 0 and 100,000.";
  const tags = draft.tagsText.split(",").map(value => value.trim()).filter(Boolean);
  if (tags.length > 10 || tags.some(value => value.length > 30) || new Set(tags).size !== tags.length) errors.tagsText = "Use up to 10 distinct tags, each 30 characters or fewer.";
  const checklist = draft.checklistText.split("\n").map(value => value.trim()).filter(Boolean).map(value => value.replace(/^\[(?:x| )\]\s*/i, ""));
  if (checklist.length > 10 || checklist.some(value => !value.length || value.length > 120)) errors.checklistText = "Use up to 10 checklist items, each between 1 and 120 characters.";
  if (draft.reason.trim().length < 3 || draft.reason.trim().length > 1000) errors.reason = "Reason must be between 3 and 1,000 characters.";
  if (draft.type === "NON_PROJECT" && draft.projectId) errors.type = "Non project tasks cannot use a project. Choose a project task type for this context.";
  if (["PROJECT", "CORRECTION", "SITE"].includes(draft.type) && !draft.projectId) errors.projectId = "Choose a project for this task type, or use Non project for work without a project.";
  if (draft.collaboratorIds.length > 30 || new Set(draft.collaboratorIds).size !== draft.collaboratorIds.length) errors.collaboratorIds = "Choose up to 30 distinct collaborators.";
  return errors;
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
    ...(d.reviewRequirement !== "NONE" ? { reviewRequirement: d.reviewRequirement === "CLIENT" ? "BOTH" : d.reviewRequirement } : {}), reason: d.reason.trim() };
}

type Person = { id: string; name: string; homeBranchId: string };
type Props = {
  draft: TaskComposerDraft; onChange: (patch: Partial<TaskComposerDraft>) => void;
  projects: Array<{ id: string; title: string; status: string }>;
  planItems: Array<{ id: string; projectId: string; kind: string; label: string }>;
  options: TaskCreationOptions | undefined; optionsError: string | undefined; retryOptions: () => void;
  compact: boolean; busy: boolean; subtask?: boolean; fixedProject?: { id: string; title: string }; validationAttempt?: number;
};
const label = (value: string): string => value.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
const PRIORITIES: string[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TASK_TYPES = ["PROJECT", "NON_PROJECT", "RECURRING", "CORRECTION", "SITE", "TRAINING_PRACTICAL"] as const;
const REVIEW_OPTIONS = [
  { value: "NONE", label: "No review", help: "No review route is recorded." },
  { value: "INTERNAL", label: "Internal", help: "Internal approval before completion." },
  { value: "BOTH", label: "Internal + Client", help: "Internal approval precedes client review." },
] as const;
const initials = (value: string): string => {
  const clean = value.trim().split(/[\s._@+-]+/).filter(Boolean);
  if (!clean.length) return "?";
  return clean.length === 1 ? clean[0]!.slice(0, 2).toUpperCase() : `${clean[0]![0]!}${clean[clean.length - 1]![0]!}`.toUpperCase();
};

/**
 * Shared fields for ordinary and child tasks. Domain commands stay with TaskWorkspace.
 * When `compact` is true the optional planning and collaborator sections are hidden so
 * the form stays fast for non-owner variants (EMPLOYEE/SITE).
 *
 * V15 layout (docs/v1-demo "Task creation refinement" target): an editing canvas
 * on the left — Task name, Description, Why needed, optional planning disclosure,
 * post-creation discussion/files affordances — and a bounded
 * "Assignment & timing" card on the right (context header + status, Type,
 * Project, Primary owner, Target & Start dates, Priority, Assign to,
 * Review requirement, Tags, More task settings). Mobile stacks the same two
 * zones in a single column.
 */
/** Crisp 14px stroke icons replace the legacy text glyphs so property rows
    read cleanly at both column widths. */
type IconName = "type" | "project" | "owner" | "target" | "calendar" | "priority";
const ROW_ICONS: Record<IconName, React.JSX.Element> = {
  type: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h6" /></svg>,
  project: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>,
  owner: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 19.5c.9-3.2 3.4-5 6.5-5s5.6 1.8 6.5 5" /></svg>,
  target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3.2 2.2" /></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3.5v4M15 3.5v4" /></svg>,
  priority: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z" /></svg>,
};
const RowIcon = ({ name }: { name: IconName }) => (
  <span className="task-row-icon" aria-hidden="true">{ROW_ICONS[name]}</span>
);

export function TaskComposerFields({ draft: d, onChange: change, projects, planItems, options, optionsError, retryOptions, busy, subtask = false, fixedProject, compact = false, validationAttempt = 0 }: Props): React.JSX.Element {
  const prefix = useId();
  const summary = useRef<HTMLDivElement>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleMenuOpen, setPeopleMenuOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const explicit = options?.actorEmployeeId === null || !!options?.canAssign && d.assignTo;
  const errors = taskDraftErrors(d);
  if (options?.canCreate && explicit && !options.owners.some(person => person.id === d.ownerId)) errors.ownerId = "Choose an eligible primary owner.";
  const visible = (field: string): string | undefined => validationAttempt > 0 || touched[field] ? errors[field] : undefined;
  const attrs = (field: string) => ({ id: `${prefix}-${field}`, name: field, "aria-invalid": visible(field) ? true : undefined, "aria-describedby": visible(field) ? `${prefix}-${field}-error` : undefined });
  const error = (field: string) => visible(field) ? <p className="task-field-error" id={`${prefix}-${field}-error`}>{visible(field)}</p> : null;
  useEffect(() => { if (validationAttempt > 0) summary.current?.focus(); }, [validationAttempt]);
  const chooseProject = (projectId: string): void => {
    setPeopleMenuOpen(false); setPeopleSearch("");
    change({ projectId, planItemId: "", ownerId: "", collaboratorIds: [], collaboratorHours: {}, reviewRequirement: projectId ? d.reviewRequirement : "NONE",
      type: projectId && d.type === "NON_PROJECT" ? "PROJECT" : !projectId && ["PROJECT", "CORRECTION", "SITE"].includes(d.type) ? "NON_PROJECT" : d.type });
  };
  const projectTypes = ["PROJECT", "CORRECTION", "SITE"];
  const todayISO = new Date().toISOString().slice(0, 10);
  const addTag = (): void => {
    const value = tagDraft.trim();
    if (!value) return;
    const tags = [...d.tagsText.split(",").map(item => item.trim()).filter(Boolean), value];
    if (new Set(tags.map(item => item.toLowerCase())).size !== tags.length) { setTouched(current => ({ ...current, tagsText: true })); setTagDraft(""); return; }
    change({ tagsText: tags.join(", ") }); setTagDraft("");
  };
  const removeTag = (tag: string): void => {
    const tags = d.tagsText.split(",").map(item => item.trim()).filter(Boolean).filter(item => item !== tag);
    change({ tagsText: tags.join(", ") });
  };
  const tags = d.tagsText.split(",").map(item => item.trim()).filter(Boolean);

  // Ordered people: first avatar = primary owner (ownerId), remaining = collaborators.
  const ownerPerson: Person | undefined = options?.owners.find(person => person.id === d.ownerId);
  const orderedPeople: Array<{ person: Person; role: "owner" | "collaborator"; key: string }> = [
    ...(ownerPerson ? [{ person: ownerPerson, role: "owner" as const, key: "owner" }] : []),
    ...d.collaboratorIds.map(id => options?.collaborators.find(person => person.id === id)).filter((person): person is Person => !!person)
      .map(person => ({ person, role: "collaborator" as const, key: person.id })),
  ];
  const eligibleAdd = options?.collaborators.filter(person => person.id !== (explicit ? d.ownerId : options.actorEmployeeId ?? "")) ?? [];
  const searchedPeople = peopleSearch.trim()
    ? [...options?.owners ?? [], ...eligibleAdd].filter(person => !d.collaboratorIds.includes(person.id) && person.name.toLowerCase().includes(peopleSearch.trim().toLowerCase()))
    : eligibleAdd.filter(person => !d.collaboratorIds.includes(person.id)).slice(0, 8);
  const addCollaborator = (id: string): void => {
    if (d.collaboratorIds.length >= 30 || d.collaboratorIds.includes(id) || id === (explicit ? d.ownerId : options?.actorEmployeeId ?? "")) return;
    change({ collaboratorIds: [...d.collaboratorIds, id] });
  };
  const removeCollaborator = (id: string): void => {
    change({ collaboratorIds: d.collaboratorIds.filter(value => value !== id), collaboratorHours: Object.fromEntries(Object.entries(d.collaboratorHours).filter(([key]) => key !== id)) });
  };
  const reviewValue = d.reviewRequirement === "CLIENT" ? "BOTH" : d.reviewRequirement;
  const dateField = (field: "targetDate" | "startDate", text: string) => <label className="task-calendar-field">
    <span>{text}{field === "targetDate" ? <span className="task-field__req" aria-hidden="true">*</span> : <span className="task-field__optional">· optional</span>}</span>
    <span className={`task-calendar-control${d[field] ? " has-value" : ""}`}>
      <input {...attrs(field)} type="date" aria-label={text} required={field === "targetDate"} value={d[field]} disabled={busy}
        min={field === "targetDate" ? todayISO : undefined}
        title={d[field] ? `${text}: ${d[field].split("-").reverse().join("/")}` : `Choose ${text.toLowerCase()}`}
        onChange={event => change({ [field]: event.target.value })}
        onClick={event => { try { event.currentTarget.showPicker?.(); } catch { /* The native date field remains keyboard-editable if a browser blocks programmatic opening. */ } }} />
      <RowIcon name="calendar" />
    </span>
  </label>;

  // Left canvas: directly edited fields in V15 order. Subtask and checklist rows are
  // visual companions — subtask drafts are staged separately by TaskWorkspace after
  // parent success, so they are shown here as a read-only count when editing a subtask.
  const canvas = <div className="task-composer__brief" aria-label="Task details">
    <label className="task-field task-field--title"><span className="task-field__label">Task name <span className="task-field__req" aria-hidden="true">*</span></span>
      <input {...attrs("title")} className="task-field--title-input" aria-label="Task name" value={d.title} onChange={event => change({ title: event.target.value })} minLength={2} maxLength={160} required placeholder="e.g. Revise the bedroom lighting plan" />
      {error("title")}
    </label>
    <label className="task-field"><span className="task-field__label">Task brief <span className="task-field__optional">· optional</span></span>
      <textarea {...attrs("description")} aria-label="Description (optional)" value={d.description} onChange={event => change({ description: event.target.value })} maxLength={TASK_DESCRIPTION_MAX_LENGTH} rows={3} placeholder="What needs to be delivered? Add scope, context and the expected result." />
      <small className="task-field__helper">A useful brief helps the next person start without another conversation.</small>
      {error("description")}
    </label>
    <label className="task-field"><span className="task-field__label">Why is this task needed? <span className="task-field__req" aria-hidden="true">*</span></span>
      <input {...attrs("reason")} aria-label="Reason" value={d.reason} onChange={event => change({ reason: event.target.value })} minLength={3} maxLength={1000} required placeholder="e.g. Incorporate the agreed client feedback" />
      <small className="task-field__helper">Kept with the task's creation history.</small>
      {error("reason")}
    </label>
    {!compact && <details className="task-optional-planning">
      <summary>Optional planning</summary>
      <label>Stage or milestone (optional)<select aria-label={subtask ? "Subtask stage or milestone" : "Stage or milestone"} value={d.planItemId} onChange={event => change({ planItemId: event.target.value })} disabled={!d.projectId}><option value="">No plan item</option>{planItems.filter(item => item.projectId === d.projectId).map(item => <option key={item.id} value={item.id}>{item.kind === "STAGE" ? "Stage" : "Milestone"} · {item.label}</option>)}</select></label>
      <label>Checklist (optional, one item per line)<textarea {...attrs("checklistText")} aria-label={subtask ? "Subtask checklist" : "Checklist"} value={d.checklistText} onChange={event => change({ checklistText: event.target.value })} placeholder={"[ ] Confirm brief\n[x] Collect references"} rows={3} /></label>{error("checklistText")}
      <label>Estimated hours (optional)<input {...attrs("estimatedHours")} type="number" min="0" max="100000" step="0.25" value={d.estimatedHours} onChange={event => change({ estimatedHours: event.target.value })} /><span className="task-effort-unit" aria-hidden="true">h</span>{error("estimatedHours")}</label>
    </details>}
    <div className="task-post-creation" aria-label="After creation">
      <p className="task-post-creation__item"><span aria-hidden="true">◇</span> Discussion<span className="task-post-creation__note">Comment after creation</span></p>
      <p className="task-post-creation__item"><span aria-hidden="true">◇</span> Files<span className="task-post-creation__note">Attach after creation</span></p>
    </div>
  </div>;

  const projectField = fixedProject
    ? <input {...attrs("projectId")} aria-label={subtask ? "Parent project" : "Project"} readOnly value={fixedProject.title} disabled />
    : <select {...attrs("projectId")} aria-label={subtask ? "Subtask project" : "Project"} required={projectTypes.includes(d.type)} value={d.projectId} onChange={event => chooseProject(event.target.value)} disabled={busy}>
        <option value="">{projectTypes.includes(d.type) ? "Choose a project" : "No project"}</option>
        {projects.filter(project => project.status === "DRAFT" || project.status === "ACTIVE").map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
      </select>;

  const ownerValue = options?.canAssign && explicit
    ? <select {...attrs("ownerId")} aria-label="Primary owner" value={d.ownerId}
        onChange={event => change({ ownerId: event.target.value, collaboratorIds: d.collaboratorIds.filter(id => id !== event.target.value) })}
        required disabled={busy || !options.canCreate}>
        <option value="">Choose an employee</option>
        {options.owners.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
      </select>
    : <p className="task-owner-summary" role="status">{options?.actorEmployeeId && !explicit ? "Assigned to you." : "Choose an owner"}</p>;

  const assignSection = options ? (
    <div className="task-composer__assign">
      <p className="task-composer__section-title">Assign to{d.collaboratorIds.length > 0 && <span className="task-field__optional">· {d.collaboratorIds.length} selected</span>}</p>
      {optionsError
        ? <div className="task-options-retry" role="alert"><p>{optionsError}</p><button type="button" onClick={retryOptions} disabled={busy}>Retry participants</button></div>
        : <div className="task-avatar-strip" aria-label="Assigned people">
            {orderedPeople.map((entry) => (
              <button type="button" key={entry.key}
                className={`task-avatar${entry.role === "owner" ? " task-avatar--main" : ""}`}
                aria-label={entry.role === "owner" ? `Main assignee: ${entry.person.name}` : `${entry.person.name}, collaborator. Press to manage.`}
                title={entry.role === "owner" ? `Main: ${entry.person.name}` : entry.person.name}
                onClick={() => { if (entry.role !== "owner") setPeopleMenuOpen(open => !open); }}>
                <span className="task-avatar__initials" aria-hidden="true">{initials(entry.person.name)}</span>
                {entry.role === "owner" && <span className="task-avatar__badge" aria-hidden="true">Main</span>}
              </button>
            ))}
            {explicit ? (
              <button type="button" className="task-avatar-add" aria-label={peopleMenuOpen ? "Close people search" : "Add people"} aria-expanded={peopleMenuOpen} onClick={() => setPeopleMenuOpen(open => !open)}>+</button>
            ) : <p className="task-avatar-self" role="status">{options?.actorEmployeeId ? "Assigned to you." : "Choose an owner"}</p>}
          </div>}
      {peopleMenuOpen && explicit && <div className="task-people-menu" role="listbox" aria-label="Find collaborators">
        <label className="task-people-menu__search"><input type="search" aria-label="Search eligible people" placeholder="Find a collaborator..." value={peopleSearch} onChange={event => setPeopleSearch(event.target.value)} autoFocus /></label>
        {searchedPeople.length ? searchedPeople.map(person => (
          <div key={person.id} className="task-people-menu__row" role="option" aria-selected={d.collaboratorIds.includes(person.id)}>
            <span className="task-avatar__initials task-avatar__initials--sm" aria-hidden="true">{initials(person.name)}</span>
            <span className="task-people-menu__name">{person.name}</span>
            <button type="button" className="task-people-menu__add" aria-label={`Add ${person.name}`} onClick={() => addCollaborator(person.id)}>+</button>
          </div>
        )) : <p className="task-people-menu__empty">No eligible people match this search.</p>}
      </div>}
      {d.collaboratorIds.length > 0 && <ul className="task-collaborator-chips" aria-label="Selected collaborators">
        {d.collaboratorIds.map(id => {
          const person = options?.collaborators.find(value => value.id === id);
          return <li key={id} className="task-collaborator-chip">
            <span className="task-avatar__initials task-avatar__initials--sm" aria-hidden="true">{initials(person?.name ?? "?")}</span>
            <span className="task-collaborator-chip__name">{person?.name ?? "Unavailable"}</span>
            <button type="button" className="task-collaborator-chip__remove" aria-label={`Remove ${person?.name ?? "collaborator"}`} onClick={() => removeCollaborator(id)}>×</button>
          </li>;
        })}
      </ul>}
      {error("ownerId")}
      {error("collaboratorIds")}
    </div>
  ) : <p role="status" className="task-options-loading" aria-label="Loading eligible task participants…">Loading eligible task participants…</p>;

  const reviewSection = <div className="task-composer__review">
    <p className="task-composer__section-title">Reviews</p>
    {d.projectId ? <div className="task-review-cards" role="radiogroup" aria-label="Review routing">
      {REVIEW_OPTIONS.map(option => (
        <button key={option.value} type="button" role="radio" aria-checked={reviewValue === option.value}
          className={`task-review-card${reviewValue === option.value ? " task-review-card--selected" : ""}`}
          disabled={busy}
          onClick={() => change({ reviewRequirement: option.value })}>
          <span className="task-review-card__label">{option.label}</span>
        </button>
      ))}
      <p className="task-review-note" role="note">{REVIEW_OPTIONS.find(option => option.value === reviewValue)?.help}</p>
      {reviewValue !== "NONE" && <p className="task-review-note">Before submitting work, an authorized person appoints an independent reviewer in Internal reviews.</p>}
      {reviewValue === "BOTH" && <div className="task-review-sequence" aria-label="Review sequence">
        <span className="task-review-node">Internal</span><span aria-hidden="true">→</span><span className="task-review-node">Client</span>
      </div>}
      {/* Legacy checkbox contract: existing tests and API normalise CLIENT → BOTH.
          Hidden visually (sr-only) but kept for the strict payload mapping. */}
      <label className="task-review-legacy task-sr-only"><input type="checkbox" checked={["INTERNAL", "BOTH"].includes(reviewValue)} disabled={busy || reviewValue === "BOTH"} onChange={event => change({ reviewRequirement: event.target.checked ? "INTERNAL" : "NONE" })} aria-label="Internal review required" /></label>
      <label className="task-review-legacy task-sr-only"><input type="checkbox" checked={reviewValue === "BOTH"} disabled={busy} onChange={event => change({ reviewRequirement: event.target.checked ? "BOTH" : "INTERNAL" })} aria-label="Client review required" /></label>
    </div>
      : <div className="task-info-strip"><span className="task-info-strip__body"><b>Review routing needs a project.</b>Client and internal review routes require a project context with publishing authority.</span></div>}
  </div>;

  const tagsSection = <div className="task-composer__tags">
    <p className="task-composer__section-title">Tags <span className="task-field__optional">Optional · max 10</span></p>
    <div className="task-tag-area">
      {tags.map(tag => (
        <span key={tag} className="task-tag-chip"><span>{tag}</span><button type="button" aria-label={`Remove tag ${tag}`} onClick={() => removeTag(tag)}>×</button></span>
      ))}
      <input className="task-tag-input" aria-label="Add tag" placeholder="+ Add tag" value={tagDraft}
        onChange={event => setTagDraft(event.target.value)}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }}
        onBlur={addTag} />
    </div>
    {error("tagsText")}
  </div>;

  const planningSection = <div className="task-composer__planning">
    <button type="button" className="task-accordion-toggle" aria-expanded={planningOpen} onClick={() => setPlanningOpen(open => !open)}>
      <span>More task settings</span><span className="task-accordion-toggle__hint">Tags, stage, checklist and collaborator hours</span>
      <span className="task-accordion-toggle__chevron" aria-hidden="true">{planningOpen ? "▴" : "▾"}</span>
    </button>
    {planningOpen && <div className="task-accordion-content">
      {tagsSection}
      <label>Stage or milestone (optional)<select aria-label={subtask ? "Subtask stage or milestone" : "Stage or milestone"} value={d.planItemId} onChange={event => change({ planItemId: event.target.value })} disabled={!d.projectId}><option value="">No plan item</option>{planItems.filter(item => item.projectId === d.projectId).map(item => <option key={item.id} value={item.id}>{item.kind === "STAGE" ? "Stage" : "Milestone"} · {item.label}</option>)}</select></label>
      <label>Checklist (optional, one item per line)<textarea {...attrs("checklistText")} aria-label={subtask ? "Subtask checklist" : "Checklist"} value={d.checklistText} onChange={event => change({ checklistText: event.target.value })} placeholder="One item per line" rows={3} /><small className="task-field__helper">Checklist progress does not complete the task automatically.</small>{error("checklistText")}</label>
      <details className="task-collaborator-details" open={planningOpen}>
        <div role="group" className="task-collaborator-group" aria-label="Collaborators (optional)">
          <p className="task-composer__section-title">Collaborators <span className="task-field__optional">· optional</span></p>
          {(options?.collaborators ?? []).filter(person => person.id !== (explicit ? d.ownerId : options?.actorEmployeeId ?? "")).map(person => (
            <div key={person.id} className="task-collaborator-row">
              <span className="task-avatar__initials task-avatar__initials--sm" aria-hidden="true">{initials(person.name)}</span>
              <span className="task-collaborator-row__name">{person.name}</span>
              <label className="task-collaborator-row__hours"><span>Estimated hours</span>
                <input aria-label={`${person.name} estimated hours`} type="number" min="0" max="100000" step="0.25" value={d.collaboratorHours[person.id] ?? ""} onChange={event => change({ collaboratorHours: { ...d.collaboratorHours, [person.id]: event.target.value } })} />
              </label>
            </div>
          ))}
          {error("collaboratorIds")}
        </div>
      </details>
    </div>}
  </div>;

  return <fieldset disabled={busy} className="task-composer-lock task-composer-v15" onBlur={event => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) { const name = event.target.name; setTouched(value => ({ ...value, [name]: true })); } }}><legend className="task-sr-only">Task details</legend>
    {validationAttempt > 0 && Object.keys(errors).length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="task-error-summary"><strong>Check these details</strong><ul>{Object.entries(errors).map(([field, message]) => <li key={field}><a href={`#${prefix}-${field}`} onClick={event => { event.preventDefault(); const control = document.getElementById(`${prefix}-${field}`); if (!control) return; if (field === "tagsText" || field === "checklistText" || field === "collaboratorIds") setPlanningOpen(true); control.focus(); }}>{message}</a></li>)}</ul></div>}
    <div className="task-composer__core">
      {canvas}
      <aside className="task-composer__context task-composer__aside" aria-label="Task assignment">
        <div className="task-composer__context-header">
          <strong>Assignment &amp; timing</strong>
          <span className="task-composer__status" data-state={busy ? "loading" : optionsError ? "error" : "idle"}>{busy ? "Saving" : "To do"}</span>
        </div>
        <div className="task-property-row task-property-row--pair">
          <label><span className="task-property-row__label"><RowIcon name="type" /> Type <span className="task-field__req" aria-hidden="true">*</span></span>
            <select {...attrs("type")} aria-label="Type" value={d.type} onChange={event => change({ type: event.target.value })} disabled={busy}>{TASK_TYPES.map(type => <option key={type} value={type}>{label(type)}</option>)}</select>
          </label>
          {error("type")}
          <label><span className="task-property-row__label"><RowIcon name="project" /> Project{fixedProject ? " · locked" : ""}{!fixedProject && projectTypes.includes(d.type) ? <span className="task-field__req" aria-hidden="true">*</span> : null}</span>
            {projectField}
          </label>
          {error("projectId")}
        </div>
        {options?.canAssign && options.actorEmployeeId && <label className="task-property-row"><span className="task-property-row__label">Assign to another person</span><input type="checkbox" checked={d.assignTo} onChange={event => change({ assignTo: event.target.checked, ownerId: "", collaboratorIds: [], collaboratorHours: {} })} /></label>}
        {explicit && <div className="task-property-row">
          <span className="task-property-row__label"><RowIcon name="owner" /> Primary owner <span className="task-field__req" aria-hidden="true">*</span></span>
          {ownerValue}
          {error("ownerId")}
        </div>}
        <div className="task-timing-group">
          <span className="task-timing-group__header"><RowIcon name="target" /> Timing</span>
          <div className="task-timing-group__row">
            {dateField("targetDate", "Target date")}
            {error("targetDate")}
            {dateField("startDate", "Start date")}
            {error("startDate")}
            <label>Estimated hours <span className="task-field__optional">· optional</span>
              <div className="task-effort-input"><button type="button" aria-label="Clear estimated effort" disabled={!d.estimatedHours || busy} onClick={() => change({ estimatedHours: "" })}>−</button>
                <input {...attrs("estimatedHours")} aria-label="Estimated hours" type="number" min="0" max="100000" step="0.25" value={d.estimatedHours} onChange={event => change({ estimatedHours: event.target.value })} />
                <span className="task-effort-unit" aria-hidden="true">h</span>
                <button type="button" aria-label="Increment estimated effort" disabled={busy} onClick={() => change({ estimatedHours: String(Number(d.estimatedHours || 0) + 1) })}>+</button>
              </div>
            </label>
            {error("estimatedHours")}
          </div>
        </div>
        <div className="task-property-row task-property-row--priority">
          <span className="task-property-row__label"><RowIcon name="priority" /> Priority</span>
          <div className={`task-priority-segmented tone-${d.priority.toLowerCase()}`} role="radiogroup" aria-label="Priority"
            style={{ "--priority-index": Math.max(0, PRIORITIES.indexOf(d.priority as typeof PRIORITIES[number])) } as CSSProperties}
            onKeyDown={event => {
              const current = PRIORITIES.indexOf(d.priority as typeof PRIORITIES[number]);
              const next = event.key === "Home" ? 0 : event.key === "End" ? PRIORITIES.length - 1
                : ["ArrowRight", "ArrowDown"].includes(event.key) ? (current + 1) % PRIORITIES.length
                  : ["ArrowLeft", "ArrowUp"].includes(event.key) ? (current + PRIORITIES.length - 1) % PRIORITIES.length : -1;
              if (next < 0 || busy) return;
              event.preventDefault(); change({ priority: PRIORITIES[next]! });
              event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
            }}>
            <span className="task-priority-segmented__selection" aria-hidden="true" />
            {PRIORITIES.map(value => (
              <button key={value} type="button" role="radio" aria-checked={d.priority === value} tabIndex={d.priority === value ? 0 : -1} disabled={busy}
                className={d.priority === value ? "task-priority-segmented__option task-priority-segmented__option--active" : "task-priority-segmented__option"}
                onClick={() => change({ priority: value })}>
                {label(value)}
              </button>
            ))}
          </div>
        </div>
        {assignSection}
        {reviewSection}
        {/* Compact (EMPLOYEE/SITE) variants keep Tags visible directly in the aside —
            their "More task settings" accordion is not rendered at all. Full
            variants move Tags into the accordion to keep essentials above the fold. */}
        {compact ? tagsSection : planningSection}
      </aside>
    </div>
  </fieldset>;
}
