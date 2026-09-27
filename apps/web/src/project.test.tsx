import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProjectWorkspace } from "./project.js";

afterEach(() => vi.unstubAllGlobals());
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("ProjectWorkspace", () => {
  it("creates a Won-lead Draft project with multiple baseline scopes and CSRF", async () => {
    const branch = { id: "branch-1", name: "Mumbai" };
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input); calls.push([url, init]);
      if (url === "/api/v1/projects/setup") return response({ branches: [branch] });
      if (url.startsWith("/api/v1/projects?")) return response({ total: 0, items: [] });
      if (url === "/api/v1/projects" && init?.method === "POST") return response({ project: { id: "project-1" } }, 201);
      return response({}, 404);
    }));
    render(<ProjectWorkspace csrfToken="csrf-project" owner />);
    await screen.findByText("No projects for this branch yet.");
    fireEvent.change(screen.getByLabelText("Project title"), { target: { value: "Studio renovation" } });
    fireEvent.change(screen.getByLabelText("Delivery type"), { target: { value: "TURNKEY" } });
    fireEvent.change(screen.getByLabelText("Initial service scopes"), { target: { value: "Architecture\nInterior design" } });
    fireEvent.change(screen.getByLabelText("Won lead ID"), { target: { value: "lead-won-1" } });
    fireEvent.change(screen.getByLabelText("Creation reason"), { target: { value: "Won proposal accepted" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Draft project" }));
    await waitFor(() => expect(calls.some(([url, init]) => url === "/api/v1/projects" && init?.method === "POST")).toBe(true));
    const init = calls.find(([url]) => url === "/api/v1/projects")?.[1];
    expect(init?.headers).toMatchObject({ "X-CSRF-Token": "csrf-project" });
    expect(JSON.parse(String(init?.body))).toEqual({ branchId: branch.id, title: "Studio renovation", deliveryType: "TURNKEY", scopes: ["Architecture", "Interior design"], wonLeadId: "lead-won-1", reason: "Won proposal accepted" });
  });

  it("shows the Owner access denial from setup", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 403)));
    render(<ProjectWorkspace csrfToken="csrf" owner />);
    expect(await screen.findByRole("alert")).toHaveTextContent("You need Owner access to manage projects.");
  });

  it("does not request or render project data for staff", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<ProjectWorkspace csrfToken="csrf" owner={false} />);
    expect(container).toBeEmptyDOMElement(); expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores a stale Branch response after the Owner switches branches", async () => {
    const first = { id: "branch-1", name: "Mumbai" }, second = { id: "branch-2", name: "Pune" };
    let finishFirst: ((value: Response) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/v1/projects/setup") return Promise.resolve(response({ branches: [first, second] }));
      if (url.includes(`branchId=${first.id}`)) return new Promise<Response>((resolve) => { finishFirst = resolve; });
      if (url.includes(`branchId=${second.id}`)) return Promise.resolve(response({ total: 1, items: [{ id: "new", title: "Pune project", status: "DRAFT", deliveryType: "DESIGN", scopes: [], branch: second }] }));
      return Promise.resolve(response({}, 404));
    }));
    render(<ProjectWorkspace csrfToken="csrf" owner />);
    await waitFor(() => expect(finishFirst).toBeDefined());
    fireEvent.change(screen.getByLabelText("Project branch"), { target: { value: second.id } });
    expect(await screen.findByText("Pune project")).toBeInTheDocument();
    finishFirst!(response({ total: 1, items: [{ id: "old", title: "Mumbai project", status: "DRAFT", deliveryType: "DESIGN", scopes: [], branch: first }] }));
    await waitFor(() => expect(screen.queryByText("Mumbai project")).not.toBeInTheDocument());
    expect(screen.getByText("Pune project")).toBeInTheDocument();
  });
});
