import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { ApprovalQueue } from "./approval-queue.js";
function response(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}
const item = {
    id: "approval-1", typeKey: "test.policy", title: "Scope change", summary: "Update a project scope",
    subjectLabel: "Project North", reason: "Client requested a revised scope", requesterLabel: "owner@example.test",
    approvalLevel: "Branch owner", requestedAt: "2026-09-27T08:00:00.000Z", expiresAt: null
};
beforeEach(() => vi.restoreAllMocks());
describe("read-only approval queue", () => {
    it("shows pending state then the empty queue", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => response({ items: [], nextCursor: null })));
        render(_jsx(ApprovalQueue, {}));
        expect(screen.getByText("Loading pending decisions…")).toBeInTheDocument();
        expect(await screen.findByText(/No pending decisions in this list/)).toBeInTheDocument();
    });
    it("optionally hides only a successfully confirmed empty queue", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => response({ items: [], nextCursor: null })));
        const view = render(_jsx(ApprovalQueue, { title: "Decisions awaiting you", hideWhenEmpty: true }));
        expect(screen.getByText("Loading pending decisions…")).toBeInTheDocument();
        await waitFor(() => expect(view.container.querySelector(".approval-queue")).toBeNull());
    });
    it("keeps an empty parsed fallback visible when the response omits an explicit null cursor", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => response({ items: [] })));
        render(_jsx(ApprovalQueue, { hideWhenEmpty: true }));
        expect(await screen.findByText(/No pending decisions in this list/)).toBeInTheDocument();
        expect(document.querySelector(".approval-queue")).toBeInTheDocument();
    });
    it("keeps positive and loading queues visible when empty hiding is enabled", async () => {
        const never = new Promise(() => undefined);
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce(response({ items: [item], nextCursor: null }))
            .mockImplementationOnce(() => never));
        const positive = render(_jsx(ApprovalQueue, { hideWhenEmpty: true }));
        expect(await screen.findByRole("heading", { name: "Scope change" })).toBeInTheDocument();
        positive.unmount();
        render(_jsx(ApprovalQueue, { hideWhenEmpty: true }));
        expect(await screen.findByText("Loading pending decisions…")).toBeInTheDocument();
        expect(document.querySelector(".approval-queue")).toBeInTheDocument();
    });
    it.each([403, 503])("keeps denied and failed queues visible when empty hiding is enabled (%i)", async (status) => {
        vi.stubGlobal("fetch", vi.fn(async () => response({}, status)));
        render(_jsx(ApprovalQueue, { hideWhenEmpty: true }));
        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(document.querySelector(".approval-queue")).toBeInTheDocument();
    });
    it("keeps an explicit approval deep link visible even when its queue page is empty", async () => {
        window.history.replaceState({}, "", "/my-work?approvalId=approval-empty");
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
            .mockResolvedValueOnce(response({}, 404)));
        render(_jsx(ApprovalQueue, { hideWhenEmpty: true }));
        expect(await screen.findByText(/This decision is no longer pending or is unavailable/)).toBeInTheDocument();
        expect(document.querySelector(".approval-queue")).toBeInTheDocument();
        window.history.replaceState({}, "", "/my-work");
    });
    it("keeps request evidence readable and offers no decision controls", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => response({ items: [item], nextCursor: null })));
        render(_jsx(ApprovalQueue, {}));
        expect(await screen.findByRole("heading", { name: "Scope change" })).toBeInTheDocument();
        expect(screen.getByText(/Client requested a revised scope/)).toBeInTheDocument();
        expect(screen.getByText(/Requested by owner@example.test/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /approve|reject|decide/i })).not.toBeInTheDocument();
    });
    it("opens an exact Dashboard decision through the current authorized pending-item read", async () => {
        window.history.replaceState({}, "", "/my-work?approvalId=approval-1");
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
            .mockResolvedValueOnce(response(item));
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(ApprovalQueue, { title: "Decisions awaiting you" }));
        const heading = await screen.findByRole("heading", { name: "Scope change" });
        const row = heading.closest("li");
        expect(row).toHaveAttribute("id", "approval-approval-1");
        await waitFor(() => expect(document.activeElement).toBe(row));
        expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/approvals/attention/approval-1");
        expect(screen.queryByRole("button", { name: /approve|reject|decide/i })).not.toBeInTheDocument();
    });
    it("explains when an exact approval is no longer pending or available without leaking source details", async () => {
        window.history.replaceState({}, "", "/my-work?approvalId=approval-stale");
        vi.stubGlobal("fetch", vi.fn()
            .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
            .mockResolvedValueOnce(response({ error: "private source data" }, 404)));
        render(_jsx(ApprovalQueue, {}));
        expect(await screen.findByText(/This decision is no longer pending or is unavailable to your account/i)).toHaveAttribute("role", "status");
        expect(screen.queryByText(/private source data/)).not.toBeInTheDocument();
    });
    it("loads more with a cursor and de-duplicates overlapping rows", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(response({ items: [item], nextCursor: "cursor value" }))
            .mockResolvedValueOnce(response({ items: [item, { ...item, id: "approval-2", title: "Another scope change" }], nextCursor: null }));
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(ApprovalQueue, {}));
        fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
        expect(await screen.findByRole("heading", { name: "Another scope change" })).toBeInTheDocument();
        expect(screen.getAllByRole("heading", { name: "Scope change" })).toHaveLength(1);
        expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/approvals/attention?limit=30&cursor=cursor%20value");
    });
    it("does not append a late cursor response after the queue is refreshed", async () => {
        let releaseLoadMore;
        const refreshed = { ...item, id: "approval-fresh", title: "Fresh queue item" };
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(response({ items: [item], nextCursor: "old-cursor" }))
            .mockImplementationOnce(() => new Promise((resolve) => { releaseLoadMore = resolve; }))
            .mockResolvedValueOnce(response({ items: [refreshed], nextCursor: null }));
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(ApprovalQueue, {}));
        fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        expect(await screen.findByRole("heading", { name: "Fresh queue item" })).toBeInTheDocument();
        releaseLoadMore?.(response({ items: [{ ...item, id: "approval-stale", title: "Stale cursor item" }], nextCursor: null }));
        await waitFor(() => expect(screen.queryByRole("heading", { name: "Stale cursor item" })).not.toBeInTheDocument());
        expect(screen.getByRole("heading", { name: "Fresh queue item" })).toBeInTheDocument();
    });
    it("shows a retryable error without exposing server details", async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(response({ error: "database password leaked" }, 503))
            .mockResolvedValueOnce(response({ items: [], nextCursor: null }));
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(ApprovalQueue, {}));
        expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load pending decisions/i);
        expect(screen.queryByText(/database password leaked/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Try again" }));
        expect(await screen.findByText(/No pending decisions in this list/)).toBeInTheDocument();
    });
    it("renders a permission denial without showing any pending items", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => response({}, 403)));
        render(_jsx(ApprovalQueue, {}));
        expect(await screen.findByRole("alert")).toHaveTextContent(/don’t have access to this decision queue/i);
        expect(screen.queryByText(/No pending decisions in this list/)).not.toBeInTheDocument();
    });
    it("labels retained queue data stale after a same-context refresh failure without rendering it as current", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(response({ items: [item], nextCursor: "cursor-1" }))
            .mockResolvedValueOnce(response({ error: "private service detail" }, 503));
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(ApprovalQueue, {}));
        expect(await screen.findByRole("heading", { name: "Scope change" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load pending decisions/i);
        expect(await screen.findByRole("status")).toHaveTextContent(/Previous decision data is retained but hidden · last successfully refreshed/);
        expect(screen.queryByRole("heading", { name: "Scope change" })).not.toBeInTheDocument();
        expect(screen.queryByText(/private service detail/)).not.toBeInTheDocument();
    });
    it("keeps stale retained data visible when empty hiding is enabled", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(response({ items: [item], nextCursor: null }))
            .mockResolvedValueOnce(response({ error: "private service detail" }, 503));
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(ApprovalQueue, { hideWhenEmpty: true }));
        expect(await screen.findByRole("heading", { name: "Scope change" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load pending decisions/i);
        expect(await screen.findByText(/Previous decision data is retained but hidden/)).toBeInTheDocument();
        expect(document.querySelector(".approval-queue")).toBeInTheDocument();
    });
    it("clears retained items, cursor, and freshness after refresh denial or session loss", async () => {
        for (const status of [401, 403]) {
            const fetchMock = vi.fn()
                .mockResolvedValueOnce(response({ items: [item], nextCursor: "cursor-1" }))
                .mockResolvedValueOnce(response({}, status));
            vi.stubGlobal("fetch", fetchMock);
            const view = render(_jsx(ApprovalQueue, {}));
            expect(await screen.findByRole("heading", { name: "Scope change" })).toBeInTheDocument();
            fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
            expect(await screen.findByRole("alert")).toHaveTextContent(status === 401 ? /session ended/i : /don’t have access/i);
            expect(screen.queryByText(/Previous decision data/)).not.toBeInTheDocument();
            expect(screen.queryByRole("heading", { name: "Scope change" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
            view.unmount();
        }
    });
    it("drops the old approval snapshot when approvalId context changes", async () => {
        window.history.replaceState({}, "", "/my-work?approvalId=approval-one");
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(response({ items: [item], nextCursor: "cursor-1" }))
            .mockResolvedValueOnce(response(item))
            .mockResolvedValueOnce(response({ items: [], nextCursor: null }))
            .mockResolvedValueOnce(response({ error: "private details" }, 404));
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(ApprovalQueue, {}));
        expect(await screen.findByRole("heading", { name: "Scope change" })).toBeInTheDocument();
        window.history.replaceState({}, "", "/my-work?approvalId=approval-two");
        window.dispatchEvent(new PopStateEvent("popstate"));
        expect(await screen.findByText(/This decision is no longer pending or is unavailable/)).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Scope change" })).not.toBeInTheDocument();
        expect(screen.queryByText(/Previous decision data/)).not.toBeInTheDocument();
    });
    it("clears approval items and cursor when load-more loses authorization", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(response({ items: [item], nextCursor: "cursor-1" }))
            .mockResolvedValueOnce(response({}, 403));
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(ApprovalQueue, {}));
        expect(await screen.findByRole("heading", { name: "Scope change" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Load more" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(/don’t have access/i);
        expect(screen.queryByRole("heading", { name: "Scope change" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    });
});
