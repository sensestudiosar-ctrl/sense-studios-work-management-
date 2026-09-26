import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => {
  vi.restoreAllMocks();
  startAuthentication.mockReset();
  startRegistration.mockReset();
  Object.defineProperty(window, "PublicKeyCredential", { configurable: true, value: class {} });
});

describe("identity authentication shell", () => {
  it("restores the session and shows only the authenticated identity", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(session)));
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
      .mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetchMock);
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
      "/api/v1/auth/sessions",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({ email: "owner@example.test" });
  });

  it("shows a generic invalid response without exposing account details", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({}, 401)));
    renderApp();
    fireEvent.change(await screen.findByLabelText("Work email"), { target: { value: "unknown@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with passkey" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t sign you in/i);
    expect(screen.queryByText(/unknown@example.test/i)).not.toBeInTheDocument();
  });

  it("reports network failure and passkey cancellation in generic terms", async () => {
    vi.stubGlobal("fetch", vi.fn()
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
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({}));
    vi.stubGlobal("fetch", fetchMock);
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByText(/You’ve signed out/)).toBeInTheDocument();
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "POST",
      headers: { "X-CSRF-Token": "csrf-test-token" },
    });
  });

  it("returns to sign in when a refreshed session has been revoked", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({}, 401));
    vi.stubGlobal("fetch", fetchMock);
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
    vi.stubGlobal("fetch", fetchMock);
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

  it("accepts a staff invitation or recovery token and registers a passkey", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ ceremonyId: "staff-c", options: { challenge: "staff" } }))
      .mockResolvedValueOnce(response({ authenticated: true }))
      .mockResolvedValueOnce(response({ ...session, account: { ...account, kind: "STAFF" }, ownerSetupRequired: false }))
      .mockResolvedValueOnce(response({ ...session, account: { ...account, kind: "STAFF" }, ownerSetupRequired: false }))
      .mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetchMock);
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
    vi.stubGlobal("fetch", fetchMock);
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
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ invitationToken: "invite-once-token", expiresInSeconds: 86400 }))
      .mockResolvedValueOnce(response({ account: { id: "staff-account-id", email: "staff@example.test", state: "ACTIVE" } }))
      .mockResolvedValueOnce(response({ revokedSessions: 2 }))
      .mockResolvedValueOnce(response({ recoveryToken: "recovery-once-token", expiresInSeconds: 86400 }));
    vi.stubGlobal("fetch", fetchMock);
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
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({ "X-CSRF-Token": session.csrfToken });
    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/v1/auth/staff?email=staff%40example.test");
    expect(fetchMock.mock.calls[4]?.[0]).toBe("/api/v1/auth/staff/staff-account-id/revoke-sessions");
    expect(fetchMock.mock.calls[4]?.[1]?.headers).toMatchObject({ "X-CSRF-Token": session.csrfToken });
    expect(fetchMock.mock.calls[5]?.[1]?.headers).toMatchObject({ "X-CSRF-Token": session.csrfToken });
  });

  it("shows session loading, then a readable error with retry and empty state", async () => {
    let finishSessionsRequest: (result: Response) => void = () => undefined;
    const pendingSessions = new Promise<Response>((resolve) => { finishSessionsRequest = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockReturnValueOnce(pendingSessions)
      .mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetchMock);
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
      .mockResolvedValueOnce(response([current, other]))
      .mockResolvedValueOnce(response({}, 204))
      .mockResolvedValueOnce(response([current, revoked]));
    vi.stubGlobal("fetch", fetchMock);
    renderApp();

    expect(await screen.findByText("Chrome on Windows")).toBeInTheDocument();
    expect(screen.getByText("This device")).toBeInTheDocument();
    expect(screen.getByText("Safari on iOS")).toBeInTheDocument();
    expect(screen.queryByText(/current-id-secret-like|other-id-secret-like/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(screen.getByText("Safari on iOS").closest("li")).toHaveTextContent(/Revoked/));
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/v1/auth/sessions/other-id-secret-like");
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRF-Token": session.csrfToken },
    });
    expect(fetchMock.mock.calls[3]?.[0]).toBe("/api/v1/auth/sessions");
  });
});
