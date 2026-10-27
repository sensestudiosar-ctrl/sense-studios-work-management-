import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TASK_DESCRIPTION_MAX_LENGTH } from "@sense/contracts";
import { useEffect, useId, useRef, useState } from "react";
import "./task-composer-v15.css";
export function taskDraftError(draft) {
    return Object.values(taskDraftErrors(draft))[0];
}
/** Live footer readiness line (demo "N required details remaining"): counts only the
    required essentials, so a draft needing just a Target date reads "1 required detail remaining". */
export function taskDraftReadiness(draft, options) {
    const errors = taskDraftErrors(draft);
    const explicit = options ? options.actorEmployeeId === null || options.canAssign && draft.assignTo : false;
    const ownerMissing = explicit && options?.canCreate === true && !options.owners.some(person => person.id === draft.ownerId);
    const missing = [errors.title, errors.targetDate, errors.reason, errors.projectId, ownerMissing ? "owner" : undefined].filter(Boolean).length;
    return missing === 0 ? "Ready to create" : `${missing} required ${missing === 1 ? "detail" : "details"} remaining`;
}
/** One validation pass supplies both the command guard and field-level errors. */
export function taskDraftErrors(draft) {
    const errors = {};
    if (draft.title.trim().length < 2 || draft.title.trim().length > 160)
        errors.title = "Task name must be between 2 and 160 characters.";
    const validDate = (value) => { const date = new Date(`${value}T00:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; };
    if (!validDate(draft.targetDate))
        errors.targetDate = "Choose a valid Target date.";
    if (draft.description.trim().length > TASK_DESCRIPTION_MAX_LENGTH)
        errors.description = `Task brief must be ${TASK_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
    if (draft.startDate && (!validDate(draft.startDate) || draft.startDate > draft.targetDate))
        errors.startDate = "Start date must be valid and on or before the Target date.";
    const invalidHours = (value) => value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100_000);
    if (invalidHours(draft.estimatedHours))
        errors.estimatedHours = "Estimated hours must be a number between 0 and 100,000.";
    if (draft.collaboratorIds.some(id => invalidHours(draft.collaboratorHours[id] ?? "")))
        errors.collaboratorIds = "Collaborator estimated hours must be a number between 0 and 100,000.";
    const tags = draft.tagsText.split(",").map(value => value.trim()).filter(Boolean);
    if (tags.length > 10 || tags.some(value => value.length > 30) || new Set(tags).size !== tags.length)
        errors.tagsText = "Use up to 10 distinct tags, each 30 characters or fewer.";
    const checklist = draft.checklistText.split("\n").map(value => value.trim()).filter(Boolean).map(value => value.replace(/^\[(?:x| )\]\s*/i, ""));
    if (checklist.length > 10 || checklist.some(value => !value.length || value.length > 120))
        errors.checklistText = "Use up to 10 checklist items, each between 1 and 120 characters.";
    if (draft.reason.trim().length < 3 || draft.reason.trim().length > 1000)
        errors.reason = "Reason must be between 3 and 1,000 characters.";
    if (draft.type === "NON_PROJECT" && draft.projectId)
        errors.type = "Non project tasks cannot use a project. Choose a project task type for this context.";
    if (["PROJECT", "CORRECTION", "SITE"].includes(draft.type) && !draft.projectId)
        errors.projectId = "Choose a project for this task type, or use Non project for work without a project.";
    if (draft.collaboratorIds.length > 30 || new Set(draft.collaboratorIds).size !== draft.collaboratorIds.length)
        errors.collaboratorIds = "Choose up to 30 distinct collaborators.";
    return errors;
}
export function taskCreateBody(d, options) {
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
const label = (value) => value.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TASK_TYPES = ["PROJECT", "NON_PROJECT", "RECURRING", "CORRECTION", "SITE", "TRAINING_PRACTICAL"];
const REVIEW_OPTIONS = [
    { value: "NONE", label: "No review", help: "No review route is recorded." },
    { value: "INTERNAL", label: "Internal", help: "Internal approval before completion." },
    { value: "BOTH", label: "Internal + Client", help: "Internal approval precedes client review." },
];
const initials = (value) => {
    const clean = value.trim().split(/[\s._@+-]+/).filter(Boolean);
    if (!clean.length)
        return "?";
    return clean.length === 1 ? clean[0].slice(0, 2).toUpperCase() : `${clean[0][0]}${clean[clean.length - 1][0]}`.toUpperCase();
};
const ROW_ICONS = {
    type: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: _jsx("path", { d: "M4 7h16M4 12h10M4 17h6" }) }),
    project: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("rect", { x: "4", y: "5", width: "16", height: "15", rx: "2" }), _jsx("path", { d: "M4 10h16M9 3v4M15 3v4" })] }),
    owner: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("circle", { cx: "12", cy: "8.5", r: "3.5" }), _jsx("path", { d: "M5.5 19.5c.9-3.2 3.4-5 6.5-5s5.6 1.8 6.5 5" })] }),
    target: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("circle", { cx: "12", cy: "12", r: "8.5" }), _jsx("path", { d: "M12 7.5V12l3.2 2.2" })] }),
    calendar: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("rect", { x: "4", y: "5.5", width: "16", height: "15", rx: "2" }), _jsx("path", { d: "M4 10h16M9 3.5v4M15 3.5v4" })] }),
    priority: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: _jsx("path", { d: "M13 3 5 13h5l-1 8 8-10h-5l1-8Z" }) }),
};
const RowIcon = ({ name }) => (_jsx("span", { className: "task-row-icon", "aria-hidden": "true", children: ROW_ICONS[name] }));
export function TaskComposerFields({ draft: d, onChange: change, projects, planItems, options, optionsError, retryOptions, busy, subtask = false, fixedProject, compact = false, validationAttempt = 0 }) {
    const prefix = useId();
    const summary = useRef(null);
    const [touched, setTouched] = useState({});
    const [peopleSearch, setPeopleSearch] = useState("");
    const [peopleMenuOpen, setPeopleMenuOpen] = useState(false);
    const [planningOpen, setPlanningOpen] = useState(false);
    const [tagDraft, setTagDraft] = useState("");
    const explicit = options?.actorEmployeeId === null || !!options?.canAssign && d.assignTo;
    const errors = taskDraftErrors(d);
    if (options?.canCreate && explicit && !options.owners.some(person => person.id === d.ownerId))
        errors.ownerId = "Choose an eligible primary owner.";
    const visible = (field) => validationAttempt > 0 || touched[field] ? errors[field] : undefined;
    const attrs = (field) => ({ id: `${prefix}-${field}`, name: field, "aria-invalid": visible(field) ? true : undefined, "aria-describedby": visible(field) ? `${prefix}-${field}-error` : undefined });
    const error = (field) => visible(field) ? _jsx("p", { className: "task-field-error", id: `${prefix}-${field}-error`, children: visible(field) }) : null;
    useEffect(() => { if (validationAttempt > 0)
        summary.current?.focus(); }, [validationAttempt]);
    const chooseProject = (projectId) => {
        setPeopleMenuOpen(false);
        setPeopleSearch("");
        change({ projectId, planItemId: "", ownerId: "", collaboratorIds: [], collaboratorHours: {}, reviewRequirement: projectId ? d.reviewRequirement : "NONE",
            type: projectId && d.type === "NON_PROJECT" ? "PROJECT" : !projectId && ["PROJECT", "CORRECTION", "SITE"].includes(d.type) ? "NON_PROJECT" : d.type });
    };
    const projectTypes = ["PROJECT", "CORRECTION", "SITE"];
    const todayISO = new Date().toISOString().slice(0, 10);
    const addTag = () => {
        const value = tagDraft.trim();
        if (!value)
            return;
        const tags = [...d.tagsText.split(",").map(item => item.trim()).filter(Boolean), value];
        if (new Set(tags.map(item => item.toLowerCase())).size !== tags.length) {
            setTouched(current => ({ ...current, tagsText: true }));
            setTagDraft("");
            return;
        }
        change({ tagsText: tags.join(", ") });
        setTagDraft("");
    };
    const removeTag = (tag) => {
        const tags = d.tagsText.split(",").map(item => item.trim()).filter(Boolean).filter(item => item !== tag);
        change({ tagsText: tags.join(", ") });
    };
    const tags = d.tagsText.split(",").map(item => item.trim()).filter(Boolean);
    // Ordered people: first avatar = primary owner (ownerId), remaining = collaborators.
    const ownerPerson = options?.owners.find(person => person.id === d.ownerId);
    const orderedPeople = [
        ...(ownerPerson ? [{ person: ownerPerson, role: "owner", key: "owner" }] : []),
        ...d.collaboratorIds.map(id => options?.collaborators.find(person => person.id === id)).filter((person) => !!person)
            .map(person => ({ person, role: "collaborator", key: person.id })),
    ];
    const eligibleAdd = options?.collaborators.filter(person => person.id !== (explicit ? d.ownerId : options.actorEmployeeId ?? "")) ?? [];
    const searchedPeople = peopleSearch.trim()
        ? [...options?.owners ?? [], ...eligibleAdd].filter(person => !d.collaboratorIds.includes(person.id) && person.name.toLowerCase().includes(peopleSearch.trim().toLowerCase()))
        : eligibleAdd.filter(person => !d.collaboratorIds.includes(person.id)).slice(0, 8);
    const addCollaborator = (id) => {
        if (d.collaboratorIds.length >= 30 || d.collaboratorIds.includes(id) || id === (explicit ? d.ownerId : options?.actorEmployeeId ?? ""))
            return;
        change({ collaboratorIds: [...d.collaboratorIds, id] });
    };
    const removeCollaborator = (id) => {
        change({ collaboratorIds: d.collaboratorIds.filter(value => value !== id), collaboratorHours: Object.fromEntries(Object.entries(d.collaboratorHours).filter(([key]) => key !== id)) });
    };
    const reviewValue = d.reviewRequirement === "CLIENT" ? "BOTH" : d.reviewRequirement;
    const dateField = (field, text) => _jsxs("label", { className: "task-calendar-field", children: [_jsxs("span", { children: [text, field === "targetDate" ? _jsx("span", { className: "task-field__req", "aria-hidden": "true", children: "*" }) : _jsx("span", { className: "task-field__optional", children: "\u00B7 optional" })] }), _jsxs("span", { className: `task-calendar-control${d[field] ? " has-value" : ""}`, children: [_jsx("input", { ...attrs(field), type: "date", "aria-label": text, required: field === "targetDate", value: d[field], disabled: busy, min: field === "targetDate" ? todayISO : undefined, title: d[field] ? `${text}: ${d[field].split("-").reverse().join("/")}` : `Choose ${text.toLowerCase()}`, onChange: event => change({ [field]: event.target.value }), onClick: event => { try {
                            event.currentTarget.showPicker?.();
                        }
                        catch { /* The native date field remains keyboard-editable if a browser blocks programmatic opening. */ } } }), _jsx(RowIcon, { name: "calendar" })] })] });
    // Left canvas: directly edited fields in V15 order. Subtask and checklist rows are
    // visual companions — subtask drafts are staged separately by TaskWorkspace after
    // parent success, so they are shown here as a read-only count when editing a subtask.
    const canvas = _jsxs("div", { className: "task-composer__brief", "aria-label": "Task details", children: [_jsxs("label", { className: "task-field task-field--title", children: [_jsxs("span", { className: "task-field__label", children: ["Task name ", _jsx("span", { className: "task-field__req", "aria-hidden": "true", children: "*" })] }), _jsx("input", { ...attrs("title"), className: "task-field--title-input", "aria-label": "Task name", value: d.title, onChange: event => change({ title: event.target.value }), minLength: 2, maxLength: 160, required: true, placeholder: "e.g. Revise the bedroom lighting plan" }), error("title")] }), _jsxs("label", { className: "task-field", children: [_jsxs("span", { className: "task-field__label", children: ["Task brief ", _jsx("span", { className: "task-field__optional", children: "\u00B7 optional" })] }), _jsx("textarea", { ...attrs("description"), "aria-label": "Description (optional)", value: d.description, onChange: event => change({ description: event.target.value }), maxLength: TASK_DESCRIPTION_MAX_LENGTH, rows: 3, placeholder: "What needs to be delivered? Add scope, context and the expected result." }), _jsx("small", { className: "task-field__helper", children: "A useful brief helps the next person start without another conversation." }), error("description")] }), _jsxs("label", { className: "task-field", children: [_jsxs("span", { className: "task-field__label", children: ["Why is this task needed? ", _jsx("span", { className: "task-field__req", "aria-hidden": "true", children: "*" })] }), _jsx("input", { ...attrs("reason"), "aria-label": "Reason", value: d.reason, onChange: event => change({ reason: event.target.value }), minLength: 3, maxLength: 1000, required: true, placeholder: "e.g. Incorporate the agreed client feedback" }), _jsx("small", { className: "task-field__helper", children: "Kept with the task's creation history." }), error("reason")] }), !compact && _jsxs("details", { className: "task-optional-planning", children: [_jsx("summary", { children: "Optional planning" }), _jsxs("label", { children: ["Stage or milestone (optional)", _jsxs("select", { "aria-label": subtask ? "Subtask stage or milestone" : "Stage or milestone", value: d.planItemId, onChange: event => change({ planItemId: event.target.value }), disabled: !d.projectId, children: [_jsx("option", { value: "", children: "No plan item" }), planItems.filter(item => item.projectId === d.projectId).map(item => _jsxs("option", { value: item.id, children: [item.kind === "STAGE" ? "Stage" : "Milestone", " \u00B7 ", item.label] }, item.id))] })] }), _jsxs("label", { children: ["Checklist (optional, one item per line)", _jsx("textarea", { ...attrs("checklistText"), "aria-label": subtask ? "Subtask checklist" : "Checklist", value: d.checklistText, onChange: event => change({ checklistText: event.target.value }), placeholder: "[ ] Confirm brief\n[x] Collect references", rows: 3 })] }), error("checklistText"), _jsxs("label", { children: ["Estimated hours (optional)", _jsx("input", { ...attrs("estimatedHours"), type: "number", min: "0", max: "100000", step: "0.25", value: d.estimatedHours, onChange: event => change({ estimatedHours: event.target.value }) }), _jsx("span", { className: "task-effort-unit", "aria-hidden": "true", children: "h" }), error("estimatedHours")] })] }), _jsxs("div", { className: "task-post-creation", "aria-label": "After creation", children: [_jsxs("p", { className: "task-post-creation__item", children: [_jsx("span", { "aria-hidden": "true", children: "\u25C7" }), " Discussion", _jsx("span", { className: "task-post-creation__note", children: "Comment after creation" })] }), _jsxs("p", { className: "task-post-creation__item", children: [_jsx("span", { "aria-hidden": "true", children: "\u25C7" }), " Files", _jsx("span", { className: "task-post-creation__note", children: "Attach after creation" })] })] })] });
    const projectField = fixedProject
        ? _jsx("input", { ...attrs("projectId"), "aria-label": subtask ? "Parent project" : "Project", readOnly: true, value: fixedProject.title, disabled: true })
        : _jsxs("select", { ...attrs("projectId"), "aria-label": subtask ? "Subtask project" : "Project", required: projectTypes.includes(d.type), value: d.projectId, onChange: event => chooseProject(event.target.value), disabled: busy, children: [_jsx("option", { value: "", children: projectTypes.includes(d.type) ? "Choose a project" : "No project" }), projects.filter(project => project.status === "DRAFT" || project.status === "ACTIVE").map(project => _jsx("option", { value: project.id, children: project.title }, project.id))] });
    const ownerValue = options?.canAssign && explicit
        ? _jsxs("select", { ...attrs("ownerId"), "aria-label": "Primary owner", value: d.ownerId, onChange: event => change({ ownerId: event.target.value, collaboratorIds: d.collaboratorIds.filter(id => id !== event.target.value) }), required: true, disabled: busy || !options.canCreate, children: [_jsx("option", { value: "", children: "Choose an employee" }), options.owners.map(employee => _jsx("option", { value: employee.id, children: employee.name }, employee.id))] })
        : _jsx("p", { className: "task-owner-summary", role: "status", children: options?.actorEmployeeId && !explicit ? "Assigned to you." : "Choose an owner" });
    const assignSection = options ? (_jsxs("div", { className: "task-composer__assign", children: [_jsxs("p", { className: "task-composer__section-title", children: ["Assign to", d.collaboratorIds.length > 0 && _jsxs("span", { className: "task-field__optional", children: ["\u00B7 ", d.collaboratorIds.length, " selected"] })] }), optionsError
                ? _jsxs("div", { className: "task-options-retry", role: "alert", children: [_jsx("p", { children: optionsError }), _jsx("button", { type: "button", onClick: retryOptions, disabled: busy, children: "Retry participants" })] })
                : _jsxs("div", { className: "task-avatar-strip", "aria-label": "Assigned people", children: [orderedPeople.map((entry) => (_jsxs("button", { type: "button", className: `task-avatar${entry.role === "owner" ? " task-avatar--main" : ""}`, "aria-label": entry.role === "owner" ? `Main assignee: ${entry.person.name}` : `${entry.person.name}, collaborator. Press to manage.`, title: entry.role === "owner" ? `Main: ${entry.person.name}` : entry.person.name, onClick: () => { if (entry.role !== "owner")
                                setPeopleMenuOpen(open => !open); }, children: [_jsx("span", { className: "task-avatar__initials", "aria-hidden": "true", children: initials(entry.person.name) }), entry.role === "owner" && _jsx("span", { className: "task-avatar__badge", "aria-hidden": "true", children: "Main" })] }, entry.key))), explicit ? (_jsx("button", { type: "button", className: "task-avatar-add", "aria-label": peopleMenuOpen ? "Close people search" : "Add people", "aria-expanded": peopleMenuOpen, onClick: () => setPeopleMenuOpen(open => !open), children: "+" })) : _jsx("p", { className: "task-avatar-self", role: "status", children: options?.actorEmployeeId ? "Assigned to you." : "Choose an owner" })] }), peopleMenuOpen && explicit && _jsxs("div", { className: "task-people-menu", role: "listbox", "aria-label": "Find collaborators", children: [_jsx("label", { className: "task-people-menu__search", children: _jsx("input", { type: "search", "aria-label": "Search eligible people", placeholder: "Find a collaborator...", value: peopleSearch, onChange: event => setPeopleSearch(event.target.value), autoFocus: true }) }), searchedPeople.length ? searchedPeople.map(person => (_jsxs("div", { className: "task-people-menu__row", role: "option", "aria-selected": d.collaboratorIds.includes(person.id), children: [_jsx("span", { className: "task-avatar__initials task-avatar__initials--sm", "aria-hidden": "true", children: initials(person.name) }), _jsx("span", { className: "task-people-menu__name", children: person.name }), _jsx("button", { type: "button", className: "task-people-menu__add", "aria-label": `Add ${person.name}`, onClick: () => addCollaborator(person.id), children: "+" })] }, person.id))) : _jsx("p", { className: "task-people-menu__empty", children: "No eligible people match this search." })] }), d.collaboratorIds.length > 0 && _jsx("ul", { className: "task-collaborator-chips", "aria-label": "Selected collaborators", children: d.collaboratorIds.map(id => {
                    const person = options?.collaborators.find(value => value.id === id);
                    return _jsxs("li", { className: "task-collaborator-chip", children: [_jsx("span", { className: "task-avatar__initials task-avatar__initials--sm", "aria-hidden": "true", children: initials(person?.name ?? "?") }), _jsx("span", { className: "task-collaborator-chip__name", children: person?.name ?? "Unavailable" }), _jsx("button", { type: "button", className: "task-collaborator-chip__remove", "aria-label": `Remove ${person?.name ?? "collaborator"}`, onClick: () => removeCollaborator(id), children: "\u00D7" })] }, id);
                }) }), error("ownerId"), error("collaboratorIds")] })) : _jsx("p", { role: "status", className: "task-options-loading", "aria-label": "Loading eligible task participants\u2026", children: "Loading eligible task participants\u2026" });
    const reviewSection = _jsxs("div", { className: "task-composer__review", children: [_jsx("p", { className: "task-composer__section-title", children: "Reviews" }), d.projectId ? _jsxs("div", { className: "task-review-cards", role: "radiogroup", "aria-label": "Review routing", children: [REVIEW_OPTIONS.map(option => (_jsx("button", { type: "button", role: "radio", "aria-checked": reviewValue === option.value, className: `task-review-card${reviewValue === option.value ? " task-review-card--selected" : ""}`, disabled: busy, onClick: () => change({ reviewRequirement: option.value }), children: _jsx("span", { className: "task-review-card__label", children: option.label }) }, option.value))), _jsx("p", { className: "task-review-note", role: "note", children: REVIEW_OPTIONS.find(option => option.value === reviewValue)?.help }), reviewValue !== "NONE" && _jsx("p", { className: "task-review-note", children: "Before submitting work, an authorized person appoints an independent reviewer in Internal reviews." }), reviewValue === "BOTH" && _jsxs("div", { className: "task-review-sequence", "aria-label": "Review sequence", children: [_jsx("span", { className: "task-review-node", children: "Internal" }), _jsx("span", { "aria-hidden": "true", children: "\u2192" }), _jsx("span", { className: "task-review-node", children: "Client" })] }), _jsx("label", { className: "task-review-legacy task-sr-only", children: _jsx("input", { type: "checkbox", checked: ["INTERNAL", "BOTH"].includes(reviewValue), disabled: busy || reviewValue === "BOTH", onChange: event => change({ reviewRequirement: event.target.checked ? "INTERNAL" : "NONE" }), "aria-label": "Internal review required" }) }), _jsx("label", { className: "task-review-legacy task-sr-only", children: _jsx("input", { type: "checkbox", checked: reviewValue === "BOTH", disabled: busy, onChange: event => change({ reviewRequirement: event.target.checked ? "BOTH" : "INTERNAL" }), "aria-label": "Client review required" }) })] })
                : _jsx("div", { className: "task-info-strip", children: _jsxs("span", { className: "task-info-strip__body", children: [_jsx("b", { children: "Review routing needs a project." }), "Client and internal review routes require a project context with publishing authority."] }) })] });
    const tagsSection = _jsxs("div", { className: "task-composer__tags", children: [_jsxs("p", { className: "task-composer__section-title", children: ["Tags ", _jsx("span", { className: "task-field__optional", children: "Optional \u00B7 max 10" })] }), _jsxs("div", { className: "task-tag-area", children: [tags.map(tag => (_jsxs("span", { className: "task-tag-chip", children: [_jsx("span", { children: tag }), _jsx("button", { type: "button", "aria-label": `Remove tag ${tag}`, onClick: () => removeTag(tag), children: "\u00D7" })] }, tag))), _jsx("input", { className: "task-tag-input", "aria-label": "Add tag", placeholder: "+ Add tag", value: tagDraft, onChange: event => setTagDraft(event.target.value), onKeyDown: event => { if (event.key === "Enter") {
                            event.preventDefault();
                            addTag();
                        } }, onBlur: addTag })] }), error("tagsText")] });
    const planningSection = _jsxs("div", { className: "task-composer__planning", children: [_jsxs("button", { type: "button", className: "task-accordion-toggle", "aria-expanded": planningOpen, onClick: () => setPlanningOpen(open => !open), children: [_jsx("span", { children: "More task settings" }), _jsx("span", { className: "task-accordion-toggle__hint", children: "Tags, stage, checklist and collaborator hours" }), _jsx("span", { className: "task-accordion-toggle__chevron", "aria-hidden": "true", children: planningOpen ? "▴" : "▾" })] }), planningOpen && _jsxs("div", { className: "task-accordion-content", children: [tagsSection, _jsxs("label", { children: ["Stage or milestone (optional)", _jsxs("select", { "aria-label": subtask ? "Subtask stage or milestone" : "Stage or milestone", value: d.planItemId, onChange: event => change({ planItemId: event.target.value }), disabled: !d.projectId, children: [_jsx("option", { value: "", children: "No plan item" }), planItems.filter(item => item.projectId === d.projectId).map(item => _jsxs("option", { value: item.id, children: [item.kind === "STAGE" ? "Stage" : "Milestone", " \u00B7 ", item.label] }, item.id))] })] }), _jsxs("label", { children: ["Checklist (optional, one item per line)", _jsx("textarea", { ...attrs("checklistText"), "aria-label": subtask ? "Subtask checklist" : "Checklist", value: d.checklistText, onChange: event => change({ checklistText: event.target.value }), placeholder: "One item per line", rows: 3 }), _jsx("small", { className: "task-field__helper", children: "Checklist progress does not complete the task automatically." }), error("checklistText")] }), _jsx("details", { className: "task-collaborator-details", open: planningOpen, children: _jsxs("div", { role: "group", className: "task-collaborator-group", "aria-label": "Collaborators (optional)", children: [_jsxs("p", { className: "task-composer__section-title", children: ["Collaborators ", _jsx("span", { className: "task-field__optional", children: "\u00B7 optional" })] }), (options?.collaborators ?? []).filter(person => person.id !== (explicit ? d.ownerId : options?.actorEmployeeId ?? "")).map(person => (_jsxs("div", { className: "task-collaborator-row", children: [_jsx("span", { className: "task-avatar__initials task-avatar__initials--sm", "aria-hidden": "true", children: initials(person.name) }), _jsx("span", { className: "task-collaborator-row__name", children: person.name }), _jsxs("label", { className: "task-collaborator-row__hours", children: [_jsx("span", { children: "Estimated hours" }), _jsx("input", { "aria-label": `${person.name} estimated hours`, type: "number", min: "0", max: "100000", step: "0.25", value: d.collaboratorHours[person.id] ?? "", onChange: event => change({ collaboratorHours: { ...d.collaboratorHours, [person.id]: event.target.value } }) })] })] }, person.id))), error("collaboratorIds")] }) })] })] });
    return _jsxs("fieldset", { disabled: busy, className: "task-composer-lock task-composer-v15", onBlur: event => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
            const name = event.target.name;
            setTouched(value => ({ ...value, [name]: true }));
        } }, children: [_jsx("legend", { className: "task-sr-only", children: "Task details" }), validationAttempt > 0 && Object.keys(errors).length > 0 && _jsxs("div", { ref: summary, tabIndex: -1, role: "alert", className: "task-error-summary", children: [_jsx("strong", { children: "Check these details" }), _jsx("ul", { children: Object.entries(errors).map(([field, message]) => _jsx("li", { children: _jsx("a", { href: `#${prefix}-${field}`, onClick: event => { event.preventDefault(); const control = document.getElementById(`${prefix}-${field}`); if (!control)
                                    return; if (field === "tagsText" || field === "checklistText" || field === "collaboratorIds")
                                    setPlanningOpen(true); control.focus(); }, children: message }) }, field)) })] }), _jsxs("div", { className: "task-composer__core", children: [canvas, _jsxs("aside", { className: "task-composer__context task-composer__aside", "aria-label": "Task assignment", children: [_jsxs("div", { className: "task-composer__context-header", children: [_jsx("strong", { children: "Assignment & timing" }), _jsx("span", { className: "task-composer__status", "data-state": busy ? "loading" : optionsError ? "error" : "idle", children: busy ? "Saving" : "To do" })] }), _jsxs("div", { className: "task-property-row task-property-row--pair", children: [_jsxs("label", { children: [_jsxs("span", { className: "task-property-row__label", children: [_jsx(RowIcon, { name: "type" }), " Type ", _jsx("span", { className: "task-field__req", "aria-hidden": "true", children: "*" })] }), _jsx("select", { ...attrs("type"), "aria-label": "Type", value: d.type, onChange: event => change({ type: event.target.value }), disabled: busy, children: TASK_TYPES.map(type => _jsx("option", { value: type, children: label(type) }, type)) })] }), error("type"), _jsxs("label", { children: [_jsxs("span", { className: "task-property-row__label", children: [_jsx(RowIcon, { name: "project" }), " Project", fixedProject ? " · locked" : "", !fixedProject && projectTypes.includes(d.type) ? _jsx("span", { className: "task-field__req", "aria-hidden": "true", children: "*" }) : null] }), projectField] }), error("projectId")] }), options?.canAssign && options.actorEmployeeId && _jsxs("label", { className: "task-property-row", children: [_jsx("span", { className: "task-property-row__label", children: "Assign to another person" }), _jsx("input", { type: "checkbox", checked: d.assignTo, onChange: event => change({ assignTo: event.target.checked, ownerId: "", collaboratorIds: [], collaboratorHours: {} }) })] }), explicit && _jsxs("div", { className: "task-property-row", children: [_jsxs("span", { className: "task-property-row__label", children: [_jsx(RowIcon, { name: "owner" }), " Primary owner ", _jsx("span", { className: "task-field__req", "aria-hidden": "true", children: "*" })] }), ownerValue, error("ownerId")] }), _jsxs("div", { className: "task-timing-group", children: [_jsxs("span", { className: "task-timing-group__header", children: [_jsx(RowIcon, { name: "target" }), " Timing"] }), _jsxs("div", { className: "task-timing-group__row", children: [dateField("targetDate", "Target date"), error("targetDate"), dateField("startDate", "Start date"), error("startDate"), _jsxs("label", { children: ["Estimated hours ", _jsx("span", { className: "task-field__optional", children: "\u00B7 optional" }), _jsxs("div", { className: "task-effort-input", children: [_jsx("button", { type: "button", "aria-label": "Clear estimated effort", disabled: !d.estimatedHours || busy, onClick: () => change({ estimatedHours: "" }), children: "\u2212" }), _jsx("input", { ...attrs("estimatedHours"), "aria-label": "Estimated hours", type: "number", min: "0", max: "100000", step: "0.25", value: d.estimatedHours, onChange: event => change({ estimatedHours: event.target.value }) }), _jsx("span", { className: "task-effort-unit", "aria-hidden": "true", children: "h" }), _jsx("button", { type: "button", "aria-label": "Increment estimated effort", disabled: busy, onClick: () => change({ estimatedHours: String(Number(d.estimatedHours || 0) + 1) }), children: "+" })] })] }), error("estimatedHours")] })] }), _jsxs("div", { className: "task-property-row task-property-row--priority", children: [_jsxs("span", { className: "task-property-row__label", children: [_jsx(RowIcon, { name: "priority" }), " Priority"] }), _jsxs("div", { className: `task-priority-segmented tone-${d.priority.toLowerCase()}`, role: "radiogroup", "aria-label": "Priority", style: { "--priority-index": Math.max(0, PRIORITIES.indexOf(d.priority)) }, onKeyDown: event => {
                                            const current = PRIORITIES.indexOf(d.priority);
                                            const next = event.key === "Home" ? 0 : event.key === "End" ? PRIORITIES.length - 1
                                                : ["ArrowRight", "ArrowDown"].includes(event.key) ? (current + 1) % PRIORITIES.length
                                                    : ["ArrowLeft", "ArrowUp"].includes(event.key) ? (current + PRIORITIES.length - 1) % PRIORITIES.length : -1;
                                            if (next < 0 || busy)
                                                return;
                                            event.preventDefault();
                                            change({ priority: PRIORITIES[next] });
                                            event.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus();
                                        }, children: [_jsx("span", { className: "task-priority-segmented__selection", "aria-hidden": "true" }), PRIORITIES.map(value => (_jsx("button", { type: "button", role: "radio", "aria-checked": d.priority === value, tabIndex: d.priority === value ? 0 : -1, disabled: busy, className: d.priority === value ? "task-priority-segmented__option task-priority-segmented__option--active" : "task-priority-segmented__option", onClick: () => change({ priority: value }), children: label(value) }, value)))] })] }), assignSection, reviewSection, compact ? tagsSection : planningSection] })] })] });
}
