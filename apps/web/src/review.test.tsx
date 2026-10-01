// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReviewWorkspace } from "./review.js";

function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
afterEach(() => vi.unstubAllGlobals());

describe("ReviewWorkspace", () => {
  it("loads the inbox, opens a task, and sends a version-bound submission with CSRF", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/inbox")) return response({ items: [{ roundId: "round-1", taskId: "task-1", taskTitle: "Review plan", projectId: "project-1", projectTitle: "Studio", roundNumber: 1, status: "IN_REVIEW" }] });
      if (url.endsWith("/tasks/task-1") && init?.method !== "POST") return response({ task: { id: "task-1", title: "Review plan", status: "IN_PROGRESS", version: 4, reviewRequirement: "REQUIRED", projectId: "project-1" }, assignment: null, rounds: [], categories: [], reviewerCandidates: [], correctionOwnerCandidates: [], availableRevisions: [{ id: "revision-1", label: "R2", state: "WORKING" }], capabilities: { assignReviewer: false, submit: true, start: false, comment: false, decide: false, assignCorrection: false, complete: false, manageCategories: false } });
      if (url.endsWith("/tasks/task-1/submit")) return response({ ok: true });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter><ReviewWorkspace csrfToken="csrf-review" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /Review plan/ }));
    await screen.findByRole("heading", { name: "Review plan" });
    fireEvent.change(screen.getByLabelText("Exact drawing revision"), { target: { value: "revision-1" } });
    fireEvent.change(screen.getByLabelText("Submission reason"), { target: { value: "Ready for independent review" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/tasks/task-1/submit") && init?.method === "POST")).toBe(true));
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith("/tasks/task-1/submit") && init?.method === "POST");
    expect(call?.[1]?.headers).toMatchObject({ "X-CSRF-Token": "csrf-review" });
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ revisionId: "revision-1", expectedVersion: 4, reason: "Ready for independent review" });
  });

  it("shows empty inbox and explicit access denial states", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ message: "forbidden" }, 403)));
    render(<MemoryRouter><ReviewWorkspace csrfToken="csrf" /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have access to this review or task.");
    vi.stubGlobal("fetch", vi.fn(async () => response({ items: [] })));
    render(<MemoryRouter><ReviewWorkspace csrfToken="csrf" /></MemoryRouter>);
    expect(await screen.findByText("No review rounds are waiting in your inbox.")).toBeInTheDocument();
  });

  it("keeps the submitted task snapshot visible after the current task title changes and the detail refreshes", async () => {
    const round = { id: "round-history", roundNumber: 1, status: "APPROVED", submittedAt: "2026-09-30T08:00:00.000Z", submittedByName: "Asha", reviewerName: "Dev", taskVersion: 7, taskSnapshot: { title: "Original submitted title", priority: "HIGH", committedDueDate: "2026-11-15" }, revisionLabel: "R3", revisionFileId: "revision-file-3", comments: [{ id: "comment-one", authorName: "Dev", comment: "See markups", annotations: [], markupFileId: "markup-file-one", createdAt: "2026-09-30T08:10:00.000Z" }, { id: "comment-two", authorName: "Asha", comment: "Additional markup", annotations: [], markupFileId: "markup-file-two", createdAt: "2026-09-30T08:20:00.000Z" }], decision: { kind: "APPROVED" as const, comment: "Reviewed against submitted scope", decidedAt: "2026-09-30T08:30:00.000Z" } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      const url = String(input);
      if (url.endsWith("/inbox")) return response({ items: [{ roundId: round.id, taskId: "task-history", taskTitle: "Edited current title", projectId: "project-1", projectTitle: "Studio", roundNumber: 1, status: "APPROVED" }] });
      if (url.endsWith("/tasks/task-history")) return response({ task: { id: "task-history", title: "Edited current title", status: "INTERNAL_APPROVED", version: 9, reviewRequirement: "INTERNAL", projectId: "project-1" }, assignment: null, rounds: [round], categories: [], reviewerCandidates: [], correctionOwnerCandidates: [], availableRevisions: [], capabilities: { assignReviewer: false, submit: false, start: false, comment: false, decide: false, assignCorrection: false, complete: false, manageCategories: false } });
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter><ReviewWorkspace csrfToken="csrf-review" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: /Edited current title/ }));
    await screen.findByRole("heading", { name: "Edited current title" });
    const snapshot = screen.getByRole("region", { name: "Round 1 submission snapshot" });
    expect(snapshot).toHaveTextContent("Task version7");
    expect(snapshot).toHaveTextContent("Title at submissionOriginal submitted title");
    expect(snapshot).toHaveTextContent("Priority at submissionHIGH");
    expect(snapshot).toHaveTextContent("Committed date at submission2026-11-15");
    expect(screen.getByRole("link", { name: "Download exact submitted revision R3" })).toHaveAttribute("href", "/api/v1/documents/files/revision-file-3/stream");
    const markupLinks = screen.getAllByRole("link", { name: "Download markup file" });
    expect(markupLinks).toHaveLength(2);
    expect(markupLinks.map((link) => link.getAttribute("href"))).toEqual(["/api/v1/documents/files/markup-file-one/stream", "/api/v1/documents/files/markup-file-two/stream"]);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/tasks/task-history")).length).toBeGreaterThan(1));
    expect(screen.getByRole("region", { name: "Round 1 submission snapshot" })).toHaveTextContent("Original submitted title");
    expect(screen.getByRole("heading", { name: "Edited current title" })).toBeInTheDocument();
  });

  it("shows authorized task/review controls and immutable withdrawal/escalation history with isolated comment and decision drafts", async () => {
    const rounds = [
      { id: "round-active", roundNumber: 1, status: "IN_REVIEW", submittedAt: "2026-09-30T08:00:00Z", submittedByName: "Asha", reviewerName: "Dev", taskVersion: 3, taskSnapshot: { title: "Plan", priority: "HIGH", committedDueDate: "2026-11-15" }, comments: [], withdrawal: null, escalations: [{ id: "escalation-old", recipientAccountId: "lead@example.test", reason: "Resolve reviewer conflict", createdAt: "2026-09-30T08:20:00Z" }] },
      { id: "round-withdrawn", roundNumber: 2, status: "SUBMITTED", submittedAt: "2026-09-30T09:00:00Z", submittedByName: "Asha", reviewerName: "Dev", taskVersion: 4, taskSnapshot: { title: "Plan", priority: "HIGH", committedDueDate: "2026-11-15" }, comments: [], withdrawal: { reason: "Replace incorrect upload", at: "2026-09-30T09:15:00Z", actorId: "employee-1" }, escalations: [] }
    ];
    const detail = { task: { id: "task-controls", title: "Plan", status: "SUBMITTED_INTERNAL_REVIEW", version: 6, reviewRequirement: "INTERNAL", projectId: "project-controls", priority: "HIGH" as const, committedDueDate: "2026-11-15" }, assignment: null, rounds, categories: [], reviewerCandidates: [], correctionOwnerCandidates: [], availableRevisions: [], availableMarkupFiles: [{ id: "markup-file-1", fileName: "coordination.pdf", mimeType: "application/pdf" }, { id: "markup-file-2", fileName: "markup.png", mimeType: "image/png" }], capabilities: { assignReviewer: false, submit: false, start: false, comment: true, decide: true, assignCorrection: false, complete: false, manageCategories: false, escalate: true, withdraw: true, changePriority: true, changeDeadline: true } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      const url = String(input);
      if (url.endsWith("/inbox")) return response({ items: [] });
      if (url.endsWith("/tasks/task-controls")) return response(detail);
      if (url.includes("/escalate") || url.includes("/withdraw") || url.includes("/priority") || url.includes("/deadline")) return response(detail);
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MemoryRouter><ReviewWorkspace csrfToken="csrf-review" /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Open linked project task by ID"), { target: { value: "task-controls" } });
    fireEvent.click(screen.getByRole("button", { name: "Open task" }));
    await screen.findByRole("heading", { name: "Plan" });
    expect(screen.getByText(/Resolve reviewer conflict/)).toBeInTheDocument();
    expect(screen.getByText(/Replace incorrect upload/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload markup in the project document register" })).toHaveAttribute("href", "/documents?projectId=project-controls");
    expect(screen.getByLabelText("Uploaded markup file")).toHaveValue("");
    expect(screen.getByLabelText("Uploaded markup file").querySelectorAll("option")).toHaveLength(3);
    expect(screen.queryByLabelText("Uploaded markup file ID")).not.toBeInTheDocument();
    const taskControls = screen.getByRole("heading", { name: "Task controls" }).closest("section")!;
    expect(taskControls).toHaveTextContent("Task priority: HIGH");
    expect(taskControls).toHaveTextContent("Committed date: 2026-11-15");

    const commentForm = screen.getByRole("heading", { name: "Add comment or markup" }).closest("form")!;
    const decisionForm = screen.getByRole("heading", { name: "Record decision" }).closest("form")!;
    fireEvent.change(within(commentForm).getByLabelText("Comment"), { target: { value: "Comment draft only" } });
    fireEvent.change(within(commentForm).getByLabelText("Annotation text"), { target: { value: "Comment annotation" } });
    fireEvent.change(within(commentForm).getByLabelText("Uploaded markup file"), { target: { value: "markup-file-1" } });
    fireEvent.change(within(decisionForm).getByLabelText("Decision"), { target: { value: "CORRECTIONS_REQUIRED" } });
    fireEvent.change(within(decisionForm).getByLabelText("Decision comment"), { target: { value: "Decision draft only" } });
    fireEvent.change(within(decisionForm).getByLabelText("Annotation text"), { target: { value: "Decision annotation" } });
    fireEvent.change(within(decisionForm).getByLabelText("Uploaded markup file"), { target: { value: "markup-file-2" } });
    expect(within(commentForm).getByLabelText("Comment")).toHaveValue("Comment draft only");
    expect(within(decisionForm).getByLabelText("Decision comment")).toHaveValue("Decision draft only");
    expect(within(commentForm).getByLabelText("Annotation text")).toHaveValue("Comment annotation");
    expect(within(decisionForm).getByLabelText("Annotation text")).toHaveValue("Decision annotation");

    const escalationForm = screen.getAllByRole("heading", { name: "Escalate review" })[0]!.closest("form")!;
    fireEvent.change(within(escalationForm).getByLabelText("Escalation reason"), { target: { value: "Need independent lead intervention" } });
    fireEvent.click(within(escalationForm).getByRole("button", { name: "Record escalation" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/rounds/round-active/escalate"))).toBe(true));
    expect(JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).endsWith("/rounds/round-active/escalate"))?.[1]?.body))).toEqual({ reason: "Need independent lead intervention" });

    const withdrawalForm = screen.getAllByRole("heading", { name: "Withdraw submission" })[0]!.closest("form")!;
    fireEvent.change(within(withdrawalForm).getByLabelText("Withdrawal reason"), { target: { value: "Correct the submitted file selection" } });
    fireEvent.click(within(withdrawalForm).getByRole("button", { name: "Withdraw submission" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/rounds/round-active/withdraw"))).toBe(true));
    expect(JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).endsWith("/rounds/round-active/withdraw"))?.[1]?.body))).toEqual({ reason: "Correct the submitted file selection" });

    const priorityForm = screen.getByRole("heading", { name: "Task controls" }).closest("section")!.querySelector("form")!;
    fireEvent.change(within(priorityForm).getByLabelText("New priority"), { target: { value: "CRITICAL" } });
    fireEvent.change(within(priorityForm).getByLabelText("Priority change reason"), { target: { value: "Client risk requires immediate priority" } });
    fireEvent.click(within(priorityForm).getByRole("button", { name: "Change priority" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/rounds/round-withdrawn/priority"))).toBe(true));
    expect(JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).endsWith("/rounds/round-withdrawn/priority"))?.[1]?.body))).toMatchObject({ priority: "CRITICAL", expectedVersion: 6, reason: "Client risk requires immediate priority" });

    const deadlineForm = screen.getByRole("heading", { name: "Task controls" }).closest("section")!.querySelectorAll("form")[1]!;
    fireEvent.change(within(deadlineForm).getByLabelText("New committed date"), { target: { value: "2026-12-01" } });
    fireEvent.change(within(deadlineForm).getByLabelText("Committed date change reason"), { target: { value: "Approved client commitment moved" } });
    fireEvent.click(within(deadlineForm).getByRole("button", { name: "Change committed date" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/rounds/round-withdrawn/deadline"))).toBe(true));
    expect(JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).endsWith("/rounds/round-withdrawn/deadline"))?.[1]?.body))).toMatchObject({ committedDueDate: "2026-12-01", expectedVersion: 6, reason: "Approved client commitment moved" });
  });
});
