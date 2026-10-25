/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TaskWorkspace } from "../src/task";
import { DashboardWorkspace } from "../src/dashboard";
import "../src/styles.css";
import "../src/studio-theme.css";

const mode = new URLSearchParams(location.search).get("view") ?? "tasks";

if (mode === "dashboard") {
  const accountId = "11111111-1111-4111-8111-111111111111";
  // Stub the dashboard endpoints.
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), location.origin);
    const p = url.pathname;
    const sections = (key: string, rows: unknown[] = [], unavailable?: string) => ({ key, label: key, rows, unavailable });
    const src = (source: string, extra: unknown = {}) => ({ source, today: "2026-10-24", readCompletedAt: new Date().toISOString(), sections: [], ...extra });
    if (init?.method && init.method !== "GET") return new Response(JSON.stringify({ message: "Synthetic writes disabled" }), { status: 403, headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/reports/context") return new Response(JSON.stringify({ categories: [{ key: "employee", label: "Employee" }], eventNames: [], owner: false }), { headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/dashboard/schedules") return new Response(JSON.stringify({ rules: [] }), { headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/dashboard/reminders") return new Response(JSON.stringify({ reminders: [] }), { headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/dashboard/summaries") return new Response(JSON.stringify({ summaries: [] }), { headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/reports/snapshots") return new Response(JSON.stringify({ snapshots: [] }), { headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/performance/context") return new Response(JSON.stringify({ employees: [], owner: false, employeeId: null }), { headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/reviews/inbox") return new Response(JSON.stringify({ total: 0, items: [] }), { headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/dashboard/sources/tasks") return new Response(JSON.stringify(src("tasks", { sections: [
      sections("overdue", [{ id: "task-1", label: "Coordinate drawing 1", status: "IN_PROGRESS", date: "2026-10-20" }]),
      sections("today", [{ id: "task-2", label: "Confirm electrical dimensions", status: "NOT_STARTED", date: "2026-10-24" }]),
      sections("priority", [{ id: "task-3", label: "Critical client revision", status: "WAITING", date: "2026-10-18" }]),
      sections("waiting", [{ id: "task-3", label: "Critical client revision", status: "WAITING", date: "2026-10-18" }]),
      sections("attention", [{ id: "task-1", label: "Coordinate drawing 1", status: "IN_PROGRESS", date: "2026-10-20" }]),
      sections("reviews", [{ id: "task-4", label: "Submit for review", status: "IN_INTERNAL_REVIEW", date: "2026-10-24" }]),
    ] as unknown as Record<string, unknown> })), { headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/dashboard/sources/decisions") return new Response(JSON.stringify({ source: "decisions", today: "2026-10-24", readCompletedAt: new Date().toISOString(), sections: [], decisions: { items: [{ id: "a1", title: "Approve task closeout", summary: "Ready for review", requesterLabel: "Asha", levelLabel: "Owner", typeKey: "TASK_CLOSEOUT", route: "/my-work" }], nextCursor: null } }), { headers: { "Content-Type": "application/json" } });
    if (p === "/api/v1/dashboard/sources/health") return new Response(JSON.stringify(src("health", { sections: [sections("health", [{ id: "proj-1", label: "Riverside Residence", status: "ON_TRACK", value: "Phase 2", score: 82, scoreScale: { min: 0, max: 100 } }])] as unknown as Record<string, unknown> })), { headers: { "Content-Type": "application/json" } });
    if (p.match(/^\/api\/v1\/dashboard\/sources\/(site|workload|training)/)) return new Response(JSON.stringify(src(p.split("/").pop()!, {})), { headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
  };
  createRoot(document.getElementById("root")!).render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="*" element={<DashboardWorkspace accountId={accountId} csrfToken="synthetic" owner={false} />} />
      </Routes>
    </MemoryRouter>,
  );
} else {
// Synthetic read-only data — no authentication, no PostgreSQL.
const self = "11111111-1111-4111-8111-111111111111";
const helper = "22222222-2222-4222-8222-222222222222";
const project = { id: "33333333-3333-4333-8333-333333333333", title: "Riverside Residence", status: "ACTIVE", branchId: "branch-central", canApproveCloseout: false };
const people = [
  { id: self, name: "asha@example.test", homeBranchId: "branch-central", homeTeamId: "team-mumbai", homeTeamName: "Mumbai studio" },
  { id: helper, name: "dev@example.test", homeBranchId: "branch-central", homeTeamId: "team-delhi", homeTeamName: "Delhi office" },
];
const planItem = { id: "44444444-4444-4444-8444-444444444444", projectId: project.id, kind: "STAGE", label: "Design coordination" };
const records = Array.from({ length: 6 }, (_, i) => ({
  id: `50000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  title: `Coordinate drawing ${i + 1}`,
  description: i === 0 ? "Confirm electrical dimensions" : "Confirm the agreed drawing package",
  type: "PROJECT",
  priority: ["HIGH", "CRITICAL", "MEDIUM", "LOW"][i % 4],
  status: i === 0 ? "IN_PROGRESS" : i === 1 ? "WAITING" : i === 2 ? "CORRECTIONS_REQUIRED" : i === 3 ? "IN_INTERNAL_REVIEW" : i === 4 ? "CLIENT_APPROVED" : "NOT_STARTED",
  targetDate: "2026-10-15",
  committedDueDate: i === 0 ? "2026-10-20" : null,
  waitingReason: i === 1 ? "Awaiting client drawings" : null,
  waitingDelayCause: i === 1 ? "Client schedule" : null,
  waitingResponsibleParty: i === 1 ? "Client" : null,
  isSubtask: i === 5,
  requiresReassignment: i === 3,
  projectId: project.id,
  planItemId: i < 4 ? planItem.id : null,
  primaryOwnerEmployeeId: i % 2 === 0 ? self : helper,
  primaryOwner: { account: { normalizedEmail: i % 2 === 0 ? "asha@example.test" : "dev@example.test" } },
  version: 1,
  reviewRequirement: i % 3 === 0 ? "INTERNAL" : "NONE",
  createdAt: "2026-10-01",
  tags: i === 0 ? ["drawings"] : [],
  checklist: i === 0 ? [{ label: "Review dimensions", checked: true }, { label: "Confirm load cases", checked: false }] : [],
  collaborators: i % 2 === 0 ? [{ employeeId: helper, name: "dev@example.test", estimatedHours: 4 }] : [],
}));
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), location.origin);
  if (init?.method && init.method !== "GET") return reply({ message: "Synthetic writes disabled" }, 403);
  const p = url.pathname;
  if (p === "/api/v1/tasks/setup") return reply({ actorEmployeeId: self, canAssign: false, projects: [project], employees: people, planItems: [planItem], creationProfile: { version: 1, variant: "LEADER", resolution: "CONFIGURED_ROLE" } });
  if (p === "/api/v1/tasks/creation-options") return reply({ actorEmployeeId: self, canAssign: false, canCreate: true, project, owners: [people[0]], collaborators: [people[1]], readAt: "2026-10-15T00:00:00Z" });
  if (p === "/api/v1/dashboard/sources/tasks") return reply({ source: "tasks", today: "2026-10-24", sections: [] });
  if (p === "/api/v1/dashboard/sources/site") return reply({ source: "site", today: "2026-10-24", sections: [] });
  if (p === "/api/v1/tasks/attention") return reply({ status: "ready", items: [], total: 0, offset: 0, limit: 25, hasMore: false, readAt: "2026-10-15T00:00:00Z" });
  if (p === "/api/v1/my-work/attention") return reply({ status: "ready", source: "all", sourceCounts: {}, items: [], totalItems: 0, offset: 0, limit: 25, hasMore: false, readAt: "2026-10-15T00:00:00Z", timezone: "Asia/Kolkata" });
  if (p === "/api/v1/reviews/inbox") return reply({ items: [], total: 0 });
  if (p === "/api/v1/tasks") {
    const scope = url.searchParams.get("scope");
    const items = scope === "assigned" ? records.filter((t) => t.primaryOwnerEmployeeId !== self) : records;
    return reply({ total: items.length, items });
  }
  if (p.match(/^\/api\/v1\/tasks\/[0-9a-f-]+\/subtasks$/)) return reply({ items: [], parent: null, isSubtask: false, completionBlocked: false, canCreate: true, taskVersion: 1 });
  if (p.match(/^\/api\/v1\/tasks\/[0-9a-f-]+$/)) {
    const match = records.find((t) => t.id.endsWith(p.split("/").pop()!.slice(-4)) || p.endsWith(t.id));
    const t = match ?? records[0];
    return reply({
      task: t,
      people: { assignedBy: { name: "asha@example.test", kind: "OWNER" }, collaboratorAdders: [] },
      collaborators: t.collaborators,
      history: {
        statusChanges: [{ id: "h1", reason: "Moved to in progress", fromStatus: "NOT_STARTED", toStatus: "IN_PROGRESS", occurredAt: "2026-10-02T09:00:00Z" }],
        ownerChanges: [],
      },
      extensions: [],
      dependencies: { predecessors: [{ id: "44444444-0000-4000-8000-000000000001", title: "Site survey", status: "IN_PROGRESS" }], hasUnfinished: true, hiddenCount: 0 },
      closeoutApproval: null,
      capabilities: { edit: true, transition: true, reassign: true, wait: true, resume: true, changeCommittedDate: true, requestExtension: true, manageDependencies: true, revokeCloseout: false },
    });
  }
  return reply({}, 404);
};
createRoot(document.getElementById("root")!).render(
  <MemoryRouter>
    <main className="identity-content tasks-route">
      <div className="workspace-account-heading"><span>Tasks</span><span>fixture@example.test</span></div>
      <TaskWorkspace csrfToken="synthetic-no-write" owner={false} listFirst />
    </main>
  </MemoryRouter>,
);
}
