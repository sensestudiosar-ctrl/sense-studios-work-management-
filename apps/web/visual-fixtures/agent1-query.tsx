/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { TaskWorkspace } from "../src/task";
import { ProjectWorkspace } from "../src/project";
import "../src/styles.css";
import "../src/studio-theme.css";

// Synthetic read-only data. These views do not authenticate or access PostgreSQL.
const self = "11111111-1111-4111-8111-111111111111", helper = "22222222-2222-4222-8222-222222222222";
const project = { id: "33333333-3333-4333-8333-333333333333", title: "Studio residence", status: "ACTIVE", deliveryType: "DESIGN", version: 3, branch: { id: "branch", name: "Mumbai" }, scopes: [] };
const people = [{ id: self, accountId: self, name: "designer@example.test", homeBranchId: "branch" }, { id: helper, accountId: helper, name: "coordination.helper.with.long.email@example.test", homeBranchId: "branch" }];
const planItem = { id: "44444444-4444-4444-8444-444444444444", projectId: project.id, kind: "STAGE", label: "Design coordination" };
const records = Array.from({ length: 6 }, (_, i) => ({ id: `50000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, title: `Coordinate drawing ${i + 1}`, description: i === 0 ? "Confirm electrical dimensions" : "Confirm the agreed drawing package", type: "PROJECT", priority: ["HIGH", "CRITICAL", "MEDIUM", "LOW"][i % 4], status: i % 3 === 2 ? "WAITING" : "IN_PROGRESS", targetDate: "2026-10-15", projectId: project.id, planItemId: planItem.id, primaryOwnerEmployeeId: self, primaryOwner: { account: { normalizedEmail: people[0].name } }, version: 1, reviewRequirement: "NONE", createdAt: "2026-10-15", tags: [], checklist: [], collaborators: i % 2 === 0 ? [helper] : [] }));
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
function selected(value: string | null) { return value ? value.split(",") : []; }
function taskRows(query: URLSearchParams) {
  const p = selected(query.get("priorities")), c = selected(query.get("collaboratorEmployeeIds")), q = query.get("q")?.toLowerCase();
  const phase = query.get("phase"), metric = query.get("metric");
  const items = records.filter(task => (!p.length || p.includes(task.priority)) && (!c.length || task.collaborators.some(id => c.includes(id))) && (!q || [task.title, task.description, project.title, planItem.label, task.id].some(text => text.toLowerCase().includes(q))) && (!phase || phase === "active" || phase === "waiting" && task.status === "WAITING") && (!metric || metric !== "reviews") && (!query.get("dateTo") || task.targetDate <= query.get("dateTo")!));
  return query.get("sort") === "priority_desc" ? items.sort((a, b) => priorities.indexOf(b.priority) - priorities.indexOf(a.priority) || a.id.localeCompare(b.id)) : items;
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), location.origin), query = url.searchParams;
  if (init?.method && init.method !== "GET") return reply({ message: "Synthetic writes disabled" }, 403);
  if (url.pathname === "/api/v1/project-templates") return reply({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
  if (url.pathname.endsWith("/plan")) return reply({ plan: null, items: [], history: [], capabilities: { complete: false, override: false } });
  if (url.pathname === "/api/v1/projects/setup") return reply({ branches: [project.branch], employees: people });
  if (url.pathname === "/api/v1/projects") return reply({ total: 1, items: [project] });
  if (url.pathname === `/api/v1/projects/${project.id}`) return reply({ project, assignments: [], capabilities: {} });
  if (url.pathname === "/api/v1/tasks/setup") return reply({ actorEmployeeId: self, canAssign: false, employees: people, projects: [project], planItems: [planItem] });
  if (url.pathname === "/api/v1/tasks/creation-options") return reply({ actorEmployeeId: self, canAssign: false, canCreate: true, project, owners: [people[0]], collaborators: [], readAt: "2026-10-15T00:00:00Z" });
  if (url.pathname === "/api/v1/dashboard/sources/tasks") return reply({ source: "tasks", today: "2026-10-15", sections: [] });
  if (url.pathname === "/api/v1/tasks") { const items = taskRows(query); const offset = Number(query.get("offset") || 0), limit = Number(query.get("limit") || 50); return reply({ total: items.length, items: items.slice(offset, offset + limit) }); }
  if (url.pathname === "/api/v1/my-work/attention") {
    const taskOnly = query.has("priorities") || query.has("collaboratorEmployeeIds") || query.has("status") || query.has("phase");
    const source = taskOnly ? "task" : query.get("source") ?? "all";
    const rows: Array<Record<string, unknown>> = taskRows(query).filter(task => task.status !== "WAITING").map(task => ({ source: "task", sourceId: task.id, taskId: task.id, title: task.title, project: { id: project.id, title: project.title }, responsibility: "primary_owner", reason: "due_today", deadline: "2026-10-15T00:00:00Z", deadlineKind: "target_date", priority: task.priority, status: task.status, destination: `/my-work?taskId=${task.id}` }));
    rows.push({ source: "review", sourceId: "round-a", roundId: "round-a", taskId: records[0].id, title: "Review coordinated drawings", project: { id: project.id, title: project.title }, responsibility: "assigned_reviewer", reason: "review_decision_required", deadline: "2026-10-15T00:00:00Z", deadlineKind: "review_date", destination: "/reviews" });
    rows.push({ source: "approval", sourceId: "request-a", requestId: "request-a", title: "Decide the pending request", responsibility: "decision", reason: "decision_required", deadline: null, deadlineKind: "decision_expiry", destination: "/decisions" });
    const included = rows.filter(row => source === "all" || row.source === source), offset = Number(query.get("offset") || 0), limit = Number(query.get("limit") || 25);
    return reply({ status: "ready", source, sourceCounts: Object.fromEntries(["task", "review", "approval"].map(key => [key, source === "all" || source === key ? { status: "ready", total: included.filter(row => row.source === key).length } : { status: "excluded" }])), items: included.slice(offset, offset + limit), totalItems: included.length, offset, limit, hasMore: offset + limit < included.length, readAt: "2026-10-15T00:00:00Z", timezone: "Asia/Kolkata" });
  }
  return reply({}, 404);
};
const projectMode = new URLSearchParams(location.search).get("mode") === "project";
if (projectMode) { const query = new URLSearchParams(location.search); query.set("projectId", project.id); query.set("projectSection", "tasks"); query.set("q", "Studio"); query.set("sort", "milestone"); history.replaceState(null, "", `${location.pathname}?${query}`); }
createRoot(document.getElementById("root")!).render(<MemoryRouter><main className={`identity-content${projectMode ? "" : " my-work-route"}`}><p>Synthetic query preview · no authentication</p>{projectMode ? <ProjectWorkspace csrfToken="synthetic-no-write" owner listFirst initialProjectId={project.id} /> : <TaskWorkspace csrfToken="synthetic-no-write" owner={false} accountId={self} listFirst personalOnly />}</main></MemoryRouter>);
