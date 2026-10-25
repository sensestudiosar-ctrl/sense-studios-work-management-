import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./task-create-dialog.css";
export function TaskCreateDialog({ title, variant, children, onRequestClose, busy = false, footer, ariaDescription }) {
    const dialogRef = useRef(null);
    const headingRef = useRef(null);
    const closeRef = useRef(null);
    const closeRequestRef = useRef(onRequestClose);
    const suppressCloseRef = useRef(false);
    useLayoutEffect(() => { closeRequestRef.current = onRequestClose; }, [onRequestClose]);
    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog)
            return;
        const priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const body = document.body;
        const oldOverflow = body.style.overflow;
        const oldScrollX = window.scrollX;
        const oldScrollY = window.scrollY;
        suppressCloseRef.current = false;
        body.style.overflow = "hidden";
        if (typeof dialog.showModal === "function" && !dialog.open)
            dialog.showModal();
        // V15: the large title input leads the composition on every width, so focus
        // the heading target — on mobile the sheet already places it near the top.
        headingRef.current?.focus({ preventScroll: true });
        return () => {
            suppressCloseRef.current = true;
            if (dialog.open)
                dialog.close();
            body.style.overflow = oldOverflow;
            if (window.scrollX !== oldScrollX || window.scrollY !== oldScrollY)
                window.scrollTo(oldScrollX, oldScrollY);
            if (priorFocus?.isConnected)
                priorFocus.focus({ preventScroll: true });
        };
    }, []);
    const requestClose = () => {
        if (busy)
            return;
        closeRequestRef.current();
    };
    if (typeof document === "undefined")
        return null;
    const descriptionId = ariaDescription ? "task-create-dialog-description" : undefined;
    // Enter in the title field submits the form immediately — the fastest path
    // to creating a task. The parent's validation guards incomplete payloads.
    const handleGlobalKeyDown = (event) => {
        if (event.key !== "Enter" || event.shiftKey || event.isComposing)
            return;
        const active = document.activeElement;
        if (active instanceof HTMLInputElement && (active.name === "title" || active.getAttribute("aria-label") === "Task name")) {
            const form = active.closest("form") ?? dialogRef.current?.querySelector("form") ?? null;
            if (form instanceof HTMLFormElement) {
                event.preventDefault();
                form.requestSubmit();
            }
        }
    };
    useEffect(() => {
        document.addEventListener("keydown", handleGlobalKeyDown, true);
        return () => document.removeEventListener("keydown", handleGlobalKeyDown, true);
    }, []);
    return createPortal(_jsx("dialog", { ref: dialogRef, className: "task-create-dialog", "aria-labelledby": "task-create-dialog-title", "aria-describedby": descriptionId, "aria-modal": "true", onCancel: (event) => { event.preventDefault(); requestClose(); }, onClose: () => { if (!suppressCloseRef.current && !dialogRef.current?.open)
            requestClose(); }, onClick: (event) => { if (event.target === event.currentTarget)
            requestClose(); }, children: _jsxs("div", { className: "task-create-dialog__frame", children: [_jsxs("header", { className: "task-create-dialog__header", children: [_jsxs("div", { className: "task-create-dialog__heading", children: [_jsxs("span", { className: "task-create-dialog__eyebrow", children: [variant, " \u00B7 CREATE TASK"] }), _jsx("h2", { id: "task-create-dialog-title", ref: headingRef, tabIndex: -1, children: title }), ariaDescription && _jsx("p", { id: descriptionId, children: ariaDescription })] }), _jsx("button", { ref: closeRef, className: "task-create-dialog__close", type: "button", "aria-label": "Close create task", disabled: busy, onClick: requestClose, children: "\u00D7" })] }), _jsx("section", { className: "task-create-dialog__body", children: children }), footer && _jsx("footer", { className: "task-create-dialog__footer", children: footer })] }) }), document.body);
}
