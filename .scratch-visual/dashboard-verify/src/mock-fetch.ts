/* A faithful mock of every /api/v1/* endpoint the app's pages call.
   Shapes mirror the real API responses so the full component tree
   renders without a running backend.

   The session is returned as OWNER so the app shows the owner shell
   (which is where Settings, People, and cross-project features live). */

import {
  ID,
  org,
  employees,
  projects,
  taskPage,
  projectList,
  projectSetup,
  myWorkAttention,
  dashboardSources,
  perfContext,
  perfEmployee,
  reviewInbox,
  timeSetup,
  timeEntries,
} from "./mock-data.js";

const OK = 200;
const json = (body: unknown, status: number = OK) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const session = {
  account: {
    id: ID.owner,
    email: "owner@sense.studio",
    kind: "OWNER" as const,
  },
  csrfToken: "mock-csrf-token",
  ownerSetupRequired: false,
  activePasskeyCount: 1,
};

/* task.tsx Setup: employees need homeBranchId; projects need branchId + canApproveCloseout. */
const fullTaskRow = (row: Record<string, unknown>) => ({
  ...row,
  type: "WORK",
  targetDate: String(row.deadline ?? "2026-10-05").slice(0, 10),
  tags: [] as string[],
  checklist: [] as Array<{ label: string; checked: boolean }>,
  version: 1,
  reviewRequirement: "NONE",
  createdAt: "2026-09-20T08:00:00+08:00",
  estimatedHours: 8,
  primaryOwner: { account: { normalizedEmail: "asha@sense.studio" } },
});

