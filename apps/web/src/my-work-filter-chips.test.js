import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MyWorkFilterChips } from "./my-work-filter-chips.js";
const filters = [
    { key: "status", label: "Status", value: "In progress" },
    { key: "ownerEmployeeId", label: "Owner", value: "Asha Rao" }
];
describe("MyWorkFilterChips", () => {
    it("renders nothing when no filters are applied", () => {
        const { container } = render(_jsx(MyWorkFilterChips, { items: [], onRemove: vi.fn(), onClear: vi.fn() }));
        expect(container.firstChild).toBeNull();
    });
    it("removes only the selected filter when its accessible button is activated", () => {
        const onRemove = vi.fn();
        const onClear = vi.fn();
        render(_jsx(MyWorkFilterChips, { items: filters, onRemove: onRemove, onClear: onClear }));
        const group = screen.getByRole("region", { name: "Applied task filters" });
        expect(within(group).getByText("Status: In progress")).toBeTruthy();
        expect(within(group).getByText("Owner: Asha Rao")).toBeTruthy();
        fireEvent.click(within(group).getByRole("button", { name: "Remove Status filter" }));
        expect(onRemove).toHaveBeenCalledExactlyOnceWith("status");
        expect(onClear).not.toHaveBeenCalled();
    });
    it("calls clear all from its own semantic button", () => {
        const onClear = vi.fn();
        render(_jsx(MyWorkFilterChips, { items: filters, onRemove: vi.fn(), onClear: onClear }));
        fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
        expect(onClear).toHaveBeenCalledOnce();
    });
    it("keeps long values contained and exposes the full label in the title", () => {
        const value = "A very long applied filter value that should remain available in full while its chip truncates in a narrow viewport";
        render(_jsx(MyWorkFilterChips, { items: [{ key: "q", label: "Search", value }], onRemove: vi.fn(), onClear: vi.fn() }));
        const chip = screen.getByText(`Search: ${value}`).parentElement;
        expect(chip?.getAttribute("title")).toBe(`Search: ${value}`);
        expect(chip?.querySelector("button")?.getAttribute("aria-label")).toBe("Remove Search filter");
    });
    it("supports keyboard activation with real buttons", () => {
        const onRemove = vi.fn();
        const onClear = vi.fn();
        render(_jsx(MyWorkFilterChips, { items: [filters[0]], onRemove: onRemove, onClear: onClear }));
        const remove = screen.getByRole("button", { name: "Remove Status filter" });
        remove.focus();
        expect(document.activeElement).toBe(remove);
        fireEvent.keyDown(remove, { key: "Enter" });
        expect(remove.tagName).toBe("BUTTON");
        expect(remove.getAttribute("type")).toBe("button");
        expect(onRemove).not.toHaveBeenCalled();
        fireEvent.click(remove);
        expect(onRemove).toHaveBeenCalledWith("status");
    });
});
