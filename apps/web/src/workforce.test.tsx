import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { WorkforceWorkspace } from "./workforce.js";

const setup = { owner: false, employeeId: "employee-1", employees: [{ id: "employee-1", label: "Asha", branchId: "branch-1", teamId: "team-1" }, { id: "employee-2", label: "Dev", branchId: "branch-1", teamId: "team-1" }], branches: [{ id: "branch-1", label: "Studio" }], projects: [], tasks: [{ id: "task-1", title: "Concept", employeeIds: ["employee-1", "employee-2"] }], policies: [{ id: "policy-1", version: 1, branchId: "branch-1", data: { types: [{ key: "ANNUAL", label: "Annual leave", paid: true, consumesBalance: true, approvalLevels: ["MANAGER"] }] } }], schedules: [], sites: [] };
const data = { schedules: [], holidays: [], allocations: [], leaves: [], attendance: [], balances: [], workload: [], workloadPeriods: [] };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("WorkforceWorkspace", () => {
  it("only sends future calendar dates when requesting approved-leave cancellation", async () => {
    const localDate = (offset: number) => { const value = new Date(); value.setDate(value.getDate() + offset); return value.toLocaleDateString("en-CA"); };
    const today = localDate(0), future = localDate(3), past = localDate(-2);
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => { calls.push([String(input), init]); return String(input).endsWith("/setup") ? response(setup) : response({ ...data, leaves: [{ id: "leave-1", version: 2, employeeId: "employee-1", state: "APPROVED", typeKey: "ANNUAL", days: [{ date: past, portion: "FULL" }, { date: today, portion: "FULL" }, { date: future, portion: "FULL" }], history: [] }] }); }));
    render(<WorkforceWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Workforce" });
    const request = screen.getByText("Cancellation applies only to future unused dates.").closest("article")!;
    expect(within(request).getByRole("button", { name: "Request cancellation" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Reason for this action (required)"), { target: { value: "Cancel future unused leave" } });
    fireEvent.click(within(request).getByRole("button", { name: "Request cancellation" }));
    await waitFor(() => expect(calls.some(([url]) => url.endsWith("/leave/leave-1/cancel"))).toBe(true));
    const payload = JSON.parse(String(calls.find(([url]) => url.endsWith("/leave/leave-1/cancel"))?.[1]?.body));
    expect(payload.dates).toEqual([future]);
    expect(payload.dates).not.toContain(today);
    expect(payload.dates).not.toContain(past);
  });
  it("saves an explicit Owner selfie notice interval and leaves it unset until configured", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => { calls.push([String(input), init]); return String(input).endsWith("/setup") ? response({ ...setup, owner: true, policies: [] }) : response(data); }));
    window.history.replaceState(null, "", "#wf-leave");
    render(<WorkforceWorkspace csrfToken="csrf" owner />);
    await screen.findByRole("heading", { name: "Leave setup · Owner" });
    const panel = screen.getByRole("heading", { name: "Leave setup · Owner" }).closest("section")!;
    expect(within(panel).getByRole("spinbutton", { name: /Automatic selfie expiry notice/ })).toHaveValue(null);
    expect(within(panel).getByLabelText(/Policy effective from/)).toHaveValue("");
    fireEvent.change(within(panel).getByLabelText(/Policy effective from/), { target: { value: "2026-01-01" } });
    fireEvent.change(within(panel).getByLabelText("Branch"), { target: { value: "branch-1" } });
    fireEvent.change(within(panel).getByLabelText("Annual allowance (days)"), { target: { value: "20" } });
    fireEvent.change(within(panel).getByLabelText("Under-utilized limit %"), { target: { value: "50" } });
    fireEvent.change(within(panel).getByLabelText("Near-capacity limit %"), { target: { value: "80" } });
    fireEvent.change(within(panel).getByLabelText("Overloaded limit %"), { target: { value: "100" } });
    fireEvent.change(within(panel).getByLabelText("Type key"), { target: { value: "ANNUAL" } });
    fireEvent.change(within(panel).getByLabelText("Type label"), { target: { value: "Annual leave" } });
    fireEvent.change(within(panel).getByLabelText("Approval levels"), { target: { value: ["OWNER"] } });
    fireEvent.change(within(panel).getByLabelText("Paid"), { target: { value: "true" } });
    fireEvent.change(within(panel).getByLabelText("Consumes configured balance"), { target: { value: "true" } });
    fireEvent.change(within(panel).getByRole("spinbutton", { name: /Automatic selfie expiry notice/ }), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Reason for this action (required)"), { target: { value: "Configure expiry notice interval" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Save policy" }));
    await waitFor(() => expect(calls.some(([url]) => url === "/api/v1/workforce/policies")).toBe(true));
    const payload = JSON.parse(String(calls.find(([url]) => url === "/api/v1/workforce/policies")?.[1]?.body));
    expect(payload).toMatchObject({ effectiveFrom: "2026-01-01", selfieNoticeDays: 15, annualAllowanceDays: 20, thresholds: { under: 50, near: 80, over: 100 } });
  });
  it("renders server-calculated period rollups with capacity before allocations", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/setup") ? response(setup) : response({ ...data, workloadPeriods: [{ employeeId: "employee-1", from: "2026-10-02", to: "2026-10-08", policyId: "policy-1", scheduledMinutes: 2400, leaveMinutes: 240, capacityMinutes: 2160, allocatedMinutes: 1900, availableMinutes: 260, category: "NearCapacity" }] })));
    render(<WorkforceWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Workforce" });
    expect(screen.getByText("2026-10-02 – 2026-10-08")).toBeInTheDocument();
    expect(screen.getByText("2160 min")).toBeInTheDocument();
    expect(screen.getByText("1900 min")).toBeInTheDocument();
    expect(screen.getByText("NearCapacity")).toBeInTheDocument();
    expect(screen.getByText(/capacity is scheduled minus approved leave, before task allocations/)).toBeInTheDocument();
  });
  it("does not present missing setup as zero capacity", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/setup") ? response(setup) : response({ ...data, workloadPeriods: [{ employeeId: "employee-1", from: "2026-10-02", to: "2026-10-08", policyId: null, scheduledMinutes: 0, leaveMinutes: 0, capacityMinutes: 0, allocatedMinutes: 30, availableMinutes: 0, category: "SETUP_REQUIRED" }] })));
    render(<WorkforceWorkspace csrfToken="csrf" owner={false} />);
    const row = (await screen.findByText("2026-10-02 – 2026-10-08")).closest("tr")!;
    expect(within(row).getAllByText("Not ready")).toHaveLength(3);
    expect(within(row).getByText("30 min")).toBeInTheDocument();
    expect(within(row).getByText("Setup required")).toBeInTheDocument();
  });
  it("marks capacity unavailable when policy exists but a schedule is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/setup") ? response(setup) : response({ ...data, workload: [{ id: "day", version: 1, employeeId: "employee-1", date: "2026-10-02", category: "Under-utilized", scheduleSetupRequired: true, expectedLocation: "SCHEDULED" }], workloadPeriods: [{ employeeId: "employee-1", from: "2026-10-02", to: "2026-10-08", policyId: "policy-1", scheduledMinutes: 0, leaveMinutes: 0, capacityMinutes: 0, allocatedMinutes: 0, availableMinutes: 0, category: "Under-utilized", scheduleSetupRequired: true }] })));
    render(<WorkforceWorkspace csrfToken="csrf" owner={false} />);
    const row = (await screen.findByText("2026-10-02 – 2026-10-08")).closest("tr")!;
    expect(within(row).getAllByText("Not ready")).toHaveLength(3);
    expect(within(row).getByText("Setup required")).toBeInTheDocument();
    expect(within(row).queryByText("Under-utilized")).not.toBeInTheDocument();
    const daily = screen.getByText("2026-10-02", { selector: "td" }).closest("tr")!;
    expect(within(daily).getAllByText("Not ready")).toHaveLength(3);
  });
  it("shows the persisted remote work location for attendance during approved WFH", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/setup") ? response(setup) : response({ ...data, attendance: [{ id: "attendance-wfh", version: 1, state: "OPEN", workLocation: "REMOTE", checkedInAt: "2026-10-02T09:00:00.000Z", late: false, early: null, missingPunch: false }] })));
    render(<WorkforceWorkspace csrfToken="csrf" owner={false} />);
    const location = await screen.findByText("Work location: Remote");
    expect(location.closest("[data-record-id='attendance-wfh']")).toBeInTheDocument();
  });
  it("submits dated leave and explicit per-person allocation with CSRF and surfaces overload conflicts", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url.endsWith("/setup")) return response(setup);
      if (url.includes("/allocations")) {
        const payload = JSON.parse(String(init?.body)) as { acknowledgeOverload?: boolean };
        return payload.acknowledgeOverload ? response(data) : response({ message: "Overload warning: 90 minutes over available capacity" }, 409);
      }
      return response(data);
    }));
    render(<WorkforceWorkspace csrfToken="wf-csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Workforce" });
    fireEvent.change(screen.getByLabelText("Reason for this action (required)"), { target: { value: "Request annual leave" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "ANNUAL" } });
    const leavePanel = screen.getByRole("heading", { name: "Request leave or WFH" }).closest("section")!;
    fireEvent.change(within(leavePanel).getByLabelText("Date"), { target: { value: "2026-10-15" } });
    fireEvent.click(within(leavePanel).getByRole("button", { name: "Submit leave request" }));
    await waitFor(() => expect(calls.some(([url]) => url === "/api/v1/workforce/leave")).toBe(true));
    const leaveCall = calls.find(([url]) => url === "/api/v1/workforce/leave")!;
    expect(new Headers(leaveCall[1]?.headers).get("X-CSRF-Token")).toBe("wf-csrf");
    expect(JSON.parse(String(leaveCall[1]?.body))).toMatchObject({ typeKey: "ANNUAL", days: [{ date: "2026-10-15", portion: "FULL" }], emergency: false, commandId: expect.any(String) });

    await screen.findByText("Workforce record saved.");
    const initialAllocationPanel = screen.getByRole("heading", { name: "Explicit task allocation" }).closest("section")!;
    fireEvent.change(within(initialAllocationPanel).getByLabelText("Date"), { target: { value: "2026-10-02" } });
    await screen.findByRole("heading", { name: "Explicit task allocation" });
    fireEvent.change(screen.getByLabelText("Reason for this action (required)"), { target: { value: "Allocate concept work" } });
    const allocationPanel = screen.getByRole("heading", { name: "Explicit task allocation" }).closest("section")!;
    fireEvent.change(within(allocationPanel).getByLabelText("Employee"), { target: { value: "employee-2" } });
    fireEvent.change(within(allocationPanel).getByLabelText("Task"), { target: { value: "task-1" } });
    fireEvent.change(within(allocationPanel).getByLabelText("Estimated minutes"), { target: { value: "90" } });
    fireEvent.click(within(allocationPanel).getByRole("button", { name: "Allocate minutes" }));
    const warning = await screen.findByText("Capacity warning");
    const allocation = calls.find(([url]) => url === "/api/v1/workforce/allocations")!;
    expect(JSON.parse(String(allocation[1]?.body))).toMatchObject({ taskId: "task-1", employeeId: "employee-2", minutes: 90, acknowledgeOverload: false });
    expect(warning.closest("div")).toHaveTextContent("Overload warning");
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge warning and allocate" }));
    await waitFor(() => expect(calls.filter(([url]) => url === "/api/v1/workforce/allocations")).toHaveLength(2));
    expect(JSON.parse(String(calls.filter(([url]) => url === "/api/v1/workforce/allocations")[1]?.[1]?.body))).toMatchObject({ acknowledgeOverload: true, taskId: "task-1", employeeId: "employee-2", date: "2026-10-02", minutes: 90 });
  });

  it("shows setup-required state and hides management allocation for employees without grants", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/setup") ? response({ ...setup, policies: [], employees: [] }) : response(data)));
    window.history.replaceState(null, "", "#wf-leave");
    render(<WorkforceWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByText("Workforce setup required");
    expect(screen.getByText(/No leave policy or workload thresholds are active/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Explicit task allocation" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Attendance" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Attendance" })).toHaveAttribute("aria-current", "page"));
    expect(screen.getAllByRole("heading", { name: "Attendance" })).toHaveLength(2);
  });
});
