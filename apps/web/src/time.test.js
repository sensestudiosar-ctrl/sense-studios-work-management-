import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TimeWorkspace } from "./time.js";
const setup = { employeeId: "employee-1", employees: [{ id: "employee-1", name: "Asha" }, { id: "employee-2", name: "Dev" }], projects: [{ id: "project-1", name: "Studio" }], tasks: [{ id: "task-1", title: "Concept", projectId: "project-1", stageId: "stage-1" }], stages: [{ id: "stage-1", label: "Design", projectId: "project-1" }], isOwner: false };
const entry = { id: "entry-1", employeeId: "employee-1", version: 2, date: "2026-10-01", startedAt: "2026-10-01T08:00:00.000Z", endedAt: "2026-10-01T09:00:00.000Z", durationSeconds: 3600, evidenceFileId: "file-1", workNote: "Prepared concept", location: "OFFICE", billable: true, activityLabel: "Design", projectId: "project-1", taskId: "task-1", stageId: "stage-1", locked: true, approved: true, canCorrect: true, canApprove: false, versions: [{ version: 1, data: { date: "2026-10-01", startedAt: "2026-10-01T08:00:00.000Z", endedAt: "2026-10-01T08:30:00.000Z", durationSeconds: 1800, evidenceFileId: "file-1", workNote: "Draft", projectId: "project-1", taskId: "task-1", stageId: "stage-1", location: "OFFICE", billable: true }, reason: "Original log", editorId: "employee-1", occurredAt: "2026-10-01T08:00:00Z" }, { version: 2, data: { date: "2026-10-01", startedAt: "2026-10-01T08:00:00.000Z", endedAt: "2026-10-01T09:00:00.000Z", durationSeconds: 3600, evidenceFileId: "file-1", workNote: "Prepared concept", projectId: "project-1", taskId: "task-1", stageId: "stage-1", location: "OFFICE", billable: true }, reason: "Corrected duration", editorId: "employee-2", occurredAt: "2026-10-01T09:00:00Z" }], deliveries: [{ id: "delivery-1", state: "FAILED", revision: 1, attempts: 2 }] };
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const localValue = (value) => { const date = new Date(value); const p = (n) => String(n).padStart(2, "0"); return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`; };
afterEach(() => vi.unstubAllGlobals());
describe("TimeWorkspace", () => {
    it("saves a manual non-project entry with CSRF and refreshes the persisted history", async () => {
        const calls = [];
        const fetchMock = vi.fn(async (input, init) => {
            const url = String(input);
            calls.push([url, init]);
            if (url.endsWith("/setup"))
                return response(setup);
            if (url.startsWith("/api/v1/time?"))
                return response({ timer: null, entries: [] });
            if (url === "/api/v1/time/entries")
                return response({ entry });
            return response({});
        });
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(TimeWorkspace, { csrfToken: "time-csrf", owner: false }));
        const manualForm = (await screen.findByRole("heading", { name: "Log time manually" })).closest("section");
        fireEvent.change(within(manualForm).getByLabelText("Work note"), { target: { value: "Team planning" } });
        fireEvent.change(within(manualForm).getByRole("spinbutton"), { target: { value: "1800" } });
        fireEvent.click(within(manualForm).getByRole("checkbox", { name: "Billable" }));
        fireEvent.click(screen.getByRole("button", { name: "Save time entry" }));
        await waitFor(() => expect(calls.some(([url]) => url === "/api/v1/time/entries")).toBe(true));
        const call = calls.find(([url]) => url === "/api/v1/time/entries");
        expect(call?.[1]?.method).toBe("POST");
        expect(new Headers(call?.[1]?.headers).get("X-CSRF-Token")).toBe("time-csrf");
        expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ durationSeconds: 1800, workNote: "Team planning", billable: false, date: expect.any(String) });
        expect(JSON.parse(String(call?.[1]?.body))).not.toHaveProperty("projectId");
        await waitFor(() => expect(calls.filter(([url]) => url.startsWith("/api/v1/time?")).length).toBeGreaterThan(1));
    });
    it("keeps locked history visible and uses reasoned version-bound correction, scoped approval/export flags, and delivery retry", async () => {
        const fetchMock = vi.fn(async (input, init) => {
            void init;
            const url = String(input);
            if (url.endsWith("/setup"))
                return response(setup);
            if (url.startsWith("/api/v1/time?"))
                return response({ timer: null, entries: [entry] });
            return response({});
        });
        vi.stubGlobal("fetch", fetchMock);
        vi.stubGlobal("prompt", vi.fn(() => "Receiver is available for retry"));
        render(_jsx(TimeWorkspace, { csrfToken: "time-csrf", owner: true }));
        const row = (await screen.findByText("Prepared concept")).closest("article");
        expect(within(row).getByText(/Locked/)).toBeInTheDocument();
        expect(within(row).getByText(/Immutable history/)).toBeInTheDocument();
        expect(within(row).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
        expect(within(row).getByRole("button", { name: "Export" })).toBeInTheDocument();
        fireEvent.click(within(row).getByText(/Immutable history/));
        expect(within(row).getByText("1800 → 3600")).toBeInTheDocument();
        expect(within(row).getByText("file-1 → file-1")).toBeInTheDocument();
        fireEvent.click(within(row).getByRole("button", { name: "Correct" }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByLabelText("Start time")).toHaveValue(localValue(entry.startedAt));
        expect(within(dialog).getByLabelText("End time")).toHaveValue(localValue(entry.endedAt));
        expect(within(dialog).getByLabelText("Evidence file ID (optional)")).toHaveValue("file-1");
        expect(within(dialog).queryByLabelText("Employee")).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Reason for correction"), { target: { value: "Fix the recorded duration" } });
        fireEvent.change(within(screen.getByRole("dialog")).getByLabelText("Duration (seconds)"), { target: { value: "5400" } });
        fireEvent.click(screen.getByRole("button", { name: "Save correction" }));
        await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/entries/entry-1/corrections"))).toBe(true));
        const correction = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/entries/entry-1/corrections"));
        expect(correction?.[1]?.method).toBe("POST");
        expect(new Headers(correction?.[1]?.headers).get("X-CSRF-Token")).toBe("time-csrf");
        const correctionBody = JSON.parse(String(correction?.[1]?.body));
        expect(correctionBody).toMatchObject({ commandId: expect.any(String), expectedVersion: 2, reason: "Fix the recorded duration", durationSeconds: 5400, startedAt: "2026-10-01T08:00:00.000Z", endedAt: "2026-10-01T09:00:00.000Z", evidenceFileId: "file-1" });
        expect(correctionBody).not.toHaveProperty("employeeId");
        fireEvent.click(within(row).getByText("Accounting delivery"));
        fireEvent.click(await within(row).findByRole("button", { name: "Retry" }));
        await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/deliveries/delivery-1/retry"))).toBe(true));
        expect(JSON.parse(String(fetchMock.mock.calls.find(([url]) => String(url).endsWith("/deliveries/delivery-1/retry"))?.[1]?.body))).toEqual({ reason: "Receiver is available for retry" });
    });
    it("shows per-project and per-task logged hours in the breakdown panel", async () => {
        const entries = [entry, { ...entry, id: "entry-2", durationSeconds: 1800, workNote: "Second task", versions: [], deliveries: [] }];
        vi.stubGlobal("fetch", vi.fn(async (input) => (String(input).endsWith("/setup") ? response(setup) : response({ timer: null, entries }))));
        render(_jsx(TimeWorkspace, { csrfToken: "time-csrf", owner: false }));
        const panel = await screen.findByRole("heading", { name: "Hours breakdown" });
        const scope = panel.closest("section");
        // The total counts every entry; the bar chart covers project-scoped hours only.
        expect(within(scope).getAllByText("1.5h").length).toBeGreaterThan(0);
        expect(within(scope).getByRole("img", { name: /accounts for \d+% of logged time/ })).toBeInTheDocument();
        expect(within(scope).getByRole("button", { name: /Concept/ })).toBeInTheDocument();
    });
    it("hides an Owner personal timer when the account has no employee identity", async () => {
        vi.stubGlobal("fetch", vi.fn(async (input) => String(input).endsWith("/setup") ? response({ ...setup, employeeId: null }) : response({ timer: null, entries: [] })));
        render(_jsx(TimeWorkspace, { csrfToken: "csrf", owner: true }));
        await screen.findByRole("heading", { name: "Log time manually" });
        expect(screen.queryByRole("heading", { name: "Start a timer" })).not.toBeInTheDocument();
        expect(screen.getByLabelText("Employee")).toBeInTheDocument();
    });
    it("does not show accounting retry controls to non-Owners", async () => {
        vi.stubGlobal("fetch", vi.fn(async (input) => String(input).endsWith("/setup") ? response(setup) : response({ timer: null, entries: [entry] })));
        render(_jsx(TimeWorkspace, { csrfToken: "csrf", owner: false }));
        const row = (await screen.findByText("Prepared concept")).closest("article");
        fireEvent.click(within(row).getByText("Accounting delivery"));
        expect(within(row).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    });
});
