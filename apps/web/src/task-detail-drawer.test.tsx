// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TaskDetailDrawer, type TaskDetailDrawerProps } from "./task-detail-drawer.js";

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
const originalAnimationFrame = Object.getOwnPropertyDescriptor(window, "requestAnimationFrame");
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
let originalBodyOverflow = "";

beforeEach(() => {
  originalBodyOverflow = document.body.style.overflow;
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) { this.setAttribute("open", ""); },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
  if (typeof window.requestAnimationFrame !== "function") {
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value(callback: FrameRequestCallback) { return window.setTimeout(() => callback(performance.now()), 0); },
    });
  }
  // jsdom does not implement scrollIntoView; the badge affordances rely on it.
  if (!Element.prototype.scrollIntoView) {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value() { /* jsdom: no-op */ },
    });
  }
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = originalBodyOverflow;
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  if (originalAnimationFrame) Object.defineProperty(window, "requestAnimationFrame", originalAnimationFrame);
  else Reflect.deleteProperty(window, "requestAnimationFrame");
  if (originalScrollIntoView) Object.defineProperty(Element.prototype, "scrollIntoView", originalScrollIntoView);
  else Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

function drawerProps(overrides: Partial<TaskDetailDrawerProps> = {}): TaskDetailDrawerProps {
  return {
    enabled: true,
    taskId: "TASK-42",
    title: "Prepare studio concept",
    taskType: "Design task",
    contextLabel: "Harbor House · Concept",
    statusLabel: "In progress",
    priorityLabel: "High",
    targetLabel: "Due 18 Oct",
    waitingLabel: "Waiting on client",
    checklistCompleted: 2,
    checklistTotal: 5,
    overview: <><h3>Overview content</h3><h4 data-task-drawer-commands>Actions</h4><button type="button">Edit task</button></>,
    checklist: <p>Checklist content</p>,
    evidence: <p>Evidence content</p>,
    activity: <p>Activity content</p>,
    onClose: vi.fn(),
    ...overrides,
  };
}

/**
 * The drawer's default layout is the single scroll. Tests that pin the
 * tabbed behaviour first select the tabbed layout through the footer
 * toggle, keeping every original tab assertion intact.
 */
/** Selects the tabbed layout before asserting tab behaviour. */
function renderDrawer(overrides: Partial<TaskDetailDrawerProps> = {}, tabbed = false): ReturnType<typeof render> {
  return render(<TaskDetailDrawer {...drawerProps(overrides)} layout={tabbed ? "tabs" : "single"} />);
}

