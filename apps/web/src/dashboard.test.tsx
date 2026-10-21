import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardWorkspace } from "./dashboard.js";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const overview = { today: "2026-10-05", role: "Owner", sections: [{ key: "work", label: "My work", rows: [] }, { key: "skills", label: "Skills & training", rows: [], unavailable: "Skills and training evidence is unavailable." }], decisions: { items: [{ id: "a1", title: "Approve task closeout", summary: "Ready for review", requesterLabel: "Asha", levelLabel: "Owner", typeKey: "TASK_CLOSEOUT", route: "/my-work", canDecide: true }] } };
const context = { categories: [{ key: "employee", label: "Employee" }, { key: "skills_training", label: "Skills and training" }], owner: true };
const table = { title: "Employee report", category: "employee", from: "2026-10-01", to: "2026-10-05", generatedAt: "2026-10-05T12:00:00.000Z", columns: [{ key: "employee", label: "Employee" }, { key: "hours", label: "Hours" }], rows: [{ employee: "Asha", hours: 12 }], unavailable: [] };
const initialHistory = { snapshots: [{ id: "snapshot-1", title: "Older employee report", category: "employee", from: "2026-10-01", to: "2026-10-03", createdAt: "2026-10-03T12:00:00.000Z", correctsId: null }] };
type Call = { url: string; init?: RequestInit };
function sourcePage(source: string, sections: unknown[]): Response {
  return json({ source, today: "2026-10-05", readCompletedAt: "2026-10-05T12:00:00.000Z", sections });
}
function mockFetch(options: { owner?: boolean; history?: unknown; summaries?: unknown; sourceResponse?: (source: string) => Response | Promise<Response> | undefined; onPost?: (url: string, body: Record<string, unknown>) => void } = {}): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); calls.push(init ? { url, init } : { url });
    if (url.includes("/dashboard/sources/")) {
      const source = new URL(url, "http://localhost").pathname.split("/").at(-1)!;
      const override = options.sourceResponse?.(source);
      if (override) return override;
      return json({
        source,
        today: "2026-10-05",
        readCompletedAt: "2026-10-05T12:00:00.000Z",
        sections: source === "tasks"
          ? [{ key: "work", label: "My work", rows: [] }]
          : source === "training"
            ? [{ key: "skills", label: "Skills & training", rows: [], unavailable: "Skills and training evidence is unavailable." }]
            : [],
        ...(source === "decisions" ? { decisions: overview.decisions } : {}),
      });
    }
    if (url.endsWith("/dashboard")) return json(overview);
    if (url.includes("/performance/context")) return json({ owner: options.owner ?? true, employeeId: "emp-1", employees: [{ id: "emp-1", label: "Asha", teamId: "team-1", branchId: null, canManage: true }], projects: [], policies: [{ id: "policy-1", family: "EMPLOYEE" }] });
    if (url.includes("/performance/employees/")) return json({ employee: { id: "emp-1", label: "Asha" }, snapshots: [{ id: "snap-1", data: { from: "2026-09-01", to: "2026-10-05", score: 82, status: "SCORED", family: "EMPLOYEE", policyId: "policy-1" } }], teamAverage: 75, relativeToAverage: 7 });
    if (url.includes("/reviews/inbox")) return json({ total: 1, items: [{ roundId: "round-1", taskId: "task-review", taskTitle: "Review floor plan", projectId: "proj-1", projectTitle: "Studio fitout", roundNumber: 1, status: "IN_REVIEW", dueDate: "2026-09-15", reviewerName: "Asha", submitterName: "Bela" }] });
    if (url.endsWith("/time/setup")) return json({ employeeId: options.owner ? null : "emp-1", projects: [], tasks: [] });
    if (url.endsWith("/time")) return json({ entries: [], timer: null });
    if (url.endsWith("/time/timers") && init?.method === "POST") { options.onPost?.(url, JSON.parse(String(init.body)) as Record<string, unknown>); return json({ id: "timer-1", state: "RUNNING", version: 1 }); }
    if (url.endsWith("/reports/context")) return json({ ...context, owner: options.owner ?? true });
    if (url.endsWith("/dashboard/schedules") && init?.method !== "POST") return json({ rules: [] });
    if (url.endsWith("/dashboard/reminders")) return json({ reminders: [] });
    if (url.endsWith("/dashboard/summaries")) return json(options.summaries ?? { summaries: [{ id: "summary-1", createdAt: "2026-10-05T12:00:00.000Z", sourceId: "rule-1", slot: "2:2026-10-05", summary: { kind: "EVENING", from: "2026-10-05", to: "2026-10-05", generatedAt: "2026-10-05T12:00:00.000Z", sections: [{ key: "completed", label: "Completed work", rows: [{ id: "task-1", label: "Prepare client package", status: "COMPLETED", value: "2 hours" }] }, { key: "missing", label: "Training", rows: [], unavailable: "Training evidence is unavailable." }] } }] });
    if (url.endsWith("/reports/snapshots")) {
      if (init?.method === "POST") { options.onPost?.(url, JSON.parse(String(init.body)) as Record<string, unknown>); return json({ id: "snapshot-new" }); }
      return json(options.history ?? initialHistory);
    }
    if (url.endsWith("/reports/preview")) return json(table);
    if (url.endsWith("/dashboard/schedules") && init?.method === "POST") { options.onPost?.(url, JSON.parse(String(init.body)) as Record<string, unknown>); return json({ id: "rule-new" }, 201); }
    if (url.endsWith("/reports/snapshots/snapshot-1")) return json({ snapshot: { id: "snapshot-1", category: "employee", from: "2026-10-01", to: "2026-10-03", createdAt: "2026-10-03T12:00:00.000Z", reason: "Original", correctsId: null }, table: { ...table, rows: [{ employee: "Asha", hours: 7 }] } });
    return json({});
  }));
  return calls;
}
function renderWorkspace(owner: boolean) { return render(<MemoryRouter><DashboardWorkspace accountId={owner ? "owner-test" : "staff-test"} csrfToken="csrf-s24" owner={owner} /></MemoryRouter>); }
function tile(label: string): HTMLElement {
  const key = label.toLowerCase().replace(/\s+/g, "-");
  const element = document.querySelector<HTMLElement>(`.dv-summary-card[data-summary="${key}"]`);
  if (!element) throw new Error(`Missing summary tile: ${label}`);
  return element;
}
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

