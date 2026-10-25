import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PerformanceWorkspace } from "./performance.js";
const row = (id, kind, state, data, employeeId = null) => ({ id, organizationId: "org-1", kind, state, version: 1, employeeId, projectId: null, data, createdById: "owner-1", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z" });
const context = (owner = false, policies = []) => ({ owner, employeeId: "employee-1", employees: [{ id: "employee-1", label: "Asha", teamId: "team-1", branchId: "branch-1", canManage: owner }], projects: [], policies, assignments: [], metrics: [{ key: "TASK_ON_TIME", label: "On-time tasks", families: ["EMPLOYEE"], category: "quality", unit: "%", description: "Persisted completed task dates." }, { key: "ATTENDANCE_VERIFIED", label: "Verified attendance", families: ["EMPLOYEE"], category: "attendance", unit: "%", description: "Verified attendance records." }], unavailable: ["Training", "Skills", "SOP recommendations"] });
const emptyEmployee = (changes = {}) => ({ employee: { id: "employee-1", label: "Asha" }, snapshots: [], cycles: [], groupAssignments: [], teamAverage: null, relativeToAverage: null, canManage: false, unavailable: ["Training", "Skills", "SOP recommendations"], ...changes });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const setupFetch = (options = {}) => {
    const calls = [];
    vi.stubGlobal("fetch", vi.fn(async (input, init) => {
        const url = String(input);
        calls.push({ url, init });
        if (url.endsWith("/context"))
            return json(options.context ?? context(options.owner));
        if (url.endsWith("/dashboard/sources/health"))
            return json({ readCompletedAt: "2026-10-08T00:00:00.000Z", sections: [{ key: "health", rows: [] }] });
        if (url.includes("/employees/"))
            return json(options.employee ?? emptyEmployee());
        if (url.includes("/projects/"))
            return json(options.project ?? { project: { id: "project-1", label: "Studio", deliveryType: "DESIGN" }, snapshots: [], delays: [], delayTotalDays: 0, delayByCause: [], canManage: false, unavailable: [] });
        if (url.endsWith("/commands")) {
            const body = JSON.parse(String(init?.body));
            options.onCommand?.(body);
            return json(row("record-1", body.operation.startsWith("PROJECT") ? "HEALTH" : "POLICY", "DRAFT", body.policy ?? {}));
        }
        return json({});
    }));
    return calls;
};
afterEach(() => vi.unstubAllGlobals());
describe("PerformanceWorkspace", () => {
    it("keeps scores unavailable without an approved assigned policy and hides management actions from ordinary staff", async () => {
        setupFetch();
        render(_jsx(PerformanceWorkspace, { csrfToken: "csrf-1", owner: false }));
        await screen.findByText("Policy not configured");
        expect(screen.getByText(/No score is shown or generated/)).toBeInTheDocument();
        expect(await screen.findByText(/No published .*score history yet/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Generate employee snapshot/i })).not.toBeInTheDocument();
        expect(screen.queryByText("Owner policy setup and approval")).not.toBeInTheDocument();
        expect(screen.getByText(/Anonymous own-team average is unavailable/)).toBeInTheDocument();
    });
    it("creates a fully explicit draft and sends Owner approval as a version-bound CSRF command", async () => {
        let policies = [];
        const calls = [];
        let loseFirstCreateResponse = true;
        let releaseFirstCreate;
        const firstCreateResponse = new Promise(resolve => { releaseFirstCreate = resolve; });
        vi.stubGlobal("fetch", vi.fn(async (input, init) => {
            const url = String(input);
            calls.push({ url, init });
            if (url.endsWith("/context"))
                return json({ ...context(true), policies });
            if (url.includes("/employees/"))
                return json(emptyEmployee({ canManage: true }));
            if (url.endsWith("/commands")) {
                const body = JSON.parse(String(init?.body));
                if (body.operation === "POLICY_CREATE") {
                    policies = [row("policy-1", "POLICY", "DRAFT", body.policy ?? {})];
                    if (loseFirstCreateResponse) {
                        loseFirstCreateResponse = false;
                        await firstCreateResponse;
                        throw new TypeError("Connection closed after commit");
                    }
                }
                if (body.operation === "POLICY_APPROVE")
                    policies = policies.map(policy => ({ ...policy, state: "APPROVED", version: 2 }));
                return json(row("policy-1", "POLICY", "DRAFT", body.policy ?? {}));
            }
            return json({});
        }));
        render(_jsx(PerformanceWorkspace, { csrfToken: "csrf-1", owner: true }));
        await screen.findByText("Owner policy setup and approval");
        const editor = screen.getByText("Owner policy setup and approval").closest("details");
        expect(within(editor).getByLabelText("Role group key")).toHaveValue("");
        expect(within(editor).getByLabelText("Effective from")).toHaveValue("");
        expect(within(editor).queryByLabelText("Weight")).not.toBeInTheDocument();
        fireEvent.change(within(editor).getByLabelText("Policy family"), { target: { value: "EMPLOYEE" } });
        fireEvent.change(within(editor).getByLabelText("Role group key"), { target: { value: "DESIGNER" } });
        fireEvent.change(within(editor).getByLabelText("Label"), { target: { value: "Fictional test policy" } });
        fireEvent.change(within(editor).getByLabelText("Effective from"), { target: { value: "2026-10-01" } });
        fireEvent.click(within(editor).getByRole("button", { name: "Add measurable source" }));
        fireEvent.change(within(editor).getByLabelText("Weight"), { target: { value: "80" } });
        fireEvent.change(within(editor).getByLabelText("Minimum"), { target: { value: "0" } });
        fireEvent.change(within(editor).getByLabelText("Maximum"), { target: { value: "100" } });
        fireEvent.change(within(editor).getByLabelText("Attendance maximum weight"), { target: { value: "10" } });
        fireEvent.change(within(editor).getByLabelText("Efficiency maximum weight"), { target: { value: "5" } });
        fireEvent.change(within(editor).getByLabelText("Strength at or above"), { target: { value: "80" } });
        fireEvent.change(within(editor).getByLabelText("Weakness below"), { target: { value: "50" } });
        fireEvent.change(within(editor).getByLabelText("Critical below"), { target: { value: "25" } });
        fireEvent.change(within(editor).getByLabelText("Delayed below"), { target: { value: "50" } });
        fireEvent.change(within(editor).getByLabelText("At Risk below"), { target: { value: "75" } });
        fireEvent.change(screen.getByLabelText("Reason for this action (required)"), { target: { value: "Set up fictional test policy" } });
        fireEvent.click(within(editor).getByRole("button", { name: "Save policy draft" }));
        expect(screen.getByLabelText("Reason for this action (required)")).toBeDisabled();
        releaseFirstCreate();
        expect(await screen.findByRole("alert")).toHaveTextContent("Connection closed after commit");
        expect(screen.getByLabelText("Reason for this action (required)")).toBeEnabled();
        fireEvent.click(within(editor).getByRole("button", { name: "Save policy draft" }));
        await screen.findByText(/Fictional test policy · EMPLOYEE\/DESIGNER/);
        const createCalls = calls.filter(call => call.url.endsWith("/commands"));
        expect(createCalls).toHaveLength(2);
        const createCall = createCalls[0];
        const createBody = JSON.parse(String(createCall.init?.body));
        expect(createBody).toMatchObject({ operation: "POLICY_CREATE", reason: "Set up fictional test policy", commandId: expect.any(String), policy: { family: "EMPLOYEE", groupKey: "DESIGNER", effectiveFrom: "2026-10-01", components: [{ metric: "TASK_ON_TIME", weight: 80, min: 0, max: 100, required: true }] } });
        expect(new Headers(createCall.init?.headers).get("X-CSRF-Token")).toBe("csrf-1");
        expect(JSON.parse(String(createCalls[1]?.init?.body)).commandId).toBe(createBody.commandId);
        fireEvent.change(screen.getByLabelText("Reason for this action (required)"), { target: { value: "Approve fictional test policy" } });
        fireEvent.click(screen.getByRole("button", { name: "Approve policy" }));
        await waitFor(() => expect(calls.filter(call => call.url.endsWith("/commands"))).toHaveLength(3));
        const approveBody = JSON.parse(String(calls.filter(call => call.url.endsWith("/commands"))[2]?.init?.body));
        expect(approveBody).toMatchObject({ operation: "POLICY_APPROVE", id: "policy-1", expectedVersion: 1, reason: "Approve fictional test policy" });
    });
    it("shows persisted score arithmetic, redacted source evidence, anonymous average and cycle acknowledgement", async () => {
        const score = row("score-1", "SCORE", "ACTIVE", { family: "EMPLOYEE", from: "2026-10-01", to: "2026-10-07", policyId: "policy-1", policyVersion: 2, status: "SCORED", score: 82.5, previousSnapshotId: "score-0", scoreChange: 4.5, changeExplanation: ["On-time task performance improved from the prior source snapshot."], explanation: ["Quality led the result."], components: [{ metric: "TASK_ON_TIME", label: "On-time tasks", raw: 90, normalized: 90, weight: 100, evidence: [{ kind: "TASK", id: "task-1", version: 3, description: "Completed task" }] }], strengths: ["Reliable delivery"], weaknesses: ["Review evidence is limited"], repeatedMistakes: [{ category: "Incomplete review package", reviewRoundIds: ["round-1", "round-2"] }], operational: { scheduleVarianceDays: 2, scopeChangeImpact: [{ addedScope: "Approved lighting revision", effectiveAt: "2026-10-04" }], workloadRisk: [{ category: "Overloaded" }] }, excluded: [], unavailable: ["Training"] });
        const cycle = row("cycle-1", "CYCLE", "OPEN", { frequency: "MONTHLY", from: "2026-10-01", to: "2026-10-31", scoreId: "score-1", goals: ["Improve review readiness"], developmentActions: ["Use preflight checklist"], comments: [], acknowledgements: [], finalizedAt: null }, "employee-1");
        const calls = setupFetch({ employee: emptyEmployee({ snapshots: [score], cycles: [cycle], teamAverage: 76.25, relativeToAverage: 6.25 }) });
        render(_jsx(PerformanceWorkspace, { csrfToken: "csrf-1", owner: false }));
        expect(await screen.findByText("82.5 / 100")).toBeInTheDocument();
        expect(screen.getByText("Change from prior result:").closest("p")).toHaveTextContent("+4.5 points");
        expect(screen.getByText(/On-time task performance improved/)).toBeInTheDocument();
        expect(screen.getByText(/Incomplete review package \(2 review rounds\)/)).toBeInTheDocument();
        expect(screen.getByText(/Schedule variance: 2 days/)).toBeInTheDocument();
        expect(screen.getByText(/Approved lighting revision/)).toBeInTheDocument();
        expect(screen.getByText(/Schedule-derived capacity evidence: 1 dated allocation/)).toBeInTheDocument();
        expect(screen.getByText(/Your team average:/)).toHaveTextContent("76.3");
        expect(screen.getByText(/Completed task \(TASK task-1 v3\)/)).toBeInTheDocument();
        expect(screen.getByText(/Improve review readiness/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Reason for this action (required)"), { target: { value: "Acknowledge monthly cycle" } });
        fireEvent.change(screen.getByLabelText("Your acknowledgement"), { target: { value: "I have read this cycle." } });
        fireEvent.click(screen.getByRole("button", { name: "Acknowledge this cycle" }));
        await waitFor(() => expect(calls.some(call => call.url.endsWith("/commands"))).toBe(true));
        const body = JSON.parse(String(calls.find(call => call.url.endsWith("/commands"))?.init?.body));
        expect(body).toMatchObject({ operation: "CYCLE_ACKNOWLEDGE", id: "cycle-1", expectedVersion: 1, text: "I have read this cycle." });
        expect(new Headers(calls.find(call => call.url.endsWith("/commands"))?.init?.headers).get("X-CSRF-Token")).toBe("csrf-1");
    });
    it("renders retryable server errors and leaves unavailable views explicit", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => json({ message: "Performance service unavailable" }, 503)));
        render(_jsx(PerformanceWorkspace, { csrfToken: "csrf-1", owner: false }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Performance service unavailable");
        expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    });
    it("retains loaded project detail on same-project history navigation and reselection", async () => {
        const previousUrl = window.location.href;
        try {
            window.history.replaceState(null, "", "/project-health?projectId=project-1");
            const calls = setupFetch({
                context: { ...context(false), projects: [{ id: "project-1", label: "Studio", deliveryType: "DESIGN" }] },
                project: { project: { id: "project-1", label: "Studio", deliveryType: "DESIGN" }, snapshots: [], delays: [], delayTotalDays: 0, delayByCause: [], canManage: false, unavailable: [] },
            });
            render(_jsx(PerformanceWorkspace, { csrfToken: "csrf-1", owner: false, initialTab: "project", focused: true }));
            expect(await screen.findByRole("heading", { name: "Studio" })).toBeInTheDocument();
            expect(calls.filter(call => call.url.endsWith("/projects/project-1"))).toHaveLength(1);
            window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
            fireEvent.click(screen.getByRole("button", { name: /Studio.*Design/ }));
            expect(screen.getByRole("heading", { name: "Studio" })).toBeInTheDocument();
            expect(calls.filter(call => call.url.endsWith("/projects/project-1"))).toHaveLength(1);
        }
        finally {
            window.history.replaceState(null, "", previousUrl);
        }
    });
    it("preloads saved cycle goals and development actions before editing", async () => {
        const cycle = row("cycle-2", "CYCLE", "OPEN", { frequency: "MONTHLY", from: "2026-10-01", to: "2026-10-31", scoreId: null, goals: ["Keep the current goal", "Second goal"], developmentActions: ["Keep the current action"], comments: [], acknowledgements: [], finalizedAt: null }, "employee-1");
        setupFetch({ owner: true, employee: emptyEmployee({ cycles: [cycle], canManage: true }) });
        render(_jsx(PerformanceWorkspace, { csrfToken: "csrf-1", owner: true }));
        await waitFor(() => expect(screen.getByLabelText("Goals, one per line")).toHaveValue("Keep the current goal\nSecond goal"));
        await waitFor(() => expect(screen.getByLabelText("Development actions, one per line")).toHaveValue("Keep the current action"));
    });
});
