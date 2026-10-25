import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { defaultLayoutFor, layoutStorageKey, loadLayout, saveLayout } from "./dashboard-widgets.js";
import { DashboardTimeWidget } from "./dashboard-time-widget.js";
import { DashboardPerformanceWidget } from "./dashboard-performance-widget.js";
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });
describe("V10 layout boundaries", () => {
    const permitted = ["time", "projects", "decisions", "performance", "training"];
    it("keeps accounts and mobile order independent and stores only layout IDs", () => {
        const first = defaultLayoutFor("OWNER", permitted, true, false);
        first.leftOrder = ["training"];
        first.rightOrder = [];
        first.hidden = ["time"];
        expect(saveLayout("account/a", first)).toBe(true);
        expect(loadLayout("account/a", "OWNER", permitted, true, false).leftOrder).toEqual(["training"]);
        expect(loadLayout("account/b", "OWNER", permitted, true, false).leftOrder).toEqual(["time", "projects"]);
        expect(loadLayout("account/a", "OWNER", permitted, true, false, "mobile").leftOrder).toEqual(["time", "decisions", "projects", "performance"]);
        expect(JSON.parse(localStorage.getItem(layoutStorageKey("account/a", "desktop")))).toEqual(first);
    });
    it("rejects malformed preferences and removes duplicate, unknown and revoked IDs", () => {
        localStorage.setItem(layoutStorageKey("a", "desktop"), JSON.stringify({ version: 1, accountKind: "OWNER", leftOrder: ["time", "time", "performance", "unknown"], rightOrder: ["time", "projects"], hidden: ["projects", "training"] }));
        expect(loadLayout("a", "OWNER", ["time", "projects", "training"], false, false)).toMatchObject({ leftOrder: ["time"], rightOrder: ["projects"], hidden: ["training"] });
        localStorage.setItem(layoutStorageKey("a", "desktop"), "{broken");
        expect(loadLayout("a", "OWNER", permitted, true, false).leftOrder).toEqual(["time", "projects"]);
    });
    it("continues with defaults when storage is denied and reports save failure", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
        const defaults = defaultLayoutFor("OWNER", permitted, true, false);
        expect(loadLayout("a", "OWNER", permitted, true, false)).toEqual(defaults);
        expect(saveLayout("a", defaults)).toBe(false);
    });
});
describe("V10 real Time command adapter", () => {
    it("reuses an uncertain command ID, then creates distinct IDs for pause, resume and stop", async () => {
        let timer = null;
        const commands = [];
        let uncertain = true;
        vi.spyOn(window, "prompt").mockReturnValue("Finished drawing work");
        vi.stubGlobal("fetch", vi.fn(async (input, init) => {
            if (init?.method === "POST") {
                const body = JSON.parse(String(init.body));
                commands.push({ path: input, ...body });
                expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("csrf");
                if (uncertain) {
                    uncertain = false;
                    throw new Error("Connection lost; command not confirmed");
                }
                timer = { id: "timer", version: (timer?.version ?? 0) + 1, state: input.endsWith("/pause") ? "PAUSED" : "RUNNING", workNote: "Draw plans", elapsedSeconds: 60 };
                if (input.endsWith("/stop"))
                    timer = null;
                return json({});
            }
            return json(input.endsWith("/setup") ? { employeeId: "employee", projects: [], tasks: [{ id: "non-project-task", title: "Internal task", projectId: null }] } : { timer });
        }));
        render(_jsx(MemoryRouter, { children: _jsx(DashboardTimeWidget, { csrfToken: "csrf" }) }));
        fireEvent.change(await screen.findByPlaceholderText("What are you working on?"), { target: { value: "Draw plans" } });
        fireEvent.change(screen.getByLabelText("Task · optional"), { target: { value: "non-project-task" } });
        expect(screen.getByRole("button", { name: "Start timer" })).toBeDisabled();
        fireEvent.change(screen.getByLabelText("Non-project activity"), { target: { value: "Internal planning" } });
        fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
        fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
        fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
        fireEvent.click(await screen.findByRole("button", { name: "Resume" }));
        await screen.findByRole("button", { name: "Pause" });
        fireEvent.click(screen.getByRole("button", { name: "Stop & save" }));
        await screen.findByRole("button", { name: "Start timer" });
        expect(commands).toHaveLength(5);
        expect(commands[0].commandId).toBe(commands[1].commandId);
        expect(commands[1]).toMatchObject({ taskId: "non-project-task", activityLabel: "Internal planning" });
        expect(new Set(commands.slice(1).map(c => c.commandId)).size).toBe(4);
        expect(commands.slice(2).map(c => c.expectedVersion)).toEqual([1, 2, 3]);
    });
    it("clears timer details and actions when a mutation reports revoked access", async () => {
        vi.stubGlobal("fetch", vi.fn(async (input, init) => init?.method === "POST" ? json({ message: "Access revoked" }, 403) : json(input.endsWith("/setup") ? { employeeId: "employee", projects: [], tasks: [] } : { timer: { id: "t", version: 1, state: "RUNNING", workNote: "Protected note", elapsedSeconds: 2 } })));
        render(_jsx(MemoryRouter, { children: _jsx(DashboardTimeWidget, { csrfToken: "csrf" }) }));
        fireEvent.click(await screen.findByRole("button", { name: "Pause" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Access revoked");
        expect(screen.queryByText(/Protected note/)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    });
    it("does not offer a timer to an Owner without an employee record", async () => {
        vi.stubGlobal("fetch", vi.fn(async (input) => json(input.endsWith("/setup") ? { employeeId: null, projects: [], tasks: [] } : { timer: null })));
        render(_jsx(MemoryRouter, { children: _jsx(DashboardTimeWidget, { csrfToken: "csrf" }) }));
        expect(await screen.findByText(/no employee record/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Start timer" })).not.toBeInTheDocument();
    });
});
describe("V10 performance permission and late-response boundaries", () => {
    const context = { owner: false, employeeId: "self", policies: [], employees: [{ id: "first", label: "First", teamId: "team", canManage: true }, { id: "second", label: "Second", teamId: "team", canManage: true }, { id: "outside", label: "Outside", teamId: "other", canManage: false }] };
    const score = (id, value) => ({ employee: { id, label: id }, snapshots: [{ id: "score", data: { family: "EMPLOYEE", status: "SCORED", score: value, from: "2026-10-01", to: "2026-10-21" } }], teamAverage: null, relativeToAverage: null });
    it("limits managers to their permitted employees and ignores a late prior selection", async () => {
        let resolveFirst;
        const readFirst = new Promise(resolve => { resolveFirst = resolve; });
        const fetcher = vi.fn(async (input) => input.endsWith("/first") ? readFirst : json(score("second", 88)));
        vi.stubGlobal("fetch", fetcher);
        render(_jsx(MemoryRouter, { children: _jsx(DashboardPerformanceWidget, { context: context, owner: false, csrfToken: "csrf" }) }));
        expect(screen.queryByRole("button", { name: "Teams" })).not.toBeInTheDocument();
        expect(screen.queryByRole("option", { name: "Outside" })).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Employee"), { target: { value: "second" } });
        expect(await screen.findByRole("img", { name: "Score 88 out of 100" })).toBeInTheDocument();
        resolveFirst(json(score("first", 22)));
        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole("img", { name: "Score 22 out of 100" })).not.toBeInTheDocument();
    });
    it("clears old score evidence after a denied selection", async () => {
        vi.stubGlobal("fetch", vi.fn(async (input) => input.endsWith("/first") ? json(score("first", 22)) : json({}, 403)));
        render(_jsx(MemoryRouter, { children: _jsx(DashboardPerformanceWidget, { context: context, owner: false, csrfToken: "csrf" }) }));
        await screen.findByRole("img", { name: "Score 22 out of 100" });
        fireEvent.change(screen.getByLabelText("Employee"), { target: { value: "second" } });
        expect(await screen.findByRole("alert")).toHaveTextContent("403");
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
});
