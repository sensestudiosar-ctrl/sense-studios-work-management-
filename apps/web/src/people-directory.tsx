import { useEffect, useRef, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "./people-directory.css";

type Person = {
  id: string;
  state: string;
  employeeCode: string | null;
  account: { normalizedEmail: string };
  homeBranch: { id: string; name: string };
  homeTeam: { id: string; name: string };
  jobRoleAssignments: Array<{ jobRole: { id: string; name: string } }>;
};

/** Structured empty state shared by both directory empty branches. */
function DirectoryEmptyState({ message, onClearFilters }: { message: string; onClearFilters?: () => void }): React.JSX.Element {
  return (
    <div className="task-empty-state" role="status">
      <svg className="task-empty-state__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10m-7 6h4"/></svg>
      <p className="task-empty-state__title">{message}</p>
      {onClearFilters && <button type="button" className="task-empty-state__action" onClick={onClearFilters}>Clear filters</button>}
    </div>
  );
}

/** Only accepts the already-authorized inventory. Filters never broaden its scope. */
export function PeopleDirectory<T extends Person>({ employees, children }: {
  employees: T[];
  children: (employee: T) => ReactNode;
}): React.JSX.Element {
  const [query, setQuery] = useSearchParams();
  const heading = useRef<HTMLHeadingElement>(null);
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
  const changeFilter = (key: string, value: string): void => {
    const next = new URLSearchParams(query);
    if (value) next.set(key, value); else next.delete(key);
    if (key === "branch") next.delete("team");
    setQuery(next, { replace: true });
  };
  const clearFilters = (): void => setQuery({}, { replace: true });
  const listQuery = new URLSearchParams(query);
  listQuery.delete("employeeId");
  const backToList = `/people${listQuery.size ? `?${listQuery}` : ""}`;
  const filtersActive = !!(search || branch || team || state);
  useEffect(() => { if (selectedId) heading.current?.focus(); }, [selectedId]);

  if (selectedId) return <section className="people-detail" aria-labelledby="person-detail-heading">
    {selected ? <Link to={backToList}>← Back to people</Link> : <button type="button" className="secondary-action" onClick={clearFilters}>← Back to people</button>}
    <h3 id="person-detail-heading" ref={heading} tabIndex={-1}>{selected?.account.normalizedEmail ?? "Person unavailable"}</h3>
    {selected ? <ul className="org-employee-list">{children(selected)}</ul> : <p role="status">This person is not in your current authorized employee inventory. Refresh the directory or return to the list.</p>}
  </section>;

  return <section className="people-directory" aria-labelledby="people-directory-heading">
    <h3 id="people-directory-heading">Employee directory</h3>
    <p className="identity-note">Current employee inventory. Suspended access and employment exit are separate states; exited history is retained in its owning records.</p>
    <div className="people-directory-filters" role="search" aria-label="Filter people">
      <label>Search people<input type="search" value={search} onChange={event => changeFilter("q", event.target.value)} placeholder="Work email, employee code or role" /></label>
      <label>Branch<select value={branch} onChange={event => changeFilter("branch", event.target.value)}><option value="">All permitted branches</option>{branches.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Team<select value={team} onChange={event => changeFilter("team", event.target.value)}><option value="">All permitted teams</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Employee state<select value={state} onChange={event => changeFilter("state", event.target.value)}><option value="">All current states</option>{[...new Set(employees.map(employee => employee.state))].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      {filtersActive && <button type="button" className="secondary-action" onClick={clearFilters}>Clear filters</button>}
    </div>
    <p role="status" className="identity-note">{filtered.length} of {employees.length} permitted employees</p>
    {filtered.length ? <ul className="people-directory-list">{filtered.map(employee => {
      const next = new URLSearchParams(query); next.set("employeeId", employee.id);
      return <li key={employee.id}>
        <div><strong>{employee.account.normalizedEmail}</strong><p>{employee.employeeCode ? `${employee.employeeCode} · ` : ""}{employee.homeBranch.name} · {employee.homeTeam.name}</p><p>{employee.jobRoleAssignments.map(assignment => assignment.jobRole.name).join(", ") || "No job roles assigned"}</p></div>
        <span className="account-kind">{employee.state}</span><Link className="secondary-action" to={`/people?${next}`} aria-label={`View ${employee.account.normalizedEmail}`}>View person</Link>
      </li>;
    })}</ul> : employees.length ? <DirectoryEmptyState message="No people match these filters." onClearFilters={clearFilters} /> : <DirectoryEmptyState message="No employees have been added yet. Use onboarding to add an employee after identity enrollment." />}
  </section>;
}
