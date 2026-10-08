import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardWorkspace } from "./dashboard.js";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const overview = { today: "2026-10-05", role: "Owner", sections: [{ key: "work", label: "My work", rows: [] }, { key: "skills", label: "Skills & training", rows: [], unavailable: "Skills and training evidence is unavailable." }], decisions: { items: [{ id: "a1", title: "Approve task closeout", summary: "Ready for review", requesterLabel: "Asha", levelLabel: "Owner", typeKey: "TASK_CLOSEOUT", route: "/my-work", canDecide: true }] } };
const context = { categories: [{ key: "employee", label: "Employee" }, { key: "skills_training", label: "Skills and training" }], owner: true };
const table = { title: "Employee report", category: "employee", from: "2026-10-01", to: "2026-10-05", generatedAt: "2026-10-05T12:00:00.000Z", columns: [{ key: "employee", label: "Employee" }, { key: "hours", label: "Hours" }], rows: [{ employee: "Asha", hours: 12 }], unavailable: [] };
const initialHistory = { snapshots: [{ id: "snapshot-1", title: "Older employee report", category: "employee", from: "2026-10-01", to: "2026-10-03", createdAt: "2026-10-03T12:00:00.000Z", correctsId: null }] };
type Call = { url: string; init?: RequestInit };
function mockFetch(options: { owner?: boolean; history?: unknown; summaries?: unknown; onPost?: (url: string, body: Record<string, unknown>) => void } = {}): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); calls.push(init ? { url, init } : { url });
    if (url.includes("/dashboard/sources/")) {
      const source = new URL(url, "http://localhost").pathname.split("/").at(-1)!;
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
function renderWorkspace(owner: boolean) { return render(<MemoryRouter><DashboardWorkspace csrfToken="csrf-s24" owner={owner} /></MemoryRouter>); }
afterEach(() => vi.unstubAllGlobals());

describe("DashboardWorkspace", () => {
  it("shows scoped sections and decisions while marking unavailable evidence instead of inventing a measure", async () => {
    const calls = mockFetch({ owner: false });
    renderWorkspace(false);
    expect(await screen.findByText("My work")).toBeInTheDocument();
    expect(screen.getByText("Approve task closeout")).toBeInTheDocument();
    expect(screen.getByText("Skills and training evidence is unavailable.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/my-work");
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
});
