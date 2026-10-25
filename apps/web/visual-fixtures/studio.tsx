/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { Link, MemoryRouter } from "react-router-dom";
import { WorkspaceLayout } from "../src/workspace-navigation.js";
import { ProjectWorkspace } from "../src/project.js";
import { DocumentWorkspace } from "../src/document.js";
import { ReviewWorkspace } from "../src/review.js";
import { App } from "../src/app.js";
import { ClientPortalAuth } from "../src/client-portal-auth.js";
import { ExternalPortalWorkspace } from "../src/external-portal.js";
import { PublicPortfolioPage } from "../src/gallery.js";
import "../src/styles.css";
import "../src/studio-theme.css";

type Surface = "projects" | "documents" | "reviews" | "signin" | "client-signin" | "external-signin" | "portfolio";
const params = new URLSearchParams(window.location.search);
const requestedSurface = params.get("surface");
const surface: Surface = requestedSurface === "documents" || requestedSurface === "reviews" || requestedSurface === "signin" || requestedSurface === "client-signin" || requestedSurface === "external-signin" || requestedSurface === "portfolio" ? requestedSurface : "projects";
const branch = { id: "branch-central", name: "Central Studio" };
const project = {
  id: "project-residence-01", title: "Riverside Residence", status: "ACTIVE", deliveryType: "DESIGN", version: 7,
  scopes: [{ id: "scope-interiors", name: "Interior architecture", normalizedName: "interior architecture", baseline: true }, { id: "scope-lighting", name: "Lighting design", normalizedName: "lighting design", baseline: false }],
  branch, createdAt: "2026-09-18T10:00:00.000Z", currentLeadName: "Asha Mehta",
  nextMilestone: { key: "CONCEPT_REVIEW", label: "Concept review", targetAt: "2026-10-22T00:00:00.000Z" },
};
const projects = [project, { ...project, id: "project-courtyard-02", title: "Courtyard House", status: "ON_HOLD", version: 3, currentLeadName: "Dev Kapoor", nextMilestone: null }];
const folders = [
  { id: "folder-issued", name: "Issued drawings", parentId: null, confidential: false, provisionState: "READY" as const },
  { id: "folder-client", name: "Client references", parentId: null, confidential: true, provisionState: "READY" as const },
];
const files = [
  { id: "file-plan-a103", folderId: "folder-issued", fileName: "A-103 Ground floor plan.pdf", mimeType: "application/pdf", sizeBytes: 2489130, sha256: "e".repeat(64), confidential: false, viewOnly: true, createdAt: "2026-10-08T09:30:00.000Z" },
  { id: "file-finish-schedule", folderId: "folder-issued", fileName: "Interior finish schedule.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sizeBytes: 184220, sha256: "a".repeat(64), confidential: false, viewOnly: false, createdAt: "2026-10-06T14:15:00.000Z" },
  { id: "file-client-brief", folderId: "folder-client", fileName: "Client design brief.pdf", mimeType: "application/pdf", sizeBytes: 932104, sha256: "b".repeat(64), confidential: true, viewOnly: true, createdAt: "2026-10-02T11:05:00.000Z" },
];
const inbox = [
  { roundId: "round-a103-r3", taskId: "task-ground-floor", taskTitle: "Ground floor plan coordination", projectId: project.id, projectTitle: project.title, roundNumber: 3, status: "IN_REVIEW", dueDate: "2026-10-15", reviewerName: "Mira Shah", submitterName: "Asha Mehta", revisionLabel: "A-103 Rev 3" },
  { roundId: "round-lighting-r2", taskId: "task-lighting", taskTitle: "Lighting layout review", projectId: project.id, projectTitle: project.title, roundNumber: 2, status: "SUBMITTED", dueDate: "2026-10-17", reviewerName: "Nikhil Rao", submitterName: "Dev Kapoor", revisionLabel: "E-204 Rev 2" },
];

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// This fixture models list/read data only. All writes are rejected and unknown reads fail explicitly.
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = new URL(String(input), window.location.origin);
  if ((init?.method ?? "GET").toUpperCase() !== "GET") return reply({ message: "Synthetic preview is read-only." }, 403);
  if (["/api/v1/auth/session", "/api/v1/client-portal/auth/session", "/api/v1/external-portal/auth/session"].includes(url.pathname)) return reply({ message: "Synthetic signed-out state." }, 401);
  if (url.pathname === "/api/v1/public/portfolio") return reply({ items: [] });
  if (url.pathname === "/api/v1/projects/setup") return reply({ owner: false, branches: [branch], employees: [] });
  if (url.pathname === "/api/v1/projects") return reply({ total: projects.length, stageKeys: ["CONCEPT", "DEVELOPMENT", "DOCUMENTATION"], items: projects });
  if (url.pathname === `/api/v1/projects/${project.id}`) return reply({ project, capabilities: { requestCancellation: false }, cancellationRequests: [] });
  if (url.pathname === "/api/v1/project-templates") return reply({ templates: [], canManage: false, defaults: { DESIGN: [], TURNKEY: [] } });
  if (url.pathname === `/api/v1/projects/${project.id}/plan`) return reply({ plan: null, items: [], history: [], capabilities: { complete: false, override: false } });
  if (url.pathname === "/api/v1/documents/project-picker") return reply({ branches: [branch], total: projects.length, items: projects.map(({ id, title, status }) => ({ id, title, status, branchId: branch.id, branch })) });
  if (url.pathname === `/api/v1/documents/projects/${project.id}`) return reply({ project: { id: project.id, title: project.title }, folders, files, capabilities: { createFolder: false, upload: false, grant: false } });
  if (url.pathname === "/api/v1/reviews/inbox") return reply({ total: inbox.length, items: inbox });
  if (url.pathname === "/api/v1/reviews/categories") return reply({ categories: [] });
  if (url.pathname === "/api/v1/tasks/creation-options") {
    const queryProjectId = url.searchParams.get("projectId") ?? "";
    return reply({ actorEmployeeId: "employee-ash-mehta", project: queryProjectId ? { id: queryProjectId, title: "Riverside Residence", status: "ACTIVE" } : null, canAssign: false, canCreate: true,
      owners: [{ id: "employee-ash-mehta", name: "Asha Mehta", homeBranchId: "branch-central" }, { id: "employee-mira-shah", name: "Mira Shah", homeBranchId: "branch-central" }],
      collaborators: [{ id: "employee-dev-kapoor", name: "Dev Kapoor", homeBranchId: "branch-central" }, { id: "employee-nikhil-rao", name: "Nikhil Rao", homeBranchId: "branch-central" }],
      readAt: new Date().toISOString() });
  }
  if (url.pathname === "/api/v1/tasks") return reply({ total: 0, items: [], offset: 0 });
  if (url.pathname === "/api/v1/tasks/setup") return reply({ owner: false, branches: [branch],
    employees: [
      { id: "employee-ash-mehta", accountId: "account-ash-mehta", name: "Asha Mehta", homeBranchId: "branch-central" },
      { id: "employee-mira-shah", accountId: "account-mira-shah", name: "Mira Shah", homeBranchId: "branch-central" },
      { id: "employee-dev-kapoor", accountId: "account-dev-kapoor", name: "Dev Kapoor", homeBranchId: "branch-central" },
      { id: "employee-nikhil-rao", accountId: "account-nikhil-rao", name: "Nikhil Rao", homeBranchId: "branch-central" },
    ],
    actorEmployeeId: "employee-ash-mehta", canAssign: false, canCreate: true,
    creationProfile: { version: 1, variant: "EMPLOYEE", resolution: "CONFIGURED_ROLE" },
    projects: [{ id: project.id, title: "Riverside Residence", status: "ACTIVE", branchId: "branch-central" }],
    planItems: [{ id: "plan-item-concept", projectId: project.id, kind: "STAGE", label: "Concept stage" }] });
  return reply({ message: "No synthetic fixture exists for this read." }, 503);
};

