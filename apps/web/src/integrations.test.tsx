import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { IntegrationsWorkspace } from "./integrations.js";

const project = { id: "project-1", title: "Studio project", canManageEvents: true };
type TestEvent = { id: string; kind: "MEETING" | "SITE_VISIT"; projectId: string | null; startAt: string; endAt: string; state: "ACTIVE" | "CANCELLED"; version: number; canManage: boolean };
type TestConnector = { id: string; label: string; branchId: string; sourceId: string; actorId: string; state: "ACTIVE" | "DISABLED"; version: number; createdAt: string; updatedAt: string };
const event: TestEvent = { id: "event-1", kind: "MEETING", projectId: "project-1", startAt: "2026-10-06T10:00:00.000Z", endAt: "2026-10-06T11:00:00.000Z", state: "ACTIVE", version: 3, canManage: true };
const setup = (events: TestEvent[] = [event], active = false, owner = false) => ({ owner, projects: [project], events, subscription: { active, ...(active ? { id: "subscription-1" } : {}) }, connectorOptions: { branches: [], sources: [], actors: [] }, websiteConnectors: [], deliveries: [], locations: [] });
const json = (body: unknown, status = 200, headers?: HeadersInit): Response => ({ ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob(["calendar"]), headers: new Headers(headers) }) as Response;

beforeEach(() => { vi.restoreAllMocks(); vi.stubGlobal("fetch", vi.fn()); });

