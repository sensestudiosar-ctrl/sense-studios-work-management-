import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { PERMISSION_CATALOGUE, isKnownPermissionKey } from "@sense/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PeopleDirectory } from "./people-directory.js";
const AUTH_PATH = "/api/v1/auth";
const ORG_PATH = "/api/v1/org";
function PermissionKeyOptions() {
    return _jsxs(_Fragment, { children: [_jsx("option", { value: "", children: "Choose a permission" }), PERMISSION_CATALOGUE.map(group => _jsx("optgroup", { label: group.label, children: group.permissions.map(permission => _jsx("option", { value: permission.key, children: permission.label }, permission.key)) }, group.label))] });
}
export function OrganizationAdmin({ session, panel = "all" }) {
    const active = useRef(true);
    const generation = useRef(0);
    useEffect(() => { active.current = true; return () => { active.current = false; generation.current += 1; }; }, []);
    const showStructure = panel === "all" || panel === "structure";
    const showAccess = panel === "all" || panel === "access";
    const showPresentation = panel === "all" || panel === "presentation";
    const showPeople = panel === "all" || panel === "people";
    const [organization, setOrganization] = useState(null);
    const [organizationConfirmed, setOrganizationConfirmed] = useState(false);
    const [branches, setBranches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [roles, setRoles] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState();
    const [success, setSuccess] = useState();
    const [orgName, setOrgName] = useState("");
    const [orgTimezone, setOrgTimezone] = useState("Asia/Kolkata");
    const [branchName, setBranchName] = useState("");
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [teamName, setTeamName] = useState("");
    const [roleName, setRoleName] = useState("");
    const [roleDescription, setRoleDescription] = useState("");
    const [creationPresentationDrafts, setCreationPresentationDrafts] = useState({});
    const [creationPresentationReason, setCreationPresentationReason] = useState("");
    const [permissionRoleId, setPermissionRoleId] = useState("");
    const [permissionKey, setPermissionKey] = useState("");
    const [permissionScope, setPermissionScope] = useState("ORGANIZATION");
    const [permissionBranchId, setPermissionBranchId] = useState("");
    const [permissionTeamId, setPermissionTeamId] = useState("");
    const [staffEmail, setStaffEmail] = useState("");
    const [staffAccount, setStaffAccount] = useState(null);
    const [employeeBranchId, setEmployeeBranchId] = useState("");
    const employeeBranchIdRef = useRef("");
    const [employeeTeamId, setEmployeeTeamId] = useState("");
    const [employeeRoleIds, setEmployeeRoleIds] = useState([]);
    const [editingRolesEmployeeId, setEditingRolesEmployeeId] = useState("");
    const [editingRoleIds, setEditingRoleIds] = useState([]);
    const [editingMembershipEmployeeId, setEditingMembershipEmployeeId] = useState("");
    const [membershipBranchId, setMembershipBranchId] = useState("");
    const [membershipTeamId, setMembershipTeamId] = useState("");
    const [membershipReportsToId, setMembershipReportsToId] = useState("");
    const [editingPermissionsEmployeeId, setEditingPermissionsEmployeeId] = useState("");
    const [overridePermissionKey, setOverridePermissionKey] = useState("");
    const [overrideEffect, setOverrideEffect] = useState("DENY");
    const [overrideScope, setOverrideScope] = useState("SELF");
    const [overrideBranchId, setOverrideBranchId] = useState("");
    const [overrideTeamId, setOverrideTeamId] = useState("");
    const [overrideExpiresAt, setOverrideExpiresAt] = useState("");
    const [managerId, setManagerId] = useState("");
    const [employeeCode, setEmployeeCode] = useState("");
    const [hiredAt, setHiredAt] = useState(new Date().toISOString().slice(0, 10));
    const [reason, setReason] = useState("");
    const [suspendingEmployee, setSuspendingEmployee] = useState("");
    const [exitingEmployee, setExitingEmployee] = useState("");
    const load = useCallback(async () => {
        const request = ++generation.current;
        const current = () => active.current && request === generation.current;
        if (!current())
            return false;
        setLoading(true);
        setOrganizationConfirmed(false);
        setError(undefined);
        try {
            const orgResponse = await fetch(ORG_PATH, { credentials: "include", cache: "no-store" });
            if (!orgResponse.ok)
                throw Object.assign(new Error("organization-unavailable"), { status: orgResponse.status });
            // Nest's Express adapter sends an empty successful body for a null result.
            const body = await orgResponse.text();
            const org = body.trim() ? JSON.parse(body) : null;
            if (org !== null && (typeof org !== "object" || typeof org.id !== "string" || typeof org.name !== "string"))
                throw new Error("organization-unavailable");
            if (!current())
                return false;
            setOrganization(org);
            setOrganizationConfirmed(true);
            setOrgTimezone(org?.timezone ?? "Asia/Kolkata");
            if (!org) {
                setBranches([]);
                setTeams([]);
                setRoles([]);
                setEmployees([]);
                return true;
            }
            const query = `?organizationId=${encodeURIComponent(org.id)}`;
            const [branchResponse, teamResponse, roleResponse, employeeResponse] = await Promise.all([
                fetch(`${ORG_PATH}/branches${query}`, { credentials: "include", cache: "no-store" }),
                fetch(`${ORG_PATH}/teams${query}`, { credentials: "include", cache: "no-store" }),
                fetch(`${ORG_PATH}/roles${query}`, { credentials: "include", cache: "no-store" }),
                fetch(`${ORG_PATH}/employees${query}`, { credentials: "include", cache: "no-store" })
            ]);
            const failedResponse = [branchResponse, teamResponse, roleResponse, employeeResponse].find(response => !response.ok);
            if (failedResponse)
                throw Object.assign(new Error("organization-unavailable"), { status: failedResponse.status });
            const [nextBranches, nextTeams, nextRoles, nextEmployees] = await Promise.all([
                branchResponse.json(), teamResponse.json(),
                roleResponse.json(), employeeResponse.json()
            ]);
            if (!current())
                return false;
            setBranches(nextBranches);
            setTeams(nextTeams);
            setRoles(nextRoles);
            setEmployees(nextEmployees);
            setSelectedBranchId((current) => nextBranches.some((item) => item.id === current) ? current : nextBranches[0]?.id ?? "");
            const nextEmployeeBranchId = nextBranches.some((item) => item.id === employeeBranchIdRef.current)
                ? employeeBranchIdRef.current : nextBranches[0]?.id ?? "";
            employeeBranchIdRef.current = nextEmployeeBranchId;
            setEmployeeBranchId(nextEmployeeBranchId);
            setEmployeeTeamId((current) => nextTeams.some((item) => item.id === current && item.branchId === nextEmployeeBranchId) ? current : "");
            return true;
        }
        catch (cause) {
            if (!current())
                return false;
            const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
            setOrganizationConfirmed(false);
            setOrganization(null);
            setBranches([]);
            setTeams([]);
            setRoles([]);
            setEmployees([]);
            setStaffAccount(null);
            if (status === 401)
                window.dispatchEvent(new Event("sense-session-ended"));
            setError(status === 403 ? "Organization access is restricted to a fully secured Owner session." : "We couldn’t load organization settings. Try again.");
            return false;
        }
        finally {
            if (current())
                setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    const mutate = async (path, method, body) => {
        if (pending || !active.current)
            return false;
        setPending(true);
        setError(undefined);
        setSuccess(undefined);
        try {
            const response = await fetch(`${ORG_PATH}${path}`, {
                method, credentials: "include",
                headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
                body: JSON.stringify(body)
            });
            if (!response.ok)
                throw Object.assign(new Error("organization-write-failed"), { status: response.status });
            if (!active.current)
                return true;
            const refreshed = await load();
            if (active.current)
                setSuccess(refreshed ? "Organization settings saved." : "Change saved. Refresh to load the current organization state.");
            return true;
        }
        catch (cause) {
            const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
            if (!active.current)
                return false;
            if (status === 401)
                window.dispatchEvent(new Event("sense-session-ended"));
            setError(status === 409 ? "This record changed or the action conflicts with its current state. Your draft is preserved; refresh and review before saving again." : status === 403 ? "Sign in again before changing organization settings. Your draft is preserved." : "We couldn’t save this change. Your draft is preserved; check the details and try again.");
            return false;
        }
        finally {
            if (active.current)
                setPending(false);
        }
    };
    const submit = (event, action) => {
        event.preventDefault();
        if (!pending)
            void action();
    };
    const requireReason = reason.trim();
    const orgBody = { name: orgName.trim(), reason: requireReason };
    const findStaff = async (event) => {
        event.preventDefault();
        setPending(true);
        setError(undefined);
        setSuccess(undefined);
        setStaffAccount(null);
        try {
            const response = await fetch(`${AUTH_PATH}/staff?email=${encodeURIComponent(staffEmail.trim())}`, { credentials: "include", cache: "no-store" });
            if (!response.ok)
                throw new Error("identity-lookup-failed");
            const result = await response.json();
            if (!result.account || result.account.state !== "ACTIVE")
                setError("No active staff identity was found for that email.");
            else {
                setStaffAccount(result.account);
                setSuccess("Active staff identity found. Choose the employee’s home membership below.");
            }
        }
        catch {
            setError("We couldn’t look up that staff identity. Try again.");
        }
        finally {
            setPending(false);
        }
    };
    const visibleEmployeeTeams = teams.filter((item) => item.branchId === employeeBranchId);
    const visiblePermissionTeams = teams.filter((item) => item.branchId === permissionBranchId);
    const visibleOverrideTeams = teams.filter((item) => item.branchId === overrideBranchId);
    const visibleMembershipTeams = teams.filter((item) => item.branchId === membershipBranchId);
    const grantRolePermission = () => mutate(`/roles/${encodeURIComponent(permissionRoleId)}/permissions`, "POST", {
        organizationId: organization?.id, permissionKey: permissionKey.trim(), scopeKind: permissionScope,
        ...(permissionScope === "BRANCH" || permissionScope === "TEAM" ? { branchId: permissionBranchId } : {}),
        ...(permissionScope === "TEAM" ? { teamId: permissionTeamId } : {}), reason: requireReason
    });
    const updateCreationPresentation = async (role) => {
        const creationPresentation = creationPresentationDrafts[role.id] ?? role.creationPresentation ?? "";
        setPending(true);
        setError(undefined);
        setSuccess(undefined);
        try {
            const response = await fetch(`${ORG_PATH}/roles/${encodeURIComponent(role.id)}/creation-presentation`, {
                method: "PUT", credentials: "include",
                headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
                body: JSON.stringify({ organizationId: organization?.id, creationPresentation: creationPresentation || null,
                    expectedCreationPresentation: role.creationPresentation ?? null, reason: creationPresentationReason.trim() })
            });
            if (!response.ok)
                throw Object.assign(new Error("role-presentation-write-failed"), { status: response.status });
            await load();
            setCreationPresentationReason("");
            setCreationPresentationDrafts({});
            setSuccess("Task creation presentation saved.");
        }
        catch (cause) {
            const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
            setError(status === 409
                ? "This role changed elsewhere. Refresh the role list and review its current presentation before saving."
                : status === 403 ? "Sign in again before changing organization settings." : "We couldn’t save this change. Check the details and try again.");
        }
        finally {
            setPending(false);
        }
    };
    const grantEmployeeOverride = (employeeId) => mutate(`/employees/${encodeURIComponent(employeeId)}/permissions`, "POST", {
        organizationId: organization?.id, permissionKey: overridePermissionKey.trim(), effect: overrideEffect, scopeKind: overrideScope,
        ...(overrideScope === "BRANCH" || overrideScope === "TEAM" ? { branchId: overrideBranchId } : {}),
        ...(overrideScope === "TEAM" ? { teamId: overrideTeamId } : {}),
        ...(overrideExpiresAt ? { expiresAt: new Date(overrideExpiresAt).toISOString() } : {}), reason: requireReason
    });
    const renderEmployee = (employee) => {
        const currentOrganization = organization;
        if (!currentOrganization)
            return _jsx("li", { children: "Person unavailable" }, employee.id);
        return _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: employee.account.normalizedEmail }), _jsxs("p", { children: [employee.homeBranch.name, " \u00B7 ", employee.homeTeam.name, employee.jobRoleAssignments.length ? ` · ${employee.jobRoleAssignments.map((assignment) => assignment.jobRole.name).join(", ")}` : " · No job role"] }), _jsxs("p", { children: [employee.state, employee.reportsTo ? ` · Reports to ${employee.reportsTo.account.normalizedEmail}` : ""] })] }), employee.state === "ACTIVE" && _jsxs("div", { className: "org-employee-actions", children: [_jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => {
                                setEditingMembershipEmployeeId((current) => current === employee.id ? "" : employee.id);
                                setMembershipBranchId(employee.homeBranch.id);
                                setMembershipTeamId(employee.homeTeam.id);
                                setMembershipReportsToId(employee.reportsTo?.id ?? "");
                            }, children: "Manage home team" }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => {
                                setEditingRolesEmployeeId((current) => current === employee.id ? "" : employee.id);
                                setEditingRoleIds(employee.jobRoleAssignments.map((assignment) => assignment.jobRole.id));
                            }, children: "Manage job roles" }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => setEditingPermissionsEmployeeId((current) => current === employee.id ? "" : employee.id), children: "Manage access overrides" }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => setSuspendingEmployee(employee.id), children: "Suspend access" })] }), employee.state !== "EXITED" && _jsx("button", { type: "button", className: "secondary-action", disabled: pending, "aria-label": `Finalize exit for ${employee.account.normalizedEmail}`, onClick: () => { setReason(""); setExitingEmployee(employee.id); }, children: "Finalize employee exit" }), editingMembershipEmployeeId === employee.id && employee.state === "ACTIVE" && _jsxs("form", { className: "org-role-editor", onSubmit: (event) => submit(event, async () => {
                        const saved = await mutate(`/employees/${encodeURIComponent(employee.id)}/membership`, "PUT", {
                            organizationId: currentOrganization.id, branchId: membershipBranchId, teamId: membershipTeamId,
                            reportsToId: membershipReportsToId || null, reason: requireReason
                        });
                        if (saved)
                            setEditingMembershipEmployeeId("");
                    }), children: [_jsx("h4", { children: "Home branch, team and manager" }), _jsx("label", { htmlFor: `employee-branch-edit-${employee.id}`, children: "Home branch" }), _jsxs("select", { id: `employee-branch-edit-${employee.id}`, required: true, value: membershipBranchId, onChange: (event) => { setMembershipBranchId(event.target.value); setMembershipTeamId(""); setMembershipReportsToId(""); }, children: [_jsx("option", { value: "", children: "Select a branch" }), branches.map((branch) => _jsx("option", { value: branch.id, children: branch.name }, branch.id))] }), _jsx("label", { htmlFor: `employee-team-edit-${employee.id}`, children: "Home team" }), _jsxs("select", { id: `employee-team-edit-${employee.id}`, required: true, value: membershipTeamId, onChange: (event) => { setMembershipTeamId(event.target.value); setMembershipReportsToId(""); }, children: [_jsx("option", { value: "", children: "Select a team" }), visibleMembershipTeams.map((team) => _jsx("option", { value: team.id, children: team.name }, team.id))] }), _jsx("label", { htmlFor: `employee-manager-edit-${employee.id}`, children: "Reports to" }), _jsxs("select", { id: `employee-manager-edit-${employee.id}`, value: membershipReportsToId, onChange: (event) => setMembershipReportsToId(event.target.value), children: [_jsx("option", { value: "", children: "No reporting manager" }), employees.filter((candidate) => candidate.id !== employee.id && candidate.state === "ACTIVE" && candidate.homeBranch.id === membershipBranchId && candidate.homeTeam.id === membershipTeamId).map((candidate) => _jsx("option", { value: candidate.id, children: candidate.account.normalizedEmail }, candidate.id))] }), _jsx("label", { htmlFor: `employee-membership-reason-${employee.id}`, children: "Reason" }), _jsx("textarea", { id: `employee-membership-reason-${employee.id}`, required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pending || !membershipBranchId || !membershipTeamId || requireReason.length < 10, children: pending ? "Saving…" : "Save home membership" }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => setEditingMembershipEmployeeId(""), children: "Cancel membership changes" })] }), editingRolesEmployeeId === employee.id && _jsxs("form", { className: "org-role-editor", onSubmit: (event) => submit(event, async () => {
                        const saved = await mutate(`/employees/${encodeURIComponent(employee.id)}/job-roles`, "PUT", {
                            organizationId: currentOrganization.id, jobRoleIds: editingRoleIds, reason: requireReason
                        });
                        if (saved)
                            setEditingRolesEmployeeId("");
                    }), children: [_jsx("label", { htmlFor: `employee-role-edit-${employee.id}`, children: "Assigned job roles" }), _jsx("select", { id: `employee-role-edit-${employee.id}`, multiple: true, value: editingRoleIds, onChange: (event) => setEditingRoleIds(Array.from(event.target.selectedOptions, (option) => option.value)), children: roles.map((role) => _jsx("option", { value: role.id, children: role.name }, role.id)) }), _jsx("label", { htmlFor: `employee-role-reason-${employee.id}`, children: "Reason" }), _jsx("textarea", { id: `employee-role-reason-${employee.id}`, required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pending || requireReason.length < 10, children: pending ? "Saving…" : "Save job roles" }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending, onClick: () => setEditingRolesEmployeeId(""), children: "Cancel role changes" })] }), editingPermissionsEmployeeId === employee.id && employee.state === "ACTIVE" && _jsxs("div", { className: "org-role-editor", children: [_jsx("h4", { children: "Explicit employee access overrides" }), employee.permissionOverrides.length ? _jsx("ul", { children: employee.permissionOverrides.map((override) => _jsxs("li", { children: [_jsxs("span", { children: [_jsx("strong", { children: override.effect }), " ", override.permissionKey, " \u00B7 ", override.scopeKind, override.branchId ? ` · ${branches.find((item) => item.id === override.branchId)?.name ?? "Branch"}` : "", override.teamId ? ` / ${teams.find((item) => item.id === override.teamId)?.name ?? "Team"}` : "", override.expiresAt ? ` · expires ${new Date(override.expiresAt).toLocaleString()}` : "", !isKnownPermissionKey(override.permissionKey) && _jsx("small", { children: " \u00B7 Unrecognized permission \u2014 review existing grant" })] }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending || requireReason.length < 10, "aria-label": `Revoke ${override.permissionKey} override from ${employee.account.normalizedEmail}`, onClick: () => void mutate(`/employees/${encodeURIComponent(employee.id)}/permissions/${encodeURIComponent(override.id)}/revoke`, "PUT", { reason: requireReason }), children: "Revoke" })] }, override.id)) }) : _jsx("p", { className: "identity-note", children: "No explicit employee overrides are recorded." }), _jsxs("form", { className: "org-permission-form", onSubmit: (event) => submit(event, () => grantEmployeeOverride(employee.id)), children: [_jsx("label", { htmlFor: `override-key-${employee.id}`, children: "Permission key" }), _jsx("select", { id: `override-key-${employee.id}`, required: true, value: overridePermissionKey, onChange: (event) => setOverridePermissionKey(event.target.value), children: _jsx(PermissionKeyOptions, {}) }), _jsx("label", { htmlFor: `override-effect-${employee.id}`, children: "Effect" }), _jsxs("select", { id: `override-effect-${employee.id}`, value: overrideEffect, onChange: (event) => setOverrideEffect(event.target.value), children: [_jsx("option", { value: "DENY", children: "Deny" }), _jsx("option", { value: "ALLOW", children: "Allow" })] }), _jsx("label", { htmlFor: `override-scope-${employee.id}`, children: "Scope" }), _jsxs("select", { id: `override-scope-${employee.id}`, value: overrideScope, onChange: (event) => { setOverrideScope(event.target.value); setOverrideTeamId(""); }, children: [_jsx("option", { value: "SELF", children: "Self" }), _jsx("option", { value: "TEAM", children: "Team" }), _jsx("option", { value: "BRANCH", children: "Branch" }), _jsx("option", { value: "ORGANIZATION", children: "Organization" })] }), (overrideScope === "BRANCH" || overrideScope === "TEAM") && _jsxs(_Fragment, { children: [_jsx("label", { htmlFor: `override-branch-${employee.id}`, children: "Branch" }), _jsxs("select", { id: `override-branch-${employee.id}`, required: true, value: overrideBranchId, onChange: (event) => { setOverrideBranchId(event.target.value); setOverrideTeamId(""); }, children: [_jsx("option", { value: "", children: "Select a branch" }), branches.map((branch) => _jsx("option", { value: branch.id, children: branch.name }, branch.id))] })] }), overrideScope === "TEAM" && _jsxs(_Fragment, { children: [_jsx("label", { htmlFor: `override-team-${employee.id}`, children: "Team" }), _jsxs("select", { id: `override-team-${employee.id}`, required: true, value: overrideTeamId, onChange: (event) => setOverrideTeamId(event.target.value), children: [_jsx("option", { value: "", children: "Select a team" }), visibleOverrideTeams.map((team) => _jsx("option", { value: team.id, children: team.name }, team.id))] })] }), _jsx("label", { htmlFor: `override-expiry-${employee.id}`, children: "Expiry (optional)" }), _jsx("input", { id: `override-expiry-${employee.id}`, type: "datetime-local", value: overrideExpiresAt, onChange: (event) => setOverrideExpiresAt(event.target.value) }), _jsx("label", { htmlFor: `override-reason-${employee.id}`, children: "Reason" }), _jsx("textarea", { id: `override-reason-${employee.id}`, required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pending || !overridePermissionKey.trim() || requireReason.length < 10 || ((overrideScope === "BRANCH" || overrideScope === "TEAM") && !overrideBranchId) || (overrideScope === "TEAM" && !overrideTeamId), children: pending ? "Saving…" : "Save override" })] })] })] }, employee.id);
    };
    return _jsxs("section", { className: `identity-section org-admin org-admin--${panel}`, "aria-labelledby": "organization-heading", children: [_jsxs("div", { className: "sessions-heading-row", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "ORGANIZATION" }), _jsx("h2", { id: "organization-heading", children: panel === "people" ? "People management" : panel === "structure" ? "Organization, branches and teams" : panel === "access" ? "Job roles and permissions" : panel === "presentation" ? "Task creation presentation" : "Branches, teams and employees" })] }), _jsx("button", { className: "secondary-action", type: "button", onClick: () => void load(), disabled: loading || pending, children: "Refresh" })] }), loading && _jsx("p", { className: "identity-note", role: "status", children: "Loading organization settings\u2026" }), error && _jsx("p", { className: "auth-error", role: "alert", children: error }), success && _jsx("p", { className: "notice", role: "status", children: success }), !loading && organizationConfirmed && !organization && _jsxs("form", { className: "identity-form", onSubmit: (event) => submit(event, () => mutate("", "POST", orgBody)), children: [_jsx("h3", { children: "Set up the organization" }), _jsx("label", { htmlFor: "org-name", children: "Organization name" }), _jsx("input", { id: "org-name", required: true, minLength: 2, maxLength: 160, value: orgName, onChange: (event) => setOrgName(event.target.value) }), _jsx("label", { htmlFor: "org-reason", children: "Reason" }), _jsx("textarea", { id: "org-reason", required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pending || orgName.trim().length < 2 || requireReason.length < 10, children: pending ? "Saving…" : "Create organization" })] }), !loading && organizationConfirmed && organization && _jsxs(_Fragment, { children: [panel !== "people" && _jsxs("p", { className: "identity-note", children: [organization.name, ". Job roles, reporting lines and permissions are managed separately. An employee can hold multiple job roles."] }), _jsxs("div", { className: "org-form-grid", children: [showStructure && _jsxs(_Fragment, { children: [_jsxs("form", { className: "identity-form", onSubmit: (event) => submit(event, () => mutate("/branches", "POST", { organizationId: organization.id, name: branchName.trim(), reason: requireReason })), children: [_jsx("h3", { children: "Add a branch" }), _jsx("label", { htmlFor: "branch-name", children: "Branch name" }), _jsx("input", { id: "branch-name", required: true, maxLength: 120, value: branchName, onChange: (event) => setBranchName(event.target.value) }), _jsx("label", { htmlFor: "org-reason-branch", children: "Reason" }), _jsx("textarea", { id: "org-reason-branch", required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pending || !branchName.trim() || requireReason.length < 10, children: "Add branch" })] }), _jsxs("form", { className: "identity-form", onSubmit: (event) => submit(event, () => mutate("/teams", "POST", { organizationId: organization.id, branchId: selectedBranchId, name: teamName.trim(), reason: requireReason })), children: [_jsx("h3", { children: "Add a team" }), _jsx("label", { htmlFor: "team-branch", children: "Branch" }), _jsxs("select", { id: "team-branch", required: true, value: selectedBranchId, onChange: (event) => setSelectedBranchId(event.target.value), children: [_jsx("option", { value: "", children: "Select a branch" }), branches.map((branch) => _jsx("option", { value: branch.id, children: branch.name }, branch.id))] }), _jsx("label", { htmlFor: "team-name", children: "Team name" }), _jsx("input", { id: "team-name", required: true, maxLength: 120, value: teamName, onChange: (event) => setTeamName(event.target.value) }), _jsx("label", { htmlFor: "org-reason-team", children: "Reason" }), _jsx("textarea", { id: "org-reason-team", required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pending || !selectedBranchId || !teamName.trim() || requireReason.length < 10, children: "Add team" })] })] }), showAccess && _jsxs("form", { className: "identity-form", onSubmit: (event) => submit(event, () => mutate("/roles", "POST", { organizationId: organization.id, name: roleName.trim(), description: roleDescription.trim() || undefined, reason: requireReason })), children: [_jsx("h3", { children: "Add a job role" }), _jsx("label", { htmlFor: "role-name", children: "Role name" }), _jsx("input", { id: "role-name", required: true, maxLength: 120, value: roleName, onChange: (event) => setRoleName(event.target.value) }), _jsx("label", { htmlFor: "role-description", children: "Description" }), _jsx("textarea", { id: "role-description", maxLength: 1000, value: roleDescription, onChange: (event) => setRoleDescription(event.target.value) }), _jsx("label", { htmlFor: "org-reason-role", children: "Reason" }), _jsx("textarea", { id: "org-reason-role", required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pending || !roleName.trim() || requireReason.length < 10, children: "Add job role" })] })] }), _jsxs("div", { className: "org-list-grid", children: [showStructure && _jsxs(_Fragment, { children: [_jsxs("section", { "aria-labelledby": "branches-list-heading", children: [_jsx("h3", { id: "branches-list-heading", children: "Branches" }), branches.length ? _jsx("ul", { children: branches.map((branch) => _jsx("li", { children: branch.name }, branch.id)) }) : _jsx("p", { className: "identity-note", children: "No branches yet." })] }), _jsxs("section", { "aria-labelledby": "teams-list-heading", children: [_jsx("h3", { id: "teams-list-heading", children: "Teams" }), teams.length ? _jsx("ul", { children: teams.map((team) => _jsxs("li", { children: [_jsxs("span", { children: [branches.find((branch) => branch.id === team.branchId)?.name, ": ", team.name, " \u00B7 Waiting alerts ", team.waitingAlertsEnabled ? "enabled" : "disabled"] }), _jsxs("button", { className: "secondary-action", type: "button", disabled: pending || requireReason.length < 3, onClick: () => void mutate(`/teams/${team.id}/waiting-alerts`, "PUT", { enabled: !team.waitingAlertsEnabled, expectedVersion: team.settingsVersion ?? 1, reason: requireReason }), children: [team.waitingAlertsEnabled ? "Disable" : "Enable", " Waiting alerts for ", team.name] })] }, team.id)) }) : _jsx("p", { className: "identity-note", children: "No teams yet." })] }), _jsxs("form", { className: "identity-form", "aria-label": "Organization timezone", onSubmit: (event) => submit(event, () => mutate(`/${organization.id}/timezone`, "PUT", { timezone: orgTimezone.trim(), expectedVersion: organization.settingsVersion ?? 1, reason: requireReason })), children: [_jsx("h3", { children: "Recurring task timezone" }), _jsx("p", { className: "identity-note", children: "Schedule dates use this organization timezone. Missed dates are skipped; monthly dates use the last day in shorter months." }), _jsx("label", { htmlFor: "organization-timezone", children: "IANA timezone" }), _jsx("input", { id: "organization-timezone", value: orgTimezone, onChange: (event) => setOrgTimezone(event.target.value), maxLength: 80, required: true }), _jsx("button", { className: "secondary-action", type: "submit", disabled: pending || requireReason.length < 3 || !orgTimezone.trim() || orgTimezone.trim() === (organization.timezone ?? "Asia/Kolkata"), children: "Change timezone" })] })] }), showAccess && _jsxs("section", { "aria-labelledby": "roles-list-heading", children: [_jsx("h3", { id: "roles-list-heading", children: "Job roles" }), roles.length ? _jsx("ul", { children: roles.map((role) => _jsx("li", { children: role.name }, role.id)) }) : _jsx("p", { className: "identity-note", children: "No job roles yet." })] })] }), (showAccess || showPresentation) && _jsxs("section", { className: "org-permission-manager", "aria-label": showAccess ? "Job role permissions" : "Task creation presentation", children: [showPresentation && _jsxs("section", { "aria-labelledby": "role-creation-presentation-heading", children: [_jsx("h3", { id: "role-creation-presentation-heading", children: "Task creation presentation" }), _jsx("p", { className: "identity-note", children: "Changes the task form only; permissions stay the same. Unclassified roles use the generic Employee form." }), roles.map((role) => {
                                        const value = creationPresentationDrafts[role.id] ?? role.creationPresentation ?? "";
                                        return _jsxs("form", { className: "org-permission-form", "aria-label": `${role.name} task creation presentation`, onSubmit: (event) => submit(event, () => updateCreationPresentation(role)), children: [_jsxs("label", { htmlFor: `role-presentation-${role.id}`, children: [role.name, " presentation"] }), _jsxs("select", { id: `role-presentation-${role.id}`, value: value, onChange: (event) => setCreationPresentationDrafts((current) => ({ ...current, [role.id]: event.target.value })), children: [_jsx("option", { value: "", children: "Unclassified (generic Employee)" }), _jsx("option", { value: "EMPLOYEE", children: "Employee" }), _jsx("option", { value: "LEADER", children: "Leader" }), _jsx("option", { value: "SITE", children: "Site" })] }), _jsx("label", { htmlFor: `role-presentation-reason-${role.id}`, children: "Reason" }), _jsx("textarea", { id: `role-presentation-reason-${role.id}`, required: true, minLength: 10, maxLength: 1000, value: creationPresentationReason, onChange: (event) => setCreationPresentationReason(event.target.value) }), _jsx("button", { type: "submit", disabled: pending || creationPresentationReason.trim().length < 10 || value === (role.creationPresentation ?? ""), children: pending ? "Saving…" : "Save presentation" })] }, role.id);
                                    })] }), showAccess && _jsxs(_Fragment, { children: [_jsx("h3", { id: "role-permissions-heading", children: "Job role permission bundles" }), _jsx("p", { className: "identity-note", children: "Permissions are granted explicitly to a job role. Role names do not grant access by themselves." }), roles.length === 0 ? _jsx("p", { className: "identity-note", children: "Create a job role before configuring permissions." }) : _jsxs(_Fragment, { children: [_jsxs("form", { className: "org-permission-form", onSubmit: (event) => submit(event, grantRolePermission), children: [_jsx("label", { htmlFor: "permission-role", children: "Job role" }), _jsxs("select", { id: "permission-role", required: true, value: permissionRoleId, onChange: (event) => setPermissionRoleId(event.target.value), children: [_jsx("option", { value: "", children: "Select a job role" }), roles.map((role) => _jsx("option", { value: role.id, children: role.name }, role.id))] }), _jsx("label", { htmlFor: "permission-key", children: "Permission key" }), _jsx("select", { id: "permission-key", required: true, value: permissionKey, onChange: (event) => setPermissionKey(event.target.value), children: _jsx(PermissionKeyOptions, {}) }), _jsx("label", { htmlFor: "permission-scope", children: "Permission scope" }), _jsxs("select", { id: "permission-scope", value: permissionScope, onChange: (event) => { setPermissionScope(event.target.value); setPermissionTeamId(""); }, children: [_jsx("option", { value: "ORGANIZATION", children: "Organization" }), _jsx("option", { value: "BRANCH", children: "Branch" }), _jsx("option", { value: "TEAM", children: "Team" }), _jsx("option", { value: "SELF", children: "Self" })] }), (permissionScope === "BRANCH" || permissionScope === "TEAM") && _jsxs(_Fragment, { children: [_jsx("label", { htmlFor: "permission-branch", children: "Branch" }), _jsxs("select", { id: "permission-branch", required: true, value: permissionBranchId, onChange: (event) => { setPermissionBranchId(event.target.value); setPermissionTeamId(""); }, children: [_jsx("option", { value: "", children: "Select a branch" }), branches.map((branch) => _jsx("option", { value: branch.id, children: branch.name }, branch.id))] })] }), permissionScope === "TEAM" && _jsxs(_Fragment, { children: [_jsx("label", { htmlFor: "permission-team", children: "Team" }), _jsxs("select", { id: "permission-team", required: true, value: permissionTeamId, onChange: (event) => setPermissionTeamId(event.target.value), children: [_jsx("option", { value: "", children: "Select a team" }), visiblePermissionTeams.map((team) => _jsx("option", { value: team.id, children: team.name }, team.id))] })] }), _jsx("label", { htmlFor: "permission-reason", children: "Reason" }), _jsx("textarea", { id: "permission-reason", required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pending || !permissionRoleId || !permissionKey.trim() || requireReason.length < 10 || ((permissionScope === "BRANCH" || permissionScope === "TEAM") && !permissionBranchId) || (permissionScope === "TEAM" && !permissionTeamId), children: pending ? "Saving…" : "Grant permission" })] }), _jsx("div", { className: "org-role-permission-list", children: roles.map((role) => _jsxs("section", { "aria-labelledby": `role-permissions-${role.id}`, children: [_jsx("h4", { id: `role-permissions-${role.id}`, children: role.name }), role.permissions?.length ? _jsx("ul", { children: role.permissions.map((permission) => _jsxs("li", { children: [_jsxs("span", { children: [_jsx("strong", { children: permission.permissionKey }), " \u00B7 ", permission.scopeKind, permission.branchId ? ` · ${branches.find((item) => item.id === permission.branchId)?.name ?? "Branch"}` : "", permission.teamId ? ` / ${teams.find((item) => item.id === permission.teamId)?.name ?? "Team"}` : "", !isKnownPermissionKey(permission.permissionKey) && _jsx("small", { children: " \u00B7 Unrecognized permission \u2014 review existing grant" })] }), _jsx("button", { type: "button", className: "secondary-action", disabled: pending || requireReason.length < 10, "aria-label": `Revoke ${permission.permissionKey} from ${role.name}`, onClick: () => void mutate(`/roles/${encodeURIComponent(role.id)}/permissions/${encodeURIComponent(permission.id)}/revoke`, "PUT", { reason: requireReason }), children: "Revoke" })] }, permission.id)) }) : _jsx("p", { className: "identity-note", children: "No active permissions assigned." })] }, role.id)) })] })] })] }), showPeople && _jsxs(_Fragment, { children: [panel === "people" && _jsx(PeopleDirectory, { employees: employees, children: renderEmployee }), _jsxs("details", { className: "people-onboarding", open: panel === "all" ? true : undefined, children: [_jsx("summary", { children: "Onboarding: create an employee record" }), panel === "people" && _jsxs("p", { className: "identity-note", children: ["Onboarding: create an invitation below \u2192 staff enrolls a passkey \u2192 create their employee record \u2192 assign explicit roles and project participation. ", _jsx(Link, { to: "/projects", children: "Manage project assignments" })] }), _jsxs("form", { className: "identity-form", onSubmit: (event) => void findStaff(event), children: [_jsx("h3", { children: "Create an employee record" }), _jsx("p", { className: "identity-note", children: "The person must first accept an Owner invitation and register a passkey under Staff identity access." }), _jsx("label", { htmlFor: "employee-staff-email", children: "Staff work email" }), _jsxs("div", { className: "inline-form", children: [_jsx("input", { id: "employee-staff-email", type: "email", required: true, maxLength: 320, value: staffEmail, onChange: (event) => { setStaffEmail(event.target.value); setStaffAccount(null); } }), _jsx("button", { type: "submit", disabled: pending || !staffEmail.trim(), children: "Find active identity" })] })] }), staffAccount && !employees.some((employee) => employee.account.id === staffAccount.id) && _jsxs("form", { className: "identity-form", onSubmit: (event) => submit(event, () => mutate("/employees", "POST", {
                                            organizationId: organization.id, accountId: staffAccount.id, branchId: employeeBranchId, teamId: employeeTeamId,
                                            jobRoleIds: employeeRoleIds, ...(managerId ? { reportsToId: managerId } : {}), ...(employeeCode.trim() ? { employeeCode: employeeCode.trim() } : {}),
                                            hiredAt, reason: requireReason
                                        })), children: [_jsxs("p", { className: "resolved-account", children: ["Staff identity: ", _jsx("strong", { children: staffAccount.email })] }), _jsx("label", { htmlFor: "employee-branch", children: "Home branch" }), _jsxs("select", { id: "employee-branch", required: true, value: employeeBranchId, onChange: (event) => { employeeBranchIdRef.current = event.target.value; setEmployeeBranchId(event.target.value); setEmployeeTeamId(""); }, children: [_jsx("option", { value: "", children: "Select a branch" }), branches.map((branch) => _jsx("option", { value: branch.id, children: branch.name }, branch.id))] }), _jsx("label", { htmlFor: "employee-team", children: "Home team" }), _jsxs("select", { id: "employee-team", required: true, value: employeeTeamId, onChange: (event) => setEmployeeTeamId(event.target.value), children: [_jsx("option", { value: "", children: "Select a team" }), visibleEmployeeTeams.map((team) => _jsx("option", { value: team.id, children: team.name }, team.id))] }), _jsx("label", { htmlFor: "employee-roles", children: "Job roles" }), _jsx("select", { id: "employee-roles", multiple: true, value: employeeRoleIds, onChange: (event) => setEmployeeRoleIds(Array.from(event.target.selectedOptions, (option) => option.value)), children: roles.map((role) => _jsx("option", { value: role.id, children: role.name }, role.id)) }), _jsx("label", { htmlFor: "employee-manager", children: "Reports to" }), _jsxs("select", { id: "employee-manager", value: managerId, onChange: (event) => setManagerId(event.target.value), children: [_jsx("option", { value: "", children: "No reporting manager" }), employees.filter((employee) => employee.state === "ACTIVE" && employee.homeBranch.id === employeeBranchId && employee.homeTeam.id === employeeTeamId).map((employee) => _jsx("option", { value: employee.id, children: employee.account.normalizedEmail }, employee.id))] }), _jsx("label", { htmlFor: "employee-code", children: "Employee code (optional)" }), _jsx("input", { id: "employee-code", maxLength: 64, value: employeeCode, onChange: (event) => setEmployeeCode(event.target.value) }), _jsx("label", { htmlFor: "employee-hired-at", children: "Employment start date" }), _jsx("input", { id: "employee-hired-at", type: "date", required: true, value: hiredAt, onChange: (event) => setHiredAt(event.target.value) }), _jsx("label", { htmlFor: "employee-reason", children: "Reason for employee setup" }), _jsx("textarea", { id: "employee-reason", required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pending || !employeeBranchId || !employeeTeamId || requireReason.length < 10, children: pending ? "Saving…" : "Create employee" })] })] }), panel !== "people" && _jsxs("section", { className: "org-employees", "aria-labelledby": "employees-heading", children: [_jsx("h3", { id: "employees-heading", children: "Employees" }), employees.length ? _jsx("ul", { className: "org-employee-list", children: employees.map(renderEmployee) }) : _jsx("p", { className: "identity-note", children: "No employees have been added." })] }), suspendingEmployee && _jsxs("form", { className: "identity-form", onSubmit: (event) => submit(event, async () => { if (await mutate(`/employees/${encodeURIComponent(suspendingEmployee)}/suspend`, "PUT", { reason: requireReason }))
                                    setSuspendingEmployee(""); }), children: [_jsx("h3", { children: "Confirm employee suspension" }), _jsx("p", { className: "identity-note", children: "This immediately blocks sign-in and revokes every current session. It does not finalize employment exit or change project/task ownership." }), _jsx("label", { htmlFor: "suspend-reason", children: "Reason" }), _jsx("textarea", { id: "suspend-reason", required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsxs("div", { className: "identity-actions", children: [_jsx("button", { disabled: pending || requireReason.length < 10, children: "Confirm suspension" }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => setSuspendingEmployee(""), children: "Cancel" })] })] }), exitingEmployee && _jsxs("form", { className: "identity-form", onSubmit: (event) => submit(event, async () => { if (await mutate(`/employees/${encodeURIComponent(exitingEmployee)}/exit`, "POST", { reason: requireReason }))
                                    setExitingEmployee(""); }), children: [_jsx("h3", { children: "Finalize employee exit" }), _jsx("p", { className: "identity-note", children: "Access and sessions end immediately. Unfinished owned tasks wait for individual reassignment; Active projects led by this employee go On Hold until you appoint a replacement. Completed work and history are retained." }), _jsx("label", { htmlFor: "exit-reason", children: "Exit reason" }), _jsx("textarea", { id: "exit-reason", required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsxs("div", { className: "identity-actions", children: [_jsx("button", { disabled: pending || requireReason.length < 10, children: "Finalize exit" }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => setExitingEmployee(""), children: "Cancel" })] })] })] })] })] });
}
export function TeamWorkspace({ session }) {
    const active = useRef(true);
    const requestId = useRef(0);
    const [canManage, setCanManage] = useState(false);
    useEffect(() => { active.current = true; return () => { active.current = false; requestId.current += 1; }; }, []);
    const [employees, setEmployees] = useState([]);
    const [managerOptions, setManagerOptions] = useState([]);
    const [managerByEmployee, setManagerByEmployee] = useState({});
    const [loading, setLoading] = useState(true);
    const [pendingEmployeeId, setPendingEmployeeId] = useState();
    const [error, setError] = useState();
    const [success, setSuccess] = useState();
    const [reason, setReason] = useState("");
    const load = useCallback(async () => {
        const request = ++requestId.current;
        if (!active.current)
            return;
        setLoading(true);
        setError(undefined);
        try {
            const response = await fetch(`${ORG_PATH}/team/employees`, { credentials: "include", cache: "no-store" });
            if (!response.ok)
                throw Object.assign(new Error("team-unavailable"), { status: response.status });
            const result = await response.json();
            if (!active.current || request !== requestId.current)
                return;
            setCanManage(result.capabilities?.canManageReporting === true);
            setEmployees(result.employees);
            setManagerOptions(result.managerOptions);
            setManagerByEmployee(Object.fromEntries(result.employees.map((employee) => [employee.id, employee.reportsToId ?? ""])));
        }
        catch (cause) {
            if (!active.current || request !== requestId.current)
                return;
            setEmployees([]);
            setManagerOptions([]);
            setManagerByEmployee({});
            setCanManage(false);
            const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
            if (status === 401)
                window.dispatchEvent(new Event("sense-session-ended"));
            setError(status === 403 || status === 404
                ? "This account does not have an active team-management grant. Ask the Owner to review your team permissions."
                : "We couldn’t load the managed team. Try again.");
        }
        finally {
            if (active.current && request === requestId.current)
                setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    const updateManager = async (event, employeeId) => {
        event.preventDefault();
        if (pendingEmployeeId || !canManage || !active.current)
            return;
        setPendingEmployeeId(employeeId);
        setError(undefined);
        setSuccess(undefined);
        try {
            const response = await fetch(`${ORG_PATH}/team/employees/${encodeURIComponent(employeeId)}/reporting`, {
                method: "PUT", credentials: "include",
                headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
                body: JSON.stringify({ reportsToId: managerByEmployee[employeeId], reason: reason.trim() })
            });
            if (!response.ok)
                throw Object.assign(new Error("team-update-failed"), { status: response.status });
            if (!active.current)
                return;
            await load();
            if (active.current)
                setSuccess("Reporting relationship saved.");
        }
        catch (cause) {
            const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
            setError(status === 403 ? "Your team-management permission changed. Refresh your session and try again." : "We couldn’t save this reporting change. Review the details and try again.");
        }
        finally {
            if (active.current)
                setPendingEmployeeId(undefined);
        }
    };
    return _jsxs("div", { className: "team-workspace", children: [_jsxs("div", { className: "sessions-heading-row", children: [_jsx("p", { className: "identity-note", children: "This list includes only active employees in your reporting team. Reporting changes require an explicit team-scoped grant and a reason." }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => void load(), disabled: loading || pendingEmployeeId !== undefined, children: "Refresh team" })] }), loading && _jsx("p", { role: "status", className: "identity-note", children: "Loading managed team\u2026" }), error && _jsx("p", { role: "alert", className: "auth-error", children: error }), success && _jsx("p", { role: "status", className: "notice", children: success }), !loading && !error && employees.length === 0 && _jsx("p", { role: "status", className: "identity-note", children: "You do not currently manage any employees." }), !loading && employees.length > 0 && _jsx("ul", { className: "org-employee-list", children: employees.map((employee) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: employee.account.normalizedEmail }), _jsxs("p", { children: [employee.employeeCode ? `Employee ${employee.employeeCode} · ` : "", employee.jobRoleAssignments.map((assignment) => assignment.jobRole.name).join(", ") || "No job role"] })] }), canManage ? _jsxs("form", { className: "team-reporting-form", onSubmit: (event) => void updateManager(event, employee.id), children: [_jsx("label", { htmlFor: `team-manager-${employee.id}`, children: "Reports to" }), _jsxs("select", { id: `team-manager-${employee.id}`, required: true, value: managerByEmployee[employee.id] ?? "", onChange: (event) => setManagerByEmployee((current) => ({ ...current, [employee.id]: event.target.value })), children: [_jsx("option", { value: "", children: "Choose a reporting manager" }), managerOptions.filter(manager => manager.id !== employee.id).map((manager) => _jsx("option", { value: manager.id, children: manager.email }, manager.id))] }), _jsx("label", { htmlFor: `team-reporting-reason-${employee.id}`, children: "Reason" }), _jsx("textarea", { id: `team-reporting-reason-${employee.id}`, required: true, minLength: 10, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) }), _jsx("button", { disabled: pendingEmployeeId !== undefined || !managerByEmployee[employee.id] || reason.trim().length < 10, children: pendingEmployeeId === employee.id ? "Saving…" : "Save reporting line" })] }) : _jsxs("p", { className: "identity-note", children: ["Reporting line: ", managerOptions.find(manager => manager.id === employee.reportsToId)?.email ?? "Not available", ". Read-only team access."] })] }, employee.id)) })] });
}
