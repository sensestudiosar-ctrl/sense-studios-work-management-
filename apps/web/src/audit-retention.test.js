import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { AuditRetentionCenter } from "./audit-retention.js";
function response(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}
const originalId = "c64f2145-5810-4a7e-9485-fbe9099c50cf";
const correctionId = "20cfef90-f016-4b85-8c57-74ade820b71b";
function auditRows() {
    const base = {
        occurredAt: "2026-09-27T00:00:00.000Z", actorSnapshot: { email: "owner@example.test" },
        subjectType: "branch", subjectId: "branch-1", reason: "Owner updated a branch", before: null, after: null,
        retentionExpiresAt: "2036-09-27T00:00:00.000Z"
    };
    return [
        { ...base, id: correctionId, eventKey: "audit.corrected", subjectType: "audit_event", subjectId: originalId, correctsEventId: originalId, reason: "Correcting the recorded branch name", after: { name: "North" } },
        { ...base, id: originalId, eventKey: "organization.branch.updated", correctsEventId: null }
    ];
}
const overview = { configuration: null, notices: [], activeHolds: [], tombstoneCount: 0 };
describe("audit correction form", () => {
    it("posts a correction against an original event, clears fields, and displays both linked IDs", async () => {
        const fetchMock = vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/audit/retention")
                return response(overview);
            if (url.startsWith("/api/v1/audit/events/") && url.endsWith("/corrections"))
                return response({ id: "new-correction" });
            if (url.startsWith("/api/v1/audit/events"))
                return response({ items: auditRows(), nextCursor: null });
            return response({}, 404);
        });
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(AuditRetentionCenter, { csrfToken: "csrf-test" }));
        fireEvent.click(screen.getByRole("button", { name: "Open audit controls" }));
        const original = await screen.findByText("organization.branch.updated");
        const originalRow = original.closest("li");
        expect(within(originalRow).getByText(correctionId, { selector: "code" })).toBeInTheDocument();
        const correction = screen.getByText("audit.corrected").closest("li");
        expect(within(correction).getByText(originalId, { selector: "code" })).toBeInTheDocument();
        fireEvent.change(within(originalRow).getByLabelText("Field name"), { target: { value: "branchName" } });
        fireEvent.change(within(originalRow).getByLabelText("Corrected value"), { target: { value: "North" } });
        fireEvent.change(within(originalRow).getByLabelText("Reason"), { target: { value: "The original branch name was recorded incorrectly." } });
        fireEvent.click(within(originalRow).getByRole("button", { name: "Record correction" }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/v1/audit/events/${originalId}/corrections`, expect.objectContaining({
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": "csrf-test" },
            body: JSON.stringify({ reason: "The original branch name was recorded incorrectly.", correction: { branchName: "North" } })
        })));
        await waitFor(() => expect(within(originalRow).getByLabelText("Field name")).toHaveValue(""));
    });
    it("shows a recoverable error and keeps the correction form available after request failure", async () => {
        const fetchMock = vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/audit/retention")
                return response(overview);
            if (url.endsWith(`/events/${originalId}/corrections`))
                return response({}, 503);
            if (url.startsWith("/api/v1/audit/events"))
                return response({ items: auditRows().slice(1), nextCursor: null });
            return response({}, 404);
        });
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(AuditRetentionCenter, { csrfToken: "csrf-test" }));
        fireEvent.click(screen.getByRole("button", { name: "Open audit controls" }));
        const originalRow = (await screen.findByText("organization.branch.updated")).closest("li");
        fireEvent.change(within(originalRow).getByLabelText("Field name"), { target: { value: "branchName" } });
        fireEvent.change(within(originalRow).getByLabelText("Corrected value"), { target: { value: "North" } });
        fireEvent.change(within(originalRow).getByLabelText("Reason"), { target: { value: "The original branch name was recorded incorrectly." } });
        fireEvent.click(within(originalRow).getByRole("button", { name: "Record correction" }));
        expect(await within(originalRow).findByRole("alert")).toHaveTextContent(/couldn’t record that correction/i);
        expect(within(originalRow).getByLabelText("Field name")).toHaveValue("branchName");
    });
});
