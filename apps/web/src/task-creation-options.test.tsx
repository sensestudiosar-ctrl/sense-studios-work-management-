import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { useTaskCreationOptions } from "./task-creation-options.js";
beforeEach(() => vi.restoreAllMocks());
const response = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });
function choices(projectId: string) { return { actorEmployeeId: "self", project: projectId ? { id: projectId, title: projectId, status: "ACTIVE" } : null, canAssign: false, canCreate: true, owners: [{ id: "self", name: `${projectId} self`, homeBranchId: "branch" }], collaborators: [], readAt: "2026-10-15T00:00:00Z" }; }
function Probe({ projectId }: { projectId: string }): React.JSX.Element {
  const read = useTaskCreationOptions(true, projectId);
  return <><p>{read.status}</p>{read.options?.owners.map(person => <span key={person.id}>{person.name}</span>)}{read.error && <p role="alert">{read.error}</p>}<button onClick={read.retry}>Retry</button></>;
}
describe("context-specific participant reads", () => {
  it("ignores a late previous-project read after the selected context changes", async () => {
    let oldRead: ((value: Response) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn(async input => String(input).includes("projectId=old") ? new Promise<Response>(resolve => { oldRead = resolve; }) : response(choices("new"))));
    const view = render(<Probe projectId="old" />); await waitFor(() => expect(oldRead).toBeDefined());
    view.rerender(<Probe projectId="new" />);
    expect(await screen.findByText("new self")).toBeInTheDocument();
    await act(async () => oldRead!(response(choices("old"))));
    expect(screen.queryByText("old self")).not.toBeInTheDocument();
  });
  it("clears options on a denied retry and can recover with a permitted fresh read", async () => {
    let status = 200; vi.stubGlobal("fetch", vi.fn(async () => response(choices("project"), status)));
    render(<Probe projectId="project" />); await screen.findByText("project self");
    status = 403; fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/do not have access/);
    expect(screen.queryByText("project self")).not.toBeInTheDocument();
    status = 200; fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("project self")).toBeInTheDocument();
  });
  it("rejects response context mismatch instead of presenting someone else's choices", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(choices("different-project"))));
    render(<Probe projectId="project" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/);
    expect(screen.queryByText("different-project self")).not.toBeInTheDocument();
  });
});
