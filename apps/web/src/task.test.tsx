// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskWorkspace, type Detail, type Task } from "./task.js";

const setup = { actorEmployeeId: "employee-1", projects: [{ id: "project-1", title: "Studio", status: "ACTIVE", branchId: "branch-1" }], planItems: [{ id: "plan-1", projectId: "project-1", kind: "STAGE" as const, label: "Concept" }], employees: [{ id: "employee-1", name: "Asha", homeBranchId: "branch-1" }, { id: "employee-2", name: "Dev", homeBranchId: "branch-1" }], canAssign: true };
const task: Task = { id: "task-1", title: "Prepare concept", type: "PROJECT", priority: "MEDIUM", targetDate: "2026-10-12T00:00:00.000Z", description: "Draft the concept", projectId: "project-1", planItemId: "plan-1", tags: ["Design"], checklist: [{ label: "Confirm brief", checked: true }], primaryOwnerEmployeeId: "employee-1", status: "NOT_STARTED", version: 1, reviewRequirement: "NONE", createdAt: "2026-09-28T00:00:00.000Z" };
const detail: Detail = { task, collaborators: [], history: { statusChanges: [], ownerChanges: [] }, capabilities: { edit: false, transition: true, reassign: false } };

function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
afterEach(() => vi.unstubAllGlobals());

