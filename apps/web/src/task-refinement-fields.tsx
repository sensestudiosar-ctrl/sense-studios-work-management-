import { TASK_COLLABORATOR_FILTER_MAX, TASK_PRIORITY_VALUES } from "@sense/contracts";
import "./task-refinement-fields.css";

import { selectionValues } from "./task-query-refinements.js";

export function TaskRefinementFields({ priorities, collaboratorEmployeeIds, employees, onChange }: {
  priorities: string; collaboratorEmployeeIds: string; employees: Array<{ id: string; name: string }>;
  onChange: (patch: { priorities?: string; collaboratorEmployeeIds?: string }) => void;
}): React.JSX.Element {
  const selectedPriorities = selectionValues(priorities);
  const selectedPeople = selectionValues(collaboratorEmployeeIds);
  const toggle = (values: string[], value: string, checked: boolean): string => (checked ? [...values, value] : values.filter(item => item !== value)).join(",");
  return <>
    <fieldset className="task-refinement-fields task-priority-refinement"><legend>Priority</legend><p>Match any selected priority</p><div className="task-refinement-choices">{[...TASK_PRIORITY_VALUES].reverse().map(value => <label key={value}><input type="checkbox" checked={selectedPriorities.includes(value)} onChange={event => onChange({ priorities: toggle(selectedPriorities, value, event.target.checked) })} />{value[0]}{value.slice(1).toLowerCase()}</label>)}</div></fieldset>
    <fieldset className="task-refinement-fields"><legend>Collaborators</legend><p>Tasks with any selected collaborator</p><div className="task-refinement-choices">{employees.map(person => <label key={person.id}><input type="checkbox" checked={selectedPeople.includes(person.id)} disabled={!selectedPeople.includes(person.id) && selectedPeople.length >= TASK_COLLABORATOR_FILTER_MAX} onChange={event => onChange({ collaboratorEmployeeIds: toggle(selectedPeople, person.id, event.target.checked) })} /><span>{person.name}</span></label>)}{selectedPeople.filter(id => !employees.some(person => person.id === id)).map(id => <label key={id}><input type="checkbox" checked onChange={() => onChange({ collaboratorEmployeeIds: toggle(selectedPeople, id, false) })} />Selected employee unavailable</label>)}{employees.length === 0 && selectedPeople.length === 0 && <span>No collaborator choices available in the current context.</span>}</div></fieldset>
  </>;
}
