import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ProjectResourceSummary } from "./project-resources.js";
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
const documents = (projectId, name = "Specification.pdf", count = 1) => ({ project: { id: projectId }, files: Array.from({ length: count }, (_, index) => ({ id: `file-${index}`, fileName: `${name}${index || ""}`, viewOnly: index === 0 })) });
const round = (projectId, id = "round-1") => ({ projectId, roundId: id, taskId: "task-1", taskTitle: "Check drawings", roundNumber: 2, status: "IN_REVIEW" });
const expired = vi.fn();
afterEach(() => { vi.unstubAllGlobals(); expired.mockClear(); });
describe("authorized Project resource summaries", () => {
    it("counts only files returned by the owning register and bounds the preview to five", async () => {
        const fetcher = vi.fn().mockResolvedValue(response(documents("project-1", "Specification.pdf", 8)));
        vi.stubGlobal("fetch", fetcher);
        render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: "documents", onSessionExpired: expired }));
        expect(await screen.findByText("Latest 5 accessible files")).toBeInTheDocument();
        expect(screen.getByText("8")).toBeInTheDocument();
        expect(screen.getAllByRole("listitem")).toHaveLength(5);
        expect(screen.queryByText("Specification.pdf5")).not.toBeInTheDocument();
        expect(fetcher).toHaveBeenCalledWith("/api/v1/documents/projects/project-1", expect.objectContaining({ credentials: "include", cache: "no-store", signal: expect.any(AbortSignal) }));
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it("uses the server round total, fixed waiting/due filters and canonical task plus round identity", async () => {
        const fetcher = vi.fn().mockResolvedValue(response({ total: 7, items: [round("project-1"), round("project-1", "round-2")] }));
        vi.stubGlobal("fetch", fetcher);
        render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: "reviews", onSessionExpired: expired }));
        expect(await screen.findByText("Showing 2 of 7, earliest due first")).toBeInTheDocument();
        const url = new URL(String(fetcher.mock.calls[0]?.[0]), "https://sense.invalid");
        expect(Object.fromEntries(url.searchParams)).toEqual({ projectId: "project-1", scope: "accessible", queue: "waiting", sort: "due", offset: "0", limit: "5" });
        const destinations = screen.getAllByRole("link").map(link => new URL(link.getAttribute("href"), "https://sense.invalid"));
        expect(destinations.map(link => link.searchParams.get("roundId"))).toEqual(["round-1", "round-2"]);
        for (const link of destinations) {
            expect(link.pathname).toBe("/reviews");
            expect(link.searchParams.get("taskId")).toBe("task-1");
            expect(link.searchParams.get("projectId")).toBe("project-1");
        }
    });
    it.each(["documents", "reviews"])("distinguishes an authorized empty %s result from failure", async (kind) => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(kind === "documents" ? documents("project-1", "", 0) : { total: 0, items: [] })));
        render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: kind, onSessionExpired: expired }));
        expect(await screen.findByText(/No .* available to you in this project/)).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    it.each([403, 404])("keeps %i unavailable distinct from a zero count and supports an explicit read retry", async (status) => {
        const fetcher = vi.fn().mockResolvedValueOnce(response({}, status)).mockResolvedValueOnce(response(documents("project-1")));
        vi.stubGlobal("fetch", fetcher);
        render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: "documents", onSessionExpired: expired }));
        expect(await screen.findByRole("alert")).toHaveTextContent("unavailable with your current access");
        expect(screen.queryByText("0")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Retry documents" }));
        expect(await screen.findByText("Specification.pdf")).toBeInTheDocument();
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
    it("clears a successful snapshot before a focus recheck that discovers revocation", async () => {
        let resolve;
        const fetcher = vi.fn().mockResolvedValueOnce(response(documents("project-1"))).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
        vi.stubGlobal("fetch", fetcher);
        render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: "documents", onSessionExpired: expired }));
        await screen.findByText("Specification.pdf");
        fireEvent.focus(window);
        expect(screen.queryByText("Specification.pdf")).not.toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Loading documents");
        await act(async () => resolve(response({}, 403)));
        expect(await screen.findByRole("alert")).toHaveTextContent("unavailable");
    });
    it("rejects old project responses even when fetch ignores AbortSignal", async () => {
        let resolve;
        vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValueOnce(response(documents("project-2", "Current.pdf"))));
        const view = render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: "documents", onSessionExpired: expired }));
        view.rerender(_jsx(ProjectResourceSummary, { projectId: "project-2", kind: "documents", onSessionExpired: expired }));
        await screen.findByText("Current.pdf");
        await act(async () => resolve(response(documents("project-1", "Private old.pdf"))));
        expect(screen.queryByText("Private old.pdf")).not.toBeInTheDocument();
        expect(screen.getByText("Current.pdf")).toBeInTheDocument();
    });
    it("cannot restore private rows from an in-flight request after the session-ended event", async () => {
        let resolve;
        const fetcher = vi.fn().mockImplementation(() => new Promise(done => { resolve = done; }));
        vi.stubGlobal("fetch", fetcher);
        render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: "documents", onSessionExpired: expired }));
        act(() => window.dispatchEvent(new Event("sense-session-ended")));
        await act(async () => resolve(response(documents("project-1"))));
        fireEvent.focus(window);
        expect(screen.getByRole("alert")).toHaveTextContent("Your session ended");
        expect(screen.queryByText("Specification.pdf")).not.toBeInTheDocument();
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
    it("reports 401 to the owning authenticated shell and exposes no stale summary", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 401)));
        render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: "reviews", onSessionExpired: expired }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Your session ended");
        expect(expired).toHaveBeenCalledTimes(1);
    });
    it.each([
        ["documents", documents("other-project")],
        ["reviews", { total: 1, items: [round("other-project")] }],
        ["reviews", { total: 0, items: [round("project-1")] }],
        ["reviews", { total: 6, items: Array.from({ length: 6 }, (_, index) => round("project-1", String(index))) }],
        ["reviews", { total: 2, items: [round("project-1"), round("project-1")] }],
        ["reviews", { total: 1, items: [{ ...round("project-1"), status: "APPROVED" }] }],
    ])("fails closed for a malformed or mismatched %s projection", async (kind, body) => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(body)));
        render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: kind, onSessionExpired: expired }));
        expect(await screen.findByRole("alert")).toHaveTextContent(`Could not load ${kind}`);
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
    it("does not convert a failed read to a zero count", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
        render(_jsx(ProjectResourceSummary, { projectId: "project-1", kind: "documents", onSessionExpired: expired }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Could not load documents");
        expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
});