describe("TaskWorkspace", () => {
  it("creates a self-task without sending an owner override and includes the CSRF token", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 0, items: [] });
      if (url === "/api/v1/tasks") return response({ task: { ...task, id: "new-task" } });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf-test" owner={false} />);
    await screen.findByText("No tasks assigned to you yet.");
    fireEvent.click(screen.getByRole("button", { name: "Create task" }));
    fireEvent.change(screen.getByLabelText("Task name"), { target: { value: "Call supplier" } });
    fireEvent.change(screen.getByLabelText("Target date"), { target: { value: "2026-10-15" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Needed for project setup" } });
    fireEvent.change(screen.getByLabelText("Tags"), { target: { value: "Design, Review" } });
    fireEvent.change(screen.getByLabelText("Checklist"), { target: { value: "[ ] Confirm brief\n[x] Collect references" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Create task" }).at(-1)!);
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => String(url) === "/api/v1/tasks" && init?.method === "POST")).toBe(true));
    const call = fetchMock.mock.calls.find(([url, init]) => String(url) === "/api/v1/tasks" && init?.method === "POST");
    expect(call?.[1]?.headers).toMatchObject({ "X-CSRF-Token": "csrf-test" });
    expect(JSON.parse(String(call?.[1]?.body))).not.toHaveProperty("ownerEmployeeId");
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ tags: ["Design", "Review"], checklist: [{ label: "Confirm brief", checked: false }, { label: "Collect references", checked: true }] });
  });

  it("shows explicit assignment controls only when the setup endpoint permits assignment", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response({ ...setup, canAssign: false });
      if (url.includes("?scope=")) return response({ total: 1, items: [task] });
      if (url.endsWith("/task-1")) return response(detail);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    expect(screen.queryByText("Assign to an employee")).not.toBeInTheDocument();
    expect(screen.getByText("Asha")).toBeInTheDocument();
    expect(screen.getByText("Linked plan item: Concept")).toBeInTheDocument();
    expect(screen.getByText("Design", { selector: ".task-tags li" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Confirm brief" })).toBeChecked();
  });

  it("reports a stale task conflict and reloads authoritative details", async () => {
    let detailReads = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [task] });
      if (url.endsWith("/task-1/state") && init?.method === "POST") return response({}, 409);
      if (url.endsWith("/task-1")) { detailReads++; return response(detail); }
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    fireEvent.change(screen.getByLabelText("Reason for change"), { target: { value: "Begin scheduled work" } });
    fireEvent.click(screen.getByRole("button", { name: "Start task" }));
    expect(await screen.findByText(/changed elsewhere/)).toBeInTheDocument();
    await waitFor(() => expect(detailReads).toBeGreaterThan(1));
  });

  it("edits an open task with its expected version and reason", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [task] });
      if (url.endsWith("/task-1") && init?.method === "PUT") return response({ ...task, title: "Updated concept", version: 2 });
      if (url.endsWith("/task-1")) return response({ ...detail, capabilities: { ...detail.capabilities, edit: true } });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf-edit" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    fireEvent.click(screen.getByRole("button", { name: "Edit task" }));
    fireEvent.change(screen.getByLabelText("Task name"), { target: { value: "Updated concept" } });
    fireEvent.change(screen.getByLabelText("Edit reason"), { target: { value: "Clarify the design work" } });
    fireEvent.click(screen.getByRole("button", { name: "Save task" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/task-1") && init?.method === "PUT")).toBe(true));
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith("/task-1") && init?.method === "PUT");
    expect(call?.[1]?.headers).toMatchObject({ "X-CSRF-Token": "csrf-edit" });
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ expectedVersion: 1, title: "Updated concept", reason: "Clarify the design work", planItemId: "plan-1", tags: ["Design"], checklist: [{ label: "Confirm brief", checked: true }] });
    expect(JSON.parse(String(call?.[1]?.body))).not.toHaveProperty("committedDueDate");
  });

  it("sets a committed date separately from target date and displays immutable change history", async () => {
    let current: Detail = { ...detail, task: { ...task, status: "IN_PROGRESS", version: 2 }, history: { statusChanges: [], ownerChanges: [], committedDateChanges: [] }, capabilities: { ...detail.capabilities, changeCommittedDate: true } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [current.task] });
      if (url.endsWith("/task-1/committed-date") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ expectedVersion: 2, committedDueDate: "2026-10-20", reason: "Client approved the delivery commitment" });
        expect(init.headers).toMatchObject({ "X-CSRF-Token": "csrf-commit" });
        current = { ...current, task: { ...current.task, committedDueDate: "2026-10-20T00:00:00.000Z", version: 3 }, history: { ...current.history, committedDateChanges: [{ id: "date-change-1", oldDate: null, newDate: "2026-10-20T00:00:00.000Z", actorId: "owner-1", reason: "Client approved the delivery commitment", taskVersion: 3, occurredAt: "2026-09-29T10:00:00.000Z" }] } };
        return response(current);
      }
      if (url.endsWith("/task-1")) return response(current);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf-commit" owner={true} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    expect(screen.getByText("Target date").parentElement).toHaveTextContent("2026-10-12");
    expect(screen.getAllByText("Committed due date")[0]?.parentElement).toHaveTextContent("Not set");
    fireEvent.change(screen.getByLabelText("Committed due date"), { target: { value: "2026-10-20" } });
    fireEvent.change(screen.getByLabelText("Reason", { selector: "input" }), { target: { value: "Client approved the delivery commitment" } });
    fireEvent.click(screen.getByRole("button", { name: "Set committed date" }));
    await screen.findByText("Committed due date set.");
    expect(screen.getAllByText("Committed due date")[0]?.parentElement).toHaveTextContent("2026-10-20");
    expect(screen.getByText(/Committed due date set to 2026-10-20: Client approved the delivery commitment/)).toBeInTheDocument();
    expect(screen.getByText("Target date").parentElement).toHaveTextContent("2026-10-12");
  });

  it("links an accessible predecessor and requires a second acknowledged early-start action", async () => {
    let current: Detail = { ...detail, task: { ...task, status: "NOT_STARTED", version: 1 }, dependencies: { predecessors: [], hasUnfinished: false, hiddenCount: 0 }, capabilities: { ...detail.capabilities, transition: true, manageDependencies: true } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [current.task] });
      if (url.includes("/task-1/dependency-candidates")) return response({ items: [{ id: "task-a", title: "Prepare source drawings", status: "IN_PROGRESS" }] });
      if (url.endsWith("/task-1/dependencies") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ predecessorTaskId: "task-a", expectedVersion: 1, reason: "Drawings must be ready" });
        current = { ...current, task: { ...current.task, version: 2 }, dependencies: { predecessors: [{ id: "task-a", title: "Prepare source drawings", status: "IN_PROGRESS" }], hasUnfinished: true, hiddenCount: 0 } };
        return response({});
      }
      if (url.endsWith("/task-1/state") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ toState: "IN_PROGRESS", expectedVersion: 2, reason: "Start with known unfinished source", acknowledgeUnfinishedDependencies: true });
        current = { ...current, task: { ...current.task, status: "IN_PROGRESS", version: 3 }, capabilities: { ...current.capabilities, transition: true } };
        return response({});
      }
      if (url.endsWith("/task-1")) return response(current);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf-dependency" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    fireEvent.change(screen.getByLabelText("Search predecessor tasks"), { target: { value: "drawings" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("dependency-candidates?q=drawings"), expect.anything()));
    fireEvent.change(await screen.findByLabelText("Link an accessible predecessor"), { target: { value: "task-a" } });
    fireEvent.change(screen.getByLabelText("Reason for dependency change"), { target: { value: "Drawings must be ready" } });
    fireEvent.click(screen.getByRole("button", { name: "Add dependency" }));
    await screen.findByText("Dependency added.");
    expect(screen.getByText(/At least one predecessor is unfinished/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason for change"), { target: { value: "Start with known unfinished source" } });
    fireEvent.click(screen.getByRole("button", { name: "Review early start" }));
    expect(screen.queryByRole("button", { name: "Start task" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start anyway" }));
    await screen.findByText("Task marked in progress.");
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/task-1/state"))).toHaveLength(1);
  });

  it("flags exit-waiting tasks and withholds transitions until reassignment", async () => {
    const waiting = { ...task, status: "WAITING", requiresReassignment: true };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [waiting] });
      if (url.endsWith("/task-1")) return response({ ...detail, task: waiting, capabilities: { ...detail.capabilities, transition: true, reassign: false } });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    expect(screen.getAllByText(/Needs reassignment after employee exit/)).toHaveLength(2);
    expect(screen.getByText(/A manager must reassign this task before it can resume/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start task" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete task" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resume task" })).not.toBeInTheDocument();
  });

  it("waits with required cause and optional known party, then shows persisted history", async () => {
    let current: Detail = { ...detail, task: { ...task, status: "IN_PROGRESS", version: 2 }, capabilities: { ...detail.capabilities, wait: true, resume: false } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [current.task] });
      if (url.endsWith("/task-1/wait") && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body).toEqual({ expectedVersion: 2, reason: "Waiting for supplier access", delayCause: "Supplier credentials pending", responsibleParty: "Primary client" });
        expect(init.headers).toMatchObject({ "X-CSRF-Token": "csrf-wait" });
        current = { ...current, task: { ...current.task, status: "WAITING", version: 3, waitingReason: "Waiting for supplier access", waitingDelayCause: "Supplier credentials pending", waitingResponsibleParty: "Primary client" }, history: { statusChanges: [{ reason: "Waiting for supplier access", toStatus: "WAITING", delayCause: "Supplier credentials pending", responsibleParty: "Primary client" }], ownerChanges: [] }, capabilities: { ...current.capabilities, wait: false, resume: true } };
        return response(current);
      }
      if (url.endsWith("/task-1")) return response(current);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf-wait" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    expect(screen.getByRole("form", { name: "Wait on task" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason for waiting"), { target: { value: "Waiting for supplier access" } });
    fireEvent.change(screen.getByLabelText("Delay cause"), { target: { value: "Supplier credentials pending" } });
    fireEvent.change(screen.getByLabelText("Known responsible party (optional)"), { target: { value: "Primary client" } });
    fireEvent.click(screen.getByRole("button", { name: "Move to waiting" }));
    expect(await screen.findByText("Supplier credentials pending", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("Waiting for supplier access", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText(/Responsible party: Primary client/)).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Resume task" })).toBeInTheDocument();
  });

  it("resumes ordinary waiting with a reason and expected version", async () => {
    let current: Detail = { ...detail, task: { ...task, status: "WAITING", version: 5, waitingDelayCause: "Supplier response" }, history: { statusChanges: [], ownerChanges: [] }, capabilities: { ...detail.capabilities, transition: false, wait: false, resume: true } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [current.task] });
      if (url.endsWith("/task-1/resume") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ expectedVersion: 5, reason: "Supplier has restored access" });
        current = { ...current, task: { ...current.task, status: "IN_PROGRESS", version: 6, waitingDelayCause: null }, capabilities: { ...current.capabilities, transition: true, wait: true, resume: false } };
        return response(current);
      }
      if (url.endsWith("/task-1")) return response(current);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    fireEvent.change(screen.getByLabelText("Reason for resuming"), { target: { value: "Supplier has restored access" } });
    fireEvent.click(screen.getByRole("button", { name: "Resume task" }));
    await waitFor(() => expect(screen.getByText("In progress", { selector: ".task-state" })).toBeInTheDocument());
    expect(screen.getByText("Task resumed.")).toBeInTheDocument();
  });

  it("lets the current primary owner request a later commitment from a filtered approver and reloads the pending request", async () => {
    let current: Detail = { ...detail, task: { ...task, status: "IN_PROGRESS", version: 4, committedDueDate: "2026-10-20T00:00:00.000Z" }, capabilities: { ...detail.capabilities, requestExtension: true } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [current.task] });
      if (url.endsWith("/extension-approvers")) return response({ items: [{ accountId: "manager-1", name: "scoped-manager@example.test", kind: "STAFF" }, { accountId: "owner-1", name: "owner@example.test", kind: "OWNER" }] });
      if (url.endsWith("/extension-requests") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ expectedVersion: 4, proposedDate: "2026-10-27", approverAccountId: "manager-1", reason: "Supplier delivery moved by one week" });
        expect(init.headers).toMatchObject({ "X-CSRF-Token": "csrf-extension" });
        current = { ...current, task: { ...current.task, version: 5 }, capabilities: { ...current.capabilities, requestExtension: false }, extensions: [{ id: "approval-1", previousDate: "2026-10-20", proposedDate: "2026-10-27", reason: "Supplier delivery moved by one week", state: "PENDING", requesterId: "employee-1", approverId: "manager-1", requestedAt: "2026-09-29T10:00:00.000Z", canDecide: false }] };
        return response({ approvalId: "approval-1", state: "PENDING" }, 201);
      }
      if (url.endsWith("/task-1")) return response(current);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf-extension" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    await screen.findByRole("option", { name: "scoped-manager@example.test · Scoped manager" });
    expect(screen.getByRole("option", { name: "owner@example.test · Owner" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Proposed new date"), { target: { value: "2026-10-27" } });
    fireEvent.change(screen.getByLabelText("Approver"), { target: { value: "manager-1" } });
    fireEvent.change(screen.getByLabelText("Reason", { selector: "input" }), { target: { value: "Supplier delivery moved by one week" } });
    fireEvent.click(screen.getByRole("button", { name: "Request extension" }));
    expect(await screen.findByText("Deadline extension requested.")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Supplier delivery moved by one week").parentElement?.parentElement).toHaveTextContent("2026-10-20 → 2026-10-27");
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/task-1") && !init?.method)).toBe(true);
  });

  it("blocks extension submission when approvers are denied and allows an explicit retry", async () => {
    let approverReads = 0;
    const committed = { ...task, status: "IN_PROGRESS", version: 2, committedDueDate: "2026-10-20T00:00:00.000Z" };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [committed] });
      if (url.endsWith("/extension-approvers")) { approverReads++; return approverReads === 1 ? response({}, 403) : response({ items: [{ accountId: "owner-1", name: "owner@example.test", kind: "OWNER" }] }); }
      if (url.endsWith("/task-1")) return response({ ...detail, task: committed, capabilities: { ...detail.capabilities, requestExtension: true } });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("alert");
    expect(screen.getByText("Eligible approvers could not be loaded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request extension" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("option", { name: "owner@example.test · Owner" })).toBeInTheDocument();
    await waitFor(() => expect(approverReads).toBe(2));
  });

  it("approves an extension with a reason and refreshes committed date plus decision history", async () => {
    const pending = { id: "approval-2", previousDate: "2026-10-20", proposedDate: "2026-10-27", reason: "Supplier delivery moved by one week", state: "PENDING", requesterId: "employee-1", approverId: "manager-1", requestedAt: "2026-09-29T10:00:00.000Z", canDecide: true };
    let current: Detail = { ...detail, task: { ...task, status: "IN_PROGRESS", version: 7, committedDueDate: "2026-10-20T00:00:00.000Z" }, history: { statusChanges: [], ownerChanges: [] }, extensions: [pending], capabilities: { ...detail.capabilities, requestExtension: false } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [current.task] });
      if (url.endsWith("/extension-requests/approval-2/decision") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ outcome: "APPROVED", reason: "Owner confirmed revised delivery date" });
        expect(init.headers).toMatchObject({ "X-CSRF-Token": "csrf-decision" });
        current = { ...current, task: { ...current.task, version: 8, committedDueDate: "2026-10-27T00:00:00.000Z" }, history: { ...current.history, committedDateChanges: [{ id: "date-8", oldDate: "2026-10-20T00:00:00.000Z", newDate: "2026-10-27T00:00:00.000Z", actorId: "manager-1", reason: "Owner confirmed revised delivery date", taskVersion: 8, occurredAt: "2026-09-29T11:00:00.000Z" }] }, extensions: [{ ...pending, state: "APPROVED", canDecide: false, decision: { outcome: "APPROVED", reason: "Owner confirmed revised delivery date", decidedAt: "2026-09-29T11:00:00.000Z" } }] };
        return response({ approvalId: "approval-2", outcome: "APPROVED" }, 201);
      }
      if (url.endsWith("/task-1")) return response(current);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf-decision" owner={true} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    const reason = screen.getByLabelText("Decision reason");
    const approve = screen.getByRole("button", { name: "Approve extension" });
    expect(approve).toBeDisabled();
    fireEvent.change(reason, { target: { value: "Owner confirmed revised delivery date" } });
    fireEvent.click(approve);
    expect(await screen.findByText("Deadline extension approved.")).toBeInTheDocument();
    expect(screen.getByText("Approved: Owner confirmed revised delivery date")).toBeInTheDocument();
    expect(screen.getByText("2026-10-27", { selector: ".task-facts dd" })).toBeInTheDocument();
    expect(screen.getByText(/Committed due date changed from 2026-10-20 to 2026-10-27: Owner confirmed revised delivery date/)).toBeInTheDocument();
  });

  it("rejects an extension without changing the committed date", async () => {
    const pending = { id: "approval-3", previousDate: "2026-10-20", proposedDate: "2026-10-27", reason: "Supplier delivery moved by one week", state: "PENDING", requesterId: "employee-1", approverId: "owner-1", requestedAt: "2026-09-29T10:00:00.000Z", canDecide: true };
    let current: Detail = { ...detail, task: { ...task, status: "IN_PROGRESS", version: 9, committedDueDate: "2026-10-20T00:00:00.000Z" }, extensions: [pending], capabilities: { ...detail.capabilities, requestExtension: false } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [current.task] });
      if (url.endsWith("/extension-requests/approval-3/decision") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ outcome: "REJECTED", reason: "The revised date is not feasible" });
        current = { ...current, task: { ...current.task, version: 10 }, extensions: [{ ...pending, state: "REJECTED", canDecide: false, decision: { outcome: "REJECTED", reason: "The revised date is not feasible", decidedAt: "2026-09-29T11:00:00.000Z" } }] };
        return response({ approvalId: "approval-3", outcome: "REJECTED" }, 201);
      }
      if (url.endsWith("/task-1")) return response(current);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf" owner={true} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    fireEvent.change(screen.getByLabelText("Decision reason"), { target: { value: "The revised date is not feasible" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject extension" }));
    expect(await screen.findByText("Deadline extension rejected.")).toBeInTheDocument();
    expect(screen.getByText("Rejected: The revised date is not feasible")).toBeInTheDocument();
    expect(screen.getByText("2026-10-20", { selector: ".task-facts dd" })).toBeInTheDocument();
    expect(screen.queryByText(/Committed due date changed from/)).not.toBeInTheDocument();
  });

  it("allows an Owner to withdraw a pending extension with an auditable reason", async () => {
    const pending = { id: "approval-withdraw", previousDate: "2026-10-20", proposedDate: "2026-10-27", reason: "Supplier delivery moved", state: "PENDING", requesterId: "employee-1", approverId: "owner-1", requestedAt: "2026-09-29T10:00:00.000Z", canDecide: true, canWithdraw: true };
    let current: Detail = { ...detail, task: { ...task, status: "IN_PROGRESS", version: 6, committedDueDate: "2026-10-20T00:00:00.000Z" }, extensions: [pending], capabilities: { ...detail.capabilities, requestExtension: false } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [current.task] });
      if (url.endsWith("/task-1/extension-requests/approval-withdraw/withdraw") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ reason: "Owner is consolidating duplicate approvals" });
        current = { ...current, extensions: [{ ...pending, state: "WITHDRAWN", canWithdraw: false, decision: { outcome: "WITHDRAWN", reason: "Owner is consolidating duplicate approvals", decidedAt: "2026-09-29T11:00:00.000Z" } }] };
        return response({ approvalId: pending.id, state: "WITHDRAWN" });
      }
      if (url.endsWith("/task-1")) return response(current);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf-withdraw" owner={true} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    expect(screen.getByLabelText("Decision reason")).toBeInTheDocument();
    expect(screen.queryByLabelText("Reason for withdrawing request")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve extension" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Decision reason"), { target: { value: "Owner is consolidating duplicate approvals" } });
    fireEvent.click(screen.getByRole("button", { name: "Withdraw extension request" }));
    expect(await screen.findByText("Deadline extension request withdrawn.")).toBeInTheDocument();
    expect(screen.getByText("Withdrawn: Owner is consolidating duplicate approvals")).toBeInTheDocument();
  });

  it("configures, pauses and resumes a recurring task with versioned reasons and immutable history", async () => {
    const recurringTask = { ...task, type: "RECURRING", version: 4 };
    const current: Detail = { ...detail, task: recurringTask, capabilities: { ...detail.capabilities } };
    let schedule = { rule: null as null | { id: string; sourceTaskId: string; frequency: "DAILY" | "WEEKLY" | "MONTHLY"; anchorDate: string; effectiveFromDate: string; paused: boolean; version: number; configuredById: string; createdAt: string; updatedAt: string }, history: [] as Array<{ id: string; ruleVersion: number; action: "configured" | "paused" | "resumed"; actorId: string; reason: string; before: unknown; after: unknown; occurredAt: string }>, capabilities: { configure: true, pause: false, resume: false }, timezone: "Asia/Kolkata" };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [current.task] });
      if (url.endsWith("/task-1/recurrence") && init?.method === "PUT") {
        expect(JSON.parse(String(init.body))).toEqual({ expectedTaskVersion: 4, expectedVersion: 0, frequency: "MONTHLY", firstOccurrenceDate: "2026-10-31", reason: "Monthly client review cycle" });
        expect(init.headers).toMatchObject({ "X-CSRF-Token": "csrf-recurrence" });
        const after = { frequency: "MONTHLY", anchorDate: "2026-10-31T00:00:00.000Z", effectiveFromDate: "2026-10-31T00:00:00.000Z", paused: false };
        schedule = { ...schedule, rule: { id: "rule-1", sourceTaskId: "task-1", frequency: "MONTHLY", anchorDate: after.anchorDate, effectiveFromDate: after.effectiveFromDate, paused: false, version: 1, configuredById: "employee-1", createdAt: "2026-09-29T10:00:00.000Z", updatedAt: "2026-09-29T10:00:00.000Z" }, capabilities: { configure: true, pause: true, resume: false }, history: [{ id: "rec-history-1", ruleVersion: 1, action: "configured", actorId: "employee-1", reason: "Monthly client review cycle", before: null, after, occurredAt: "2026-09-29T10:00:00.000Z" }] };
        return response(schedule);
      }
      if (url.endsWith("/task-1/recurrence/pause") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ expectedTaskVersion: 4, expectedVersion: 1, reason: "Waiting for the next planning window" });
        const before = { paused: false }; const after = { paused: true };
        schedule = { ...schedule, rule: { ...schedule.rule!, paused: true, version: 2 }, capabilities: { configure: true, pause: false, resume: true }, history: [...schedule.history, { id: "rec-history-2", ruleVersion: 2, action: "paused", actorId: "employee-1", reason: "Waiting for the next planning window", before, after, occurredAt: "2026-09-29T11:00:00.000Z" }] };
        return response(schedule);
      }
      if (url.endsWith("/task-1/recurrence/resume") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({ expectedTaskVersion: 4, expectedVersion: 2, reason: "Planning window is open" });
        const before = { paused: true }; const after = { paused: false };
        schedule = { ...schedule, rule: { ...schedule.rule!, paused: false, version: 3, effectiveFromDate: "2026-10-31T00:00:00.000Z" }, capabilities: { configure: true, pause: true, resume: false }, history: [...schedule.history, { id: "rec-history-3", ruleVersion: 3, action: "resumed", actorId: "employee-1", reason: "Planning window is open", before, after, occurredAt: "2026-09-29T12:00:00.000Z" }] };
        return response(schedule);
      }
      if (url.endsWith("/task-1/recurrence")) return response(schedule);
      if (url.endsWith("/task-1")) return response(current);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf-recurrence" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    expect(await screen.findByText("Organization timezone:")).toHaveTextContent("Asia/Kolkata");
    fireEvent.change(screen.getByLabelText("Frequency"), { target: { value: "MONTHLY" } });
    fireEvent.change(screen.getByLabelText("First occurrence date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("Reason", { selector: "input" }), { target: { value: "Monthly client review cycle" } });
    fireEvent.click(screen.getByRole("button", { name: "Save recurrence rule" }));
    expect(await screen.findByText("Recurrence rule saved.")).toBeInTheDocument();
    expect(screen.getByText("Monthly", { selector: ".task-recurrence-facts dd" })).toBeInTheDocument();
    expect(screen.getByText("Configured")).toBeInTheDocument();
    expect(screen.getByText("Schedule history").parentElement).toHaveTextContent("Monthly client review cycle");
    fireEvent.change(screen.getByLabelText("Reason for pausing"), { target: { value: "Waiting for the next planning window" } });
    fireEvent.click(screen.getByRole("button", { name: "Pause recurrence" }));
    expect(await screen.findByText("Recurrence paused.")).toBeInTheDocument();
    expect(screen.getByText("Paused", { selector: ".task-recurrence-facts dd" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason for resuming"), { target: { value: "Planning window is open" } });
    fireEvent.click(screen.getByRole("button", { name: "Resume recurrence" }));
    expect(await screen.findByText("Recurrence resumed.")).toBeInTheDocument();
    expect(screen.getByText("Active", { selector: ".task-recurrence-facts dd" })).toBeInTheDocument();
    expect(screen.getByText("Paused", { selector: ".task-recurrence-history strong" })).toBeInTheDocument();
    expect(screen.getByText("Schedule history").parentElement).toHaveTextContent("Waiting for the next planning window");
    expect(screen.getByText("Resumed")).toBeInTheDocument();
    expect(screen.getByText("Schedule history").parentElement).toHaveTextContent("Planning window is open");
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/task-1/recurrence"))).toBe(true);
  });

  it("loads recurrence details only for recurring tasks and hides mutations without capabilities", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("?scope=")) return response({ total: 1, items: [task] });
      if (url.endsWith("/task-1")) return response(detail);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TaskWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Prepare concept" });
    expect(screen.queryByRole("region", { name: "Recurrence schedule" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/recurrence"))).toBe(false);
  });
});
