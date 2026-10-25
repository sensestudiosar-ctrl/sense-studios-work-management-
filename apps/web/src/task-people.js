import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./task-people.css";
/**
 * "Assigned by" is the actor of the most recent owner reassignment, falling
 * back to the task creator. It is deliberately NOT treated as a collaborator:
 * the demo distinguishes the two relationships, and so does the audit trail.
 */
function readAssignedBy(value) {
    if (!value || typeof value !== "object")
        return undefined;
    const assignedBy = value.assignedBy;
    if (!assignedBy || typeof assignedBy !== "object")
        return undefined;
    const name = assignedBy.name;
    if (typeof name !== "string" || !name.trim())
        return undefined;
    const kind = assignedBy.kind;
    return { name: name.trim(), kind: kind === "STAFF" ? "STAFF" : "OWNER" };
}
function initials(value) {
    const clean = value.trim();
    if (!clean || /^(unknown worker|task owner)$/i.test(clean))
        return "?";
    const words = (clean.includes("@") ? clean.split("@")[0] : clean).split(/[\s._+-]+/).filter(Boolean);
    if (!words.length)
        return "?";
    return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
export function TaskPeople({ task, primaryOwnerLabel, refreshVersion, onOpenTask, onSessionExpired }) {
    const [openKey, setOpenKey] = useState(null);
    const [load, setLoad] = useState({ key: "", status: "unknown" });
    const [retry, setRetry] = useState(0);
    const loadRef = useRef(load);
    loadRef.current = load;
    const sessionExpiredRef = useRef(onSessionExpired);
    sessionExpiredRef.current = onSessionExpired;
    const trigger = useRef(null);
    const dialog = useRef(null);
    const key = `${task.id}:${task.version}:${refreshVersion}:${task.primaryOwnerEmployeeId}:${task.primaryOwner?.account?.normalizedEmail ?? ""}`;
    const open = openKey === key;
    useEffect(() => {
        if (!open || (loadRef.current.key === key && loadRef.current.status === "ready"))
            return;
        const controller = new AbortController();
        let current = true;
        setLoad({ key, status: "loading" });
        fetch(`/api/v1/tasks/${encodeURIComponent(task.id)}`, { credentials: "include", cache: "no-store", signal: controller.signal })
            .then(async (response) => {
            if (!response.ok) {
                if (response.status === 401 && current)
                    sessionExpiredRef.current?.();
                const error = new Error(`Could not load people (${response.status})`);
                error.status = response.status;
                throw error;
            }
            return response.json();
        })
            .then((body) => {
            if (!current)
                return;
            if (body.task?.id !== task.id || body.task.version !== task.version || body.task.primaryOwnerEmployeeId !== task.primaryOwnerEmployeeId || !Array.isArray(body.collaborators))
                throw new Error("Task details are unavailable. Please retry.");
            const collaborators = [];
            for (const value of body.collaborators) {
                if (!value || typeof value !== "object")
                    throw new Error("Task details are unavailable. Please retry.");
                const person = value;
                if (typeof person.employeeId !== "string" || !person.employeeId.trim() || typeof person.name !== "string" || !person.name.trim())
                    throw new Error("Task details are unavailable. Please retry.");
                const hasHours = typeof person.estimatedHours === "number" || (typeof person.estimatedHours === "string" && person.estimatedHours.trim() !== "");
                const parsedHours = hasHours ? Number(person.estimatedHours) : NaN;
                collaborators.push({ employeeId: person.employeeId, name: person.name, ...(Number.isFinite(parsedHours) ? { estimatedHours: parsedHours } : {}) });
            }
            const assignedBy = readAssignedBy(body.people);
            setLoad({ key, status: "ready", collaborators, ...(assignedBy ? { assignedBy } : {}) });
        })
            .catch((error) => {
            if (!current || controller.signal.aborted)
                return;
            const status = error.status;
            setLoad({ key, status: status === 403 ? "denied" : "error", message: status === 403 ? "You don’t have access to collaborator details." : "Could not load people. Please retry." });
        });
        return () => { current = false; controller.abort(); };
    }, [open, key, task.id, retry]);
    useEffect(() => {
        const element = dialog.current;
        if (!element)
            return;
        if (open && !element.open)
            element.showModal();
        if (!open && element.open)
            element.close();
    }, [open]);
    function close() {
        setOpenKey(null);
        queueMicrotask(() => trigger.current?.focus());
    }
    function openTask() { close(); onOpenTask(); }
    const activeLoad = load.key === key ? load : { key, status: "unknown" };
    const ready = activeLoad.status === "ready";
    const people = ready ? activeLoad.collaborators : [];
    const email = task.primaryOwner?.account?.normalizedEmail;
    const label = primaryOwnerLabel.trim() || email || "Unknown worker";
    return _jsxs(_Fragment, { children: [_jsxs("button", { ref: trigger, type: "button", className: "task-people-trigger", "aria-label": `People on ${task.title}: responsible worker ${label}`, onClick: () => setOpenKey(key), children: [_jsxs("span", { className: "task-people-avatar-stack", "aria-hidden": "true", children: [_jsx("span", { className: "task-people-avatar", children: initials(label) }), ready && people.slice(0, 2).map((person) => _jsx("span", { className: "task-people-avatar", children: initials(person.name) }, person.employeeId)), ready && people.length > 2 && _jsxs("span", { className: "task-people-overflow", children: ["+", people.length - 2] })] }), _jsxs("span", { className: "task-people-copy", children: [_jsxs("strong", { children: [label, ready && people.length > 0 ? ` +${people.length}` : ""] }), _jsx("small", { children: "People" })] })] }), open && typeof document !== "undefined" && createPortal(_jsxs("dialog", { ref: dialog, className: "task-people-dialog", "aria-labelledby": `task-people-title-${task.id}`, onCancel: (event) => { event.preventDefault(); close(); }, onClose: () => { if (open)
                    close(); }, children: [_jsxs("header", { children: [_jsxs("h2", { id: `task-people-title-${task.id}`, children: ["People \u00B7 ", task.title] }), _jsx("button", { type: "button", "aria-label": "Close people dialog", onClick: close, children: "\u00D7" })] }), _jsxs("div", { className: "task-people-info", children: [_jsx(PersonRow, { name: label, detail: "Responsible worker" }), activeLoad.status === "loading" && _jsx("p", { role: "status", children: "Loading collaborators\u2026" }), activeLoad.status === "unknown" && _jsx("p", { role: "status", children: "Loading collaborators\u2026" }), activeLoad.status === "denied" && _jsxs("div", { role: "alert", children: [activeLoad.message, " ", _jsx("button", { type: "button", onClick: () => { setLoad({ key, status: "unknown" }); setRetry((value) => value + 1); }, children: "Retry" })] }), activeLoad.status === "error" && _jsxs("div", { role: "alert", children: [activeLoad.message, " ", _jsx("button", { type: "button", onClick: () => { setLoad({ key, status: "unknown" }); setRetry((value) => value + 1); }, children: "Retry" })] }), ready && people.map((person) => _jsx(PersonRow, { name: person.name, detail: "Collaborator" }, person.employeeId)), ready && people.length === 0 && _jsx("p", { children: "No collaborators assigned." }), _jsxs("div", { className: "task-people-assigned-by", children: [_jsx("strong", { children: "Assigned by" }), _jsx("span", { children: activeLoad.assignedBy ? `${activeLoad.assignedBy.name}${activeLoad.assignedBy.kind === "OWNER" ? " · Owner" : " · Staff"}` : "Assigning person’s name unavailable." })] }), _jsxs("div", { className: "task-people-review-note", children: [_jsx("strong", { children: "Review" }), task.reviewRequirement === "NONE" ? _jsx("span", { children: "Review not required." }) : _jsx("button", { type: "button", onClick: openTask, children: "Open review assignment" })] })] }), _jsxs("footer", { children: [_jsx("button", { type: "button", onClick: close, children: "Close" }), _jsx("button", { type: "button", className: "primary", onClick: openTask, children: "Open task details" })] })] }), document.body)] });
}
function PersonRow({ name, detail }) {
    return _jsxs("div", { className: "task-people-info-row", children: [_jsx("span", { className: "task-people-avatar", "aria-hidden": "true", children: initials(name) }), _jsxs("span", { children: [_jsx("strong", { children: name }), _jsx("small", { children: detail })] })] });
}
