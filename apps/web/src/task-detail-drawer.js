import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./task-detail-drawer.css";
const tabs = [
    { id: "overview", label: "Overview" },
    { id: "checklist", label: "Checklist" },
    { id: "evidence", label: "Evidence" },
    { id: "activity", label: "Activity" },
];
export function TaskDetailDrawer({ enabled, taskId, title, taskType, contextLabel, statusLabel, priorityLabel, targetLabel, waitingLabel, checklistCompleted, checklistTotal, overview, checklist, evidence, activity, onClose, onPrevious, onNext, busy = false, loading = false, errors, feedback, actions, hasActions = true, hasData = true, layout = "single", projectPresentation = false, }) {
    const [activeTab, setActiveTab] = useState("overview");
    /**
     * Which section layout is on screen. The default is the single scroll;
     * the footer toggle switches to the tabbed layout so in-progress drafts
     * and existing tab tests keep working. The internal `activeTab` state
     * still drives scroll restoration in both layouts.
     */
    const [sectionLayout, setSectionLayout] = useState(layout);
    const dialogRef = useRef(null);
    const panelRef = useRef(null);
    const closeRef = useRef(null);
    const previousRef = useRef(null);
    const nextRef = useRef(null);
    const pendingNavigationFocus = useRef(null);
    const onCloseRef = useRef(onClose);
    const scrollPositions = useRef(new Map());
    const suppressCloseRef = useRef(false);
    useLayoutEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    useLayoutEffect(() => {
        if (!enabled || typeof document === "undefined")
            return;
        const dialog = dialogRef.current;
        if (!dialog)
            return;
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const body = document.body;
        const previousOverflow = body.style.overflow;
        const previousScrollX = window.scrollX;
        const previousScrollY = window.scrollY;
        suppressCloseRef.current = false;
        body.style.overflow = "hidden";
        if (typeof dialog.showModal === "function" && !dialog.open)
            dialog.showModal();
        closeRef.current?.focus({ preventScroll: true });
        return () => {
            suppressCloseRef.current = true;
            if (dialog.open)
                dialog.close();
            body.style.overflow = previousOverflow;
            if (window.scrollX !== previousScrollX || window.scrollY !== previousScrollY) {
                window.scrollTo(previousScrollX, previousScrollY);
            }
            if (previousFocus?.isConnected)
                previousFocus.focus({ preventScroll: true });
        };
    }, [enabled]);
    useLayoutEffect(() => {
        const panel = panelRef.current;
        if (!panel || !enabled)
            return;
        const key = `${taskId}:${activeTab}`;
        panel.scrollTop = scrollPositions.current.get(key) ?? 0;
    }, [activeTab, enabled, taskId]);
    useLayoutEffect(() => {
        const pending = pendingNavigationFocus.current;
        if (!enabled || loading || !pending || pending.taskId === taskId)
            return;
        (pending.direction === "next" ? nextRef.current : previousRef.current)?.focus({ preventScroll: true });
        pendingNavigationFocus.current = null;
    }, [enabled, loading, taskId]);
    const requestClose = useCallback(() => onCloseRef.current(), []);
    const selectTab = useCallback((next) => {
        const panel = panelRef.current;
        if (panel)
            scrollPositions.current.set(`${taskId}:${activeTab}`, panel.scrollTop);
        setActiveTab(next);
    }, [activeTab, taskId]);
    const onTabKeyDown = (event) => {
        const current = tabs.findIndex((tab) => tab.id === activeTab);
        let next;
        if (event.key === "ArrowRight")
            next = (current + 1) % tabs.length;
        else if (event.key === "ArrowLeft")
            next = (current - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home")
            next = 0;
        else if (event.key === "End")
            next = tabs.length - 1;
        else
            return;
        event.preventDefault();
        const nextTab = tabs[next];
        if (!nextTab)
            return;
        selectTab(nextTab.id);
        document.getElementById(`task-detail-tab-${nextTab.id}`)?.focus();
    };
    const revealTaskActions = () => {
        selectTab("overview");
        requestAnimationFrame(() => {
            const target = dialogRef.current?.querySelector("[data-task-drawer-commands]");
            if (target) {
                target.scrollIntoView({ block: "nearest" });
                if (target.tabIndex < 0)
                    target.tabIndex = -1;
                target.focus({ preventScroll: true });
            }
        });
    };
    if (!enabled)
        return _jsx(_Fragment, { children: overview });
    if (typeof document === "undefined")
        return null;
    const safeChecklistCompleted = Math.max(0, Math.min(checklistTotal, checklistCompleted));
    const content = { overview, checklist, evidence, activity };
    const useTabs = sectionLayout === "tabs";
    /**
     * Header badges are click-to-edit affordances: clicking one reveals and
     * focuses the matching editor inside the Overview section. No new data
     * is fetched — the editors are the forms the parent already renders in
     * `overview`.
     */
    const scrollToOverview = (findTarget) => {
        selectTab("overview");
        requestAnimationFrame(() => {
            const dialog = dialogRef.current;
            const targetElement = findTarget?.(dialog) ?? null;
            const scroller = panelRef.current;
            if (!dialog || !scroller)
                return;
            scroller.scrollTop = 0;
            if (targetElement) {
                targetElement.scrollIntoView({ block: "nearest" });
                if (targetElement.tabIndex < 0)
                    targetElement.tabIndex = -1;
                targetElement.focus({ preventScroll: true });
            }
        });
    };
    const focusEditTask = () => scrollToOverview((dialog) => {
        if (!dialog)
            return null;
        const form = dialog.querySelector(".task-edit-form");
        if (form)
            return form.querySelector("input, select") ?? form;
        const editTask = [...dialog.querySelectorAll("button")].find((element) => element.textContent?.trim() === "Edit task");
        return editTask ?? null;
    });
    const focusStatusTransition = () => scrollToOverview((dialog) => {
        if (!dialog)
            return null;
        const target = [...dialog.querySelectorAll(".task-actions button")].find((element) => !element.disabled);
        return target ?? dialog.querySelector("[aria-label='Reason for change']") ?? null;
    });
    const focusTargetDate = () => scrollToOverview((dialog) => {
        if (!dialog)
            return null;
        const form = dialog.querySelector(".task-edit-form");
        if (form)
            return form.querySelector("input[type='date']") ?? form;
        const facts = dialog.querySelector(".task-facts");
        if (!facts)
            return null;
        const cell = [...facts.children].find((item) => item.querySelector("dt")?.textContent?.startsWith("Target date"));
        return (cell?.querySelector("dd") ?? facts);
    });
    const focusWaiting = () => scrollToOverview((dialog) => {
        if (!dialog)
            return null;
        const form = dialog.querySelector(".task-wait-form");
        if (form)
            return form.querySelector("input, select, textarea") ?? form;
        const details = dialog.querySelector(".task-waiting-details");
        if (details)
            return details.querySelector("input, select, textarea") ?? details;
        return null;
    });
    return createPortal(_jsxs("dialog", { ref: dialogRef, className: `task-workspace task-detail-drawer${projectPresentation ? " task-detail-drawer--project" : ""}`, "aria-labelledby": "task-detail-drawer-title", "aria-describedby": "task-detail-drawer-context", "aria-modal": "true", onCancel: (event) => {
            event.preventDefault();
            requestClose();
        }, onClose: () => {
            if (!suppressCloseRef.current && !dialogRef.current?.open)
                onCloseRef.current();
        }, onClick: (event) => {
            if (event.target === event.currentTarget)
                requestClose();
        }, children: [_jsxs("header", { className: "task-detail-drawer__header", children: [_jsxs("div", { className: "task-detail-drawer__toolbar", children: [_jsxs("span", { className: "task-detail-drawer__identity", children: [taskId, " \u00B7 ", taskType] }), _jsxs("div", { className: "task-detail-drawer__navigation", "aria-label": "Task navigation", children: [_jsx("button", { ref: previousRef, type: "button", className: "task-detail-drawer__icon-button", "aria-label": "Previous task", disabled: !onPrevious || busy || loading, onClick: () => { pendingNavigationFocus.current = { taskId, direction: "previous" }; onPrevious?.(); }, children: "\u2039" }), _jsx("button", { ref: nextRef, type: "button", className: "task-detail-drawer__icon-button", "aria-label": "Next task", disabled: !onNext || busy || loading, onClick: () => { pendingNavigationFocus.current = { taskId, direction: "next" }; onNext?.(); }, children: "\u203A" }), _jsx("button", { ref: closeRef, type: "button", className: "task-detail-drawer__icon-button", "aria-label": "Close task details", onClick: requestClose, children: "\u00D7" })] })] }), _jsx("h2", { id: "task-detail-drawer-title", children: loading ? "Loading task…" : title }), _jsx("p", { id: "task-detail-drawer-context", className: "task-detail-drawer__context", children: contextLabel }), hasData && !loading && _jsxs("div", { className: "task-detail-drawer__badges", "aria-label": "Task status and schedule", children: [_jsxs("button", { type: "button", className: "task-detail-drawer__badge task-detail-drawer__badge--priority", onClick: focusEditTask, "aria-label": `Priority ${priorityLabel} — edit task details`, children: [priorityLabel, " priority"] }), _jsx("button", { type: "button", className: "task-detail-drawer__badge task-detail-drawer__badge--status", onClick: focusStatusTransition, "aria-label": `Status ${statusLabel} — open status actions`, children: statusLabel }), _jsx("button", { type: "button", className: "task-detail-drawer__badge task-detail-drawer__badge--target", onClick: focusTargetDate, "aria-label": `${targetLabel} — set target or committed date`, children: targetLabel }), waitingLabel && _jsx("button", { type: "button", className: "task-detail-drawer__badge task-detail-drawer__badge--waiting", onClick: focusWaiting, "aria-label": `${waitingLabel} — open waiting details`, children: waitingLabel })] }), hasData && !loading && _jsxs("div", { className: "task-detail-drawer__summary", children: [_jsx("span", { children: "Checklist" }), _jsxs("strong", { children: [safeChecklistCompleted, "/", Math.max(0, checklistTotal)] }), _jsx("span", { className: "task-detail-drawer__progress", role: "progressbar", "aria-label": "Checklist completion", "aria-valuemin": 0, "aria-valuemax": Math.max(1, checklistTotal), "aria-valuenow": safeChecklistCompleted, children: _jsx("span", { style: { width: `${checklistTotal > 0 ? safeChecklistCompleted / checklistTotal * 100 : 0}%` } }) })] }), useTabs ? _jsx("div", { className: "task-detail-drawer__tabs", role: "tablist", "aria-label": "Task details", children: tabs.map((tab) => (_jsx("button", { type: "button", id: `task-detail-tab-${tab.id}`, className: activeTab === tab.id ? "is-active" : undefined, role: "tab", "aria-selected": activeTab === tab.id, "aria-controls": `task-detail-panel-${tab.id}`, tabIndex: activeTab === tab.id ? 0 : -1, onClick: () => selectTab(tab.id), onKeyDown: onTabKeyDown, children: tab.label }, tab.id))) }) : null] }), _jsxs("div", { ref: panelRef, className: `task-detail-drawer__body${useTabs ? "" : " task-detail-drawer__body--single"}`, onScroll: (event) => scrollPositions.current.set(`${taskId}:${activeTab}`, event.currentTarget.scrollTop), children: [errors && _jsx("div", { className: "task-detail-drawer__errors", role: "alert", children: errors }), feedback, useTabs
                        ? tabs.map((tab) => (_jsx("section", { id: `task-detail-panel-${tab.id}`, className: "task-detail-drawer__panel", role: "tabpanel", "aria-labelledby": `task-detail-tab-${tab.id}`, hidden: activeTab !== tab.id, tabIndex: 0, children: loading ? _jsx("p", { className: "task-detail-drawer__loading", role: "status", children: "Loading task details\u2026" }) : content[tab.id] }, tab.id)))
                        : tabs.map((tab) => (_jsx("section", { id: `task-detail-panel-${tab.id}`, className: "task-detail-drawer__section", "aria-label": tab.label, children: loading && tab.id === "overview" ? _jsx("p", { className: "task-detail-drawer__loading", role: "status", children: "Loading task details\u2026" }) : content[tab.id] }, tab.id)))] }), _jsxs("footer", { className: "task-detail-drawer__footer", children: [_jsx("div", { className: "task-detail-drawer__footer-actions", children: actions }), _jsxs("div", { className: "task-detail-drawer__footer-controls", children: [_jsx("button", { type: "button", className: "task-detail-drawer__layout-toggle", "aria-pressed": useTabs, onClick: () => { setSectionLayout(useTabs ? "single" : "tabs"); setActiveTab("overview"); }, children: useTabs ? "Single scroll" : "Tabs" }), _jsxs("button", { type: "button", className: "task-detail-drawer__more", onClick: revealTaskActions, disabled: !hasActions || busy || loading, children: ["Task actions ", _jsx("span", { "aria-hidden": "true", children: "\u2197" })] })] })] })] }), document.body);
}
