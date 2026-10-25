import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteAccessibility } from "./route-accessibility.js";
const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
afterEach(() => {
    vi.restoreAllMocks();
    if (scrollDescriptor)
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollDescriptor);
    else
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});
describe("route title and main landmark", () => {
    it("marks and focuses the new page title when navigating between heading levels", async () => {
        render(_jsxs(MemoryRouter, { initialEntries: ["/dashboard"], children: [_jsx(RouteAccessibility, {}), _jsx(Link, { to: "/tasks", children: "Tasks page" }), _jsxs(Routes, { children: [_jsx(Route, { path: "/dashboard", element: _jsx("main", { children: _jsx("h1", { children: "Dashboard" }) }) }), _jsx(Route, { path: "/tasks", element: _jsxs("main", { children: [_jsx("h2", { children: "Tasks" }), _jsx("button", { children: "Refresh tasks" })] }) })] })] }));
        const dashboard = screen.getByRole("heading", { name: "Dashboard" });
        await waitFor(() => expect(dashboard).toHaveFocus());
        expect(dashboard).toHaveAttribute("data-sense-page-title");
        fireEvent.click(screen.getByRole("link", { name: "Tasks page" }));
        const tasks = await screen.findByRole("heading", { name: "Tasks" });
        await waitFor(() => expect(tasks).toHaveFocus());
        expect(tasks).toHaveAttribute("data-sense-page-title");
        expect(tasks).toHaveAttribute("tabindex", "-1");
        expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    });
    it("keeps skip navigation focused on main content", async () => {
        const scroll = vi.fn();
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scroll });
        render(_jsxs(MemoryRouter, { children: [_jsx(RouteAccessibility, {}), _jsx("main", { children: _jsx("h1", { children: "Projects" }) })] }));
        await waitFor(() => expect(screen.getByRole("heading")).toHaveFocus());
        fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }));
        expect(screen.getByRole("main")).toHaveFocus();
        expect(scroll).toHaveBeenCalledOnce();
    });
    it("marks a replacement title after loading without stealing the user's focus", async () => {
        const view = (loaded) => _jsxs(MemoryRouter, { children: [_jsx(RouteAccessibility, {}), _jsx("button", { children: "Keep focus" }), _jsx("main", { children: loaded ? _jsx("header", { children: _jsx("h2", { children: "Skills" }) }) : _jsx("h2", { children: "Loading Skills" }) })] });
        const { rerender } = render(view(false));
        await waitFor(() => expect(screen.getByRole("heading")).toHaveFocus());
        screen.getByRole("button", { name: "Keep focus" }).focus();
        rerender(view(true));
        await waitFor(() => expect(screen.getByRole("heading", { name: "Skills" })).toHaveAttribute("data-sense-page-title"));
        expect(screen.getByRole("button", { name: "Keep focus" })).toHaveFocus();
    });
    it("marks the title without stealing focus from an open dialog", async () => {
        render(_jsxs(MemoryRouter, { children: [_jsx(RouteAccessibility, {}), _jsx("dialog", { open: true, children: _jsx("input", { "aria-label": "Draft name", autoFocus: true }) }), _jsx("main", { children: _jsx("h1", { children: "Tasks" }) })] }));
        await waitFor(() => expect(screen.getByRole("heading")).toHaveAttribute("data-sense-page-title"));
        expect(screen.getByRole("textbox", { name: "Draft name" })).toHaveFocus();
    });
});
