import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteAccessibility } from "./route-accessibility.js";

const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
afterEach(() => {
  vi.restoreAllMocks();
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

describe("route title and main landmark", () => {
  it("marks and focuses the new page title when navigating between heading levels", async () => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><RouteAccessibility /><Link to="/tasks">Tasks page</Link><Routes>
      <Route path="/dashboard" element={<main><h1>Dashboard</h1></main>} />
      <Route path="/tasks" element={<main><h2>Tasks</h2><button>Refresh tasks</button></main>} />
    </Routes></MemoryRouter>);
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
    render(<MemoryRouter><RouteAccessibility /><main><h1>Projects</h1></main></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading")).toHaveFocus());
    fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }));
    expect(screen.getByRole("main")).toHaveFocus();
    expect(scroll).toHaveBeenCalledOnce();
  });

  it("marks a replacement title after loading without stealing the user's focus", async () => {
    const view = (loaded: boolean): React.JSX.Element => <MemoryRouter><RouteAccessibility /><button>Keep focus</button><main>{loaded ? <header><h2>Skills</h2></header> : <h2>Loading Skills</h2>}</main></MemoryRouter>;
    const { rerender } = render(view(false));
    await waitFor(() => expect(screen.getByRole("heading")).toHaveFocus());
    screen.getByRole("button", { name: "Keep focus" }).focus();
    rerender(view(true));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Skills" })).toHaveAttribute("data-sense-page-title"));
    expect(screen.getByRole("button", { name: "Keep focus" })).toHaveFocus();
  });

  it("marks the title without stealing focus from an open dialog", async () => {
    render(<MemoryRouter><RouteAccessibility /><dialog open><input aria-label="Draft name" autoFocus /></dialog><main><h1>Tasks</h1></main></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading")).toHaveAttribute("data-sense-page-title"));
    expect(screen.getByRole("textbox", { name: "Draft name" })).toHaveFocus();
  });
});
