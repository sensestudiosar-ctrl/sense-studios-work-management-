// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CrmWorkspace } from "./crm.js";

afterEach(() => vi.unstubAllGlobals());
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
describe("CRM workspace", () => {
  it("loads a branch, separates skipped stages from interactions, and posts reasoned stage changes with CSRF", async () => {
    const branch = { id: "branch-1", name: "Mumbai", capabilities: { view: true, create: true, edit: true, activityCreate: true, stageChange: true } };
    const lead = { id: "lead-1", title: "Studio launch", contactName: "Asha Rao", stage: "NEW", version: 3, createdAt: "2026-09-27T10:00:00Z", source: { name: "Referral" } };
    const detail = { lead, capabilities: branch.capabilities, stageChanges: [{ id: "hist-1", fromStage: "NEW", toStage: "PROPOSAL", skippedStages: ["CONTACTED", "MEETING_DISCUSSION"], reason: "Client requested a written offer", createdAt: "2026-09-27T11:00:00Z" }], activities: [{ id: "act-1", kind: "CALL", note: "Discussed scope", createdAt: "2026-09-27T11:10:00Z" }] };
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/crm/setup") return response({ branches: [branch], sources: [{ id: "src-1", name: "Referral", active: true, builtIn: true }] });
      if (url.startsWith("/api/v1/crm/leads?") ) return response({ items: [lead], total: 1 });
      if (url === "/api/v1/crm/clients?branchId=branch-1") return response({ items: [] });
      if (url === "/api/v1/crm/leads/lead-1/stage" && init?.method === "POST") return response({ lead: { ...lead, stage: "CONTACTED", version: 4 } });
      if (url === "/api/v1/crm/leads/lead-1") return response(detail);
      return response({}, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CrmWorkspace csrfToken="csrf-value" owner={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /Studio launch/ }));
    expect(await screen.findByText(/Skipped stages: Contacted, Meeting Discussion/)).toBeInTheDocument();
    expect(screen.getByText("Discussed scope")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New stage"), { target: { value: "CONTACTED" } });
    fireEvent.change(screen.getByLabelText("Reason for Lost, skipped or backward move"), { target: { value: "Confirmed the right point of contact" } });
    fireEvent.click(screen.getByRole("button", { name: "Save stage" }));
    await waitFor(() => expect(calls.some(([url, init]) => url === "/api/v1/crm/leads/lead-1/stage" && init?.method === "POST")).toBe(true));
    const mutation = calls.find(([url]) => url === "/api/v1/crm/leads/lead-1/stage")?.[1];
    expect(mutation?.headers).toMatchObject({ "X-CSRF-Token": "csrf-value" });
    expect(JSON.parse(String(mutation?.body))).toMatchObject({ expectedVersion: 3, toStage: "CONTACTED", reason: "Confirmed the right point of contact" });
  });

  it("shows an actionable retry when setup fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(response({ branches: [], sources: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<CrmWorkspace csrfToken="csrf" owner />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/CRM request failed/);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No branches are available to you.")).toBeInTheDocument();
  });

  it("sends a new lead with selected branch, required reason, and only selected optional relationships", async () => {
    const branch = { id: "branch-1", name: "Mumbai", capabilities: { view: true, create: true, edit: false, activityCreate: false, stageChange: false } };
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/crm/setup") return response({ branches: [branch], sources: [{ id: "source-1", name: "Manual", active: true, builtIn: true }] });
      if (url.startsWith("/api/v1/crm/leads?")) return response({ items: [], total: 0 });
      if (url === "/api/v1/crm/clients?branchId=branch-1") return response({ items: [] });
      if (url === "/api/v1/crm/leads" && init?.method === "POST") return response({ id: "lead-created" });
      return response({}, 404);
    }));
    render(<CrmWorkspace csrfToken="csrf-new" owner={false} />);
    fireEvent.click(await screen.findByRole("button", { name: "New lead" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Campaign launch" } });
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Dev Shah" } });
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "source-1" } });
    fireEvent.change(screen.getByLabelText("Creation reason"), { target: { value: "Inbound enquiry from the website" } });
    fireEvent.click(screen.getByRole("button", { name: "Create lead" }));
    await waitFor(() => expect(calls.some(([url]) => url === "/api/v1/crm/leads")).toBe(true));
    const init = calls.find(([url]) => url === "/api/v1/crm/leads")?.[1];
    expect(init?.headers).toMatchObject({ "X-CSRF-Token": "csrf-new" });
    expect(JSON.parse(String(init?.body))).toEqual({ branchId: "branch-1", title: "Campaign launch", contactName: "Dev Shah", sourceId: "source-1", reason: "Inbound enquiry from the website" });
  });

  it("keeps a successful lead visible when an older setup response arrives during the list refresh", async () => {
    const branch = { id: "branch-1", name: "Mumbai", capabilities: { view: true, create: true, edit: false, activityCreate: false, stageChange: false } };
    const lead = { id: "lead-created", title: "Campaign launch", contactName: "Dev Shah", stage: "NEW", version: 1, createdAt: "2026-10-01T10:00:00Z" };
    const setupResponses: Array<(value: Response) => void> = [];
    let releaseMutationList: (value: Response) => void = () => undefined;
    let listCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/v1/crm/setup") return new Promise<Response>(resolve => setupResponses.push(resolve));
      if (url.startsWith("/api/v1/crm/leads?") && init?.method !== "POST") {
        listCalls += 1;
        if (listCalls === 1) return response({ items: [], total: 0 });
        if (listCalls === 2) return new Promise<Response>(resolve => { releaseMutationList = resolve; });
        return response({ items: [], total: 0 });
      }
      if (url === "/api/v1/crm/clients?branchId=branch-1") return response({ items: [] });
      if (url === "/api/v1/crm/leads" && init?.method === "POST") return response(lead, 201);
      return response({}, 404);
    }));
    render(<StrictMode><CrmWorkspace csrfToken="csrf-race" owner={false} /></StrictMode>);
    await waitFor(() => expect(setupResponses).toHaveLength(2));

    setupResponses[1]!(response({ branches: [branch], sources: [{ id: "source-1", name: "Manual", active: true, builtIn: true }] }));
    fireEvent.click(await screen.findByRole("button", { name: "New lead" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: lead.title } });
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: lead.contactName } });
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "source-1" } });
    fireEvent.change(screen.getByLabelText("Creation reason"), { target: { value: "Inbound enquiry from the website" } });
    fireEvent.click(screen.getByRole("button", { name: "Create lead" }));
    await waitFor(() => expect(listCalls).toBe(2));

    await act(async () => {
      setupResponses[0]!(response({ branches: [branch], sources: [{ id: "source-1", name: "Manual", active: true, builtIn: true }] }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listCalls).toBe(2);
    releaseMutationList(response({ items: [lead], total: 1 }));

    expect(await screen.findByRole("button", { name: /Campaign launch/ })).toBeInTheDocument();
    expect(screen.getByText("1 total")).toBeInTheDocument();
  });

  it("hides stage mutation controls for a terminal Won lead", async () => {
    const branch = { id: "branch-1", name: "Mumbai", capabilities: { view: true, create: true, edit: true, activityCreate: true, stageChange: true } };
    const won = { id: "won-1", title: "Completed conversion", contactName: "Ria Sen", stage: "WON", version: 4, createdAt: "2026-09-27T10:00:00Z" };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v1/crm/setup") return response({ branches: [branch], sources: [] });
      if (url.startsWith("/api/v1/crm/leads?")) return response({ items: [won], total: 1 });
      if (url === "/api/v1/crm/clients?branchId=branch-1") return response({ items: [] });
      if (url === "/api/v1/crm/leads/won-1") return response({ lead: won, capabilities: { edit: false, activityCreate: true, stageChange: false }, stageChanges: [{ id: "won-history", direction: "FORWARD", fromStage: "PROPOSAL", toStage: "WON", occurredAt: "2026-09-27T10:00:00Z" }], activities: [], candidate: { leadId: won.id, branchId: "branch-1", wonAt: "2026-09-27T10:00:00Z", stageChangeId: "won-history" } });
      return response({}, 404);
    }));
    render(<CrmWorkspace csrfToken="csrf" owner={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /Completed conversion/ }));
    expect(await screen.findByText("Won conversion candidate")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Change stage" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New stage")).not.toBeInTheDocument();
  });

  it("preserves existing contact IDs when Owner saves client changes and sends null to clear fields", async () => {
    const branch = { id: "branch-1", name: "Mumbai", capabilities: { view: true, create: true, edit: true, activityCreate: true, stageChange: true } };
    const client = { id: "client-1", name: "Acme", version: 2, contacts: [{ id: "contact-1", name: "Nia", email: "nia@example.test", phone: "123" }, { id: "contact-2", name: "Omar", email: "omar@example.test", phone: "456" }] };
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/crm/setup") return response({ branches: [branch], sources: [] });
      if (url.startsWith("/api/v1/crm/leads?")) return response({ items: [], total: 0 });
      if (url === "/api/v1/crm/clients?branchId=branch-1") return response({ items: [client] });
      if (url === "/api/v1/crm/clients/client-1" && init?.method === "PUT") return response({ ...client, version: 3 });
      return response({}, 404);
    }));
    render(<CrmWorkspace csrfToken="csrf-owner" owner />);
    fireEvent.click(await screen.findByText("Shared clients · Owner management"));
    await screen.findByRole("option", { name: "Acme" }); fireEvent.change(screen.getByLabelText("Existing visible client"), { target: { value: client.id } });
    fireEvent.change(screen.getAllByLabelText("Email")[0]!, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Reason", { selector: "input" }), { target: { value: "Correct contact details" } });
    fireEvent.click(screen.getByRole("button", { name: "Save client" }));
    await waitFor(() => expect(calls.some(([url]) => url === "/api/v1/crm/clients/client-1")).toBe(true));
    const init = calls.find(([url]) => url === "/api/v1/crm/clients/client-1")?.[1];
    const body = JSON.parse(String(init?.body));
    expect(body.expectedVersion).toBe(2);
    expect(body.contacts).toEqual([{ id: "contact-1", name: "Nia", email: null, phone: "123" }, { id: "contact-2", name: "Omar", email: "omar@example.test", phone: "456" }]);
    expect(init?.headers).toMatchObject({ "X-CSRF-Token": "csrf-owner" });
  });

  it("creates a separate returning enquiry linked to a visible Lost lead", async () => {
    const branch = { id: "branch-1", name: "Mumbai", capabilities: { view: true, create: true, edit: true, activityCreate: false, stageChange: false } };
    const lost = { id: "lost-1", title: "Earlier enquiry", contactName: "Asha", stage: "LOST", version: 3, createdAt: "2026-09-26T10:00:00Z" };
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/crm/setup") return response({ branches: [branch], sources: [{ id: "source-1", name: "Referral", active: true, builtIn: true }] });
      if (url.startsWith("/api/v1/crm/leads?")) return response({ items: [lost], total: 1 });
      if (url === "/api/v1/crm/clients?branchId=branch-1") return response({ items: [] });
      if (url === "/api/v1/crm/leads/lost-1") return response({ lead: lost, capabilities: { edit: false, activityCreate: false, stageChange: false }, stageChanges: [], activities: [] });
      if (url === "/api/v1/crm/leads" && init?.method === "POST") return response({ id: "new-lead" });
      return response({}, 404);
    }));
    render(<CrmWorkspace csrfToken="csrf" owner={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /Earlier enquiry/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Create returning enquiry" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Renewed enquiry" } });
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "source-1" } });
    fireEvent.change(screen.getByLabelText("Creation reason"), { target: { value: "Client contacted us again" } });
    fireEvent.click(screen.getByRole("button", { name: "Create lead" }));
    await waitFor(() => expect(calls.some(([url]) => url === "/api/v1/crm/leads")).toBe(true));
    const body = JSON.parse(String(calls.find(([url]) => url === "/api/v1/crm/leads")?.[1]?.body));
    expect(body).toMatchObject({ branchId: "branch-1", priorLostLeadId: "lost-1", title: "Renewed enquiry", sourceId: "source-1" });
  });

  it("shows the server conflict response after a stale stage update", async () => {
    const branch = { id: "branch-1", name: "Mumbai", capabilities: { view: true, create: false, edit: false, activityCreate: false, stageChange: true } };
    const lead = { id: "lead-1", title: "A lead", contactName: "Nia", stage: "NEW", version: 2, createdAt: "2026-09-27T10:00:00Z" };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v1/crm/setup") return response({ branches: [branch], sources: [] });
      if (url.startsWith("/api/v1/crm/leads?")) return response({ items: [lead], total: 1 });
      if (url === "/api/v1/crm/clients?branchId=branch-1") return response({ items: [] });
      if (url === "/api/v1/crm/leads/lead-1") return response({ lead, capabilities: { edit: false, activityCreate: false, stageChange: true }, stageChanges: [], activities: [] });
      if (url === "/api/v1/crm/leads/lead-1/stage") return response({}, 409);
      return response({}, 404);
    }));
    render(<CrmWorkspace csrfToken="csrf" owner={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /A lead/ }));
    await screen.findByLabelText("New stage");
    fireEvent.change(screen.getByLabelText("New stage"), { target: { value: "CONTACTED" } });
    fireEvent.click(screen.getByRole("button", { name: "Save stage" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/record changed/i);
  });

  it("does not show a late detail response after switching to another branch", async () => {
    const branches = [
      { id: "branch-a", name: "Mumbai", capabilities: { view: true, create: true, edit: false, activityCreate: false, stageChange: false } },
      { id: "branch-b", name: "Pune", capabilities: { view: true, create: true, edit: false, activityCreate: false, stageChange: false } },
    ];
    const oldLead = { id: "lead-a", title: "Private Mumbai lead", contactName: "Asha", stage: "NEW", version: 1, createdAt: "2026-09-27T10:00:00Z" };
    const newLead = { id: "lead-b", title: "Pune lead", contactName: "Nia", stage: "NEW", version: 1, createdAt: "2026-09-27T10:00:00Z" };
    let releaseOldDetail: (r: Response) => void = () => undefined;
    const oldDetail = new Promise<Response>(resolve => { releaseOldDetail = resolve; });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v1/crm/setup") return response({ branches, sources: [] });
      if (url === "/api/v1/crm/clients?branchId=branch-a" || url === "/api/v1/crm/clients?branchId=branch-b") return response({ items: [] });
      if (url.includes("branchId=branch-a")) return response({ items: [oldLead], total: 1 });
      if (url.includes("branchId=branch-b")) return response({ items: [newLead], total: 1 });
      if (url === "/api/v1/crm/leads/lead-a") return oldDetail;
      if (url === "/api/v1/crm/leads/lead-b") return response({ lead: newLead, capabilities: { edit: false, activityCreate: false, stageChange: false }, stageChanges: [], activities: [] });
      return response({}, 404);
    }));
    render(<CrmWorkspace csrfToken="csrf" owner={false} />);
    fireEvent.click(await screen.findByRole("button", { name: /Private Mumbai lead/ }));
    fireEvent.change(screen.getByLabelText("CRM branch"), { target: { value: "branch-b" } });
    fireEvent.click(await screen.findByRole("button", { name: /Pune lead/ }));
    expect(await screen.findByRole("heading", { name: "Pune lead" })).toBeInTheDocument();
    releaseOldDetail(response({ lead: oldLead, capabilities: { edit: false, activityCreate: false, stageChange: false }, stageChanges: [], activities: [] }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Private Mumbai lead" })).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Pune lead" })).toBeInTheDocument();
  });

  it("hides source management when setup does not grant sourceManage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ branches: [], sources: [{ id: "src-active", name: "Manual", active: true, builtIn: true }], sourceManage: false })));
    render(<CrmWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByText("No branches are available to you.");
    expect(screen.queryByText("Lead source settings")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add source" })).not.toBeInTheDocument();
  });

  it("allows a source manager to add a source and deactivate it with timestamp and reason", async () => {
    const updatedAt = "2026-09-27T10:00:00.000Z";
    const manual = { id: "src-manual", name: "Manual", active: true, builtIn: true, updatedAt };
    const referrals = { id: "src-referral", name: "Referral", active: true, builtIn: true, updatedAt };
    let sources = [manual, referrals];
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/crm/setup") return response({ branches: [], sources, sourceManage: true });
      if (url === "/api/v1/crm/sources" && init?.method === "POST") { sources = [...sources, { id: "src-web", name: "Partner event", active: true, builtIn: false, updatedAt }]; return response(sources[2]); }
      if (url === "/api/v1/crm/sources/src-manual" && init?.method === "PUT") { sources = sources.map(s => s.id === "src-manual" ? { ...s, active: false, updatedAt: "2026-09-27T11:00:00.000Z" } : s); return response(sources[0]); }
      return response({}, 404);
    }));
    render(<CrmWorkspace csrfToken="csrf-source" owner={false} />);
    fireEvent.click(await screen.findByText("Lead source settings"));
    fireEvent.change(screen.getByLabelText("New source name"), { target: { value: "Partner event" } });
    fireEvent.change(screen.getByLabelText("Reason", { selector: "input" }), { target: { value: "Track event referrals" } });
    fireEvent.click(screen.getByRole("button", { name: "Add source" }));
    expect(await screen.findByText("Partner event", { selector: "strong" })).toBeInTheDocument();
    expect(calls.find(([url]) => url === "/api/v1/crm/sources")?.[1]?.headers).toMatchObject({ "X-CSRF-Token": "csrf-source" });
    const manualRow = screen.getByText("Manual", { selector: "strong" }).closest("li") as HTMLElement;
    fireEvent.change(within(manualRow).getByLabelText("Reason to deactivate"), { target: { value: "Retire the manual source for new enquiries" } });
    fireEvent.click(within(manualRow).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(calls.some(([url, init]) => url === "/api/v1/crm/sources/src-manual" && init?.method === "PUT")).toBe(true));
    const mutation = calls.find(([url]) => url === "/api/v1/crm/sources/src-manual")?.[1];
    expect(JSON.parse(String(mutation?.body))).toEqual({ active: false, expectedUpdatedAt: updatedAt, reason: "Retire the manual source for new enquiries" });
    expect(mutation?.headers).toMatchObject({ "X-CSRF-Token": "csrf-source" });
    fireEvent.change(within(manualRow).getByLabelText("Reason to activate"), { target: { value: "Restore the approved source" } });
    fireEvent.click(within(manualRow).getByRole("button", { name: "Activate" }));
    await waitFor(() => expect(calls.filter(([url, init]) => url === "/api/v1/crm/sources/src-manual" && init?.method === "PUT")).toHaveLength(2));
    const reactivation = calls.filter(([url]) => url === "/api/v1/crm/sources/src-manual")[1]?.[1];
    expect(JSON.parse(String(reactivation?.body))).toEqual({ active: true, expectedUpdatedAt: "2026-09-27T11:00:00.000Z", reason: "Restore the approved source" });
  });
});
