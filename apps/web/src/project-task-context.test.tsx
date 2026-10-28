import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskWorkspace } from "./task.js";
import { ProjectWorkspace } from "./project.js";

const project = { id: "project-a", title: "Studio delivery", status: "ACTIVE", deliveryType: "DESIGN", version: 3, scopes: [], branch: { id: "branch-a", name: "Mumbai" } };
const person = { id: "employee-a", accountId: "account-a", name: "designer@example.test", homeBranchId: "branch-a" };
const task = { id: "task-a", title: "Prepare layout", projectId: project.id, type: "PROJECT", priority: "MEDIUM", targetDate: "2026-10-20T00:00:00Z", primaryOwnerEmployeeId: person.id, status: "NOT_STARTED", version: 1, tags: [], checklist: [], reviewRequirement: "NONE", createdAt: "2026-10-15T00:00:00Z" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => {
  vi.restoreAllMocks(); window.history.replaceState(null, "", `/projects?q=Studio&sort=milestone&offset=50&projectId=${project.id}&projectSection=tasks`);
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
function api(options: { wrongProject?: boolean; site?: boolean; populated?: boolean; commands?: boolean } = {}) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/api/v1/project-templates") return reply({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
    if (url.pathname.endsWith("/plan")) return reply({ plan: null, items: [], history: [], capabilities: { complete: false, override: false } });
    if (url.pathname === "/api/v1/projects/setup") return reply({ branches: [project.branch], employees: [person] });
    if (url.pathname === "/api/v1/projects") return reply({ total: 1, items: [project] });
    if (url.pathname === `/api/v1/projects/${project.id}`) return reply({ project, currentLeadName: person.name, assignments: [{ employeeId: person.id, employee: person }], capabilities: { manageAssignments: true, assignLead: true, manageLead: true } });
    if (url.pathname === "/api/v1/tasks/setup") return reply({ actorEmployeeId: null, canAssign: true, employees: [person], projects: [project], planItems: [], ...(options.site ? { creationProfile: { version: 1, variant: "SITE", resolution: "EXPLICIT" } } : {}) });
    if (url.pathname === "/api/v1/tasks/creation-options") return reply({ actorEmployeeId: null, canAssign: true, canCreate: true, project, owners: [person], collaborators: [person], readAt: "2026-10-15T00:00:00Z" });
    if (url.pathname === "/api/v1/tasks" && init?.method === "POST") return reply(task, 201);
    if (url.pathname === "/api/v1/tasks") return reply({ total: options.populated ? 1 : 0, items: options.populated ? [task] : [] });
    if (url.pathname === `/api/v1/tasks/${task.id}`) return reply({ task: { ...task, ...(options.wrongProject ? { projectId: "project-b", title: "Other project secret" } : {}) }, collaborators: [], capabilities: options.commands ? { reassign: true } : {}, history: { statusChanges: [], ownerChanges: [] } });
    if (url.pathname.endsWith("/subtasks")) return reply({ items: [], parent: null, isSubtask: false, completionBlocked: false, canCreate: false, taskVersion: 1 });
    return reply({}, 404);
  });
  vi.stubGlobal("fetch", mock); return mock;
}
async function openComposer() {
  const trigger = await screen.findByRole("button", { name: "Create task" });
  await waitFor(() => expect(trigger).toBeEnabled()); fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog");
  const form = within(dialog).getByRole("form", { name: "Create task" });
  await within(form).findByLabelText("Primary owner"); return { dialog, form };
}

