import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { ApprovalQueue } from "./approval-queue.js";

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const item = {
  id: "approval-1", typeKey: "test.policy", title: "Scope change", summary: "Update a project scope",
  subjectLabel: "Project North", reason: "Client requested a revised scope", requesterLabel: "owner@example.test",
  approvalLevel: "Branch owner", requestedAt: "2026-09-27T08:00:00.000Z", expiresAt: null
};

beforeEach(() => vi.restoreAllMocks());

describe("read-only approval queue", () => {
  it("shows pending state then the empty queue", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ items: [], nextCursor: null })));
    render(<ApprovalQueue />);
    expect(screen.getByText("Loading pending decisions…")).toBeInTheDocument();
    expect(await screen.findByText(/You’re all caught up/)).toBeInTheDocument();
  });

  it("keeps request evidence readable and offers no decision controls", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ items: [item], nextCursor: null })));
    render(<ApprovalQueue />);
    expect(await screen.findByRole("heading", { name: "Scope change" })).toBeInTheDocument();
    expect(screen.getByText(/Client requested a revised scope/)).toBeInTheDocument();
    expect(screen.getByText(/Requested by owner@example.test/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve|reject|decide/i })).not.toBeInTheDocument();
  });

  it("loads more with a cursor and de-duplicates overlapping rows", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ items: [item], nextCursor: "cursor value" }))
      .mockResolvedValueOnce(response({ items: [item, { ...item, id: "approval-2", title: "Another scope change" }], nextCursor: null }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ApprovalQueue />);
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("heading", { name: "Another scope change" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Scope change" })).toHaveLength(1);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/approvals/attention?limit=30&cursor=cursor%20value");
  });

  it("shows a retryable error without exposing server details", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ error: "database password leaked" }, 503))
      .mockResolvedValueOnce(response({ items: [], nextCursor: null }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ApprovalQueue />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load pending decisions/i);
    expect(screen.queryByText(/database password leaked/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/You’re all caught up/)).toBeInTheDocument();
  });

  it("renders a permission denial without showing any pending items", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({}, 403)));
    render(<ApprovalQueue />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/don’t have access to this decision queue/i);
    expect(screen.queryByText(/You’re all caught up/)).not.toBeInTheDocument();
  });
});
