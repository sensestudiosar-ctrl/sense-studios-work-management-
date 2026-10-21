import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectWorkspace } from "./project.js";

const response = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 });
const project = { id: "project-loading-race", title: "Direct project must open", status: "ACTIVE", deliveryType: "DESIGN", version: 1, scopes: [], branch: { id: "branch-1", name: "Mumbai" } };

describe("Project directory and pending detail isolation", () => {
  it("clears pending detail loading on Back and ignores its late result", async () => {
    window.history.replaceState(null, "", `/projects?projectId=${project.id}`);
    let finishDetail!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v1/projects/setup") return Promise.resolve(response({ owner: false, branches: [project.branch] }));
      if (url.startsWith("/api/v1/projects?")) return Promise.resolve(response({ total: 1, items: [project] }));
      if (url === `/api/v1/projects/${project.id}`) return new Promise<Response>(done => { finishDetail = done; });
      if (url === "/api/v1/project-templates") return Promise.resolve(response({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } }));
      return Promise.resolve(new Response("{}", { status: 404 }));
    }));
    render(<ProjectWorkspace csrfToken="csrf" owner={false} listFirst initialProjectId={project.id} />);
    await waitFor(() => expect(finishDetail).toBeTypeOf("function"));
    fireEvent.click(screen.getByRole("button", { name: "← Back to projects" }));
    expect(screen.queryByText("Loading project details…")).not.toBeInTheDocument();
    await act(async () => finishDetail(response({ project, capabilities: {} })));
    expect(screen.queryByRole("heading", { name: project.title })).not.toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.has("projectId")).toBe(false);
  });

  it("keeps a direct Project detail read and directory page when a later setup read completes", async () => {
    window.history.replaceState(null, "", `/projects?projectId=${project.id}&q=Existing&offset=50`);
    let setupReads = 0; const pages: string[] = [];
    let finishSetup!: (value: Response) => void, finishDetail!: (value: Response) => void;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v1/projects/setup") {
        setupReads++;
        if (setupReads === 1) return Promise.resolve(response({ owner: false, branches: [project.branch] }));
        return new Promise<Response>(done => { finishSetup = done; });
      }
      if (url.startsWith("/api/v1/projects?")) { pages.push(new URL(url, "https://sense.invalid").searchParams.get("offset")!); return Promise.resolve(response({ total: 0, items: [] })); }
      if (url === `/api/v1/projects/${project.id}`) return new Promise<Response>(done => { finishDetail = done; });
      if (url.endsWith("/plan")) return Promise.resolve(response({ plan: null, items: [], history: [], capabilities: {} }));
      if (url === "/api/v1/project-templates") return Promise.resolve(response({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } }));
      return Promise.resolve(new Response("{}", { status: 404 }));
    }));
    render(<StrictMode><ProjectWorkspace csrfToken="csrf" owner={false} listFirst initialProjectId={project.id} /></StrictMode>);
    await waitFor(() => { expect(setupReads).toBe(2); expect(finishDetail).toBeTypeOf("function"); });
    await act(async () => finishSetup(response({ owner: false, branches: [project.branch] })));
    await waitFor(() => expect(pages.length).toBeGreaterThanOrEqual(2));
    await act(async () => finishDetail(response({ project, capabilities: {}, assignments: [] })));
    expect(await screen.findByRole("heading", { name: project.title })).toBeVisible();
    expect(screen.queryByText("Loading project details…")).not.toBeInTheDocument();
    expect(pages.every(page => page === "50")).toBe(true);
    expect(new URL(window.location.href).searchParams.get("q")).toBe("Existing");
  });
});