describe("calendar integrations", () => {
  it("downloads the authenticated calendar response as a real .ics attachment", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(json(setup())).mockResolvedValueOnce(json({}, 200, { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": "attachment; filename=sense-calendar.ics" }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    class TestURL extends URL { static createObjectURL = vi.fn(() => "blob:calendar-test"); static revokeObjectURL = vi.fn(); }
    vi.stubGlobal("URL", TestURL);
    render(<IntegrationsWorkspace csrfToken="csrf" />);
    fireEvent.click(await screen.findByRole("button", { name: "Download .ics" }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/integrations/calendar.ics");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ credentials: "include", cache: "no-store" });
    expect(await screen.findByRole("status")).toHaveTextContent("Calendar file downloaded.");
  });

  it("reveals the subscription URL once and revokes it with CSRF", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(json(setup())).mockResolvedValueOnce(json({ id: "subscription-1", token: "private-token", relativeUrl: "/api/v1/integrations/calendar/subscriptions/private-token.ics", createdAt: "2026-10-05T00:00:00Z" })).mockResolvedValueOnce(json(setup([], true))).mockResolvedValueOnce(json({ revoked: true })).mockResolvedValueOnce(json(setup([], false)));
    render(<IntegrationsWorkspace csrfToken="csrf-value" />);
    fireEvent.click(await screen.findByRole("button", { name: "Create subscription link" }));
    const urlField = await screen.findByLabelText("Private subscription URL") as HTMLInputElement;
    expect(urlField.value).toBe(`${window.location.origin}/api/v1/integrations/calendar/subscriptions/private-token.ics`);
    expect(screen.getByText("Copy this URL now. It will not be shown again.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("X-CSRF-Token")).toBe("csrf-value");
    fireEvent.click(await screen.findByRole("button", { name: "Revoke link" }));
    expect(await screen.findByText(/Subscription revoked\. Calendar copies already imported may remain/)).toBeInTheDocument();
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe("DELETE");
    expect(new Headers(fetchMock.mock.calls[3]?.[1]?.headers).get("X-CSRF-Token")).toBe("csrf-value");
    expect(screen.queryByLabelText("Private subscription URL")).not.toBeInTheDocument();
  });

  it("persists explicit events, sends expected versions, and leaves read-only events uneditable", async () => {
    const readonly = { ...event, id: "readonly-event", projectId: null, canManage: false };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(json(setup([event, readonly]))).mockResolvedValueOnce(json(event)).mockResolvedValueOnce(json(setup([event, readonly]))).mockResolvedValueOnce(json(event)).mockResolvedValueOnce(json(setup([event, readonly])));
    render(<IntegrationsWorkspace csrfToken="csrf" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Updated meeting time" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const update = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
    expect(update.expectedVersion).toBe(3);
    expect(update.reason).toBe("Updated meeting time");
    const rows = screen.getByRole("region", { name: "Entered events" });
    const readonlyRow = within(rows).getByText(/Personal event/).closest("li");
    expect(readonlyRow).not.toHaveTextContent("Edit");
    vi.spyOn(window, "prompt").mockReturnValue("Schedule changed");
    fireEvent.click(within(rows).getAllByRole("button", { name: "Cancel" })[0]!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toMatchObject({ expectedVersion: 3, reason: "Schedule changed" });
  });

  it("submits a new meeting through the event command endpoint", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(json(setup([]))).mockResolvedValueOnce(json(event)).mockResolvedValueOnce(json(setup([event])));
    render(<IntegrationsWorkspace csrfToken="csrf" />);
    fireEvent.change(await screen.findByLabelText("Event type"), { target: { value: "SITE_VISIT" } });
    fireEvent.change(screen.getByLabelText("Project (optional)"), { target: { value: "project-1" } });
    fireEvent.change(screen.getByLabelText("Starts"), { target: { value: "2026-10-06T15:30" } });
    fireEvent.change(screen.getByLabelText("Ends"), { target: { value: "2026-10-06T16:30" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Record the site visit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save event" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v1/integrations/calendar/events");
    const payload = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({ kind: "SITE_VISIT", projectId: "project-1", reason: "Record the site visit" });
    expect(payload.startAt).toBe(new Date("2026-10-06T15:30").toISOString());
    expect(payload.endAt).toBe(new Date("2026-10-06T16:30").toISOString());
  });

  it("shows a safe conflict and keeps the event available for refresh", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(json(setup())).mockResolvedValueOnce(json({ message: "version-conflict" }, 409));
    render(<IntegrationsWorkspace csrfToken="csrf" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Move the meeting" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This calendar item changed elsewhere. Refresh the list and try again.");
  });

  it("lets the Owner create and rotate a connector with one-time secret disclosure, then disable by version", async () => {
    const branches = [{ id: "branch-1", name: "Studio branch" }];
    const sources = [{ id: "source-1", label: "Website" }];
    const actors = [{ id: "actor-1", label: "Authorized staff" }];
    const connector = { id: "connector-1", label: "Studio website", branchId: "branch-1", sourceId: "source-1", actorId: "actor-1", state: "ACTIVE" as const, version: 2, createdAt: "2026-10-05T00:00:00Z", updatedAt: "2026-10-05T00:00:00Z" };
    const ownerSetup = (connectors: TestConnector[] = []) => ({ ...setup([], false, true), connectorOptions: { branches, sources, actors }, websiteConnectors: connectors, deliveries: [], locations: [] });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(json(ownerSetup())).mockResolvedValueOnce(json({ ...connector, secret: "secret-create" }, 201)).mockResolvedValueOnce(json(ownerSetup([connector]))).mockResolvedValueOnce(json({ ...connector, version: 3, secret: "secret-rotated" })).mockResolvedValueOnce(json(ownerSetup([{ ...connector, version: 3 }]))).mockResolvedValueOnce(json({ ...connector, version: 4, state: "DISABLED" as const })).mockResolvedValueOnce(json(ownerSetup([{ ...connector, version: 4, state: "DISABLED" }])));
    render(<IntegrationsWorkspace csrfToken="csrf-owner" />);
    const website = await screen.findByRole("region", { name: "Website enquiries" });
    fireEvent.change(within(website).getByLabelText("Connector label"), { target: { value: "Studio website" } });
    expect(within(website).getByRole("option", { name: "Studio branch" })).toHaveValue("branch-1");
    fireEvent.change(within(website).getByLabelText("Branch"), { target: { value: "branch-1" } });
    fireEvent.change(within(website).getByLabelText("Website source"), { target: { value: "source-1" } });
    fireEvent.change(within(website).getByLabelText("Authorized actor"), { target: { value: "actor-1" } });
    fireEvent.change(within(website).getByLabelText("Reason"), { target: { value: "Enable website intake" } });
    fireEvent.click(within(website).getByRole("button", { name: "Create website connector" }));
    expect(await screen.findByLabelText("Website signing secret")).toHaveValue("secret-create");
    const createBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(createBody).toMatchObject({ label: "Studio website", branchId: "branch-1", sourceId: "source-1", actorId: "actor-1", reason: "Enable website intake" });
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get("X-CSRF-Token")).toBe("csrf-owner");
    window.prompt = vi.fn().mockReturnValueOnce("Rotate compromised secret").mockReturnValueOnce("Retire intake");
    fireEvent.click(await screen.findByRole("button", { name: "Rotate secret" }));
    expect(await screen.findByLabelText("Website signing secret")).toHaveValue("secret-rotated");
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toMatchObject({ expectedVersion: 2, reason: "Rotate compromised secret" });
    fireEvent.click(await screen.findByRole("button", { name: "Disable connector" }));
    expect(await screen.findByText("DISABLED")).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[5]?.[1]?.body))).toMatchObject({ expectedVersion: 3, reason: "Retire intake" });
  });

  it("renders only an explicit authorized OpenStreetMap link and hides Owner controls from staff", async () => {
    const location = { id: "location-1", projectId: "project-1", label: "Site", latitude: 12.97, longitude: 77.59, mapUrl: "https://www.openstreetmap.org/?mlat=12.97&mlon=77.59" };
    vi.mocked(fetch).mockResolvedValueOnce(json({ ...setup(), locations: [location] }));
    render(<IntegrationsWorkspace csrfToken="csrf-staff" />);
    const mapLink = await screen.findByRole("link", { name: "Open map" });
    expect(mapLink).toHaveAttribute("href", location.mapUrl);
    expect(mapLink).toHaveAttribute("target", "_blank");
    expect(mapLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByRole("heading", { name: "Website enquiries" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create website connector" })).not.toBeInTheDocument();
  });

  it("shows delivery status without rendering external enquiry or lead identifiers", async () => {
    const connector: TestConnector = { id: "connector-1", label: "Studio website", branchId: "branch-1", sourceId: "source-1", actorId: "actor-1", state: "ACTIVE", version: 1, createdAt: "2026-10-05T00:00:00Z", updatedAt: "2026-10-05T00:00:00Z" };
    const data = { ...setup([], false, true), websiteConnectors: [connector], deliveries: [{ id: "delivery-1", connectorId: connector.id, externalId: "private-enquiry", leadId: "private-lead", status: "FAILED", occurredAt: "2026-10-05T01:00:00Z" }] };
    vi.mocked(fetch).mockResolvedValueOnce(json(data));
    render(<IntegrationsWorkspace csrfToken="csrf-owner" />);
    expect(await screen.findByText("FAILED")).toBeInTheDocument();
    expect(screen.getAllByText("Studio website")).toHaveLength(2);
    expect(screen.queryByText("private-enquiry")).not.toBeInTheDocument();
    expect(screen.queryByText("private-lead")).not.toBeInTheDocument();
  });

  it("explains that a replayed rotation cannot reveal the previous one-time secret", async () => {
    const connector: TestConnector = { id: "connector-1", label: "Studio website", branchId: "branch-1", sourceId: "source-1", actorId: "actor-1", state: "ACTIVE", version: 2, createdAt: "2026-10-05T00:00:00Z", updatedAt: "2026-10-05T00:00:00Z" };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(json({ ...setup([], false, true), websiteConnectors: [connector] })).mockResolvedValueOnce(json({ ...connector, replayed: true })).mockResolvedValueOnce(json({ ...setup([], false, true), websiteConnectors: [connector] }));
    vi.spyOn(window, "prompt").mockReturnValue("Retry prior rotation");
    render(<IntegrationsWorkspace csrfToken="csrf-owner" />);
    fireEvent.click(await screen.findByRole("button", { name: "Rotate secret" }));
    expect(await screen.findByText(/rotation was already completed, but its one-time secret is unavailable/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Website signing secret")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
  });

  it("preserves a safe connector configuration conflict message without exposing secrets", async () => {
    const ownerSetup = { ...setup([], false, true), connectorOptions: { branches: [{ id: "branch-1", name: "Studio branch" }], sources: [{ id: "source-1", label: "Website" }], actors: [{ id: "actor-1", label: "Authorized staff" }] } };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(json(ownerSetup)).mockResolvedValueOnce(json({ message: "Website connector encryption is not configured." }, 409));
    render(<IntegrationsWorkspace csrfToken="csrf-owner" />);
    const website = await screen.findByRole("region", { name: "Website enquiries" });
    fireEvent.change(within(website).getByLabelText("Connector label"), { target: { value: "Studio website" } });
    fireEvent.change(within(website).getByLabelText("Branch"), { target: { value: "branch-1" } });
    fireEvent.change(within(website).getByLabelText("Website source"), { target: { value: "source-1" } });
    fireEvent.change(within(website).getByLabelText("Authorized actor"), { target: { value: "actor-1" } });
    fireEvent.change(within(website).getByLabelText("Reason"), { target: { value: "Enable website intake" } });
    fireEvent.click(within(website).getByRole("button", { name: "Create website connector" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Website connector encryption is not configured.");
    expect(screen.queryByText(/calendar item changed/)).not.toBeInTheDocument();
    expect(screen.queryByText(/secret/i)).not.toBeInTheDocument();
  });
});
