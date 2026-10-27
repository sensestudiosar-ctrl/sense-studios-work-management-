import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TaskDetailDrawer } from "./task-detail-drawer.js";
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
const originalAnimationFrame = Object.getOwnPropertyDescriptor(window, "requestAnimationFrame");
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
let originalBodyOverflow = "";
beforeEach(() => {
    originalBodyOverflow = document.body.style.overflow;
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        configurable: true,
        value() { this.setAttribute("open", ""); },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
        configurable: true,
        value() {
            this.removeAttribute("open");
            this.dispatchEvent(new Event("close"));
        },
    });
    if (typeof window.requestAnimationFrame !== "function") {
        Object.defineProperty(window, "requestAnimationFrame", {
            configurable: true,
            value(callback) { return window.setTimeout(() => callback(performance.now()), 0); },
        });
    }
    // jsdom does not implement scrollIntoView; the badge affordances rely on it.
    if (!Element.prototype.scrollIntoView) {
        Object.defineProperty(Element.prototype, "scrollIntoView", {
            configurable: true,
            value() { },
        });
    }
});
afterEach(() => {
    cleanup();
    document.body.style.overflow = originalBodyOverflow;
    if (originalShowModal)
        Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
    else
        Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (originalClose)
        Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
    else
        Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
    if (originalAnimationFrame)
        Object.defineProperty(window, "requestAnimationFrame", originalAnimationFrame);
    else
        Reflect.deleteProperty(window, "requestAnimationFrame");
    if (originalScrollIntoView)
        Object.defineProperty(Element.prototype, "scrollIntoView", originalScrollIntoView);
    else
        Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});
function drawerProps(overrides = {}) {
    return {
        enabled: true,
        taskId: "TASK-42",
        title: "Prepare studio concept",
        taskType: "Design task",
        contextLabel: "Harbor House · Concept",
        statusLabel: "In progress",
        priorityLabel: "High",
        targetLabel: "Due 18 Oct",
        waitingLabel: "Waiting on client",
        checklistCompleted: 2,
        checklistTotal: 5,
        overview: _jsxs(_Fragment, { children: [_jsx("h3", { children: "Overview content" }), _jsx("h4", { "data-task-drawer-commands": true, children: "Actions" }), _jsx("button", { type: "button", children: "Edit task" })] }),
        checklist: _jsx("p", { children: "Checklist content" }),
        evidence: _jsx("p", { children: "Evidence content" }),
        activity: _jsx("p", { children: "Activity content" }),
        onClose: vi.fn(),
        ...overrides,
    };
}
/**
 * The drawer's default layout is the single scroll. Tests that pin the
 * tabbed behaviour first select the tabbed layout through the footer
 * toggle, keeping every original tab assertion intact.
 */
