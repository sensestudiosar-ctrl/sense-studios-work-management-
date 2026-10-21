// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MyWorkQueuePreferences } from "./my-work-queue-preferences.js";
import type { QueuePreferenceMode } from "./my-work-queue-preferences.js";
import { loadMyWorkSavedViews } from "./my-work-saved-views.js";
import type { MyWorkSnapshot } from "./my-work-saved-views.js";

const accountId = "11111111-1111-4111-8111-111111111111";
const defaults: MyWorkSnapshot = { filters: { q: "", projectId: "", planItemId: "", ownerEmployeeId: "", status: "", phase: "active", dateBasis: "", dateFrom: "", dateTo: "", sort: "created_desc" }, view: "list", compact: false, temporaryPhase: "" };
const selected: MyWorkSnapshot = { ...defaults, filters: { ...defaults.filters, q: "concept", status: "WAITING", sort: "target_asc" }, view: "cards", temporaryPhase: "waiting" };
const apply = vi.fn();
const outerSubmit = vi.fn();
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
function Harness({ account = accountId, initial = selected }: { account?: string; initial?: MyWorkSnapshot }): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(initial);
  const [mode, setMode] = useState<QueuePreferenceMode>(null);
  return <form onSubmit={outerSubmit}><button type="button" onClick={() => setMode("customize")}>Customize</button><button type="button" onClick={() => setSnapshot(defaults)}>Change filters</button><MyWorkQueuePreferences accountId={account} snapshot={snapshot} defaults={defaults} mode={mode} onMode={setMode} onApply={value => { apply(value); setSnapshot(value); }} /></form>;
}
beforeEach(() => {
  window.localStorage.clear(); apply.mockClear(); outerSubmit.mockClear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
});
afterEach(() => {
  vi.restoreAllMocks();
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

describe("My Work queue preferences", () => {
  it("saves applied preferences and restores them without submitting task filters", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Save view" }));
    const dialog = screen.getByRole("dialog", { name: "Save view" });
    fireEvent.change(within(dialog).getByLabelText("View name"), { target: { value: "Concept waiting" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved “Concept waiting” in this browser.");
    const loaded = loadMyWorkSavedViews(accountId);
    expect(loaded.status).toBe("ready");
    if (loaded.status !== "ready") throw new Error("Expected saved preferences");
    expect(loaded.views[0]?.snapshot).toEqual(selected);
    const savedId = loaded.views[0]!.id;
    fireEvent.click(screen.getByRole("button", { name: "Change filters" }));
    expect(screen.getByLabelText("Saved view")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Saved view"), { target: { value: savedId } });
    expect(apply).toHaveBeenLastCalledWith(selected);
    fireEvent.change(screen.getByLabelText("Saved view"), { target: { value: "" } });
    expect(apply).toHaveBeenLastCalledWith(defaults);
    expect(outerSubmit).not.toHaveBeenCalled();
  });
  it("customizes existing modes and density and supports Cancel without changing preferences", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Customize" }));
    const dialog = screen.getByRole("dialog", { name: "Customize My Work" });
    fireEvent.change(within(dialog).getByLabelText("Display"), { target: { value: "board" } });
    fireEvent.change(within(dialog).getByLabelText("Row density"), { target: { value: "compact" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    expect(apply).toHaveBeenLastCalledWith({ ...selected, view: "board", compact: true });
    expect(outerSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Customize" }));
    fireEvent.change(screen.getByLabelText("Display"), { target: { value: "timeline" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(loadMyWorkSavedViews(accountId)).toEqual({ status: "ready", views: [] });
  });
  it("does not expose another account's saved views or overwrite corrupt preferences", () => {
    const key = `sense:my-work:personal:saved-views:v1:${accountId}`;
    window.localStorage.setItem(key, "invalid");
    const { rerender } = render(<Harness />);
    expect(screen.getByRole("button", { name: "Save view" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("unsupported format");
    expect(window.localStorage.getItem(key)).toBe("invalid");
    rerender(<Harness account="22222222-2222-4222-8222-222222222222" />);
    expect(screen.getByRole("button", { name: "Save view" })).toBeEnabled();
    expect(screen.queryByRole("option", { name: "Concept waiting" })).not.toBeInTheDocument();
  });
});
