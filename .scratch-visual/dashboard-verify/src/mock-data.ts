/* Representative data shapes for the full-app mock harness.
   Every shape mirrors the real API responses (verified against
   apps/api/src services). UUIDs are realistic v4. Dates cluster
   around "today" (2026-10-05) so the attention queue looks live. */

export const TODAY = "2026-10-05";

/* Stable ids so sub-resources can reference each other. */
export const ID = {
  owner: "11111111-2222-4333-8444-555555550001",
  branches: ["aaaa0000-0000-4000-8000-0000000000b1", "aaaa0000-0000-4000-8000-0000000000b2"],
  projects: [
    "10000000-0000-4000-8000-0000000000p1",
    "10000000-0000-4000-8000-0000000000p2",
    "10000000-0000-4000-8000-0000000000p3",
  ],
  employees: [
    "20000000-0000-4000-8000-0000000000e1",
    "20000000-0000-4000-8000-0000000000e2",
    "20000000-0000-4000-8000-0000000000e3",
  ],
  tasks: [
    "30000000-0000-4000-8000-0000000000t1",
    "30000000-0000-4000-8000-0000000000t2",
    "30000000-0000-4000-8000-0000000000t3",
    "30000000-0000-4000-8000-0000000000t4",
    "30000000-0000-4000-8000-0000000000t5",
  ],
  reviews: ["40000000-0000-4000-8000-0000000000r1", "40000000-0000-4000-8000-0000000000r2"],
  approvals: ["50000000-0000-4000-8000-0000000000a1"],
};

export const org = {
  id: "org-sense",
  name: "Sense Studios",
  timezone: "Asia/Manila",
};

export const employees = [
  { id: ID.employees[0], name: "Asha Nakamura", state: "ACTIVE", role: "Senior Architect", email: "asha@sense.studio", homeBranchId: ID.branches[0] },
  { id: ID.employees[1], name: "Bela Santos", state: "ACTIVE", role: "Architect", email: "bela@sense.studio", homeBranchId: ID.branches[0] },
  { id: ID.employees[2], name: "Ken Reyes", state: "ACTIVE", role: "Site Supervisor", email: "ken@sense.studio", homeBranchId: ID.branches[1] },
];

export const projects = [
  {
    id: ID.projects[0],
    title: "Studio fitout",
    status: "ACTIVE",
    branchId: ID.branches[0],
    clientName: "Northwind Retail",
    budget: { amount: 2_400_000, currency: "PHP" },
    startDate: "2026-08-01",
    targetDate: "2026-11-30",
    version: 3,
  },
  {
    id: ID.projects[1],
    title: "Lab build",
    status: "ACTIVE",
    branchId: ID.branches[1],
    clientName: "Helix Diagnostics",
    budget: { amount: 8_100_000, currency: "PHP" },
    startDate: "2026-09-15",
    targetDate: "2027-02-28",
    version: 1,
  },
  {
    id: ID.projects[2],
    title: "Office 2F renewal",
    status: "PLANNING",
    branchId: ID.branches[0],
    clientName: "Internal",
    budget: { amount: 1_250_000, currency: "PHP" },
    startDate: "2026-10-01",
    targetDate: "2027-01-15",
    version: 1,
  },
];