describe("fixed project task workspace", () => {
  it("moves focus to the Project task commands from the drawer footer", async () => {
    api({ populated: true, commands: true });
    render(<TaskWorkspace csrfToken="csrf" owner listFirst projectContext={project} />);
    fireEvent.click(await screen.findByRole("button", { name: `Open task: ${task.title}` }));
    const panel = await screen.findByRole("dialog", { name: task.title });
    const marker = within(panel).getByRole("heading", { name: "Task actions" });
    const scroll = vi.fn(); Object.defineProperty(marker, "scrollIntoView", { configurable: true, value: scroll });
    fireEvent.click(within(panel).getByRole("button", { name: /^Task actions/ }));
    await waitFor(() => expect(marker).toHaveFocus());
    expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
  });
  it.each(["List", "Cards", "Kanban", "Timeline"])("opens and closes one shared task panel from %s without changing list data", async label => {
    const mock = api({ populated: true });
    render(<TaskWorkspace csrfToken="csrf" owner listFirst projectContext={project} />);
    await screen.findByRole("button", { name: `Open task: ${task.title}` });
    const before = mock.mock.calls.filter(([value]) => new URL(String(value), "http://localhost").pathname === "/api/v1/tasks").length;
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(mock.mock.calls.filter(([value]) => new URL(String(value), "http://localhost").pathname === "/api/v1/tasks")).toHaveLength(before);
    const opener = screen.getAllByRole("button", { name: new RegExp(task.title) })[0]!;
    opener.focus(); fireEvent.click(opener);
    expect(opener).toBeInTheDocument();
    const panel = await screen.findByRole("dialog", { name: task.title });
    expect(within(panel).getByRole("heading", { name: task.title })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Close task details" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
    expect(mock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
  it("isolates task search/page/sort from project URL context and keeps project on reset", async () => {
    const mock = api(); render(<TaskWorkspace csrfToken="csrf" owner listFirst projectContext={project} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Apply filters" })).toBeEnabled());
    const initial = mock.mock.calls.map(([value]) => new URL(String(value), "http://localhost")).find(url => url.pathname === "/api/v1/tasks")!;
    expect(initial.searchParams.get("scope")).toBe("all"); expect(initial.searchParams.get("projectId")).toBe(project.id);
    expect(initial.searchParams.get("offset")).toBe("0"); expect(initial.searchParams.has("q")).toBe(false);
    fireEvent.change(screen.getByLabelText("Search tasks"), { target: { value: "elevation" } });
    fireEvent.submit(screen.getByRole("form", { name: "Task filters" }));
    await waitFor(() => expect(new URL(window.location.href).searchParams.get("projectTaskQ")).toBe("elevation"));
    const query = new URL(window.location.href).searchParams;
    expect(query.get("q")).toBe("Studio"); expect(query.get("sort")).toBe("milestone"); expect(query.get("offset")).toBe("50");
    expect(screen.getByLabelText("Filter by project")).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Reset filters" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    await waitFor(() => expect(new URL(window.location.href).searchParams.has("projectTaskQ")).toBe(false));
    const lists = mock.mock.calls.map(([value]) => new URL(String(value), "http://localhost")).filter(url => url.pathname === "/api/v1/tasks");
    expect(lists.every(url => url.searchParams.get("projectId") === project.id)).toBe(true);
  });
  it("creates with fixed project and opens the canonical ID without replacing project context", async () => {
    const mock = api(); render(<TaskWorkspace csrfToken="csrf" owner listFirst projectContext={project} />);
    const { dialog, form } = await openComposer();
    expect(within(form).getByLabelText("Project")).toHaveValue(project.title); expect(within(form).getByLabelText("Project")).toHaveAttribute("readonly");
    expect(within(form).getByLabelText("Type")).toHaveValue("PROJECT");
    fireEvent.change(within(form).getByLabelText("Primary owner"), { target: { value: person.id } });
    fireEvent.change(within(form).getByLabelText("Task name"), { target: { value: task.title } });
    fireEvent.change(within(form).getByLabelText("Target date"), { target: { value: "2026-10-20" } });
    fireEvent.change(within(form).getByLabelText("Reason"), { target: { value: "Prepare agreed project layout" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create task" }));
    expect(await screen.findByRole("heading", { name: task.title })).toBeInTheDocument();
    const command = mock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(command[1]?.body))).toMatchObject({ projectId: project.id, type: "PROJECT", ownerEmployeeId: person.id });
    expect(command[1]?.headers).toMatchObject({ "X-CSRF-Token": "csrf" });
    expect(mock.mock.calls.filter(([value]) => String(value) === `/api/v1/tasks/${task.id}`)).toHaveLength(1);
    const query = new URL(window.location.href).searchParams;
    expect(query.get("projectTaskId")).toBe(task.id); expect(query.get("q")).toBe("Studio"); expect(query.get("projectId")).toBe(project.id);
  });
  it("rejects a deep-linked task detail outside the selected project", async () => {
    const mock = api({ wrongProject: true }); window.history.replaceState(null, "", window.location.href + "&projectTaskId=task-a");
    render(<TaskWorkspace csrfToken="csrf" owner listFirst projectContext={project} />);
    await waitFor(() => expect(mock.mock.calls.some(([value]) => String(value).endsWith("/task-a"))).toBe(true));
    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have access to these tasks.");
    expect(screen.queryByRole("heading", { name: "Other project secret" })).not.toBeInTheDocument();
  });
  it.each(["ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"])("does not offer ordinary creation on %s projects", async status => {
    api(); render(<TaskWorkspace csrfToken="csrf" owner listFirst projectContext={{ ...project, status }} />);
    await screen.findByText("0 filtered tasks"); expect(screen.getByRole("button", { name: "Create task" })).toBeDisabled();
  });
  it("does not force a Site presentation type filter into the project's canonical list", async () => {
    const mock = api({ site: true }); render(<TaskWorkspace csrfToken="csrf" owner={false} listFirst projectContext={project} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Apply filters" })).toBeEnabled());
    const list = mock.mock.calls.map(([value]) => new URL(String(value), "http://localhost")).find(url => url.pathname === "/api/v1/tasks")!;
    expect(list.searchParams.get("scope")).toBe("all"); expect(list.searchParams.has("type")).toBe(false);
  });
});

describe("project workspace integration", () => {
  it("restores the project directory context and removes task-only URL keys on return", async () => {
    const mock = api(); window.history.replaceState(null, "", window.location.href + "&projectTaskQ=layout&projectTaskOffset=50");
    render(<ProjectWorkspace csrfToken="csrf" owner listFirst initialProjectId={project.id} />);
    const back = await screen.findByRole("button", { name: /Back to projects/ });
    await waitFor(() => expect(mock.mock.calls.some(([value]) => String(value).includes("/api/v1/projects?"))).toBe(true));
    const list = mock.mock.calls.map(([value]) => new URL(String(value), "http://localhost")).find(url => url.pathname === "/api/v1/projects")!;
    expect(list.searchParams.get("offset")).toBe("50"); expect(list.searchParams.get("q")).toBe("Studio");
    fireEvent.click(back);
    const query = new URL(window.location.href).searchParams;
    expect(query.get("q")).toBe("Studio"); expect(query.get("offset")).toBe("50"); expect(query.get("sort")).toBe("milestone");
    expect([...query.keys()].some(key => key.startsWith("projectTask"))).toBe(false);
    expect(query.has("projectId")).toBe(false); expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });
  it("retains a dirty task form when a workspace link or browser refresh is attempted", async () => {
    api(); render(<><a href="/people">People home</a><TaskWorkspace csrfToken="csrf" owner listFirst projectContext={project} /></>);
    const { form } = await openComposer(); fireEvent.change(within(form).getByLabelText("Task name"), { target: { value: "Keep this task draft" } });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(fireEvent.click(screen.getByRole("link", { name: "People home" }))).toBe(false);
    expect(within(form).getByLabelText("Task name")).toHaveValue("Keep this task draft");
    const unload = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload); expect(unload.defaultPrevented).toBe(true);
  });
  it("keeps a dirty new-task draft when leaving Tasks is declined, then opens People after confirmed discard", async () => {
    api(); render(<ProjectWorkspace csrfToken="csrf" owner listFirst initialProjectId={project.id} />);
    const { form } = await openComposer(); fireEvent.change(within(form).getByLabelText("Task name"), { target: { value: "Keep this draft" } });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument(); expect(within(form).getByLabelText("Task name")).toHaveValue("Keep this draft");
    expect(new URL(window.location.href).searchParams.get("projectSection")).toBe("tasks");
    confirm.mockReturnValue(true); fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "Set lead" })).toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.get("projectSection")).toBe("people");
  });
  it("keeps assignment and lead controls Owner-only despite misleading management hints", async () => {
    api(); window.history.replaceState(null, "", `/projects?projectId=${project.id}&projectSection=people`);
    render(<ProjectWorkspace csrfToken="csrf" owner={false} listFirst initialProjectId={project.id} />);
    await screen.findByRole("heading", { name: "Project Lead" });
    expect(screen.queryByRole("button", { name: "Set lead" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign contributor" })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
  it("blocks project Back navigation while a create is pending", async () => {
    const mock = api(); const initial = mock.getMockImplementation()!; let finish: ((response: Response) => void) | undefined;
    mock.mockImplementation((input, init) => init?.method === "POST" ? new Promise<Response>(resolve => { finish = resolve; }) : initial(input, init));
    render(<ProjectWorkspace csrfToken="csrf" owner listFirst initialProjectId={project.id} />);
    const { form } = await openComposer();
    fireEvent.change(within(form).getByLabelText("Primary owner"), { target: { value: person.id } }); fireEvent.change(within(form).getByLabelText("Task name"), { target: { value: task.title } }); fireEvent.change(within(form).getByLabelText("Target date"), { target: { value: "2026-10-20" } }); fireEvent.change(within(form).getByLabelText("Reason"), { target: { value: "Prepare approved layout" } }); fireEvent.submit(form);
    await act(async () => { window.history.replaceState(null, "", "/projects"); window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(new URL(window.location.href).searchParams.get("projectId")).toBe(project.id); expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => finish!(reply(task, 201)));
  });
});
