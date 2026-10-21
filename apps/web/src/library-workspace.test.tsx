// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LibraryWorkspace } from "./library-workspace.js";

const recordId = "00000000-0000-4000-8000-000000000001";
const version1 = "00000000-0000-4000-8000-000000000002";
const version2 = "00000000-0000-4000-8000-000000000003";
const setup = { kinds: ["SOP", "KNOWLEDGE", "MODULE"], audiences: ["ORGANIZATION", "BRANCH", "TEAM"], branches: [], teams: [], authorAudienceOptions: { SOP: [], KNOWLEDGE: [], MODULE: [] }, referenceTargets: { tasks: [], templateVersions: [], sopVersions: [] }, categories: { SOP: [], KNOWLEDGE: [], MODULE: [] }, capabilities: { createKnowledgeSuggestion: false, activateModule: false } };
const item = { id: recordId, kind: "MODULE", audience: "ORGANIZATION", branchId: null, teamId: null, title: "Safe lifting", category: "Training", version: 2, publishedVersionId: version2, publishedVersion: 2, draft: false, capabilities: { canAppend: false, canUpload: false, canActivate: false, canRequestPublication: false, canPublishDirect: false } };
const detail = (acknowledged: boolean) => ({ record: { ...item, createdAt: "2026-10-01T00:00:00Z" }, versions: [
  { id: version2, version: 2, content: { blocks: [{ type: "TEXT", text: "Use both hands." }] }, acknowledgementRequired: false, reason: "Updated instruction", createdAt: "2026-10-02T00:00:00Z", acknowledged: false, files: [] },
  { id: version1, version: 1, content: { blocks: [{ type: "TEXT", text: "Lift slowly." }], assessment: { criteria: "Read it", practicalRequired: false, minimumCorrect: 1, quiz: [{ prompt: "Safe?", options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }], correctOptionIds: ["yes"] }] } }, acknowledgementRequired: true, reason: "First release", createdAt: "2026-10-01T00:00:00Z", acknowledged, files: [] },
], publications: [{ id: "publication-2", versionId: version2, approvalRequestId: null, reason: "Current release", publishedAt: "2026-10-02T00:00:00Z" }, { id: "publication-1", versionId: version1, approvalRequestId: null, reason: "First release", publishedAt: "2026-10-01T00:00:00Z" }], eligiblePublisherIds: [], publicationRequests: [] });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => vi.unstubAllGlobals());