export const tasks = [
  {
    id: ID.tasks[0],
    title: "Finish elevations for review",
    status: "IN_PROGRESS",
    priority: "HIGH",
    type: "WORK",
    projectId: ID.projects[0],
    primaryOwnerEmployeeId: ID.employees[0],
    deadline: new Date("2026-10-06T09:00:00+08:00").toISOString(),
    committedDueDate: new Date("2026-10-06T09:00:00+08:00").toISOString(),
  },
  {
    id: ID.tasks[1],
    title: "Resolve snag #12 on lab shell",
    status: "WAITING",
    priority: "MEDIUM",
    type: "WORK",
    projectId: ID.projects[1],
    primaryOwnerEmployeeId: ID.employees[2],
    deadline: new Date("2026-09-30T17:00:00+08:00").toISOString(),
    committedDueDate: new Date("2026-10-02T17:00:00+08:00").toISOString(),
    waitingReason: "Awaiting contractor",
    requiresReassignment: true,
  },
  {
    id: ID.tasks[2],
    title: "Approve client package — Studio fitout",
    status: "SUBMITTED_CLIENT_REVIEW",
    priority: "HIGH",
    type: "REVIEW_SUBMISSION",
    projectId: ID.projects[0],
    primaryOwnerEmployeeId: ID.employees[1],
    deadline: new Date("2026-10-05T18:00:00+08:00").toISOString(),
    committedDueDate: new Date("2026-10-05T18:00:00+08:00").toISOString(),
  },
  {
    id: ID.tasks[3],
    title: "Submit drawings to authority",
    status: "NOT_STARTED",
    priority: "CRITICAL",
    type: "WORK",
    projectId: ID.projects[1],
    primaryOwnerEmployeeId: ID.employees[2],
    deadline: new Date("2026-09-28T09:00:00+08:00").toISOString(),
    committedDueDate: new Date("2026-09-28T09:00:00+08:00").toISOString(),
  },
  {
    id: ID.tasks[4],
    title: "Book client walkthrough",
    status: "NOT_STARTED",
    priority: "LOW",
    type: "WORK",
    projectId: ID.projects[2],
    primaryOwnerEmployeeId: ID.employees[1],
    deadline: new Date("2026-10-19T10:00:00+08:00").toISOString(),
  },
];

export const reviewItems = [
  {
    source: "review",
    sourceId: ID.reviews[0],
    roundId: ID.reviews[0],
    taskId: ID.tasks[0],
    title: "Review floor plan revisions",
    project: { id: ID.projects[0], title: "Studio fitout" },
    responsibility: "reviewer",
    reason: "Round 2 assigned to you",
    deadline: new Date("2026-10-15T12:00:00+08:00").toISOString(),
    deadlineKind: "review_date",
    destination: "/reviews",
  },
  {
    source: "review",
    sourceId: ID.reviews[1],
    roundId: ID.reviews[1],
    taskId: ID.tasks[2],
    title: "Client feedback on elevations",
    project: { id: ID.projects[1], title: "Lab build" },
    responsibility: "reviewer",
    reason: "Corrections required",
    deadline: new Date("2026-10-12T12:00:00+08:00").toISOString(),
    deadlineKind: "review_date",
    destination: "/reviews",
  },
];

export const approvalItems = [
  {
    source: "approval",
    sourceId: ID.approvals[0],
    requestId: ID.approvals[0],
    title: "Approve budget variance — Lab build",
    responsibility: "approver",
    reason: "Owner approval requested",
    deadline: new Date("2026-10-09T09:00:00+08:00").toISOString(),
    deadlineKind: "decision_expiry",
    destination: "/decisions",
  },
];

export const taskRows = tasks.map((t) => ({
  source: "task",
  sourceId: t.id,
  taskId: t.id,
  title: t.title,
  project: { id: t.projectId, title: projects.find((p) => p.id === t.projectId)!.title },
  responsibility: "owner",
  reason: "Assigned to your account",
  deadline: t.deadline,
  deadlineKind: "target_date",
  priority: t.priority,
  status: t.status,
  destination: "/tasks",
}));

export const myWorkAttention = {
  status: "ready",
  source: "all",
  sourceCounts: {
    task: { status: "ready", total: taskRows.length },
    review: { status: "ready", total: reviewItems.length },
    approval: { status: "ready", total: approvalItems.length },
  },
  items: [...taskRows, ...reviewItems, ...approvalItems],
  offset: 0,
  limit: 50,
  totalItems: taskRows.length + reviewItems.length + approvalItems.length,
  hasMore: false,
  readAt: new Date("2026-10-05T12:00:00+08:00").toISOString(),
  timezone: org.timezone,
};

/* /api/v1/tasks?… → { items } and /api/v1/tasks/setup → { projects, employees }
   in the real app (TaskPage + Setup). Representative list rows. */
