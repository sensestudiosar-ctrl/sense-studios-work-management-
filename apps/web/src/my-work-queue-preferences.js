import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadMyWorkSavedViews, saveMyWorkSavedViews } from "./my-work-saved-views.js";
export function MyWorkQueuePreferences({ accountId, snapshot, defaults, mode, onMode, onApply }) {
    const id = useId();
    const dialogRef = useRef(null);
    const triggerRef = useRef(null);
    const [loaded, setLoaded] = useState(() => ({ accountId, result: loadMyWorkSavedViews(accountId ?? "") }));
    const [activeId, setActiveId] = useState("");
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [draftView, setDraftView] = useState(snapshot.view);
    const [draftCompact, setDraftCompact] = useState(snapshot.compact);
    const result = loaded.accountId === accountId ? loaded.result : undefined;
    const views = result?.status === "ready" ? result.views : [];
    useEffect(() => {
        setLoaded({ accountId, result: loadMyWorkSavedViews(accountId ?? "") });
        setActiveId("");
        setMessage("");
    }, [accountId]);
    useEffect(() => {
        const active = views.find(view => view.id === activeId);
        if (active && JSON.stringify(active.snapshot) !== JSON.stringify(snapshot))
            setActiveId("");
    }, [snapshot, activeId, views]);
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog)
            return;
        if (mode) {
            triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setName("");
            setMessage("");
            setDraftView(snapshot.view);
            setDraftCompact(snapshot.compact);
            if (!dialog.open)
                dialog.showModal();
        }
        else if (dialog.open) {
            dialog.close();
            triggerRef.current?.focus({ preventScroll: true });
        }
    }, [mode, snapshot]);
    const save = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!accountId || result?.status !== "ready" || !name.trim())
            return;
        if (views.length >= 20) {
            setMessage("This browser has twenty saved views. No new view was saved.");
            return;
        }
        let viewId;
        try {
            viewId = crypto.randomUUID();
        }
        catch {
            setMessage("Browser saved views are unavailable. No save was confirmed.");
            return;
        }
        const saved = saveMyWorkSavedViews(accountId, [...views, { id: viewId, name: name.trim(), snapshot }]);
        setLoaded({ accountId, result: saved });
        if (saved.status !== "ready") {
            setMessage(saved.message);
            return;
        }
        setActiveId(viewId);
        onMode(null);
        setMessage(`Saved “${name.trim()}” in this browser.`);
    };
    const applyView = (viewId) => {
        const selected = views.find(view => view.id === viewId);
        if (viewId && !selected)
            return;
        onApply(selected?.snapshot ?? defaults);
        setActiveId(viewId);
        setMessage(selected ? `Loaded “${selected.name}”.` : "Default view restored.");
    };
    const available = result?.status === "ready";
    return _jsxs(_Fragment, { children: [_jsxs("div", { className: "my-work-saved-controls", children: [_jsxs("button", { type: "button", className: "my-work-save-view", disabled: !available, onClick: () => onMode("save"), children: [_jsx("span", { "aria-hidden": "true", children: "\u25C7" }), " Save view"] }), _jsxs("select", { "aria-label": "Saved view", value: activeId, disabled: !available, onChange: event => applyView(event.target.value), children: [_jsx("option", { value: "", children: "Default view" }), views.map(view => _jsx("option", { value: view.id, children: view.name }, view.id))] })] }), message && _jsx("p", { className: "my-work-preference-message", role: "status", children: message }), accountId && result && result.status !== "ready" && _jsx("p", { className: "my-work-preference-message", role: "alert", children: result.message }), createPortal(_jsxs("dialog", { ref: dialogRef, className: "my-work-preferences-dialog", "aria-labelledby": `${id}-title`, "aria-describedby": `${id}-description`, onCancel: () => onMode(null), onClose: () => { if (mode)
                    onMode(null); }, children: [_jsx("h3", { id: `${id}-title`, children: mode === "save" ? "Save view" : "Customize My Work" }), _jsx("p", { id: `${id}-description`, children: mode === "save" ? "Save the applied filters, display and density for your account in this browser. Saved preferences are not synced or encrypted." : "Personal display preferences. Task access and recorded information stay the same." }), mode === "save" ? _jsxs("form", { onSubmit: save, children: [_jsxs("label", { children: ["View name", _jsx("input", { autoFocus: true, value: name, onChange: event => setName(event.target.value), required: true, maxLength: 40 })] }), !available && _jsx("p", { role: "alert", children: result ? result.message : "Saved views require a signed-in account." }), message && _jsx("p", { role: "alert", children: message }), _jsxs("div", { className: "my-work-preferences-actions", children: [_jsx("button", { type: "button", onClick: () => onMode(null), children: "Cancel" }), _jsx("button", { type: "submit", className: "task-primary", disabled: !available || !name.trim(), children: "Save" })] })] }) : _jsxs("form", { onSubmit: event => { event.preventDefault(); event.stopPropagation(); onApply({ ...snapshot, view: draftView, compact: draftCompact }); onMode(null); }, children: [_jsxs("label", { children: ["Display", _jsxs("select", { autoFocus: true, value: draftView, onChange: event => setDraftView(event.target.value), children: [_jsx("option", { value: "list", children: "List" }), _jsx("option", { value: "cards", children: "Cards" }), _jsx("option", { value: "board", children: "Kanban" }), _jsx("option", { value: "timeline", children: "Timeline" })] })] }), _jsxs("label", { children: ["Row density", _jsxs("select", { value: draftCompact ? "compact" : "comfortable", onChange: event => setDraftCompact(event.target.value === "compact"), children: [_jsx("option", { value: "comfortable", children: "Comfortable" }), _jsx("option", { value: "compact", children: "Compact" })] })] }), _jsx("p", { children: "Compact density applies to desktop rows; mobile keeps readable touch targets." }), _jsxs("div", { className: "my-work-preferences-actions", children: [_jsx("button", { type: "button", onClick: () => onMode(null), children: "Cancel" }), _jsx("button", { type: "submit", className: "task-primary", children: "Apply" })] })] })] }), document.body)] });
}
