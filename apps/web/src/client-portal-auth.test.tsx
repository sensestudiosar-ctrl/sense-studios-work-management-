import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { ClientPortalAuth } from "./client-portal-auth.js";

const { startRegistration } = vi.hoisted(() => ({ startRegistration: vi.fn() }));
vi.mock("@simplewebauthn/browser", () => ({ startRegistration }));

const session = {
  account: { id: "client-account-1", email: "client@example.test", kind: "CLIENT" as const },
  csrfToken: "client-csrf-token",
  activePasskeyCount: 0
};

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function stubFetch(fetchMock: ReturnType<typeof vi.fn>): void {
  vi.stubGlobal("fetch", fetchMock);
}

beforeEach(() => {
  vi.restoreAllMocks();
  startRegistration.mockReset();
  localStorage.clear();
});

describe("client portal identity and security", () => {
  it("requests a generic one-time code, verifies it, then restores the client session", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ accepted: true }))
      .mockResolvedValueOnce(response({ authenticated: true }))
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response([]));
    stubFetch(fetchMock);
    render(<ClientPortalAuth />);

    fireEvent.change(await screen.findByLabelText("Email address"), { target: { value: "client@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send sign-in code" }));
    expect(await screen.findByRole("status")).toHaveTextContent("If this address has access, a code has been sent.");
    fireEvent.change(screen.getByLabelText("One-time code"), { target: { value: "004219" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Client portal account" })).toBeInTheDocument();
    expect(screen.getByText("client@example.test")).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/client-portal/auth/session",
      "/api/v1/client-portal/auth/code/request",
      "/api/v1/client-portal/auth/code/verify",
      "/api/v1/client-portal/auth/session",
      "/api/v1/client-portal/auth/sessions"
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({ email: "client@example.test" });
    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toEqual({ email: "client@example.test", code: "004219" });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
    expect(localStorage.length).toBe(0);
  });

  it("restores only the client identity and exposes no workspace content", async () => {
    stubFetch(vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response([])));
    render(<ClientPortalAuth />);

    expect(await screen.findByRole("heading", { name: "Client portal account" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account security" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/employee|project workspace|internal review/i)).not.toBeInTheDocument();
  });

  it("sends CSRF with passkey registration and reports browser cancellation without leaking details", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ ceremonyId: "registration-1", options: { challenge: "opaque" } }));
    stubFetch(fetchMock);
    startRegistration.mockRejectedValue(Object.assign(new Error("browser detail"), { name: "NotAllowedError" }));
    render(<ClientPortalAuth />);

    fireEvent.click(await screen.findByRole("button", { name: "Register a passkey" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Passkey registration was cancelled.");
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken }
    });
    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: { challenge: "opaque" } });
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/v1/client-portal/auth/passkeys/verify")).toBe(false);
    expect(screen.queryByText("browser detail")).not.toBeInTheDocument();
  });

  it("posts revocation with this account’s CSRF token and restores the session afterward", async () => {
    const device = {
      id: "client-session-2",
      createdAt: "2026-10-01T10:00:00.000Z",
      lastUsedAt: "2026-10-01T10:20:00.000Z",
      expiresAt: "2026-10-01T22:00:00.000Z",
      revokedAt: null,
      userAgent: "Phone browser",
      current: true
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response([device]))
      .mockResolvedValueOnce(response({}, 204))
      .mockResolvedValueOnce(response({}, 401));
    stubFetch(fetchMock);
    render(<ClientPortalAuth />);

    fireEvent.click(await screen.findByRole("button", { name: "Revoke" }));

    expect(await screen.findByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/session was revoked/i);
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "X-CSRF-Token": session.csrfToken }
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/client-portal/auth/session",
      "/api/v1/client-portal/auth/sessions",
      "/api/v1/client-portal/auth/sessions/client-session-2",
      "/api/v1/client-portal/auth/session"
    ]);
  });

  it("handles unavailable sessions and protected-action errors with safe text", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(response({}, 503));
    stubFetch(fetchMock);
    render(<ClientPortalAuth />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t load your sessions. Try again.");
    fireEvent.click(screen.getByRole("button", { name: "Register a passkey" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(await screen.findByText("We couldn’t register a passkey. Try again.")).toHaveAttribute("role", "alert");
  });
});
