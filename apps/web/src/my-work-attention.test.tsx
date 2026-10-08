// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MyWorkAttention } from "./my-work-attention.js";

function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
afterEach(() => vi.unstubAllGlobals());

describe("MyWorkAttention", () => {
  it("keeps three authorized sources independent and paginates exact totals with exact destination links", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      if (url.includes("reviews/inbox")) return response({ total: 1, items: [{ roundId: "round/1", taskId: "task 1", taskTitle: "Review concept", projectId: "p1", projectTitle: "Studio", roundNumber: 2, status: "IN_REVIEW", revisionLabel: "R2" }] });
      if (url.includes("kind=corrections")) return url.includes("offset=50") ? response({ total: 51, items: [{ id: "correction-51", title: "Correction 51", projectTitle: "Studio", reason: "Assigned correction." }] }) : response({ total: 51, items: Array.from({ length: 50 }, (_, index) => ({ id: `correction-${index + 1}`, title: `Correction ${index + 1}`, projectTitle: "Studio", reason: "Assigned correction." })) });
      if (url.includes("kind=reassignment")) return response({ total: 0, items: [] });
      return response({}, 404);
    }));
    render(<MyWorkAttention />);
    const reviewSection = screen.getByRole("region", { name: "Reviews awaiting you" });
    const corrections = screen.getByRole("region", { name: "Your correction tasks" });
    const reassignment = screen.getByRole("region", { name: "Management: employee-exit reassignment" });
    expect(await within(reviewSection).findByRole("link", { name: /Review concept/ })).toHaveAttribute("href", "/reviews?taskId=task%201&roundId=round%2F1");
    expect(await within(reassignment).findByText("Nothing in this list right now.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Work needing attention" })).getByText("Nothing in this list right now.")).toBeInTheDocument();
    expect(within(corrections).getByText("Showing 1–50 of 51 · Page 1 of 2")).toBeInTheDocument();
    fireEvent.click(within(corrections).getByRole("button", { name: "Next" }));
    expect(await within(corrections).findByRole("link", { name: /Correction 51/ })).toHaveAttribute("href", "/tasks?taskId=correction-51");
    expect(within(corrections).getByText("Showing 51–51 of 51 · Page 2 of 2")).toBeInTheDocument();
    expect(calls.some((url) => url.endsWith("offset=50&limit=50"))).toBe(true);
    expect(calls.every((url) => url.includes("credentials") === false)).toBe(true);
  });

  it("isolates errors and retries only the failed source", async () => {
    let failReview = true;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("reviews/inbox")) return failReview ? response({ message: "Review source unavailable." }, 503) : response({ total: 0, items: [] });
      if (url.includes("kind=corrections")) return response({ total: 1, items: [{ id: "c-1", title: "Fix drawing", projectTitle: null, reason: "Assigned to you." }] });
      return response({ total: 0, items: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<MyWorkAttention />);
    const reviews = screen.getByRole("region", { name: "Reviews awaiting you" });
    const corrections = screen.getByRole("region", { name: "Your correction tasks" });
    expect(await within(reviews).findByRole("alert")).toHaveTextContent("Review source unavailable.");
    expect(await within(corrections).findByRole("link", { name: /Fix drawing/ })).toBeInTheDocument();
    failReview = false;
    fireEvent.click(within(reviews).getByRole("button", { name: "Retry reviews awaiting you" }));
    await waitFor(() => expect(within(reviews).getByText("Nothing in this list right now.")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("uses scoped headings and empty wording without claiming an owner has a global up-to-date view", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ total: 0, items: [] })));
    render(<MyWorkAttention />);
    expect(await screen.findByRole("heading", { name: "Reviews awaiting you" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your correction tasks" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Management: employee-exit reassignment" })).toBeInTheDocument();
    expect(await screen.findAllByText("Nothing in this list right now.")).toHaveLength(3);
    expect(screen.queryByText(/all work|all reviews|up to date/i)).not.toBeInTheDocument();
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
    const reviews = screen.getByRole("region", { name: "Reviews awaiting you" });
    const corrections = screen.getByRole("region", { name: "Your correction tasks" });
    expect(await within(reviews).findByRole("alert")).toHaveTextContent("Sign in again.");
    expect(await within(corrections).findByRole("alert")).toHaveTextContent("Not permitted.");
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
  });
});
