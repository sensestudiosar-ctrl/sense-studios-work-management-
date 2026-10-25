import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TaskWorkspace } from "./task.js";
const setup = {
    actorEmployeeId: "employee-1",
    projects: [{ id: "project-1", title: "Studio", status: "ACTIVE", branchId: "branch-1" }],
    planItems: [{ id: "plan-1", projectId: "project-1", kind: "STAGE", label: "Concept" }],
    employees: [{ id: "employee-1", name: "Asha", homeBranchId: "branch-1" }, { id: "employee-2", name: "Dev", homeBranchId: "branch-1" }],
    canAssign: true,
};
const taskA = {
    id: "task-51", title: "Prepare concept", type: "PROJECT", priority: "HIGH", targetDate: "2026-10-18T00:00:00.000Z",
    description: "Prepare the approved concept.", projectId: "project-1", planItemId: "plan-1", tags: ["Design"],
    checklist: [{ label: "Confirm the brief", checked: true }, { label: "Prepare sample boards", checked: false }],
    primaryOwnerEmployeeId: "employee-1", status: "NOT_STARTED", version: 1, reviewRequirement: "NONE", createdAt: "2026-10-01T00:00:00.000Z",
};
const taskB = {
    ...taskA, id: "task-52", title: "Prepare elevations", status: "IN_PROGRESS", priority: "MEDIUM",
    checklist: [{ label: "Verify site dimensions", checked: false }], createdAt: "2026-10-02T00:00:00.000Z",
};
const taskC = { ...taskA, id: "task-53", title: "Prepare finish schedule", createdAt: "2026-10-03T00:00:00.000Z" };
const detailA = {
    task: taskA,
    linkedReviewTaskId: "review-51",
    collaborators: [],
    history: { statusChanges: [{ id: "history-1", action: "Task created from approved project plan", occurredAt: "2026-10-01T10:00:00.000Z" }], ownerChanges: [] },
    capabilities: { edit: true, transition: true, reassign: false },
};
const detailB = {
    task: taskB,
    linkedReviewTaskId: "review-52",
    collaborators: [],
    history: { statusChanges: [{ id: "history-2", reason: "Work started after site review", toStatus: "IN_PROGRESS", occurredAt: "2026-10-02T10:00:00.000Z" }], ownerChanges: [] },
    capabilities: { edit: true, transition: true, reassign: false },
};
const detailC = { ...detailA, task: taskC, linkedReviewTaskId: "review-53" };
function creationOptionsForSetup(value, input) {
    const projectId = new URL(input, "http://localhost").searchParams.get("projectId");
    const owners = value.canAssign ? value.employees : value.employees.filter(person => person.id === value.actorEmployeeId);
    return { actorEmployeeId: value.actorEmployeeId, project: value.projects.find(project => project.id === projectId) ?? null, canAssign: value.canAssign, canCreate: owners.length > 0, owners, collaborators: value.canAssign ? value.employees : [], readAt: "2026-10-15T00:00:00Z" };
}
function response(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
const savedDialogMethods = {
    showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal"),
    close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close"),
};
beforeEach(() => {
    window.history.replaceState(null, "", "/my-work");
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        configurable: true,
        value() { this.setAttribute("open", ""); },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
        configurable: true,
        value() {
            this.removeAttribute("open");
            this.dispatchEvent(new Event("close"));
        },
    });
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    if (savedDialogMethods.showModal)
        Object.defineProperty(HTMLDialogElement.prototype, "showModal", savedDialogMethods.showModal);
    else
        Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (savedDialogMethods.close)
        Object.defineProperty(HTMLDialogElement.prototype, "close", savedDialogMethods.close);
    else
        Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
    window.history.replaceState(null, "", "/");
});
function installApi(options) {
    const calls = [];
    const details = options.details ?? { [taskA.id]: detailA, [taskB.id]: detailB, [taskC.id]: detailC };
    const fetchMock = vi.fn(async (input, init) => {
        const url = new URL(String(input), "http://localhost");
        calls.push({ url, init });
        if (String(input).includes("/creation-options"))
            return response(creationOptionsForSetup(setup, String(input)));
        if (url.pathname === "/api/v1/tasks/setup")
            return response(setup);
        if (url.pathname.includes("/dashboard/sources/"))
            return response({ source: "tasks", today: "2026-10-13" });
        if (url.pathname === "/api/v1/tasks")
            return response({ total: options.total ?? options.pageItems.length, items: options.pageItems });
        if (url.pathname.endsWith("/extension-approvers"))
            return response({ items: [] });
        const mutation = url.pathname.match(/^\/api\/v1\/tasks\/([^/]+)\/(.+)$/);
        if (mutation && options.onMutation)
            return options.onMutation(url, init);
        const detailMatch = url.pathname.match(/^\/api\/v1\/tasks\/([^/]+)$/);
        const matchedTaskId = detailMatch?.[1];
        if (matchedTaskId) {
            const matchedDetail = details[decodeURIComponent(matchedTaskId)];
            if (matchedDetail)
                return response(matchedDetail);
        }
        return response({ total: 0, items: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    return { calls, fetchMock };
}
async function openQueueTask(title) {
    const taskTitle = title.startsWith("Open task: ") ? title.slice("Open task: ".length) : title;
    const taskButton = title.startsWith("Open task: ")
        ? await screen.findByRole("button", { name: `Open task: ${taskTitle}` })
        : (await screen.findByText(taskTitle, { selector: "button strong", exact: true })).closest("button");
    if (!taskButton)
        throw new Error(`Task button missing for ${taskTitle}`);
    fireEvent.click(taskButton);
    await screen.findByRole("heading", { name: taskTitle });
}
function urlState() { return new URL(window.location.href); }
describe("TaskWorkspace My Work task drawer", () => {
    it("opens the authorized My Work queue in a drawer with applied filters and real checklist, activity, and review evidence", async () => {
        window.history.replaceState(null, "", "/my-work?projectId=project-1&status=NOT_STARTED&q=concept&sort=title_asc");
        const { calls } = installApi({ pageItems: [taskA] });
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true, personalOnly: true }));
        await screen.findByRole("button", { name: "Open task: Prepare concept" });
        expect(screen.getByRole("region", { name: "Applied task filters" })).toHaveTextContent("Project: Studio");
        expect(screen.getByRole("region", { name: "Applied task filters" })).toHaveTextContent("Status: Not started");
        expect(screen.getByRole("region", { name: "Applied task filters" })).toHaveTextContent("Search: concept");
        await openQueueTask("Open task: Prepare concept");
        const dialog = screen.getByRole("dialog", { name: "Prepare concept" });
        expect(dialog).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Open task: Prepare concept" })).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: "Search tasks" })).toHaveValue("concept");
        expect(urlState().searchParams.get("taskId")).toBe("task-51");
        expect(urlState().searchParams.get("projectId")).toBe("project-1");
        expect(urlState().searchParams.get("status")).toBe("NOT_STARTED");
        expect(urlState().searchParams.get("q")).toBe("concept");
        expect(urlState().searchParams.get("sort")).toBe("title_asc");
        fireEvent.click(within(dialog).getByRole("tab", { name: "Checklist" }));
        const checklist = within(dialog).getByRole("region", { name: "Task checklist" });
        expect(within(checklist).getByText("Confirm the brief")).toBeInTheDocument();
        expect(within(checklist).getByText("Prepare sample boards")).toBeInTheDocument();
        expect(within(checklist).getByRole("checkbox", { name: "Confirm the brief" })).toBeDisabled();
        expect(within(checklist).getByText("1/2")).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("tab", { name: "Activity" }));
        expect(within(dialog).getByText(/Task created from approved project plan/)).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole("tab", { name: "Evidence" }));
        expect(within(dialog).getByRole("link", { name: "Open correction instructions in internal review" })).toHaveAttribute("href", "/reviews?taskId=review-51");
        expect(calls.some(({ url }) => url.pathname === "/api/v1/tasks/task-51")).toBe(true);
    });
    it("navigates previous and next only within the current filtered page and preserves view and URL state", async () => {
        window.history.replaceState(null, "", "/my-work?projectId=project-1&q=prepare&sort=target_asc&view=cards&offset=50");
        const { calls } = installApi({ pageItems: [taskA, taskB], total: 120 });
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true, personalOnly: true }));
        await openQueueTask("Prepare concept");
        expect(urlState().searchParams.get("offset")).toBe("50");
        expect(urlState().searchParams.get("view")).toBe("cards");
        fireEvent.click(screen.getByRole("button", { name: "Next task" }));
        await screen.findByRole("heading", { name: "Prepare elevations" });
        expect(urlState().searchParams.get("taskId")).toBe("task-52");
        expect(urlState().searchParams.get("offset")).toBe("50");
        expect(urlState().searchParams.get("view")).toBe("cards");
        expect(urlState().searchParams.get("projectId")).toBe("project-1");
        expect(urlState().searchParams.get("q")).toBe("prepare");
        expect(urlState().searchParams.get("sort")).toBe("target_asc");
        fireEvent.click(screen.getByRole("button", { name: "Next task" }));
        await screen.findByRole("heading", { name: "Prepare concept" });
        expect(urlState().searchParams.get("taskId")).toBe("task-51");
        expect(calls.some(({ url }) => url.pathname === "/api/v1/tasks" && url.searchParams.get("offset") === "50" && url.searchParams.get("projectId") === "project-1")).toBe(true);
    });
    it("keeps an edit draft when close, Escape, backdrop, and previous-task confirmations are declined", async () => {
        window.history.replaceState(null, "", "/my-work");
        installApi({ pageItems: [taskA, taskB] });
        const confirm = vi.fn(() => false);
        vi.stubGlobal("confirm", confirm);
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true, personalOnly: true }));
        await screen.findByRole("button", { name: "Open task: Prepare concept" });
        await openQueueTask("Open task: Prepare concept");
        fireEvent.click(screen.getByRole("button", { name: "Edit task" }));
        const titleField = screen.getByRole("textbox", { name: "Task name" });
        fireEvent.change(titleField, { target: { value: "Unsaved concept revision" } });
        const dialog = screen.getByRole("dialog", { name: "Prepare concept" });
        fireEvent.click(within(dialog).getByRole("button", { name: "Close task details" }));
        expect(dialog).toBeInTheDocument();
        expect(titleField).toHaveValue("Unsaved concept revision");
        expect(urlState().searchParams.get("taskId")).toBe("task-51");
        dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
        fireEvent.click(dialog);
        fireEvent.click(within(dialog).getByRole("button", { name: "Previous task" }));
        expect(confirm).toHaveBeenCalledTimes(4);
        expect(dialog).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: "Task name" })).toHaveValue("Unsaved concept revision");
        expect(urlState().searchParams.get("taskId")).toBe("task-51");
    });
    it("restores the selected task URL and unsaved reason when browser Back is cancelled", async () => {
        window.history.replaceState(null, "", "/my-work?status=NOT_STARTED&projectId=project-1");
        installApi({ pageItems: [taskA, taskB] });
        const confirm = vi.fn(() => false);
        vi.stubGlobal("confirm", confirm);
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true, personalOnly: true }));
        await screen.findByRole("button", { name: "Open task: Prepare concept" });
        await openQueueTask("Open task: Prepare concept");
        const reason = screen.getByRole("textbox", { name: "Reason for change" });
        fireEvent.change(reason, { target: { value: "Keep the existing project scope" } });
        const popstate = new Promise((resolve) => window.addEventListener("popstate", () => resolve(), { once: true }));
        window.history.back();
        await popstate;
        await waitFor(() => expect(urlState().searchParams.get("taskId")).toBe("task-51"));
        expect(urlState().searchParams.get("status")).toBe("NOT_STARTED");
        expect(urlState().searchParams.get("projectId")).toBe("project-1");
        expect(screen.getByRole("textbox", { name: "Reason for change" })).toHaveValue("Keep the existing project scope");
        expect(screen.getByRole("dialog", { name: "Prepare concept" })).toBeInTheDocument();
        expect(confirm).toHaveBeenCalledWith("Discard unsaved task changes?");
    });
    it("blocks close and browser navigation while a canonical transition is pending", async () => {
        window.history.replaceState(null, "", "/my-work");
        let markStarted;
        const mutationStarted = new Promise((resolve) => { markStarted = resolve; });
        installApi({ pageItems: [taskA, taskB], onMutation: (url) => url.pathname.endsWith("/state") ? new Promise(() => { markStarted(); }) : response({}) });
        const confirm = vi.fn(() => true);
        vi.stubGlobal("confirm", confirm);
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true, personalOnly: true }));
        await screen.findByRole("button", { name: "Open task: Prepare concept" });
        await openQueueTask("Open task: Prepare concept");
        fireEvent.change(screen.getByRole("textbox", { name: "Reason for change" }), { target: { value: "Start after checking capacity" } });
        fireEvent.click(screen.getByRole("button", { name: "Start task" }));
        await mutationStarted;
        await waitFor(() => expect(screen.getByRole("button", { name: "Next task" })).toBeDisabled());
        fireEvent.click(screen.getByRole("button", { name: "Close task details" }));
        expect(confirm).not.toHaveBeenCalled();
        const popstate = new Promise((resolve) => window.addEventListener("popstate", () => resolve(), { once: true }));
        window.history.back();
        await popstate;
        await waitFor(() => expect(urlState().searchParams.get("taskId")).toBe("task-51"));
        expect(screen.getByRole("dialog", { name: "Prepare concept" })).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: "Reason for change" })).toHaveValue("Start after checking capacity");
    });
    it("keeps a real reassignment capacity warning and its decisions inside the open task drawer", async () => {
        window.history.replaceState(null, "", "/my-work");
        const reassignable = { ...detailA, capabilities: { ...detailA.capabilities, reassign: true } };
        const calls = [];
        const fetchMock = vi.fn(async (input, init) => {
            const url = new URL(String(input), "http://localhost");
            calls.push({ url, init });
            if (String(input).includes("/creation-options"))
                return response(creationOptionsForSetup(setup, String(input)));
            if (url.pathname === "/api/v1/tasks/setup")
                return response(setup);
            if (url.pathname.includes("/dashboard/sources/"))
                return response({ source: "tasks", today: "2026-10-13" });
            if (url.pathname === "/api/v1/tasks")
                return response({ total: 1, items: [taskA] });
            if (url.pathname.endsWith("/extension-approvers"))
                return response({ items: [] });
            if (url.pathname === "/api/v1/tasks/task-51")
                return response(reassignable);
            if (url.pathname === "/api/v1/tasks/task-51/reassign" && init?.method === "POST") {
                return response({ message: "Overload warning: review employee capacity before reassigning work" }, 409);
            }
            return response({});
        });
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true, personalOnly: true }));
        await screen.findByRole("button", { name: "Open task: Prepare concept" });
        await openQueueTask("Open task: Prepare concept");
        const dialog = screen.getByRole("dialog", { name: "Prepare concept" });
        fireEvent.change(within(dialog).getByRole("combobox", { name: "New owner" }), { target: { value: "employee-2" } });
        fireEvent.change(within(dialog).getByRole("textbox", { name: "Reason for change" }), { target: { value: "Assign work to the available teammate" } });
        fireEvent.click(within(dialog).getByRole("button", { name: "Reassign" }));
        const warningText = await within(dialog).findByText("Overload warning: review employee capacity before reassigning work");
        const warning = warningText.closest("section");
        expect(warning).toHaveAttribute("aria-label", "Capacity warning");
        expect(within(dialog).getByText("Assignment remains unchanged unless you acknowledge this warning.")).toBeInTheDocument();
        expect(within(dialog).getByRole("button", { name: "Acknowledge and reassign owner" })).toBeEnabled();
        expect(within(dialog).getByRole("button", { name: "Cancel assignment" })).toBeEnabled();
        expect(calls.filter(({ url, init }) => url.pathname.endsWith("/reassign") && init?.method === "POST")).toHaveLength(1);
        fireEvent.click(within(dialog).getByRole("button", { name: "Cancel assignment" }));
        expect(screen.getByRole("dialog", { name: "Prepare concept" })).toBeInTheDocument();
        expect(screen.queryByText("Overload warning: review employee capacity before reassigning work")).not.toBeInTheDocument();
        expect(calls.filter(({ url, init }) => url.pathname.endsWith("/reassign") && init?.method === "POST")).toHaveLength(1);
    });
    it("discards a task A capacity warning when navigating to task B without posting task A data to B", async () => {
        window.history.replaceState(null, "", "/my-work");
        const reassignableA = { ...detailA, capabilities: { ...detailA.capabilities, reassign: true } };
        vi.stubGlobal("confirm", vi.fn(() => true));
        const calls = [];
        const fetchMock = vi.fn(async (input, init) => {
            const url = new URL(String(input), "http://localhost");
            calls.push({ url, init });
            if (String(input).includes("/creation-options"))
                return response(creationOptionsForSetup(setup, String(input)));
            if (url.pathname === "/api/v1/tasks/setup")
                return response(setup);
            if (url.pathname.includes("/dashboard/sources/"))
                return response({ source: "tasks", today: "2026-10-13" });
            if (url.pathname === "/api/v1/tasks")
                return response({ total: 2, items: [taskA, taskB] });
            if (url.pathname.endsWith("/extension-approvers"))
                return response({ items: [] });
            if (url.pathname === "/api/v1/tasks/task-51")
                return response(reassignableA);
            if (url.pathname === "/api/v1/tasks/task-52")
                return response(detailB);
            if (/^\/api\/v1\/tasks\/[^/]+\/reassign$/.test(url.pathname) && init?.method === "POST") {
                return response({ message: "Overload warning: review employee capacity before reassigning work" }, 409);
            }
            return response({});
        });
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true, personalOnly: true }));
        await screen.findByRole("button", { name: "Open task: Prepare concept" });
        await openQueueTask("Open task: Prepare concept");
        const taskADialog = screen.getByRole("dialog", { name: "Prepare concept" });
        fireEvent.change(within(taskADialog).getByRole("combobox", { name: "New owner" }), { target: { value: "employee-2" } });
        fireEvent.change(within(taskADialog).getByRole("textbox", { name: "Reason for change" }), { target: { value: "Task A reassignment only" } });
        fireEvent.click(within(taskADialog).getByRole("button", { name: "Reassign" }));
        expect(await within(taskADialog).findByRole("alert", { name: "Capacity warning" })).toBeInTheDocument();
        fireEvent.click(within(taskADialog).getByRole("button", { name: "Next task" }));
        const taskBDialog = await screen.findByRole("dialog", { name: "Prepare elevations" });
        expect(within(taskBDialog).queryByRole("alert", { name: "Capacity warning" })).not.toBeInTheDocument();
        expect(within(taskBDialog).queryByRole("button", { name: "Acknowledge and reassign owner" })).not.toBeInTheDocument();
        expect(urlState().searchParams.get("taskId")).toBe("task-52");
        const reassignPosts = calls.filter(({ url, init }) => url.pathname.endsWith("/reassign") && init?.method === "POST");
        expect(reassignPosts.map(({ url }) => url.pathname)).toEqual(["/api/v1/tasks/task-51/reassign"]);
        expect(reassignPosts.map(({ init }) => String(init?.body))).toEqual([expect.stringContaining("Task A reassignment only")]);
    });
    it("keeps list-first and legacy non-My-Work task callers inline", async () => {
        installApi({ pageItems: [taskA] });
        const listFirst = render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false, listFirst: true }));
        await screen.findByRole("button", { name: "Open task: Prepare concept" });
        fireEvent.click(screen.getByRole("button", { name: "Open task: Prepare concept" }));
        expect(await screen.findByRole("heading", { name: "Prepare concept" })).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(document.querySelector(".task-workspace-list-first .task-detail")).toBeInTheDocument();
        listFirst.unmount();
        window.history.replaceState(null, "", "/tasks");
        render(_jsx(TaskWorkspace, { csrfToken: "csrf", owner: false }));
        expect(await screen.findByRole("heading", { name: "Prepare concept" })).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(document.querySelector(".task-workspace:not(.task-workspace-list-first) .task-detail")).toBeInTheDocument();
    });
});
