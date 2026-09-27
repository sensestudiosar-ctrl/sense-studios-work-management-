import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { NotificationCenter } from "./notifications.js";

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe("notification center", () => {
  it("loads the recipient inbox and preferences only when opened, then marks a notice read", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v1/notifications" && init?.method === "PATCH") return response({ read: true });
      if (url === "/api/v1/notifications") return response({ items: [{
        id: "notice-1", category: "projects", title: "Project changed", body: "A safe summary", internalRoute: "/projects/p-1",
        critical: false, mandatory: false, createdAt: "2026-09-27T00:00:00.000Z", readAt: null
      }], nextCursor: null });
      if (url === "/api/v1/notifications/preferences") return response({ preferences: [], quietHours: null });
      if (url === "/api/v1/notifications/email-status") return response({ verified: false, available: true, items: [] });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationCenter csrfToken="csrf-test" />);

    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));
    expect(await screen.findByRole("heading", { name: "Project changed" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.slice(0, 2).map(([url]) => String(url))).toEqual([
      "/api/v1/notifications", "/api/v1/notifications/preferences"
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Mark read" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/notifications/notice-1/read", expect.objectContaining({
      method: "PATCH", headers: { "X-CSRF-Token": "csrf-test" }
    })));
  });

  it("shows an empty inbox and a recoverable load error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(response({ preferences: [], quietHours: null }))
      .mockResolvedValueOnce(response({ verified: false, available: false, items: [] }))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
      .mockResolvedValueOnce(response({ preferences: [], quietHours: null }))
      .mockResolvedValueOnce(response({ verified: false, available: false, items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationCenter csrfToken="csrf-test" />);
    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));
    expect(await screen.findByText(/Your inbox is clear/)).toBeInTheDocument();
    expect(await screen.findByText(/Email verification is unavailable until transactional email is configured/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load your notifications/i);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("requests a verification code and verifies it without retaining the code after success", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v1/notifications/email-status") return response({ verified: false, available: true, items: [] });
      if (url === "/api/v1/notifications/email-verification" && init?.method === "POST") return response({ sent: true });
      if (url === "/api/v1/notifications/email-verification/verify" && init?.method === "POST") return response({ verified: true });
      if (url === "/api/v1/notifications/preferences") return response({ preferences: [], quietHours: null });
      if (url === "/api/v1/notifications") return response({ items: [], nextCursor: null });
      return response({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationCenter csrfToken="csrf-test" />);
    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));
    expect(await screen.findByText(/Email address not verified/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Send or resend verification code" }));
    expect(await screen.findByText(/A verification code was sent/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/notifications/email-verification", expect.objectContaining({
      method: "POST", credentials: "include", headers: { "X-CSRF-Token": "csrf-test" }
    }));

    const codeInput = screen.getByLabelText("Six-digit verification code");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));
    expect(await screen.findByText("Email address verified.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/notifications/email-verification/verify", expect.objectContaining({
      method: "POST", credentials: "include", headers: { "X-CSRF-Token": "csrf-test", "Content-Type": "application/json" },
      body: JSON.stringify({ code: "123456" })
    }));
    expect(screen.queryByLabelText("Six-digit verification code")).not.toBeInTheDocument();
    expect(screen.queryByText("123456")).not.toBeInTheDocument();
  });

  it("keeps verification request and verification errors recoverable", async () => {
    let failRequest = true;
    let failVerify = true;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v1/notifications/email-status") return response({ verified: false, available: true, items: [] });
      if (url === "/api/v1/notifications/preferences") return response({ preferences: [], quietHours: null });
      if (url === "/api/v1/notifications") return response({ items: [], nextCursor: null });
      if (url === "/api/v1/notifications/email-verification" && init?.method === "POST") {
        if (failRequest) { failRequest = false; return response({}, 503); }
        return response({ sent: true });
      }
      if (url === "/api/v1/notifications/email-verification/verify" && init?.method === "POST") {
        if (failVerify) { failVerify = false; return response({}, 400); }
        return response({ verified: true });
      }
      return response({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationCenter csrfToken="csrf-test" />);
    fireEvent.click(screen.getByRole("button", { name: "Open notifications" }));
    await screen.findByText(/Email address not verified/);
    fireEvent.click(screen.getByRole("button", { name: "Send or resend verification code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t send a verification code/i);
    fireEvent.click(screen.getByRole("button", { name: "Send or resend verification code" }));
    expect(await screen.findByText(/A verification code was sent/)).toBeInTheDocument();
    const codeInput = screen.getByLabelText("Six-digit verification code");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t verify that code/i);
    expect(codeInput).toHaveValue("123456");
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));
    expect(await screen.findByText("Email address verified.")).toBeInTheDocument();
  });
});
