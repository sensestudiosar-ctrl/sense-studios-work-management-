import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { useState } from "react";
import { TaskComposerFields, taskCreateBody, taskDraftError, type TaskComposerDraft } from "./task-composer-fields.js";
const draft: TaskComposerDraft = { title: "Prepare layout", type: "PROJECT", projectId: "project", priority: "HIGH", targetDate: "2026-10-16", description: "", ownerId: "owner", startDate: "", estimatedHours: "", collaboratorIds: [], collaboratorHours: {}, planItemId: "", tagsText: "", checklistText: "", reason: "Prepare the approved project work", assignTo: true, reviewRequirement: "INTERNAL" };
describe("shared task composer validation and fields", () => {
  it.each([
    { title: "x" }, { targetDate: "2026-99-99" }, { targetDate: "2026-02-30" }, { description: "x".repeat(2001) },
    { startDate: "2026-10-17" }, { estimatedHours: "-1" }, { estimatedHours: "100001" },
    { tagsText: "Same, Same" }, { tagsText: "x".repeat(31) }, { checklistText: "x".repeat(121) },
    { checklistText: Array.from({ length: 11 }, () => "Item").join("\n") }, { reason: "x" }, { projectId: "" },
    { collaboratorIds: ["person"], collaboratorHours: { person: "NaN" } },
  ])("rejects invalid field input without mutating its draft: %j", patch => {
    const value = { ...draft, ...patch }; const before = JSON.stringify(value);
    expect(taskDraftError(value)).toEqual(expect.any(String)); expect(JSON.stringify(value)).toBe(before);
  });
  it("builds one supported payload with independent owner, collaborators, checklist and review requirement", () => {
    const value = { ...draft, collaboratorIds: ["helper"], collaboratorHours: { helper: "1.5" }, tagsText: "Layout", checklistText: "[x] Confirm brief\n[ ] Check dimensions", estimatedHours: "0" };
    expect(taskDraftError(value)).toBeUndefined();
    const body = taskCreateBody(value, { actorEmployeeId: null, project: null, canAssign: true, canCreate: true, owners: [], collaborators: [], readAt: "" });
    expect(body).toMatchObject({ ownerEmployeeId: "owner", collaborators: [{ employeeId: "helper", estimatedHours: 1.5 }], estimatedHours: 0, reviewRequirement: "INTERNAL", checklist: [{ label: "Confirm brief", checked: true }, { label: "Check dimensions", checked: false }] });
    expect(body).not.toHaveProperty("committedDueDate"); expect(body).not.toHaveProperty("status");
  });
  it("clears incompatible participants/planning when the project context changes", () => {
    const onChange = vi.fn();
    render(<TaskComposerFields draft={draft} onChange={onChange} projects={[{ id: "project", title: "Studio", status: "ACTIVE" }]} planItems={[]} options={undefined} optionsError={undefined} retryOptions={() => undefined} compact={false} busy={false} />);
    fireEvent.change(screen.getByLabelText("Project"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ projectId: "", ownerId: "", collaboratorIds: [], planItemId: "", type: "NON_PROJECT", reviewRequirement: "NONE" }));
  });
  it("uses self ownership when the current context denies assignment despite a previous assignment draft", () => {
    render(<TaskComposerFields draft={draft} onChange={() => undefined} projects={[]} planItems={[]} options={{ actorEmployeeId: "self", project: null, canAssign: false, canCreate: true, owners: [{ id: "self", name: "Self", homeBranchId: "branch" }], collaborators: [], readAt: "" }} optionsError={undefined} retryOptions={() => undefined} compact={false} busy={false} />);
    expect(screen.getByText("Assigned to you.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Primary owner")).not.toBeInTheDocument();
  });
  it("offers authorized staff a clear way to choose another owner and explains review appointment", () => {
    const onChange = vi.fn();
    render(<TaskComposerFields draft={{ ...draft, assignTo: false }} onChange={onChange} projects={[]} planItems={[]} options={{ actorEmployeeId: "self", project: null, canAssign: true, canCreate: true, owners: [{ id: "self", name: "Self", homeBranchId: "branch" }, { id: "owner", name: "Owner", homeBranchId: "branch" }], collaborators: [], readAt: "" }} optionsError={undefined} retryOptions={() => undefined} compact={false} busy={false} />);
    fireEvent.click(screen.getByLabelText("Assign to another person"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ assignTo: true }));
    expect(screen.getByText(/appoints an independent reviewer/)).toBeInTheDocument();
  });
  it("hides optional planning and collaborator sections for compact (non-owner) variants", () => {
    const props = { onChange: () => undefined, projects: [{ id: "project", title: "Studio", status: "ACTIVE" as const }], planItems: [{ id: "stage", projectId: "project", kind: "STAGE", label: "Design" }], options: { actorEmployeeId: null, project: null, canAssign: true, canCreate: true, owners: [{ id: "owner", name: "Owner", homeBranchId: "branch" }], collaborators: [{ id: "helper", name: "Helper", homeBranchId: "branch" }], readAt: "" }, optionsError: undefined, retryOptions: () => undefined, busy: false };
    const view = render(<TaskComposerFields draft={draft} compact={false} {...props} />);
    // Open the "More task settings" accordion first so the collaborator section becomes visible.
    fireEvent.click(screen.getByRole("button", { name: /More task settings/ }));
    expect(screen.getByText("Optional planning", { selector: "summary" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Collaborators (optional)" })).toBeInTheDocument();
    view.rerender(<TaskComposerFields draft={draft} compact={true} {...props} />);
    expect(screen.queryByText("Optional planning", { selector: "summary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Collaborators (optional)" })).not.toBeInTheDocument();
  });
  it("requires internal approval when client review is selected and normalizes recovered CLIENT drafts", () => {
    const onChange = vi.fn();
    const props = { onChange, projects: [], planItems: [], options: undefined, optionsError: undefined, retryOptions: () => undefined, compact: false, busy: false };
    const view = render(<TaskComposerFields {...props} draft={draft} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Client review required" }));
    expect(onChange).toHaveBeenCalledWith({ reviewRequirement: "BOTH" });
    view.rerender(<TaskComposerFields {...props} draft={{ ...draft, reviewRequirement: "BOTH" }} />);
    expect(screen.getByRole("checkbox", { name: "Internal review required" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Internal review required" })).toBeDisabled();
    expect(taskCreateBody({ ...draft, reviewRequirement: "CLIENT" }, { canAssign: false, actorEmployeeId: "owner" } as never).reviewRequirement).toBe("BOTH");
  });

  it("moves the single priority selection with click, arrows, Home and End without submitting", () => {
    function Composer() {
      const [value, setValue] = useState(draft);
      return <TaskComposerFields draft={value} onChange={patch => setValue(current => ({ ...current, ...patch }))} projects={[]} planItems={[]} options={undefined} optionsError={undefined} retryOptions={() => undefined} compact={false} busy={false} />;
    }
    render(<Composer />);
    const group = screen.getByRole("radiogroup", { name: "Priority" });
    expect(screen.getByRole("radio", { name: "High" })).toHaveAttribute("tabindex", "0");
    fireEvent.click(screen.getByRole("radio", { name: "Low" }));
    expect(group).toHaveStyle({ "--priority-index": "0" });
    fireEvent.keyDown(screen.getByRole("radio", { name: "Low" }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "Critical" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Critical" })).toHaveAttribute("aria-checked", "true");
    expect(group).toHaveClass("tone-critical");
    expect(group).toHaveStyle({ "--priority-index": "3" });
    fireEvent.keyDown(group, { key: "Home" });
    expect(screen.getByRole("radio", { name: "Low" })).toHaveFocus();
    fireEvent.keyDown(group, { key: "End" });
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Low" })).toHaveAttribute("aria-checked", "true");
    expect(group.querySelectorAll(".task-priority-segmented__selection")).toHaveLength(1);
    expect([...group.querySelectorAll<HTMLButtonElement>('[role="radio"]')].filter(radio => radio.tabIndex === 0)).toHaveLength(1);
  });

  it("keeps native date values, constraints, clear behavior and errors behind the date controls", () => {
    const onChange = vi.fn();
    render(<TaskComposerFields draft={{ ...draft, startDate: "2026-10-15" }} onChange={onChange} projects={[]} planItems={[]} options={undefined} optionsError={undefined} retryOptions={() => undefined} compact={false} busy={false} />);
    const target = screen.getByLabelText("Target date");
    const start = screen.getByLabelText("Start date");
    const showPicker = vi.fn();
    Object.defineProperty(target, "showPicker", { configurable: true, value: showPicker });
    fireEvent.click(target);
    expect(showPicker).toHaveBeenCalledTimes(1);
    expect(target).toHaveAttribute("type", "date");
    expect(target).toBeRequired();
    expect(target).toHaveValue("2026-10-16");
    expect(target).toHaveAttribute("title", "Target date: 16/10/2026");
    expect(start).not.toBeRequired();
    fireEvent.change(start, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ startDate: "" });
    fireEvent.change(target, { target: { value: "2026-11-06" } });
    expect(onChange).toHaveBeenCalledWith({ targetDate: "2026-11-06" });
  });

  it("replaces empty calendar icons with selected dates and restores them when cleared", () => {
    function Composer() {
      const [value, setValue] = useState({ ...draft, targetDate: "", startDate: "" });
      return <TaskComposerFields draft={value} onChange={patch => setValue(current => ({ ...current, ...patch }))} projects={[]} planItems={[]} options={undefined} optionsError={undefined} retryOptions={() => undefined} compact={false} busy={false} />;
    }
    render(<Composer />);
    for (const name of ["Target date", "Start date"]) {
      const input = screen.getByLabelText(name), control = input.parentElement!;
      expect(control.querySelector("svg")).not.toBeNull();
      expect(control.querySelector(".task-calendar-value")).toBeNull();
      fireEvent.change(input, { target: { value: "2026-11-06" } });
      expect(control.querySelector(".task-calendar-value")).toHaveTextContent("06/11/2026");
      expect(control.querySelector("svg")).toBeNull();
      fireEvent.change(input, { target: { value: "" } });
      expect(control.querySelector("svg")).not.toBeNull();
      expect(control.querySelector(".task-calendar-value")).toBeNull();
    }
    expect(screen.getByPlaceholderText("Task Name")).toBeRequired();
    expect(screen.getByPlaceholderText("Add description...")).not.toBeRequired();
    expect(screen.queryByText("· optional")).not.toBeInTheDocument();
  });

});
