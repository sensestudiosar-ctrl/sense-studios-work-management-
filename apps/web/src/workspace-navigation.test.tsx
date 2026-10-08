import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { WorkspaceLayout } from "./workspace-navigation.js";

let previousWidth = window.innerWidth;

beforeEach(() => {
  previousWidth = window.innerWidth;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});

afterEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: previousWidth });
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

function renderWorkspace(path: string): void {
  render(<MemoryRouter initialEntries={[path]}><WorkspaceLayout><main>Current page</main></WorkspaceLayout></MemoryRouter>);
}

describe("workspace navigation", () => {
  it("keeps the approved destinations available and marks the direct URL active", () => {
    renderWorkspace("/revisions");

    const activeDrawingRegisterLinks = screen.getAllByRole("link", { name: "Drawing register" });
    expect(activeDrawingRegisterLinks.some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    const destinations = ["Account & settings", "My Work & decisions", "Tasks", "Projects", "Project documents", "Drawing register", "Internal reviews", "Client reviews", "Dashboard & reports", "Integrations", "Automation & reports", "Evidence assistance", "Performance", "External access", "Turnkey operations", "Site delivery", "Time", "Workforce", "Learning"];

    expect(screen.queryByRole("link", { name: /^work$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^people$/i })).not.toBeInTheDocument();
    const mobileMain = screen.getByRole("navigation", { name: "Main workspace destinations" });
    expect(within(mobileMain).getAllByRole("link").map((link) => link.textContent)).toEqual(["My Work & decisions", "Tasks", "Project documents"]);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const moreLinks = within(screen.getByRole("dialog", { name: "More destinations" })).getAllByRole("link");
    const moreLabels = moreLinks.map(link => link.textContent);
    const acceptedMore = destinations.filter(label => !["My Work & decisions", "Tasks", "Project documents"].includes(label));
    expect(acceptedMore.every((label) => moreLabels.includes(label))).toBe(true);
    expect(moreLabels.filter((label): label is string => acceptedMore.includes(label as never))).toEqual(acceptedMore);
  });

  it("opens More as a labelled dialog, traps keyboard focus, and restores focus on Escape", () => {
    renderWorkspace("/");
    const more = screen.getByRole("button", { name: "More" });
    more.focus();
    fireEvent.click(more);

    const dialog = screen.getByRole("dialog", { name: "More destinations" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const close = screen.getByRole("button", { name: "Close navigation" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(within(dialog).getByRole("link", { name: "Learning" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(more).toHaveFocus();
  });
});
