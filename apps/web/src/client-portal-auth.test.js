import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { ClientPortalAuth } from "./client-portal-auth.js";
const { startRegistration } = vi.hoisted(() => ({ startRegistration: vi.fn() }));
vi.mock("@simplewebauthn/browser", () => ({ startRegistration }));
const session = {
    account: { id: "client-account-1", email: "client@example.test", kind: "CLIENT" },
    csrfToken: "client-csrf-token",
    activePasskeyCount: 0
};
function response(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}
function stubFetch(fetchMock) {
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
        render(_jsx(ClientPortalAuth, {}));
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
        expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body)).toEqual({ email: "client@example.test" });
        expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body)).toEqual({ email: "client@example.test", code: "004219" });
        expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
        expect(localStorage.length).toBe(0);
    });
    it("restores only the client identity and exposes no workspace content", async () => {
        stubFetch(vi.fn()
            .mockResolvedValueOnce(response(session))
            .mockResolvedValueOnce(response([])));
        render(_jsx(ClientPortalAuth, {}));
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
        render(_jsx(ClientPortalAuth, {}));
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
        render(_jsx(ClientPortalAuth, {}));
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
        render(_jsx(ClientPortalAuth, {}));
        expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t load your sessions. Try again.");
        fireEvent.click(screen.getByRole("button", { name: "Register a passkey" }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
        expect(await screen.findByText("We couldn’t register a passkey. Try again.")).toHaveAttribute("role", "alert");
    });
    it("shows only the explicitly shared approved cost snapshot returned for the selected project", async () => {
        const fetchMock = vi.fn((url, init) => {
            void init;
            if (url === "/api/v1/client-portal/auth/session")
                return Promise.resolve(response(session));
            if (url === "/api/v1/client-portal/auth/sessions")
                return Promise.resolve(response([]));
            if (url === "/api/v1/client-portal/projects")
                return Promise.resolve(response({ projects: [{ id: "project-1", title: "Residence", status: "ACTIVE" }] }));
            if (url === "/api/v1/client-portal/projects/project-1/costs")
                return Promise.resolve(response({ items: [{
                            id: "snapshot-1", currency: "INR", lines: [{ key: "design", description: "Design services", quantity: "1.00", unit: "package" }],
                            costs: { prices: [{ key: "design", unitPrice: "125000.00" }], total: "125000.00" }, createdAt: "2026-10-03T10:00:00.000Z"
                        }] }));
            return Promise.resolve(response({}, 404));
        });
        stubFetch(fetchMock);
        render(_jsx(ClientPortalAuth, {}));
        fireEvent.click(await screen.findByRole("button", { name: "View approved cost snapshots" }));
        expect(await screen.findByText("Design services: 1.00 package")).toBeInTheDocument();
        expect(screen.getByText("125000.00 INR per package")).toBeInTheDocument();
        expect(screen.getByText("Total: 125000.00 INR")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /approve cost/i })).not.toBeInTheDocument();
        const costsCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/projects/project-1/costs"));
        expect(costsCall?.[1]).toMatchObject({ credentials: "include", cache: "no-store" });
        expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/auth/") && String(url).includes("cost"))).toBe(false);
    });
    it("shows an empty state when no costs are shared and clears a snapshot after access revocation", async () => {
        let mode = "empty";
        const fetchMock = vi.fn((url, init) => {
            void init;
            if (url === "/api/v1/client-portal/auth/session")
                return Promise.resolve(response(session));
            if (url === "/api/v1/client-portal/auth/sessions")
                return Promise.resolve(response([]));
            if (url === "/api/v1/client-portal/projects")
                return Promise.resolve(response({ projects: [{ id: "project-1", title: "Residence", status: "ACTIVE" }] }));
            if (url === "/api/v1/client-portal/projects/project-1/costs") {
                if (mode === "revoked")
                    return Promise.resolve(response({}, 403));
                if (mode === "empty")
                    return Promise.resolve(response({ items: [] }));
                return Promise.resolve(response({ items: [{
                            id: "snapshot-2", currency: "INR", lines: [{ key: "build", description: "Build services", quantity: "1", unit: "package" }],
                            costs: { prices: [{ key: "build", unitPrice: "900.00" }], total: "900.00" }, createdAt: "2026-10-03T10:00:00.000Z"
                        }] }));
            }
            return Promise.resolve(response({}, 404));
        });
        stubFetch(fetchMock);
        render(_jsx(ClientPortalAuth, {}));
        fireEvent.click(await screen.findByRole("button", { name: "View approved cost snapshots" }));
        expect(await screen.findByText("No approved cost snapshots have been shared with this account.")).toBeInTheDocument();
        mode = "shared";
        const costsSection = screen.getByRole("region", { name: "Approved cost snapshots" });
        fireEvent.click(within(costsSection).getByRole("button", { name: "Refresh" }));
        expect(await screen.findByText("Build services: 1 package")).toBeInTheDocument();
        mode = "revoked";
        fireEvent.click(within(costsSection).getByRole("button", { name: "Refresh" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("These cost details are no longer available or were not shared with this account.");
        expect(screen.queryByText("Build services: 1 package")).not.toBeInTheDocument();
        expect(screen.queryByText("Total: 900.00 INR")).not.toBeInTheDocument();
    });
    it("shows a retryable error when the approved-cost service is unavailable", async () => {
        const fetchMock = vi.fn((url, init) => {
            void init;
            if (url === "/api/v1/client-portal/auth/session")
                return Promise.resolve(response(session));
            if (url === "/api/v1/client-portal/auth/sessions")
                return Promise.resolve(response([]));
            if (url === "/api/v1/client-portal/projects")
                return Promise.resolve(response({ projects: [{ id: "project-1", title: "Residence", status: "ACTIVE" }] }));
            if (url === "/api/v1/client-portal/projects/project-1/costs")
                return Promise.resolve(response({}, 503));
            return Promise.resolve(response({}, 404));
        });
        stubFetch(fetchMock);
        render(_jsx(ClientPortalAuth, {}));
        fireEvent.click(await screen.findByRole("button", { name: "View approved cost snapshots" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Approved cost snapshots could not be loaded. Try again.");
        expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
        expect(screen.queryByText(/Total:/)).not.toBeInTheDocument();
    });
});
