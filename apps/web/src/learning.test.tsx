// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SkillsTrainingWorkspace, SkillsWorkspace } from "./learning.js";

const skillId = "00000000-0000-4000-8000-000000000001", employeeId = "00000000-0000-4000-8000-000000000002", approverId = "00000000-0000-4000-8000-000000000003", requestId = "00000000-0000-4000-8000-000000000004";
const skill = { id: skillId, name: "Lighting", normalizedName: "lighting" };
const ownSetup = { skills: [skill], employees: [{ id: employeeId, employeeCode: "E-1", label: "E-1", homeBranchId: "branch-1", homeTeamId: "team-1" }], eligibleApprovers: [{ employeeId, approvers: [{ accountId: approverId, label: "Team lead" }] }] };
const trainingSetup = { employees: [], modules: [], modulesByEmployee: [], reviewers: [], practicalTasks: [], assignments: [], capabilities: { currentAccountId: "test-account", manageableEmployeeIds: [], canManage: false, canSubmit: false } };
const ownProfile = { ratings: [{ id: "rating-1", employeeId, skillId, level: "INTERMEDIATE" as const, version: 3 }], changes: [], requests: [], capabilities: { currentAccountId: employeeId, canRequest: true, canManage: false, canDirectRate: false } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("SkillsWorkspace", () => {
  it("submits a version-bound request, sends CSRF and reloads persisted ratings without optimistic promotion", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url.endsWith("/training/setup")) return json(trainingSetup);
      if (url.endsWith("/setup")) return json(ownSetup);
      if (url.includes(`/employees/${employeeId}`)) return json(ownProfile);
      if (url.endsWith("/requests")) return json({ id: requestId });
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SkillsWorkspace csrfToken="skills-csrf" />);
    await screen.findByText("Intermediate · Version 3");
    const form = screen.getByRole("heading", { name: "Request a skill rating" }).closest("section")!;
    fireEvent.change(within(form).getByLabelText("Skill"), { target: { value: skillId } });
    fireEvent.change(within(form).getByLabelText("Approver"), { target: { value: approverId } });
    fireEvent.change(within(form).getByLabelText("Reason"), { target: { value: "Apply the new lighting standard" } });
    fireEvent.click(within(form).getByRole("button", { name: "Submit request" }));
    await waitFor(() => expect(calls.some(([url]) => url === "/api/v1/skills/requests")).toBe(true));
    const call = calls.find(([url]) => url === "/api/v1/skills/requests");
    expect(call?.[1]?.method).toBe("POST");
    expect(new Headers(call?.[1]?.headers).get("X-CSRF-Token")).toBe("skills-csrf");
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ commandId: expect.any(String), employeeId, skillId, requestedLevel: "BEGINNER", expectedRatingVersion: 3, approverAccountId: approverId, reason: "Apply the new lighting standard" });
    await waitFor(() => expect(calls.filter(([url]) => url.includes(`/employees/${employeeId}`)).length).toBeGreaterThan(1));
    expect(screen.getByText("Intermediate · Version 3")).toBeInTheDocument();
  });

  it("shows decision controls only for canDecide and refreshes the persisted outcome and immutable evidence", async () => {
    const managerId = "00000000-0000-4000-8000-000000000005", reportId = employeeId;
    const setup = { ...ownSetup, employees: [{ id: managerId, employeeCode: "M-1", label: "M-1", homeBranchId: "branch-1", homeTeamId: "team-1" }, ownSetup.employees[0]] };
    let decided = false;
    const profile = () => ({ ratings: [], changes: [], requests: [{ id: requestId, skillId, proposedSkillName: null, requestedLevel: "ADVANCED" as const, expectedRatingVersion: 0, reason: "Request advanced lighting", createdAt: "2026-10-03T00:00:00Z", approvalState: decided ? "APPROVED" : "PENDING", approverAccountId: managerId, approverLabel: "M-1", decisionEvidence: decided ? { outcome: "APPROVED", reason: "Evidence reviewed", deciderId: managerId, decidedAt: "2026-10-03T01:00:00Z" } : null, canDecide: !decided }], capabilities: { currentAccountId: managerId, canRequest: true, canManage: true, canDirectRate: false } });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      const url = String(input);
      if (url.endsWith("/training/setup")) return json(trainingSetup);
      if (url.endsWith("/setup")) return json(setup);
      if (url.endsWith(`/employees/${reportId}`)) return json(profile());
      if (url.endsWith(`/employees/${managerId}`)) return json({ ratings: [], changes: [], requests: [], capabilities: { currentAccountId: managerId, canRequest: true, canManage: false, canDirectRate: false } });
      if (url.endsWith(`/requests/${requestId}/decision`)) { decided = true; return json({ id: requestId, state: "APPROVED" }); }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<SkillsWorkspace csrfToken="manager-csrf" />);
    await screen.findByText("No official skill ratings yet.");
    const picker = screen.getByLabelText("Employee profile"); fireEvent.change(picker, { target: { value: reportId } });
    await screen.findByText(/PENDING · Approver: M-1/);
    const card = (await screen.findByText(/Expected rating version: 0/)).closest("article")!;
    fireEvent.change(within(card).getByLabelText("Decision reason for Lighting"), { target: { value: "Evidence reviewed" } });
    fireEvent.click(within(card).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith(`/requests/${requestId}/decision`))).toBe(true));
    const decisionCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith(`/requests/${requestId}/decision`));
    expect(JSON.parse(String(decisionCall?.[1]?.body))).toMatchObject({ commandId: expect.any(String), outcome: "APPROVED", reason: "Evidence reviewed" });
    await screen.findByText(/APPROVED · Approver: M-1/);
    expect(screen.getByText("Evidence reviewed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("gates Owner controls from current capabilities", async () => {
    const ownerProfile = { ...ownProfile, capabilities: { currentAccountId: "owner-id", canRequest: false, canManage: true, canDirectRate: true } };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/training/setup") ? json(trainingSetup) : String(input).endsWith("/setup") ? json(ownSetup) : json(ownerProfile)));
    render(<SkillsWorkspace csrfToken="owner-csrf" />);
    await screen.findByRole("heading", { name: "Owner catalogue" });
    expect(screen.queryByRole("heading", { name: "Request a skill rating" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Owner direct rating" })).toBeInTheDocument();
  });

  it("ignores an older profile response after the selected employee changes", async () => {
    const secondId = "00000000-0000-4000-8000-000000000006";
    let resolveFirst!: (response: Response) => void;
    const delayedFirst = new Promise<Response>(resolve => { resolveFirst = resolve; });
    const setup = { ...ownSetup, employees: [...ownSetup.employees, { id: secondId, employeeCode: "E-2", label: "E-2", homeBranchId: "branch-1", homeTeamId: "team-1" }] };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/training/setup")) return json(trainingSetup);
      if (url.endsWith("/setup")) return json(setup);
      if (url.endsWith(`/employees/${employeeId}`)) return delayedFirst;
      if (url.endsWith(`/employees/${secondId}`)) return json({ ...ownProfile, ratings: [{ ...ownProfile.ratings[0], id: "rating-2", employeeId: secondId, level: "EXPERT" as const }], capabilities: { ...ownProfile.capabilities, currentAccountId: secondId } });
      return json({});
    }));
    render(<SkillsWorkspace csrfToken="csrf" />);
    const picker = await screen.findByLabelText("Employee profile"); fireEvent.change(picker, { target: { value: secondId } });
    await screen.findByText("Expert · Version 3");
    await act(async () => { resolveFirst(json(ownProfile)); });
    expect(screen.getByText("Expert · Version 3")).toBeInTheDocument();
    expect(screen.queryByText("Intermediate · Version 3")).not.toBeInTheDocument();
  });

  it("keeps the independently authorized Training panel available when Skills setup fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/training/setup") ? json(trainingSetup) : json({ message: "Skills unavailable" }, 503)));
    render(<SkillsTrainingWorkspace csrfToken="learning-csrf" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Skills unavailable");
    expect(await screen.findByRole("heading", { name: /^Training$/ })).toBeInTheDocument();
    expect(await screen.findByText("No training assignments are available to you.")).toBeInTheDocument();
  });

  it("keeps Training visible when the actor has no Skills employee profiles", async () => {
    const noEmployeeSetup = { skills: [], employees: [], eligibleApprovers: [] };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/training/setup") ? json(trainingSetup) : json(noEmployeeSetup)));
    render(<SkillsTrainingWorkspace csrfToken="learning-csrf" />);
    expect(await screen.findByText("No active employee profiles are available to you.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^Training$/ })).toBeInTheDocument();
    expect(await screen.findByText("No training assignments are available to you.")).toBeInTheDocument();
  });
});
