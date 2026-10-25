import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientDashboard } from "./client-dashboard.js";
const session = { account: { id: "client-1", email: "client@example.test", kind: "CLIENT" }, csrfToken: "client-csrf", activePasskeyCount: 1 };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());
describe("ClientDashboard", () => {
    it("uses the isolated client project and granted review ports for an account-scoped overview", async () => {
        const calls = [];
        vi.stubGlobal("fetch", vi.fn(async (input) => {
            const url = String(input);
            calls.push(url);
            if (url.endsWith("/client-portal/projects"))
                return json({ projects: [{ id: "project-1", title: "Shared studio", status: "ACTIVE" }] });
            if (url.endsWith("/client-portal/reviews/projects/project-1"))
                return json({ project: { id: "project-1", title: "Shared studio", status: "ACTIVE" }, packages: [{ id: "pack-1", title: "Issued review package", status: "OPEN", items: [{ id: "item-1", label: "Kitchen plan", status: "APPROVED", permissions: { view: true, review: false, approve: false, download: true }, revision: { id: "revision-1", label: "A-101 Rev 2", mimeType: "application/pdf" } }, { id: "item-2", label: "Lighting plan", status: "PENDING", permissions: { view: true, review: true, approve: false, download: false }, revision: null }, { id: "item-3", label: "Correction already requested", status: "REVISION_REQUIRED", permissions: { view: true, review: true, approve: true, download: false }, revision: null }, { id: "item-hidden", label: "Hidden item", status: "PENDING", permissions: { view: false, review: false, approve: false, download: false }, revision: null }] }] });
            if (url.includes("/client-portal/projects/project-1/gallery"))
                return json({ items: [] });
            return json({});
        }));
        render(_jsx(ClientDashboard, { session: session }));
        expect(await screen.findByRole("heading", { name: "Project dashboard" })).toBeInTheDocument();
        expect(await screen.findByText("Project status")).toBeInTheDocument();
        expect(screen.getByText("ACTIVE")).toBeInTheDocument();
        expect(screen.getByText("1 / 3")).toBeInTheDocument();
        expect(screen.getByText("Lighting plan")).toBeInTheDocument();
        expect(screen.getByText("A-101 Rev 2")).toBeInTheDocument();
        expect(screen.queryByText("Hidden item")).not.toBeInTheDocument();
        expect(screen.queryByText("Correction already requested")).not.toBeInTheDocument();
        expect(calls.some(url => url.includes("/api/v1/dashboard"))).toBe(false);
        expect(calls.some(url => url.includes("/client-portal/reviews/projects/project-1"))).toBe(true);
    });
    it("shows a clear empty state when no projects are shared", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => json({ projects: [] })));
        render(_jsx(ClientDashboard, { session: session }));
        expect(await screen.findByText("No projects are currently shared with your account.")).toBeInTheDocument();
    });
    it("does not show a project summary when the scoped review port denies access", async () => {
        vi.stubGlobal("fetch", vi.fn(async (input) => String(input).endsWith("/client-portal/projects") ? json({ projects: [{ id: "project-1", title: "Shared studio", status: "ACTIVE" }] }) : json({ message: "forbidden" }, 403)));
        render(_jsx(ClientDashboard, { session: session }));
        expect(await screen.findByRole("alert")).toHaveTextContent("unavailable under your current access");
        expect(screen.queryByText("ACTIVE")).not.toBeInTheDocument();
    });
});
