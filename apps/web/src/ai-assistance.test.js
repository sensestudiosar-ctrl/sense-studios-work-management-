import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiAssistanceWorkspace } from "./ai-assistance.js";
const context = { capabilities: { DAILY: true, PROJECT: true, ASSIGNMENT: true, canDecide: true }, projects: [{ id: "p1", title: "Studio" }], tasks: [{ id: "t1", title: "Reception" }], provider: "deterministic-evidence-v1", unavailableCapabilities: ["Training evidence unavailable"] };
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const run = { id: "r1", kind: "ASSIGNMENT", decisionVersion: 0, capabilities: { canDecide: true, canRecordOutcome: false }, result: { kind: "ASSIGNMENT", provider: "deterministic-evidence-v1", providerVersion: "1", summary: "Current evidence for task Reception.", candidates: [{ employeeId: "e1", label: "Asha", purpose: "PRIMARY_OWNER", team: "Studio Team", eligible: true, factors: [{ key: "capacity", label: "Available minutes", value: 0 }] }], unavailableFactors: ["Training history is unavailable"], limitations: ["Candidates are unranked."] }, decisions: [] };
const list = { items: [{ id: "r1", kind: "ASSIGNMENT", taskId: "t1", createdAt: "2026-10-07T10:00:00Z", decisionVersion: 0 }] };
beforeEach(() => { vi.restoreAllMocks(); vi.stubGlobal("fetch", vi.fn()); });
describe("evidence assistance workspace", () => {
    it("submits a bounded request with a stable command ID and session protections", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ id: "r1" })).mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json(list)).mockResolvedValueOnce(json(run));
        render(_jsx(AiAssistanceWorkspace, { csrfToken: "csrf-1" }));
        fireEvent.change(await screen.findByLabelText("From"), { target: { value: "2026-10-01" } });
        fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-07" } });
        fireEvent.change(screen.getByLabelText("Request reason"), { target: { value: "Review this week's priorities" } });
        fireEvent.click(screen.getByRole("button", { name: "Generate evidence summary" }));
        expect(await screen.findByText("Current evidence for task Reception.")).toBeInTheDocument();
        const post = fetchMock.mock.calls.find(([url, init]) => url === "/api/v1/ai/runs" && init?.method === "POST");
        expect(post?.[1]).toMatchObject({ credentials: "include", cache: "no-store", method: "POST" });
        expect(new Headers(post?.[1]?.headers).get("X-CSRF-Token")).toBe("csrf-1");
        expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ kind: "DAILY", reason: "Review this week's priorities", from: "2026-10-01", to: "2026-10-07", commandId: expect.any(String) });
        expect(screen.getByText(/no live inference or external data transmission/i)).toBeInTheDocument();
    });
    it("reuses a command ID when retrying the identical request after an uncertain failure", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ items: [] })).mockRejectedValueOnce(new Error("Connection interrupted"));
        render(_jsx(AiAssistanceWorkspace, { csrfToken: "csrf-retry" }));
        fireEvent.change(await screen.findByLabelText("From"), { target: { value: "2026-10-01" } });
        fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-07" } });
        fireEvent.change(screen.getByLabelText("Request reason"), { target: { value: "Retry the same safe request" } });
        fireEvent.click(screen.getByRole("button", { name: "Generate evidence summary" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Connection interrupted");
        fetchMock.mockResolvedValueOnce(json({ id: "r2" })).mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json({ items: [] })).mockResolvedValueOnce(json({ ...run, id: "r2" }));
        fireEvent.click(screen.getByRole("button", { name: "Generate evidence summary" }));
        await screen.findByText("Current evidence for task Reception.");
        const posts = fetchMock.mock.calls.filter(([url, init]) => url === "/api/v1/ai/runs" && init?.method === "POST");
        expect(JSON.parse(String(posts[0]?.[1]?.body)).commandId).toBe(JSON.parse(String(posts[1]?.[1]?.body)).commandId);
    });
    it("renders unranked candidates and records a reasoned, nonbinding decision only", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json(list)).mockResolvedValueOnce(json(run)).mockResolvedValueOnce(json({ decision: { id: "d1" } })).mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json(list)).mockResolvedValueOnce(json({ ...run, decisionVersion: 1, decisions: [{ id: "d1", outcome: "ACCEPTED", reason: "Current project workload fits" }] }));
        render(_jsx(AiAssistanceWorkspace, { csrfToken: "csrf-2" }));
        fireEvent.click(await screen.findByRole("button", { name: "Open" }));
        expect(await screen.findByText("Asha")).toBeInTheDocument();
        expect(screen.getByText("Eligible candidates (unranked)")).toBeInTheDocument();
        expect(screen.getByText("Training history is unavailable")).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText(/Asha/));
        fireEvent.change(screen.getByLabelText("Decision reason"), { target: { value: "Current project workload fits" } });
        fireEvent.click(screen.getByRole("button", { name: "Accept suggestion" }));
        expect(await screen.findByText(/No task, reviewer, deadline, or other domain record was changed/)).toBeInTheDocument();
        const decision = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith("/decisions") && init?.method === "POST");
        expect(JSON.parse(String(decision?.[1]?.body))).toMatchObject({ expectedDecisionVersion: 0, outcome: "ACCEPTED", reason: "Current project workload fits", selection: { purpose: "PRIMARY_OWNER", employeeId: "e1" } });
        expect(String(decision?.[0])).toBe("/api/v1/ai/runs/r1/decisions");
    });
    it("renders authorized Team IDs, source field/date labels, and retained outcome observations", async () => {
        const fetchMock = vi.mocked(fetch);
        const detail = {
            ...run,
            taskId: "t1",
            result: {
                ...run.result,
                facts: [
                    { id: "f-title", label: "Current task", field: "title", value: "Reception", sourceDate: null },
                    { id: "f-priority", label: "Current task", field: "priority", value: "HIGH", sourceDate: "2026-10-05" },
                ],
                candidates: [{ employeeId: "e1", label: "Asha", purpose: "PRIMARY_OWNER", teamId: "team-42", eligible: true, factors: [{ key: "capacity:availableMinutes", label: "Available minutes", value: 0 }, { key: "capacity:plannedMinutes", label: "Planned minutes", value: null }] }],
            },
            decisions: [
                { id: "d1", kind: "DECISION", outcome: "ACCEPTED", reason: "The current assignment fits." },
                { id: "o1", version: 2, kind: "OUTCOME", reason: "Verified during the ordinary task workflow.", observation: { taskId: "t1", taskVersion: 7, purpose: "PRIMARY_OWNER", employeeId: "e1", observedState: "CURRENT_PRIMARY_OWNER", observedAt: "2026-10-07T12:30:00.000Z" } },
            ],
        };
        fetchMock.mockResolvedValueOnce(json({ ...context, capabilities: { ...context.capabilities, canRecordOutcome: true } })).mockResolvedValueOnce(json(list)).mockResolvedValueOnce(json(detail));
        render(_jsx(AiAssistanceWorkspace, { csrfToken: "csrf-history" }));
        fireEvent.click(await screen.findByRole("button", { name: "Open" }));
        expect(await screen.findByText("Team team-42 · Eligible when checked")).toBeInTheDocument();
        expect(screen.getByText("Available minutes: 0")).toBeInTheDocument();
        expect(screen.getByText("Planned minutes: Unavailable")).toBeInTheDocument();
        expect(screen.getByText("Current task · Title")).toBeInTheDocument();
        expect(screen.getByText("Current task · Priority")).toBeInTheDocument();
        expect(screen.getByText("Current task · Priority").closest("li")).toHaveTextContent("HIGH · Source date 2026-10-05");
        expect(screen.getByText("Verified source observation")).toBeInTheDocument();
        expect(screen.getByText(/Current task state: current primary owner · Task version 7 · Observed 2026-10-07T12:30:00.000Z/)).toBeInTheDocument();
        expect(screen.getByText("Source task: t1")).toBeInTheDocument();
        expect(screen.getByText("Reason: Verified during the ordinary task workflow.")).toBeInTheDocument();
        expect(screen.getByText(/does not imply the suggestion caused it/)).toBeInTheDocument();
    });
    it("does not infer or reveal redacted outcome observation identity or state", async () => {
        const fetchMock = vi.mocked(fetch);
        const redactedDetail = {
            ...run,
            taskId: "t1",
            decisions: [{ id: "d1", kind: "DECISION", outcome: "ACCEPTED", reason: "Accepted after review." }, { id: "o1", version: 2, kind: "OUTCOME", reason: "Previously verified observation.", selectionEmployeeId: null, selectionPurpose: null, observation: null }],
        };
        fetchMock.mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json(list)).mockResolvedValueOnce(json(redactedDetail));
        render(_jsx(AiAssistanceWorkspace, { csrfToken: "csrf-redacted-outcome" }));
        fireEvent.click(await screen.findByRole("button", { name: "Open" }));
        expect(await screen.findByText("Verified source observation")).toBeInTheDocument();
        expect(screen.getByText("Observation details are unavailable under current access.")).toBeInTheDocument();
        expect(screen.getByText("Reason: Previously verified observation.")).toBeInTheDocument();
        expect(screen.queryByText(/Current task state:/)).not.toBeInTheDocument();
        expect(screen.queryByText("Source task: t1")).not.toBeInTheDocument();
        expect(screen.queryByText("e1")).not.toBeInTheDocument();
        expect(screen.getByText(/does not imply the suggestion caused it/)).toBeInTheDocument();
    });
    it("reports unavailable context and access loss without showing retained details", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json(list)).mockResolvedValueOnce(json(run)).mockResolvedValueOnce(json(context)).mockResolvedValueOnce(json(list)).mockResolvedValueOnce(json({ message: "forbidden" }, 403));
        render(_jsx(AiAssistanceWorkspace, { csrfToken: "csrf-3" }));
        fireEvent.click(await screen.findByRole("button", { name: "Open" }));
        expect(await screen.findByText("Current evidence for task Reception.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/access changed|no longer available/i));
        expect(screen.queryByText("Current evidence for task Reception.")).not.toBeInTheDocument();
    });
    it("does not submit unsupported requests and makes empty history explicit", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(json({ capabilities: {}, unavailableCapabilities: ["Management context is not authorized"] })).mockResolvedValueOnce(json({ items: [] }));
        render(_jsx(AiAssistanceWorkspace, { csrfToken: "csrf-4" }));
        expect(await screen.findByText("No evidence summaries are available in your current scope.")).toBeInTheDocument();
        expect(screen.getByText("Management context is not authorized")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Generate evidence summary" })).toBeDisabled();
    });
});
