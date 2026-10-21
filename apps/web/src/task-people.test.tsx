// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { TaskPeople, type TaskPeopleTask } from "./task-people.js";

const task: TaskPeopleTask = { id: "task/one", title: "Prepare concept", version: 3, primaryOwnerEmployeeId: "employee-1", primaryOwner: { account: { normalizedEmail: "asha@example.test" } }, projectId: "project-1", reviewRequirement: "INTERNAL" };
const saved = { showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal"), close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close") };
function installDialogMocks(): void {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
}
beforeEach(installDialogMocks);
afterEach(() => {
  vi.unstubAllGlobals();
  for (const [name, descriptor] of Object.entries(saved)) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});
function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
function detailFor(value: TaskPeopleTask, collaborators: unknown[], people?: unknown): unknown { return { task: value, collaborators, ...(people ? { people } : {}) };
}
function assignedByFor(name: string, kind: "OWNER" | "STAFF"): unknown { return { assignedBy: { name, kind }, collaboratorAdders: [] };
}
function mount(overrides: Partial<ComponentProps<typeof TaskPeople>> = {}) {
  const onOpenTask = vi.fn();
  const view = render(<TaskPeople task={task} primaryOwnerLabel="Asha Rao" refreshVersion={0} onOpenTask={onOpenTask} {...overrides} />);
  return { ...view, onOpenTask };
}

describe("TaskPeople", () => {
  it("shows the actual owner and initials, and fetches collaborator detail only after People opens", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => { void input; void init; return response(detailFor(task, [{ employeeId: "employee-2", name: "Dev Shah" }])); });
    vi.stubGlobal("fetch", fetchMock);
    const { onOpenTask } = mount();
    expect(screen.getByText("AR")).toBeTruthy();
    expect(screen.getByRole("button", { name: /People on Prepare concept: responsible worker Asha Rao/ })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await screen.findByText("Dev Shah");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/tasks/task%2Fone");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include", cache: "no-store" });
    expect(onOpenTask).not.toHaveBeenCalled();
    expect(screen.getByText("Responsible worker")).toBeTruthy();
    expect(screen.getByText("Collaborator")).toBeTruthy();
    // No `people` block in this response, so the fallback copy still applies.
    expect(screen.getByText("Assigning person’s name unavailable.")).toBeTruthy();
  });

  it("shows the assigned-by person from task assignment history, distinct from collaborators", async () => {
    const fetchMock = vi.fn(async () => response(detailFor(task, [{ employeeId: "employee-2", name: "Dev Shah" }], assignedByFor("owner@example.test", "OWNER"))));
    vi.stubGlobal("fetch", fetchMock);
    mount();
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await screen.findByText("Dev Shah");
    expect(screen.getByText("owner@example.test · Owner")).toBeTruthy();
    expect(screen.queryByText("Assigning person’s name unavailable.")).toBeNull();
    // The assigner is not silently promoted to a collaborator.
    expect(screen.getAllByText("Collaborator").length).toBe(1);
  });

  it("clears denial before retry and never presents an empty collaborator count while unknown", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ message: "Forbidden" }, 403)).mockResolvedValueOnce(response(detailFor(task, [])));
    vi.stubGlobal("fetch", fetchMock);
    mount({ task: { ...task, reviewRequirement: "NONE" } });
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await screen.findByRole("alert");
    expect(screen.queryByText("No collaborators assigned.")).toBeNull();
    expect(screen.getByRole("button", { name: /People on Prepare concept/ }).textContent).not.toContain("+0");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("No collaborators assigned.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("aborts old detail when task version changes and only displays refreshed people", async () => {
    let resolveOld!: (value: Response) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(response(detailFor({ ...task, version: 4, reviewRequirement: "NONE" }, [{ employeeId: "new", name: "New Person" }])));
    vi.stubGlobal("fetch", fetchMock);
    const view = mount({ task: { ...task, reviewRequirement: "NONE" } });
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    view.rerender(<TaskPeople task={{ ...task, version: 4, reviewRequirement: "NONE" }} primaryOwnerLabel="Asha Rao" refreshVersion={0} onOpenTask={view.onOpenTask} />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await screen.findByText("New Person");
    resolveOld(response({ collaborators: [{ employeeId: "old", name: "Old Person" }] }));
    await Promise.resolve();
    expect(screen.queryByText("Old Person")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed detail and a response for a different task identity", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ collaborators: [] })).mockResolvedValueOnce(response(detailFor({ ...task, id: "other-task" }, [])));
    vi.stubGlobal("fetch", fetchMock);
    mount({ task: { ...task, reviewRequirement: "NONE" } });
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await screen.findByRole("alert");
    expect(screen.queryByText("No collaborators assigned.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("No collaborators assigned.")).toBeNull();
  });

  it("starts a fresh read when reopened while an earlier request is pending", async () => {
    let resolveOld!: (value: Response) => void;
    const fetchMock = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(response(detailFor(task, [{ employeeId: "employee-2", name: "Fresh Person" }])));
    vi.stubGlobal("fetch", fetchMock);
    mount({ task: { ...task, reviewRequirement: "NONE" } });
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Close people dialog" }));
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await screen.findByText("Fresh Person");
    resolveOld(response(detailFor(task, [{ employeeId: "old", name: "Old Person" }])));
    await Promise.resolve();
    expect(screen.queryByText("Old Person")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses the email local-part for initials and shows collaborator overflow", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(detailFor(task, [
      { employeeId: "2", name: "Ben Ives" }, { employeeId: "3", name: "Cara Ng" }, { employeeId: "4", name: "Drew Zed" }
    ]))));
    mount({ primaryOwnerLabel: "asha.rao@example.com" });
    expect(screen.getByText("AR")).toBeTruthy();
    expect(screen.queryByText("EC")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await screen.findByText("Drew Zed");
    expect(screen.getByText("+1")).toBeTruthy();
  });

  it("hides cached people synchronously when the task context changes", async () => {
    const fetchMock = vi.fn(async () => response(detailFor(task, [{ employeeId: "employee-2", name: "Old Collaborator" }])));
    vi.stubGlobal("fetch", fetchMock);
    const view = mount({ task: { ...task, reviewRequirement: "NONE" } });
    fireEvent.click(screen.getByRole("button", { name: /People on Prepare concept/ }));
    await screen.findByText("Old Collaborator");
    view.rerender(<TaskPeople task={{ ...task, version: 4, reviewRequirement: "NONE" }} primaryOwnerLabel="Asha Rao" refreshVersion={0} onOpenTask={view.onOpenTask} />);
    expect(screen.queryByText("Old Collaborator")).toBeNull();
  });

  it("closes to restore trigger focus and opens task details only from the explicit actions", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(detailFor(task, []))));
    const { onOpenTask } = mount();
    const trigger = screen.getByRole("button", { name: /People on Prepare concept/ });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Open task details" }));
    expect(onOpenTask).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
