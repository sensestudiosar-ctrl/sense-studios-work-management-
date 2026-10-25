/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ProjectWorkspace } from "../src/project";
import "../src/styles.css";
import "../src/studio-theme.css";

const project = { id: "33333333-3333-4333-8333-333333333333", title: "Studio residence — coordinated drawing delivery", status: "ACTIVE", version: 1, deliveryType: "DESIGN", branch: { id: "11111111-1111-4111-8111-111111111111", name: "Mumbai" }, scopes: [{ id: "scope", name: "Interior design", normalizedName: "interior design", baseline: true }] };
const stats = { documents: 0, reviews: 0, writes: 0, unexpected: [] as string[] };
Object.assign(window, { projectResourceStats: stats });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input), location.origin);
  if (init?.method && init.method !== "GET") { stats.writes++; return reply({}, 403); }
  if (url.pathname === "/api/v1/project-templates") return reply({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
  if (url.pathname === "/api/v1/projects/setup") return reply({ branches: [project.branch], owner: false });
  if (url.pathname === "/api/v1/projects") return reply({ total: 1, items: [project] });
  if (url.pathname === `/api/v1/projects/${project.id}`) return reply({ project, assignments: [], capabilities: {} });
  if (url.pathname.endsWith("/plan")) return reply({ plan: null, items: [], history: [], capabilities: {} });
  if (url.pathname === `/api/v1/documents/projects/${project.id}`) {
    stats.documents++;
    if (stats.documents === 2) return reply({}, 403);
    return reply({ project: { id: project.id }, files: stats.documents > 2 ? [] : Array.from({ length: 8 }, (_, index) => ({ id: `file-${index}`, fileName: `${index === 0 ? "Final_consolidated_architectural_drawing_register_and_specification_for_owner_review_".repeat(3) : "Coordinated specification "}${index + 1}.pdf`, viewOnly: index === 0 })) });
  }
  if (url.pathname === "/api/v1/reviews/inbox" && url.searchParams.get("projectId") === project.id && url.searchParams.get("queue") === "waiting") {
    stats.reviews++;
    return reply({ total: 9, items: Array.from({ length: 5 }, (_, index) => ({ projectId: project.id, roundId: `review-round-${index}`, taskId: `task-${index}`, taskTitle: index === 0 ? "Review the coordinated architectural and interior drawing package with long delivery context" : `Design package ${index + 1}`, roundNumber: index + 1, status: index === 0 ? "IN_REVIEW" : "SUBMITTED" })) });
  }
  stats.unexpected.push(url.pathname); return reply({}, 404);
};
createRoot(document.getElementById("root")!).render(<MemoryRouter><main className="identity-content"><p>Synthetic Project summary · no authentication or persistence</p><ProjectWorkspace owner={false} csrfToken="synthetic" listFirst /></main></MemoryRouter>);
