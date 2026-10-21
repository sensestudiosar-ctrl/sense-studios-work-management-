import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { OrganizationAdmin, TeamWorkspace } from "./organization-admin.js";

const session = { account: { id: "owner", email: "owner@example.test", kind: "OWNER" as const }, csrfToken: "csrf" };
const org = { id: "org", name: "Sense Studios" };
const branch = { id: "branch", name: "Mumbai" };
const team = { id: "team", branchId: branch.id, name: "Design" };
const employee = { id: "employee", accountId: "staff-account", state: "ACTIVE", employeeCode: "SS01", account: { id: "staff-account", normalizedEmail: "staff@example.test", state: "ACTIVE" }, homeBranch: branch, homeTeam: team, jobRoleAssignments: [], permissionOverrides: [], reportsTo: null };
const response = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
beforeEach(() => vi.restoreAllMocks());

function mockOrganization(writeStatus: () => number = () => 409): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (init?.method && init.method !== "GET") return response({}, writeStatus());
    if (path === "/api/v1/org") return response(org);
    if (path.startsWith("/api/v1/org/branches?")) return response([branch]);
    if (path.startsWith("/api/v1/org/teams?")) return response([team]);
    if (path.startsWith("/api/v1/org/roles?")) return response([{ id: "role", name: "Designer" }]);
    if (path.startsWith("/api/v1/org/employees?")) return response([employee]);
    return response({}, 404);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("organization command recovery", () => {
  it.each([
    { open: "Manage home team", reason: "employee-membership-reason-employee", save: "Save home membership", editor: "Home branch, team and manager" },
    { open: "Manage job roles", reason: "employee-role-reason-employee", save: "Save job roles", editor: "Assigned job roles" },
    { open: "Suspend access", reason: "suspend-reason", save: "Confirm suspension", editor: "Confirm employee suspension" },
    { open: "Finalize exit for staff@example.test", reason: "exit-reason", save: "Finalize exit", editor: "Finalize employee exit" },
  ])("retains $save draft on conflict and closes only after a confirmed write", async ({ open, reason, save, editor }) => {
    let status = 409;
    const mock = mockOrganization(() => status);
    render(<MemoryRouter><OrganizationAdmin session={session} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: open }));
    const input = document.getElementById(reason) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Preserve this reviewed reason" } });
    fireEvent.click(screen.getByRole("button", { name: save }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("Preserve this reviewed reason");
    expect(input.closest("form")).toHaveTextContent(editor);
    expect(screen.queryByText("Organization settings saved.")).not.toBeInTheDocument();
    status = 200;
    fireEvent.click(screen.getByRole("button", { name: save }));
    await waitFor(() => expect(document.getElementById(reason)).toBeNull());
    expect(mock.mock.calls.filter(([, init]) => init?.method)).toHaveLength(2);
    for (const [, init] of mock.mock.calls.filter(([, init]) => init?.method)) expect(init).toMatchObject({ credentials: "include", headers: { "X-CSRF-Token": "csrf" } });
  });

  it("clears the old employee inventory after a denied refresh", async () => {
    const mock = mockOrganization();
    render(<MemoryRouter><OrganizationAdmin session={session} /></MemoryRouter>);
    expect(await screen.findByText("staff@example.test")).toBeInTheDocument();
    mock.mockImplementation(async () => response({}, 403));
    fireEvent.click(within(screen.getByRole("region", { name: "Branches, teams and employees" })).getByRole("button", { name: "Refresh" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/restricted/i);
    expect(screen.queryByText("staff@example.test")).not.toBeInTheDocument();
  });

  it.each([false, true])("shows team reporting edits only for the server capability: %s", async canManageReporting => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ employees: [{ ...employee, reportsToId: "manager", hiredAt: "2026-10-01" }], managerOptions: [{ id: "manager", email: "manager@example.test" }], capabilities: { canManageReporting } })));
    render(<MemoryRouter><TeamWorkspace session={{ ...session, account: { ...session.account, kind: "STAFF" } }} /></MemoryRouter>);
    expect(await screen.findByText("staff@example.test")).toBeInTheDocument();
    if (canManageReporting) expect(screen.getByRole("button", { name: "Save reporting line" })).toBeInTheDocument();
    else { expect(screen.queryByRole("button", { name: "Save reporting line" })).not.toBeInTheDocument(); expect(screen.getByText(/Read-only team access/)).toBeInTheDocument(); }
  });

  it("clears a previously readable team after its read permission is revoked", async () => {
    let status = 200;
    vi.stubGlobal("fetch", vi.fn(async () => response({ employees: [{ ...employee, reportsToId: null }], managerOptions: [], capabilities: { canManageReporting: false } }, status)));
    render(<MemoryRouter><TeamWorkspace session={session} /></MemoryRouter>);
    expect(await screen.findByText("staff@example.test")).toBeInTheDocument(); status = 403;
    fireEvent.click(screen.getByRole("button", { name: "Refresh team" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/does not have an active team-management grant/);
    expect(screen.queryByText("staff@example.test")).not.toBeInTheDocument();
  });
});
