import { jsx as _jsx } from "react/jsx-runtime";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, vi } from "vitest";
import { App } from "./app.js";
vi.mock("@simplewebauthn/browser", () => ({ startAuthentication: vi.fn(), startRegistration: vi.fn() }));
const actorA = { account: { id: "actor-a", email: "actor-a@example.test", kind: "OWNER" }, csrfToken: "csrf-a" };
const actorB = { account: { id: "actor-b", email: "actor-b@example.test", kind: "OWNER" }, csrfToken: "csrf-b" };
function response(body) { return { ok: true, status: 200, json: async () => body }; }
beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
describe("protected workspace account identity boundary", () => {
    it("removes the previous actor's private project names as soon as focus revalidation returns another account", async () => {
        let currentSession = actorA;
        let resolveNextSetup;
        const fetchMock = vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/auth/session")
                return response(currentSession);
            if (url === "/api/v1/projects/setup") {
                if (currentSession.account.id === actorB.account.id)
                    return new Promise(resolve => { resolveNextSetup = resolve; });
                return response({ branches: [{ id: "branch-a", name: "Actor A confidential branch" }] });
            }
            if (url.startsWith("/api/v1/projects?"))
                return response({ items: [{ id: "project-a", title: "Actor A confidential project" }] });
            if (url === "/api/v1/notifications")
                return response({ items: [], nextCursor: null });
            return response({});
        });
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(MemoryRouter, { initialEntries: ["/revisions"], children: _jsx(App, {}) }));
        expect(await screen.findByRole("option", { name: "Actor A confidential project" })).toBeInTheDocument();
        currentSession = actorB;
        fireEvent(window, new Event("focus"));
        await waitFor(() => expect(screen.getAllByText(actorB.account.email).length).toBeGreaterThan(0));
        expect(screen.queryByRole("option", { name: "Actor A confidential project" })).not.toBeInTheDocument();
        expect(screen.queryByRole("option", { name: "Actor A confidential branch" })).not.toBeInTheDocument();
        await waitFor(() => expect(resolveNextSetup).toBeDefined());
        await act(async () => { resolveNextSetup(response({ branches: [] })); });
        expect(screen.queryByText("Actor A confidential project")).not.toBeInTheDocument();
    });
    it("cannot inject a late previous-actor task response after the new actor workspace mounts", async () => {
        let currentSession = actorA;
        let resolveOldPage;
        let resolveNewPage;
        const task = { id: "task-a", title: "Late Actor A private task", type: "NON_PROJECT", priority: "MEDIUM", targetDate: "2026-10-13T00:00:00Z", primaryOwnerEmployeeId: "employee-a", status: "NOT_STARTED", version: 1, reviewRequirement: "NONE", createdAt: "2026-10-12T00:00:00Z" };
        vi.stubGlobal("fetch", vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/auth/session")
                return response(currentSession);
            if (url === "/api/v1/tasks/setup")
                return response({ actorEmployeeId: "employee-a", projects: [], employees: [], planItems: [], canAssign: false });
            if (url.startsWith("/api/v1/tasks?"))
                return new Promise(resolve => {
                    if (currentSession.account.id === actorA.account.id)
                        resolveOldPage = resolve;
                    else
                        resolveNewPage = resolve;
                });
            if (url === "/api/v1/notifications")
                return response({ items: [], nextCursor: null });
            return response({});
        }));
        render(_jsx(MemoryRouter, { initialEntries: ["/tasks"], children: _jsx(App, {}) }));
        await waitFor(() => expect(resolveOldPage).toBeDefined());
        currentSession = actorB;
        fireEvent(window, new Event("focus"));
        await waitFor(() => expect(resolveNewPage).toBeDefined());
        await act(async () => { resolveOldPage(response({ total: 1, items: [task] })); });
        expect(screen.queryByRole("button", { name: "Open task: Late Actor A private task" })).not.toBeInTheDocument();
        await act(async () => { resolveNewPage(response({ total: 0, items: [] })); });
        expect(screen.queryByText("Late Actor A private task")).not.toBeInTheDocument();
    });
    it("keeps the same actor's loaded project selection through a CSRF rotation", async () => {
        let currentSession = actorA;
        let setupReads = 0;
        let sessionReads = 0;
        vi.stubGlobal("fetch", vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/auth/session") {
                sessionReads += 1;
                return response(currentSession);
            }
            if (url === "/api/v1/projects/setup") {
                setupReads += 1;
                return response({ branches: [{ id: "branch-a", name: "Actor A confidential branch" }] });
            }
            if (url.startsWith("/api/v1/projects?"))
                return response({ items: [{ id: "project-a", title: "Actor A confidential project" }] });
            if (url === "/api/v1/notifications")
                return response({ items: [], nextCursor: null });
            return response({});
        }));
        render(_jsx(MemoryRouter, { initialEntries: ["/revisions"], children: _jsx(App, {}) }));
        expect(await screen.findByRole("option", { name: "Actor A confidential project" })).toBeInTheDocument();
        const projectPicker = screen.getByRole("combobox", { name: "Revision project" });
        // Keep a DOM-instance assertion so token rotation cannot silently remount the workspace.
        const priorSessionReads = sessionReads;
        currentSession = { ...actorA, csrfToken: "rotated-same-actor" };
        fireEvent(window, new Event("focus"));
        await waitFor(() => expect(sessionReads).toBeGreaterThan(priorSessionReads));
        await act(async () => { });
        expect(screen.getByRole("combobox", { name: "Revision project" })).toBe(projectPicker);
        expect(setupReads).toBe(1);
        expect(screen.getByRole("option", { name: "Actor A confidential project" })).toBeInTheDocument();
    });
});
