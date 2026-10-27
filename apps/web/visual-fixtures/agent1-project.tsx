/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ProjectWorkspace } from "../src/project";
import "../src/styles.css";
import "../src/studio-theme.css";
import "../src/dashboard-shell.css";

// Synthetic local fixture only. No session, credential, database or successful write.
const owner = new URLSearchParams(location.search).get("persona") !== "STAFF";
const project = { id: "project-a", title: "Studio residence — drawing coordination and delivery", status: "ACTIVE", version: 3, deliveryType: "DESIGN", branch: { id: "branch-a", name: "Mumbai" }, scopes: [{ id: "scope-a", name: "Interior design", baseline: true }], statusChanges: [{ id: "history-1", fromStatus: "DRAFT", toStatus: "ACTIVE", reason: "Project scope and lead confirmed" }] };
const person = { id: "employee-a", accountId: "account-a", name: "coordination.designer.with.long.email@example.test", homeBranchId: "branch-a" };
const records = Array.from({ length: 6 }, (_, i) => ({ id: `task-${i + 1}`, title: i === 0 ? "Coordinate the living room reflected ceiling plan with electrical layouts" : `Project drawing coordination ${i + 1}`, projectId: project.id, type: "PROJECT", priority: ["HIGH", "MEDIUM", "LOW"][i % 3], targetDate: "2026-10-20", primaryOwnerEmployeeId: person.id, primaryOwner: { account: { normalizedEmail: person.name } }, status: ["NOT_STARTED", "IN_PROGRESS", "WAITING"][i % 3], version: 1, reviewRequirement: "NONE", createdAt: "2026-10-15", tags: [], checklist: [] }));
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), location.origin);
  if (init?.method && init.method !== "GET") return reply({ message: "Synthetic writes disabled" }, 403);
  if (url.pathname === "/api/v1/project-templates") return reply({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
  if (url.pathname.endsWith("/plan")) return reply({ plan: { templateVersion: { id: "v1", number: 1, template: { name: "Interior design" } }, definition: { folders: ["Drawings", "Approvals"] }, createdAt: "2026-10-01T00:00:00Z" }, items: [{ id: "stage-1", kind: "STAGE", key: "DESIGN", label: "Design development", stageKey: null, position: 1, required: false, targetAt: null, completedAt: null }, { id: "milestone-1", kind: "MILESTONE", key: "DRAWINGS", label: "Coordinated drawing package", stageKey: "DESIGN", position: 1, required: true, targetAt: "2026-11-12T00:00:00Z", completedAt: null }], history: [], capabilities: { complete: true, override: false } });
  if (url.pathname === "/api/v1/projects/setup") return reply({ branches: [project.branch], employees: owner ? [person] : [] });
  if (url.pathname === "/api/v1/projects") return reply({ total: 1, items: [project] });
  if (url.pathname === `/api/v1/projects/${project.id}`) return reply({ project, currentLeadName: person.name, assignments: [{ employeeId: person.id, employee: person }], capabilities: {} });
  if (url.pathname === `/api/v1/reviews/projects/${project.id}/confirmed-drawings`) return reply({ items: [{ id: "confirmed-1", label: "Approved interior layout.pdf", kind: "FILE", fileId: "file-approved", url: null, approvedAt: "2026-10-20T00:00:00Z", signatureName: "Client" }] });
  if (url.pathname === `/api/v1/documents/projects/${project.id}`) return reply({ project: { id: project.id }, files: Array.from({ length: 6 }, (_, i) => ({ id: `file-${i + 1}`, fileName: i === 0 ? "Final coordinated architectural and interior drawing register.pdf" : `Project specification ${i + 1}.pdf`, viewOnly: i === 0 })) });
  if (url.pathname === "/api/v1/reviews/inbox" && url.searchParams.get("projectId") === project.id) return reply({ total: 6, items: Array.from({ length: 5 }, (_, i) => ({ projectId: project.id, roundId: `round-${i + 1}`, taskId: `review-task-${i + 1}`, taskTitle: i === 0 ? "Review coordinated architectural and interior drawing package" : `Internal review package ${i + 1}`, roundNumber: i + 1, status: i % 2 ? "SUBMITTED" : "IN_REVIEW" })) });
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
createRoot(document.getElementById("root")!).render(<MemoryRouter><div className="workspace-layout workspace-layout--studio"><div className="workspace-page"><main className="identity-content"><p>Synthetic project preview · no authentication</p><ProjectWorkspace csrfToken="synthetic-no-write" owner={owner} listFirst initialProjectId={project.id} /></main></div></div></MemoryRouter>);
