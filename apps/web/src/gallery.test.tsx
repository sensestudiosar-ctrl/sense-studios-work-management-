import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientProjectGallery, PublicPortfolioPage, StaffProjectGallery } from "./gallery.js";
import type { PortalSession } from "./client-portal-auth.js";

const projectId = "project-gallery-1";
const csrf = "owner-csrf";
const session: PortalSession = { account: { id: "client-1", email: "client@example.test", kind: "CLIENT" }, csrfToken: "client-csrf", activePasskeyCount: 0 };
type Entry = { id: string; itemId: string; label: string; mime: string; streamUrl: string };
type Publication = { id: string; title: string; altText: string; state: "DRAFT" | "PUBLISHED" | "WITHDRAWN"; version: number; mime: string; size: number; sourceFileId: string; reason: string; createdAt: string };
type Gallery = { projectId: string; entries: Entry[]; eligibleItems: Array<{ id: string; label: string; mime: string; grants: Array<{ portalGrantId: string; primary: boolean; expiresAt: string | null }> }> };
type Portfolio = { projectId: string; sourceFiles: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number; sha256: string }>; publications: Publication[] };
const gallery: Gallery = { projectId, entries: [], eligibleItems: [{ id: "item-1", label: "R0 approved elevation", mime: "application/pdf", grants: [{ portalGrantId: "grant-1", primary: true, expiresAt: null }] }] };
const portfolio: Portfolio = { projectId, sourceFiles: [{ id: "file-1", fileName: "internal.pdf", mimeType: "application/pdf", sizeBytes: 12, sha256: "a".repeat(64) }], publications: [] };
function reply(body: unknown, status = 200): Response { return { ok: status >= 200 && status < 300, status, json: async () => body } as Response; }
function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
beforeEach(() => vi.restoreAllMocks());

