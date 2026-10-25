import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProjectWorkspace } from "./project.js";
afterEach(() => vi.unstubAllGlobals());
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
describe("ProjectWorkspace UX structure", () => {
    it("renders the filter-caused empty state with a status role and a clear action", async () => {
        const branch = { id: "branch-1", name: "Mumbai" };
        vi.stubGlobal("fetch", vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/project-templates")
                return response({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
            if (url.endsWith("/plan"))
                return response({ plan: null, items: [], history: [], capabilities: {} });
            if (url === "/api/v1/projects/setup")
                return response({ owner: false, branches: [branch] });
            if (url.startsWith("/api/v1/projects?"))
                return response({ total: 0, items: [] });
            return response({}, 404);
        }));
        render(_jsx(ProjectWorkspace, { csrfToken: "csrf-ux", owner: false }));
        const status = await screen.findByText("No projects match these filters.");
        expect(status.closest('[role="status"]')).not.toBeNull();
        expect(status.className).toContain("task-empty-state__title");
        expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    });
    it("leaves structural empty states as plain text without a clear-filters action", async () => {
        const branch = { id: "branch-1", name: "Mumbai" };
        const project = { id: "ux-project", title: "UX studio", status: "ACTIVE", deliveryType: "DESIGN", version: 1, scopes: [], branch };
        vi.stubGlobal("fetch", vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/project-templates")
                return response({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
            if (url.endsWith("/plan"))
                return response({ plan: null, items: [], history: [], capabilities: {} });
            if (url === "/api/v1/projects/setup")
                return response({ owner: false, branches: [branch] });
            if (url.startsWith("/api/v1/projects?"))
                return response({ total: 1, items: [project] });
            if (url === `/api/v1/projects/${project.id}`)
                return response({ project, capabilities: {} });
            return response({}, 404);
        }));
        render(_jsx(ProjectWorkspace, { csrfToken: "csrf-ux", owner: false }));
        fireEvent.click(await screen.findByRole("button", { name: /UX studio/ }));
        await screen.findByRole("heading", { name: "Baseline scopes" });
        fireEvent.click(screen.getByRole("button", { name: "People" }));
        await screen.findByRole("heading", { name: "Assigned contributors" });
        expect(screen.getByText("No Project Lead assigned")).not.toHaveClass("task-empty-state__title");
        expect(screen.getByText("No additional contributors")).not.toHaveClass("task-empty-state__title");
        expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    });
    it("exposes project sections as keyboard reachable buttons marking the active section", async () => {
        const branch = { id: "branch-1", name: "Mumbai" };
        const project = { id: "ux-tabs", title: "UX tabs", status: "ACTIVE", deliveryType: "DESIGN", version: 1, scopes: [], branch };
        vi.stubGlobal("fetch", vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/project-templates")
                return response({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
            if (url.endsWith("/plan"))
                return response({ plan: null, items: [], history: [], capabilities: {} });
            if (url === "/api/v1/projects/setup")
                return response({ owner: false, branches: [branch] });
            if (url.startsWith("/api/v1/projects?"))
                return response({ total: 1, items: [project] });
            if (url === `/api/v1/projects/${project.id}`)
                return response({ project, capabilities: {} });
            return response({}, 404);
        }));
        render(_jsx(ProjectWorkspace, { csrfToken: "csrf-ux", owner: false }));
        fireEvent.click(await screen.findByRole("button", { name: /UX tabs/ }));
        await screen.findByRole("heading", { name: "Baseline scopes" });
        const nav = screen.getByRole("navigation", { name: `${project.title} sections` });
        expect(nav).toBeInTheDocument();
        const overview = screen.getByRole("button", { name: "Overview" });
        expect(overview).toBeVisible();
        expect(overview).toHaveAttribute("aria-current", "page");
        expect(nav.contains(overview)).toBe(true);
        expect(screen.getByRole("button", { name: "Tasks" })).not.toHaveAttribute("aria-current");
        expect(screen.getByRole("button", { name: "Documents" })).not.toHaveAttribute("aria-current");
        fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
        await waitFor(() => expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-current", "page"));
        expect(screen.getByRole("button", { name: "Overview" })).not.toHaveAttribute("aria-current");
    });
    it("keeps the directory list mounted beside the selected project detail", async () => {
        const branch = { id: "branch-1", name: "Mumbai" };
        const project = { id: "ux-beside", title: "Beside studio", status: "ACTIVE", deliveryType: "DESIGN", version: 1, scopes: [], branch };
        vi.stubGlobal("fetch", vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/project-templates")
                return response({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
            if (url.endsWith("/plan"))
                return response({ plan: null, items: [], history: [], capabilities: {} });
            if (url === "/api/v1/projects/setup")
                return response({ owner: false, branches: [branch] });
            if (url.startsWith("/api/v1/projects?"))
                return response({ total: 1, items: [project] });
            if (url === `/api/v1/projects/${project.id}`)
                return response({ project, capabilities: {} });
            return response({}, 404);
        }));
        render(_jsx(ProjectWorkspace, { csrfToken: "csrf-ux", owner: false }));
        fireEvent.click(await screen.findByRole("button", { name: /Beside studio/ }));
        await screen.findByRole("heading", { name: "Baseline scopes" });
        expect(screen.getByRole("button", { name: /Beside studio/ })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Beside studio/ })).toHaveAttribute("aria-pressed", "true");
        const directory = screen.getByRole("region", { name: "Project directory" });
        expect(directory).toBeVisible();
        expect(screen.getByRole("button", { name: "Refresh" })).toBeVisible();
        expect(screen.getByRole("navigation", { name: "Project list pages" })).toBeVisible();
    });
    it("clears the directory filters when the empty-state action is used", async () => {
        const branch = { id: "branch-1", name: "Mumbai" };
        vi.stubGlobal("fetch", vi.fn(async (input) => {
            const url = String(input);
            if (url === "/api/v1/project-templates")
                return response({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
            if (url.endsWith("/plan"))
                return response({ plan: null, items: [], history: [], capabilities: {} });
            if (url === "/api/v1/projects/setup")
                return response({ owner: false, branches: [branch] });
            if (url.startsWith("/api/v1/projects?"))
                return response({ total: 0, items: [] });
            return response({}, 404);
        }));
        render(_jsx(ProjectWorkspace, { csrfToken: "csrf-ux", owner: false }));
        await screen.findByText("No projects match these filters.");
        fireEvent.change(screen.getByLabelText("Search projects"), { target: { value: "renovation" } });
        fireEvent.submit(screen.getByRole("button", { name: "Search" }).closest("form"));
        await waitFor(() => expect(screen.getByLabelText("Search projects")).toHaveValue("renovation"));
        fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
        expect(await screen.findByLabelText("Search projects")).toHaveValue("");
        expect(screen.getByLabelText("Sort projects")).toHaveValue("created");
        expect(screen.getByLabelText("Sort direction")).toHaveValue("desc");
    });
});
