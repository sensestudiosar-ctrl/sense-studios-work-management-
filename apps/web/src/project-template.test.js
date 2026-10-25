import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProjectPlan, ProjectTemplatePanel } from "./project-template.js";
afterEach(() => vi.unstubAllGlobals());
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const defaults = { DESIGN: [{ key: "BRIEF", label: "Brief" }], TURNKEY: [{ key: "DESIGN_APPROVAL", label: "Design Approval" }] };
describe("ProjectTemplatePanel", () => {
    it("creates an immutable template version with the labelled form fields and CSRF", async () => {
        const calls = [];
        vi.stubGlobal("fetch", vi.fn(async (input, init) => {
            const url = String(input);
            calls.push([url, init]);
            if (url === "/api/v1/project-templates" && init?.method === "POST")
                return response({ template: { id: "tpl-1", versions: [{ id: "version-1", number: 1 }] } }, 201);
            if (url === "/api/v1/project-templates")
                return response({ templates: [], canManage: true, defaults });
            return response({}, 404);
        }));
        render(_jsx(ProjectTemplatePanel, { owner: true, csrfToken: "csrf", onTemplateChange: () => undefined }));
        fireEvent.click(await screen.findByRole("button", { name: "Create template" }));
        fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Residential Design" } });
        fireEvent.change(screen.getByLabelText(/Initial service scopes/), { target: { value: "Architecture\nInterior design" } });
        fireEvent.change(screen.getByLabelText("Reason for change"), { target: { value: "Standardize project setup" } });
        fireEvent.click(screen.getAllByRole("button", { name: "Create template" })[1]);
        await waitFor(() => expect(calls.some(([url, init]) => url === "/api/v1/project-templates" && init?.method === "POST")).toBe(true));
        const call = calls.find(([url, init]) => url === "/api/v1/project-templates" && init?.method === "POST");
        expect(call?.[1]).toMatchObject({ headers: { "X-CSRF-Token": "csrf" } });
        expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ name: "Residential Design", reason: "Standardize project setup", definition: { deliveryType: "DESIGN", stages: [{ key: "BRIEF", label: "Brief" }], scopes: ["Architecture", "Interior design"] } });
    });
    it("does not disclose a denied template endpoint to an Owner", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 403)));
        render(_jsx(ProjectTemplatePanel, { owner: true, csrfToken: "csrf", onTemplateChange: () => undefined }));
        await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
        expect(screen.queryByText(/template access/i)).not.toBeInTheDocument();
    });
});
describe("ProjectPlan", () => {
    it("ignores an older project response after the selected project changes", async () => {
        let resolveOld = () => undefined;
        const older = new Promise((resolve) => { resolveOld = resolve; });
        vi.stubGlobal("fetch", vi.fn(async (input) => String(input).includes("old-project") ? older : response({ plan: null, items: [], history: [], capabilities: { complete: false, override: false } })));
        const { rerender } = render(_jsx(ProjectPlan, { projectId: "old-project", projectVersion: 1, csrfToken: "csrf", onSaved: () => undefined }));
        rerender(_jsx(ProjectPlan, { projectId: "new-project", projectVersion: 1, csrfToken: "csrf", onSaved: () => undefined }));
        await screen.findByText("No template version was applied to this project.");
        resolveOld(response({ plan: { templateVersion: { number: 1, template: { name: "Old confidential plan" } }, definition: { folders: [] } }, items: [], history: [], capabilities: { complete: false, override: false } }));
        await waitFor(() => expect(screen.queryByText(/Old confidential plan/)).not.toBeInTheDocument());
    });
    it("completes a plan item with project version and reason, then reloads the parent", async () => {
        const onSaved = vi.fn();
        const calls = [];
        let getCount = 0;
        const plan = { plan: { templateVersion: { id: "v1", number: 2, template: { name: "Design" } }, definition: { deliveryType: "DESIGN", scopes: [], stages: [], milestones: [], folders: ["Brief"] }, createdAt: "2026-09-28T00:00:00Z" }, items: [{ id: "stage-1", kind: "STAGE", key: "BRIEF", label: "Brief", stageKey: null, position: 1, required: false, targetAt: null, completedAt: null }], history: [], capabilities: { complete: true, override: false } };
        vi.stubGlobal("fetch", vi.fn(async (input, init) => {
            const url = String(input);
            calls.push([url, init]);
            if (url.endsWith("/plan-items/stage-1/complete"))
                return response({ completed: true });
            if (url.endsWith("/plan")) {
                getCount += 1;
                return response({ ...plan, items: getCount > 1 ? [{ ...plan.items[0], completedAt: "2026-09-28T00:05:00Z" }] : plan.items });
            }
            return response({}, 404);
        }));
        render(_jsx(ProjectPlan, { projectId: "project-1", projectVersion: 7, csrfToken: "csrf", onSaved: onSaved }));
        fireEvent.change(await screen.findByLabelText("Reason for plan update"), { target: { value: "Brief reviewed" } });
        fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
        await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
        const action = calls.find(([url]) => url.endsWith("/plan-items/stage-1/complete"));
        expect(action?.[1]).toMatchObject({ method: "POST", headers: { "X-CSRF-Token": "csrf" } });
        expect(JSON.parse(String(action?.[1]?.body))).toEqual({ expectedVersion: 7, reason: "Brief reviewed" });
        expect(screen.getByText("Complete")).toBeInTheDocument();
        expect(screen.getAllByText("Brief")).toHaveLength(2);
    });
});