export const taskPage = {
  items: [
    {
      id: ID.tasks[0],
      title: "Finish elevations for review",
      status: "IN_PROGRESS",
      priority: "HIGH",
      type: "WORK",
      projectId: ID.projects[0],
      primaryOwnerEmployeeId: ID.employees[0],
      targetDate: "2026-10-06",
      deadline: new Date("2026-10-06T09:00:00+08:00").toISOString(),
      committedDueDate: new Date("2026-10-06T09:00:00+08:00").toISOString(),
      tags: ["elevations", "fitout"],
      checklist: [{ label: "Elevation A", checked: true }, { label: "Elevation B", checked: false }],
      version: 1,
      reviewRequirement: "INTERNAL",
      createdAt: "2026-09-20T08:00:00+08:00",
      estimatedHours: 16,
    },
    {
      id: ID.tasks[1],
      title: "Resolve snag #12 on lab shell",
      status: "WAITING",
      priority: "MEDIUM",
      type: "WORK",
      projectId: ID.projects[1],
      primaryOwnerEmployeeId: ID.employees[2],
      targetDate: "2026-10-02",
      deadline: new Date("2026-10-02T17:00:00+08:00").toISOString(),
      committedDueDate: new Date("2026-10-02T17:00:00+08:00").toISOString(),
      tags: ["snag", "lab"],
      checklist: [],
      version: 2,
      reviewRequirement: "NONE",
      createdAt: "2026-09-25T08:00:00+08:00",
      estimatedHours: 4,
      waitingReason: "Awaiting contractor",
    },
    {
      id: ID.tasks[2],
      title: "Approve client package — Studio fitout",
      status: "SUBMITTED_CLIENT_REVIEW",
      priority: "HIGH",
      type: "REVIEW_SUBMISSION",
      projectId: ID.projects[0],
      primaryOwnerEmployeeId: ID.employees[1],
      targetDate: "2026-10-05",
      deadline: new Date("2026-10-05T18:00:00+08:00").toISOString(),
      committedDueDate: new Date("2026-10-05T18:00:00+08:00").toISOString(),
      tags: ["client", "review"],
      checklist: [{ label: "Send package", checked: true }],
      version: 1,
      reviewRequirement: "CLIENT",
      createdAt: "2026-09-28T08:00:00+08:00",
      estimatedHours: 2,
    },
    {
      id: ID.tasks[3],
      title: "Submit drawings to authority",
      status: "OVERDUE",
      priority: "CRITICAL",
      type: "WORK",
      projectId: ID.projects[1],
      primaryOwnerEmployeeId: ID.employees[2],
      targetDate: "2026-09-28",
      deadline: new Date("2026-09-28T09:00:00+08:00").toISOString(),
      committedDueDate: new Date("2026-09-28T09:00:00+08:00").toISOString(),
      tags: ["authority"],
      checklist: [],
      version: 3,
      reviewRequirement: "NONE",
      createdAt: "2026-09-15T08:00:00+08:00",
      estimatedHours: 8,
    },
    {
      id: ID.tasks[4],
      title: "Book client walkthrough",
      status: "NOT_STARTED",
      priority: "LOW",
      type: "WORK",
      projectId: ID.projects[2],
      primaryOwnerEmployeeId: ID.employees[1],
      targetDate: "2026-10-19",
      deadline: new Date("2026-10-19T10:00:00+08:00").toISOString(),
      tags: ["walkthrough"],
      checklist: [],
      version: 1,
      reviewRequirement: "NONE",
      createdAt: "2026-10-01T08:00:00+08:00",
      estimatedHours: 1,
    },
  ],
};

/* /api/v1/projects */
export const projectList = {
  items: projects,
  totalItems: projects.length,
  hasMore: false,
};

/* /api/v1/projects/setup */
export const projectSetup = {
  employees: employees.map((e) => ({ id: e.id, name: e.name })),
  canCreate: true,
  owner: true,
};

