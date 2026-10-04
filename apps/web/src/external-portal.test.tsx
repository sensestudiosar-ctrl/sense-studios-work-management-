import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExternalPortalWorkspace, StaffExternalAccessWorkspace } from "./external-portal.js";

function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }

describe("external portal", () => {
  it("reuses an advisory submission key after a persisted response is lost", async () => {
    const keys: string[] = [];
    const workspace = { project: { id: "p1", title: "Granted project", status: "ACTIVE" }, grants: [{ id: "g1", portalType: "CONSULTANT", version: 1, revisionIds: ["r1"], releaseIds: [], packageIds: [], expiresAt: null, revokedAt: null, closeoutTaskId: null }], revisions: [], production: [], packages: [], requests: [], submissions: [], uploads: [], transmittals: [], cadShares: [], capabilities: { submit: true, upload: false, acknowledge: false } };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/session")) return response({ account: { id: "a1", email: "consultant@example.test", kind: "EXTERNAL" }, csrfToken: "csrf" });
      if (url.endsWith("/auth/sessions")) return response([]);
      if (url.endsWith("/projects")) return response({ projects: [{ id: "p1", title: "Granted project", status: "ACTIVE", portalType: "CONSULTANT" }] });
      if (url.endsWith("/projects/p1/submissions")) {
        keys.push(new Headers(init?.headers).get("x-idempotency-key") ?? "");
        if (keys.length === 1) throw new TypeError("Response lost after persistence");
        return response({ id: "retained-submission" });
      }
      if (url.endsWith("/projects/p1")) return response(workspace);
      throw new Error(`Unexpected request ${url}`);
    }));
    render(<ExternalPortalWorkspace />);
    await screen.findByRole("heading", { name: "Project portal" });
    await screen.findByRole("button", { name: "Submit" });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Request clarification" } });
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Please clarify the assigned drawing." } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Clarify exact scoped work" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByRole("alert");
    await waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText(/Your submission was recorded/);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
  });
  it("uses the passwordless external code flow and loads only scoped projects", async () => {
    let authenticated = false;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/session")) return authenticated ? response({ account: { id: "a1", email: "consultant@example.test", kind: "EXTERNAL" }, csrfToken: "csrf" }) : response(null, 401);
      if (url.endsWith("/auth/code")) return response({ accepted: true });
      if (url.endsWith("/auth/verify")) { authenticated = true; return response({ authenticated: true }); }
      if (url.endsWith("/auth/sessions")) return response([]);
      if (url.endsWith("/projects")) return response({ projects: [{ id: "p1", title: "Granted project", status: "ACTIVE", portalType: "CONSULTANT" }] });
      if (url.endsWith("/projects/p1")) return response({ project: { id: "p1", title: "Granted project", status: "ACTIVE" }, grants: [], revisions: [], production: [], packages: [], requests: [], submissions: [], uploads: [], transmittals: [], cadShares: [], capabilities: { submit: false, upload: false, acknowledge: false } });
      throw new Error(`Unexpected request ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<ExternalPortalWorkspace />);
    await screen.findByRole("heading", { name: "Sign in to your project portal" });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "consultant@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send sign-in code" }));
    await screen.findByText("If this address has access, a sign-in code has been sent.");
    fireEvent.change(screen.getByLabelText("One-time code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Project portal" });
    expect(screen.getByRole("option", { name: "Granted project · Consultant" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("passkey"))).toBe(false);
    expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith("/auth/verify") && init?.credentials === "same-origin" && init?.cache === "no-store")).toBe(true);
  });

  it("submits vendor status as advisory evidence with a stable idempotency key", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const workspace = { project: { id: "p1", title: "Factory project", status: "ACTIVE" }, grants: [{ id: "g1", portalType: "VENDOR_FACTORY", version: 3, revisionIds: [], releaseIds: ["rel1"], packageIds: [], expiresAt: null, revokedAt: null, closeoutTaskId: null }], revisions: [], production: [{ id: "rel1", label: "Batch 4", requirements: { lines: [{ key: "panels", description: "Panels", quantity: 20, unit: "units" }], materials: [{ lineKey: "panels", material: "Oak" }] }, deadline: "2026-10-12", status: "Ready" }], packages: [], requests: [], submissions: [], uploads: [], transmittals: [], cadShares: [], capabilities: { submit: true, upload: false, acknowledge: false } };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push({ url, init });
      if (url.endsWith("/auth/session")) return response({ account: { id: "a1", email: "factory@example.test", kind: "EXTERNAL" }, csrfToken: "csrf" });
      if (url.endsWith("/auth/sessions")) return response([]);
      if (url.endsWith("/projects")) return response({ projects: [{ id: "p1", title: "Factory project", status: "ACTIVE", portalType: "VENDOR_FACTORY" }] });
      if (url.endsWith("/projects/p1/submissions")) return response({ id: "sub1" });
      if (url.endsWith("/projects/p1")) return response(workspace);
      throw new Error(`Unexpected request ${url}`);
    }));
    render(<ExternalPortalWorkspace />);
    await screen.findByText("Panels · 20 units"); expect(screen.getByText("Material: Oak")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "PRODUCTION_STATUS" } });
    fireEvent.change(screen.getByLabelText("Exact context"), { target: { value: "rel1" } });
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Batch ready" } });
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "First units are ready for inspection." } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Provide the current batch update." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText(/Your submission was recorded/);
    const call = calls.find((entry) => entry.url.endsWith("/projects/p1/submissions"));
    expect(call?.init?.headers).toMatchObject({ "x-csrf-token": "csrf", "x-idempotency-key": expect.any(String) });
    expect(JSON.parse(String(call?.init?.body))).toMatchObject({ grantId: "g1", kind: "PRODUCTION_STATUS", releaseId: "rel1", reason: "Provide the current batch update." });
  });

  it("retries a lost finalize response against the same upload without restarting or reuploading chunks", async () => {
    const uploadUrls: string[] = []; const finalizeUrls: string[] = []; let finalizeCount = 0;
    const workspace = { project: { id: "p1", title: "Granted project", status: "ACTIVE" }, grants: [{ id: "g1", portalType: "CONSULTANT", version: 1, revisionIds: ["r1"], releaseIds: [], packageIds: [], expiresAt: null, revokedAt: null, closeoutTaskId: null }], revisions: [], production: [], packages: [], requests: [], submissions: [], uploads: [], transmittals: [], cadShares: [], capabilities: { submit: false, upload: true, acknowledge: false } };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/session")) return response({ account: { id: "a1", email: "consultant@example.test", kind: "EXTERNAL" }, csrfToken: "csrf" });
      if (url.endsWith("/auth/sessions")) return response([]);
      if (url.endsWith("/projects")) return response({ projects: [{ id: "p1", title: "Granted project", status: "ACTIVE", portalType: "CONSULTANT" }] });
      if (url.endsWith("/projects/p1/uploads")) { uploadUrls.push(url); return response({ uploadId: "upload-1", chunkSize: 8 * 1024 * 1024 }); }
      if (url.includes("/uploads/upload-1/chunks/0")) return response({ index: 0, received: true });
      if (url.endsWith("/uploads/upload-1/finalize")) { finalizeUrls.push(url); finalizeCount++; if (finalizeCount === 1) throw new TypeError("Finalize response lost after persistence"); return response({ id: "retained-upload", fileName: "evidence.pdf", sizeBytes: 4 }); }
      if (url.endsWith("/projects/p1")) return response(workspace);
      throw new Error(`Unexpected request ${url} ${init?.method ?? "GET"}`);
    }));
    render(<ExternalPortalWorkspace />);
    await screen.findByRole("heading", { name: "Project portal" });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Submit the scoped evidence file." } });
    const input = screen.getByLabelText("File") as HTMLInputElement;
    const selected = new File(["data"], "evidence.pdf", { type: "application/pdf", lastModified: 17 });
    fireEvent.change(input, { target: { files: [selected] } });
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Retry upload" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry upload" }));
    await screen.findByText("Upload saved as advisory evidence for staff review.");
    expect(uploadUrls).toHaveLength(1);
    expect(finalizeUrls).toEqual(["/api/v1/external-portal/uploads/upload-1/finalize", "/api/v1/external-portal/uploads/upload-1/finalize"]);
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes("/chunks/0"))).toHaveLength(1);
  });
  it("retries an ambiguously acknowledged chunk with the original retained file bytes", async () => {
    const starts: string[] = []; const chunkBodies: string[] = []; let chunkCount = 0;
    const workspace = { project: { id: "p1", title: "Granted project", status: "ACTIVE" }, grants: [{ id: "g1", portalType: "CONSULTANT", version: 1, revisionIds: ["r1"], releaseIds: [], packageIds: [], expiresAt: null, revokedAt: null, closeoutTaskId: null }], revisions: [], production: [], packages: [], requests: [], submissions: [], uploads: [], transmittals: [], cadShares: [], capabilities: { submit: false, upload: true, acknowledge: false } };
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/auth/session")) return response({ account: { id: "a1", email: "consultant@example.test", kind: "EXTERNAL" }, csrfToken: "csrf" });
      if (url.endsWith("/auth/sessions")) return response([]);
      if (url.endsWith("/projects")) return response({ projects: [{ id: "p1", title: "Granted project", status: "ACTIVE", portalType: "CONSULTANT" }] });
      if (url.endsWith("/projects/p1/uploads")) { starts.push(url); return response({ uploadId: "upload-2", chunkSize: 8 * 1024 * 1024 }); }
      if (url.includes("/uploads/upload-2/chunks/0")) { chunkCount++; chunkBodies.push(await (init?.body as Blob).text()); if (chunkCount === 1) throw new TypeError("Chunk acknowledgement lost after persistence"); return response({ index: 0, received: true }); }
      if (url.endsWith("/uploads/upload-2/finalize")) return response({ id: "retained-upload-2" });
      if (url.endsWith("/projects/p1")) return response(workspace);
      throw new Error("Unexpected request " + url);
    }));
    render(<ExternalPortalWorkspace />);
    await screen.findByRole("heading", { name: "Project portal" });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Submit exact file bytes." } });
    const input = screen.getByLabelText("File") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["original"], "same.pdf", { type: "application/pdf", lastModified: 23 })] } });
    await screen.findByRole("alert");
    fireEvent.change(input, { target: { files: [new File(["replaced"], "same.pdf", { type: "application/pdf", lastModified: 23 })] } });
    await screen.findByText("Upload saved as advisory evidence for staff review.");
    expect(starts).toHaveLength(1);
    expect(chunkBodies).toEqual(["original", "original"]);
  });

  it("shows exact grant scope and exposes CAD recording only to an Owner", async () => {
    const payload = { project: { id: "p1", title: "Studio", status: "ACTIVE", version: 2 }, grants: [{ id: "g1", email: "consultant@example.test", portalType: "CONSULTANT", version: 4, revisionIds: ["r1"], releaseIds: [], packageIds: [], expiresAt: "2026-11-01T00:00:00.000Z", revokedAt: null, closeoutTaskId: null }], revisionOptions: [{ id: "r1", title: "Plan", documentNumber: "A-01", series: "A", number: "1", fileName: "plan.pdf", cad: true }], releaseOptions: [], packageOptions: [], closeoutTaskOptions: [], requests: [], submissions: [], uploads: [], cadShares: [], capabilities: { manage: true, issueCad: true } };
    vi.stubGlobal("fetch", vi.fn(async () => response(payload)));
    window.history.replaceState({}, "", "?projectId=p1");
    const { rerender } = render(<StaffExternalAccessWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Studio" });
    expect(screen.queryByText("Record Owner-issued native CAD share")).not.toBeInTheDocument();
    rerender(<StaffExternalAccessWorkspace csrfToken="csrf" owner />);
    await waitFor(() => expect(screen.getByText("Record Owner-issued native CAD share")).toBeInTheDocument());
    expect(screen.getByText("Exact revision scope")).toBeInTheDocument();
    expect(screen.getByText("Exact release scope")).toBeInTheDocument();
    expect(screen.getByText("Exact package scope")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit exact scope and expiry" })).toBeInTheDocument();
  });

  it("saves a versioned grant scope update with exact allowlists and a reason", async () => {
    const payload = { project: { id: "p1", title: "Studio", status: "ACTIVE", version: 2 }, grants: [{ id: "g1", email: "consultant@example.test", portalType: "CONSULTANT", version: 4, revisionIds: ["r1"], releaseIds: [], packageIds: ["pkg1"], expiresAt: "2026-11-01T00:00:00.000Z", revokedAt: null, closeoutTaskId: null }], revisionOptions: [{ id: "r1", title: "Plan", documentNumber: "A-01", series: "A", number: "1", fileName: "plan.pdf" }], releaseOptions: [], packageOptions: [{ id: "pkg1", title: "Mockup" }], closeoutTaskOptions: [], requests: [], submissions: [], uploads: [], cadShares: [], capabilities: { manage: true, issueCad: false } };
    let changeBody: Record<string, unknown> | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/grants/g1/change")) { changeBody = JSON.parse(String(init?.body)) as Record<string, unknown>; return response({ ...payload.grants[0], version: 5 }); }
      return response(payload);
    }));
    window.history.replaceState({}, "", "?projectId=p1");
    render(<StaffExternalAccessWorkspace csrfToken="csrf-token" owner={false} />);
    await screen.findByRole("heading", { name: "Studio" });
    fireEvent.click(screen.getByRole("button", { name: "Edit exact scope and expiry" }));
    fireEvent.change(screen.getAllByLabelText("Reason")[0]!, { target: { value: "Add approved package access." } });
    fireEvent.click(screen.getByRole("button", { name: "Save scope change" }));
    await waitFor(() => expect(changeBody).toBeDefined());
    expect(changeBody).toMatchObject({ expectedVersion: 4, revisionIds: ["r1"], packageIds: ["pkg1"], reason: "Add approved package access." });
    expect(changeBody).toHaveProperty("releaseIds", []);
  });

  it("shows staff the plain-text request body and exact external submission context", async () => {
    const payload = { project: { id: "p1", title: "Studio", status: "ACTIVE", version: 2 }, grants: [{ id: "g1", email: "consultant@example.test", portalType: "CONSULTANT", version: 1, revisionIds: ["r1"], releaseIds: [], packageIds: [], expiresAt: null, revokedAt: null, closeoutTaskId: null }], revisionOptions: [{ id: "r1", title: "North entrance plan", documentNumber: "A-01", series: "A", number: "1", fileName: "a01.pdf" }], releaseOptions: [{ id: "rel1", label: "Batch 7" }], packageOptions: [], closeoutTaskOptions: [], requests: [{ id: "req1", grantId: "g1", title: "Review clearance", body: "Please comment on the clear width at the north entrance.", createdAt: "2026-10-04T10:00:00Z" }], submissions: [{ id: "sub1", grantId: "g1", kind: "REVIEW", title: "Clearance review", body: "The current detail appears adequate.", revisionId: "r1", createdAt: "2026-10-04T11:00:00Z" }], uploads: [], cadShares: [], capabilities: { manage: true, issueCad: false } };
    vi.stubGlobal("fetch", vi.fn(async () => response(payload)));
    window.history.replaceState({}, "", "?projectId=p1");
    render(<StaffExternalAccessWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByRole("heading", { name: "Studio" });
    expect(screen.getByText("Please comment on the clear width at the north entrance.")).toBeInTheDocument();
    expect(screen.getByText("The current detail appears adequate.")).toBeInTheDocument();
    expect(screen.getByText(/Exact context: A-01 · North entrance plan/)).toBeInTheDocument();
    expect(screen.getByText(/Exact context: A-01 · North entrance plan · consultant@example\.test/)).toBeInTheDocument();
    expect(screen.getByText("Revision IDs: r1")).toBeInTheDocument();
  });

  it("records an Owner-created native share and exposes unconfirmed revocation blockers", async () => {
    const base = { project: { id: "p1", title: "Studio", status: "ACTIVE", version: 2 }, grants: [{ id: "g1", email: "consultant@example.test", portalType: "CONSULTANT", version: 4, revisionIds: ["r1"], releaseIds: [], packageIds: [], expiresAt: null, revokedAt: null, closeoutTaskId: null }], revisionOptions: [{ id: "r1", title: "Plan", documentNumber: "A-01", series: "A", number: "1", fileName: "plan.dwg", cad: true }], releaseOptions: [], packageOptions: [], closeoutTaskOptions: [], requests: [], submissions: [], uploads: [], cadShares: [], capabilities: { manage: true, issueCad: true } };
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push({ url, init });
      if (url.endsWith("/cad-shares")) return response({ id: "share1" });
      if (url.includes("/projects/p1")) return response({ ...base, cadShares: [{ id: "share1", grantId: "g1", revisionId: "r1", nativeLinkId: "native-99", issuedAt: "2026-10-04T10:00:00Z", expiresAt: "2026-10-11T10:00:00Z", version: 1, revokedAt: null, revocationRequired: true }] });
      return response(base);
    }));
    window.history.replaceState({}, "", "?projectId=p1");
    render(<StaffExternalAccessWorkspace csrfToken="csrf-token" owner />);
    await screen.findByRole("heading", { name: "Studio" });
    fireEvent.change(screen.getAllByLabelText("Recipient grant")[1]!, { target: { value: "g1" } });
    fireEvent.change(screen.getByLabelText("Granted CAD revision"), { target: { value: "r1" } });
    fireEvent.change(screen.getByLabelText("Native link identity"), { target: { value: "native-99" } });
    fireEvent.change(screen.getByLabelText("Native URL"), { target: { value: "https://miniscloud.example/share/abc" } });
    fireEvent.change(screen.getByLabelText("Extraction code"), { target: { value: "code-123" } });
    fireEvent.change(screen.getAllByLabelText("Reason").at(-1)!, { target: { value: "Owner recorded the native share." } });
    fireEvent.click(screen.getByRole("button", { name: "Record share" }));
    await screen.findByText("Owner action required · native link native-99");
    const call = calls.find((entry) => entry.url.endsWith("/cad-shares"));
    expect(call?.init?.headers).toMatchObject({ "x-csrf-token": "csrf-token" });
    expect(JSON.parse(String(call?.init?.body))).toMatchObject({ grantId: "g1", revisionId: "r1", nativeLinkId: "native-99", expectedGrantVersion: 4, reason: "Owner recorded the native share." });
  });

  it("keeps native URL and extraction code out of the staff workspace until an Owner asks to reveal them", async () => {
    const payload = { project: { id: "p1", title: "Studio", status: "CANCELLED", version: 2 }, grants: [], revisionOptions: [], releaseOptions: [], packageOptions: [], closeoutTaskOptions: [], requests: [], submissions: [], uploads: [], cadShares: [{ id: "share1", grantId: "g1", revisionId: "r1", nativeLinkId: "native-1", issuedAt: "2026-10-01T00:00:00.000Z", expiresAt: "2026-10-08T00:00:00.000Z", version: 1, revokedAt: null, revocationRequired: true }], capabilities: { manage: true, issueCad: true } };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).endsWith("/cad-shares/share1")
      ? response({ id: "share1", url: "https://miniscloud.invalid/private", extractionCode: "private-code", expiresAt: "2026-10-08T00:00:00.000Z", warning: "Do not forward the native share." })
      : response(payload));
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "?projectId=p1");
    const { rerender } = render(<StaffExternalAccessWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByText("Owner action required · native link native-1");
    expect(screen.queryByText("private-code")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal native link details" })).not.toBeInTheDocument();
    rerender(<StaffExternalAccessWorkspace csrfToken="csrf" owner />);
    fireEvent.click(await screen.findByRole("button", { name: "Reveal native link details" }));
    await screen.findByText("Extraction code: private-code");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/external-access/cad-shares/share1", expect.objectContaining({ cache: "no-store" }));
  });
});
