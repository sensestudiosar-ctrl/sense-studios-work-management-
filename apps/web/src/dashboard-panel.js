import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { workDate, workState } from "./work-labels";
import "./dashboard-panel.css";
/** A read-only view of the current authorized source, never a copied cache. */
export function DashboardPanel({ title, sections, loading, error, readAt, dateLabel = "Date", onRetry, onClose, primaryAction }) {
    const dialogRef = useRef(null), closeRef = useRef(null);
    const dismiss = useRef(onClose);
    useLayoutEffect(() => { dismiss.current = onClose; }, [onClose]);
    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog)
            return;
        const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        if (typeof dialog.showModal === "function")
            dialog.showModal();
        else
            dialog.setAttribute("open", "");
        closeRef.current?.focus({ preventScroll: true });
        return () => {
            if (dialog.open && typeof dialog.close === "function")
                dialog.close();
            document.body.style.overflow = overflow;
            if (trigger?.isConnected)
                trigger.focus({ preventScroll: true });
        };
    }, []);
    return createPortal(_jsx("dialog", { ref: dialogRef, className: "dashboard-context-panel", "aria-modal": "true", "aria-labelledby": "dashboard-context-panel-title", onCancel: event => { event.preventDefault(); dismiss.current(); }, onClick: event => { if (event.target === event.currentTarget)
            dismiss.current(); }, children: _jsxs("div", { className: "dashboard-context-panel__frame", children: [_jsxs("header", { className: "dashboard-context-panel__header", children: [_jsxs("div", { children: [_jsx("span", { className: "eyebrow", children: "DASHBOARD DETAILS" }), _jsx("h2", { id: "dashboard-context-panel-title", children: title })] }), _jsx("button", { ref: closeRef, type: "button", "aria-label": "Close dashboard details", onClick: onClose, children: "\u00D7" })] }), _jsx("div", { className: "dashboard-context-panel__body", children: loading ? _jsx("p", { role: "status", children: "Reading current information\u2026" }) : error ? _jsxs("div", { role: "alert", children: [_jsx("p", { children: error }), _jsx("button", { type: "button", onClick: onRetry, children: "Retry source" })] }) : _jsxs(_Fragment, { children: [sections.map(section => _jsxs("section", { className: "dashboard-context-panel__section", "aria-label": section.label, children: [_jsxs("div", { className: "dashboard-context-panel__section-heading", children: [_jsx("h3", { children: section.label }), !section.unavailable && _jsxs("span", { children: [section.rows.length, " items"] })] }), section.unavailable ? _jsxs("div", { role: "status", children: [_jsx("p", { children: section.unavailable }), _jsx("button", { type: "button", onClick: onRetry, children: "Retry source" })] }) : section.rows.length ? _jsx("ul", { className: "dashboard-context-panel__list", children: section.rows.map(row => _jsxs("li", { children: [_jsx("strong", { children: row.label }), _jsxs("div", { className: "dashboard-context-panel__facts", children: [row.status && _jsx("span", { children: workState(row.status) }), row.date && _jsxs("span", { children: [dateLabel, " ", workDate(row.date)] }), row.value !== undefined && row.value !== null && _jsx("span", { children: row.value })] }), typeof row.score === "number" && Number.isFinite(row.score) && _jsxs("p", { children: ["Health score ", row.score, row.scoreScale && row.scoreScale.max > row.scoreScale.min ? ` · Scale ${row.scoreScale.min}–${row.scoreScale.max}` : " · Scale unavailable"] }), row.route && _jsx(Link, { to: row.route, onClick: onClose, children: "Open workspace \u2192" })] }, row.id)) }) : _jsx("p", { children: "No matching items in your current access scope." })] }, section.key)), !sections.length && _jsx("p", { children: "No matching items in your current access scope." })] }) }), _jsxs("footer", { className: "dashboard-context-panel__footer", children: [_jsx("span", { children: readAt && !loading && !error ? `Source read at ${new Date(readAt).toLocaleString()}` : "Current authorized source" }), primaryAction, _jsx("button", { type: "button", onClick: onRetry, disabled: loading, children: "Refresh details" })] })] }) }), document.body);
}