describe("LibraryWorkspace", () => {
  it("hides the previous record's actions until the newly selected record has loaded", async () => {
    const nextId = "00000000-0000-4000-8000-000000000004", nextVersion = "00000000-0000-4000-8000-000000000005";
    const nextItem = { ...item, id: nextId, title: "Second safety policy" };
    const nextDetail = { ...detail(false), record: nextItem, versions: [{ ...detail(false).versions[1], id: nextVersion, version: 3, content: { blocks: [{ type: "TEXT", text: "Selected policy content." }] } }], publications: [{ ...detail(false).publications[1], versionId: nextVersion }] };
    let resolveNext!: (response: Response) => void;
    let nextLoads = 0;
    const delayedNext = new Promise<Response>(resolve => { resolveNext = resolve; });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/setup")) return json(setup);
      if (url === "/api/v1/library") return json({ items: [item, nextItem] });
      if (url === `/api/v1/library/${recordId}`) return json(detail(false));
      if (url === `/api/v1/library/${nextId}`) return ++nextLoads === 1 ? delayedNext : json(nextDetail);
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LibraryWorkspace csrfToken="library-csrf" />);
    await screen.findByText("Lift slowly.");
    fireEvent.click(screen.getByRole("button", { name: /Second safety policy/ }));
    expect(screen.queryByText("Lift slowly.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acknowledge version 1" })).not.toBeInTheDocument();
    expect(screen.getByText("Loading selected Library record…")).toBeInTheDocument();
    expect(document.querySelector(".library-workspace")).toHaveAttribute("aria-busy", "true");
    await act(async () => { resolveNext(json(nextDetail)); });
    await screen.findByText("Selected policy content.");
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge version 3" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith(`/versions/${nextVersion}/acknowledgements`))).toBe(true));
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith(`/versions/${version1}/acknowledgements`))).toBe(false);
    await screen.findByText("Acknowledgement recorded for this exact version.");
  });

  it("retains exact published history, hides answer-key fields in the view, and acknowledges the older version ID", async () => {
    let acknowledged = false;
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url.endsWith("/setup")) return json(setup);
      if (url === "/api/v1/library") return json({ items: [item] });
      if (url === `/api/v1/library/${recordId}`) return json(detail(acknowledged));
      if (url === `/api/v1/library/versions/${version1}/acknowledgements`) { acknowledged = true; return json({ versionId: version1, acknowledged: true }); }
      return json({});
    }));
    render(<LibraryWorkspace csrfToken="library-csrf" />);
    await screen.findByText("Lift slowly.");
    expect((await screen.findAllByText(/First release/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.queryByText("correctOptionIds")).not.toBeInTheDocument();
    expect(screen.queryByText("minimumCorrect")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Acknowledge version 1" }));
    await waitFor(() => expect(calls.some(([url]) => url.endsWith(`/versions/${version1}/acknowledgements`))).toBe(true));
    const request = calls.find(([url]) => url.endsWith(`/versions/${version1}/acknowledgements`));
    expect(request?.[1]?.method).toBe("POST");
    expect(new Headers(request?.[1]?.headers).get("X-CSRF-Token")).toBe("library-csrf");
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({ commandId: expect.any(String), reason: expect.any(String) });
    await screen.findByText("Acknowledged");
  });

  it("keeps octet-stream chunk uploads binary and binds the returned file to its content block", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const uploadItem = { ...item, capabilities: { ...item.capabilities, canAppend: true, canUpload: true } };
    vi.stubGlobal("crypto", { randomUUID: () => "cmd-1", subtle: { digest: vi.fn(async () => new ArrayBuffer(32)) } });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url.endsWith("/setup")) return json(setup);
      if (url === "/api/v1/library") return json({ items: [uploadItem] });
      if (url === `/api/v1/library/${recordId}`) return json({ ...detail(false), record: { ...detail(false).record, capabilities: uploadItem.capabilities } });
      if (url.endsWith("/uploads")) return json({ uploadId: version2, chunkSize: 8 * 1024 * 1024, chunkCount: 1 });
      if (url.endsWith("/chunks/0")) return json({ index: 0 });
      if (url.endsWith("/finalize")) return json({ id: version1, name: "guide.pdf", mime: "application/pdf", bytes: 8, checksum: "a".repeat(64), createdAt: "2026-10-03T00:00:00Z" });
      return json({});
    }));
    render(<LibraryWorkspace csrfToken="library-csrf" />);
    await screen.findByText("Lift slowly.");
    fireEvent.click(screen.getByRole("button", { name: "Add file block" }));
    const fileInput = screen.getByLabelText("Upload private file");
    fireEvent.change(fileInput, { target: { files: [new File(["%PDF-1.7"], "guide.pdf", { type: "application/pdf" })] } });
    await screen.findByText("File uploaded privately. Save the version to attach it to this content.");
    const chunkCall = calls.find(([url]) => url.endsWith("/chunks/0"));
    expect(new Headers(chunkCall?.[1]?.headers).get("Content-Type")).toBe("application/octet-stream");
    expect(chunkCall?.[1]?.body).toBeInstanceOf(ArrayBuffer);
  });

  it("adds a text block with the strict server shape and creates the intended content", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const scopedSetup = { ...setup, authorAudienceOptions: { ...setup.authorAudienceOptions, KNOWLEDGE: [{ audience: "ORGANIZATION" as const, branchId: null, teamId: null, label: "Organization" }] } };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url.endsWith("/setup")) return json(scopedSetup);
      if (url === "/api/v1/library" && init?.method === "POST") return json({ record: { id: recordId } });
      if (url === "/api/v1/library") return json({ items: [] });
      if (url === `/api/v1/library/${recordId}`) return json(detail(false));
      return json({});
    }));
    render(<LibraryWorkspace csrfToken="library-csrf" />);
    fireEvent.click(await screen.findByRole("button", { name: "Create record" }));
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "KNOWLEDGE" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Field note" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Site notes" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Record field observation" } });
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Initial note." } });
    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    const textBoxes = screen.getAllByLabelText("Text");
    fireEvent.change(textBoxes[textBoxes.length - 1]!, { target: { value: "Measure the opening twice." } });
    fireEvent.click(screen.getByRole("button", { name: "Create draft" }));
    await waitFor(() => expect(calls.some(([url, init]) => url === "/api/v1/library" && init?.method === "POST")).toBe(true));
    const request = calls.find(([url, init]) => url === "/api/v1/library" && init?.method === "POST");
    expect(JSON.parse(String(request?.[1]?.body)).content.blocks).toEqual([{ type: "TEXT", text: "Initial note." }, { type: "TEXT", text: "Measure the opening twice." }]);
  });

  it("preserves the draft content and reason when saving a version fails", async () => {
    const versioned = { ...item, kind: "SOP" as const, publishedVersionId: null, publishedVersion: null, draft: true, capabilities: { ...item.capabilities, canAppend: true, canUpload: true } };
    const versionDetail = { ...detail(false), record: { ...detail(false).record, ...versioned, capabilities: versioned.capabilities }, versions: [{ ...detail(false).versions[0]!, content: { blocks: [{ type: "TEXT", text: "Original draft" }] } }] };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/setup")) return json(setup);
      if (url === "/api/v1/library") return json({ items: [versioned] });
      if (url === `/api/v1/library/${recordId}`) return json(versionDetail);
      if (url.endsWith("/versions")) return json({ message: "Library record version changed" }, 409);
      return json({});
    }));
    render(<LibraryWorkspace csrfToken="library-csrf" />);
    await screen.findByText("Original draft");
    const versionHeading = await screen.findByRole("heading", { name: "Add a new version" });
    const versionForm = versionHeading.closest("form")!;
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "Edited but not saved" } });
    fireEvent.change(within(versionForm).getByLabelText("Reason"), { target: { value: "Retry after reviewing the current version" } });
    fireEvent.click(screen.getByRole("button", { name: "Save version" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Text")).toHaveValue("Edited but not saved");
    expect(within(versionForm).getByLabelText("Reason")).toHaveValue("Retry after reviewing the current version");
  });
});
