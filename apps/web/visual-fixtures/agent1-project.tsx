/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ProjectWorkspace } from "../src/project";
import "../src/styles.css";
import "../src/studio-theme.css";

// Synthetic local fixture only. No session, credential, database or successful write.
const owner = new URLSearchParams(location.search).get("persona") !== "STAFF";
const project = { id: "project-a", title: "Studio residence — drawing coordination and delivery", status: "ACTIVE", version: 3, deliveryType: "DESIGN", branch: { id: "branch-a", name: "Mumbai" }, scopes: [{ id: "scope-a", name: "Interior design", baseline: true }] };
const person = { id: "employee-a", accountId: "account-a", name: "coordination.designer.with.long.email@example.test", homeBranchId: "branch-a" };
const records = Array.from({ length: 6 }, (_, i) => ({ id: `task-${i + 1}`, title: i === 0 ? "Coordinate the living room reflected ceiling plan with electrical layouts" : `Project drawing coordination ${i + 1}`, projectId: project.id, type: "PROJECT", priority: ["HIGH", "MEDIUM", "LOW"][i % 3], targetDate: "2026-10-20", primaryOwnerEmployeeId: person.id, primaryOwner: { account: { normalizedEmail: person.name } }, status: ["NOT_STARTED", "IN_PROGRESS", "WAITING"][i % 3], version: 1, reviewRequirement: "NONE", createdAt: "2026-10-15", tags: [], checklist: [] }));
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), location.origin);
  if (init?.method && init.method !== "GET") return reply({ message: "Synthetic writes disabled" }, 403);
  if (url.pathname === "/api/v1/project-templates") return reply({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
  if (url.pathname.endsWith("/plan")) return reply({ plan: null, items: [], history: [], capabilities: { complete: false, override: false } });
  if (url.pathname === "/api/v1/projects/setup") return reply({ branches: [project.branch], employees: owner ? [person] : [] });
  if (url.pathname === "/api/v1/projects") return reply({ total: 1, items: [project] });
  if (url.pathname === `/api/v1/projects/${project.id}`) return reply({ project, currentLeadName: person.name, assignments: [{ employeeId: person.id, employee: person }], capabilities: {} });
  if (url.pathname === "/api/v1/tasks/setup") return reply({ actorEmployeeId: owner ? null : person.id, canAssign: owner, employees: [person], projects: [project], planItems: [] });
  if (url.pathname === "/api/v1/tasks/creation-options") return reply({ actorEmployeeId: owner ? null : person.id, canAssign: owner, canCreate: true, project, owners: [person], collaborators: owner ? [person] : [], readAt: "2026-10-15T00:00:00Z" });
  if (url.pathname === "/api/v1/tasks") {
    const items = records.filter(task => !url.searchParams.get("q") || task.title.toLowerCase().includes(url.searchParams.get("q")!.toLowerCase()));
    return reply({ items, total: items.length });
  }
  if (url.pathname.endsWith("/subtasks")) return reply({ items: [], parent: null, isSubtask: false, completionBlocked: false, canCreate: false, taskVersion: 1 });
  if (url.pathname.startsWith("/api/v1/tasks/")) { const task = records.find(row => url.pathname.endsWith(`/${row.id}`)); if (task) return reply({ task, collaborators: [], history: { statusChanges: [], ownerChanges: [] }, capabilities: {} }); }
  return reply({}, 404);
};
const query = new URLSearchParams(location.search); query.set("projectId", project.id); if (!query.has("projectSection")) query.set("projectSection", "tasks");
history.replaceState(null, "", `${location.pathname}?${query}`);
createRoot(document.getElementById("root")!).render(<MemoryRouter><main className="identity-content"><p>Synthetic project preview · no authentication</p><ProjectWorkspace csrfToken="synthetic-no-write" owner={owner} listFirst initialProjectId={project.id} /></main></MemoryRouter>);