/** Selects the tabbed layout before asserting tab behaviour. */
function renderDrawer(overrides = {}, tabbed = false) {
    return render(_jsx(TaskDetailDrawer, { ...drawerProps(overrides), layout: tabbed ? "tabs" : "single" }));
}
describe("TaskDetailDrawer", () => {
    it("renders the overview inline when disabled", () => {
        render(_jsx(TaskDetailDrawer, { ...drawerProps({ enabled: false }) }));
        expect(screen.getByRole("heading", { name: "Overview content" })).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    it("opens as a native modal, locks body scrolling, then restores the close trigger focus and prior overflow", async () => {
        document.body.style.overflow = "clip";
        function ModalHarness() {
            const [enabled, setEnabled] = useState(false);
            return _jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => setEnabled(true), children: "Open task" }), _jsx(TaskDetailDrawer, { ...drawerProps(), enabled: enabled, onClose: () => setEnabled(false) })] });
        }
        const view = render(_jsx(ModalHarness, {}));
        const openTrigger = screen.getByRole("button", { name: "Open task" });
        openTrigger.focus();
        fireEvent.click(openTrigger);
        const dialog = screen.getByRole("dialog", { name: "Prepare studio concept" });
        await waitFor(() => expect(dialog.open).toBe(true));
        expect(document.body.style.overflow).toBe("hidden");
        expect(screen.getByRole("button", { name: "Close task details" })).toHaveFocus();
        fireEvent.click(screen.getByRole("button", { name: "Close task details" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(document.body.style.overflow).toBe("clip");
        expect(openTrigger).toHaveFocus();
        view.unmount();
    });
    it("routes Escape and backdrop close requests through the parent without forcing dismissal", () => {
        const onClose = vi.fn();
        render(_jsx(TaskDetailDrawer, { ...drawerProps({ onClose }) }));
        const dialog = screen.getByRole("dialog");
        const cancel = new Event("cancel", { cancelable: true });
        dialog.dispatchEvent(cancel);
        expect(cancel.defaultPrevented).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(dialog.open).toBe(true);
        fireEvent.click(dialog);
        expect(onClose).toHaveBeenCalledTimes(2);
        expect(dialog.open).toBe(true);
    });
    it("defaults to the single-scroll layout with all four sections in one column, and keeps the tabbed layout reachable", () => {
        render(_jsx(TaskDetailDrawer, { ...drawerProps() }));
        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
        const body = screen.getByRole("dialog").querySelector(".task-detail-drawer__body");
        expect(body).toHaveClass("task-detail-drawer__body--single");
        const sections = [...body.querySelectorAll(".task-detail-drawer__section")];
        expect(sections.map((section) => section.getAttribute("aria-label"))).toEqual(["Overview", "Checklist", "Evidence", "Activity"]);
        expect(screen.getByText("Checklist content")).toBeInTheDocument();
        expect(screen.getByText("Evidence content")).toBeInTheDocument();
        expect(screen.getByText("Activity content")).toBeInTheDocument();
        // The footer toggle reveals the tabbed layout with all four panels mounted.
        fireEvent.click(screen.getByRole("button", { name: "Tabs" }));
        expect(screen.getByRole("tablist", { name: "Task details" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
        fireEvent.click(screen.getByRole("button", { name: "Single scroll" }));
        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
        expect(screen.getByText("Checklist content")).toBeInTheDocument();
    });
    it("selects all four tabs and moves selection and focus with arrow keys", () => {
        renderDrawer({}, true);
        const tablist = screen.getByRole("tablist", { name: "Task details" });
        const overviewTab = within(tablist).getByRole("tab", { name: "Overview" });
        const checklistTab = within(tablist).getByRole("tab", { name: "Checklist" });
        const evidenceTab = within(tablist).getByRole("tab", { name: "Evidence" });
        const activityTab = within(tablist).getByRole("tab", { name: "Activity" });
        expect([overviewTab, checklistTab, evidenceTab, activityTab].map((tab) => tab.textContent)).toEqual([
            "Overview", "Checklist", "Evidence", "Activity",
        ]);
        fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
        expect(checklistTab).toHaveAttribute("aria-selected", "true");
        expect(checklistTab).toHaveFocus();
        fireEvent.keyDown(checklistTab, { key: "ArrowRight" });
        expect(evidenceTab).toHaveAttribute("aria-selected", "true");
        fireEvent.keyDown(evidenceTab, { key: "ArrowLeft" });
        expect(checklistTab).toHaveAttribute("aria-selected", "true");
        fireEvent.keyDown(checklistTab, { key: "End" });
        expect(activityTab).toHaveAttribute("aria-selected", "true");
        fireEvent.keyDown(activityTab, { key: "Home" });
        expect(overviewTab).toHaveAttribute("aria-selected", "true");
    });
    it("keeps hidden tab panels mounted so an in-progress form draft survives tab changes", () => {
        function DraftForm() {
            const [draft, setDraft] = useState("");
            return _jsxs("label", { children: ["Evidence note", _jsx("input", { "aria-label": "Evidence note", value: draft, onChange: (event) => setDraft(event.target.value) })] });
        }
        renderDrawer({ evidence: _jsx(DraftForm, {}) }, true);
        const evidenceTab = screen.getByRole("tab", { name: "Evidence" });
        fireEvent.click(evidenceTab);
        fireEvent.change(screen.getByRole("textbox", { name: "Evidence note" }), { target: { value: "Client upload pending" } });
        fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
        expect(screen.getByRole("tabpanel", { name: "Activity" })).toBeVisible();
        const evidencePanel = document.getElementById("task-detail-panel-evidence");
        expect(evidencePanel).not.toBeNull();
        expect(evidencePanel).toHaveAttribute("hidden");
        expect(evidencePanel?.querySelector("input")).toHaveValue("Client upload pending");
        fireEvent.click(evidenceTab);
        expect(screen.getByRole("textbox", { name: "Evidence note" })).toHaveValue("Client upload pending");
    });
    it("restores navigation focus after loading the next task and keeps the selected tab", async () => {
        function NavigationHarness() {
            const [taskId, setTaskId] = useState("TASK-42");
            const [loading, setLoading] = useState(false);
            return _jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => setLoading(false), children: "Finish loading" }), _jsx(TaskDetailDrawer, { ...drawerProps({
                            taskId,
                            title: taskId === "TASK-42" ? "Prepare studio concept" : "Prepare elevations",
                            loading,
                            onNext: () => { setTaskId("TASK-43"); setLoading(true); },
                        }), enabled: true })] });
        }
        render(_jsx(NavigationHarness, {}));
        fireEvent.click(screen.getByRole("button", { name: "Tabs" }));
        fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
        const nextButton = screen.getByRole("button", { name: "Next task" });
        nextButton.focus();
        fireEvent.click(nextButton);
        expect(screen.getByRole("heading", { name: "Loading task…" })).toBeInTheDocument();
        expect(nextButton).toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: "Finish loading" }));
        await waitFor(() => expect(screen.getByRole("heading", { name: "Prepare elevations" })).toBeInTheDocument());
        expect(screen.getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("button", { name: "Next task" })).toHaveFocus();
    });
    it("calls previous and next callbacks and disables navigation while busy or loading", () => {
        const onPrevious = vi.fn();
        const onNext = vi.fn();
        const view = render(_jsx(TaskDetailDrawer, { ...drawerProps({ onPrevious, onNext }) }));
        fireEvent.click(screen.getByRole("button", { name: "Previous task" }));
        fireEvent.click(screen.getByRole("button", { name: "Next task" }));
        expect(onPrevious).toHaveBeenCalledOnce();
        expect(onNext).toHaveBeenCalledOnce();
        view.rerender(_jsx(TaskDetailDrawer, { ...drawerProps({ onPrevious, onNext, busy: true }) }));
        expect(screen.getByRole("button", { name: "Previous task" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Next task" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Task actions" })).toBeDisabled();
        view.rerender(_jsx(TaskDetailDrawer, { ...drawerProps({ onPrevious, onNext, loading: true }) }));
        expect(screen.getByRole("heading", { name: "Loading task…" })).toBeInTheDocument();
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Previous task" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Task actions" })).toBeDisabled();
        expect(screen.getByRole("status")).toHaveTextContent("Loading task details…");
    });
    it("shows supplied task metadata and the real checklist total without inventing evidence counts", () => {
        render(_jsx(TaskDetailDrawer, { ...drawerProps() }));
        const dialog = screen.getByRole("dialog");
        expect(within(dialog).getByText("TASK-42 · Design task")).toBeInTheDocument();
        expect(within(dialog).getByText("Harbor House · Concept")).toBeInTheDocument();
        expect(within(dialog).getByText("High priority")).toBeInTheDocument();
        expect(within(dialog).getByText("In progress")).toBeInTheDocument();
        expect(within(dialog).getByText("Due 18 Oct")).toBeInTheDocument();
        expect(within(dialog).getByText("Waiting on client")).toBeInTheDocument();
        expect(within(dialog).getByRole("progressbar", { name: "Checklist completion" })).toHaveAttribute("aria-valuenow", "2");
        expect(within(dialog).getByRole("progressbar", { name: "Checklist completion" })).toHaveAttribute("aria-valuemax", "5");
        expect(within(dialog).getByText("2/5")).toBeInTheDocument();
        expect(within(dialog).queryByText(/Evidence received|outstanding|confirmed/)).not.toBeInTheDocument();
    });
    it("switches Task actions to Overview and focuses the existing command marker", async () => {
        renderDrawer({}, true);
        fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
        const marker = document.querySelector("[data-task-drawer-commands]");
        expect(marker).not.toBeNull();
        const scrollIntoView = vi.fn();
        Object.defineProperty(marker, "scrollIntoView", { configurable: true, value: scrollIntoView });
        fireEvent.click(screen.getByRole("button", { name: "Task actions" }));
        await waitFor(() => expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true"));
        await waitFor(() => expect(marker).toHaveFocus());
        expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    });
    it("treats the header badges as click-to-edit affordances that reveal and focus the matching Overview editor", async () => {
        const localRender = (overrides = {}) => render(_jsx(TaskDetailDrawer, { ...drawerProps({ waitingLabel: "Waiting on client", ...overrides }) }));
        vi.stubGlobal("requestAnimationFrame", (callback) => window.setTimeout(() => callback(performance.now()), 0));
        // Status badge: scroll to Overview and focus the transition action.
        localRender({ overview: _jsxs(_Fragment, { children: [_jsx("h4", { "data-task-drawer-commands": true, tabIndex: -1, children: "Task actions" }), _jsx("div", { className: "task-actions", children: _jsx("button", { type: "button", children: "Start task" }) }), _jsxs("dl", { className: "task-facts", children: [_jsxs("div", { children: [_jsx("dt", { children: "Priority" }), _jsx("dd", { children: "High" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Target date" }), _jsx("dd", { children: "18 Oct 2026" })] })] })] }) });
        const statusBadge = screen.getByRole("button", { name: /Status In progress/ });
        fireEvent.click(statusBadge);
        await waitFor(() => expect(screen.getByRole("button", { name: "Start task" })).toHaveFocus());
        cleanup();
        // Target badge: focus the target-date fact when no edit form is open.
        localRender({ overview: _jsxs(_Fragment, { children: [_jsx("h4", { "data-task-drawer-commands": true, tabIndex: -1, children: "Task actions" }), _jsx("div", { className: "task-actions", children: _jsx("button", { type: "button", children: "Start task" }) }), _jsxs("dl", { className: "task-facts", children: [_jsxs("div", { children: [_jsx("dt", { children: "Priority" }), _jsx("dd", { children: "High" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Target date" }), _jsx("dd", { children: "18 Oct 2026" })] })] })] }) });
        const targetBadge = screen.getByRole("button", { name: /Due 18 Oct/ });
        fireEvent.click(targetBadge);
        await waitFor(() => expect(screen.getByText("18 Oct 2026")).toHaveFocus());
        cleanup();
        // Priority badge: reveal the Edit task form field when one is open.
        function OverviewWithEditForm() {
            return _jsx("form", { className: "task-edit-form", children: _jsx("input", { "aria-label": "Task name", defaultValue: "Prepare studio concept" }) });
        }
        localRender({ overview: _jsxs(_Fragment, { children: [_jsx("h4", { "data-task-drawer-commands": true, tabIndex: -1, children: "Task actions" }), _jsx(OverviewWithEditForm, {})] }) });
        const priorityBadge = screen.getByRole("button", { name: /Priority High/ });
        fireEvent.click(priorityBadge);
        await waitFor(() => expect(screen.getByRole("textbox", { name: "Task name" })).toHaveFocus());
        cleanup();
        // Waiting badge: reveal the waiting details.
        function OverviewWithWaiting() {
            return _jsx("section", { className: "task-waiting-details", "aria-label": "Waiting details", children: _jsx("input", { "aria-label": "Resume reason", defaultValue: "" }) });
        }
        localRender({ overview: _jsxs(_Fragment, { children: [_jsx("h4", { "data-task-drawer-commands": true, tabIndex: -1, children: "Task actions" }), _jsx(OverviewWithWaiting, {})] }) });
        const waitingBadge = screen.getByRole("button", { name: /Waiting on client/ });
        fireEvent.click(waitingBadge);
        await waitFor(() => expect(screen.getByRole("textbox", { name: "Resume reason" })).toHaveFocus());
        vi.unstubAllGlobals();
    });
});
