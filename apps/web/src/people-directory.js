import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./people-directory.css";
/** Structured empty state shared by both directory empty branches. */
function DirectoryEmptyState({ message, onClearFilters }) {
    return (_jsxs("div", { className: "task-empty-state", role: "status", children: [_jsx("svg", { className: "task-empty-state__icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M4 6h16M7 12h10m-7 6h4" }) }), _jsx("p", { className: "task-empty-state__title", children: message }), onClearFilters && _jsx("button", { type: "button", className: "task-empty-state__action", onClick: onClearFilters, children: "Clear filters" })] }));
}
/** Only accepts the already-authorized inventory. Filters never broaden its scope. */
export function PeopleDirectory({ employees, children }) {
    const [query, setQuery] = useSearchParams();
    const heading = useRef(null);
    const selectedId = query.get("employeeId");
    const selected = employees.find(employee => employee.id === selectedId);
    const search = query.get("q") ?? "";
    const branch = query.get("branch") ?? "";
    const team = query.get("team") ?? "";
    const state = query.get("state") ?? "";
    const branches = [...new Map(employees.map(employee => [employee.homeBranch.id, employee.homeBranch])).values()];
    const teams = [...new Map(employees.filter(employee => !branch || employee.homeBranch.id === branch).map(employee => [employee.homeTeam.id, employee.homeTeam])).values()];
    const filtered = employees.filter(employee => (!branch || employee.homeBranch.id === branch) && (!team || employee.homeTeam.id === team) && (!state || employee.state === state) &&
        [employee.account.normalizedEmail, employee.employeeCode ?? "", employee.homeBranch.name, employee.homeTeam.name, ...employee.jobRoleAssignments.map(assignment => assignment.jobRole.name)]
            .join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    const changeFilter = (key, value) => {
        const next = new URLSearchParams(query);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        if (key === "branch")
            next.delete("team");
        setQuery(next, { replace: true });
    };
    const clearFilters = () => setQuery({}, { replace: true });
    const listQuery = new URLSearchParams(query);
    listQuery.delete("employeeId");
    const backToList = `/people${listQuery.size ? `?${listQuery}` : ""}`;
    const filtersActive = !!(search || branch || team || state);
    useEffect(() => { if (selectedId)
        heading.current?.focus(); }, [selectedId]);
    if (selectedId)
        return _jsxs("section", { className: "people-detail", "aria-labelledby": "person-detail-heading", children: [selected ? _jsx(Link, { to: backToList, children: "\u2190 Back to people" }) : _jsx("button", { type: "button", className: "secondary-action", onClick: clearFilters, children: "\u2190 Back to people" }), _jsx("h3", { id: "person-detail-heading", ref: heading, tabIndex: -1, children: selected?.account.normalizedEmail ?? "Person unavailable" }), selected ? _jsx("ul", { className: "org-employee-list", children: children(selected) }) : _jsx("p", { role: "status", children: "This person is not in your current authorized employee inventory. Refresh the directory or return to the list." })] });
    return _jsxs("section", { className: "people-directory", "aria-labelledby": "people-directory-heading", children: [_jsx("h3", { id: "people-directory-heading", children: "Employee directory" }), _jsx("p", { className: "identity-note", children: "Current employee inventory. Suspended access and employment exit are separate states; exited history is retained in its owning records." }), _jsxs("div", { className: "people-directory-filters", role: "search", "aria-label": "Filter people", children: [_jsxs("label", { children: ["Search people", _jsx("input", { type: "search", value: search, onChange: event => changeFilter("q", event.target.value), placeholder: "Work email, employee code or role" })] }), _jsxs("label", { children: ["Branch", _jsxs("select", { value: branch, onChange: event => changeFilter("branch", event.target.value), children: [_jsx("option", { value: "", children: "All permitted branches" }), branches.map(item => _jsx("option", { value: item.id, children: item.name }, item.id))] })] }), _jsxs("label", { children: ["Team", _jsxs("select", { value: team, onChange: event => changeFilter("team", event.target.value), children: [_jsx("option", { value: "", children: "All permitted teams" }), teams.map(item => _jsx("option", { value: item.id, children: item.name }, item.id))] })] }), _jsxs("label", { children: ["Employee state", _jsxs("select", { value: state, onChange: event => changeFilter("state", event.target.value), children: [_jsx("option", { value: "", children: "All current states" }), [...new Set(employees.map(employee => employee.state))].map(value => _jsx("option", { value: value, children: value }, value))] })] }), filtersActive && _jsx("button", { type: "button", className: "secondary-action", onClick: clearFilters, children: "Clear filters" })] }), _jsxs("p", { role: "status", className: "identity-note", children: [filtered.length, " of ", employees.length, " permitted employees"] }), filtered.length ? _jsx("ul", { className: "people-directory-list", children: filtered.map(employee => {
                    const next = new URLSearchParams(query);
                    next.set("employeeId", employee.id);
                    return _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: employee.account.normalizedEmail }), _jsxs("p", { children: [employee.employeeCode ? `${employee.employeeCode} · ` : "", employee.homeBranch.name, " \u00B7 ", employee.homeTeam.name] }), _jsx("p", { children: employee.jobRoleAssignments.map(assignment => assignment.jobRole.name).join(", ") || "No job roles assigned" })] }), _jsx("span", { className: "account-kind", children: employee.state }), _jsx(Link, { className: "secondary-action", to: `/people?${next}`, "aria-label": `View ${employee.account.normalizedEmail}`, children: "View person" })] }, employee.id);
                }) }) : employees.length ? _jsx(DirectoryEmptyState, { message: "No people match these filters.", onClearFilters: clearFilters }) : _jsx(DirectoryEmptyState, { message: "No employees have been added yet. Use onboarding to add an employee after identity enrollment." })] });
}