export function applyMockFetch(): void {
  const original = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();

    /* ---------- Auth ---------- */
    if (url.includes("/auth/session")) return json(session);
    if (url.includes("/auth/sessions")) return json([]);
    if (url.includes("/auth/passkey") || url.includes("/auth/invitation")) {
      if (url.endsWith("/options") || url.includes("login/options"))
        return json({ ceremonyId: "c-1", challenge: "x".repeat(64), allowCredentials: [] });
      return json({ ok: true });
    }
    if (url.includes("/auth")) return json({ ok: true });

    /* ---------- Dashboard widget sources ---------- */
    if (url.includes("/dashboard/sources/")) {
      const source = url.split("/").pop() ?? "";
      /* The dashboard validates source === requested source and today as a string.
         Ensure the shape is correct for every widget. */
      const base = dashboardSources(source);
      return json({
        source,
        today: "2026-10-05",
        readCompletedAt: "2026-10-05T12:00:00+08:00",
        sections: base.sections ?? [],
        ...(base.decisions ? { decisions: base.decisions } : {}),
        ...(base.sections === undefined ? { sections: [] } : {}),
      });
    }
    if (url.includes("/dashboard/schedules")) return json({ rules: [], reminders: [], summaries: [] });
    if (url.includes("/dashboard/summaries")) return json({ items: [] });
    if (url.includes("/dashboard/reminders")) return json({ items: [] });

    /* ---------- Performance ---------- */
    if (url.includes("/performance/employees/")) {
      const id = url.split("/").slice(-2)[0];
      return json(perfEmployee(decodeURIComponent(id)));
    }
    if (url.includes("/performance/context")) return json(perfContext);

    /* ---------- Reports (dashboard reports tab) ---------- */
    if (url.includes("/reports/context"))
      return json({
        categories: [
          { key: "task", label: "Task" },
          { key: "time", label: "Time" },
          { key: "project", label: "Project" },
        ],
        eventNames: [{ key: "created", label: "Created" }],
        owner: true,
      });
    if (url.includes("/reports/snapshots")) {
      if (method === "POST") return json({ snapshot: { id: "snap-1" } }, 201);
      return json({ snapshots: [], items: [] });
    }
    if (url.includes("/reports/preview") && method === "POST")
      return json({
        title: "Task activity",
        category: "task",
        from: "2026-09-01",
        to: "2026-09-30",
        generatedAt: "2026-10-05T12:00:00+08:00",
        columns: [
          { key: "title", label: "Title" },
          { key: "status", label: "Status" },
        ],
        rows: [
          { sourceId: ID.tasks[0], title: "Finish elevations for review", status: "IN_PROGRESS" },
          { sourceId: ID.tasks[3], title: "Submit drawings to authority", status: "NOT_STARTED" },
        ],
        unavailable: [],
      });
    if (url.includes("/reports/export")) {
      return new Response("mock-report-csv", { status: 200, headers: { "Content-Type": "text/csv" } });
    }

    /* ---------- Reviews ---------- */
    if (url.includes("/reviews/inbox")) return json(reviewInbox);

    /* ---------- Time ---------- */
    if (url.includes("/time/setup")) return json(timeSetup);
    if (url.endsWith("/time") || url.includes("/time?")) return json(timeEntries);
    if (url.includes("/time/timers") && method === "POST") return json({ id: "timer-1", state: "RUNNING", version: 1 }, 201);
    if (url.includes("/time/entries") && method === "POST") return json({ id: "te-2" }, 201);

    /* ---------- My Work ---------- */
    if (url.includes("/my-work/attention")) return json(myWorkAttention);

    /* ---------- Tasks ---------- */
    if (url.includes("/tasks/attention")) {
      /* task.service.attention: { total, items: [{ id, title, projectTitle, reason }] } */
      return json({ total: 1, items: [{ id: ID.tasks[1], title: "Resolve snag #12 on lab shell", projectTitle: "Lab build", reason: "Employee exit: a permitted manager must reassign this task before work resumes." }] });
    }
    if (url.includes("/tasks/setup"))
      return json({
        actorEmployeeId: null,
        projects: projects.map((p) => ({ id: p.id, title: p.title, status: p.status, branchId: ID.branches[0], canApproveCloseout: false })),
        employees: employees.map((e) => ({ id: e.id, name: e.name, homeBranchId: e.homeBranchId })),
        planItems: [],
        canAssign: true,
        canCreate: true,
        owner: true,
      });
    if (url.includes("/tasks") && !url.includes("/tasks/")) {
      /* TaskPage = { total, items: Task[] } */
      return json({
        total: taskPage.items.length,
        items: taskPage.items.map((row) => fullTaskRow(row as unknown as Record<string, unknown>)),
      });
    }
    if (url.includes("/tasks/")) {
      const t = taskPage.items.find((row) => url.includes(row.id ?? ""));
      if (url.includes("/subtasks")) return json({ items: [], parent: null, isSubtask: false, completionBlocked: false, canCreate: true, taskVersion: 1 });
      if (url.includes("/recurrence")) return json({ rule: null, history: [], capabilities: { configure: true, pause: true, resume: true }, timezone: org.timezone });
      if (url.includes("/dependency-candidates")) return json({ items: [] });
      if (url.includes("/extension-approvers")) return json({ items: [] });
      if (t)
        return json({
          task: fullTaskRow(t as unknown as Record<string, unknown>),
          collaborators: [],
          history: { statusChanges: [], ownerChanges: [] },
          capabilities: { edit: true, transition: true, reassign: true },
        });
      return json({ error: "not found" }, 404);
    }

    /* ---------- Projects ---------- */
    if (url.includes("/projects/setup"))
      return json({
        branches: [
          { id: ID.branches[0], name: "Design HQ" },
          { id: ID.branches[1], name: "Site North" },
        ],
        employees: employees.map((e) => ({ id: e.id, accountId: "acct-" + e.id.slice(0, 8), name: e.name, homeBranchId: e.homeBranchId })),
        owner: true,
        ownerAccountId: ID.owner,
      });
    if (url.includes("/projects")) {
      if (url.match(/\/projects\/[^/]+$/) && method === "GET") {
        const p = projects.find((item) => url.includes(item.id));
        if (p)
          return json({
            project: p,
            capabilities: { assign: true, transfer: true, approveScope: true, cancel: true },
            assignments: employees.map((e) => ({ employeeId: e.id, name: e.name })),
            documents: [],
            reviews: [],
            plan: { items: [] },
          });
      }
      if (method === "GET") return json(projectList);
      return json({ id: "new-project", ...projectList.items[0] }, 201);
    }

    /* ---------- People / Workforce / Organization ---------- */
    if (url.includes("/workforce")) {
      /* workforce.tsx Setup: owner + employees + branches + projects + policies. */
      if (url.includes("/workforce/setup"))
        return json({
          owner: true,
          employeeId: null,
          employees: employees.map((e) => ({ id: e.id, label: e.name, branchId: e.homeBranchId, teamId: "team-1" })),
          branches: [
            { id: ID.branches[0], label: "Design HQ" },
            { id: ID.branches[1], label: "Site North" },
          ],
          projects: projects.map((p) => ({ id: p.id, label: p.title })),
          tasks: taskPage.items.map((t) => ({ id: t.id, title: t.title, employeeIds: [ID.employees[0]] })),
          policies: [{ id: "pol-1", version: 1, data: { annualAllowanceDays: 14, types: [{ key: "vacation", label: "Vacation", paid: true }] } }],
          schedules: [],
          sites: [],
        });
      return json({
        schedules: [],
        holidays: [],
        allocations: [],
        leaves: [],
        attendance: [],
        balances: employees.map((e) => ({ employeeId: e.id, year: 2026, remainingDays: "11", ledger: [] })),
        workload: [],
        workloadPeriods: [],
      });
    }
    if (url.includes("/project-templates")) {
      /* project-template.tsx: TemplateResponse = { templates, canManage, defaults }. */
      return json({
        templates: [
          {
            id: "tpl-1",
            name: "Design delivery",
            active: true,
            versions: [
              {
                id: "tplv-1",
                number: 1,
                createdAt: "2026-08-01T00:00:00+08:00",
                definition: {
                  deliveryType: "DESIGN",
                  scopes: ["Architectural", "Structural"],
                  stages: [{ key: "design", label: "Design" }, { key: "construction-docs", label: "Construction docs" }],
                  milestones: [{ key: "dd", label: "Design development", stageKey: "design", required: true }],
                  folders: ["Drawings", "Specs"],
                },
              },
            ],
          },
        ],
        canManage: true,
        defaults: {
          DESIGN: [{ key: "design", label: "Design" }],
          TURNKEY: [{ key: "site", label: "Site delivery" }],
        },
      });
    }
    if (url.includes("/organization") || url.includes("/people")) {
      return json({
        organization: { ...org, id: "org-sense" },
        employees,
        jobRoles: [
          { id: "jr-1", name: "Architect", active: true, creationPresentation: "FULL" },
          { id: "jr-2", name: "Site Supervisor", active: true, creationPresentation: "MINIMAL" },
        ],
        branches: [
          { id: ID.branches[0], name: "Design HQ" },
          { id: ID.branches[1], name: "Site North" },
        ],
      });
    }
    if (url.includes("/settings")) return json({ organization: org, preferences: {} });
    /* ---------- CRM / notifications / approvals — empty, no crash. ---------- */
    if (url.includes("/crm")) return json({ branches: [], sources: [], items: [], total: 0 });
    if (url.includes("/notifications")) return json({ items: [], unread: 0, inbox: { nextCursor: null } });
    if (url.includes("/approvals")) return json({ items: [], nextCursor: null, total: 0 });

    /* ---------- Everything else: graceful empty response. ---------- */
    if (url.includes("/api/v1/")) {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        return json({ ok: true });
      }
      return json({ items: [], total: 0 });
    }

    return original(input, init);
  }) as typeof fetch;
}
