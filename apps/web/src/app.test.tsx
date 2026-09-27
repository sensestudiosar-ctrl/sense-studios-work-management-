import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, vi } from "vitest";
import { App } from "./app.js";

const { startAuthentication, startRegistration } = vi.hoisted(() => ({ startAuthentication: vi.fn(), startRegistration: vi.fn() }));
vi.mock("@simplewebauthn/browser", () => ({ startAuthentication, startRegistration }));

const account = { id: "acct_1", email: "owner@example.test", kind: "OWNER" as const };
const session = { account, csrfToken: "csrf-test-token" };

function renderApp(path = "/"): void {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function stubFetchWithCrmSetup(fetchMock: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>): void {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => String(input) === "/api/v1/crm/setup"
    ? Promise.resolve(response({ branches: [], sources: [], owner: false }))
    : fetchMock(input, init)));
}

beforeEach(() => {
  vi.restoreAllMocks();
  startAuthentication.mockReset();
  startRegistration.mockReset();
  Object.defineProperty(window, "PublicKeyCredential", { configurable: true, value: class {} });
});

describe("identity authentication shell", () => {
  it("restores the session and shows only the authenticated identity", async () => {
    stubFetchWithCrmSetup(vi.fn(async (input: RequestInfo | URL) => String(input).startsWith("/api/v1/approvals/attention") ? response({ items: [], nextCursor: null }) : response(session)));
    renderApp();

    expect(screen.getByRole("status")).toHaveTextContent(/Checking your session/);
    expect(await screen.findByRole("heading", { name: "You’re signed in." })).toBeInTheDocument();
    expect(screen.getByText("owner@example.test")).toBeInTheDocument();
    expect(screen.queryByText(/project/i)).not.toBeInTheDocument();
  });

  it("runs options, browser assertion, verification, and restores the new session", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ ceremonyId: "ceremony-1", options: { challenge: "test" } }))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(response([]));
    stubFetchWithCrmSetup(fetchMock);
    startAuthentication.mockResolvedValue({ id: "credential-response" });
    renderApp();

    fireEvent.change(await screen.findByLabelText("Work email"), { target: { value: "owner@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with passkey" }));
    expect(await screen.findByRole("heading", { name: "You’re signed in." })).toBeInTheDocument();
    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: { challenge: "test" } });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/auth/session",
      "/api/v1/auth/passkey/login/options",
      "/api/v1/auth/passkey/login/verify",
      "/api/v1/auth/session",
      "/api/v1/approvals/attention?limit=30",
      "/api/v1/auth/sessions",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({ email: "owner@example.test" });
  });

  it("shows a generic invalid response without exposing account details", async () => {
    stubFetchWithCrmSetup(vi.fn()
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({}, 401)));
    renderApp();
    fireEvent.change(await screen.findByLabelText("Work email"), { target: { value: "unknown@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with passkey" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t sign you in/i);
    expect(screen.queryByText(/unknown@example.test/i)).not.toBeInTheDocument();
  });

  it("reports network failure and passkey cancellation in generic terms", async () => {
    stubFetchWithCrmSetup(vi.fn()
      .mockResolvedValueOnce(response({}, 401))
      .mockRejectedValueOnce(new Error("offline")));
    renderApp();
    fireEvent.change(await screen.findByLabelText("Work email"), { target: { value: "owner@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with passkey" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t reach the sign-in service/i);

    startAuthentication.mockRejectedValueOnce(Object.assign(new Error("cancelled"), { name: "NotAllowedError" }));
    vi.mocked(fetch).mockResolvedValueOnce(response({ ceremonyId: "c-2", options: {} }));
    fireEvent.click(screen.getByRole("button", { name: "Continue with passkey" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/request was cancelled/i);
  });

  it("sends the session CSRF token on logout and confirms completion", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({}));
    stubFetchWithCrmSetup(fetchMock);
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByText(/You’ve signed out/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.find(([url]) => url === "/api/v1/auth/logout")?.[1]).toMatchObject({
      method: "POST",
      headers: { "X-CSRF-Token": "csrf-test-token" },
    });
  });

  it("returns to sign in when a refreshed session has been revoked", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({}, 401));
    stubFetchWithCrmSetup(fetchMock);
    renderApp();
    expect(await screen.findByRole("heading", { name: "You’re signed in." })).toBeInTheDocument();
    fireEvent.focus(window);
    await waitFor(() => expect(screen.getByLabelText("Work email")).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(/session ended/i);
  });

  it("bootstraps the first Owner and completes second passkey plus recovery acknowledgment", async () => {
    const setupSession = { ...session, ownerSetupRequired: true, activePasskeyCount: 1 };
    const secondPasskeySession = { ...session, ownerSetupRequired: true, activePasskeyCount: 2 };
    const readySession = { ...session, ownerSetupRequired: false, activePasskeyCount: 2 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ ceremonyId: "bootstrap-c", options: { challenge: "bootstrap" } }))
      .mockResolvedValueOnce(response({ authenticated: true }))
      .mockResolvedValueOnce(response(setupSession))
      .mockResolvedValueOnce(response(setupSession))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ ceremonyId: "second-c", options: { challenge: "second" } }))
      .mockResolvedValueOnce(response({ registered: true }))
      .mockResolvedValueOnce(response(secondPasskeySession))
      .mockResolvedValueOnce(response({ recoveryCode: "offline-recovery-code-once" }))
      .mockResolvedValueOnce(response({ acknowledged: true }))
      .mockResolvedValueOnce(response(readySession));
    stubFetchWithCrmSetup(fetchMock);
    startRegistration.mockResolvedValue({ id: "registration-response" });
    renderApp("/bootstrap");

    fireEvent.change(screen.getByLabelText("Owner work email"), { target: { value: "owner@example.test" } });
    fireEvent.change(screen.getByLabelText("One-time setup secret"), { target: { value: "s".repeat(40) } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Register Owner passkey" }));
    fireEvent.click(await screen.findByRole("button", { name: "Add second passkey" }));
    fireEvent.click(await screen.findByRole("button", { name: "Create offline recovery code" }));
    expect(await screen.findByLabelText("One-time offline recovery code")).toHaveValue("offline-recovery-code-once");
    fireEvent.click(screen.getByRole("checkbox", { name: /stored this recovery code offline/i }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm offline storage" }));
    expect(await screen.findByRole("heading", { name: "Staff identity access" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain("/api/v1/auth/owner/recovery-code/ack");
  });

  it("explains a rejected second passkey without reporting a network failure", async () => {
    const setupSession = { ...session, ownerSetupRequired: true, activePasskeyCount: 1 };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v1/auth/session") return response(setupSession);
      if (url === "/api/v1/auth/passkey/register/options") return response({ ceremonyId: "second-c", options: { challenge: "second" } });
      if (url === "/api/v1/approvals/attention?limit=30") return response({ items: [], nextCursor: null });
      if (url === "/api/v1/crm/setup") return response({ branches: [], sources: [] });
      if (url === "/api/v1/auth/sessions") return response([]);
      return response({}, 404);
    }));
    startRegistration.mockRejectedValue(Object.assign(new Error("Previously registered"), { code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED", name: "InvalidStateError" }));
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "Add second passkey" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/already registered.*different passkey method/i);
    expect(screen.queryByText(/couldn’t reach the identity service/i)).not.toBeInTheDocument();
  });

  it("accepts a staff invitation or recovery token and registers a passkey", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ ceremonyId: "staff-c", options: { challenge: "staff" } }))
      .mockResolvedValueOnce(response({ authenticated: true }))
      .mockResolvedValueOnce(response({ ...session, account: { ...account, kind: "STAFF" }, ownerSetupRequired: false }))
      .mockResolvedValueOnce(response({ ...session, account: { ...account, kind: "STAFF" }, ownerSetupRequired: false }))
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(response([]));
    stubFetchWithCrmSetup(fetchMock);
    startRegistration.mockResolvedValue({ id: "staff-registration" });
    renderApp("/enroll");
    fireEvent.change(screen.getByLabelText("One-time enrollment token"), { target: { value: "t".repeat(44) } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Register staff passkey" }));
    expect(await screen.findByRole("heading", { name: "You’re signed in." })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/auth/staff/invitations/options");
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toMatchObject({ token: "t".repeat(44), ceremonyId: "staff-c" });
  });

  it("recovers the Owner using the offline code and a replacement passkey", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ ceremonyId: "owner-recovery-c", options: { challenge: "owner-recovery" } }))
      .mockResolvedValueOnce(response({ authenticated: true }))
      .mockResolvedValueOnce(response({ ...session, ownerSetupRequired: true, activePasskeyCount: 1 }))
      .mockResolvedValueOnce(response({ ...session, ownerSetupRequired: true, activePasskeyCount: 1 }))
      .mockResolvedValueOnce(response([]));
    stubFetchWithCrmSetup(fetchMock);
    startRegistration.mockResolvedValue({ id: "replacement-registration" });
    renderApp("/owner-recovery");
    fireEvent.change(screen.getByLabelText("Owner work email"), { target: { value: "owner@example.test" } });
    fireEvent.change(screen.getByLabelText("Offline recovery code"), { target: { value: "r".repeat(44) } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Register replacement passkey" }));
    expect(await screen.findByRole("heading", { name: "Secure your Owner account" })).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toMatchObject({ email: "owner@example.test", code: "r".repeat(44), ceremonyId: "owner-recovery-c" });
  });

  it("creates staff invitation and Owner-authorized recovery token handoffs", async () => {
    const ownerSession = { ...session, ownerSetupRequired: false, activePasskeyCount: 2 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(ownerSession))
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ invitationToken: "invite-once-token", expiresInSeconds: 86400 }))
      .mockResolvedValueOnce(response({ account: { id: "staff-account-id", email: "staff@example.test", state: "ACTIVE" } }))
      .mockResolvedValueOnce(response({ revokedSessions: 2 }))
      .mockResolvedValueOnce(response({ recoveryToken: "recovery-once-token", expiresInSeconds: 86400 }));
    stubFetchWithCrmSetup(fetchMock);
    renderApp();
    fireEvent.change(await screen.findByLabelText("Invite staff by work email"), { target: { value: "staff@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Create invitation" }));
    expect(await screen.findByDisplayValue("invite-once-token")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide token" }));
    fireEvent.change(screen.getByLabelText("Work email for verified staff recovery"), { target: { value: "staff@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Find staff account" }));
    expect(await screen.findByText("staff@example.test", { selector: "strong" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason for recovery authorization"), { target: { value: "Employee verified on a video call." } });
    fireEvent.click(screen.getByRole("button", { name: "Revoke staff sessions" }));
    expect(await screen.findByText("2 staff sessions revoked.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /verified this staff member out of band/i }));
    fireEvent.click(screen.getByRole("button", { name: "Revoke access and authorize recovery" }));
    expect(await screen.findByDisplayValue("recovery-once-token")).toBeInTheDocument();
    expect(fetchMock.mock.calls[3]?.[1]?.headers).toMatchObject({ "X-CSRF-Token": session.csrfToken });
    expect(fetchMock.mock.calls[4]?.[0]).toBe("/api/v1/auth/staff?email=staff%40example.test");
    expect(fetchMock.mock.calls[5]?.[0]).toBe("/api/v1/auth/staff/staff-account-id/revoke-sessions");
    expect(fetchMock.mock.calls[5]?.[1]?.headers).toMatchObject({ "X-CSRF-Token": session.csrfToken });
    expect(fetchMock.mock.calls[6]?.[1]?.headers).toMatchObject({ "X-CSRF-Token": session.csrfToken });
  });

  it("shows session loading, then a readable error with retry and empty state", async () => {
    let finishSessionsRequest: (result: Response) => void = () => undefined;
    const pendingSessions = new Promise<Response>((resolve) => { finishSessionsRequest = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
      .mockReturnValueOnce(pendingSessions)
      .mockResolvedValueOnce(response([]));
    stubFetchWithCrmSetup(fetchMock);
    renderApp();

    expect(await screen.findByText("Loading your sessions…")).toBeInTheDocument();
    finishSessionsRequest(response({}, 503));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load your sessions/i);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No sessions are available.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/v1/auth/sessions")).toHaveLength(2);
  });

  it("labels the current device and revokes another session with CSRF, then refreshes the list", async () => {
    const current = {
      id: "current-id-secret-like", createdAt: "2026-09-20T10:00:00.000Z", lastUsedAt: "2026-09-26T09:00:00.000Z",
      expiresAt: "2030-01-01T00:00:00.000Z", revokedAt: null, userAgent: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36", current: true,
    };
    const other = {
      id: "other-id-secret-like", createdAt: "2026-09-18T10:00:00.000Z", lastUsedAt: null,
      expiresAt: "2030-01-01T00:00:00.000Z", revokedAt: null, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1", current: false,
    };
    const revoked = { ...other, revokedAt: "2026-09-26T10:00:00.000Z" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(response([current, other]))
      .mockResolvedValueOnce(response({}, 204))
      .mockResolvedValueOnce(response([current, revoked]));
    stubFetchWithCrmSetup(fetchMock);
    renderApp();

    expect(await screen.findByText("Chrome on Windows")).toBeInTheDocument();
    expect(screen.getByText("This device")).toBeInTheDocument();
    expect(screen.getByText("Safari on iOS")).toBeInTheDocument();
    expect(screen.queryByText(/current-id-secret-like|other-id-secret-like/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(screen.getByText("Safari on iOS").closest("li")).toHaveTextContent(/Revoked/));
    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/v1/auth/sessions/other-id-secret-like");
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRF-Token": session.csrfToken },
    });
    expect(fetchMock.mock.calls[4]?.[0]).toBe("/api/v1/auth/sessions");
  });

  it("lets the Owner grant and revoke scoped role permissions and employee overrides", async () => {
    const ownerSession = { ...session, ownerSetupRequired: false, activePasskeyCount: 2 };
    const org = { id: "org-s03", name: "Sense Studios" };
    const branch = { id: "branch-s03", organizationId: org.id, name: "Mumbai" };
    const team = { id: "team-s03", branchId: branch.id, organizationId: org.id, name: "Design" };
    const role = { id: "role-s03", name: "Team Leader" };
    const employee = {
      id: "employee-s03", state: "ACTIVE", employeeCode: null,
      account: { normalizedEmail: "designer@example.test", state: "ACTIVE" },
      homeBranch: { id: branch.id, name: branch.name }, homeTeam: { id: team.id, name: team.name },
      jobRoleAssignments: [], permissionOverrides: [], reportsTo: null,
    };
    let rolePermissions: Array<{ id: string; permissionKey: string; scopeKind: string; branchId?: string; teamId?: string }> = [];
    let employeeOverrides: Array<{ id: string; permissionKey: string; effect: "ALLOW" | "DENY"; scopeKind: string; expiresAt: null }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url === "/api/v1/auth/session") return response(ownerSession);
      if (url.startsWith("/api/v1/approvals/attention")) return response({ items: [], nextCursor: null });
      if (url === "/api/v1/auth/sessions") return response([]);
      if (url === "/api/v1/org") return response(org);
      if (url === `/api/v1/org/branches?organizationId=${org.id}`) return response([branch]);
      if (url === `/api/v1/org/teams?organizationId=${org.id}`) return response([team]);
      if (url === `/api/v1/org/roles?organizationId=${org.id}`) return response([{ ...role, permissions: rolePermissions }]);
      if (url === `/api/v1/org/employees?organizationId=${org.id}`) return response([{ ...employee, permissionOverrides: employeeOverrides }]);
      if (url === `/api/v1/org/roles/${role.id}/permissions` && method === "POST") {
        const body = JSON.parse(String(init?.body)) as { permissionKey: string; scopeKind: string; branchId: string; teamId: string };
        rolePermissions = [{ id: "role-permission-s03", ...body }];
        return response(rolePermissions[0]);
      }
      if (url === `/api/v1/org/roles/${role.id}/permissions/role-permission-s03/revoke` && method === "PUT") {
        rolePermissions = [];
        return response({ revoked: true });
      }
      if (url === `/api/v1/org/employees/${employee.id}/permissions` && method === "POST") {
        const body = JSON.parse(String(init?.body)) as { permissionKey: string; effect: "ALLOW" | "DENY"; scopeKind: string; expiresAt?: string };
        employeeOverrides = [{ id: "override-s03", ...body, expiresAt: null }];
        return response(employeeOverrides[0]);
      }
      if (url === `/api/v1/org/employees/${employee.id}/permissions/override-s03/revoke` && method === "PUT") {
        employeeOverrides = [];
        return response({ revoked: true });
      }
      return response({}, 404);
    });
    stubFetchWithCrmSetup(fetchMock);
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Manage organization" }));
    expect(await screen.findByRole("heading", { name: "Job role permission bundles" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Permission key")).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/v1/org")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Job role"), { target: { value: role.id } });
    fireEvent.change(screen.getByLabelText("Permission key"), { target: { value: "org.employee.read" } });
    fireEvent.change(screen.getByLabelText("Permission scope"), { target: { value: "TEAM" } });
    fireEvent.change(document.getElementById("permission-branch") as HTMLSelectElement, { target: { value: branch.id } });
    fireEvent.change(document.getElementById("permission-team") as HTMLSelectElement, { target: { value: team.id } });
    fireEvent.change(document.getElementById("permission-reason") as HTMLTextAreaElement, { target: { value: "Authorize team reads" } });
    fireEvent.click(screen.getByRole("button", { name: "Grant permission" }));
    const rolePermissionRow = await screen.findByText("org.employee.read");
    expect(fetchMock.mock.calls.some(([url, init]) => url === `/api/v1/org/roles/${role.id}/permissions` && init?.method === "POST" && JSON.parse(String(init.body)).teamId === team.id)).toBe(true);
    fireEvent.click(within(rolePermissionRow.closest("li") as HTMLElement).getByRole("button", { name: "Revoke org.employee.read from Team Leader" }));
    await waitFor(() => expect(rolePermissions).toHaveLength(0));

    const employeeRow = screen.getByText(employee.account.normalizedEmail).closest("li") as HTMLElement;
    fireEvent.click(within(employeeRow).getByRole("button", { name: "Manage access overrides" }));
    fireEvent.change(within(employeeRow).getByLabelText("Permission key"), { target: { value: "task.review" } });
    fireEvent.change(within(employeeRow).getByLabelText("Reason"), { target: { value: "Temporarily deny review access" } });
    fireEvent.click(within(employeeRow).getByRole("button", { name: "Save override" }));
    const overrideRow = await within(employeeRow).findByText("DENY", { selector: "strong" });
    expect(fetchMock.mock.calls.some(([url, init]) => url === `/api/v1/org/employees/${employee.id}/permissions` && init?.method === "POST" && JSON.parse(String(init.body)).effect === "DENY")).toBe(true);
    fireEvent.click(within(overrideRow.closest("li") as HTMLElement).getByRole("button", { name: "Revoke task.review override from designer@example.test" }));
    await waitFor(() => expect(employeeOverrides).toHaveLength(0));
  });

  it("shows only server-scoped team reports and sends CSRF on a reporting change", async () => {
    const staffSession = { ...session, account: { ...account, kind: "STAFF" as const } };
    const managedEmployee = {
      id: "managed-employee", employeeCode: "D-12", hiredAt: "2025-01-01", reportsToId: "leader-employee",
      account: { normalizedEmail: "report@example.test" }, jobRoleAssignments: [{ jobRole: { id: "designer-role", name: "Designer" } }]
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v1/auth/session") return response(staffSession);
      if (url.startsWith("/api/v1/approvals/attention")) return response({ items: [], nextCursor: null });
      if (url === "/api/v1/auth/sessions") return response([]);
      if (url === "/api/v1/org/team/employees") return response({ employees: [managedEmployee], managerOptions: [{ id: "leader-employee", email: "lead@example.test" }, { id: managedEmployee.id, email: "report@example.test" }] });
      if (url === `/api/v1/org/team/employees/${managedEmployee.id}/reporting` && init?.method === "PUT") return response({ changed: true });
      return response({}, 404);
    });
    stubFetchWithCrmSetup(fetchMock);
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Open team workspace" }));
    expect(await screen.findByText("report@example.test", { selector: "strong" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reports to"), { target: { value: "leader-employee" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Confirm reporting line" } });
    fireEvent.click(screen.getByRole("button", { name: "Save reporting line" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => url === `/api/v1/org/team/employees/${managedEmployee.id}/reporting` && init?.method === "PUT" && init.headers && (init.headers as Record<string, string>)["X-CSRF-Token"] === session.csrfToken && JSON.parse(String(init.body)).reportsToId === "leader-employee")).toBe(true));
    expect(await screen.findByText("Reporting relationship saved.")).toBeInTheDocument();
  });
});
