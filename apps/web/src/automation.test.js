import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { AutomationWorkspace } from "./automation.js";
const context = (runs = []) => ({ owner: true, projects: [{ id: "p1", title: "Studio" }], recipients: [{ id: "u1", label: "Operations lead" }], eventNames: ["TASK_COMPLETED"], categories: [{ key: "tasks", label: "Tasks" }], columns: [{ key: "source", label: "Source" }, { key: "label", label: "Record" }, { key: "status", label: "State" }, { key: "date", label: "Date" }, { key: "field", label: "Field / retained evidence" }, { key: "value", label: "Value" }], reports: [], rules: [], runs });
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
beforeEach(() => { vi.restoreAllMocks(); vi.stubGlobal("fetch", vi.fn()); });
describe("automation and reports", () => {
    it("previews a selected report definition with authenticated no-store access", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(json(context())).mockResolvedValueOnce(json({ table: { columns: [{ key: "label", label: "Record" }, { key: "status", label: "State" }], rows: [{ label: "Task A", status: "OPEN" }] }, chart: [{ label: "OPEN", count: 1 }] }));
        render(_jsx(AutomationWorkspace, { csrfToken: "csrf-value" }));
        fireEvent.change(await screen.findByLabelText("Report name"), { target: { value: "Open tasks" } });
        fireEvent.change(screen.getByLabelText("Category"), { target: { value: "tasks" } });
        fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-01" } });
        fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-06" } });
        fireEvent.click(screen.getByLabelText("Record"));
        fireEvent.click(screen.getByLabelText("State"));
        fireEvent.click(screen.getByRole("button", { name: "Preview report" }));
        expect(await screen.findByRole("heading", { name: "Report preview" })).toBeInTheDocument();
        expect(screen.getByText("Task A")).toBeInTheDocument();
        expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/automation/reports/preview");
        expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "POST", credentials: "include", cache: "no-store" });
        expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ title: "Open tasks", category: "tasks", columns: ["label", "status"] });
        expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("X-CSRF-Token")).toBe("csrf-value");
    });
    it("preserves a disabled rule while editing and sends the new enabled value with its expected version", async () => {
        const savedRule = { id: "rule-1", version: 4, data: { title: "Task notice", enabled: false, eventNames: ["TASK_COMPLETED"], condition: {}, action: { kind: "NOTIFY", recipientId: "u1" } } };
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(json({ ...context(), rules: [savedRule] })).mockResolvedValueOnce(json({ id: "rule-1", version: 5 })).mockResolvedValueOnce(json({ ...context(), rules: [{ ...savedRule, version: 5, data: { ...savedRule.data, enabled: true } }] }));
        render(_jsx(AutomationWorkspace, { csrfToken: "csrf-value" }));
        fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
        const enabled = screen.getByRole("checkbox", { name: "Rule enabled" });
        expect(enabled).not.toBeChecked();
        fireEvent.click(enabled);
        fireEvent.change(screen.getByLabelText("Reason for rule change"), { target: { value: "Re-enable after review" } });
        fireEvent.click(screen.getByRole("button", { name: "Save rule changes" }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
        expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/automation/rules/rule-1");
        expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PUT" });
        expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ enabled: true, expectedVersion: 4, reason: "Re-enable after review" });
        expect(await screen.findByText(/Version 5 · Enabled/)).toBeInTheDocument();
    });
    it("shows source unavailability messages returned with a report preview", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(json(context())).mockResolvedValueOnce(json({ table: { columns: [{ key: "label", label: "Record" }], rows: [], unavailable: ["Training source unavailable"] }, chart: [] }));
        render(_jsx(AutomationWorkspace, { csrfToken: "csrf-value" }));
        fireEvent.change(await screen.findByLabelText("Category"), { target: { value: "tasks" } });
        fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-01" } });
        fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-06" } });
        fireEvent.click(screen.getByLabelText("Record"));
        fireEvent.click(screen.getByRole("button", { name: "Preview report" }));
        expect(await screen.findByText("Training source unavailable")).toBeInTheDocument();
    });
    it("renders the saved report chart type when previewing a saved definition", async () => {
        const report = { id: "report-1", version: 2, data: { title: "Grouped tasks", category: "tasks", from: "2026-10-01", to: "2026-10-06", columns: ["label"], filters: [], groupBy: "status", chart: "BAR" } };
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(json({ ...context(), reports: [report] })).mockResolvedValueOnce(json({ table: { columns: [{ key: "label", label: "State" }, { key: "count", label: "Retained rows" }], rows: [{ label: "OPEN", count: 1 }], unavailable: [] }, chart: [{ label: "OPEN", count: 1 }] }));
        render(_jsx(AutomationWorkspace, { csrfToken: "csrf-value" }));
        const reportRow = (await screen.findByText("Grouped tasks")).closest("li");
        if (!reportRow)
            throw new Error("Saved report row was not rendered");
        fireEvent.click(within(reportRow).getByRole("button", { name: "Preview" }));
        expect(await screen.findByRole("img", { name: "Bar chart with 1 groups" })).toBeInTheDocument();
    });
    it("requires a human recommendation decision and states it does not perform the proposed change", async () => {
        const run = { id: "run-1", ruleId: "rule-1", sourceEventId: "event-1", status: "PENDING", createdAt: "2026-10-06T10:00:00Z", actionKind: "RECOMMENDATION", recommendation: "Review the overdue task", approvalRequestId: "approval-1", canDecide: true };
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(json(context([run]))).mockResolvedValueOnce(json({ id: "run-1", status: "APPROVED" })).mockResolvedValueOnce(json(context([{ ...run, status: "APPROVED" }])));
        vi.spyOn(window, "prompt").mockReturnValue("Reviewed evidence");
        render(_jsx(AutomationWorkspace, { csrfToken: "csrf-value" }));
        fireEvent.click(await screen.findByRole("button", { name: "Approve recommendation" }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
        expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/automation/runs/run-1/decision");
        expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({ outcome: "APPROVED", reason: "Reviewed evidence" });
        expect(await screen.findByText("Recommendation approved. The proposed change still requires the ordinary authorized workflow.")).toBeInTheDocument();
    });
});
