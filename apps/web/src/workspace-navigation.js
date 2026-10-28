import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import "./workspace-navigation.css";
const destinations = [
    { to: "/settings", label: "Account & settings" },
    { to: "/my-work", label: "My Work" },
    { to: "/decisions", label: "Decisions" },
    { to: "/notifications", label: "Notifications" },
    { to: "/tasks", label: "Tasks" },
    { to: "/projects", label: "Projects" },
    { to: "/people", label: "People" },
    { to: "/documents", label: "Project documents" },
    { to: "/revisions", label: "Drawing register" },
    { to: "/reviews", label: "Internal reviews" },
    { to: "/client-reviews", label: "Client reviews" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/integrations", label: "Integrations" },
    { to: "/automation", label: "Automation & reports" },
    { to: "/assistance", label: "Evidence assistance" },
    { to: "/performance", label: "Performance" },
    { to: "/external-access", label: "External access" },
    { to: "/turnkey", label: "Turnkey operations" },
    { to: "/site", label: "Site delivery" },
    { to: "/time", label: "Time" },
    { to: "/workforce", label: "Workforce" },
    { to: "/learning", label: "Learning" },
];
const primaryDestinationPaths = ["/dashboard", "/my-work", "/projects", "/decisions"];
const primaryPaths = new Set(primaryDestinationPaths);
/* The eight project-scoped routes live under a single "Project queues"
   disclosure. They remain reachable routes (deep links + page finder); only
   their default disclosure changes so the rail reads short. */
const destinationGroups = [
    { label: "Work", paths: ["/my-work", "/decisions", "/notifications", "/tasks", "/projects"] },
    { label: "Project queues", paths: ["/documents", "/revisions", "/reviews", "/client-reviews", "/turnkey", "/site", "/external-access", "/assistance"] },
    { label: "People", paths: ["/people", "/time", "/workforce", "/learning"] },
    { label: "Insights", paths: ["/performance"] },
    { label: "Manage", paths: ["/settings", "/integrations", "/automation"] },
];
/** Shared page context for internal routes, including secondary navigation homes. */
export function workspaceContextLabel(pathname) {
    const secondaryHomes = {
        "/": "Workspace",
        "/workspace": "Workspace",
        "/settings": "Settings",
        "/reports": "Reports",
        "/saved-reports": "Saved reports",
        "/project-health": "Project health",
        "/learning/skills": "Skills",
        "/learning/training": "Training",
        "/learning/library": "Library",
    };
    return secondaryHomes[pathname] ?? destinations.find(item => routeMatchesPath(pathname, item.to))?.label;
}
const sidebarPreferenceKey = "sense.workspace.sidebar-collapsed";
function readSidebarCollapsed() {
    try {
        return sessionStorage.getItem(sidebarPreferenceKey) === "true";
    }
    catch {
        return false;
    }
}
const routeIcons = {
    "/people": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    "/settings": "M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4",
    "/my-work": "M5 5h14v14H5zM8 9h8M8 13h6M8 17h4",
    "/decisions": "M5 12l4 4L19 6M5 6h5M5 18h5",
    "/notifications": "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    "/tasks": "M5 4h14v16H5zM8 9h2M12 9h4M8 14h2M12 14h4",
    "/projects": "M3 7h7l2 2h9v10H3zM3 7V5h7l2 2",
    "/documents": "M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6",
    "/revisions": "M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6",
    "/reviews": "M4 5h16v12H9l-5 4zM8 9h8M8 13h5",
    "/client-reviews": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0M17 13l2 2 3-4",
    "/dashboard": "M4 4h7v7H4zM14 4h6v4h-6zM14 11h6v9h-6zM4 14h7v6H4z",
    "/integrations": "M8 7a4 4 0 0 0-5.6 0L1 8.4a4 4 0 0 0 5.6 5.6L10 11m6 6a4 4 0 0 0 5.6 0l1.4-1.4a4 4 0 0 0-5.6-5.6L14 13M9 15l6-6",
    "/automation": "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8M12 9v6",
    "/assistance": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1 1-1.7 1.4-1.7 3.2M12 17h.01",
    "/performance": "M4 19V5M4 19h17M7 15l4-4 3 2 5-6",
    "/external-access": "M14 4h6v6M20 4l-9 9M18 13v6H5V6h6",
    "/turnkey": "M3 8h18v12H3zM8 8V5h8v3M3 12h18M10 12v2h4v-2",
    "/site": "M3 21h18M5 21V5l7-2 7 2v16M8 8h1M12 8h1M16 8h1M8 12h1M12 12h1M16 12h1M11 21v-5h2v5",
    "/time": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2",
    "/workforce": "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M16 3.2a4 4 0 0 1 0 7.6M20 15a4 4 0 0 1 2 4v2",
    "/learning": "M3 5.5c3-1.5 6-1 9 1v14c-3-2-6-2.5-9-1zM21 5.5c-3-1.5-6-1-9 1v14c3-2 6-2.5 9-1z",
};
/* V10 mobile bottom bar: exactly five destinations. The fifth is a More
   sheet containing every other authorized destination plus Settings/account. */
const mobileDestinations = [
    { to: "/dashboard", label: "Home", icon: "M4 4h7v7H4zM14 4h6v4h-6zM14 11h6v9h-6zM4 14h7v6H4z" },
    { to: "/my-work", label: "My Work", icon: "M5 5h14v14H5zM8 9h8M8 13h6M8 17h4" },
    { to: "/projects", label: "Projects", icon: "M3 7h7l2 2h9v10H3zM3 7V5h7l2 2" },
    { to: "/decisions", label: "Decisions", icon: "M5 12l4 4L19 6M5 6h5M5 18h5" },
];
function Icon({ path, size = 16 }) {
    return _jsx("svg", { className: "workspace-route-icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", width: size, height: size, children: _jsx("path", { d: path }) });
}
function DestinationLinks({ items, onNavigate, icons = false, unreadCount = 0, collapsed = false }) {
    return _jsx(_Fragment, { children: items.map(({ to, label }) => (_jsxs(NavLink, { to: to, title: label, ...(collapsed ? { "aria-label": label } : {}), ...(onNavigate ? { onClick: onNavigate } : {}), children: [icons && _jsx(Icon, { path: routeIcons[to] }), _jsx("span", { className: collapsed ? "workspace-nav-label-is-hidden" : "", children: label }), to === "/notifications" && unreadCount > 0 && _jsx("span", { className: "workspace-nav-unread-badge", "aria-hidden": "true", children: unreadCount > 99 ? "99+" : unreadCount })] }, to))) });
}
function itemsForGroup(group, includePrimary, includeNotifications = true) {
    return group.paths.flatMap(path => destinations.filter(item => item.to === path
        && (includePrimary || !primaryPaths.has(item.to))
        && (includeNotifications || item.to !== "/notifications")));
}
function groupId(prefix, label) {
    return `${prefix}-${label.toLowerCase()}`;
}
function DestinationGroups({ onNavigate, includePrimary = true, unreadCount = 0, collapsed = false }) {
    return _jsx(_Fragment, { children: destinationGroups.map(group => {
            const items = itemsForGroup(group, includePrimary);
            const headingId = `${groupId("workspace-more-group", group.label)}-heading`;
            return items.length ? _jsxs("section", { className: "workspace-nav-group", "aria-labelledby": headingId, children: [_jsx("h2", { id: headingId, className: "workspace-nav-heading", children: group.label }), _jsx(DestinationLinks, { items: items, unreadCount: unreadCount, collapsed: collapsed, ...(onNavigate ? { onNavigate } : {}) })] }, group.label) : null;
        }) });
}
function routeMatchesPath(pathname, route) {
    return pathname === route || pathname.startsWith(`${route}/`);
}
function activeGroupForPath(pathname) {
    return destinationGroups.find(group => group.paths.some(path => routeMatchesPath(pathname, path)))?.label;
}
function initialOpenGroups(pathname) {
    const activeGroup = activeGroupForPath(pathname);
    return Object.fromEntries(destinationGroups.map(group => [group.label, group.label === "Work" || group.label === activeGroup]));
}
function DesktopDestinationGroups({ pathname, filter, onClearFilter, unreadCount, collapsed }) {
    const activeGroup = activeGroupForPath(pathname);
    const [openGroups, setOpenGroups] = useState(() => initialOpenGroups(pathname));
    const query = filter.trim().toLocaleLowerCase();
    useEffect(() => {
        const currentGroup = activeGroupForPath(pathname);
        if (currentGroup)
            setOpenGroups(previous => previous[currentGroup] ? previous : { ...previous, [currentGroup]: true });
    }, [pathname]);
    const groups = destinationGroups.map(group => ({
        group,
        items: itemsForGroup(group, true, group.label !== "Work").filter(item => item.label.toLocaleLowerCase().includes(query)),
    })).filter(({ items }) => query.length === 0 || items.length > 0);
    const dashboardMatches = "dashboard".includes(query);
    const hasResults = groups.some(({ items }) => items.length > 0) || "notifications".includes(query) || dashboardMatches;
    return _jsxs(_Fragment, { children: [(query.length === 0 || dashboardMatches) && !collapsed && _jsxs(NavLink, { className: "workspace-dashboard-link", to: "/dashboard", children: [_jsx(Icon, { path: routeIcons["/dashboard"] }), _jsx("span", { children: "Dashboard" })] }), collapsed && _jsx(NavLink, { className: "workspace-dashboard-link", to: "/dashboard", "aria-label": "Dashboard", children: _jsx(Icon, { path: routeIcons["/dashboard"] }) }), groups.map(({ group, items }) => {
                const prefix = groupId("workspace-desktop-group", group.label);
                const headingId = `${prefix}-heading`;
                const linksId = `${prefix}-links`;
                const currentDescriptionId = `${prefix}-current-description`;
                const isCurrent = activeGroup === group.label;
                const expanded = query.length > 0 ? items.length > 0 : openGroups[group.label];
                return _jsxs("section", { className: `workspace-nav-group${isCurrent ? " is-current" : ""}${collapsed ? " is-collapsed" : ""}`, "aria-labelledby": headingId, children: [_jsx("h2", { id: headingId, className: "workspace-nav-heading", hidden: collapsed, children: _jsxs("button", { className: `workspace-nav-disclosure${isCurrent ? " is-current" : ""}`, type: "button", "aria-label": group.label, "aria-expanded": expanded, "aria-controls": linksId, ...(isCurrent ? { "aria-describedby": currentDescriptionId } : {}), disabled: query.length > 0 || collapsed, onClick: () => setOpenGroups(previous => ({ ...previous, [group.label]: !previous[group.label] })), children: [_jsx("span", { children: group.label }), isCurrent && !collapsed && _jsx("span", { className: "workspace-nav-current-marker", "aria-hidden": "true", children: "Current" }), !collapsed && _jsx("svg", { className: "workspace-nav-chevron", "aria-hidden": "true", focusable: "false", viewBox: "16 16 16 16", children: _jsx("path", { d: "m4 6 4 4 4-4" }) })] }) }), _jsx("div", { id: linksId, className: "workspace-nav-group-links", hidden: !collapsed && !expanded, children: _jsx(DestinationLinks, { items: items, icons: true, unreadCount: unreadCount, collapsed: collapsed }) })] }, group.label);
            }), query.length > 0 && !hasResults && _jsxs("div", { className: "workspace-nav-no-results", role: "status", children: [_jsxs("p", { children: ["No pages match \u201C", filter.trim(), "\u201D."] }), _jsx("button", { className: "workspace-nav-empty-clear", type: "button", onClick: onClearFilter, children: "Clear filter" })] })] });
}
/* V10 Ctrl/Cmd+K page finder. Searches page destinations only (not
   task/project content). Keyboard: type to filter, up/down arrows to move,
   Enter to navigate, Esc to close. Focus is trapped while open and
   returned to the trigger on close. */
function PageFinder({ destinations: dests, onOpenChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const navigate = useNavigate();
    const triggerRef = useRef(null);
    const finderRef = useRef(null);
    useEffect(() => {
        const handleKeyDown = (event) => {
            const target = event.target;
            const inFinder = target === inputRef.current || target !== null && listRef.current?.contains(target);
            if ((event.metaKey || event.ctrlKey) && event.key === "k") {
                event.preventDefault();
                setOpen(previous => {
                    const next = !previous;
                    onOpenChange?.(next);
                    return next;
                });
                setQuery("");
                setActiveIndex(0);
            }
            else if (event.key === "Escape" && open) {
                event.preventDefault();
                setOpen(false);
                onOpenChange?.(false);
                triggerRef.current?.focus();
            }
            else if (open && event.key === "ArrowDown" && inFinder) {
                event.preventDefault();
                setActiveIndex(i => Math.min(Math.max(0, Math.min(20, filtered(dests, query).length) - 1), i + 1));
            }
            else if (open && event.key === "ArrowUp" && inFinder) {
                event.preventDefault();
                setActiveIndex(i => Math.max(0, i - 1));
            }
            else if (open && event.key === "Enter" && target === inputRef.current) {
                event.preventDefault();
                const items = filtered(dests, query);
                if (items[activeIndex]) {
                    navigate(items[activeIndex].to);
                    setOpen(false);
                    onOpenChange?.(false);
                    triggerRef.current?.focus();
                }
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, query, activeIndex, dests, navigate, onOpenChange]);
    useEffect(() => {
        const dialog = finderRef.current;
        if (open && dialog && !dialog.open) {
            dialog.showModal();
            inputRef.current?.focus();
        }
        else if (!open && dialog?.open)
            dialog.close();
    }, [open]);
    const filtered = (d, q) => {
        const query = q.trim().toLocaleLowerCase();
        if (!query)
            return d;
        return d.filter(item => item.label.toLocaleLowerCase().includes(query) || item.to.toLocaleLowerCase().includes(query));
    };
    const items = filtered(dests, query);
    useEffect(() => {
        listRef.current?.querySelectorAll("[data-finder-item]").forEach((el, i) => {
            el.tabIndex = i === activeIndex ? 0 : -1;
        });
    }, [activeIndex, open]);
    return _jsxs(_Fragment, { children: [_jsxs("button", { ref: triggerRef, type: "button", "aria-label": "Find a page", className: "workspace-page-finder-trigger", onClick: () => { setOpen(true); setQuery(""); setActiveIndex(0); onOpenChange?.(true); }, "aria-haspopup": "dialog", "aria-expanded": open, children: [_jsx(Icon, { path: "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" }), _jsx("span", { children: "Find a page" }), _jsxs("kbd", { className: "workspace-page-finder-kbd", children: [navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl+", "K"] })] }), open && (_jsx("dialog", { ref: finderRef, "aria-modal": "true", "aria-label": "Page finder", className: "workspace-page-finder", onCancel: event => { event.preventDefault(); setOpen(false); onOpenChange?.(false); triggerRef.current?.focus(); }, onClick: (event) => { if (event.target === event.currentTarget) {
                    setOpen(false);
                    onOpenChange?.(false);
                    triggerRef.current?.focus();
                } }, children: _jsxs("div", { className: "workspace-page-finder-panel", children: [_jsxs("div", { className: "workspace-page-finder-search", children: [_jsx("input", { ref: inputRef, type: "search", placeholder: "Type a page name\u2026", value: query, onChange: event => { setQuery(event.target.value); setActiveIndex(0); }, "aria-label": "Search pages", autoComplete: "off" }), _jsx("button", { type: "button", className: "workspace-page-finder-close", "aria-label": "Close page finder", onClick: () => { setOpen(false); onOpenChange?.(false); triggerRef.current?.focus(); }, children: "Esc" })] }), _jsxs("div", { ref: listRef, className: "workspace-page-finder-results", role: "listbox", "aria-label": "Matching pages", children: [items.length === 0 && _jsxs("p", { className: "workspace-page-finder-empty", role: "status", children: ["No pages match \u201C", query.trim(), "\u201D."] }), items.slice(0, 20).map((item, i) => (_jsxs("button", { type: "button", "data-finder-item": true, role: "option", "aria-selected": i === activeIndex, className: `workspace-page-finder-item${i === activeIndex ? " is-active" : ""}`, onMouseEnter: () => setActiveIndex(i), onClick: () => { navigate(item.to); setOpen(false); onOpenChange?.(false); triggerRef.current?.focus(); }, children: [_jsx(Icon, { path: routeIcons[item.to] }), _jsx("span", { children: item.label }), _jsx("span", { className: "workspace-page-finder-path", children: item.to })] }, item.to)))] })] }) }))] });
}
export function WorkspaceNavigation() {
    const [moreOpen, setMoreOpen] = useState(false);
    const [filter, setFilter] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);
    const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
    const moreButton = useRef(null);
    const dialog = useRef(null);
    const filterInput = useRef(null);
    const location = useLocation();
    const isDesktop = () => typeof window.matchMedia === "function"
        ? window.matchMedia("(min-width: 768px)").matches
        : window.innerWidth >= 768;
    const clearFilter = () => {
        setFilter("");
        filterInput.current?.focus();
    };
    useEffect(() => {
        let active = true;
        const readUnread = async () => {
            try {
                const response = await fetch("/api/v1/notifications/unread", { credentials: "include", cache: "no-store" });
                if (!active || !response.ok)
                    return;
                const value = await response.json();
                if (active)
                    setUnreadCount(Math.max(0, Number(value.unread) || 0));
            }
            catch { /* leave the last known count in place */ }
        };
        void readUnread();
        const onRouteChange = () => { void readUnread(); };
        window.addEventListener("sense-notifications-read", onRouteChange);
        const interval = window.setInterval(() => void readUnread(), 60000);
        return () => {
            active = false;
            window.removeEventListener("sense-notifications-read", onRouteChange);
            window.clearInterval(interval);
        };
    }, [location.pathname]);
    useEffect(() => {
        if (!moreOpen)
            return;
        const element = dialog.current;
        if (!element)
            return;
        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (!element.open) {
            if (typeof element.showModal === "function")
                element.showModal();
            else
                element.setAttribute("open", "");
        }
        const focusable = () => Array.from(dialog.current?.querySelectorAll("a[href], button:not([disabled])") ?? []);
        focusable()[0]?.focus();
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setMoreOpen(false);
                return;
            }
            if (event.key !== "Tab")
                return;
            const items = focusable();
            if (items.length === 0)
                return;
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            if (element.open && typeof element.close === "function")
                element.close();
            else
                element.removeAttribute("open");
            if (previouslyFocused?.isConnected && !(previouslyFocused === moreButton.current && isDesktop()))
                previouslyFocused.focus();
            else if (!isDesktop())
                moreButton.current?.focus();
        };
    }, [moreOpen]);
    useEffect(() => setMoreOpen(false), [location.pathname]);
    useEffect(() => {
        const closeForDesktop = () => { if (isDesktop())
            setMoreOpen(false); };
        window.addEventListener("resize", closeForDesktop);
        return () => window.removeEventListener("resize", closeForDesktop);
    }, []);
    /* V10 mobile: the fixed bottom bar replaces the old horizontal 4-item row.
       The "More" sheet (dialog) holds every remaining destination plus Settings. */
    const mobileDestinationsList = mobileDestinations.map(({ to, label, icon }) => ({ to, label, icon }));
    return _jsxs(_Fragment, { children: [_jsxs("aside", { className: `workspace-sidebar${collapsed ? " is-collapsed" : ""}`, children: [_jsxs("div", { className: "workspace-sidebar-header", children: [_jsxs("div", { className: "workspace-sidebar-brand-row", children: [_jsxs(NavLink, { to: "/", className: "workspace-shell-brand", "aria-label": "Sense Studios home", children: [_jsx("span", { className: "workspace-shell-brand-mark", "aria-hidden": "true", children: "SS" }), !collapsed && _jsx("span", { children: "SENSE STUDIOS" })] }), _jsx("button", { type: "button", className: "workspace-sidebar-collapse-toggle", "aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar", "aria-expanded": !collapsed, onClick: () => {
                                            const next = !collapsed;
                                            setCollapsed(next);
                                            try {
                                                sessionStorage.setItem(sidebarPreferenceKey, String(next));
                                            }
                                            catch { /* Navigation still works without browser storage. */ }
                                        }, children: _jsxs("svg", { "aria-hidden": "true", focusable: "false", viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "2", y: "3", width: "12", height: "10", rx: "2" }), _jsx("path", { d: "M6 3v10" })] }) })] }), !collapsed && _jsxs(_Fragment, { children: [_jsx("p", { className: "workspace-sidebar-title", children: "Workspace" }), _jsx("label", { className: "workspace-nav-filter-label", htmlFor: "workspace-nav-filter", children: "Find a page" }), _jsxs("div", { className: "workspace-nav-filter-wrap", children: [_jsx("input", { ref: filterInput, id: "workspace-nav-filter", className: "workspace-nav-filter", type: "search", placeholder: "Filter navigation\u2026", value: filter, onChange: event => setFilter(event.target.value) }), filter.length > 0 && _jsx("button", { className: "workspace-nav-filter-clear", type: "button", "aria-label": "Clear navigation filter", onClick: clearFilter, children: "\u00D7" })] })] })] }), _jsx("nav", { className: `workspace-nav${collapsed ? " is-collapsed" : ""}`, "aria-label": "Workspace navigation", children: _jsx(DesktopDestinationGroups, { pathname: location.pathname, filter: filter, onClearFilter: clearFilter, unreadCount: unreadCount, collapsed: collapsed }) }), !collapsed && _jsx("div", { className: "workspace-sidebar-footer", children: _jsxs(Link, { to: "/settings", className: "workspace-sidebar-settings", children: [_jsx(Icon, { path: routeIcons["/settings"] }), _jsx("span", { children: "Settings" })] }) })] }), _jsxs("div", { className: "workspace-mobile-nav", children: [_jsx("nav", { className: "workspace-mobile-main", "aria-label": "Main workspace destinations", children: mobileDestinationsList.slice(0, 4).map(item => (_jsxs(NavLink, { to: item.to, className: "workspace-mobile-item", children: [_jsx(Icon, { path: item.icon }), _jsx("span", { children: item.label })] }, item.to))) }), _jsxs("button", { ref: moreButton, className: "workspace-more-button", type: "button", "aria-haspopup": "dialog", "aria-expanded": moreOpen, "aria-label": `More${unreadCount > 0 ? `, ${unreadCount} unread notifications` : ""}`, onClick: () => setMoreOpen(true), children: [unreadCount > 0 && _jsx("span", { className: "workspace-nav-unread-badge", "aria-hidden": "true", children: unreadCount > 99 ? "99+" : unreadCount }), _jsxs("svg", { className: "workspace-more-icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: [_jsx("circle", { cx: "5", cy: "12", r: "1.5" }), _jsx("circle", { cx: "12", cy: "12", r: "1.5" }), _jsx("circle", { cx: "19", cy: "12", r: "1.5" })] }), _jsx("span", { children: "More" })] })] }), _jsxs("dialog", { ref: dialog, className: "workspace-more-dialog", "aria-modal": "true", "aria-labelledby": "workspace-more-title", onCancel: (event) => { event.preventDefault(); setMoreOpen(false); }, onClick: (event) => { if (event.target === event.currentTarget)
                    setMoreOpen(false); }, children: [_jsxs("div", { className: "workspace-dialog-heading", children: [_jsx("h2", { id: "workspace-more-title", children: "More destinations" }), _jsx("button", { className: "workspace-dialog-close", type: "button", "aria-label": "Close navigation", onClick: () => setMoreOpen(false), children: "Close" })] }), _jsxs("nav", { className: "workspace-more-links", "aria-label": "More workspace destinations", children: [_jsx(DestinationLinks, { items: destinations.filter(item => item.to === "/dashboard"), onNavigate: () => setMoreOpen(false), icons: true, unreadCount: unreadCount }), _jsx(DestinationGroups, { includePrimary: false, onNavigate: () => setMoreOpen(false), unreadCount: unreadCount })] })] })] });
}
export function WorkspaceHeader({ session, contextLabel = "Dashboard", children }) {
    return (_jsxs("div", { className: "workspace-header", children: [_jsxs("div", { className: "workspace-header-left", children: [_jsx("span", { className: "workspace-header-breadcrumb", children: "Workspace" }), _jsx("span", { className: "workspace-header-divider", "aria-hidden": "true" }), _jsx("span", { className: "workspace-header-context", children: contextLabel })] }), _jsxs("div", { className: "workspace-header-actions", children: [_jsx(PageFinder, { destinations: [...destinations] }), _jsxs(NavLink, { to: "/tasks?create=1", className: "workspace-header-new-task", "aria-label": "New task", children: [_jsx(Icon, { path: "M12 5v14M5 12h14", size: 15 }), _jsx("span", { children: "New task" })] }), _jsx(NavLink, { to: "/notifications", className: "workspace-header-notifications", "aria-label": "Notifications", children: _jsx(Icon, { path: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4", size: 16 }) }), _jsxs(Link, { to: "/settings", className: "workspace-header-account", "aria-label": `Account settings for ${session.account.email}`, title: session.account.email, children: [_jsx("span", { className: "workspace-header-account-avatar", "aria-hidden": "true", children: session.account.email.charAt(0).toUpperCase() }), _jsx("span", { className: "workspace-header-account-email", children: session.account.email }), _jsx("span", { className: "workspace-header-account-kind", children: session.account.kind === "OWNER" ? "Owner" : "Staff" })] }), children] })] }));
}
export function WorkspaceLayout({ children }) {
    const location = useLocation();
    const routeClass = location.pathname === "/my-work" ? " workspace-layout--my-work" : "";
    return _jsxs("div", { className: `workspace-layout workspace-layout--studio${routeClass}`, children: [_jsx(WorkspaceNavigation, {}), _jsx("div", { className: "workspace-page", children: children })] });
}
