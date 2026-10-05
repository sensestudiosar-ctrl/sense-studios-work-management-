import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SiteWorkspace } from "./site.js";

afterEach(() => vi.unstubAllGlobals());
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const project = { id: "project-1", title: "Riverside Residence", status: "ACTIVE", branchName: "Mumbai" };
const site = (overrides: Record<string, unknown> = {}) => ({
  project: { id: project.id, title: project.title, status: "ACTIVE" }, version: 7, today: "2026-10-03", tomorrow: "2026-10-04",
  responsible: { accountId: "responsible-1", label: "Site Lead" }, people: [{ accountId: "fixer-1", label: "Mason One", canWork: true }, { accountId: "verifier-1", label: "Engineer Two", canWork: true }],
  capabilities: { manage: true, work: true, confirm: true, handover: true }, packages: [], manpower: [], reports: [], snags: [], handovers: [], history: [], materials: [], workforce: { attendance: [], count: 0 }, ...overrides,
});

describe("SiteWorkspace draft contract", () => {
  it("loads a no-store aggregate and authorized document metadata for image evidence", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/site/projects") return response({ items: [project] });
      if (url === `/api/v1/site/projects/${project.id}`) return response(site());
      if (url === `/api/v1/documents/projects/${project.id}`) return response({ files: [{ id: "doc-1", fileName: "slab.jpg", mimeType: "image/jpeg", sha256: "a".repeat(64) }] });
      return response({}, 404);
    }));
    render(<SiteWorkspace csrfToken="csrf-site" accountId="account-1"/>);
    fireEvent.change(await screen.findByLabelText("Active Turnkey project"), { target: { value: project.id } });
    expect(await screen.findByRole("heading", { name: "Riverside Residence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today’s work" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tomorrow’s plan" })).toBeInTheDocument();
    expect(calls).toContainEqual([`/api/v1/documents/projects/${project.id}`, expect.objectContaining({ cache: "no-store", credentials: "include" })]);
    expect((await screen.findAllByRole("checkbox", { name: /slab.jpg/ })).length).toBeGreaterThan(0);
  });

  it("creates a report draft with all R-069 fields, aggregate expectedVersion, reason, selected photo IDs and CSRF", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/site/projects") return response({ items: [project] });
      if (url === `/api/v1/site/projects/${project.id}`) return response(site());
      if (url === `/api/v1/documents/projects/${project.id}`) return response({ files: [{ id: "doc-1", fileName: "slab.jpg", mimeType: "image/jpeg", sha256: "a".repeat(64) }] });
      if (url.endsWith("/reports") && init?.method === "POST") return response({ id: "report-1" }, 201);
      return response({}, 404);
    }));
    render(<SiteWorkspace csrfToken="csrf-site" accountId="account-1"/>);
    fireEvent.change(await screen.findByLabelText("Active Turnkey project"), { target: { value: project.id } });
    fireEvent.change(await screen.findByLabelText("Reason for the next site action"), { target: { value: "Daily work recorded by site" } });
    fireEvent.change(screen.getByLabelText("Work completed today"), { target: { value: "Completed slab preparation" } });
    fireEvent.change(screen.getByLabelText("Manpower trade"), { target: { value: "Masonry" } });
    fireEvent.change(screen.getByLabelText("People reported for trade"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Materials received"), { target: { value: "Cement bags" } });
    fireEvent.change(screen.getByLabelText("Issues"), { target: { value: "None" } });
    fireEvent.change(screen.getByLabelText("Delay causes"), { target: { value: "Rain until 10:00" } });
    fireEvent.change(within(screen.getByRole("heading", { name: "Daily reports" }).closest("section")!).getByLabelText("Plan for tomorrow"), { target: { value: "Begin curing" } });
    fireEvent.click(await within(screen.getByRole("heading", { name: "Daily reports" }).closest("section")!).findByRole("checkbox", { name: /slab.jpg/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save report draft" }));
    await waitFor(() => expect(calls.some(([url, init]) => url.endsWith("/reports") && init?.method === "POST")).toBe(true));
    const [, init] = calls.find(([url, item]) => url.endsWith("/reports") && item?.method === "POST")!;
    expect(init?.headers).toMatchObject({ "X-CSRF-Token": "csrf-site" });
    expect(JSON.parse(String(init?.body))).toMatchObject({ date: "2026-10-03", workCompleted: "Completed slab preparation", manpower: [{ trade: "Masonry", count: 4 }], materialsReceived: "Cement bags", issues: "None", delayCauses: "Rain until 10:00", tomorrowPlan: "Begin curing", photoIds: ["doc-1"], expectedVersion: 7, reason: "Daily work recorded by site" });
  });

  it("does not replay a stale mutation and refreshes the aggregate after HTTP 409", async () => {
    let stale = true; let detailReads = 0; const writes: RequestInit[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v1/site/projects") return response({ items: [project] });
      if (url === `/api/v1/site/projects/${project.id}`) { detailReads++; return response(site({ version: detailReads > 1 ? 8 : 7 })); }
      if (url === `/api/v1/documents/projects/${project.id}`) return response({ files: [] });
      if (url.endsWith("/packages") && init?.method === "POST") { writes.push(init); if (stale) { stale = false; return response({}, 409); } return response({}); }
      return response({}, 404);
    }));
    render(<SiteWorkspace csrfToken="csrf-site" accountId="account-1"/>);
    fireEvent.change(await screen.findByLabelText("Active Turnkey project"), { target: { value: project.id } });
    fireEvent.change(await screen.findByLabelText("Reason for the next site action"), { target: { value: "Approved weekly plan" } });
    fireEvent.change(screen.getByLabelText("Package title"), { target: { value: "Pour north slab" } });
    fireEvent.change(screen.getByLabelText("Work date"), { target: { value: "2026-10-04" } });
    fireEvent.change(screen.getByLabelText("Planned progress (%)"), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Planned quantity"), { target: { value: "12.5" } });
    fireEvent.change(screen.getByLabelText("Quantity unit"), { target: { value: "m3" } });
    fireEvent.click(screen.getByRole("button", { name: "Create package" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/changed while you were working/i);
    await waitFor(() => expect(detailReads).toBeGreaterThan(1));
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String(writes[0]?.body))).toMatchObject({ expectedVersion: 7, reason: "Approved weekly plan" });
  });

  it("keeps management closure as a separate action from the verifier check", async () => {
    const writes: Array<[string, RequestInit | undefined]> = [];
    const snag = { id: "snag-1", version: 4, state: "VERIFIED", data: { title: "Uneven tile", description: "Tile edge needs correction", repairGeneration: 2, photoEvidence: [], latestVerificationId: "attempt-2" }, capabilities: { assign: false, start: false, ready: false, appointVerifier: false, verify: false, close: true }, attempts: [{ id: "attempt-2", outcome: "PASSED", repairGeneration: 2, fixerAccountId: "fixer-1", verifierAccountId: "verifier-1", note: "Repair passed", photoEvidence: [], occurredAt: "2026-10-03T10:00:00Z" }], history: [] };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v1/site/projects") return response({ items: [project] });
      if (url === `/api/v1/site/projects/${project.id}`) return response(site({ snags: [snag] }));
      if (url === `/api/v1/documents/projects/${project.id}`) return response({ files: [] });
      if (url.endsWith("/snags/snag-1/close") && init?.method === "POST") { writes.push([url, init]); return response({ id: "snag-1" }); }
      return response({}, 404);
    }));
    render(<SiteWorkspace csrfToken="csrf-site" accountId="account-1"/>);
    fireEvent.change(await screen.findByLabelText("Active Turnkey project"), { target: { value: project.id } });
    expect(await screen.findByRole("heading", { name: "Uneven tile" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record independent check" })).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText("Reason for the next site action"), { target: { value: "Close after passed current repair" } });
    fireEvent.click(screen.getByRole("button", { name: "Close verified snag" }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]?.[0]).toBe("/api/v1/site/snags/snag-1/close");
    expect(JSON.parse(String(writes[0]?.[1]?.body))).toMatchObject({ expectedVersion: 7, reason: "Close after passed current repair" });
  });

  it("allows a factual quality correction on a completed package without offering a second completion action", async () => {
    const writes: Array<[string, RequestInit | undefined]> = [];
    const completed = { id: "package-1", version: 3, state: "COMPLETED", data: { title: "Finished slab", date: "2026-10-02", tomorrowPlan: "Inspect curing", plannedPercent: "100", actualPercent: "100", plannedQuantity: "12.5", actualQuantity: "12.5", unit: "m3", qualityStatus: "PENDING", materialStatus: "Available", blockers: "None", critical: false, photoEvidence: [] } };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v1/site/projects") return response({ items: [project] });
      if (url === `/api/v1/site/projects/${project.id}`) return response(site({ packages: [completed] }));
      if (url === `/api/v1/documents/projects/${project.id}`) return response({ files: [] });
      if (url.endsWith("/packages/package-1/progress") && init?.method === "POST") { writes.push([url, init]); return response({ id: "package-1" }); }
      return response({}, 404);
    }));
    render(<SiteWorkspace csrfToken="csrf-site" accountId="account-1"/>);
    fireEvent.change(await screen.findByLabelText("Active Turnkey project"), { target: { value: project.id } });
    const packageCard = (await screen.findByRole("heading", { name: "Finished slab" })).closest("article")!;
    expect(within(packageCard).getByRole("button", { name: "Save progress" })).toBeInTheDocument();
    expect(within(packageCard).queryByRole("button", { name: "Decide package complete" })).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText("Reason for the next site action"), { target: { value: "Record the passing quality inspection" } });
    fireEvent.change(within(packageCard).getByLabelText("Quality status"), { target: { value: "PASSED" } });
    fireEvent.click(within(packageCard).getByRole("button", { name: "Save progress" }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(JSON.parse(String(writes[0]?.[1]?.body))).toMatchObject({ expectedVersion: 7, qualityStatus: "PASSED", reason: "Record the passing quality inspection" });
  });

  it("keeps a read-only site dashboard available when document evidence access is denied", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v1/site/projects") return response({ items: [project] });
      if (url === `/api/v1/site/projects/${project.id}`) return response(site({ capabilities: { manage: false, work: false, confirm: false, handover: false } }));
      if (url === `/api/v1/documents/projects/${project.id}`) return response({ message: "Forbidden" }, 403);
      return response({}, 404);
    }));
    render(<SiteWorkspace csrfToken="csrf-site" accountId="account-1"/>);
    fireEvent.change(await screen.findByLabelText("Active Turnkey project"), { target: { value: project.id } });
    expect(await screen.findByRole("heading", { name: "Riverside Residence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today’s work" })).toBeInTheDocument();
    expect(await screen.findByText(/photo selection is unavailable until document access is restored/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create package" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save report draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create snag" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