describe("S15 project galleries and portfolio", () => {
  it("curates an existing current-grant item and saves a separate derivative before Owner publication", async () => {
    let entries: Entry[] = gallery.entries;
    let publications: Publication[] = portfolio.publications;
    let published = false;
    let withdrawn = false;
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith(`/galleries/projects/${projectId}`) && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { itemId: string; label: string; reason: string };
        expect(body).toEqual({ itemId: "item-1", label: "Approved elevation", reason: "Place this granted R0 in the client gallery" });
        entries = [{ id: "entry-1", itemId: body.itemId, label: body.label, mime: "application/pdf", streamUrl: `/api/v1/client-portal/projects/${projectId}/gallery/items/item-1/stream` }];
        return reply(entries[0], 201);
      }
      if (url.endsWith(`/portfolio/projects/${projectId}`) && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { sourceFileId: string; title: string; altText: string; reason: string; imageBase64: string };
        expect(body).toMatchObject({ sourceFileId: "file-1", title: "Warm oak kitchen", altText: "Kitchen with warm oak cabinetry", reason: "Prepare a separate public image" });
        expect(body.imageBase64.length).toBeGreaterThan(0);
        publications = [{ id: "pub-1", title: body.title, altText: body.altText, state: "DRAFT", version: 1, mime: "image/png", size: 10, sourceFileId: body.sourceFileId, reason: body.reason, createdAt: "2026-10-01T00:00:00Z" }];
        return reply(publications[0], 201);
      }
      if (url.endsWith(`/galleries/projects/${projectId}`)) return reply({ ...gallery, entries });
      if (url.endsWith(`/portfolio/projects/${projectId}`)) return reply({ ...portfolio, publications });
      if (url.endsWith("/portfolio/pub-1/publish")) { expect(JSON.parse(String(init?.body))).toEqual({ expectedVersion: 1, reason: "Publish this approved portfolio derivative" }); published = true; publications = [{ ...publications[0]!, state: "PUBLISHED", version: 2 }]; return reply(publications[0]); }
      if (url.endsWith("/portfolio/pub-1/withdraw")) { expect(JSON.parse(String(init?.body))).toEqual({ expectedVersion: 2, reason: "Withdraw this portfolio derivative" }); withdrawn = true; publications = [{ ...publications[0]!, state: "WITHDRAWN", version: 3 }]; return reply(publications[0]); }
      return reply({}, 404);
    });
    const { container } = render(<StaffProjectGallery projectId={projectId} csrfToken={csrf} owner />);
    await screen.findByText("No items have been added to this project’s client gallery.");
    fireEvent.change(screen.getByLabelText("Exact currently granted review item"), { target: { value: "item-1" } });
    fireEvent.change(screen.getByLabelText("Client-facing label"), { target: { value: "Approved elevation" } });
    fireEvent.change(container.querySelectorAll(".s15-gallery-panel textarea")[0]!, { target: { value: "Place this granted R0 in the client gallery" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to client gallery" }));
    expect(await screen.findByText("Client gallery updated.")).toBeInTheDocument();
    expect(await screen.findByText("Approved elevation")).toBeInTheDocument();
    expect(new Headers(fetchMock.mock.calls.find(([url, init]) => String(url).endsWith(`/galleries/projects/${projectId}`) && init?.method === "POST")?.[1]?.headers).get("X-CSRF-Token")).toBe(csrf);

    fireEvent.change(screen.getByLabelText("Eligible source file"), { target: { value: "file-1" } });
    expect(screen.getByLabelText("Eligible source file")).toHaveValue("file-1");
    fireEvent.change(screen.getByLabelText("Public title"), { target: { value: "Warm oak kitchen" } });
    fireEvent.change(screen.getByLabelText("Alternative text"), { target: { value: "Kitchen with warm oak cabinetry" } });
    const png = new File([new Uint8Array([1, 2, 3, 4])], "derivative.png", { type: "image/png" });
    Object.defineProperty(png, "arrayBuffer", { value: async () => new Uint8Array([1, 2, 3, 4]).buffer });
    const derivativeInput = screen.getByLabelText(/Sanitized PNG derivative/);
    Object.defineProperty(derivativeInput, "files", { configurable: true, value: [png] });
    fireEvent.change(derivativeInput);
    fireEvent.change(container.querySelectorAll(".s15-gallery-panel textarea")[1]!, { target: { value: "Prepare a separate public image" } });
    const prepareForm = screen.getByRole("button", { name: "Save private draft" }).closest("form")!;
    fireEvent.submit(prepareForm);
    expect(await screen.findByText(/saved as a private draft/i)).toBeInTheDocument();
    expect(await screen.findByText("Warm oak kitchen")).toBeInTheDocument();
    expect(screen.getAllByText(/DRAFT/)).toHaveLength(2);
    expect(published).toBe(false);

    fireEvent.change(screen.getByLabelText("Owner action reason"), { target: { value: "Publish this approved portfolio derivative" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByText("Portfolio publication is active.")).toBeInTheDocument();
    expect(screen.getAllByText(/PUBLISHED/)).toHaveLength(2);
    expect(published).toBe(true);
    fireEvent.change(screen.getByLabelText("Owner action reason"), { target: { value: "Withdraw this portfolio derivative" } });
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(await screen.findByText("Portfolio publication withdrawn.")).toBeInTheDocument();
    expect(screen.getAllByText(/WITHDRAWN/)).toHaveLength(2);
    expect(withdrawn).toBe(true);
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows only the client gallery DTO and uses a no-store exact-authorization request", async () => {
    const item = { id: "entry-public-id", itemId: "internal-item-id", label: "Approved elevation", mime: "application/pdf", streamUrl: `/api/v1/client-portal/projects/${projectId}/gallery/items/internal-item-id/stream` };
    const fetchMock = mockFetch((url) => url.endsWith(`/client-portal/projects/${projectId}/gallery`) ? reply({ projectId, items: [item] }) : reply({}, 404));
    render(<ClientProjectGallery projectId={projectId} session={session} />);
    expect(await screen.findByRole("link", { name: "View shared item" })).toHaveAttribute("href", item.streamUrl);
    expect(screen.getByText("Approved elevation")).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith(`/client-portal/projects/${projectId}/gallery`));
    expect(call?.[1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
    expect(new Headers(call?.[1]?.headers).get("X-CSRF-Token")).toBe(session.csrfToken);
  });

  it("loads the anonymous page without credentials and renders only public title, alt text and derivative media", async () => {
    const fetchMock = mockFetch((url) => url.endsWith("/public/portfolio") ? reply({ items: [{ id: "publication-id", title: "Warm oak kitchen", altText: "Kitchen with warm oak cabinetry", mime: "image/png", streamUrl: "/api/v1/public/portfolio/publication-id/stream" }] }) : reply({}, 404));
    const { container } = render(<PublicPortfolioPage />);
    expect(await screen.findByRole("heading", { name: "Warm oak kitchen" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Kitchen with warm oak cabinetry" })).toHaveAttribute("src", "/api/v1/public/portfolio/publication-id/stream");
    expect(container.textContent).not.toContain("publication-id");
    expect(container.textContent).not.toContain("internal");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "omit", cache: "no-store" });
  });

  it("provides retryable public error and empty states", async () => {
    let failed = true;
    const fetchMock = mockFetch(() => failed ? reply({}, 503) : reply({ items: [] }));
    render(<PublicPortfolioPage />);
    expect(await screen.findByText("The portfolio is unavailable right now.")).toBeInTheDocument();
    failed = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No portfolio work is currently published.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
