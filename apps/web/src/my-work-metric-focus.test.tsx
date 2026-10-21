// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MyWorkMetricFocus } from "./my-work-metric-focus.js";

const base = { loading: false, stale: false, denied: false, onClear: vi.fn() };

describe("MyWorkMetricFocus", () => {
  it("shows a real zero total with singular/plural task wording", () => {
    const { rerender } = render(<MyWorkMetricFocus {...base} metric="overdue" total={0} />);
    expect(screen.getByText("0 tasks · Overdue")).toBeInTheDocument();
    rerender(<MyWorkMetricFocus {...base} metric="waiting" total={1} />);
    expect(screen.getByText("1 task · Waiting / blocked")).toBeInTheDocument();
  });

  it("keeps a fresh result compact without a refresh timestamp", () => {
    render(<MyWorkMetricFocus {...base} metric="active" total={4} refreshedAt={Date.UTC(2026, 9, 12)} />);
    expect(screen.getByText("4 tasks · Active")).toBeInTheDocument();
    expect(screen.queryByText(/Last refreshed/)).not.toBeInTheDocument();
  });

  it("uses the server total rather than inferring a total from current page rows", () => {
    const currentPageRows = [{ id: "one" }, { id: "two" }];
    render(<MyWorkMetricFocus {...base} metric="review" total={23} />);
    expect(currentPageRows).toHaveLength(2);
    expect(screen.getByText("23 tasks · Review phase")).toBeInTheDocument();
  });

  it.each([
    ["overdue", "Overdue"],
    ["waiting", "Waiting / blocked"],
    ["review", "Review phase"],
    ["active", "Active"],
    ["completed", "Completed"]
  ])("labels the %s card result", (metric, label) => {
    render(<MyWorkMetricFocus {...base} metric={metric!} total={4} />);
    expect(screen.getByText(`4 tasks · ${label}`)).toBeInTheDocument();
  });

  it("clears the selection through its accessible button", () => {
    const onClear = vi.fn();
    render(<MyWorkMetricFocus {...base} onClear={onClear} metric="overdue" total={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear work card selection" }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(screen.getByText("× Clear widget filter")).toBeInTheDocument();
  });

  it("returns null for unknown metrics", () => {
    const { container } = render(<MyWorkMetricFocus {...base} metric="needs-action" total={8} />);
    expect(container.firstChild).toBeNull();
  });

  it.each([
    [{ loading: true, stale: true }, "Loading overdue results…"],
    [{ denied: true, stale: true }, "Overdue results aren’t available with your current access."],
    [{ error: "Source unavailable", stale: false }, "Overdue results couldn’t be loaded."]
  ])("does not show an old total during loading, denial, or error", (state, expected) => {
    render(<MyWorkMetricFocus {...base} {...state} metric="overdue" total={18} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(screen.queryByText(/18 tasks/)).toBeNull();
    expect(screen.queryByText(/Last refreshed/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear work card selection" })).toBeEnabled();
  });

  it("marks stale counts and includes overdue cutoff and paused date range when supplied", () => {
    render(<MyWorkMetricFocus {...base} metric="overdue" total={7} stale refreshedAt={Date.UTC(2026, 9, 12)} overdueBefore="2026-10-12" dateRangePaused />);
    expect(screen.getByText("Showing last refreshed count: 7 tasks · Overdue")).toBeInTheDocument();
    expect(screen.getByText("Last refreshed 2026-10-12T00:00:00.000Z.")).toBeInTheDocument();
    expect(screen.getByText("Organization day cutoff: 2026-10-12")).toBeInTheDocument();
    expect(screen.getByText("Applied date range paused while this card filter is active.")).toBeInTheDocument();
  });

  it("does not invent a cutoff or a count when results and calendar are unavailable", () => {
    render(<MyWorkMetricFocus {...base} metric="overdue" total={undefined} />);
    expect(screen.getByText("Overdue results are not available yet.")).toBeInTheDocument();
    expect(screen.queryByText(/Organization day cutoff/)).toBeNull();
  });

  it("rejects inherited metric keys", () => {
    const { container } = render(<MyWorkMetricFocus {...base} metric="toString" total={1} />);
    expect(container.firstChild).toBeNull();
  });

  it.each([NaN, Infinity, -1, 1.5])("does not render an invalid count: %s", (total) => {
    render(<MyWorkMetricFocus {...base} metric="waiting" total={total} />);
    expect(screen.getByText("Waiting / blocked results are not available yet.")).toBeInTheDocument();
    expect(screen.queryByText(/tasks · Waiting/)).not.toBeInTheDocument();
  });

  it("keeps the last refreshed snapshot visible when refresh failed", () => {
    render(<MyWorkMetricFocus {...base} metric="review" total={6} stale error="Service unavailable" refreshedAt={Date.UTC(2026, 9, 12)} />);
    expect(screen.getByText("Showing last refreshed count: 6 tasks · Review phase. Latest refresh failed.")).toBeInTheDocument();
    expect(screen.getByText("Last refreshed 2026-10-12T00:00:00.000Z.")).toBeInTheDocument();
  });
});