/* Dashboard widget sources */
export const dashboardSources = (source: string) => {
  const today = TODAY;
  const sections: Record<string, Array<{ key: string; label: string; rows: unknown[]; unavailable?: string }>> = {
    tasks: [
      {
        key: "today",
        label: "Due today",
        rows: taskRows
          .filter((t) => t.status === "IN_PROGRESS" || t.status === "SUBMITTED_CLIENT_REVIEW")
          .slice(0, 2),
      },
      {
        key: "attention",
        label: "Task attention",
        rows: taskRows.filter((t) => t.status === "WAITING"),
      },
      {
        key: "overdue",
        label: "Overdue",
        rows: taskRows.filter((t) => t.status === "OVERDUE"),
      },
      {
        key: "priority",
        label: "High priority",
        rows: taskRows.filter((t) => t.priority === "HIGH" || t.priority === "CRITICAL"),
      },
      {
        key: "waiting",
        label: "Waiting / blocked",
        rows: taskRows.filter((t) => t.status === "WAITING"),
      },
      {
        key: "reviews",
        label: "Review / corrections",
        rows: reviewItems,
      },
    ],
    decisions: [],
    health: [
      {
        key: "health",
        label: "Project health",
        rows: projects.map((p, i) => ({
          id: p.id,
          label: p.title,
          score: [3, 4, 2][i] ?? 3,
          scoreScale: { min: 1, max: 5 },
          status: "CURRENT",
        })),
      },
    ],
    performance: [],
    workload: [{ key: "load", label: "Workload", rows: employees }],
    site: [
      {
        key: "site",
        label: "Site delivery",
        rows: projects.filter((p) => p.status === "ACTIVE").map((p) => ({ id: p.id, label: p.title, status: "ACTIVE", date: today })),
      },
    ],
    training: [],
  };
  const payload = {
    source,
    today,
    readCompletedAt: new Date("2026-10-05T12:00:00+08:00").toISOString(),
    sections: sections[source] ?? [],
  };
  if (source === "decisions") {
    payload.decisions = {
      items: [
        {
          id: ID.approvals[0],
          title: "Approve budget variance",
          requesterLabel: "Mia",
          levelLabel: "Owner",
          route: "/decisions",
        },
      ],
      nextCursor: null,
    };
  }
  return payload;
};

/* /api/v1/performance/context */
export const perfContext = {
  owner: true,
  employeeId: ID.employees[0],
  employees: employees.map((e) => ({ id: e.id, label: e.name, teamId: "team-1", canManage: true })),
  policies: [{ id: "policy-1", family: "EMPLOYEE" }],
};

/* /api/v1/performance/employees/:id */
export const perfEmployee = (id: string) => {
  const emp = employees.find((e) => e.id === id) ?? employees[0];
  return {
    employee: { id: emp.id, label: emp.name },
    snapshots: [
      {
        id: "snap-" + emp.id,
        data: {
          from: "2026-09-01",
          to: "2026-10-05",
          score: 82,
          status: "SCORED",
          family: "EMPLOYEE",
          policyId: "policy-1",
        },
      },
    ],
    teamAverage: 75,
    relativeToAverage: 7,
  };
};

/* /api/v1/reviews/inbox */
export const reviewInbox = {
  total: 3,
  items: [
    { roundId: ID.reviews[0], taskId: ID.tasks[0], taskTitle: "Review floor plan revisions", projectTitle: "Studio fitout", roundNumber: 2, status: "IN_REVIEW", dueDate: "2026-10-15" },
    { roundId: ID.reviews[1], taskId: ID.tasks[2], taskTitle: "Client feedback on elevations", projectTitle: "Lab build", roundNumber: 1, status: "CORRECTIONS_REQUIRED", dueDate: "2026-10-12" },
    { roundId: "40000000-0000-4000-8000-0000000000r3", taskId: ID.tasks[1], taskTitle: "Site snag sign-off", projectTitle: "Lab build", roundNumber: 3, status: "APPROVED", dueDate: "2026-09-28" },
  ],
};

/* /api/v1/time/setup */
export const timeSetup = {
  employeeId: ID.employees[0],
  employees: employees.map((e) => ({ id: e.id, name: e.name })),
  projects: projects
    .filter((p) => p.status === "ACTIVE")
    .map((p) => ({ id: p.id, name: p.title })),
  tasks: tasks.map((t) => ({ id: t.id, title: t.title, projectId: t.projectId })),
  stages: [],
  isOwner: true,
};

export const timeEntries = {
  entries: [
    {
      id: "te-1",
      employeeId: ID.employees[0],
      employeeName: "Asha Nakamura",
      projectId: ID.projects[0],
      date: "2026-10-05",
      minutes: 240,
      workNote: "Elevations revision pass",
      location: "OFFICE",
      billable: true,
    },
  ],
  timer: null,
};
