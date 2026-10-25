/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { TaskWorkspace } from "../src/task";
import { MyWorkManagement } from "../src/my-work-attention";
import { MemoryRouter, Link } from "react-router-dom";
import { WorkspaceLayout } from "../src/workspace-navigation";
import "../src/styles.css";
import "../src/studio-theme.css";

// Read-only visual fixture: synthetic GET responses only, no authentication or database acceptance.
const setup = { actorEmployeeId: "employee-1", canAssign: true, employees: [{ id: "employee-1", name: "Test employee", homeBranchId: "branch-1" }], projects: [{ id: "project-1", title: "Verification project", branchId: "branch-1", status: "ACTIVE" }], planItems: [{ id: "stage-1", projectId: "project-1", kind: "STAGE", label: "Design development" }] };
const requestedRole = new URLSearchParams(location.search).get("role")?.toUpperCase() ?? (new URLSearchParams(location.search).has("owner") ? "OWNER" : "EMPLOYEE");
const owner = requestedRole === "OWNER";
const roleVariant = ["OWNER", "LEADER", "EMPLOYEE", "SITE"].includes(requestedRole) ? requestedRole : "EMPLOYEE";
const accountIds: Record<string, string> = { OWNER: "00000000-0000-4000-8000-000000000001", LEADER: "00000000-0000-4000-8000-000000000002", EMPLOYEE: "00000000-0000-4000-8000-000000000003", SITE: "00000000-0000-4000-8000-000000000004" };
setup.employees[0].name = roleVariant === "EMPLOYEE" ? "mw-i02-designer-long-technical-identifier@example.test" : `Synthetic ${roleVariant} employee`;
(setup as typeof setup & { creationProfile: { version: 1; variant: "OWNER" | "LEADER" | "EMPLOYEE" | "SITE"; resolution: "CONFIGURED_ROLE" } }).creationProfile = { version: 1, variant: roleVariant as "OWNER" | "LEADER" | "EMPLOYEE" | "SITE", resolution: "CONFIGURED_ROLE" };
const holds = Array.from({ length: 5 }, (_, index) => ({ id: `hold-${index}`, title: `Synthetic reassignment ${index + 1}`, projectTitle: null, reason: "Employee exit: a permitted manager must reassign this task before work resumes." }));
const records = Array.from({ length: 56 }, (_, index) => ({ id: `task-${index + 1}`, title: `Drawing coordination ${String(index + 1).padStart(2, "0")}`, priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"][index % 4], status: ["IN_PROGRESS", "WAITING", "CORRECTIONS_REQUIRED", "COMPLETED"][index % 4], targetDate: index % 8 === 0 ? "2026-10-10" : "2026-10-20", committedDueDate: index % 2 ? "2026-10-22" : null, type: "PROJECT", projectId: "project-1", planItemId: "stage-1", primaryOwnerEmployeeId: "employee-1", version: 1, createdAt: "2026-10-09", reviewRequirement: "NONE", tags: [], checklist: [] }));
function reply(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), location.origin);
  if (init?.method && init.method !== "GET") return reply({ message: "Fixture writes disabled." }, 403);
  if (url.pathname === "/api/v1/dashboard/sources/tasks") return reply({ source: "tasks", today: "2026-10-12", sections: [] });
  if (url.pathname.endsWith("/setup")) return reply(owner ? { ...setup, actorEmployeeId: null } : setup);
  if (url.pathname === "/api/v1/tasks/creation-options") return reply({ actorEmployeeId: owner ? null : setup.actorEmployeeId, project: setup.projects.find(project => project.id === url.searchParams.get("projectId")) ?? null, canAssign: setup.canAssign, canCreate: true, owners: setup.employees, collaborators: setup.employees, readAt: "2026-10-15T00:00:00Z" });
  if (url.pathname === "/api/v1/tasks") {
    if (owner) return reply({ total: 0, items: [] });
    const phase = url.searchParams.get("phase");
    const metric = url.searchParams.get("metric");
    const items = records.filter((task) => (!metric || metric !== "reviews" || ["SUBMITTED_INTERNAL_REVIEW", "IN_INTERNAL_REVIEW", "CORRECTIONS_REQUIRED", "SUBMITTED_CLIENT_REVIEW", "IN_CLIENT_REVIEW", "CLIENT_REVISION_REQUIRED"].includes(task.status)) && (!phase || phase === "active" && task.status !== "COMPLETED" || phase === "waiting" && task.status === "WAITING" || phase === "review" && task.status === "CORRECTIONS_REQUIRED" || phase === "completed" && task.status === "COMPLETED") && (!url.searchParams.get("dateFrom") || task.targetDate >= url.searchParams.get("dateFrom")!) && (!url.searchParams.get("dateTo") || task.targetDate <= url.searchParams.get("dateTo")!) && (!url.searchParams.get("status") || task.status === url.searchParams.get("status")) && (!url.searchParams.get("q") || task.title.toLowerCase().includes(url.searchParams.get("q")!.toLowerCase())));
    const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 50);
    return reply({ total: items.length, items: items.slice(offset, offset + limit) });
  }
  if (url.pathname === "/api/v1/reviews/inbox") {
    const all = Array.from({ length: 56 }, (_, index) => ({ roundId: `review-${index + 1}`, taskId: `task-${index + 1}`, taskTitle: `Review drawing ${String(index + 1).padStart(2, "0")}`, projectTitle: "Verification project", projectId: "project-1", roundNumber: 2, status: "PENDING", revisionLabel: "Revision B" }));
    const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 50);
    return reply({ total: all.length, items: all.slice(offset, offset + limit) });
  }
  if (url.pathname === "/api/v1/tasks/attention") {
    const kind = url.searchParams.get("kind");
    const all = kind === "reassignment" ? owner ? holds : [] : kind === "corrections" ? records.filter((item) => item.status === "CORRECTIONS_REQUIRED").map((item) => ({ id: item.id, title: item.title, projectTitle: "Verification project", reason: "Synthetic correction item" })) : [];
    const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 50);
    return reply({ total: all.length, items: all.slice(offset, offset + limit) });
  }
  if (url.pathname === "/api/v1/my-work/attention") {
    const source = url.searchParams.get("source") || "all";
    const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 25);
    const sources = ["task", "review", "approval"] as const;
    const counts = { task: source === "review" || source === "approval" ? { status: "excluded" } : { status: "ready", total: 56 }, review: source === "task" || source === "approval" ? { status: "excluded" } : { status: "ready", total: 56 }, approval: source === "task" || source === "review" ? { status: "excluded" } : { status: "ready", total: 3 } };
    const rows = sources.filter(key => counts[key].status === "ready").flatMap(key => Array.from({ length: counts[key].total }, (_, index) => key === "task" ? ({ source: key, sourceId: `task-${index + 1}`, taskId: `task-${index + 1}`, title: index === 0 && owner ? "Reassign employee-exit task" : `Synthetic actionable task ${index + 1}`, project: { id: "project-1", title: "Verification project" }, responsibility: owner && index === 0 ? "manager" : "primary_owner", reason: owner && index === 0 ? "reassignment_required" : "due_today", deadline: "2026-10-13T18:00:00Z", deadlineKind: "target_date" as const, priority: "HIGH", destination: "/my-work", isSubtask: false }) : key === "review" ? ({ source: key, sourceId: `review-${index + 1}`, roundId: `review-${index + 1}`, taskId: `task-${index + 1}`, title: `Synthetic review ${index + 1}`, project: { id: "project-1", title: "Verification project" }, responsibility: "assigned_reviewer", reason: "review_decision_required", deadline: "2026-10-15T18:00:00Z", deadlineKind: "review_date" as const, destination: "/reviews", isSubtask: false }) : ({ source: key, sourceId: `approval-${index + 1}`, requestId: `approval-${index + 1}`, title: `Synthetic decision ${index + 1}`, project: { id: "project-1", title: "Verification project" }, responsibility: "decision_authority", reason: "decision_required", deadline: "2026-10-19T18:00:00Z", deadlineKind: "decision_expiry" as const, destination: "/decisions", isSubtask: false })));
    const totalItems = Object.values(counts).reduce((sum, count) => sum + (count.status === "ready" ? count.total : 0), 0);
    const items = rows.slice(offset, offset + limit);
    return reply({ status: "ready", source, sourceCounts: counts, items, totalItems, offset, limit, hasMore: offset + limit < totalItems, readAt: "2026-10-13T12:00:00Z", timezone: "Asia/Calcutta" });
  }
  if (/\/subtasks$/.test(url.pathname)) return reply({ items: [{ id: "subtask-1", title: "Synthetic child task", status: "IN_PROGRESS", targetDate: "2026-10-20", primaryOwnerEmployeeId: "employee-1", primaryOwnerName: setup.employees[0].name, version: 1 }], parent: null, isSubtask: false, completionBlocked: false, canCreate: true, taskVersion: 1 });
  const task = records.find((item) => url.pathname.endsWith(`/${item.id}`));
  if (task) return reply({ task, collaborators: task.id === "task-1" ? [{ employeeId: "fixture-worker-2", name: "Synthetic Dev Shah" }, { employeeId: "fixture-worker-3", name: "Synthetic Asha Rao" }, { employeeId: "fixture-worker-4", name: "Synthetic Ravi Nair" } ] : [], history: { statusChanges: [], ownerChanges: [] }, capabilities: { edit: false, transition: false, reassign: false } });
  return reply({ total: 0, items: [] });
};