describe("DashboardWorkspace", () => {
  it("keeps overlapping task buckets separate instead of inventing an all-domain work total", async () => {
    const task = { id: "task-shared", label: "Prepare drawings", status: "IN_PROGRESS", date: "2026-10-05" };
    mockFetch({ sourceResponse: source => source === "tasks" ? sourcePage(source, [
      { key: "attention", label: "Task attention", rows: [task] },
      { key: "overdue", label: "Overdue", rows: [task] },
      { key: "waiting", label: "Waiting", rows: [] },
    ]) : undefined });
    renderWorkspace(true);
    await waitFor(() => expect(within(tile("Overdue")).getByText("1", { exact: true })).toBeInTheDocument());
    expect(within(tile("Waiting / blocked")).getByText("0", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("Work items", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Across all active sources")).not.toBeInTheDocument();
  });

  it("uses the supplied health scale without turning health into completion or inventing a risk threshold", async () => {
    mockFetch({ sourceResponse: source => source === "health" ? sourcePage(source, [{ key: "health", label: "Health source", rows: [
      { id: "project-scored", label: "Studio fitout", score: 4, scoreScale: { min: 1, max: 5 }, status: "CURRENT" },
      { id: "project-no-scale", label: "Unscaled project", score: 12 },
    ] }]) : undefined });
    renderWorkspace(true);
    /* The project health source now renders as a widget, not a dedicated
       region, so assert the health-score meter is present (it also
       appears in the health widget and the health source card). */
    expect(await screen.findByText("Health score 4 · Scale 1–5")).toBeInTheDocument();
    expect(screen.getByText("Health score 12 · Scale unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/% complete/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Project timeline" })).not.toBeInTheDocument();
  });

  it("presents review task state and today's due work without fabricated activity or date windows", async () => {
    mockFetch({ sourceResponse: source => source === "tasks" ? sourcePage(source, [
      { key: "today", label: "Due today", rows: [{ id: "task-today", label: "Finish elevations", date: "2026-10-05", status: "IN_PROGRESS" }] },
      { key: "reviews", label: "Review tasks", rows: [{ id: "task-review", label: "Review floor plan", status: "CORRECTIONS_REQUIRED", date: "2026-09-01", route: "/tasks?taskId=task-review" }] },
    ]) : undefined });
    renderWorkspace(true);
    /* Review tasks surface in the tasks source card; assert the row
       and its explicit status/date without fabricating activity.
       V10 adds a second "Open" link (next-action widget), so
       disambiguate by href. */
    /* "Review floor plan" now appears in both the tasks source card and
       the decisions widget's "Assigned review rounds" sub-section
       (GAP 11), so query all occurrences. */
    expect((await screen.findAllByText("Review floor plan")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("CORRECTIONS_REQUIRED · 2026-09-01")).toBeInTheDocument();
    const reviewLinks = screen.getAllByRole("link");
    expect(reviewLinks.some(l => l.getAttribute("href") === "/tasks?taskId=task-review")).toBe(true);
    expect(screen.queryByText("Last 14 days")).not.toBeInTheDocument();
    expect(screen.queryByText("Due work in the next 30 days")).not.toBeInTheDocument();
  });

  it.each(["pending", "failed", "section-unavailable", "section-missing"])("does not publish zero for a %s task summary", async state => {
    mockFetch({ sourceResponse: source => source !== "tasks" ? undefined : state === "pending" ? new Promise<Response>(() => undefined)
      : state === "failed" ? json({ message: "Task source unavailable" }, 503)
      : sourcePage(source, state === "section-unavailable" ? [
        { key: "overdue", label: "Overdue", rows: [], unavailable: "Overdue evidence is unavailable." },
        { key: "waiting", label: "Waiting", rows: [], unavailable: "Waiting evidence is unavailable." },
      ] : []) });
    renderWorkspace(false);
    const expected = state === "pending" ? "Loading…" : "Unavailable";
    await waitFor(() => expect(within(tile("Overdue")).getByText(expected, { exact: true })).toBeInTheDocument());
    expect(within(tile("Waiting / blocked")).getByText(expected, { exact: true })).toBeInTheDocument();
    expect(within(tile("Overdue")).queryByText("0", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing needs your attention right now.")).not.toBeInTheDocument();
  });

  it("clears prior task evidence after a failed refresh while retaining healthy decision evidence", async () => {
    let taskReads = 0;
    mockFetch({ sourceResponse: source => source !== "tasks" ? undefined : ++taskReads === 1 ? sourcePage(source, [
      { key: "overdue", label: "Overdue", rows: [{ id: "task-prior", label: "Previously read task", status: "IN_PROGRESS" }] },
    ]) : json({ message: "Task read failed" }, 503) });
    renderWorkspace(false);
    await waitFor(() => expect(within(tile("Overdue")).getByText("1", { exact: true })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(within(tile("Overdue")).getByText("Unavailable", { exact: true })).toBeInTheDocument());
    expect(within(tile("Overdue")).queryByText("1", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Previously read task")).not.toBeInTheDocument();
    expect(screen.getByText("Approve task closeout")).toBeInTheDocument();
  });

  it("shows scoped sections and decisions while marking unavailable evidence instead of inventing a measure", async () => {
    const calls = mockFetch({ owner: false });
    renderWorkspace(false);
    expect(await screen.findByText("Approve task closeout")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit widgets" }));
    fireEvent.click(screen.getByRole("button", { name: "Add widgets" }));
    fireEvent.click(screen.getByRole("button", { name: /Training.*Add/ }));
    expect(screen.getByText("Skills and training evidence is unavailable.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Approve task closeout/ })).toHaveAttribute("href", "/my-work");
    expect(calls.filter(call => call.init?.method !== "POST").every(call => call.init?.credentials === "include" && call.init?.cache === "no-store")).toBe(true);
  });

  it("previews permitted report rows, hides freeze controls from staff, and retains export range", async () => {
    const calls = mockFetch({ owner: false });
    renderWorkspace(false);
    fireEvent.click(await screen.findByRole("button", { name: "Reports" }));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-05" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview report" }));
    expect(await screen.findByText("Asha")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Freeze report" })).not.toBeInTheDocument();
    const previewCall = calls.find(call => call.url.endsWith("/reports/preview"));
    expect(JSON.parse(String(previewCall?.init?.body))).toMatchObject({ category: "employee", from: "2026-10-05", to: "2026-10-05" });
    expect(new Headers(previewCall?.init?.headers).get("X-CSRF-Token")).toBe("csrf-s24");
  });

  it("shows the newest authorized scheduled summary and factual unavailable sections", async () => {
    const calls = mockFetch({ owner: false });
    renderWorkspace(false);
    fireEvent.click(await screen.findByRole("button", { name: "Scheduled summaries" }));
    expect(await screen.findByRole("heading", { name: "EVENING · 2026-10-05" })).toBeInTheDocument();
    expect(screen.getByText("Prepare client package")).toBeInTheDocument();
    expect(screen.getByText("Training evidence is unavailable.")).toBeInTheDocument();
    const summariesCall = calls.find(call => call.url.endsWith("/dashboard/summaries"));
    expect(summariesCall?.init).toMatchObject({ credentials: "include", cache: "no-store" });
  });

  it("shows an explicit empty state when there are no authorized scheduled summaries", async () => {
    mockFetch({ summaries: { summaries: [] } });
    renderWorkspace(false);
    fireEvent.click(await screen.findByRole("button", { name: "Scheduled summaries" }));
    expect(await screen.findByText("No generated summaries are available.")).toBeInTheDocument();
  });

  it("omits summary-inapplicable task filters and clears them when rule kind changes", async () => {
    let posted: Record<string, unknown> | undefined;
    const calls = mockFetch({ onPost: (_url, body) => { posted = body; } });
    renderWorkspace(true);
    fireEvent.click(await screen.findByRole("button", { name: "Reminders & schedules" }));
    fireEvent.change(screen.getByLabelText("Rule kind"), { target: { value: "TASK_REMINDER" } });
    fireEvent.change(screen.getByLabelText("Task reminder offset (days) · required"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "HIGH" } });
    fireEvent.change(screen.getByLabelText("Project ID (optional)"), { target: { value: "project-filter" } });
    fireEvent.change(screen.getByLabelText("Local time"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText("Timezone"), { target: { value: "Asia/Kolkata" } });
    fireEvent.change(screen.getByLabelText("Audience"), { target: { value: "OWNER" } });
    fireEvent.change(screen.getAllByLabelText("Reason", { exact: false }).at(-1)!, { target: { value: "Create factual summary schedule" } });
    fireEvent.change(screen.getByLabelText("Rule kind"), { target: { value: "SUMMARY" } });
    expect(screen.queryByLabelText("Task reminder offset (days) · required")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Priority")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Project ID (optional)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save schedule rule" }));
    await waitFor(() => expect(posted).toBeDefined());
    expect(posted).toMatchObject({ kind: "SUMMARY", summaryKind: "MORNING" });
    expect(posted).not.toHaveProperty("weekdays");
    expect(posted).not.toHaveProperty("dayOfMonth");
    expect(posted).not.toHaveProperty("offsetDays");
    expect(posted).not.toHaveProperty("priority");
    expect(posted).not.toHaveProperty("projectId");
    expect(posted).not.toHaveProperty("eventNames");
    expect(calls.find(call => call.url.endsWith("/dashboard/schedules") && call.init?.method === "POST")).toBeDefined();
  });

  it("freezes a reasoned Owner snapshot with a CSRF command and reads a historical table", async () => {
    let posted: Record<string, unknown> | undefined;
    const calls = mockFetch({ onPost: (_url, body) => { posted = body; } });
    renderWorkspace(true);
    fireEvent.click(await screen.findByRole("button", { name: "Reports" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview report" }));
    await screen.findByText("Asha");
    fireEvent.change(screen.getByLabelText("Reason for frozen report (required)"), { target: { value: "Freeze approved reporting period" } });
    fireEvent.click(screen.getByRole("button", { name: "Freeze report" }));
    await waitFor(() => expect(posted).toBeDefined());
    expect(posted).toMatchObject({ category: "employee", from: "2026-10-01", to: "2026-10-05", reason: "Freeze approved reporting period", commandId: expect.any(String) });
    const postCall = calls.find(call => call.url.endsWith("/reports/snapshots") && call.init?.method === "POST");
    expect(new Headers(postCall?.init?.headers).get("X-CSRF-Token")).toBe("csrf-s24");
    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(screen.getByText(/Reason: Original/)).toBeInTheDocument();
  });

  it("renders the performance dial from an authorized SCORED snapshot (GAP 10)", async () => {
    mockFetch({ owner: true });
    renderWorkspace(true);
    fireEvent.click(await screen.findByRole("button", { name: "Employees" }));
    const dial = await screen.findByRole("img", { name: "Score 82 out of 100" });
    expect(dial).toHaveStyle({ "--score-pct": "82%" });
    expect(screen.getAllByText("Asha").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-09-01 → 2026-10-05")).toBeInTheDocument();
    expect(screen.getByText("Team average")).toBeInTheDocument();
    expect(screen.getByText(/\+7 vs team/)).toBeInTheDocument();
  });

  it("lists assigned review rounds in the decisions widget (GAP 11)", async () => {
    /* Owner layout includes the decisions widget by default. */
    mockFetch({ owner: true });
    renderWorkspace(true);
    expect(await screen.findByText("Assigned review rounds")).toBeInTheDocument();
    expect(screen.getByText("1 total")).toBeInTheDocument();
    expect(screen.getByText(/Round 1/)).toBeInTheDocument();
  });

  it("starts a timer from the dashboard idle state and posts a CSRF command (GAP 12)", async () => {
    let posted: Record<string, unknown> | undefined;
    const calls = mockFetch({ owner: false, onPost: (url, body) => { if (url.endsWith("/time/timers")) posted = body; } });
    renderWorkspace(false);
    const startButton = await screen.findByRole("button", { name: "Start timer" });
    expect(startButton).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("What are you working on?"), { target: { value: "Dashboard timer test" } });
    fireEvent.click(startButton);
    await waitFor(() => expect(posted).toBeDefined());
    expect(posted).toMatchObject({ workNote: "Dashboard timer test", location: "OFFICE", billable: true, commandId: expect.any(String) });
    const postCall = calls.find(call => call.url.endsWith("/time/timers") && call.init?.method === "POST");
    expect(new Headers(postCall?.init?.headers ?? {}).get("X-CSRF-Token")).toBe("csrf-s24");
  });
});