function Preview(): React.JSX.Element {
  const header = React.useRef<HTMLElement>(null);
  React.useLayoutEffect(() => {
    const element = header.current;
    if (!element) return;
    const update = (): void => document.documentElement.style.setProperty("--sense-header-height", `${element.getBoundingClientRect().height}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  if (["signin", "client-signin", "external-signin", "portfolio"].includes(surface)) return <MemoryRouter initialEntries={["/"]}><>
    {surface === "signin" ? <App /> : surface === "client-signin" ? <ClientPortalAuth /> : surface === "external-signin" ? <ExternalPortalWorkspace /> : <PublicPortfolioPage />}
    <aside style={{position:"fixed",bottom:4,right:4,fontSize:10,background:"#fff",color:"#26312b",padding:4,pointerEvents:"none"}}>Synthetic read-only preview · no authentication</aside>
  </></MemoryRouter>;
  const route = surface === "documents" ? `/documents?projectId=${project.id}` : surface === "reviews" ? "/reviews" : "/projects";
  const pageTitle = surface === "documents" ? "Project documents" : surface === "reviews" ? "Internal reviews" : "Projects";
  return <MemoryRouter initialEntries={[route]}><div className="app-shell studio-preview-shell">
    <style>{`.fixture-note { position:fixed; z-index:30; right:8px; bottom:10px; padding:6px 10px; background:#fffdf7; color:#53675e; border:1px solid #d9d8cd; border-radius:999px; box-shadow:0 3px 12px #192c2812; font:11px system-ui; pointer-events:none; } @media(max-width:767px){.fixture-note{bottom:calc(70px + env(safe-area-inset-bottom));max-width:calc(100% - 16px);font-size:9px;}}`}</style>
    <header className="site-header" ref={header}>
      <Link to="/" className="brand" aria-label="Sense Studios home"><span className="brand-mark">S</span><span><strong>SENSE STUDIOS</strong><small>WORK MANAGEMENT</small></span></Link>
      <span className="phase-badge">STUDIO</span>
      <div className="site-header-controls"><Link className="site-header-notifications" to="/notifications" aria-label="Notifications"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>Notifications</Link><button className="site-header-logout" type="button" disabled>Log out</button></div>
    </header>
    <WorkspaceLayout><main className="identity-content studio-preview-content">
      <div className="workspace-account-heading"><span>{pageTitle}</span><span>Preview workspace</span></div>
      {surface === "projects" && <ProjectWorkspace csrfToken="synthetic-read-only" owner={false} listFirst initialProjectId={project.id} />}
      {surface === "documents" && <DocumentWorkspace csrfToken="synthetic-read-only" owner={false} />}
      {surface === "reviews" && <ReviewWorkspace csrfToken="synthetic-read-only" />}
    </main></WorkspaceLayout>
    <span className="fixture-note">Synthetic read-only preview · no authentication</span>
  </div></MemoryRouter>;
}

createRoot(document.getElementById("root")!).render(<Preview />);
