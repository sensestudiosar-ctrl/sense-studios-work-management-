import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TurnkeyWorkspace } from "./turnkey.js";

afterEach(() => vi.unstubAllGlobals());
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const project = { id: "project-1", title: "Riverside Residence", status: "ACTIVE", branchName: "Mumbai" };
const candidate = { revisionId: "revision-1", drawingId: "drawing-1", label: "A-101 · R2", sha256: "a".repeat(64) };
const capabilities = { requestCost: false, decideCost: false, setMaterials: false, requestProcurement: false, decideProcurement: false, progress: false, shareCosts: false };
function detail(overrides: Record<string, unknown> = {}) {
  return {
    project: { id: project.id, title: project.title, status: project.status, version: 2 }, releases: [],
    capabilities: { create: true, costView: true, manage: true }, designCandidates: [candidate], eligibleApprovers: [], clients: [],
    ...overrides,
  };
}

describe("TurnkeyWorkspace", () => {
  it("creates a draft BOQ with exact selected revisions and sends the CSRF token", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/turnkey/projects") return response({ items: [project] });
      if (url === `/api/v1/turnkey/projects/${project.id}`) return response(detail());
      if (url.endsWith("/releases") && init?.method === "POST") return response({ id: "release-1", version: 1, state: "DRAFT" }, 201);
      return response({}, 404);
    }));
    render(<TurnkeyWorkspace csrfToken="csrf-turnkey" />);
    fireEvent.change(await screen.findByLabelText("Turnkey project"), { target: { value: project.id } });
    fireEvent.click(await screen.findByRole("checkbox", { name: /A-101 · R2/ }));
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Custom joinery" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "12.500" } });
    fireEvent.change(screen.getByLabelText("Unit", { selector: "input" }), { target: { value: "m" } });
    fireEvent.change(screen.getByLabelText("Unit price"), { target: { value: "1250.00" } });
    fireEvent.change(screen.getByLabelText("Currency"), { target: { value: "INR" } });
    fireEvent.change(screen.getByLabelText("BOQ draft reason"), { target: { value: "Approved design takeoff" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft BOQ" }));
    await waitFor(() => expect(calls.some(([url, init]) => url.endsWith("/releases") && init?.method === "POST")).toBe(true));
    const action = calls.find(([url, init]) => url.endsWith("/releases") && init?.method === "POST")?.[1];
    expect(action?.headers).toMatchObject({ "X-CSRF-Token": "csrf-turnkey" });
    expect(JSON.parse(String(action?.body))).toMatchObject({ revisionIds: [candidate.revisionId], currency: "INR", lines: [{ key: "line-1", description: "Custom joinery", quantity: "12.500", unit: "m" }], prices: [{ key: "line-1", unitPrice: "1250.00" }], reason: "Approved design takeoff" });
  });

  it("does not render or expose cost values when the server withholds cost view", async () => {
    const release = {
      id: "release-1", projectId: project.id, version: 3, state: "COST_APPROVED", currency: "INR", designs: [candidate],
      lines: [{ key: "boq-1", description: "Joinery", quantity: "4", unit: "m" }], materials: [], procurementStatus: "NOT_STARTED", factoryStatus: "NOT_STARTED",
      replacesReleaseId: null, replacedById: null, changeReason: null, createdAt: "2026-10-03T10:00:00Z", createdById: "requester",
      costApprovalId: "approval-1", procurementApprovalId: null, capabilities, costs: { prices: [{ key: "boq-1", unitPrice: "999999" }], total: "3999996" }, costShares: [], history: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => String(input) === "/api/v1/turnkey/projects" ? response({ items: [project] }) : response(detail({ releases: [release], capabilities: { create: false, costView: false, manage: false } }))));
    render(<TurnkeyWorkspace csrfToken="csrf" />);
    fireEvent.change(await screen.findByLabelText("Turnkey project"), { target: { value: project.id } });
    expect(await screen.findByText("Joinery")).toBeInTheDocument();
    expect(screen.queryByText("999999")).not.toBeInTheDocument();
    expect(screen.queryByText("3999996 INR")).not.toBeInTheDocument();
    expect(screen.queryByText(/Unit price/)).not.toBeInTheDocument();
  });

  it("shows a stale-version conflict and allows refresh", async () => {
    const approver = { accountId: "owner-1", label: "Owner", cost: true, procurement: true };
    const release = {
      id: "release-1", projectId: project.id, version: 1, state: "DRAFT", currency: "INR", designs: [candidate], lines: [], materials: [],
      procurementStatus: "NOT_STARTED", factoryStatus: "NOT_STARTED", replacesReleaseId: null, replacedById: null, changeReason: null,
      createdAt: "2026-10-03T10:00:00Z", createdById: "requester", costApprovalId: null, procurementApprovalId: null,
      capabilities: { ...capabilities, requestCost: true }, costShares: [], history: [],
    };
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push(url);
      if (url === "/api/v1/turnkey/projects") return response({ items: [project] });
      if (url === `/api/v1/turnkey/projects/${project.id}`) return response(detail({ releases: [release], eligibleApprovers: [approver] }));
      if (url.endsWith("/cost-request") && init?.method === "POST") return response({ message: "stale" }, 409);
      return response({}, 404);
    }));
    render(<TurnkeyWorkspace csrfToken="csrf" />);
    fireEvent.change(await screen.findByLabelText("Turnkey project"), { target: { value: project.id } });
    fireEvent.change(await screen.findByLabelText("Cost request reason"), { target: { value: "Requesting cost review" } });
    fireEvent.click(screen.getByRole("button", { name: "Send cost approval request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/release changed while you were working/i);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(calls.filter((url) => url === `/api/v1/turnkey/projects/${project.id}`).length).toBeGreaterThan(1));
  });

  it("shares costs only through the explicit client grant action with a reason and expected version", async () => {
    const release = {
      id: "release-1", projectId: project.id, version: 2, state: "COST_APPROVED", currency: "INR", designs: [candidate], lines: [], materials: [],
      procurementStatus: "NOT_STARTED", factoryStatus: "NOT_STARTED", replacesReleaseId: null, replacedById: null, changeReason: null,
      createdAt: "2026-10-03T10:00:00Z", createdById: "requester", costApprovalId: "approval-1", procurementApprovalId: null,
      capabilities: { ...capabilities, shareCosts: true }, costs: { prices: [], total: "0" }, costShares: [], history: [],
    };
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/turnkey/projects") return response({ items: [project] });
      if (url === `/api/v1/turnkey/projects/${project.id}`) return response(detail({ releases: [release], clients: [{ accountId: "client-1", label: "Client contact" }] }));
      if (url.endsWith("/cost-share") && init?.method === "POST") return response({ id: release.id, version: 3, state: "COST_APPROVED" });
      return response({}, 404);
    }));
    render(<TurnkeyWorkspace csrfToken="csrf" />);
    fireEvent.change(await screen.findByLabelText("Turnkey project"), { target: { value: project.id } });
    fireEvent.change(await screen.findByLabelText("Client"), { target: { value: "client-1" } });
    fireEvent.change(screen.getByLabelText("Cost sharing reason"), { target: { value: "Client approved estimate review" } });
    fireEvent.click(screen.getByRole("button", { name: "Share approved costs" }));
    await waitFor(() => expect(calls.some(([url, init]) => url.endsWith("/cost-share") && init?.method === "POST")).toBe(true));
    const call = calls.find(([url]) => url.endsWith("/cost-share"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ expectedVersion: 2, accountId: "client-1", view: true, reason: "Client approved estimate review" });
  });
});
