import { PERMISSION_CATALOGUE, isKnownPermissionKey } from "@sense/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PeopleDirectory } from "./people-directory.js";

const AUTH_PATH = "/api/v1/auth";
const ORG_PATH = "/api/v1/org";
type Session = { account: { id: string; email: string; kind: "OWNER" | "STAFF" }; csrfToken: string };

function PermissionKeyOptions(): React.JSX.Element {
  return <><option value="">Choose a permission</option>{PERMISSION_CATALOGUE.map(group => <optgroup key={group.label} label={group.label}>
    {group.permissions.map(permission => <option key={permission.key} value={permission.key}>{permission.label}</option>)}
  </optgroup>)}</>;
}

type Org = { id: string; name: string; timezone?: string; settingsVersion?: number };
type Branch = { id: string; name: string };
type Team = { id: string; branchId: string; name: string; waitingAlertsEnabled?: boolean; settingsVersion?: number };
type RolePermission = { id: string; permissionKey: string; scopeKind: "ORGANIZATION" | "BRANCH" | "TEAM" | "SELF"; branchId?: string | null; teamId?: string | null };
type CreationPresentation = "EMPLOYEE" | "LEADER" | "SITE";
type JobRole = { id: string; name: string; creationPresentation?: CreationPresentation | null; permissions?: RolePermission[] };
type EmployeeOverride = RolePermission & { effect: "ALLOW" | "DENY"; expiresAt: string | null };
type Employee = {
  id: string;
  state: string;
  employeeCode: string | null;
  account: { id?: string; normalizedEmail: string; state: string };
  homeBranch: { id: string; name: string };
  homeTeam: { id: string; name: string };
  jobRoleAssignments: Array<{ jobRole: { id: string; name: string } }>;
  permissionOverrides: EmployeeOverride[];
  reportsTo: { id: string; account: { normalizedEmail: string } } | null;
};
type ManagedEmployee = {
  id: string;
  employeeCode: string | null;
  hiredAt: string;
  reportsToId: string | null;
  account: { normalizedEmail: string };
  jobRoleAssignments: Array<{ jobRole: { id: string; name: string } }>;
};
type ManagerOption = { id: string; email: string };
type AdminPanel = "all" | "people" | "structure" | "access" | "presentation";
export function OrganizationAdmin({ session, panel = "all" }: { session: Session; panel?: AdminPanel }): React.JSX.Element {
  const active = useRef(true);
  const generation = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; generation.current += 1; }; }, []);
  const showStructure = panel === "all" || panel === "structure";
  const showAccess = panel === "all" || panel === "access";
  const showPresentation = panel === "all" || panel === "presentation";
  const showPeople = panel === "all" || panel === "people";
  const [organization, setOrganization] = useState<Org | null>(null);
  const [organizationConfirmed, setOrganizationConfirmed] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [orgName, setOrgName] = useState("");
  const [orgTimezone, setOrgTimezone] = useState("Asia/Kolkata");
  const [branchName, setBranchName] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [creationPresentationDrafts, setCreationPresentationDrafts] = useState<Record<string, CreationPresentation | "">>({});
  const [creationPresentationReason, setCreationPresentationReason] = useState("");
  const [permissionRoleId, setPermissionRoleId] = useState("");
  const [permissionKey, setPermissionKey] = useState("");
  const [permissionScope, setPermissionScope] = useState<RolePermission["scopeKind"]>("ORGANIZATION");
  const [permissionBranchId, setPermissionBranchId] = useState("");
  const [permissionTeamId, setPermissionTeamId] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffAccount, setStaffAccount] = useState<{ id: string; email: string; state: string } | null>(null);
  const [employeeBranchId, setEmployeeBranchId] = useState("");
  const employeeBranchIdRef = useRef("");
  const [employeeTeamId, setEmployeeTeamId] = useState("");
  const [employeeRoleIds, setEmployeeRoleIds] = useState<string[]>([]);
  const [editingRolesEmployeeId, setEditingRolesEmployeeId] = useState("");
  const [editingRoleIds, setEditingRoleIds] = useState<string[]>([]);
  const [editingMembershipEmployeeId, setEditingMembershipEmployeeId] = useState("");
  const [membershipBranchId, setMembershipBranchId] = useState("");
  const [membershipTeamId, setMembershipTeamId] = useState("");
  const [membershipReportsToId, setMembershipReportsToId] = useState("");
  const [editingPermissionsEmployeeId, setEditingPermissionsEmployeeId] = useState("");
  const [overridePermissionKey, setOverridePermissionKey] = useState("");
  const [overrideEffect, setOverrideEffect] = useState<"ALLOW" | "DENY">("DENY");
  const [overrideScope, setOverrideScope] = useState<RolePermission["scopeKind"]>("SELF");
  const [overrideBranchId, setOverrideBranchId] = useState("");
  const [overrideTeamId, setOverrideTeamId] = useState("");
  const [overrideExpiresAt, setOverrideExpiresAt] = useState("");
  const [managerId, setManagerId] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [hiredAt, setHiredAt] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [suspendingEmployee, setSuspendingEmployee] = useState("");
  const [exitingEmployee, setExitingEmployee] = useState("");

  const load = useCallback(async (): Promise<boolean> => {
    const request = ++generation.current;
    const current = (): boolean => active.current && request === generation.current;
    if (!current()) return false;
    setLoading(true);
    setOrganizationConfirmed(false);
    setError(undefined);
    try {
      const orgResponse = await fetch(ORG_PATH, { credentials: "include", cache: "no-store" });
      if (!orgResponse.ok) throw Object.assign(new Error("organization-unavailable"), { status: orgResponse.status });
      // Nest's Express adapter sends an empty successful body for a null result.
      const body = await orgResponse.text();
      const org = body.trim() ? JSON.parse(body) as Org | null : null;
      if (org !== null && (typeof org !== "object" || typeof org.id !== "string" || typeof org.name !== "string")) throw new Error("organization-unavailable");
      if (!current()) return false;
      setOrganization(org);
      setOrganizationConfirmed(true);
      setOrgTimezone(org?.timezone ?? "Asia/Kolkata");
      if (!org) { setBranches([]); setTeams([]); setRoles([]); setEmployees([]); return true; }
      const query = `?organizationId=${encodeURIComponent(org.id)}`;
      const [branchResponse, teamResponse, roleResponse, employeeResponse] = await Promise.all([
        fetch(`${ORG_PATH}/branches${query}`, { credentials: "include", cache: "no-store" }),
        fetch(`${ORG_PATH}/teams${query}`, { credentials: "include", cache: "no-store" }),
        fetch(`${ORG_PATH}/roles${query}`, { credentials: "include", cache: "no-store" }),
        fetch(`${ORG_PATH}/employees${query}`, { credentials: "include", cache: "no-store" })
      ]);
      const failedResponse = [branchResponse, teamResponse, roleResponse, employeeResponse].find(response => !response.ok);
      if (failedResponse) throw Object.assign(new Error("organization-unavailable"), { status: failedResponse.status });
      const [nextBranches, nextTeams, nextRoles, nextEmployees] = await Promise.all([
        branchResponse.json() as Promise<Branch[]>, teamResponse.json() as Promise<Team[]>,
        roleResponse.json() as Promise<JobRole[]>, employeeResponse.json() as Promise<Employee[]>
      ]);
      if (!current()) return false;
      setBranches(nextBranches); setTeams(nextTeams); setRoles(nextRoles); setEmployees(nextEmployees);
      setSelectedBranchId((current) => nextBranches.some((item) => item.id === current) ? current : nextBranches[0]?.id ?? "");
      const nextEmployeeBranchId = nextBranches.some((item) => item.id === employeeBranchIdRef.current)
        ? employeeBranchIdRef.current : nextBranches[0]?.id ?? "";
      employeeBranchIdRef.current = nextEmployeeBranchId;
      setEmployeeBranchId(nextEmployeeBranchId);
      setEmployeeTeamId((current) => nextTeams.some((item) => item.id === current && item.branchId === nextEmployeeBranchId) ? current : "");
      return true;
    } catch (cause) {
      if (!current()) return false;
      const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
      setOrganizationConfirmed(false);
      setOrganization(null); setBranches([]); setTeams([]); setRoles([]); setEmployees([]); setStaffAccount(null);
      if (status === 401) window.dispatchEvent(new Event("sense-session-ended"));
      setError(status === 403 ? "Organization access is restricted to a fully secured Owner session." : "We couldn’t load organization settings. Try again.");
      return false;
    } finally { if (current()) setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const mutate = async (path: string, method: "POST" | "PUT", body: unknown): Promise<boolean> => {
    if (pending || !active.current) return false;
    setPending(true); setError(undefined); setSuccess(undefined);
    try {
      const response = await fetch(`${ORG_PATH}${path}`, {
        method, credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw Object.assign(new Error("organization-write-failed"), { status: response.status });
      if (!active.current) return true;
      const refreshed = await load();
      if (active.current) setSuccess(refreshed ? "Organization settings saved." : "Change saved. Refresh to load the current organization state.");
      return true;
    } catch (cause) {
      const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
      if (!active.current) return false;
      if (status === 401) window.dispatchEvent(new Event("sense-session-ended"));
      setError(status === 409 ? "This record changed or the action conflicts with its current state. Your draft is preserved; refresh and review before saving again." : status === 403 ? "Sign in again before changing organization settings. Your draft is preserved." : "We couldn’t save this change. Your draft is preserved; check the details and try again.");
      return false;
    } finally { if (active.current) setPending(false); }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>, action: () => Promise<unknown>): void => {
    event.preventDefault();
    if (!pending) void action();
  };

  const requireReason = reason.trim();
  const orgBody = { name: orgName.trim(), reason: requireReason };

  const findStaff = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); setPending(true); setError(undefined); setSuccess(undefined); setStaffAccount(null);
    try {
      const response = await fetch(`${AUTH_PATH}/staff?email=${encodeURIComponent(staffEmail.trim())}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("identity-lookup-failed");
      const result = await response.json() as { account: { id: string; email: string; state: string } | null };
      if (!result.account || result.account.state !== "ACTIVE") setError("No active staff identity was found for that email.");
      else { setStaffAccount(result.account); setSuccess("Active staff identity found. Choose the employee’s home membership below."); }
    } catch { setError("We couldn’t look up that staff identity. Try again."); }
    finally { setPending(false); }
  };

  const visibleEmployeeTeams = teams.filter((item) => item.branchId === employeeBranchId);
  const visiblePermissionTeams = teams.filter((item) => item.branchId === permissionBranchId);
  const visibleOverrideTeams = teams.filter((item) => item.branchId === overrideBranchId);
  const visibleMembershipTeams = teams.filter((item) => item.branchId === membershipBranchId);
  const grantRolePermission = (): Promise<boolean> => mutate(`/roles/${encodeURIComponent(permissionRoleId)}/permissions`, "POST", {
    organizationId: organization?.id, permissionKey: permissionKey.trim(), scopeKind: permissionScope,
    ...(permissionScope === "BRANCH" || permissionScope === "TEAM" ? { branchId: permissionBranchId } : {}),
    ...(permissionScope === "TEAM" ? { teamId: permissionTeamId } : {}), reason: requireReason
  });
  const updateCreationPresentation = async (role: JobRole): Promise<void> => {
    const creationPresentation = creationPresentationDrafts[role.id] ?? role.creationPresentation ?? "";
    setPending(true); setError(undefined); setSuccess(undefined);
    try {
      const response = await fetch(`${ORG_PATH}/roles/${encodeURIComponent(role.id)}/creation-presentation`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
        body: JSON.stringify({ organizationId: organization?.id, creationPresentation: creationPresentation || null,
          expectedCreationPresentation: role.creationPresentation ?? null, reason: creationPresentationReason.trim() })
      });
      if (!response.ok) throw Object.assign(new Error("role-presentation-write-failed"), { status: response.status });
      await load();
      setCreationPresentationReason("");
      setCreationPresentationDrafts({});
      setSuccess("Task creation presentation saved.");
    } catch (cause) {
      const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
      setError(status === 409
        ? "This role changed elsewhere. Refresh the role list and review its current presentation before saving."
        : status === 403 ? "Sign in again before changing organization settings." : "We couldn’t save this change. Check the details and try again.");
    } finally { setPending(false); }
  };
  const grantEmployeeOverride = (employeeId: string): Promise<boolean> => mutate(`/employees/${encodeURIComponent(employeeId)}/permissions`, "POST", {
    organizationId: organization?.id, permissionKey: overridePermissionKey.trim(), effect: overrideEffect, scopeKind: overrideScope,
    ...(overrideScope === "BRANCH" || overrideScope === "TEAM" ? { branchId: overrideBranchId } : {}),
    ...(overrideScope === "TEAM" ? { teamId: overrideTeamId } : {}),
    ...(overrideExpiresAt ? { expiresAt: new Date(overrideExpiresAt).toISOString() } : {}), reason: requireReason
  });
  const renderEmployee = (employee: Employee): React.JSX.Element => {
    const currentOrganization = organization;
    if (!currentOrganization) return <li key={employee.id}>Person unavailable</li>;
    return <li key={employee.id}>
          <div><strong>{employee.account.normalizedEmail}</strong><p>{employee.homeBranch.name} · {employee.homeTeam.name}{employee.jobRoleAssignments.length ? ` · ${employee.jobRoleAssignments.map((assignment) => assignment.jobRole.name).join(", ")}` : " · No job role"}</p><p>{employee.state}{employee.reportsTo ? ` · Reports to ${employee.reportsTo.account.normalizedEmail}` : ""}</p></div>
          {employee.state === "ACTIVE" && <div className="org-employee-actions">
            <button type="button" className="secondary-action" disabled={pending} onClick={() => {
              setEditingMembershipEmployeeId((current) => current === employee.id ? "" : employee.id);
              setMembershipBranchId(employee.homeBranch.id);
              setMembershipTeamId(employee.homeTeam.id);
              setMembershipReportsToId(employee.reportsTo?.id ?? "");
            }}>Manage home team</button>
            <button type="button" className="secondary-action" disabled={pending} onClick={() => {
              setEditingRolesEmployeeId((current) => current === employee.id ? "" : employee.id);
              setEditingRoleIds(employee.jobRoleAssignments.map((assignment) => assignment.jobRole.id));
            }}>Manage job roles</button>
            <button type="button" className="secondary-action" disabled={pending} onClick={() => setEditingPermissionsEmployeeId((current) => current === employee.id ? "" : employee.id)}>Manage access overrides</button>
            <button type="button" className="secondary-action" disabled={pending} onClick={() => setSuspendingEmployee(employee.id)}>Suspend access</button>
          </div>}
          {employee.state !== "EXITED" && <button type="button" className="secondary-action" disabled={pending} aria-label={`Finalize exit for ${employee.account.normalizedEmail}`} onClick={() => { setReason(""); setExitingEmployee(employee.id); }}>Finalize employee exit</button>}
          {editingMembershipEmployeeId === employee.id && employee.state === "ACTIVE" && <form className="org-role-editor" onSubmit={(event) => submit(event, async () => {
            const saved = await mutate(`/employees/${encodeURIComponent(employee.id)}/membership`, "PUT", {
              organizationId: currentOrganization.id, branchId: membershipBranchId, teamId: membershipTeamId,
              reportsToId: membershipReportsToId || null, reason: requireReason
            });
            if (saved) setEditingMembershipEmployeeId("");
          })}>
            <h4>Home branch, team and manager</h4>
            <label htmlFor={`employee-branch-edit-${employee.id}`}>Home branch</label>
            <select id={`employee-branch-edit-${employee.id}`} required value={membershipBranchId} onChange={(event) => { setMembershipBranchId(event.target.value); setMembershipTeamId(""); setMembershipReportsToId(""); }}><option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
            <label htmlFor={`employee-team-edit-${employee.id}`}>Home team</label>
            <select id={`employee-team-edit-${employee.id}`} required value={membershipTeamId} onChange={(event) => { setMembershipTeamId(event.target.value); setMembershipReportsToId(""); }}><option value="">Select a team</option>{visibleMembershipTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
            <label htmlFor={`employee-manager-edit-${employee.id}`}>Reports to</label>
            <select id={`employee-manager-edit-${employee.id}`} value={membershipReportsToId} onChange={(event) => setMembershipReportsToId(event.target.value)}><option value="">No reporting manager</option>{employees.filter((candidate) => candidate.id !== employee.id && candidate.state === "ACTIVE" && candidate.homeBranch.id === membershipBranchId && candidate.homeTeam.id === membershipTeamId).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.account.normalizedEmail}</option>)}</select>
            <label htmlFor={`employee-membership-reason-${employee.id}`}>Reason</label>
            <textarea id={`employee-membership-reason-${employee.id}`} required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
            <button disabled={pending || !membershipBranchId || !membershipTeamId || requireReason.length < 10}>{pending ? "Saving…" : "Save home membership"}</button><button type="button" className="secondary-action" disabled={pending} onClick={() => setEditingMembershipEmployeeId("")}>Cancel membership changes</button>
          </form>}
          {editingRolesEmployeeId === employee.id && <form className="org-role-editor" onSubmit={(event) => submit(event, async () => {
            const saved = await mutate(`/employees/${encodeURIComponent(employee.id)}/job-roles`, "PUT", {
              organizationId: currentOrganization.id, jobRoleIds: editingRoleIds, reason: requireReason
            });
            if (saved) setEditingRolesEmployeeId("");
          })}>
            <label htmlFor={`employee-role-edit-${employee.id}`}>Assigned job roles</label>
            <select id={`employee-role-edit-${employee.id}`} multiple value={editingRoleIds} onChange={(event) => setEditingRoleIds(Array.from(event.target.selectedOptions, (option) => option.value))}>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <label htmlFor={`employee-role-reason-${employee.id}`}>Reason</label>
            <textarea id={`employee-role-reason-${employee.id}`} required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
            <button disabled={pending || requireReason.length < 10}>{pending ? "Saving…" : "Save job roles"}</button><button type="button" className="secondary-action" disabled={pending} onClick={() => setEditingRolesEmployeeId("")}>Cancel role changes</button>
          </form>}
          {editingPermissionsEmployeeId === employee.id && employee.state === "ACTIVE" && <div className="org-role-editor">
            <h4>Explicit employee access overrides</h4>
            {employee.permissionOverrides.length ? <ul>{employee.permissionOverrides.map((override) => <li key={override.id}>
              <span><strong>{override.effect}</strong> {override.permissionKey} · {override.scopeKind}{override.branchId ? ` · ${branches.find((item) => item.id === override.branchId)?.name ?? "Branch"}` : ""}{override.teamId ? ` / ${teams.find((item) => item.id === override.teamId)?.name ?? "Team"}` : ""}{override.expiresAt ? ` · expires ${new Date(override.expiresAt).toLocaleString()}` : ""}{!isKnownPermissionKey(override.permissionKey) && <small> · Unrecognized permission — review existing grant</small>}</span>
              <button type="button" className="secondary-action" disabled={pending || requireReason.length < 10} aria-label={`Revoke ${override.permissionKey} override from ${employee.account.normalizedEmail}`} onClick={() => void mutate(`/employees/${encodeURIComponent(employee.id)}/permissions/${encodeURIComponent(override.id)}/revoke`, "PUT", { reason: requireReason })}>Revoke</button>
            </li>)}</ul> : <p className="identity-note">No explicit employee overrides are recorded.</p>}
            <form className="org-permission-form" onSubmit={(event) => submit(event, () => grantEmployeeOverride(employee.id))}>
              <label htmlFor={`override-key-${employee.id}`}>Permission key</label>
              <select id={`override-key-${employee.id}`} required value={overridePermissionKey} onChange={(event) => setOverridePermissionKey(event.target.value)}><PermissionKeyOptions /></select>
              <label htmlFor={`override-effect-${employee.id}`}>Effect</label>
              <select id={`override-effect-${employee.id}`} value={overrideEffect} onChange={(event) => setOverrideEffect(event.target.value as "ALLOW" | "DENY")}><option value="DENY">Deny</option><option value="ALLOW">Allow</option></select>
              <label htmlFor={`override-scope-${employee.id}`}>Scope</label>
              <select id={`override-scope-${employee.id}`} value={overrideScope} onChange={(event) => { setOverrideScope(event.target.value as RolePermission["scopeKind"]); setOverrideTeamId(""); }}><option value="SELF">Self</option><option value="TEAM">Team</option><option value="BRANCH">Branch</option><option value="ORGANIZATION">Organization</option></select>
              {(overrideScope === "BRANCH" || overrideScope === "TEAM") && <>
                <label htmlFor={`override-branch-${employee.id}`}>Branch</label>
                <select id={`override-branch-${employee.id}`} required value={overrideBranchId} onChange={(event) => { setOverrideBranchId(event.target.value); setOverrideTeamId(""); }}><option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
              </>}
              {overrideScope === "TEAM" && <>
                <label htmlFor={`override-team-${employee.id}`}>Team</label>
                <select id={`override-team-${employee.id}`} required value={overrideTeamId} onChange={(event) => setOverrideTeamId(event.target.value)}><option value="">Select a team</option>{visibleOverrideTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
              </>}
              <label htmlFor={`override-expiry-${employee.id}`}>Expiry (optional)</label>
              <input id={`override-expiry-${employee.id}`} type="datetime-local" value={overrideExpiresAt} onChange={(event) => setOverrideExpiresAt(event.target.value)} />
              <label htmlFor={`override-reason-${employee.id}`}>Reason</label>
              <textarea id={`override-reason-${employee.id}`} required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
              <button disabled={pending || !overridePermissionKey.trim() || requireReason.length < 10 || ((overrideScope === "BRANCH" || overrideScope === "TEAM") && !overrideBranchId) || (overrideScope === "TEAM" && !overrideTeamId)}>{pending ? "Saving…" : "Save override"}</button>
            </form>
          </div>}
        </li>;
  };
  return <section className={`identity-section org-admin org-admin--${panel}`} aria-labelledby="organization-heading">
    <div className="sessions-heading-row">
      <div><div className="eyebrow">ORGANIZATION</div><h2 id="organization-heading">{panel === "people" ? "People management" : panel === "structure" ? "Organization, branches and teams" : panel === "access" ? "Job roles and permissions" : panel === "presentation" ? "Task creation presentation" : "Branches, teams and employees"}</h2></div>
      <button className="secondary-action" type="button" onClick={() => void load()} disabled={loading || pending}>Refresh</button>
    </div>
    {loading && <p className="identity-note" role="status">Loading organization settings…</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    {success && <p className="notice" role="status">{success}</p>}
    {!loading && organizationConfirmed && !organization && <form className="identity-form" onSubmit={(event) => submit(event, () => mutate("", "POST", orgBody))}>
      <h3>Set up the organization</h3>
      <label htmlFor="org-name">Organization name</label><input id="org-name" required minLength={2} maxLength={160} value={orgName} onChange={(event) => setOrgName(event.target.value)} />
      <label htmlFor="org-reason">Reason</label><textarea id="org-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
      <button disabled={pending || orgName.trim().length < 2 || requireReason.length < 10}>{pending ? "Saving…" : "Create organization"}</button>
    </form>}
    {!loading && organizationConfirmed && organization && <>
      {panel !== "people" && <p className="identity-note">{organization.name}. Job roles, reporting lines and permissions are managed separately. An employee can hold multiple job roles.</p>}
      <div className="org-form-grid">
        {showStructure && <><form className="identity-form" onSubmit={(event) => submit(event, () => mutate("/branches", "POST", { organizationId: organization.id, name: branchName.trim(), reason: requireReason }))}>
          <h3>Add a branch</h3><label htmlFor="branch-name">Branch name</label><input id="branch-name" required maxLength={120} value={branchName} onChange={(event) => setBranchName(event.target.value)} />
          <label htmlFor="org-reason-branch">Reason</label><textarea id="org-reason-branch" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
          <button disabled={pending || !branchName.trim() || requireReason.length < 10}>Add branch</button>
        </form>
        <form className="identity-form" onSubmit={(event) => submit(event, () => mutate("/teams", "POST", { organizationId: organization.id, branchId: selectedBranchId, name: teamName.trim(), reason: requireReason }))}>
          <h3>Add a team</h3><label htmlFor="team-branch">Branch</label><select id="team-branch" required value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)}><option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
          <label htmlFor="team-name">Team name</label><input id="team-name" required maxLength={120} value={teamName} onChange={(event) => setTeamName(event.target.value)} />
          <label htmlFor="org-reason-team">Reason</label><textarea id="org-reason-team" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
          <button disabled={pending || !selectedBranchId || !teamName.trim() || requireReason.length < 10}>Add team</button>
        </form>
        </>}{showAccess && <form className="identity-form" onSubmit={(event) => submit(event, () => mutate("/roles", "POST", { organizationId: organization.id, name: roleName.trim(), description: roleDescription.trim() || undefined, reason: requireReason }))}>
          <h3>Add a job role</h3><label htmlFor="role-name">Role name</label><input id="role-name" required maxLength={120} value={roleName} onChange={(event) => setRoleName(event.target.value)} />
          <label htmlFor="role-description">Description</label><textarea id="role-description" maxLength={1000} value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} />
          <label htmlFor="org-reason-role">Reason</label><textarea id="org-reason-role" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
          <button disabled={pending || !roleName.trim() || requireReason.length < 10}>Add job role</button>
        </form>
        }
      </div>
      <div className="org-list-grid">
        {showStructure && <>
        <section aria-labelledby="branches-list-heading"><h3 id="branches-list-heading">Branches</h3>{branches.length ? <ul>{branches.map((branch) => <li key={branch.id}>{branch.name}</li>)}</ul> : <p className="identity-note">No branches yet.</p>}</section>
        <section aria-labelledby="teams-list-heading"><h3 id="teams-list-heading">Teams</h3>{teams.length ? <ul>{teams.map((team) => <li key={team.id}><span>{branches.find((branch) => branch.id === team.branchId)?.name}: {team.name} · Waiting alerts {team.waitingAlertsEnabled ? "enabled" : "disabled"}</span><button className="secondary-action" type="button" disabled={pending || requireReason.length < 3} onClick={() => void mutate(`/teams/${team.id}/waiting-alerts`, "PUT", { enabled: !team.waitingAlertsEnabled, expectedVersion: team.settingsVersion ?? 1, reason: requireReason })}>{team.waitingAlertsEnabled ? "Disable" : "Enable"} Waiting alerts for {team.name}</button></li>)}</ul> : <p className="identity-note">No teams yet.</p>}</section>
        <form className="identity-form" aria-label="Organization timezone" onSubmit={(event) => submit(event, () => mutate(`/${organization.id}/timezone`, "PUT", { timezone: orgTimezone.trim(), expectedVersion: organization.settingsVersion ?? 1, reason: requireReason }))}><h3>Recurring task timezone</h3><p className="identity-note">Schedule dates use this organization timezone. Missed dates are skipped; monthly dates use the last day in shorter months.</p><label htmlFor="organization-timezone">IANA timezone</label><input id="organization-timezone" value={orgTimezone} onChange={(event) => setOrgTimezone(event.target.value)} maxLength={80} required /><button className="secondary-action" type="submit" disabled={pending || requireReason.length < 3 || !orgTimezone.trim() || orgTimezone.trim() === (organization.timezone ?? "Asia/Kolkata")}>Change timezone</button></form>
        </>}{showAccess && <section aria-labelledby="roles-list-heading"><h3 id="roles-list-heading">Job roles</h3>{roles.length ? <ul>{roles.map((role) => <li key={role.id}>{role.name}</li>)}</ul> : <p className="identity-note">No job roles yet.</p>}</section>}
      </div>
      {(showAccess || showPresentation) && <section className="org-permission-manager" aria-label={showAccess ? "Job role permissions" : "Task creation presentation"}>
        {showPresentation && <section aria-labelledby="role-creation-presentation-heading">
          <h3 id="role-creation-presentation-heading">Task creation presentation</h3>
          <p className="identity-note">Changes the task form only; permissions stay the same. Unclassified roles use the generic Employee form.</p>
          {roles.map((role) => {
            const value = creationPresentationDrafts[role.id] ?? role.creationPresentation ?? "";
            return <form className="org-permission-form" key={role.id} aria-label={`${role.name} task creation presentation`} onSubmit={(event) => submit(event, () => updateCreationPresentation(role))}>
              <label htmlFor={`role-presentation-${role.id}`}>{role.name} presentation</label>
              <select id={`role-presentation-${role.id}`} value={value} onChange={(event) => setCreationPresentationDrafts((current) => ({ ...current, [role.id]: event.target.value as CreationPresentation | "" }))}>
                <option value="">Unclassified (generic Employee)</option><option value="EMPLOYEE">Employee</option><option value="LEADER">Leader</option><option value="SITE">Site</option>
              </select>
              <label htmlFor={`role-presentation-reason-${role.id}`}>Reason</label>
              <textarea id={`role-presentation-reason-${role.id}`} required minLength={10} maxLength={1000} value={creationPresentationReason} onChange={(event) => setCreationPresentationReason(event.target.value)} />
              <button type="submit" disabled={pending || creationPresentationReason.trim().length < 10 || value === (role.creationPresentation ?? "")}>{pending ? "Saving…" : "Save presentation"}</button>
            </form>;
          })}
        </section>
        }
        {showAccess && <><h3 id="role-permissions-heading">Job role permission bundles</h3>
        <p className="identity-note">Permissions are granted explicitly to a job role. Role names do not grant access by themselves.</p>
        {roles.length === 0 ? <p className="identity-note">Create a job role before configuring permissions.</p> : <>
          <form className="org-permission-form" onSubmit={(event) => submit(event, grantRolePermission)}>
            <label htmlFor="permission-role">Job role</label>
            <select id="permission-role" required value={permissionRoleId} onChange={(event) => setPermissionRoleId(event.target.value)}>
              <option value="">Select a job role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            <label htmlFor="permission-key">Permission key</label>
            <select id="permission-key" required value={permissionKey} onChange={(event) => setPermissionKey(event.target.value)}><PermissionKeyOptions /></select>
            <label htmlFor="permission-scope">Permission scope</label>
            <select id="permission-scope" value={permissionScope} onChange={(event) => { setPermissionScope(event.target.value as RolePermission["scopeKind"]); setPermissionTeamId(""); }}>
              <option value="ORGANIZATION">Organization</option><option value="BRANCH">Branch</option><option value="TEAM">Team</option><option value="SELF">Self</option>
            </select>
            {(permissionScope === "BRANCH" || permissionScope === "TEAM") && <>
              <label htmlFor="permission-branch">Branch</label>
              <select id="permission-branch" required value={permissionBranchId} onChange={(event) => { setPermissionBranchId(event.target.value); setPermissionTeamId(""); }}>
                <option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </>}
            {permissionScope === "TEAM" && <>
              <label htmlFor="permission-team">Team</label>
              <select id="permission-team" required value={permissionTeamId} onChange={(event) => setPermissionTeamId(event.target.value)}>
                <option value="">Select a team</option>{visiblePermissionTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </>}
            <label htmlFor="permission-reason">Reason</label>
            <textarea id="permission-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
            <button disabled={pending || !permissionRoleId || !permissionKey.trim() || requireReason.length < 10 || ((permissionScope === "BRANCH" || permissionScope === "TEAM") && !permissionBranchId) || (permissionScope === "TEAM" && !permissionTeamId)}>{pending ? "Saving…" : "Grant permission"}</button>
          </form>
          <div className="org-role-permission-list">
            {roles.map((role) => <section key={role.id} aria-labelledby={`role-permissions-${role.id}`}>
              <h4 id={`role-permissions-${role.id}`}>{role.name}</h4>
              {role.permissions?.length ? <ul>{role.permissions.map((permission) => <li key={permission.id}>
                <span><strong>{permission.permissionKey}</strong> · {permission.scopeKind}{permission.branchId ? ` · ${branches.find((item) => item.id === permission.branchId)?.name ?? "Branch"}` : ""}{permission.teamId ? ` / ${teams.find((item) => item.id === permission.teamId)?.name ?? "Team"}` : ""}{!isKnownPermissionKey(permission.permissionKey) && <small> · Unrecognized permission — review existing grant</small>}</span>
                <button type="button" className="secondary-action" disabled={pending || requireReason.length < 10} aria-label={`Revoke ${permission.permissionKey} from ${role.name}`} onClick={() => void mutate(`/roles/${encodeURIComponent(role.id)}/permissions/${encodeURIComponent(permission.id)}/revoke`, "PUT", { reason: requireReason })}>Revoke</button>
              </li>)}</ul> : <p className="identity-note">No active permissions assigned.</p>}
            </section>)}
          </div>
        </>}
        </>}
      </section>}
      {showPeople && <>
      {panel === "people" && <PeopleDirectory employees={employees}>{renderEmployee}</PeopleDirectory>}
      <details className="people-onboarding" open={panel === "all" ? true : undefined}><summary>Onboarding: create an employee record</summary>
      {panel === "people" && <p className="identity-note">Onboarding: create an invitation below → staff enrolls a passkey → create their employee record → assign explicit roles and project participation. <Link to="/projects">Manage project assignments</Link></p>}
      <form className="identity-form" onSubmit={(event) => void findStaff(event)}>
        <h3>Create an employee record</h3><p className="identity-note">The person must first accept an Owner invitation and register a passkey under Staff identity access.</p>
        <label htmlFor="employee-staff-email">Staff work email</label><div className="inline-form"><input id="employee-staff-email" type="email" required maxLength={320} value={staffEmail} onChange={(event) => { setStaffEmail(event.target.value); setStaffAccount(null); }} /><button type="submit" disabled={pending || !staffEmail.trim()}>Find active identity</button></div>
      </form>
      {staffAccount && !employees.some((employee) => employee.account.id === staffAccount.id) && <form className="identity-form" onSubmit={(event) => submit(event, () => mutate("/employees", "POST", {
        organizationId: organization.id, accountId: staffAccount.id, branchId: employeeBranchId, teamId: employeeTeamId,
        jobRoleIds: employeeRoleIds, ...(managerId ? { reportsToId: managerId } : {}), ...(employeeCode.trim() ? { employeeCode: employeeCode.trim() } : {}),
        hiredAt, reason: requireReason
      }))}>
        <p className="resolved-account">Staff identity: <strong>{staffAccount.email}</strong></p>
        <label htmlFor="employee-branch">Home branch</label><select id="employee-branch" required value={employeeBranchId} onChange={(event) => { employeeBranchIdRef.current = event.target.value; setEmployeeBranchId(event.target.value); setEmployeeTeamId(""); }}><option value="">Select a branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        <label htmlFor="employee-team">Home team</label><select id="employee-team" required value={employeeTeamId} onChange={(event) => setEmployeeTeamId(event.target.value)}><option value="">Select a team</option>{visibleEmployeeTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
        <label htmlFor="employee-roles">Job roles</label><select id="employee-roles" multiple value={employeeRoleIds} onChange={(event) => setEmployeeRoleIds(Array.from(event.target.selectedOptions, (option) => option.value))}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select>
        <label htmlFor="employee-manager">Reports to</label><select id="employee-manager" value={managerId} onChange={(event) => setManagerId(event.target.value)}><option value="">No reporting manager</option>{employees.filter((employee) => employee.state === "ACTIVE" && employee.homeBranch.id === employeeBranchId && employee.homeTeam.id === employeeTeamId).map((employee) => <option key={employee.id} value={employee.id}>{employee.account.normalizedEmail}</option>)}</select>
        <label htmlFor="employee-code">Employee code (optional)</label><input id="employee-code" maxLength={64} value={employeeCode} onChange={(event) => setEmployeeCode(event.target.value)} />
        <label htmlFor="employee-hired-at">Employment start date</label><input id="employee-hired-at" type="date" required value={hiredAt} onChange={(event) => setHiredAt(event.target.value)} />
        <label htmlFor="employee-reason">Reason for employee setup</label><textarea id="employee-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        <button disabled={pending || !employeeBranchId || !employeeTeamId || requireReason.length < 10}>{pending ? "Saving…" : "Create employee"}</button>
      </form>}
      </details>
      {panel !== "people" && <section className="org-employees" aria-labelledby="employees-heading"><h3 id="employees-heading">Employees</h3>{employees.length ? <ul className="org-employee-list">{employees.map(renderEmployee)}</ul> : <p className="identity-note">No employees have been added.</p>}</section>}
      {suspendingEmployee && <form className="identity-form" onSubmit={(event) => submit(event, async () => { if (await mutate(`/employees/${encodeURIComponent(suspendingEmployee)}/suspend`, "PUT", { reason: requireReason })) setSuspendingEmployee(""); })}>
        <h3>Confirm employee suspension</h3><p className="identity-note">This immediately blocks sign-in and revokes every current session. It does not finalize employment exit or change project/task ownership.</p>
        <label htmlFor="suspend-reason">Reason</label><textarea id="suspend-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        <div className="identity-actions"><button disabled={pending || requireReason.length < 10}>Confirm suspension</button><button type="button" className="secondary-action" onClick={() => setSuspendingEmployee("")}>Cancel</button></div>
      </form>}
      {exitingEmployee && <form className="identity-form" onSubmit={(event) => submit(event, async () => { if (await mutate(`/employees/${encodeURIComponent(exitingEmployee)}/exit`, "POST", { reason: requireReason })) setExitingEmployee(""); })}>
        <h3>Finalize employee exit</h3><p className="identity-note">Access and sessions end immediately. Unfinished owned tasks wait for individual reassignment; Active projects led by this employee go On Hold until you appoint a replacement. Completed work and history are retained.</p>
        <label htmlFor="exit-reason">Exit reason</label><textarea id="exit-reason" required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        <div className="identity-actions"><button disabled={pending || requireReason.length < 10}>Finalize exit</button><button type="button" className="secondary-action" onClick={() => setExitingEmployee("")}>Cancel</button></div>
      </form>}
      </>}
    </>}
  </section>;
}

export function TeamWorkspace({ session }: { session: Session }): React.JSX.Element {
  const active = useRef(true);
  const requestId = useRef(0);
  const [canManage, setCanManage] = useState(false);
  useEffect(() => { active.current = true; return () => { active.current = false; requestId.current += 1; }; }, []);
  const [employees, setEmployees] = useState<ManagedEmployee[]>([]);
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [managerByEmployee, setManagerByEmployee] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [reason, setReason] = useState("");

  const load = useCallback(async (): Promise<void> => {
    const request = ++requestId.current;
    if (!active.current) return;
    setLoading(true); setError(undefined);
    try {
      const response = await fetch(`${ORG_PATH}/team/employees`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw Object.assign(new Error("team-unavailable"), { status: response.status });
      const result = await response.json() as { employees: ManagedEmployee[]; managerOptions: ManagerOption[]; capabilities?: { canManageReporting: boolean } };
      if (!active.current || request !== requestId.current) return;
      setCanManage(result.capabilities?.canManageReporting === true);
      setEmployees(result.employees); setManagerOptions(result.managerOptions);
      setManagerByEmployee(Object.fromEntries(result.employees.map((employee) => [employee.id, employee.reportsToId ?? ""])));
    } catch (cause) {
      if (!active.current || request !== requestId.current) return;
      setEmployees([]); setManagerOptions([]); setManagerByEmployee({}); setCanManage(false);
      const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
      if (status === 401) window.dispatchEvent(new Event("sense-session-ended"));
      setError(status === 403 || status === 404
        ? "This account does not have an active team-management grant. Ask the Owner to review your team permissions."
        : "We couldn’t load the managed team. Try again.");
    } finally { if (active.current && request === requestId.current) setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateManager = async (event: React.FormEvent<HTMLFormElement>, employeeId: string): Promise<void> => {
    event.preventDefault();
    if (pendingEmployeeId || !canManage || !active.current) return;
    setPendingEmployeeId(employeeId); setError(undefined); setSuccess(undefined);
    try {
      const response = await fetch(`${ORG_PATH}/team/employees/${encodeURIComponent(employeeId)}/reporting`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
        body: JSON.stringify({ reportsToId: managerByEmployee[employeeId], reason: reason.trim() })
      });
      if (!response.ok) throw Object.assign(new Error("team-update-failed"), { status: response.status });
      if (!active.current) return;
      await load(); if (active.current) setSuccess("Reporting relationship saved.");
    } catch (cause) {
      const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
      setError(status === 403 ? "Your team-management permission changed. Refresh your session and try again." : "We couldn’t save this reporting change. Review the details and try again.");
    } finally { if (active.current) setPendingEmployeeId(undefined); }
  };

  return <div className="team-workspace">
    <div className="sessions-heading-row"><p className="identity-note">This list includes only active employees in your reporting team. Reporting changes require an explicit team-scoped grant and a reason.</p><button type="button" className="secondary-action" onClick={() => void load()} disabled={loading || pendingEmployeeId !== undefined}>Refresh team</button></div>
    {loading && <p role="status" className="identity-note">Loading managed team…</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    {success && <p role="status" className="notice">{success}</p>}
    {!loading && !error && employees.length === 0 && <p role="status" className="identity-note">You do not currently manage any employees.</p>}
    {!loading && employees.length > 0 && <ul className="org-employee-list">{employees.map((employee) => <li key={employee.id}>
      <div><strong>{employee.account.normalizedEmail}</strong><p>{employee.employeeCode ? `Employee ${employee.employeeCode} · ` : ""}{employee.jobRoleAssignments.map((assignment) => assignment.jobRole.name).join(", ") || "No job role"}</p></div>
      {canManage ? <form className="team-reporting-form" onSubmit={(event) => void updateManager(event, employee.id)}>
        <label htmlFor={`team-manager-${employee.id}`}>Reports to</label>
        <select id={`team-manager-${employee.id}`} required value={managerByEmployee[employee.id] ?? ""} onChange={(event) => setManagerByEmployee((current) => ({ ...current, [employee.id]: event.target.value }))}>
          <option value="">Choose a reporting manager</option>{managerOptions.filter(manager => manager.id !== employee.id).map((manager) => <option key={manager.id} value={manager.id}>{manager.email}</option>)}
        </select>
        <label htmlFor={`team-reporting-reason-${employee.id}`}>Reason</label>
        <textarea id={`team-reporting-reason-${employee.id}`} required minLength={10} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
        <button disabled={pendingEmployeeId !== undefined || !managerByEmployee[employee.id] || reason.trim().length < 10}>{pendingEmployeeId === employee.id ? "Saving…" : "Save reporting line"}</button>
      </form> : <p className="identity-note">Reporting line: {managerOptions.find(manager => manager.id === employee.reportsToId)?.email ?? "Not available"}. Read-only team access.</p>}
    </li>)}</ul>}
  </div>;
}

