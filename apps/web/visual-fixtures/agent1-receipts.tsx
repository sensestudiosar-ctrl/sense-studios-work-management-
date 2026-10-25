/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { TaskWorkspace } from "../src/task";
import "../src/styles.css";
import "../src/studio-theme.css";

// Memory-only response-loss simulation, no real authentication, API or database.
const mode = new URLSearchParams(location.search).get("mode") ?? "personal";
const parentId = "33333333-3333-4333-8333-333333333333", childId = "44444444-4444-4444-8444-444444444444";
const project = { id: "11111111-1111-4111-8111-111111111111", title: "Studio residence", status: "ACTIVE" };
const employee = { id: "22222222-2222-4222-8222-222222222222", name: "designer@example.test", homeBranchId: "branch" };
const records: Array<Record<string, unknown>> = [{ id: parentId, title: "Coordinate the living room drawings", projectId: project.id, primaryOwnerEmployeeId: employee.id, type: "PROJECT", priority: "HIGH", targetDate: "2026-10-20", status: "NOT_STARTED", reviewRequirement: "NONE", version: 1, tags: [], checklist: [], createdAt: "2026-10-15" }];
const receipts = new Map<string, { body: string; result: unknown }>();
const stats = { writes: 0, persisted: 0, sameRequest: true };
Object.assign(window, { receiptFixtureStats: stats });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), location.origin);
  if (init?.method === "POST" && (url.pathname === "/api/v1/tasks" || url.pathname === `/api/v1/tasks/${parentId}/subtasks`)) {
    stats.writes++;
    const body = JSON.parse(String(init.body));
    const prior = receipts.get(body.idempotencyKey);
    if (prior) { stats.sameRequest &&= prior.body === String(init.body); return prior.body === String(init.body) ? reply(prior.result) : reply({ message: "Retry details conflict" }, 409); }
    const task = { ...records[0], ...body, id: childId, primaryOwnerEmployeeId: employee.id, createdById: "actor" };
    records.push(task); stats.persisted++;
    const result = mode === "subtask" ? { task, parentVersion: 2 } : task;
    receipts.set(body.idempotencyKey, { body: String(init.body), result });
    throw new TypeError("Synthetic response loss after memory-only commit");
  }
  if (init?.method && init.method !== "GET") return reply({ message: "Other synthetic writes disabled" }, 403);
  if (url.pathname === "/api/v1/tasks/setup") return reply({ actorEmployeeId: employee.id, canAssign: false, employees: [employee], projects: [project], planItems: [] });
  if (url.pathname === "/api/v1/tasks/creation-options") return reply({ actorEmployeeId: employee.id, canAssign: false, canCreate: true, project: url.searchParams.has("projectId") ? project : null, owners: [employee], collaborators: [], readAt: "2026-10-15T00:00:00Z" });
  if (url.pathname === "/api/v1/tasks") return reply({ items: records, total: records.length });
  if (url.pathname.endsWith("/subtasks")) return reply({ items: records.slice(1).map(task => ({ ...task, primaryOwnerName: employee.name })), parent: null, isSubtask: url.pathname.includes(childId), canCreate: true, completionBlocked: false, taskVersion: 1 });
  if (url.pathname.startsWith("/api/v1/tasks/")) {
    const task = records.find(row => url.pathname.endsWith(`/${row.id}`));
    return reply({ task, collaborators: [], history: { statusChanges: [], ownerChanges: [] }, capabilities: {} });
  }
  if (url.pathname.includes("/dashboard/sources/")) return reply({ source: "tasks", today: "2026-10-15", sections: [] });
  return reply({}, 404);
};
if (mode === "subtask") { const url = new URL(location.href); url.searchParams.set("taskId", parentId); history.replaceState(null, "", url); }
createRoot(document.getElementById("root")!).render(<MemoryRouter><main className="identity-content"><p>Synthetic creation recovery · memory only</p><TaskWorkspace csrfToken="synthetic" owner={false} listFirst personalOnly={mode !== "project"} accountId="synthetic-actor" {...(mode === "project" ? { projectContext: project } : {})} /></main></MemoryRouter>);
