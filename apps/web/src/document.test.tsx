// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { DocumentWorkspace } from "./document.js";

const branch = { id: "branch-1", name: "Central" };
const projectOne = { id: "project-1", title: "Project One", status: "ACTIVE", branchId: branch.id, branch };
const projectTwo = { id: "project-2", title: "Project Two", status: "ACTIVE", branchId: branch.id, branch };
function response(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
function picker(items = [projectOne, projectTwo], total = items.length): unknown { return { branches: [branch], total, items }; }
function register(id: string, title: string, fileName = ""): unknown { return { project: { id, title }, folders: [], files: fileName ? [{ id: `${id}-file`, folderId: "folder-1", fileName, mimeType: "application/pdf", sizeBytes: 20, sha256: "hash", confidential: true, viewOnly: true, createdAt: "2026-10-01T00:00:00.000Z" }] : [], capabilities: { createFolder: false, upload: false, grant: false } }; }
afterEach(() => vi.unstubAllGlobals());

describe("DocumentWorkspace authorized project picker", () => {
  it("explains an empty document picker without claiming project access", async () => {
    window.history.replaceState({}, "", "/documents");
    vi.stubGlobal("fetch", vi.fn(async () => response({ branches: [], total: 0, items: [] })));
    render(<DocumentWorkspace csrfToken="csrf" owner={false} />);
    expect(await screen.findByText(/Project access and document access are separate/)).toBeInTheDocument();
  });
  it("opens an authorized project deep link beyond the first picker page using the protected register identity", async () => {
    const originalUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, "", "/documents?projectId=project-55");
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      if (url.startsWith("/api/v1/documents/project-picker?")) return response(picker([projectOne], 55));
      if (url.endsWith("/documents/projects/project-55")) return response(register("project-55", "Project Fifty Five", "authorized.pdf"));
      return response({}, 404);
    }));
    render(<StrictMode><DocumentWorkspace csrfToken="csrf" owner={false} /></StrictMode>);
    expect(await screen.findByRole("heading", { name: "Project Fifty Five" })).toBeInTheDocument();
    const pickerSelect = screen.getByLabelText("Document project");
    expect(pickerSelect).toHaveValue("project-55");
    expect(screen.getByRole("option", { name: "Project Fifty Five" })).toBeInTheDocument();
    expect(screen.getByText("authorized.pdf")).toBeInTheDocument();
    expect(calls.some((url) => url.endsWith("/documents/projects/project-55"))).toBe(true);
    const protectedReads = calls.filter((url) => url.endsWith("/documents/projects/project-55")).length;
    fireEvent.change(screen.getByLabelText("Document project branch"), { target: { value: branch.id } });
    await screen.findByText("Showing 1–1 of 55 projects");
    expect(calls.filter((url) => url.endsWith("/documents/projects/project-55"))).toHaveLength(protectedReads);
    window.history.replaceState({}, "", originalUrl || "/");
  });

  it.each([403, 404])("shows only generic denial when the deep-linked register returns %i", async (status) => {
    const originalUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, "", "/documents?projectId=project-55");
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      if (url.startsWith("/api/v1/documents/project-picker?")) return response(picker([projectOne], 55));
      if (url.endsWith("/documents/projects/project-55")) return response({ message: "forbidden" }, status);
      return response({}, 404);
    }));
    render(<StrictMode><DocumentWorkspace csrfToken="csrf" owner={false} /></StrictMode>);
    expect(await screen.findByRole("alert")).toHaveTextContent("not authorized");
    expect(screen.getByLabelText("Document project")).toHaveValue("");
    expect(screen.queryByRole("option", { name: "Project Fifty Five" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Project Fifty Five" })).not.toBeInTheDocument();
    expect(screen.queryByText("unauthorized.pdf")).not.toBeInTheDocument();
    expect(calls.some((url) => url.endsWith("/documents/projects/project-55"))).toBe(true);
    window.history.replaceState({}, "", originalUrl || "/");
  });

  it("uses the staff-safe picker endpoint and requests the next page beyond 50", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      if (url.startsWith("/api/v1/documents/project-picker?")) {
        if (url.includes("offset=50")) return response(picker([projectTwo], 51));
        return response(picker([projectOne], 51));
      }
      if (url.endsWith("/project-1")) return response(register("project-1", "Project One"));
      return response({}, 404);
    }));
    render(<DocumentWorkspace csrfToken="csrf" owner={false} />);
    await screen.findByLabelText("Document project branch");
    expect(calls.some((url) => url.includes("/projects/setup"))).toBe(false);
    fireEvent.change(screen.getByLabelText("Document project branch"), { target: { value: branch.id } });
    await waitFor(() => expect(screen.getByText("Showing 1–1 of 51 projects")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(screen.getByText("Showing 51–51 of 51 projects")).toBeInTheDocument());
    expect(calls.some((url) => url.includes("offset=50") && url.includes("limit=50") && url.includes("branchId=branch-1"))).toBe(true);
    expect(calls.every((url) => !url.includes("/api/v1/projects?"))).toBe(true);
    fireEvent.change(screen.getByLabelText("Search project titles"), { target: { value: "One" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(calls.some((url) => url.includes("q=One") && url.includes("offset=0"))).toBe(true));
    fireEvent.click(await screen.findByRole("button", { name: "Clear search" }));
    await waitFor(() => expect(calls.some((url) => url.includes("branchId=branch-1") && !url.includes("q=") && !url.includes("offset=50"))).toBe(true));
  });

  it("ignores a late register response after a newer project is selected", async () => {
    let resolveFirst!: (value: Response) => void;
    const firstRegister = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/v1/documents/project-picker?")) return Promise.resolve(response(picker()));
      if (url.endsWith("/project-1")) return firstRegister;
      if (url.endsWith("/project-2")) return Promise.resolve(response(register("project-2", "Project Two", "current.pdf")));
      return Promise.resolve(response({}, 404));
    }));
    render(<DocumentWorkspace csrfToken="csrf" owner={false} />);
    fireEvent.change(await screen.findByLabelText("Document project branch"), { target: { value: branch.id } });
    await screen.findByText("Showing 1–2 of 2 projects");
    const pickerSelect = await screen.findByLabelText("Document project");
    fireEvent.change(pickerSelect, { target: { value: "project-1" } });
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/v1/documents/projects/project-1", expect.anything()));
    fireEvent.change(pickerSelect, { target: { value: "project-2" } });
    expect(await screen.findByRole("heading", { name: "Project Two" })).toBeInTheDocument();
    resolveFirst(response(register("project-1", "Project One", "stale.pdf")));
    await waitFor(() => expect(screen.queryByText("stale.pdf")).not.toBeInTheDocument());
    expect(screen.getByText("current.pdf")).toBeInTheDocument();
  });

  it("clears the prior register and confidential grants after exact project denial", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      if (url.endsWith("/projects/setup")) return response({ branches: [branch], employees: [{ id: "employee-1", name: "Asha", homeBranchId: branch.id }] });
      if (url.startsWith("/api/v1/documents/project-picker?")) return response(picker());
      if (url.endsWith("/documents/projects/project-1")) return response({ project: { id: "project-1", title: "Project One" }, folders: [], files: [{ id: "secret-id", folderId: "folder-1", fileName: "confidential.pdf", mimeType: "application/pdf", sizeBytes: 20, sha256: "hash", confidential: true, viewOnly: true, createdAt: "2026-10-01T00:00:00.000Z" }], capabilities: { createFolder: false, upload: false, grant: true } });
      if (url.endsWith("/project-1/grants")) return response({ items: [{ id: "grant-1", resourceKind: "FILE", resourceId: "secret-id", employeeId: "employee-1", reason: "Approved access", grantedAt: "2026-10-01T00:00:00.000Z" }] });
      if (url.endsWith("/documents/projects/project-2")) return response({ message: "forbidden" }, 403);
      return response({}, 404);
    }));
    render(<DocumentWorkspace csrfToken="csrf" owner />);
    fireEvent.change(await screen.findByLabelText("Document project branch"), { target: { value: branch.id } });
    await screen.findByText("Showing 1–2 of 2 projects");
    const pickerSelect = await screen.findByLabelText("Document project");
    fireEvent.change(pickerSelect, { target: { value: "project-1" } });
    expect((await screen.findAllByText("confidential.pdf")).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Approved access/)).toBeInTheDocument();
    fireEvent.change(pickerSelect, { target: { value: "project-2" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("not authorized");
    expect(screen.queryByText("confidential.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText("Approved access")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Active grants" })).not.toBeInTheDocument();
    expect(calls.some((url) => url.endsWith("/project-1/grants"))).toBe(true);
  });
});
