import { TASK_COLLABORATOR_FILTER_MAX, TASK_PRIORITY_VALUES } from "@sense/contracts";
export const selectionValues = (value) => value ? value.split(",") : [];
export function taskRefinementError(filters) {
    const priorities = selectionValues(filters.priorities ?? "");
    const people = selectionValues(filters.collaboratorEmployeeIds ?? "");
    if (priorities.length > TASK_PRIORITY_VALUES.length || new Set(priorities).size !== priorities.length || priorities.some(value => !TASK_PRIORITY_VALUES.some(priority => priority === value)))
        return "Choose supported priorities without duplicates, or clear the priority filter.";
    if (people.length > TASK_COLLABORATOR_FILTER_MAX || new Set(people).size !== people.length || people.some(value => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)))
        return "Review the collaborator filter, or clear it before applying.";
    return "";
}
