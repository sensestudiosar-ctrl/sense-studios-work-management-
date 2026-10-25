import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ConfirmedDrawings } from "./confirmed-drawings.js";
const response = (items, status = 200) => new Response(JSON.stringify({ items }), { status });
afterEach(() => vi.unstubAllGlobals());
describe("Project Files confirmed evidence", () => {
    it("labels approved links separately from exact approved files", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([
            { id: "approved-link", label: "First floor", kind: "LINK", fileId: null, url: "https://files.sensestudios.com/first", approvedAt: "2026-10-23T09:00:00Z", signatureName: "Primary Client" },
            { id: "approved-file", label: "Drawing R2", kind: "DRAWING", fileId: "exact-file", url: null, approvedAt: "2026-10-23T09:00:00Z", signatureName: "Primary Client" }
        ])));
        render(_jsx(ConfirmedDrawings, { projectId: "project-1", onSessionExpired: () => undefined }));
        expect(await screen.findByRole("link", { name: "Open approved link" })).toHaveAttribute("href", "https://files.sensestudios.com/first");
        expect(screen.getByRole("link", { name: "Open approved link" })).toHaveAttribute("rel", "noopener noreferrer");
        expect(screen.getByRole("link", { name: "Open approved file" })).toHaveAttribute("href", "/api/v1/documents/files/exact-file/stream");
        expect(screen.getByText(/External content may change/)).toBeInTheDocument();
    });
    it("does not show a previous project's data after the project changes", async () => {
        let finish;
        const fetcher = vi.fn().mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(response([]));
        vi.stubGlobal("fetch", fetcher);
        const expire = vi.fn();
        const view = render(_jsx(ConfirmedDrawings, { projectId: "old-project", onSessionExpired: expire }));
        view.rerender(_jsx(ConfirmedDrawings, { projectId: "new-project", onSessionExpired: expire }));
        await screen.findByText("No finally approved drawings, files or links yet.");
        await act(async () => finish(response([{ id: "old", label: "Private old drawing", kind: "FILE", fileId: "old-file", approvedAt: "2026-10-23T09:00:00Z", signatureName: "Old client" }])));
        expect(screen.queryByText("Private old drawing")).not.toBeInTheDocument();
    });
    it("distinguishes permission failure from an empty approved list", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([], 403)));
        render(_jsx(ConfirmedDrawings, { projectId: "project-1", onSessionExpired: () => undefined }));
        expect(await screen.findByRole("alert")).toHaveTextContent("current access");
        expect(screen.queryByText("No finally approved drawings, files or links yet.")).not.toBeInTheDocument();
    });
});
