import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import "./project-directory.css";
const knownStatusClasses = new Set(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"]);
function statusClass(status) {
    const canonical = String(status ?? "").toUpperCase();
    return knownStatusClasses.has(canonical) ? `is-${canonical.toLowerCase()}` : "is-neutral";
}
function dateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
function ProjectMetadata({ item, compact = false }) {
    const scopes = item.scopes ?? [];
    const stages = item.appliedStageKeys ?? [];
    return (_jsxs("dl", { className: `project-directory-metadata${compact ? " is-compact" : ""}`, children: [_jsxs("div", { className: "project-directory-meta", children: [_jsx("dt", { children: "Branch" }), _jsx("dd", { children: item.branch.name })] }), _jsxs("div", { className: "project-directory-meta project-directory-scopes", children: [_jsxs("dt", { children: ["Baseline scopes ", _jsx("span", { className: "project-directory-count", children: scopes.length })] }), _jsx("dd", { children: scopes.length ? scopes.map((scope) => scope.name).join(", ") : "No scopes recorded" })] }), _jsxs("div", { className: "project-directory-meta", children: [_jsx("dt", { children: "Lead" }), _jsx("dd", { children: item.currentLeadName?.trim() || "Unassigned" })] }), _jsxs("div", { className: "project-directory-meta", children: [_jsx("dt", { children: "Next milestone" }), _jsx("dd", { children: item.nextMilestone ? _jsxs(_Fragment, { children: [item.nextMilestone.label, _jsxs("span", { className: "project-directory-date", children: [" \u00B7 ", dateLabel(item.nextMilestone.targetAt)] })] }) : "No dated incomplete milestone" })] }), _jsxs("div", { className: "project-directory-meta project-directory-stages", children: [_jsx("dt", { children: "Plan stages" }), _jsx("dd", { children: stages.length ? stages.join(", ") : "No applied plan stage keys" })] })] }));
}
function ProjectIdentityIcon() {
    return _jsxs("svg", { className: "project-directory-icon", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: [_jsx("path", { d: "M3.5 6.75h6l1.8 2h9.2v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" }), _jsx("path", { d: "M3.5 9h17" })] });
}
export function ProjectDirectory({ items, selectedId, pending, onSelect, initialView = "cards" }) {
    const [view, setView] = useState(initialView);
    return (_jsxs("section", { className: "project-directory", "aria-label": "Projects directory", children: [_jsxs("div", { className: "project-directory-toolbar", children: [_jsxs("p", { className: "project-directory-total", children: [items.length, " ", items.length === 1 ? "project" : "projects", " on this page"] }), _jsxs("div", { className: "project-directory-view-switch", role: "group", "aria-label": "Project display", children: [_jsx("button", { type: "button", "aria-label": "Cards view", "aria-pressed": view === "cards", onClick: () => setView("cards"), children: "Cards" }), _jsx("button", { type: "button", "aria-label": "List view", "aria-pressed": view === "list", onClick: () => setView("list"), children: "List" })] })] }), items.length ? (_jsx("ul", { className: `project-directory-items is-${view}`, children: items.map((item) => (_jsx("li", { className: "project-directory-entry", children: _jsxs("button", { type: "button", className: "project-directory-project", "aria-pressed": selectedId === item.id, disabled: pending, onClick: () => onSelect(item.id), children: [_jsxs("span", { className: "project-directory-heading", children: [_jsx("span", { className: "project-directory-icon-wrap", children: _jsx(ProjectIdentityIcon, {}) }), _jsxs("span", { className: "project-directory-title-wrap", children: [_jsx("span", { className: "project-directory-title", children: item.title }), _jsxs("span", { className: "project-directory-subtitle", children: [item.deliveryType === "TURNKEY" ? "Turnkey" : "Design", " \u00B7 ", item.branch.name] })] }), _jsx("span", { className: `project-directory-status ${statusClass(item.status)}`, children: item.status })] }), _jsx(ProjectMetadata, { item: item, compact: view === "list" })] }) }, item.id))) })) : _jsx("p", { className: "project-directory-empty", children: "No projects match the current view." })] }));
}
