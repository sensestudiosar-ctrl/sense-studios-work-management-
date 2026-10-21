import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyWorkTopCards, overdueTaskFilters, previousCalendarDay } from "./my-work-metrics.js";

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const filters = { status: "IN_PROGRESS", dateBasis: "committed", dateFrom: "2026-03-01", dateTo: "2026-03-31", phase: "active", scope: "team", sort: "title_asc" };
const siteProjectId = "11111111-1111-4111-8111-111111111111";
const siteRecordId = "22222222-2222-4222-8222-222222222222";
function siteRow(kind: string, id = siteRecordId, status = "OPEN") {
  return { id: `${kind}:${id}`, status, sourceRef: { type: "SITE_RECORD", projectId: siteProjectId, recordKind: kind, recordId: id } };
}
function sitePage(rows: unknown[] = [], unavailable?: string) {
  return { source: "site", readCompletedAt: "2026-10-21T06:00:00.000Z", sections: [{ key: `site:${siteProjectId}`, rows, ...(unavailable ? { unavailable } : {}) }] };
}
function renderCards(overrides: Partial<React.ComponentProps<typeof MyWorkTopCards>> = {}) {
  const props = { filters, selectedMetric: "", onSelect: vi.fn(), onOpenSources: vi.fn(), onOverdueCalendar: vi.fn(), onSessionExpired: vi.fn(), ...overrides };
  return { ...render(<MyWorkTopCards {...props} />), props };
}

beforeEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("MyWorkTopCards", () => {
  it("shows three Site cards and counts unique authorized snag records in all states without applying task filters", async () => {
    const fetchMock = vi.fn(async (url: string) => url.endsWith("/dashboard/sources/site") ? response(sitePage([
      siteRow("SNAG"), siteRow("SNAG"), siteRow("SNAG", "33333333-3333-4333-8333-333333333333", "CLOSED"), siteRow("PACKAGE"),
    ])) : url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({ total: 0, items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender, props } = renderCards({ sitePresentation: true, accountId: "account-a" });
    expect(await screen.findByRole("link", { name: "Site snags: 2" })).toHaveAttribute("href", "/site");
    expect(screen.getByText("All states across authorized sites. Task filters do not apply.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reviews:/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Waiting / blocked")).not.toBeInTheDocument();
    expect(screen.queryByText(/Uploads pending/)).not.toBeInTheDocument();
    rerender(<MyWorkTopCards {...props} filters={{ ...filters, q: "another task", projectId: "task-project-filter" }} />);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/dashboard/sources/site"))).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Site snags: 2" })).toBeInTheDocument();
    const request = fetchMock.mock.calls.find(([url]) => url.endsWith("/dashboard/sources/site"));
    expect(request?.[0]).toBe("/api/v1/dashboard/sources/site");
  });

  it.each(["pending", "denied", "failed", "malformed", "partial"])("keeps a %s Site source distinct from zero", async state => {
    vi.stubGlobal("fetch", vi.fn((url: string) => url.endsWith("/dashboard/sources/site") ? state === "pending" ? new Promise<Response>(() => undefined)
      : Promise.resolve(state === "denied" ? response({}, 403) : state === "failed" ? response({}, 503)
        : state === "malformed" ? response(sitePage([{ id: "unknown-record", sourceRef: { type: "SITE_RECORD", recordKind: "SNAG" } }]))
          : response(sitePage([], "Site source incomplete")))
      : Promise.resolve(url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({ total: 0, items: [] }))));
    renderCards({ sitePresentation: true, accountId: "account-a" });
    const expected = state === "pending" ? "Loading…" : state === "denied" ? "Not available" : "Unavailable";
    expect(await screen.findByLabelText(`Site snags: ${expected}`)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Site snags: 0" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Site snags:/ })).not.toBeInTheDocument();
  });

  it("ignores the former account's late Site response and clears a count when permission ends", async () => {
    let releaseOld: ((value: Response) => void) | undefined;
    let siteReads = 0;
    const fetchMock = vi.fn((url: string) => url.endsWith("/dashboard/sources/site") ? ++siteReads === 1 ? new Promise<Response>(resolve => { releaseOld = resolve; })
      : Promise.resolve(siteReads === 2 ? response(sitePage([siteRow("SNAG")])) : response({}, 403))
      : Promise.resolve(url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({ total: 0, items: [] })));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender, props } = renderCards({ sitePresentation: true, accountId: "account-a" });
    rerender(<MyWorkTopCards {...props} accountId="account-b" />);
    expect(await screen.findByRole("link", { name: "Site snags: 1" })).toBeInTheDocument();
    releaseOld?.(response(sitePage([siteRow("SNAG"), siteRow("SNAG", "33333333-3333-4333-8333-333333333333")])));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Site snags: 2" })).not.toBeInTheDocument());
    rerender(<MyWorkTopCards {...props} accountId="account-b" refreshVersion={1} />);
    expect(await screen.findByLabelText("Site snags: Not available")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Site snags:/ })).not.toBeInTheDocument();
  });

  it("labels a failed Site refresh stale and clears it when the session ends", async () => {
    let siteReads = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      void init;
      return url.endsWith("/dashboard/sources/site") ? ++siteReads === 1 ? response(sitePage([siteRow("SNAG")])) : response({}, 503)
        : url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({ total: 0, items: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { rerender, props } = renderCards({ sitePresentation: true, accountId: "account-a" });
    expect(await screen.findByRole("link", { name: "Site snags: 1" })).toBeInTheDocument();
    const initial = fetchMock.mock.calls.find(([url]) => url.endsWith("/dashboard/sources/site"));
    expect(initial?.[1]).toMatchObject({ credentials: "include", cache: "no-store" });
    rerender(<MyWorkTopCards {...props} refreshVersion={1} />);
    expect(await screen.findByRole("link", { name: "Site snags: 1 · Stale" })).toBeInTheDocument();
    expect(initial?.[1]?.signal?.aborted).toBe(true);
    fireEvent(window, new Event("sense-session-ended"));
    expect(screen.getByLabelText("Site snags: Unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Site snags:/ })).not.toBeInTheDocument();
  });

  it("reports an expired Site session without retaining a count", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/dashboard/sources/site") ? response({}, 401)
      : url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({ total: 0, items: [] })));
    const { props } = renderCards({ sitePresentation: true, accountId: "account-a" });
    expect(await screen.findByLabelText("Site snags: Unavailable")).toBeInTheDocument();
    expect(props.onSessionExpired).toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /^Site snags:/ })).not.toBeInTheDocument();
  });

  it("shows separate exact task, review and decision counts without inventing an aggregate", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({ total: 0, items: [] })));
    renderCards({ actionCounts: { corrections: { status: "loading" }, management: { status: "loading" }, actionableTasks: { status: "ready", total: 2 }, assignedReviews: { status: "ready", total: 3 }, decisions: { status: "ready", total: 5 } } });
    expect(screen.getByLabelText("Tasks: 2")).toHaveTextContent("2Tasks");
    expect(screen.getByLabelText("Reviews: 3")).toHaveTextContent("3Reviews");
    expect(screen.getByLabelText("Decisions: 5")).toHaveTextContent("5Decisions");
    expect(screen.queryByText("Open", { selector: "strong" })).not.toBeInTheDocument();
    expect(screen.queryByText("7", { selector: "strong" })).not.toBeInTheDocument();
  });

  it("labels uncertain action source states and never substitutes zero", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    const { props, rerender } = renderCards({ actionCounts: { corrections: { status: "loading" }, management: { status: "loading" }, actionableTasks: { status: "denied" }, assignedReviews: { status: "stale", total: 5 }, decisions: { status: "unavailable" } } });
    expect(screen.getByLabelText("Tasks: Not available")).toHaveTextContent("Not available");
    expect(screen.getByLabelText("Reviews: 5, stale")).toHaveTextContent("Stale");
    expect(screen.getByLabelText("Decisions: Unavailable")).toHaveTextContent("Unavailable");
    rerender(<MyWorkTopCards {...props} actionCounts={{ corrections: { status: "loading" }, management: { status: "loading" }, actionableTasks: { status: "unavailable" }, assignedReviews: { status: "loading" }, decisions: { status: "loading" } }} />);
    expect(screen.getByLabelText("Tasks: Unavailable")).toHaveTextContent("Unavailable");
    expect(screen.getByLabelText("Reviews: Loading")).toHaveTextContent("Loading");
    expect(screen.getByLabelText("Decisions: Loading")).toHaveTextContent("Loading");
  });
  it("keeps source counts separate while Reviews filters pending personal tasks", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({ total: 0, items: [] })));
    const { props, rerender } = renderCards();
    expect(screen.getByText("Needs action")).toBeInTheDocument();
    expect(screen.getByText("Separate exact source counts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reviews:/ })).toBeInTheDocument();
    expect(screen.getByText("Pending review / correction tasks")).toBeInTheDocument();
    expect(screen.getByText("Waiting / blocked")).toBeInTheDocument();
    expect(screen.getByText("Waiting tasks only")).toBeInTheDocument();
    expect(screen.queryByText(/Open\s*\+|total across/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Needs action/ }));
    fireEvent.click(screen.getByRole("button", { name: /Reviews/ }));
    expect(props.onOpenSources).toHaveBeenNthCalledWith(1, "actions");
    expect(props.onSelect).toHaveBeenCalledWith("reviews");
    rerender(<MyWorkTopCards {...props} selectedMetric="waiting" queueStale queueRefreshedAt={Date.parse("2026-10-12T06:00:00Z")} />);
    expect(screen.getByText(/The task list is a stale snapshot/)).toBeInTheDocument();
  });

  it("requests personal server totals with limit one and uses the organization day for overdue", async () => {
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      void options;
      return url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({ total: 47, items: [{ id: "only-loaded-row" }] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { props } = renderCards();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    const requests = fetchMock.mock.calls.map(call => new URL(String(call[0]), "http://localhost"));
    const reviewRequest = requests.find(url => url.pathname === "/api/v1/tasks" && url.searchParams.get("metric") === "reviews");
    expect(reviewRequest && Object.fromEntries(reviewRequest.searchParams)).toEqual({ scope: "personal", offset: "0", limit: "1", dateBasis: "committed", dateFrom: "2026-03-01", dateTo: "2026-03-31", status: "IN_PROGRESS", metric: "reviews" });
    const overdueRequest = requests.find(url => url.pathname === "/api/v1/tasks" && url.searchParams.get("phase") === "active");
    expect(overdueRequest && Object.fromEntries(overdueRequest.searchParams)).toEqual({ scope: "personal", offset: "0", limit: "1", dateBasis: "target", dateTo: "2026-03-31", status: "IN_PROGRESS", phase: "active" });
    const waitingRequest = requests.find(url => url.pathname === "/api/v1/tasks" && url.searchParams.get("phase") === "waiting");
    expect(waitingRequest && Object.fromEntries(waitingRequest.searchParams)).toEqual({ scope: "personal", offset: "0", limit: "1", dateBasis: "committed", dateFrom: "2026-03-01", dateTo: "2026-03-31", status: "IN_PROGRESS", phase: "waiting" });
    expect(await screen.findByRole("button", { name: /Reviews: 47/ })).toBeInTheDocument();
    expect(props.onOverdueCalendar).toHaveBeenLastCalledWith({ status: "ready", before: "2026-03-31" });
    expect(fetchMock.mock.calls.every(([, options]) => options?.cache === "no-store")).toBe(true);
  });

  it("selects the corresponding task metric and only the waiting phase", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({ total: 4, items: [] })));
    const { props } = renderCards();
    fireEvent.click(await screen.findByRole("button", { name: /Waiting \/ blocked: 4/ }));
    expect(props.onSelect).toHaveBeenCalledWith("waiting");
    fireEvent.click(await screen.findByRole("button", { name: /Overdue: 4/ }));
    expect(props.onSelect).toHaveBeenCalledWith("overdue");
  });

  it("calculates prior organization days across months and leap years and rejects invalid dates", () => {
    expect(previousCalendarDay("2026-04-01")).toBe("2026-03-31");
    expect(previousCalendarDay("2024-03-01")).toBe("2024-02-29");
    expect(() => previousCalendarDay("2026-02-30")).toThrow(/calendar/i);
    expect(() => previousCalendarDay("2026-2-01")).toThrow(/calendar/i);
  });

  it("pauses date filters in the overdue preset while preserving other applied filters", () => {
    expect(overdueTaskFilters(filters, "2026-03-31")).toEqual({ ...filters, phase: "active", dateBasis: "target", dateFrom: "", dateTo: "2026-03-31" });
    expect(filters).toEqual({ status: "IN_PROGRESS", dateBasis: "committed", dateFrom: "2026-03-01", dateTo: "2026-03-31", phase: "active", scope: "team", sort: "title_asc" });
  });

  it.each([401, 403])("does not display a zero count on authorization failure %s", async status => {
    const fetchMock = vi.fn(async (url: string) => url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : response({}, status));
    vi.stubGlobal("fetch", fetchMock);
    const { props } = renderCards();
    expect(await screen.findByRole("button", { name: /Waiting \/ blocked: Not available|Waiting \/ blocked: Unavailable/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Waiting \/ blocked: 0/ })).not.toBeInTheDocument();
    if (status === 401) expect(props.onSessionExpired).toHaveBeenCalled();
  });

  it("shows unavailable for an invalid organization calendar without issuing overdue task query", async () => {
    const fetchMock = vi.fn(async (url: string) => url.includes("dashboard/sources") ? response({ source: "tasks", today: "not-a-date" }) : response({ total: 0, items: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const { props } = renderCards();
    expect(await screen.findByRole("button", { name: /Overdue: Unavailable/ })).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(call => String(call[0])).some(url => url.includes("phase=active"))).toBe(false);
    expect(props.onOverdueCalendar).toHaveBeenLastCalledWith({ status: "unavailable" });
  });

  it("labels a failed same-context refresh stale, then clears the snapshot on permission denial", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("dashboard/sources")) return response({ source: "tasks", today: "2026-04-01" });
      if (url.includes("phase=waiting")) return response({ total: 8, items: [] });
      return response({ total: 2, items: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { rerender, props } = renderCards({ selectedMetric: "waiting", refreshVersion: 1 });
    expect(await screen.findByText("Waiting · 8 personal tasks")).toBeInTheDocument();
    fetchMock.mockImplementation(async (url: string) => url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : url.includes("phase=waiting") ? response({}, 503) : response({ total: 2, items: [] }));
    rerender(<MyWorkTopCards {...props} selectedMetric="waiting" refreshVersion={2} />);
    expect(await screen.findByText(/Waiting count is a stale snapshot/)).toBeInTheDocument();
    fetchMock.mockImplementation(async (url: string) => url.includes("dashboard/sources") ? response({ source: "tasks", today: "2026-04-01" }) : url.includes("phase=waiting") ? response({}, 403) : response({ total: 2, items: [] }));
    rerender(<MyWorkTopCards {...props} selectedMetric="waiting" refreshVersion={3} />);
    expect(await screen.findByRole("button", { name: /Waiting \/ blocked: Not available/ })).toBeInTheDocument();
    expect(screen.queryByText(/Waiting · 8 personal tasks/)).not.toBeInTheDocument();
  });

  it("ignores an older filter response after the current filter request completes", async () => {
    let releaseOld: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("dashboard/sources")) return Promise.resolve(response({ source: "tasks", today: "2026-04-01" }));
      if (url.includes("phase=waiting") && url.includes("status=old")) return new Promise<Response>(resolve => { releaseOld = resolve; });
      if (url.includes("phase=waiting")) return Promise.resolve(response({ total: 3, items: [] }));
      return Promise.resolve(response({ total: 1, items: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = renderCards({ filters: { status: "old" }, selectedMetric: "waiting" });
    rerender(<MyWorkTopCards filters={{ status: "new" }} selectedMetric="waiting" onSelect={vi.fn()} onOpenSources={vi.fn()} onOverdueCalendar={vi.fn()} />);
    expect(await screen.findByText("Waiting · 3 personal tasks")).toBeInTheDocument();
    releaseOld?.(response({ total: 99, items: [] }));
    await waitFor(() => expect(screen.queryByText("Waiting · 99 personal tasks")).not.toBeInTheDocument());
    expect(screen.getByText("Waiting · 3 personal tasks")).toBeInTheDocument();
  });
});