function Preview(): React.JSX.Element {
  const header = React.useRef<HTMLElement>(null);
  React.useLayoutEffect(() => {
    const element = header.current!;
    const update = (): void => document.documentElement.style.setProperty("--sense-header-height", `${element.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <MemoryRouter initialEntries={["/my-work"]}><div className="app-shell">
    <style>{`.fixture-note { position:fixed; z-index:30; right:6px; bottom:70px; padding:2px 5px; background:#fff; color:#61736b; border:1px solid #e8e8e2; border-radius:4px; font:9px system-ui; pointer-events:none; }`}</style>
    <header className="site-header" ref={header}>
      <Link to="/" className="brand" aria-label="Sense Studios home"><span className="brand-mark">S</span><span><strong>SENSE STUDIOS</strong><small>WORK MANAGEMENT</small></span></Link>
      <span className="phase-badge">IDENTITY</span>
      <div className="site-header-controls"><Link className="site-header-notifications" to="/notifications" aria-label="Notifications"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>Notifications</Link><button className="site-header-logout" type="button" disabled>Log out</button></div>
    </header>
    <WorkspaceLayout><main className="identity-content my-work-route">
      <TaskWorkspace csrfToken="fixture" owner={owner} accountId={accountIds[roleVariant]} listFirst personalOnly personalObligations={({ employeeLessOwner }) => <div className="my-work-obligations"><MyWorkManagement prioritizeReassignment={employeeLessOwner} /></div>} />
    </main></WorkspaceLayout>
    <span className="fixture-note">Synthetic read-only preview</span>
  </div></MemoryRouter>;
}
createRoot(document.getElementById("root")!).render(<Preview />);

