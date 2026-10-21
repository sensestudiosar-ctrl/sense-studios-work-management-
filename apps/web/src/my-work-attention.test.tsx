// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MyWorkAttention, MyWorkPhaseSummary } from "./my-work-attention.js";

function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
afterEach(() => { vi.unstubAllGlobals(); Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 }); });

describe("MyWorkAttention", () => {
  it("publishes separate source totals from the existing three reads and clears denied management totals", async () => {
    let denied = false;
    const onActionCounts = vi.fn();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes("kind=reassignment")
      ? denied ? response({}, 403) : response({ total: 5, items: [{ id: "m1", title: "Reassign", projectTitle: null, reason: "Exit" }] })
      : String(input).includes("kind=corrections") ? response({ total: 2, items: [{ id: "c1", title: "Correct", projectTitle: null, reason: "Correction" }] })
        : response({ total: 0, items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MyWorkAttention onActionCounts={onActionCounts} />);
    await waitFor(() => expect(onActionCounts).toHaveBeenLastCalledWith({ corrections: { status: "ready", total: 2 }, management: { status: "ready", total: 5 } }));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    denied = true;
    fireEvent.click(within(screen.getByRole("region", { name: "Management: employee-exit reassignment" })).getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(onActionCounts).toHaveBeenLastCalledWith({ corrections: { status: "ready", total: 2 }, management: { status: "denied" } }));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it("keeps the Owner's five reassignment holds expanded and linked", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("kind=reassignment")) return response({ total: 5, items: [{ id: "reassign-1", title: "Reassign site task", projectTitle: "Studio", reason: "Employee exit." }] });
      return response({ total: 0, items: [] });
    }));
    render(<MyWorkAttention prioritizeReassignment />);
    const summary = screen.getByText("Management", { selector: "summary span" });
    expect(summary.closest("details")).toHaveAttribute("open");
    expect(await screen.findByRole("link", { name: /Reassign site task/ })).toBeInTheDocument();
    expect(summary.closest("summary")).toHaveTextContent("5 items");
    fireEvent.click(summary);
    await waitFor(() => expect(summary.closest("details")).not.toHaveAttribute("open"));
  });

  it("keeps positive sources visible, hides their independent confirmed zeros, and paginates exact totals", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      if (url.includes("reviews/inbox")) return response({ total: 1, items: [{ roundId: "round/1", taskId: "task 1", taskTitle: "Review concept", projectId: "p1", projectTitle: "Studio", roundNumber: 2, status: "IN_REVIEW", revisionLabel: "R2" }] });
      if (url.includes("kind=corrections")) return url.includes("offset=50") ? response({ total: 51, items: [{ id: "correction-51", title: "Correction 51", projectTitle: "Studio", reason: "Assigned correction." }] }) : response({ total: 51, items: Array.from({ length: 50 }, (_, index) => ({ id: `correction-${index + 1}`, title: `Correction ${index + 1}`, projectTitle: "Studio", reason: "Assigned correction." })) });
      if (url.includes("kind=reassignment")) return response({ total: 0, items: [] });
      return response({}, 404);
    }));
    render(<MyWorkAttention />);
    expect(await screen.findByText("1 item", { selector: "summary strong" })).toBeInTheDocument();
    expect(await screen.findByText("51 items", { selector: "summary strong" })).toBeInTheDocument();
    expect(screen.queryByText("Management", { selector: "summary span" })).not.toBeInTheDocument();
    const reviewSection = await screen.findByRole("region", { name: "Reviews awaiting you" });
    const corrections = await screen.findByRole("region", { name: "Your correction tasks" });
    expect(await within(reviewSection).findByRole("link", { name: /Review concept/ })).toHaveAttribute("href", "/reviews?taskId=task%201&roundId=round%2F1");
    expect(screen.queryByRole("region", { name: "Management: employee-exit reassignment" })).not.toBeInTheDocument();
    expect(within(corrections).getByText("Showing 1–50 of 51 · Page 1 of 2")).toBeInTheDocument();
    fireEvent.click(within(corrections).getByRole("button", { name: "Next" }));
    expect(await within(corrections).findByRole("link", { name: /Correction 51/ })).toHaveAttribute("href", "/tasks?taskId=correction-51");
    expect(within(corrections).getByText("Showing 51–51 of 51 · Page 2 of 2")).toBeInTheDocument();
    expect(calls.some((url) => url.endsWith("offset=50&limit=50"))).toBe(true);
    expect(calls.every((url) => url.includes("credentials") === false)).toBe(true);
  });

  it("keeps failed and denied sources visible while hiding an unrelated confirmed zero", async () => {
    let failReview = true;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("reviews/inbox")) return failReview ? response({ message: "Review source unavailable." }, 503) : response({ total: 0, items: [] });
      if (url.includes("kind=corrections")) return response({ total: 1, items: [{ id: "c-1", title: "Fix drawing", projectTitle: null, reason: "Assigned to you." }] });
      return response({ total: 0, items: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MyWorkAttention />);
    const reviews = await screen.findByRole("region", { name: "Reviews awaiting you" });
    const corrections = await screen.findByRole("region", { name: "Your correction tasks" });
    expect(await within(reviews).findByRole("alert")).toHaveTextContent("Review source unavailable.");
    expect(await within(corrections).findByRole("link", { name: /Fix drawing/ })).toBeInTheDocument();
    failReview = false;
    fireEvent.click(within(reviews).getByRole("button", { name: "Retry reviews awaiting you" }));
    await waitFor(() => expect(document.querySelector('.my-work-attention [data-work-source="reviews"]')).toBeNull());
    expect(screen.queryByText("Review source unavailable.")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("keeps all sources mounted and removes confirmed-empty panels from the initial view", async () => {
    const fetchMock = vi.fn(async () => response({ total: 0, items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<MyWorkAttention />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(document.querySelectorAll(".my-work-attention__disclosure")).toHaveLength(0));
    expect(screen.queryByText(/Reviews 0|Corrections 0|Management 0/)).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing in this list right now.")).not.toBeInTheDocument();
  });

  it("clears the session on 401 but treats 403 as a source-local permission error", async () => {
    const onSessionExpired = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("reviews/inbox")) return response({ message: "Sign in again." }, 401);
      if (url.includes("kind=corrections")) return response({ message: "Not permitted." }, 403);
      return response({ total: 0, items: [] });
    }));
    render(<MyWorkAttention onSessionExpired={onSessionExpired} />);
    const reviews = await screen.findByRole("region", { name: "Reviews awaiting you" });
    const corrections = await screen.findByRole("region", { name: "Your correction tasks" });
    expect(await within(reviews).findByRole("alert")).toHaveTextContent("Sign in again.");
    expect(await within(corrections).findByRole("alert")).toHaveTextContent("Not permitted.");
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
  });

  it("marks same-page review data stale after refresh failure, retries locally, and clears it on denial", async () => {
    let mode: "ready" | "failed" | "denied" = "ready";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("reviews/inbox")) {
        if (mode === "failed") return response({ message: "Review refresh failed." }, 503);
        if (mode === "denied") return response({ message: "Access changed." }, 403);
        return response({ total: 1, items: [{ roundId: "round-1", taskId: "task-1", taskTitle: "Review this", projectId: "p1", projectTitle: "Studio", roundNumber: 1, status: "IN_REVIEW" }] });
      }
      return response({ total: 0, items: [] });
    }));
    render(<MyWorkAttention />);
    const reviews = await screen.findByRole("region", { name: "Reviews awaiting you" });
    expect(await within(reviews).findByRole("link", { name: /Review this/ })).toBeInTheDocument();
    mode = "failed";
    fireEvent.click(within(reviews).getByRole("button", { name: "Refresh" }));
    expect(await within(reviews).findByText(/Stale · last successfully refreshed/)).toBeInTheDocument();
    expect(within(reviews).getByRole("link", { name: /Review this/ })).toBeInTheDocument();
    expect(screen.getByText("Stale · 1 items", { selector: "summary strong" })).toBeInTheDocument();
    mode = "ready";
    fireEvent.click(within(reviews).getByRole("button", { name: "Retry reviews awaiting you" }));
    await waitFor(() => expect(screen.getByText("1 item", { selector: "summary strong" })).toBeInTheDocument());
    mode = "denied";
    fireEvent.click(within(reviews).getByRole("button", { name: "Refresh" }));
    expect(await within(reviews).findByRole("alert")).toHaveTextContent("Access changed.");
    expect(within(reviews).queryByRole("link", { name: /Review this/ })).not.toBeInTheDocument();
  });

  it("retains loading sources while their independent requests are pending", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    render(<MyWorkAttention />);
    await waitFor(() => expect(screen.getAllByText("Loading", { selector: "summary strong" })).toHaveLength(3));
    expect(document.querySelectorAll(".my-work-attention__disclosure")).toHaveLength(3);
  });

  it("opens an explicit Reviews modal with authoritative empty state and restores trigger focus", async () => {
    const fetchMock = vi.fn(async () => response({ total: 0, items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    function Harness(): React.JSX.Element {
      const [sourceRequest, setSourceRequest] = useState<{ source: "reviews"; version: number }>();
      return <><button type="button" onClick={() => setSourceRequest({ source: "reviews", version: (sourceRequest?.version ?? 0) + 1 })}>Reviews card</button><MyWorkAttention sourceRequest={sourceRequest} /></>;
    }
    render(<Harness />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(document.querySelectorAll(".my-work-attention__disclosure")).toHaveLength(0));
    const trigger = screen.getByRole("button", { name: "Reviews card" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Reviews awaiting you" });
    expect(await within(dialog).findByText("Nothing in this list right now.")).toBeInTheDocument();
    const mainAttention = document.querySelector<HTMLElement>(".my-work-attention");
    expect(mainAttention).not.toBeNull();
    expect(within(mainAttention!).queryByRole("region", { name: "Reviews awaiting you" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("opens Needs action with independent correction and management sources and project-only client navigation", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes("kind=corrections")
      ? response({ total: 0, items: [] })
      : String(input).includes("kind=reassignment")
        ? response({ total: 0, items: [] })
        : response({ total: 0, items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    function Harness(): React.JSX.Element {
      const [sourceRequest, setSourceRequest] = useState<{ source: "actions"; version: number }>();
      return <><button type="button" onClick={() => setSourceRequest({ source: "actions", version: (sourceRequest?.version ?? 0) + 1 })}>Needs action card</button><MyWorkAttention sourceRequest={sourceRequest} /></>;
    }
    render(<Harness />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(document.querySelectorAll(".my-work-attention__disclosure")).toHaveLength(0));
    fireEvent.click(screen.getByRole("button", { name: "Needs action card" }));
    const dialog = await screen.findByRole("dialog", { name: "Work needing attention" });
    expect(within(dialog).getByRole("link", { name: "Open decisions" })).toHaveAttribute("href", "/decisions");
    expect(within(dialog).getByRole("heading", { name: "Your correction tasks" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Management: employee-exit reassignment" })).toBeInTheDocument();
    expect(within(dialog).getAllByText("Nothing in this list right now.")).toHaveLength(2);
    expect(within(dialog).getByText("Client reviews are project context and have no personal count.")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Open project client reviews" })).toHaveAttribute("href", "/client-reviews");
    const mainAttention = document.querySelector<HTMLElement>(".my-work-attention");
    expect(mainAttention).not.toBeNull();
    expect(within(mainAttention!).queryByRole("region", { name: "Your correction tasks" })).not.toBeInTheDocument();
    expect(within(mainAttention!).queryByRole("region", { name: "Management: employee-exit reassignment" })).not.toBeInTheDocument();
  });

  it("automatically opens a positive correction source so actionable items stay visible", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input).includes("kind=corrections")
      ? response({ total: 1, items: [{ id: "c1", title: "Fix artwork", projectTitle: "Studio", reason: "Correction requested." }] })
      : response({ total: 0, items: [] })));
    render(<MyWorkAttention />);
    const correction = await screen.findByRole("link", { name: /Fix artwork/ });
    await waitFor(() => expect(correction.closest("details")).toHaveAttribute("open"));
    expect(screen.getByText("Corrections", { selector: "summary span" }).closest("summary")).toHaveTextContent("1 item");
  });
});

describe("MyWorkPhaseSummary", () => {
  it("marks only the selected phase as pressed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ total: 0, items: [] })));
    const onSelect = vi.fn();
    const { rerender } = render(<MyWorkPhaseSummary filters={{}} selectedPhase="" onSelect={onSelect} />);
    const waiting = await screen.findByRole("button", { name: "Waiting personal tasks: 0" });
    const completed = screen.getByRole("button", { name: "Completed personal tasks: 0" });
    expect(waiting).toHaveAttribute("aria-pressed", "false");
    expect(completed).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(waiting);
    expect(onSelect).toHaveBeenCalledWith("waiting");
    rerender(<MyWorkPhaseSummary filters={{}} selectedPhase="waiting" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "Waiting personal tasks: 0" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Completed personal tasks: 0" })).toHaveAttribute("aria-pressed", "false");
  });

  it("scrolls the focused last phase card into view only when the phase strip overflows", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ total: 0, items: [] })));
    const { container } = render(<MyWorkPhaseSummary filters={{}} selectedPhase="" onSelect={vi.fn()} />);
    const strip = container.querySelector<HTMLElement>(".my-work-phase-summary__grid");
    expect(strip).not.toBeNull();
    Object.defineProperties(strip!, {
      clientWidth: { configurable: true, value: 120 },
      scrollWidth: { configurable: true, writable: true, value: 600 }
    });
    const lastPhase = screen.getByRole("button", { name: /^Completed personal tasks:/ });
    const scrollIntoView = vi.fn();
    Object.defineProperty(lastPhase, "scrollIntoView", { configurable: true, value: scrollIntoView });

    fireEvent.focus(lastPhase);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });

    scrollIntoView.mockClear();
    Object.defineProperty(strip!, "scrollWidth", { configurable: true, writable: true, value: 100 });
    fireEvent.focus(lastPhase);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("uses four separate exact personal phase-total queries and preserves applied filters when selecting a drill-down", async () => {
    const calls: string[] = [];
    const onSelect = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      const query = new URL(url, "http://localhost").searchParams;
      const phase = query.get("phase") ?? "";
      return response({ total: phase === "waiting" ? 67 : 9, items: [{ id: `one-${phase}` }] });
    }));
    render(<MyWorkPhaseSummary filters={{ phase: "active", projectId: "project-1", ownerEmployeeId: "employee-2", q: "concept review", dateBasis: "committed", dateFrom: "2026-10-01", dateTo: "2026-10-31", sort: "title_asc" }} selectedPhase="" onSelect={onSelect} />);
    const active = await screen.findByRole("button", { name: "Active personal tasks: 9" });
    const waiting = await screen.findByRole("button", { name: "Waiting personal tasks: 67" });
    const review = await screen.findByRole("button", { name: "Personal tasks in review phase: 9" });
    const completed = await screen.findByRole("button", { name: "Completed personal tasks: 9" });
    expect(active.closest("article")).toHaveClass("my-work-phase-active");
    expect(waiting.closest("article")).toHaveClass("my-work-phase-waiting");
    expect(review.closest("article")).toHaveClass("my-work-phase-review");
    expect(completed.closest("article")).toHaveClass("my-work-phase-completed");
    expect(calls).toHaveLength(4);
    for (const url of calls) {
      const query = new URL(url, "http://localhost").searchParams;
      expect(new URL(url, "http://localhost").pathname).toBe("/api/v1/tasks");
      expect(query.get("scope")).toBe("personal");
      expect(query.get("offset")).toBe("0");
      expect(query.get("limit")).toBe("1");
      expect(query.get("projectId")).toBe("project-1");
      expect(query.get("ownerEmployeeId")).toBe("employee-2");
      expect(query.get("q")).toBe("concept review");
      expect(query.get("dateBasis")).toBe("committed");
      expect(query.get("dateFrom")).toBe("2026-10-01");
      expect(query.get("dateTo")).toBe("2026-10-31");
      expect(query.get("sort")).toBe("title_asc");
    }
    expect(calls.map((url) => new URL(url, "http://localhost").searchParams.get("phase")).sort()).toEqual(["active", "completed", "review", "waiting"]);
    fireEvent.click(waiting);
    expect(onSelect).toHaveBeenCalledWith("waiting");
    expect(active).toHaveAttribute("aria-pressed", "false");
    const aboutCounts = screen.getByText("About task counts", { selector: "summary" });
    fireEvent.click(aboutCounts);
    expect(screen.getByText(/Counts include tasks you own or where you are explicitly listed as a collaborator\./)).toBeInTheDocument();
    expect(screen.getByText(/Review includes approved and correction work; it does not include your reviewer inbox\./)).toBeInTheDocument();
  });

  it("keeps count sources independent, handles denial and 401 without displaying protected stale values, and retries only unavailable sources", async () => {
    const onSessionExpired = vi.fn();
    let failActive = true;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const phase = new URL(String(input), "http://localhost").searchParams.get("phase");
      if (phase === "active") return failActive ? response({ message: "Count service unavailable." }, 503) : response({ total: 0, items: [] });
      if (phase === "waiting") return response({ message: "Not authorized." }, 403);
      if (phase === "review") return response({ total: 12, items: [{ id: "one" }] });
      return response({ message: "Sign in again." }, 401);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MyWorkPhaseSummary filters={{}} selectedPhase="active" onSelect={vi.fn()} onSessionExpired={onSessionExpired} />);
    expect((await screen.findAllByRole("alert")).some((alert) => alert.textContent?.includes("Count service unavailable."))).toBe(true);
    expect(screen.getByRole("button", { name: "Waiting personal tasks: Not available" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Personal tasks in review phase: 12" })).toBeInTheDocument();
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Completed personal tasks: Unavailable" })).toBeInTheDocument();
    expect((await screen.findAllByRole("alert")).some((alert) => alert.textContent?.includes("Sign in again."))).toBe(true);
    await waitFor(() => expect(screen.getByText(/Active task count is unavailable/)).toBeInTheDocument());
    failActive = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry active count" }));
    expect(await screen.findByRole("button", { name: "Active personal tasks: 0" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Active · 0 personal tasks/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("ignores a delayed count response after applied filters change", async () => {
    let releaseOldActive: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const query = new URL(String(input), "http://localhost").searchParams;
      const phase = query.get("phase");
      const search = query.get("q");
      if (phase === "active" && search === "old") return new Promise<Response>((resolve) => { releaseOldActive = resolve; });
      return Promise.resolve(response({ total: search === "new" ? 0 : 3, items: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<MyWorkPhaseSummary filters={{ q: "old" }} selectedPhase="active" onSelect={vi.fn()} />);
    await screen.findByRole("button", { name: "Waiting personal tasks: 3" });
    view.rerender(<MyWorkPhaseSummary filters={{ q: "new" }} selectedPhase="active" onSelect={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Active personal tasks: 0" })).toBeInTheDocument();
    releaseOldActive?.(response({ total: 999, items: [] }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Active personal tasks: 0" })).toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Active · 0 personal tasks");
  });

  it("shows a timestamped same-filter stale count on refresh failure, retries, and clears the snapshot on denial", async () => {
    let mode: "ready" | "failed" | "denied" = "ready";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const phase = new URL(String(input), "http://localhost").searchParams.get("phase");
      if (phase !== "active") return response({ total: 0, items: [] });
      if (mode === "failed") return response({ message: "Count refresh failed." }, 503);
      if (mode === "denied") return response({ message: "Count access changed." }, 403);
      return response({ total: 8, items: [{ id: "sample" }] });
    }));
    const view = render(<MyWorkPhaseSummary filters={{ projectId: "p1" }} selectedPhase="active" onSelect={vi.fn()} refreshVersion={0} />);
    expect(await screen.findByRole("button", { name: "Active personal tasks: 8" })).toBeInTheDocument();
    mode = "failed";
    view.rerender(<MyWorkPhaseSummary filters={{ projectId: "p1" }} selectedPhase="active" onSelect={vi.fn()} refreshVersion={1} />);
    expect(await screen.findByRole("button", { name: "Active personal tasks: Stale count 8" })).toBeInTheDocument();
    await waitFor(() => expect(view.container.querySelector(".my-work-phase-summary__selection")).toHaveTextContent(/Active task count is a stale snapshot from/));
    expect(view.container.querySelector(".my-work-phase-summary__selection")).toHaveTextContent(/task list may have changed/);
    mode = "ready";
    fireEvent.click(screen.getByRole("button", { name: "Retry active count" }));
    expect(await screen.findByRole("button", { name: "Active personal tasks: 8" })).toBeInTheDocument();
    mode = "denied";
    view.rerender(<MyWorkPhaseSummary filters={{ projectId: "p1" }} selectedPhase="active" onSelect={vi.fn()} refreshVersion={2} />);
    expect(await screen.findByRole("button", { name: "Active personal tasks: Not available" })).toBeInTheDocument();
    await waitFor(() => expect(view.container.querySelector(".my-work-phase-summary__selection")).toHaveTextContent(/not available to this account/));
  });

});
