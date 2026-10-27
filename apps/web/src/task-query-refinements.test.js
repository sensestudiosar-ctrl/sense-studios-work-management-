import { jsx as _jsx } from "react/jsx-runtime";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskWorkspace } from "./task.js";
import { MemoryRouter } from "react-router-dom";
import { taskRefinementError } from "./task-query-refinements.js";
const self = "11111111-1111-4111-8111-111111111111", collaborator = "22222222-2222-4222-8222-222222222222";
const reply = (value) => new Response(JSON.stringify(value), { status: 200 });
beforeEach(() => window.history.replaceState(null, "", "/tasks"));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function api() {
    const fetcher = vi.fn(async (input) => {
        const url = new URL(String(input), "http://localhost");
        if (url.pathname.endsWith("/setup"))
            return reply({ actorEmployeeId: self, canAssign: false, employees: [{ id: self, name: "me@example.test", homeBranchId: "branch" }, { id: collaborator, name: "helper@example.test", homeBranchId: "branch" }], projects: [], planItems: [] });
        if (url.pathname === "/api/v1/dashboard/sources/tasks")
            return reply({ source: "tasks", today: "2026-10-15", sections: [] });
        if (url.pathname === "/api/v1/tasks")
            return reply({ total: url.searchParams.has("priorities") ? 2 : 4, items: [] });
        return reply({});
    });
    vi.stubGlobal("fetch", fetcher);
    return fetcher;
}
describe("task query controls and URL state", () => {
    it("applies multiple priority/collaborator selections and canonical sort to the server read", async () => {
        const fetcher = api();
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: true, listFirst: true }));
        await waitFor(() => expect(screen.getByRole("button", { name: "Apply filters" })).toBeEnabled());
        fireEvent.click(screen.getByLabelText("Filters and sort"));
        const form = screen.getByRole("form", { name: "Task filters" });
        fireEvent.click(within(form).getByLabelText("Critical"));
        fireEvent.click(within(form).getByLabelText("High"));
        fireEvent.click(within(form).getByLabelText("helper@example.test"));
        fireEvent.change(within(form).getByLabelText("Sort tasks"), { target: { value: "priority_desc" } });
        fireEvent.submit(form);
        await waitFor(() => expect(new URL(window.location.href).searchParams.get("priorities")).toBe("CRITICAL,HIGH"));
        const query = new URL(window.location.href).searchParams;
        expect(query.get("collaboratorEmployeeIds")).toBe(collaborator);
        expect(query.get("sort")).toBe("priority_desc");
        await waitFor(() => expect(screen.getByRole("button", { name: "Reset filters" })).toBeEnabled());
        const read = fetcher.mock.calls.map(([value]) => new URL(String(value), "http://localhost")).filter(url => url.pathname === "/api/v1/tasks").at(-1);
        expect(read.searchParams.get("priorities")).toBe("CRITICAL,HIGH");
        expect(read.searchParams.get("collaboratorEmployeeIds")).toBe(collaborator);
        fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
        await waitFor(() => expect(new URL(window.location.href).searchParams.has("priorities")).toBe(false));
        expect(new URL(window.location.href).searchParams.has("collaboratorEmployeeIds")).toBe(false);
    });
    it("keeps embedded task refinements separate from the project's own URL query", async () => {
        api();
        window.history.replaceState(null, "", "/projects?projectId=project&q=Studio&sort=milestone&offset=50&projectTaskPriorities=HIGH&projectTaskSort=priority_desc");
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: true, listFirst: true, projectContext: { id: "project", title: "Studio", status: "ACTIVE" } }));
        await waitFor(() => expect(screen.getByRole("button", { name: "Apply filters" })).toBeEnabled());
        expect(screen.getByLabelText("High")).toBeChecked();
        expect(screen.getByLabelText("Sort tasks")).toHaveValue("priority_desc");
        fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
        await waitFor(() => expect(new URL(window.location.href).searchParams.has("projectTaskPriorities")).toBe(false));
        const query = new URL(window.location.href).searchParams;
        expect(query.get("q")).toBe("Studio");
        expect(query.get("sort")).toBe("milestone");
        expect(query.get("offset")).toBe("50");
        expect(query.get("projectId")).toBe("project");
    });
    it("forwards selections to task metric counts without a second count formula", async () => {
        const fetcher = api();
        window.history.replaceState(null, "", `/my-work?priorities=HIGH&collaboratorEmployeeIds=${collaborator}`);
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true, personalOnly: true, accountId: self }));
        await waitFor(() => expect(fetcher.mock.calls.some(([value]) => { const url = new URL(String(value), "http://localhost"); return url.pathname === "/api/v1/tasks" && url.searchParams.get("limit") === "1"; })).toBe(true));
        const counts = fetcher.mock.calls.map(([value]) => new URL(String(value), "http://localhost")).filter(url => url.pathname === "/api/v1/tasks" && url.searchParams.get("limit") === "1");
        expect(counts.every(url => url.searchParams.get("priorities") === "HIGH" && url.searchParams.get("collaboratorEmployeeIds") === collaborator && url.searchParams.get("scope") === "personal")).toBe(true);
        expect(screen.getByRole("region", { name: "Applied task filters" })).toHaveTextContent("Priority: High");
    });
    it("shows the ordinary task sort as paused while Needs action keeps its fixed source ordering", async () => {
        api();
        window.history.replaceState(null, "", "/my-work?sort=priority_desc&workPhase=attention");
        render(_jsx(MemoryRouter, { children: _jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true, personalOnly: true, accountId: self }) }));
        await screen.findByText("Task list sort (paused): Highest priority, then Target");
        // The queue's inline sort select was removed; sort is reachable only through
        // the "Sort tasks" control in the Filters popover, which stays disabled here.
        expect(screen.getByLabelText("Sort tasks")).toBeDisabled();
        expect(screen.getByText("Ordered by deadline, then priority")).toBeInTheDocument();
    });
    it.each([{ priorities: "HIGH,HIGH" }, { priorities: "URGENT" }, { collaboratorEmployeeIds: "person" }])("rejects invalid visible filter draft %j", value => {
        expect(taskRefinementError(value)).not.toBe("");
    });
});
