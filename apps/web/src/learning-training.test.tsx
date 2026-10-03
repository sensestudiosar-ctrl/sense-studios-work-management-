// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TrainingWorkspace } from "./learning-training.js";

const employeeId = "00000000-0000-4000-8000-000000000011", reviewerId = "00000000-0000-4000-8000-000000000012", assignmentId = "00000000-0000-4000-8000-000000000013", versionId = "00000000-0000-4000-8000-000000000014";
const question = { id: "safe-q", prompt: "What is the safe first step?", options: [{ id: "inspect", label: "Inspect the setup" }, { id: "skip", label: "Skip inspection" }] };
const moduleChoice = { id: "module-id", versionId, version: 4, title: "Safe studio setup", category: "Operations", assessment: { criteria: "Demonstrates the safe setup procedure.", practicalRequired: false, questionCount: 1 } };
const baseSetup = { employees: [{ id: employeeId, label: "E-11" }], modules: [moduleChoice], modulesByEmployee: [{ employeeId, modules: [moduleChoice] }], reviewers: [{ employeeId, reviewers: [{ accountId: reviewerId, label: "Team reviewer" }] }], practicalTasks: [], assignments: [], capabilities: { currentAccountId: reviewerId, manageableEmployeeIds: [employeeId], canManage: true, canSubmit: false } };
const safeContent = { blocks: [{ type: "TEXT", text: "Follow the setup steps." }], assessment: { criteria: "Demonstrates the safe setup procedure.", minimumCorrect: 1, quiz: [{ ...question, correctOptionIds: ["secret-answer-key"] }], practicalRequired: false } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("TrainingWorkspace", () => {
  it("assigns an exact published module to a named reviewer and reloads its persisted assignment", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    let assignment: Record<string, unknown> | null = null;
    const detail = { assignment: { id: assignmentId, employeeId, moduleVersionId: versionId, reviewerAccountId: reviewerId, state: "ASSIGNED", version: 1, data: { criteria: "Demonstrates the safe setup procedure." } }, module: { id: versionId, version: 4, title: "Safe studio setup", content: safeContent }, attempts: [], history: [{ id: "change-1", version: 1, state: "ASSIGNED", reason: "Assign onboarding training", occurredAt: "2026-10-03T00:00:00Z", data: {} }], capabilities: { isTrainee: false, canSubmit: false, canAssess: false, canRecordEffectiveness: false } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url.endsWith("/setup")) return json({ ...baseSetup, assignments: assignment ? [assignment] : [] });
      if (url.endsWith("/assignments")) { assignment = detail.assignment; return json({ id: assignmentId }); }
      if (url.endsWith(`/assignments/${assignmentId}`)) return json(detail);
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TrainingWorkspace csrfToken="training-csrf" />);
    await screen.findByRole("heading", { name: "Assign training" });
    const form = screen.getByRole("heading", { name: "Assign training" }).closest("section")!;
    fireEvent.change(within(form).getByLabelText("Module"), { target: { value: versionId } });
    fireEvent.change(within(form).getByLabelText("Named reviewer"), { target: { value: reviewerId } });
    fireEvent.change(within(form).getByLabelText("Assignment reason"), { target: { value: "Assign onboarding training" } });
    fireEvent.click(within(form).getByRole("button", { name: "Assign" }));
    await screen.findByRole("heading", { name: "Safe studio setup · Version 4" });
    const assignCall = calls.find(([url]) => url.endsWith("/assignments"));
    expect(assignCall?.[1]?.method).toBe("POST");
    expect(new Headers(assignCall?.[1]?.headers).get("X-CSRF-Token")).toBe("training-csrf");
    expect(JSON.parse(String(assignCall?.[1]?.body))).toMatchObject({ commandId: expect.any(String), employeeId, moduleVersionId: versionId, reviewerAccountId: reviewerId, reason: "Assign onboarding training" });
  });

  it("submits answers without exposing answer keys and waits for persisted state", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    let submitted = false;
    const traineeSetup = { ...baseSetup, capabilities: { currentAccountId: employeeId, manageableEmployeeIds: [], canManage: false, canSubmit: true }, assignments: [{ id: assignmentId, employeeId, moduleVersionId: versionId, reviewerAccountId: reviewerId, state: submitted ? "SUBMITTED" : "ASSIGNED", version: submitted ? 2 : 1 }] };
    const detail = () => ({ assignment: { ...traineeSetup.assignments[0], state: submitted ? "SUBMITTED" : "ASSIGNED", version: submitted ? 2 : 1, data: { latestQuizCorrect: 1, latestQuizCount: 1 } }, module: { id: versionId, version: 4, title: "Safe studio setup", content: safeContent }, attempts: [], history: [], capabilities: { isTrainee: true, canSubmit: !submitted, canAssess: false, canRecordEffectiveness: false } });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url.endsWith("/setup")) return json({ ...traineeSetup, assignments: [{ ...traineeSetup.assignments[0], state: submitted ? "SUBMITTED" : "ASSIGNED", version: submitted ? 2 : 1 }] });
      if (url.endsWith(`/assignments/${assignmentId}/submissions`)) { submitted = true; return json({ state: "SUBMITTED", version: 2, quizCorrect: 1, quizCount: 1 }); }
      if (url.endsWith(`/assignments/${assignmentId}`)) return json(detail());
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TrainingWorkspace csrfToken="trainee-csrf" />);
    await screen.findByText("Follow the setup steps.");
    expect(screen.getByText("Quiz threshold: 1 correct out of 1.")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("correctOptionIds");
    expect(document.body.innerHTML).not.toContain("secret-answer-key");
    fireEvent.click(screen.getByLabelText("Inspect the setup"));
    fireEvent.change(screen.getByLabelText("Submission note"), { target: { value: "Completed the reviewed setup." } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Submit the required training evidence" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit for review" }));
    await screen.findByText(/Submitted for review · Version 2/);
    const submitCall = calls.find(([url]) => url.endsWith(`/assignments/${assignmentId}/submissions`));
    expect(JSON.parse(String(submitCall?.[1]?.body))).toMatchObject({ expectedVersion: 1, answers: [{ questionId: "safe-q", optionIds: ["inspect"] }], note: "Completed the reviewed setup." });
    expect(JSON.stringify(JSON.parse(String(submitCall?.[1]?.body)))).not.toContain("correctOptionIds");
  });

  it("makes reviewer decisions and dated effectiveness observations with server refresh", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    let state = "SUBMITTED", version = 2;
    const assignment = () => ({ id: assignmentId, employeeId, moduleVersionId: versionId, reviewerAccountId: reviewerId, state, version });
    const detail = () => ({ assignment: assignment(), module: { id: versionId, version: 4, title: "Safe studio setup", content: safeContent }, attempts: [], history: [], capabilities: { isTrainee: false, canSubmit: false, canAssess: state === "SUBMITTED", canRecordEffectiveness: state === "COMPLETED" } });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url.endsWith("/skills/setup")) return json({ skills: [], eligibleApprovers: [] });
      if (url.includes("/skills/employees/")) return json({ ratings: [], requests: [], capabilities: { canRequest: false } });
      if (url.endsWith("/setup")) return json({ ...baseSetup, assignments: [assignment()] });
      if (url.endsWith("/assessments")) { state = "COMPLETED"; version = 3; return json({ state, version }); }
      if (url.endsWith("/effectiveness")) return json({});
      if (url.endsWith(`/assignments/${assignmentId}`)) return json(detail());
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TrainingWorkspace csrfToken="reviewer-csrf" />);
    await screen.findByRole("heading", { name: "Reviewer assessment" });
    fireEvent.change(screen.getByLabelText("Observation"), { target: { value: "The trainee demonstrated each authored criterion." } });
    fireEvent.change(screen.getByLabelText("Decision reason"), { target: { value: "Criteria were met in observed practice" } });
    fireEvent.click(screen.getByRole("button", { name: "Pass and complete" }));
    await screen.findByText(/Completed · Version 3/);
    const assessment = calls.find(([url]) => url.endsWith("/assessments"));
    expect(JSON.parse(String(assessment?.[1]?.body))).toMatchObject({ outcome: "PASSED", expectedVersion: 2, observation: "The trainee demonstrated each authored criterion." });
    fireEvent.change(screen.getByLabelText("Date observed"), { target: { value: "2026-10-02" } });
    fireEvent.change(screen.getByLabelText("Observation"), { target: { value: "Safe practices remained consistent." } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Record the follow-up observation" } });
    fireEvent.click(screen.getByRole("button", { name: "Record observation" }));
    await waitFor(() => expect(calls.some(([url]) => url.endsWith("/effectiveness"))).toBe(true));
    const effectiveness = calls.find(([url]) => url.endsWith("/effectiveness"));
    expect(JSON.parse(String(effectiveness?.[1]?.body))).toMatchObject({ date: "2026-10-02", observation: "Safe practices remained consistent." });
    expect(screen.queryByRole("button", { name: "Pass and complete" })).not.toBeInTheDocument();
  });

  it("keeps a rejected skill recommendation separate and allows a fresh version-bound request", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    let newRequest = false;
    const completed = { id: assignmentId, employeeId, moduleVersionId: versionId, reviewerAccountId: reviewerId, state: "COMPLETED", version: 3, data: { recommendationReason: "Observed safe studio practice." } };
    const oldRequest = { id: "old-request", skillId: "skill-1", proposedSkillName: null, requestedLevel: "ADVANCED", trainingSourceId: assignmentId, approvalState: "REJECTED", approverLabel: "Team reviewer", decisionEvidence: { outcome: "REJECTED", reason: "More evidence needed", decidedAt: "2026-10-02T00:00:00Z" } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url.endsWith("/skills/setup")) return json({ skills: [{ id: "skill-1", name: "Studio safety" }], eligibleApprovers: [{ employeeId, approvers: [{ accountId: reviewerId, label: "Team reviewer" }] }] });
      if (url.endsWith(`/skills/employees/${employeeId}`)) return json({ ratings: [{ skillId: "skill-1", version: 2 }], requests: newRequest ? [{ ...oldRequest, approvalState: "REJECTED" }, { ...oldRequest, id: "new-request", requestedLevel: "INTERMEDIATE", approvalState: "PENDING", decisionEvidence: null }] : [oldRequest], capabilities: { canRequest: true } });
      if (url.endsWith("/skills/requests")) { newRequest = true; return json({ id: "new-request" }); }
      if (url.endsWith("/setup")) return json({ ...baseSetup, assignments: [completed] });
      if (url.endsWith(`/assignments/${assignmentId}`)) return json({ assignment: completed, module: { id: versionId, version: 4, title: "Safe studio setup", content: safeContent }, attempts: [], history: [], capabilities: { isTrainee: false, canSubmit: false, canAssess: false, canRecordEffectiveness: true } });
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<TrainingWorkspace csrfToken="recommendation-csrf" />);
    const panel = await screen.findByRole("region", { name: "Skill recommendation" });
    expect(await within(panel).findByText(/REJECTED · ADVANCED/)).toBeInTheDocument();
    expect(within(panel).getByText(/More evidence needed/)).toBeInTheDocument();
    fireEvent.change(within(panel).getByLabelText("Skill"), { target: { value: "skill-1" } });
    fireEvent.change(within(panel).getByLabelText("Requested official level"), { target: { value: "INTERMEDIATE" } });
    fireEvent.change(within(panel).getByLabelText("Named approver"), { target: { value: reviewerId } });
    fireEvent.change(within(panel).getByLabelText("Reason"), { target: { value: "Add evidence after the prior review" } });
    fireEvent.click(within(panel).getByRole("button", { name: "Request skill rating" }));
    await within(panel).findByText("PENDING · INTERMEDIATE");
    const call = calls.find(([url]) => url.endsWith("/skills/requests"));
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ employeeId, skillId: "skill-1", requestedLevel: "INTERMEDIATE", expectedRatingVersion: 2, approverAccountId: reviewerId, trainingSourceId: assignmentId, reason: "Add evidence after the prior review" });
    expect(within(panel).getByText(/official rating stays unchanged until approval/)).toBeInTheDocument();
  });
});