describe("TaskDetailDrawer", () => {
  it("renders the overview inline when disabled", () => {
    render(<TaskDetailDrawer {...drawerProps({ enabled: false })} />);
    expect(screen.getByRole("heading", { name: "Overview content" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a native modal, locks body scrolling, then restores the close trigger focus and prior overflow", async () => {
    document.body.style.overflow = "clip";
    function ModalHarness() {
      const [enabled, setEnabled] = useState(false);
      return <><button type="button" onClick={() => setEnabled(true)}>Open task</button><TaskDetailDrawer {...drawerProps()} enabled={enabled} onClose={() => setEnabled(false)} /></>;
    }
    const view = render(<ModalHarness />);
    const openTrigger = screen.getByRole("button", { name: "Open task" });
    openTrigger.focus();
    fireEvent.click(openTrigger);

    const dialog = screen.getByRole("dialog", { name: "Prepare studio concept" }) as HTMLDialogElement;
    await waitFor(() => expect(dialog.open).toBe(true));
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Close task details" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Close task details" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe("clip");
    expect(openTrigger).toHaveFocus();
    view.unmount();
  });

  it("routes Escape and backdrop close requests through the parent without forcing dismissal", () => {
    const onClose = vi.fn();
    render(<TaskDetailDrawer {...drawerProps({ onClose })} />);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;

    const cancel = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);

    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(dialog.open).toBe(true);
  });

  it("defaults to the single-scroll layout with all four sections in one column, and keeps the tabbed layout reachable", () => {
    render(<TaskDetailDrawer {...drawerProps()} />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    const body = screen.getByRole("dialog").querySelector(".task-detail-drawer__body")!;
    expect(body).toHaveClass("task-detail-drawer__body--single");
    const sections = [...body.querySelectorAll(".task-detail-drawer__section")];
    expect(sections.map((section) => section.getAttribute("aria-label"))).toEqual(["Overview", "Checklist", "Evidence", "Activity"]);
    expect(screen.getByText("Checklist content")).toBeInTheDocument();
    expect(screen.getByText("Evidence content")).toBeInTheDocument();
    expect(screen.getByText("Activity content")).toBeInTheDocument();

    // The footer toggle reveals the tabbed layout with all four panels mounted.
    fireEvent.click(screen.getByRole("button", { name: "Tabs" }));
    expect(screen.getByRole("tablist", { name: "Task details" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Single scroll" }));
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByText("Checklist content")).toBeInTheDocument();
  });

  it("selects all four tabs and moves selection and focus with arrow keys", () => {
    renderDrawer({}, true);
    const tablist = screen.getByRole("tablist", { name: "Task details" });
    const overviewTab = within(tablist).getByRole("tab", { name: "Overview" });
    const checklistTab = within(tablist).getByRole("tab", { name: "Checklist" });
    const evidenceTab = within(tablist).getByRole("tab", { name: "Evidence" });
    const activityTab = within(tablist).getByRole("tab", { name: "Activity" });
    expect([overviewTab, checklistTab, evidenceTab, activityTab].map((tab) => tab.textContent)).toEqual([
      "Overview", "Checklist", "Evidence", "Activity",
    ]);

    fireEvent.keyDown(overviewTab, { key: "ArrowRight" });
    expect(checklistTab).toHaveAttribute("aria-selected", "true");
    expect(checklistTab).toHaveFocus();
    fireEvent.keyDown(checklistTab, { key: "ArrowRight" });
    expect(evidenceTab).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(evidenceTab, { key: "ArrowLeft" });
    expect(checklistTab).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(checklistTab, { key: "End" });
    expect(activityTab).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(activityTab, { key: "Home" });
    expect(overviewTab).toHaveAttribute("aria-selected", "true");
  });

  it("keeps hidden tab panels mounted so an in-progress form draft survives tab changes", () => {
    function DraftForm() {
      const [draft, setDraft] = useState("");
      return <label>Evidence note<input aria-label="Evidence note" value={draft} onChange={(event) => setDraft(event.target.value)} /></label>;
    }
    renderDrawer({ evidence: <DraftForm /> }, true);
    const evidenceTab = screen.getByRole("tab", { name: "Evidence" });
    fireEvent.click(evidenceTab);
    fireEvent.change(screen.getByRole("textbox", { name: "Evidence note" }), { target: { value: "Client upload pending" } });

    fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
    expect(screen.getByRole("tabpanel", { name: "Activity" })).toBeVisible();
    const evidencePanel = document.getElementById("task-detail-panel-evidence");
    expect(evidencePanel).not.toBeNull();
    expect(evidencePanel).toHaveAttribute("hidden");
    expect(evidencePanel?.querySelector("input")).toHaveValue("Client upload pending");
    fireEvent.click(evidenceTab);
    expect(screen.getByRole("textbox", { name: "Evidence note" })).toHaveValue("Client upload pending");
  });

  it("restores navigation focus after loading the next task and keeps the selected tab", async () => {
    function NavigationHarness() {
      const [taskId, setTaskId] = useState("TASK-42");
      const [loading, setLoading] = useState(false);
      return <>
        <button type="button" onClick={() => setLoading(false)}>Finish loading</button>
        <TaskDetailDrawer
          {...drawerProps({
            taskId,
            title: taskId === "TASK-42" ? "Prepare studio concept" : "Prepare elevations",
            loading,
            onNext: () => { setTaskId("TASK-43"); setLoading(true); },
          })}
          enabled
        />
      </>;
    }

    render(<NavigationHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Tabs" }));
    fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
    const nextButton = screen.getByRole("button", { name: "Next task" });
    nextButton.focus();
    fireEvent.click(nextButton);
    expect(screen.getByRole("heading", { name: "Loading task…" })).toBeInTheDocument();
    expect(nextButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Finish loading" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Prepare elevations" })).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Next task" })).toHaveFocus();
  });

  it("calls previous and next callbacks and disables navigation while busy or loading", () => {
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    const view = render(<TaskDetailDrawer {...drawerProps({ onPrevious, onNext })} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous task" }));
    fireEvent.click(screen.getByRole("button", { name: "Next task" }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();

    view.rerender(<TaskDetailDrawer {...drawerProps({ onPrevious, onNext, busy: true })} />);
    expect(screen.getByRole("button", { name: "Previous task" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next task" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Task actions" })).toBeDisabled();

    view.rerender(<TaskDetailDrawer {...drawerProps({ onPrevious, onNext, loading: true })} />);
    expect(screen.getByRole("heading", { name: "Loading task…" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous task" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Task actions" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Loading task details…");
  });

  it("shows supplied task metadata and the real checklist total without inventing evidence counts", () => {
    render(<TaskDetailDrawer {...drawerProps()} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("TASK-42 · Design task")).toBeInTheDocument();
    expect(within(dialog).getByText("Harbor House · Concept")).toBeInTheDocument();
    expect(within(dialog).getByText("High priority")).toBeInTheDocument();
    expect(within(dialog).getByText("In progress")).toBeInTheDocument();
    expect(within(dialog).getByText("Due 18 Oct")).toBeInTheDocument();
    expect(within(dialog).getByText("Waiting on client")).toBeInTheDocument();
    expect(within(dialog).getByRole("progressbar", { name: "Checklist completion" })).toHaveAttribute("aria-valuenow", "2");
    expect(within(dialog).getByRole("progressbar", { name: "Checklist completion" })).toHaveAttribute("aria-valuemax", "5");
    expect(within(dialog).getByText("2/5")).toBeInTheDocument();
    expect(within(dialog).queryByText(/Evidence received|outstanding|confirmed/)).not.toBeInTheDocument();
  });

  it("switches Task actions to Overview and focuses the existing command marker", async () => {
    renderDrawer({}, true);
    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    const marker = document.querySelector<HTMLElement>("[data-task-drawer-commands]");
    expect(marker).not.toBeNull();
    const scrollIntoView = vi.fn();
    Object.defineProperty(marker, "scrollIntoView", { configurable: true, value: scrollIntoView });

    fireEvent.click(screen.getByRole("button", { name: "Task actions" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true"));
    await waitFor(() => expect(marker).toHaveFocus());
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("treats the header badges as click-to-edit affordances that reveal and focus the matching Overview editor", async () => {
    const localRender = (overrides: Partial<TaskDetailDrawerProps> = {}) =>
      render(<TaskDetailDrawer {...drawerProps({ waitingLabel: "Waiting on client", ...overrides })} />);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0));

    // Status badge: scroll to Overview and focus the transition action.
    localRender({ overview: <><h4 data-task-drawer-commands tabIndex={-1}>Task actions</h4><div className="task-actions"><button type="button">Start task</button></div><dl className="task-facts"><div><dt>Priority</dt><dd>High</dd></div><div><dt>Target date</dt><dd>18 Oct 2026</dd></div></dl></> });
    const statusBadge = screen.getByRole("button", { name: /Status In progress/ });
    fireEvent.click(statusBadge);
    await waitFor(() => expect(screen.getByRole("button", { name: "Start task" })).toHaveFocus());
    cleanup();

    // Target badge: focus the target-date fact when no edit form is open.
    localRender({ overview: <><h4 data-task-drawer-commands tabIndex={-1}>Task actions</h4><div className="task-actions"><button type="button">Start task</button></div><dl className="task-facts"><div><dt>Priority</dt><dd>High</dd></div><div><dt>Target date</dt><dd>18 Oct 2026</dd></div></dl></> });
    const targetBadge = screen.getByRole("button", { name: /Due 18 Oct/ });
    fireEvent.click(targetBadge);
    await waitFor(() => expect(screen.getByText("18 Oct 2026")).toHaveFocus());
    cleanup();

    // Priority badge: reveal the Edit task form field when one is open.
    function OverviewWithEditForm() {
      return <form className="task-edit-form"><input aria-label="Task name" defaultValue="Prepare studio concept" /></form>;
    }
    localRender({ overview: <><h4 data-task-drawer-commands tabIndex={-1}>Task actions</h4><OverviewWithEditForm /></> });
    const priorityBadge = screen.getByRole("button", { name: /Priority High/ });
    fireEvent.click(priorityBadge);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Task name" })).toHaveFocus());
    cleanup();

    // Waiting badge: reveal the waiting details.
    function OverviewWithWaiting() {
      return <section className="task-waiting-details" aria-label="Waiting details"><input aria-label="Resume reason" defaultValue="" /></section>;
    }
    localRender({ overview: <><h4 data-task-drawer-commands tabIndex={-1}>Task actions</h4><OverviewWithWaiting /></> });
    const waitingBadge = screen.getByRole("button", { name: /Waiting on client/ });
    fireEvent.click(waitingBadge);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Resume reason" })).toHaveFocus());

    vi.unstubAllGlobals();
  });
});
