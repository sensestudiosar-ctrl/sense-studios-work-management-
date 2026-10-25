import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TaskCreateDialog } from "./task-create-dialog.js";
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
let originalOverflow = "";
beforeEach(() => {
    originalOverflow = document.body.style.overflow;
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
});
afterEach(() => {
    cleanup();
    document.body.style.overflow = originalOverflow;
    if (originalShowModal)
        Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
    else
        Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (originalClose)
        Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
    else
        Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});
function props(overrides = {}) {
    return { title: "Create task", variant: "OWNER", onRequestClose: vi.fn(() => false), children: _jsxs("label", { children: ["Task name", _jsx("input", { "aria-label": "Task name" })] }), ...overrides };
}
describe("TaskCreateDialog", () => {
    it("opens natively, focuses the heading, locks body scroll, then restores trigger focus", async () => {
        function Harness() {
            const [open, setOpen] = useState(false);
            return _jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setOpen(true), children: "Open creator" }), open && _jsx(TaskCreateDialog, { ...props({ onRequestClose: () => { setOpen(false); return true; } }) })] });
        }
        render(_jsx(Harness, {}));
        const trigger = screen.getByRole("button", { name: "Open creator" });
        trigger.focus();
        fireEvent.click(trigger);
        const dialog = screen.getByRole("dialog", { name: "Create task" });
        await waitFor(() => expect(dialog.open).toBe(true));
        expect(screen.getByRole("heading", { name: "Create task" })).toHaveFocus();
        expect(document.body.style.overflow).toBe("hidden");
        fireEvent.click(screen.getByRole("button", { name: "Close create task" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(trigger).toHaveFocus();
        expect(document.body.style.overflow).toBe(originalOverflow);
    });
    it("routes Escape and backdrop through the parent and preserves a declined close", () => {
        const onRequestClose = vi.fn(() => false);
        render(_jsx(TaskCreateDialog, { ...props({ onRequestClose }) }));
        const dialog = screen.getByRole("dialog");
        const cancel = new Event("cancel", { cancelable: true });
        dialog.dispatchEvent(cancel);
        expect(cancel.defaultPrevented).toBe(true);
        fireEvent.click(dialog);
        expect(onRequestClose).toHaveBeenCalledTimes(2);
        expect(dialog.open).toBe(true);
    });
    it("does not allow busy state to bypass the close guard", () => {
        const onRequestClose = vi.fn(() => true);
        render(_jsx(TaskCreateDialog, { ...props({ busy: true, onRequestClose }) }));
        const dialog = screen.getByRole("dialog");
        expect(screen.getByRole("button", { name: "Close create task" })).toBeDisabled();
        const cancel = new Event("cancel", { cancelable: true });
        dialog.dispatchEvent(cancel);
        fireEvent.click(dialog);
        expect(onRequestClose).not.toHaveBeenCalled();
        expect(dialog.open).toBe(true);
    });
    it("renders supplied form fields and footer with a single accessible close control", () => {
        render(_jsx(TaskCreateDialog, { ...props({ children: _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Task name", _jsx("input", { "aria-label": "Task name" })] }), _jsxs("label", { children: ["Due date", _jsx("input", { "aria-label": "Due date", type: "date" })] })] }), footer: _jsx("button", { children: "Create" }), ariaDescription: "Enter task details" }) }));
        expect(screen.getByRole("textbox", { name: "Task name" })).toBeInTheDocument();
        expect(screen.getByLabelText("Due date")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: /close/i })).toHaveLength(1);
        expect(screen.getByRole("dialog")).toHaveAccessibleDescription("Enter task details");
    });
});
