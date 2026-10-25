import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { App } from "./app.js";
vi.mock("@simplewebauthn/browser", () => ({ startAuthentication: vi.fn(), startRegistration: vi.fn() }));
const owner = { account: { id: "owner", email: "owner@example.test", kind: "OWNER" }, csrfToken: "csrf", ownerSetupRequired: false };
const staff = { ...owner, account: { id: "staff", email: "staff@example.test", kind: "STAFF" } };
const branchA = { id: "branch-a", name: "Mumbai" }, branchB = { id: "branch-b", name: "Pune" };
const teamA = { id: "team-a", name: "Design", branchId: branchA.id }, teamB = { id: "team-b", name: "Site", branchId: branchB.id };
const person = { id: "person-a", state: "ACTIVE", employeeCode: "SS01", account: { id: "account-a", normalizedEmail: "designer@example.test", state: "ACTIVE" }, homeBranch: branchA, homeTeam: teamA, jobRoleAssignments: [], permissionOverrides: [], reportsTo: null };
const personB = { ...person, id: "person-b", employeeCode: "SS02", state: "SUSPENDED", account: { id: "account-b", normalizedEmail: "site@example.test", state: "SUSPENDED" }, homeBranch: branchB, homeTeam: teamB };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
function LocationProbe() { const location = useLocation(); return _jsxs("output", { "aria-label": "Current route", children: [location.pathname, location.search] }); }
function renderApp(path = "/people") { render(_jsxs(MemoryRouter, { initialEntries: [path], children: [_jsx(App, {}), _jsx(LocationProbe, {})] })); }
function mockApi(session = owner) {
    const mock = vi.fn(async (input, init) => {
        const path = String(input);
        if (path === "/api/v1/auth/session")
            return response(session);
        if (path === "/api/v1/org/self")
            return response({ employee: { ...person, hiredAt: "2026-10-01", reportsTo: null } });
        if (path === "/api/v1/org")
            return response({ id: "org", name: "Sense Studios" });
        if (path.startsWith("/api/v1/org/branches?"))
            return response([branchA, branchB]);
        if (path.startsWith("/api/v1/org/teams?"))
            return response([teamA, teamB]);
        if (path.startsWith("/api/v1/org/roles?"))
            return response([{ id: "role", name: "Designer", permissions: [] }]);
        if (path.startsWith("/api/v1/org/employees?"))
            return response([person, personB]);
        if (path === "/api/v1/org/team/employees")
            return response({}, 403);
        if (path === "/api/v1/auth/staff/invitations" && init?.method === "POST")
            return response({ invitationToken: "synthetic-invitation-only", expiresInSeconds: 3600 });
        if (path === "/api/v1/notifications")
            return response({ items: [], nextCursor: null });
        if (path === "/api/v1/auth/sessions")
            return response([]);
        if (path.startsWith("/api/v1/audit/"))
            return response({});
        return response({}, 404);
    });
    vi.stubGlobal("fetch", mock);
    return mock;
}
describe("People destination", () => {
    it("filters authorized people and preserves list filters through selected detail and return", async () => {
        const mock = mockApi();
        renderApp();
        expect(await screen.findByRole("heading", { name: "Employee directory" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Job role permission bundles" })).not.toBeInTheDocument();
        fireEvent.change(screen.getByRole("combobox", { name: "Branch" }), { target: { value: branchA.id } });
        expect(screen.queryByRole("link", { name: "View site@example.test" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("link", { name: "View designer@example.test" }));
        expect(await screen.findByRole("heading", { name: "designer@example.test" })).toHaveFocus();
        expect(screen.getByLabelText("Current route")).toHaveTextContent("branch=branch-a&employeeId=person-a");
        expect(screen.getByRole("button", { name: "Manage home team" })).toBeInTheDocument();
        expect(screen.queryByText("site@example.test")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("link", { name: "← Back to people" }));
        expect(await screen.findByRole("combobox", { name: "Branch" })).toHaveValue(branchA.id);
        expect(mock.mock.calls.filter(([path]) => String(path).startsWith("/api/v1/org/employees?"))).toHaveLength(1);
        expect(mock.mock.calls.some(([path]) => String(path) === "/api/v1/auth/sessions")).toBe(false);
    });
    it("does not substitute another person for an unavailable deep-link ID", async () => {
        mockApi();
        renderApp("/people?employeeId=unassigned-person");
        expect(await screen.findByRole("heading", { name: "Person unavailable" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Manage home team" })).not.toBeInTheDocument();
        expect(screen.queryByText("designer@example.test")).not.toBeInTheDocument();
    });
    it("creates an invitation through the existing CSRF-protected identity command", async () => {
        const mock = mockApi();
        renderApp();
        fireEvent.click(await screen.findByText("Staff invitations and recovery", { selector: "summary" }));
        const input = await screen.findByRole("textbox", { name: "Invite staff by work email" });
        fireEvent.change(input, { target: { value: "new.staff@example.test" } });
        fireEvent.click(screen.getByRole("button", { name: "Create invitation" }));
        expect(await screen.findByLabelText("One-time enrollment token for secure handoff")).toHaveValue("synthetic-invitation-only");
        const call = mock.mock.calls.find(([path]) => String(path) === "/api/v1/auth/staff/invitations");
        expect(call?.[1]).toMatchObject({ method: "POST", credentials: "include", headers: { "X-CSRF-Token": "csrf" } });
        expect(JSON.parse(String(call?.[1]?.body))).toEqual({ email: "new.staff@example.test" });
        fireEvent.click(screen.getByRole("button", { name: "Hide token" }));
        expect(screen.queryByLabelText("One-time enrollment token for secure handoff")).not.toBeInTheDocument();
    });
    it("gives ordinary Staff personal links and a scoped denial without reading Owner inventory", async () => {
        const mock = mockApi(staff);
        renderApp();
        expect(await screen.findByRole("alert")).toHaveTextContent(/does not have an active team-management grant/);
        expect(screen.getByRole("navigation", { name: "People workspaces" })).toHaveTextContent("My Work");
        expect(screen.getByRole("region", { name: "My employee profile" })).toHaveTextContent("Mumbai");
        expect(screen.queryByRole("textbox", { name: "Invite staff by work email" })).not.toBeInTheDocument();
        expect(mock.mock.calls.some(([path]) => String(path) === "/api/v1/org" || String(path).startsWith("/api/v1/org/employees?"))).toBe(false);
    });
    it.each(["/people", "/people?employeeId=person-a"])("removes private People content and ignores late reads after session loss on %s", async (path) => {
        const mock = mockApi();
        let resolveEmployees;
        mock.mockImplementation(async (input) => {
            const url = String(input);
            if (url.startsWith("/api/v1/org/employees?"))
                return new Promise(resolve => { resolveEmployees = resolve; });
            if (url === "/api/v1/auth/session")
                return response(owner);
            if (url === "/api/v1/org")
                return response({ id: "org", name: "Sense Studios" });
            if (url.startsWith("/api/v1/org/branches?"))
                return response([branchA]);
            return response([]);
        });
        renderApp(path);
        await waitFor(() => expect(resolveEmployees).toBeDefined());
        fireEvent(window, new Event("sense-session-ended"));
        expect(await screen.findByRole("heading", { name: "Sign in to view People" })).toBeInTheDocument();
        await act(async () => resolveEmployees(response([person])));
        expect(screen.queryByText("designer@example.test")).not.toBeInTheDocument();
        expect(screen.queryByRole("navigation", { name: "Workspace navigation" })).not.toBeInTheDocument();
    });
    it.each(["structure", "access", "presentation"])("opens the focused %s settings without mounting the employee editor", async (panel) => {
        mockApi();
        renderApp(`/settings?section=organization&panel=${panel}`);
        const heading = panel === "structure" ? "Organization, branches and teams" : panel === "access" ? "Job roles and permissions" : "Task creation presentation";
        expect((await screen.findAllByRole("heading", { name: heading })).length).toBeGreaterThan(0);
        expect(screen.queryByRole("heading", { name: "Employees" })).not.toBeInTheDocument();
        expect(screen.queryByRole("textbox", { name: "Invite staff by work email" })).not.toBeInTheDocument();
        if (panel !== "access")
            expect(screen.queryByRole("heading", { name: "Job role permission bundles" })).not.toBeInTheDocument();
        expect(within(screen.getByRole("navigation", { name: "Settings sections" })).getByRole("link", { name: "People management" })).toHaveAttribute("href", "/people");
    });
});
