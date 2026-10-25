import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./prototype.css";

type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "WAITING" | "CORRECTIONS_REQUIRED" | "IN_INTERNAL_REVIEW" | "COMPLETED";
type ReviewRequirement = "NONE" | "INTERNAL";
const statusLabels: Record<TaskStatus, string> = { NOT_STARTED: "Not started", IN_PROGRESS: "In progress", WAITING: "Waiting", CORRECTIONS_REQUIRED: "Corrections required", IN_INTERNAL_REVIEW: "In internal review", COMPLETED: "Completed" };
type Task = {
  id: string;
  title: string;
  project: string;
  branch: string;
  stage: string;
  owner: string;
  primaryOwner: boolean;
  collaborator: boolean;
  status: TaskStatus;
  reviewRequirement: ReviewRequirement;
  capabilities: { transition: boolean; wait: boolean; resume: boolean; review: boolean; submitCorrection: boolean };
  target: string;
  committed?: string;
  version: number;
  nextActor: string;
  nextAction: string;
  review?: { round: string; roundId: string; revision: string; clientRevision?: string; reviewer: string; readable: boolean };
  isReview?: boolean;
  hasUnfinishedDependency?: boolean;
  requiresReassignment?: boolean;
  reassignmentGrant?: { viewer: string; scope: string };
  createdByMe?: boolean;
  description: string;
  managementScope?: "report" | "harbor-project";
  projectType?: "PROJECT" | "NON_PROJECT";
  canReassign?: boolean;
  heldPreviousStatus?: "NOT_STARTED" | "IN_PROGRESS";
  capacityWarningOwner?: string;
};
type ApprovalRequest = { id: string; typeKey: string; title: string; summary: string; subjectLabel: string; reason: string; requesterLabel: string; approvalLevel: string; requestedAt: string; expiresAt: string | null };

const tasks: Task[] = [
  { id: "TSK-2481", title: "Revise lobby wayfinding elevations", project: "Harbor House", branch: "North Studio", stage: "Interior design · Package 04", owner: "Maya Chen", primaryOwner: false, collaborator: true, status: "CORRECTIONS_REQUIRED", reviewRequirement: "INTERNAL", capabilities: { transition: false, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-09", committed: "2026-10-12", version: 8, nextActor: "Maya Chen · Task owner", nextAction: "Prepare corrected evidence for review", review: { round: "Round 2", roundId: "REV-HH-204-02", revision: "A-204 · R02", clientRevision: "CR01", reviewer: "Jonah Patel", readable: true }, description: "Update the lobby wayfinding elevations against the latest accessibility comments. Keep the door schedule reference visible on the sheet." },
  { id: "TSK-2473", title: "Prepare lighting control narrative", project: "Cedar & Stone Hotel", branch: "North Studio", stage: "Design development · Stage 03", owner: "Jordan Lee", primaryOwner: true, collaborator: false, status: "IN_PROGRESS", reviewRequirement: "NONE", capabilities: { transition: true, wait: true, resume: false, review: false, submitCorrection: false }, target: "2026-10-08", committed: "2026-10-08", version: 5, nextActor: "Jordan Lee", nextAction: "Continue task work", description: "Document the control zones, scene intent and coordination notes for the client review set." },
  { id: "TSK-2466", title: "Confirm stone sample availability", project: "Juniper House", branch: "West Studio", stage: "Procurement · Milestone 02", owner: "Jordan Lee", primaryOwner: true, collaborator: false, status: "WAITING", reviewRequirement: "NONE", capabilities: { transition: true, wait: false, resume: true, review: false, submitCorrection: false }, target: "2026-10-10", version: 3, nextActor: "Jordan Lee · Task owner", nextAction: "Resume work when the sample is available", description: "The supplier is checking the next available slab lot. Waiting reason and responsible party are recorded in the task." },
  { id: "TSK-2458", title: "Review reflected ceiling plan", project: "Harbor House", branch: "North Studio", stage: "Internal review · Package 04", owner: "Alex Morgan", primaryOwner: false, collaborator: true, status: "IN_INTERNAL_REVIEW", reviewRequirement: "INTERNAL", capabilities: { transition: false, wait: false, resume: false, review: true, submitCorrection: false }, target: "2026-10-11", committed: "2026-10-11", version: 12, nextActor: "Jordan Lee · Independent reviewer", nextAction: "Open exact review evidence", review: { round: "Round 3", roundId: "REV-HH-612-03", revision: "A-612 · R03", reviewer: "Jordan Lee", readable: true }, isReview: true, description: "Review the submitted reflected ceiling plan against the coordinated lighting layout. Any decision belongs to the internal review workflow." },
  { id: "TSK-2441", title: "Issue finish schedule for coordination", project: "Cedar & Stone Hotel", branch: "North Studio", stage: "No linked stage", owner: "Jordan Lee", primaryOwner: true, collaborator: false, status: "NOT_STARTED", reviewRequirement: "NONE", capabilities: { transition: true, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-14", committed: "2026-10-16", version: 2, nextActor: "Jordan Lee", nextAction: "Preview start workflow", hasUnfinishedDependency: true, description: "Prepare the coordinated finish schedule for the consultant issue. Check material IDs against the approved palette." },
  { id: "TSK-2420", title: "Coordinate guestroom joinery details", project: "Juniper House", branch: "West Studio", stage: "Design development · Stage 03", owner: "Jordan Lee", primaryOwner: true, collaborator: false, status: "IN_PROGRESS", reviewRequirement: "NONE", capabilities: { transition: true, wait: true, resume: false, review: false, submitCorrection: false }, target: "2026-10-06", version: 9, nextActor: "Jordan Lee", nextAction: "Continue task work", description: "Resolve the wardrobe, minibar and desk joinery details for the typical guestroom." },
  { id: "TSK-2407", title: "Close material board comments", project: "Fieldstone Retreat", branch: "South Studio", stage: "Client review · Package 02", owner: "Priya Shah", primaryOwner: false, collaborator: true, status: "IN_PROGRESS", reviewRequirement: "NONE", capabilities: { transition: false, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-16", version: 4, nextActor: "Priya Shah · Task owner", nextAction: "Current employee is a read-only collaborator", description: "Help reconcile the material board comments and capture the agreed finish references." },
  { id: "TSK-2398", title: "Reassign site measure follow-up", project: "Fieldstone Retreat", branch: "South Studio", stage: "Site coordination · Stage 02", owner: "Devon Brooks", primaryOwner: false, collaborator: true, status: "WAITING", reviewRequirement: "NONE", capabilities: { transition: false, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-13", version: 6, nextActor: "Scoped manager · reassignment required", nextAction: "Resolve employee exit reassignment hold", requiresReassignment: true, reassignmentGrant: { viewer: "Jordan Lee", scope: "Granted collaborator task visibility" }, description: "The previous assignee left the project. Reassignment must follow the owning workforce and task workflow." },
  { id: "TSK-2385", title: "Check joinery sample sign-off", project: "Juniper House", branch: "West Studio", stage: "Internal review · Package 03", owner: "Elena Ruiz", primaryOwner: false, collaborator: true, status: "IN_INTERNAL_REVIEW", reviewRequirement: "INTERNAL", capabilities: { transition: false, wait: false, resume: false, review: true, submitCorrection: false }, target: "2026-10-12", version: 7, nextActor: "Jordan Lee · Independent reviewer", nextAction: "Open exact review evidence", review: { round: "Round 1", roundId: "REV-JH-312-01", revision: "JH-312 · R01", reviewer: "Jordan Lee", readable: true }, isReview: true, description: "Confirm the joinery sample matches the approved material and finish schedule. Reviewer and task owner remain distinct." },
  { id: "TSK-2372", title: "Review stone transition detail", project: "Harbor House", branch: "North Studio", stage: "Internal review · Package 05", owner: "Jonah Patel", primaryOwner: false, collaborator: true, status: "IN_INTERNAL_REVIEW", reviewRequirement: "INTERNAL", capabilities: { transition: false, wait: false, resume: false, review: true, submitCorrection: false }, target: "2026-10-15", version: 3, nextActor: "Jordan Lee · Independent reviewer", nextAction: "Open exact review evidence", review: { round: "Round 2", roundId: "REV-HH-511-02", revision: "A-511 · R02", reviewer: "Jordan Lee", readable: true }, isReview: true, description: "Check the transition detail against the latest coordinated floor finish plan." },
  { id: "TSK-2364", title: "Update reception signage schedule", project: "Harbor House", branch: "North Studio", stage: "Interior design · Package 04", owner: "Maya Chen", primaryOwner: false, collaborator: true, status: "CORRECTIONS_REQUIRED", reviewRequirement: "INTERNAL", capabilities: { transition: false, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-17", version: 4, nextActor: "Maya Chen · Task owner", nextAction: "Prepare correction and resubmission", review: { round: "Round 3", roundId: "REV-HH-219-03", revision: "A-219 · R03", clientRevision: "CR02", reviewer: "Jonah Patel", readable: true }, description: "Clarify the finish codes in the reception signage schedule and resubmit against the exact correction round." },
  { id: "TSK-2345", title: "Publish approved finish palette", project: "Cedar & Stone Hotel", branch: "North Studio", stage: "Design development · Stage 03", owner: "Jordan Lee", primaryOwner: true, collaborator: false, status: "COMPLETED", reviewRequirement: "NONE", capabilities: { transition: false, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-07", committed: "2026-10-07", version: 11, nextActor: "No next actor · task is complete", nextAction: "Read-only task history", description: "The approved finish palette was published to the project team. This terminal task remains available as read-only history." },
  { id: "TSK-2501", title: "Coordinate lobby signage package", project: "Harbor House", branch: "North Studio", stage: "Interior design · Package 05", owner: "Maya Chen", primaryOwner: false, collaborator: false, status: "IN_PROGRESS", reviewRequirement: "NONE", capabilities: { transition: false, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-13", committed: "2026-10-14", version: 4, nextActor: "Maya Chen · Task owner", nextAction: "Coordinate package details", description: "Fixture-authorized Harbor House project oversight. This record is visible through the explicit managed project grant.", managementScope: "harbor-project", projectType: "PROJECT", canReassign: true, capacityWarningOwner: "Alex Morgan" },
  { id: "TSK-2502", title: "Confirm site access window", project: "Studio operations", branch: "North Studio", stage: "No linked stage", owner: "Alex Morgan", primaryOwner: false, collaborator: false, status: "WAITING", reviewRequirement: "NONE", capabilities: { transition: false, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-16", version: 2, nextActor: "Alex Morgan · Task owner", nextAction: "Confirm the site access window", description: "Fixture-authorized reporting-tree nonproject task for leader progress oversight.", managementScope: "report", projectType: "NON_PROJECT", canReassign: true, heldPreviousStatus: "IN_PROGRESS" },
  { id: "TSK-2503", title: "Prepare North Studio sample register", project: "Studio operations", branch: "North Studio", stage: "No linked stage", owner: "Maya Chen", primaryOwner: false, collaborator: false, status: "NOT_STARTED", reviewRequirement: "NONE", capabilities: { transition: false, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-20", version: 1, nextActor: "Maya Chen · Task owner", nextAction: "Prepare sample register", description: "Fixture-authorized reporting-tree nonproject task for leader progress oversight.", managementScope: "report", projectType: "NON_PROJECT", canReassign: true, heldPreviousStatus: "NOT_STARTED" },
  { id: "TSK-2504", title: "Reassign studio sample register", project: "Studio operations", branch: "North Studio", stage: "No linked stage", owner: "Devon Brooks", primaryOwner: false, collaborator: false, status: "WAITING", reviewRequirement: "NONE", capabilities: { transition: false, wait: false, resume: false, review: false, submitCorrection: false }, target: "2026-10-21", version: 3, nextActor: "Team leader · reassignment required", nextAction: "Assign an eligible active employee", requiresReassignment: true, description: "Fixture-authorized reporting-tree nonproject employee-exit hold. Stored prior state: Not started.", managementScope: "report", projectType: "NON_PROJECT", canReassign: true, heldPreviousStatus: "NOT_STARTED" },
];

const approvalFixtures: ApprovalRequest[] = [];

const tabs = ["Active", "Overdue", "Due today", "Waiting", "Reviews", "Upcoming"] as const;
type Tab = (typeof tabs)[number];
type Scenario = "Ready" | "Loading" | "Empty" | "Denied" | "Offline" | "Error";
type ContextScenario = "Employee account" | "Terminal task" | "Employee exit reassignment hold";
type Persona = "Employee" | "Teamleader" | "Owner";
type WorkContext = "Personal work" | "Manage visible work" | "Organization work";
type ActionKind = "Start work" | "Wait" | "Complete work" | "Resume work" | "Submit correction";
const scenarios: Scenario[] = ["Ready", "Loading", "Empty", "Denied", "Offline", "Error"];
const contextScenarios: ContextScenario[] = ["Employee account", "Terminal task", "Employee exit reassignment hold"];

function initialParams() {
  const params = new URLSearchParams(window.location.search);
  const persona = (params.get("persona") === "Teamleader" || params.get("persona") === "Owner" ? params.get("persona") : "Employee") as Persona;
  const requestedContext = params.get("workContext");
  const workContext: WorkContext = persona === "Teamleader" && requestedContext === "Manage visible work" ? "Manage visible work"
    : persona === "Owner" && requestedContext === "Organization work" ? "Organization work" : "Personal work";
  return {
    tab: (tabs.includes(params.get("tab") as Tab) ? params.get("tab") : "Active") as Tab,
    task: params.has("task") ? params.get("task") ?? "" : tasks[0]!.id,
    q: params.get("q") ?? "",
    project: params.get("project") ?? "",
    owner: params.get("owner") ?? "",
    status: params.get("status") ?? "",
    sort: params.get("sort") ?? "target",
    page: params.get("page") ?? "1",
    view: params.get("view") ?? "work",
    roundId: params.get("roundId") ?? "",
    returnTo: params.get("return") ?? "",
    persona,
    workContext,
  };
}

function scenarioParam(key: string): Scenario {
  const value = new URLSearchParams(window.location.search).get(key);
  return scenarios.includes(value as Scenario) ? value as Scenario : "Ready";
}

function contextParam(): ContextScenario {
  const value = new URLSearchParams(window.location.search).get("context");
  return contextScenarios.includes(value as ContextScenario) ? value as ContextScenario : "Employee account";
}

const activeEmployees = ["Jordan Lee", "Maya Chen", "Alex Morgan", "Priya Shah", "Jonah Patel", "Elena Ruiz"];
const configuredWarningOwner = "Alex Morgan";
const personaLabels: Record<Persona, string> = { Employee: "Jordan Lee · Employee", Teamleader: "Jordan Lee · Teamleader (fixture grants)", Owner: "Avery Patel · Owner (no employee link)" };

function labelFor(status: TaskStatus) {
  return statusLabels[status];
}

function statusClass(status: TaskStatus) {
  return status.toLowerCase().replaceAll("_", "-");
}

type Accent = "overdue" | "today" | "correction" | "waiting" | "review" | "active" | "completed" | "upcoming";

function dateAccent(task: Task): Extract<Accent, "overdue" | "today" | "upcoming" | "completed"> {
  if (task.status === "COMPLETED") return "completed";
  if (task.target < "2026-10-08") return "overdue";
  if (task.target === "2026-10-08") return "today";
  return "upcoming";
}

function rowAccent(task: Task): Accent {
  const dateState = dateAccent(task);
  if (dateState === "overdue" || dateState === "today") return dateState;
  if (task.status === "CORRECTIONS_REQUIRED") return "correction";
  if (task.status === "WAITING") return "waiting";
  if (task.status === "IN_INTERNAL_REVIEW") return "review";
  if (task.status === "COMPLETED") return "completed";
  if (task.status === "NOT_STARTED") return "upcoming";
  return "active";
}

function lensAccent(tab: Tab): Accent {
  if (tab === "Overdue") return "overdue";
  if (tab === "Due today") return "today";
  if (tab === "Waiting") return "waiting";
  if (tab === "Reviews") return "review";
  if (tab === "Upcoming") return "upcoming";
  return "active";
}

function actionTitle(action: ActionKind) {
  const titles: Record<ActionKind, string> = { "Start work": "Preview start workflow", Wait: "Preview wait workflow", "Complete work": "Preview completion workflow", "Resume work": "Preview resume workflow", "Submit correction": "Preview correction submission" };
  return titles[action];
}

function actionReasonLabel(action: ActionKind) {
  const labels: Record<ActionKind, string> = { "Start work": "Reason for starting", Wait: "Reason for waiting", "Complete work": "Reason for completion", "Resume work": "Reason for resuming", "Submit correction": "Reason for submitting correction" };
  return labels[action];
}

function dueLabel(date: string) {
  if (date === "2026-10-08") return "Due today";
  if (date < "2026-10-08") return "Overdue";
  return `Due ${dateLabel(date)}`;
}

function dateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
}

function App() {
  const [route, setRoute] = useState(initialParams);
  const [reviewPage, setReviewPage] = useState(1);
  const [correctionPage, setCorrectionPage] = useState(1);
  const [reassignmentPage, setReassignmentPage] = useState(1);
  const [source, setSourceState] = useState<Scenario>(() => scenarioParam("source"));
  const [reviewSource, setReviewSourceState] = useState<Scenario>(() => scenarioParam("reviewSource"));
  const [approvalSource, setApprovalSourceState] = useState<Scenario>(() => scenarioParam("approvalSource"));
  const [contextScenario, setContextScenarioState] = useState<ContextScenario>(contextParam);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState(false);
  const [delayCause, setDelayCause] = useState("");
  const [responsibleParty, setResponsibleParty] = useState("");
  const [dependencyAck, setDependencyAck] = useState(false);
  const [managementDialog, setManagementDialog] = useState<"create" | "reassign" | null>(null);
  const [managementReceipt, setManagementReceipt] = useState(false);
  const [managementExpected, setManagementExpected] = useState<{ id: string; version: number } | null>(null);
  const [manageTitle, setManageTitle] = useState("");
  const [manageType, setManageType] = useState<"PROJECT" | "NON_PROJECT">("PROJECT");
  const [manageProject, setManageProject] = useState("Harbor House");
  const [managePriority, setManagePriority] = useState("");
  const [manageTarget, setManageTarget] = useState("");
  const [manageOwner, setManageOwner] = useState("");
  const [manageReason, setManageReason] = useState("");
  const [capacityAck, setCapacityAck] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(() => window.innerWidth < 1024 && Boolean(new URLSearchParams(window.location.search).get("task")));
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 1024);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const [mobileListReturnFocus, setMobileListReturnFocus] = useState<HTMLElement | null>(null);
  const receiptReturnRef = useRef<HTMLButtonElement>(null);
  const detailBackRef = useRef<HTMLButtonElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const managementFirstRef = useRef<HTMLInputElement>(null);
  const managementSelectRef = useRef<HTMLSelectElement>(null);
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const onPopState = () => {
      const restored = initialParams();
      setRoute(restored);
      routeRef.current = restored;
      setSourceState(scenarioParam("source"));
      setReviewSourceState(scenarioParam("reviewSource"));
      setApprovalSourceState(scenarioParam("approvalSource"));
      setContextScenarioState(contextParam());
      const restoredParams = new URLSearchParams(window.location.search);
      setMobileDetail(restored.view === "work" && Boolean(restoredParams.get("task")) && window.innerWidth < 1024);
      setAction(null);
      setReceipt(false);
      setManagementDialog(null);
      setManagementReceipt(false);
      setManagementExpected(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const narrow = window.innerWidth < 1024;
      setIsNarrow(narrow);
      if (narrow && Boolean(new URLSearchParams(window.location.search).get("task"))) setMobileDetail(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!mobileDetail) return;
    window.setTimeout(() => {
      if (isNarrow) detailBackRef.current?.focus();
      else detailHeadingRef.current?.focus();
    }, 0);
  }, [mobileDetail, isNarrow]);

  const updateRoute = (next: Partial<typeof route>, push = false) => {
    if ("persona" in next || "workContext" in next || "task" in next || "view" in next) {
      setManagementDialog(null); setManagementReceipt(false); setManagementExpected(null);
    }
    const merged = { ...route, ...next };
    setRoute(merged);
    routeRef.current = merged;
    const params = new URLSearchParams(window.location.search);
    const paramMap = { tab: "tab", task: "task", q: "q", project: "project", owner: "owner", status: "status", sort: "sort", page: "page", view: "view", roundId: "roundId", returnTo: "return", persona: "persona", workContext: "workContext" } as const;
    for (const [key, param] of Object.entries(paramMap) as Array<[keyof typeof paramMap, (typeof paramMap)[keyof typeof paramMap]]>) {
      const value = String(merged[key]);
      if (key === "task" && value === "") params.set(param, "");
      else if (value) params.set(param, value);
      else params.delete(param);
    }
    const url = `${window.location.pathname}?${params.toString()}`;
    if (push) window.history.pushState({}, "", url);
    else window.history.replaceState({}, "", url);
  };

  const persistScenario = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value === "Ready" || value === "Employee account") params.delete(key);
    else params.set(key, value);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}`);
  };
  const setSource = (value: Scenario) => { setSourceState(value); persistScenario("source", value); setManagementDialog(null); setManagementReceipt(false); setManagementExpected(null); };
  const setReviewSource = (value: Scenario) => { setReviewSourceState(value); persistScenario("reviewSource", value); };
  const setApprovalSource = (value: Scenario) => { setApprovalSourceState(value); persistScenario("approvalSource", value); };
  const setContextScenario = (value: ContextScenario) => { setContextScenarioState(value); persistScenario("context", value); };

  const ownerPersona = route.persona === "Owner";
  const personalEmpty = ownerPersona;
  const leaderVisible = (task: Task) => task.primaryOwner || task.collaborator || task.managementScope === "report" || task.managementScope === "harbor-project";
  const contextTasks = route.persona === "Employee" || route.workContext === "Personal work" ? tasks.filter((task) => !personalEmpty && (task.primaryOwner || task.collaborator))
    : route.persona === "Teamleader" && route.workContext === "Manage visible work" ? tasks.filter(leaderVisible)
    : route.persona === "Owner" && route.workContext === "Organization work" ? tasks
      : tasks.filter((task) => !personalEmpty && (task.primaryOwner || task.collaborator));
  const selectedTask = contextTasks.find((task) => task.id === route.task);
  const unknownTask = route.task.length === 0 || !selectedTask;
  const current = selectedTask ?? tasks[0]!;
  const tabCounts: Record<Tab, number> = {
    Active: contextTasks.filter((task) => task.status !== "COMPLETED").length,
    Overdue: contextTasks.filter((task) => task.target < "2026-10-08" && task.status !== "COMPLETED").length,
    "Due today": contextTasks.filter((task) => task.target === "2026-10-08" && task.status !== "COMPLETED").length,
    Waiting: contextTasks.filter((task) => task.status === "WAITING").length,
    Reviews: contextTasks.filter((task) => task.status === "IN_INTERNAL_REVIEW" || task.status === "CORRECTIONS_REQUIRED").length,
    Upcoming: contextTasks.filter((task) => task.target > "2026-10-08" && task.status !== "COMPLETED").length,
  };
  const visibleTasks = useMemo(() => {
    let result = contextTasks.filter((task) => {
      const managementCompletedFilter = (route.persona === "Teamleader" && route.workContext === "Manage visible work" || route.persona === "Owner" && route.workContext === "Organization work") && route.status === "COMPLETED";
      const tabMatch = managementCompletedFilter ? task.status === "COMPLETED" : route.tab === "Active" ? task.status !== "COMPLETED"
        : route.tab === "Overdue" ? task.target < "2026-10-08" && task.status !== "COMPLETED"
          : route.tab === "Due today" ? task.target === "2026-10-08" && task.status !== "COMPLETED"
            : route.tab === "Waiting" ? task.status === "WAITING"
              : route.tab === "Reviews" ? task.status === "IN_INTERNAL_REVIEW" || task.status === "CORRECTIONS_REQUIRED"
                : task.target > "2026-10-08" && task.status !== "COMPLETED";
      return tabMatch && (!route.q || `${task.title} ${task.project}`.toLowerCase().includes(route.q.toLowerCase()))
        && (!route.project || task.project === route.project)
        && (!route.owner || task.owner === route.owner)
        && (!route.status || task.status === route.status);
    });
    result = [...result].sort((a, b) => route.sort === "title" ? a.title.localeCompare(b.title) : a.target.localeCompare(b.target));
    return result;
  }, [route, contextScenario, reviewSource, personalEmpty]);
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(visibleTasks.length / pageSize));
  const requestedPage = Number.parseInt(route.page, 10);
  const safePage = Math.min(Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1, pageCount);
  const pageTasks = visibleTasks.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectTask = (task: Task) => {
    if (document.activeElement instanceof HTMLElement) setMobileListReturnFocus(document.activeElement);
    updateRoute({ task: task.id }, true);
    setMobileDetail(true);
  };
  const changePersona = (persona: Persona) => {
    updateRoute({ persona, workContext: "Personal work", task: "", view: "work", roundId: "", returnTo: "", page: "1" }, true);
    setManagementDialog(null);
    setManagementReceipt(false);
    setMobileDetail(false);
  };
  const setWorkContext = (workContext: WorkContext) => updateRoute({ workContext, task: "", view: "work", roundId: "", returnTo: "", page: "1" }, true);
  const createCandidates = manageType === "NON_PROJECT" ? (route.persona === "Teamleader" ? ["Maya Chen", "Alex Morgan"] : activeEmployees)
    : route.persona === "Teamleader" ? ["Maya Chen", "Alex Morgan"] : manageProject === "Harbor House" ? ["Maya Chen", "Alex Morgan"] : ["Jordan Lee", "Alex Morgan"];
  const reassignCandidates = current.projectType === "NON_PROJECT" ? route.persona === "Teamleader" ? ["Maya Chen", "Alex Morgan"] : activeEmployees
    : current.project === "Harbor House" && current.managementScope === "harbor-project" ? ["Maya Chen", "Alex Morgan"] : [];
  const openManagement = (kind: "create" | "reassign", opener: HTMLElement) => {
    setReturnFocus(opener);
    setManagementDialog(kind);
    setManagementReceipt(false);
    setManagementExpected(kind === "reassign" ? { id: current.id, version: current.version } : null);
    setManageTitle(""); setManageType(kind === "create" ? "PROJECT" : "PROJECT"); setManageProject(current.project === "Harbor House" ? "Harbor House" : "Harbor House");
    setManagePriority(""); setManageTarget(""); setManageOwner(""); setManageReason(""); setCapacityAck(false);
  };
  const closeManagement = () => {
    setManagementDialog(null); setManagementReceipt(false); setManagementExpected(null);
    window.setTimeout(() => returnFocus?.focus(), 0);
  };
  const openAction = (kind: ActionKind, opener: HTMLElement) => {
    setReturnFocus(opener);
    setAction(kind);
    setReason("");
    setDelayCause("");
    setResponsibleParty("");
    setDependencyAck(false);
    setReceipt(false);
  };
  const closeAction = () => {
    setAction(null);
    setReceipt(false);
    window.setTimeout(() => returnFocus?.focus(), 0);
  };
  useEffect(() => {
    if (receipt) window.setTimeout(() => receiptReturnRef.current?.focus(), 0);
  }, [receipt]);
  useEffect(() => {
    if (managementReceipt) window.setTimeout(() => receiptReturnRef.current?.focus(), 0);
  }, [managementReceipt]);
  useEffect(() => {
    if (!action) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAction();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>("[role='dialog'][aria-modal='true']");
      const controls = dialog ? [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")] : [];
      if (controls.length === 0) return;
      const first = controls[0]!;
      const last = controls[controls.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [action]);
  useEffect(() => {
    if (!managementDialog) return;
    window.setTimeout(() => (managementDialog === "create" ? managementFirstRef.current : managementSelectRef.current)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeManagement(); return; }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>("[data-management-dialog='true']");
      const controls = dialog ? [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])")] : [];
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1]?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0]?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [managementDialog]);
  const closeTaskDetail = () => {
    setMobileDetail(false);
    updateRoute({ task: "" }, true);
    window.setTimeout(() => {
      if (mobileListReturnFocus?.isConnected) mobileListReturnFocus.focus();
      else if (selectedTask) document.getElementById(`task-row-${selectedTask.id}`)?.focus();
      else document.getElementById("task-search")?.focus();
    }, 0);
  };
  const startReview = (task: Task) => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", "review");
    params.set("task", task.id);
    params.set("roundId", task.review?.roundId ?? "");
    params.set("return", window.location.pathname + window.location.search);
    window.history.pushState({ prototypeReviewReturn: true }, "", `${window.location.pathname}?${params.toString()}`);
    const nextRoute = { ...route, view: "review", task: task.id, roundId: task.review?.roundId ?? "", returnTo: window.location.pathname + window.location.search };
    setRoute(nextRoute);
    routeRef.current = nextRoute;
  };
  const backToWork = () => {
    if (window.history.state?.prototypeReviewReturn === true) {
      window.history.back();
      return;
    }
    updateRoute({ view: "work", returnTo: "", roundId: "" }, true);
  };
  const changeContextScenario = (scenario: ContextScenario) => {
    setContextScenario(scenario);
    const taskId = scenario === "Terminal task" ? "TSK-2345" : scenario === "Employee exit reassignment hold" ? "TSK-2398" : tasks[0]!.id;
    updateRoute({ view: "work", task: taskId }, true);
    setMobileDetail(false);
  };

  const reviewUnavailable = reviewSource !== "Ready";
  const reviewRouteAllowed = Boolean(selectedTask?.review?.readable && selectedTask.review.roundId === route.roundId && !reviewUnavailable);

  if (route.view === "review" && !reviewRouteAllowed) {
    const unavailableMessage = unknownTask || !selectedTask?.review || selectedTask.review.roundId !== route.roundId
      ? "The task and review round identifier must match an exact sample record."
      : reviewSource === "Offline"
          ? "Offline sample metadata is available, but exact review evidence requires the ready review source."
          : reviewSource === "Loading"
            ? "The review source is loading. Reviewer names and evidence remain unavailable until it finishes."
            : reviewSource === "Denied"
              ? "The review source is unavailable for this account. Reviewer names and evidence remain hidden."
              : reviewSource === "Error"
                ? "The review source could not be loaded. Retry it before opening exact evidence."
                : reviewSource === "Empty"
                  ? "The review source has no loaded records for this request."
                  : "Exact review evidence is unavailable from the current review source.";
    return <div className="review-shell"><header className="review-top"><button className="quiet-button" onClick={backToWork}>← <span>Back to My Work</span></button><span className="prototype-badge"><span className="pulse-dot" /> Review destination · mock</span></header><main className="review-page"><div className="state-panel"><span className="state-icon denied">!</span><h1>Task or review round unavailable</h1><p>{unavailableMessage}</p></div></main></div>;
  }
  if (route.view === "review") {
    return <div className="review-shell">
      <header className="review-top"><button className="quiet-button" onClick={backToWork}>← <span>Back to My Work</span></button><span className="prototype-badge"><span className="pulse-dot" /> Review destination · mock</span></header>
      <main className="review-page">
        <div className="eyebrow">Internal review · {current.project}</div>
        <h1>{current.title}</h1>
        <p className="review-lead">This is an isolated review destination. The selected exact evidence is available for read-only layout review.</p>
        <EvidenceStrip task={current} />
        <div className="review-columns">
          <section className="evidence-preview"><div className="preview-toolbar"><span className="file-chip">▧ {current.review!.revision}</span><span className="preview-zoom">Exact revision</span></div><div className="preview-unavailable"><span className="preview-file-icon">▧</span><h2>Evidence preview unavailable</h2><p>No source file is connected to this fixture. The exact review, round and revision remain identified above.</p></div><p className="muted small">No substitute evidence is shown.</p></section>
          <aside className="decision-pane"><div className="section-kicker">Decision context</div><h2>Review evidence</h2><p>Decision controls belong to the owning Reviews workflow. This preview does not submit an approval or correction.</p><div className="review-fact"><span>Next actor</span><strong>{current.nextActor}</strong></div><div className="review-fact"><span>Current round</span><strong>{current.review!.round} · {current.review!.roundId}</strong></div><div className="review-fact"><span>Evidence revision</span><strong>{current.review!.revision}</strong></div><button className="primary-button full" onClick={backToWork}>Return to My Work</button></aside>
        </div>
        <p className="mock-receipt">Preview only; no change saved</p>
      </main>
    </div>;
  }

  const blocked = source === "Denied" || source === "Loading" || source === "Empty" || source === "Error";
  const filterUnavailable = blocked || (personalEmpty && route.workContext === "Personal work");
  const scenarioCopy: Record<Scenario, string> = {
    Ready: "Authorized fixture scope is ready. Sample data only.",
    Loading: "Loading personal work…",
    Empty: "No tasks are assigned to you as primary owner or collaborator in this sample.",
    Denied: "Personal task access is unavailable. Return to a permitted page or retry this source.",
    Offline: "Offline · showing a cached sample read only. Review and other decisions require an online source.",
    Error: "Personal work could not be loaded. Retry the source to recover.",
  };
  const managementScenarioCopy: Record<Scenario, string> = {
    Ready: "Authorized fixture scope is ready. Sample data only.",
    Loading: "Loading tasks…",
    Empty: "No visible task records exist in this sample scope.",
    Denied: "Visible task access is unavailable. Retry this task source to recover.",
    Offline: "Offline · cached task sample is read only. Management previews require an online source.",
    Error: "Couldn’t load tasks. Retry the task source to recover.",
  };
  const reviewSections = ownerPersona ? [] : tasks.filter((task) => task.isReview && task.review?.reviewer === "Jordan Lee");
  const correctionSections = tasks.filter((task) => task.status === "CORRECTIONS_REQUIRED" && (task.primaryOwner || task.collaborator));
  const reassignmentSections = tasks.filter((task) => task.requiresReassignment && task.reassignmentGrant?.viewer === "Jordan Lee");
  const approvalRequests = approvalFixtures;
  const personalTaskSource: Scenario = ownerPersona ? "Empty" : source;

  const detailOpen = Boolean(route.task);
  const manageVisible = route.workContext !== "Personal work" && ((route.persona === "Teamleader" && route.workContext === "Manage visible work") || (route.persona === "Owner" && route.workContext === "Organization work"));
  const canAssign = manageVisible && source === "Ready";
  const exactReassign = manageVisible && Boolean(current.canReassign) && current.status !== "COMPLETED" && current.status !== "CORRECTIONS_REQUIRED" && !current.isReview && current.reviewRequirement === "NONE" && source === "Ready" && ((current.projectType === "NON_PROJECT" && current.managementScope === "report") || (current.project === "Harbor House" && current.managementScope === "harbor-project"));
  const eligibleReassignOwners = reassignCandidates.filter((name) => name !== current.owner && activeEmployees.includes(name));
  const managementTitleValid = manageTitle.trim().length >= 2 && manageTitle.trim().length <= 160;
  const managementReasonValid = manageReason.trim().length >= 3 && manageReason.trim().length <= 1000;
  const managementCommonValid = Boolean(manageOwner && manageTarget && /^\d{4}-\d{2}-\d{2}$/.test(manageTarget) && ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(managePriority) && managementReasonValid);
  const managementReady = managementDialog === "create" ? canAssign && source === "Ready" && managementTitleValid && managementCommonValid && createCandidates.includes(manageOwner) && (manageType === "NON_PROJECT" || manageProject === "Harbor House" || (route.persona === "Owner" && manageProject === "Cedar & Stone Hotel")) && (manageOwner !== configuredWarningOwner || capacityAck) : Boolean(exactReassign && source === "Ready" && selectedTask?.id === managementExpected?.id && selectedTask?.version === managementExpected?.version && manageOwner && eligibleReassignOwners.includes(manageOwner) && managementReasonValid && (manageOwner !== configuredWarningOwner || capacityAck));

  return <div className={`app-shell${detailOpen ? " detail-open" : ""}`}>
    <aside className="sidebar" inert={mobileDetail && isNarrow}>
      <a className="brand" href="?view=work" aria-label="Sense Studios home"><span className="brand-mark">S</span><span><strong>sense</strong><small>STUDIOS</small></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main navigation" className="main-nav">
        <a href="#dashboard"><span className="nav-icon">◫</span>Dashboard</a>
        <a href="#work" className="active" aria-current="page"><span className="nav-icon">▤</span>My Work</a>
        <a href="#projects"><span className="nav-icon">▦</span>Projects</a>
        <a href="#tasks"><span className="nav-icon">☷</span>Tasks</a>
        <a href="#documents"><span className="nav-icon">▧</span>Documents</a>
        <a href="#reviews"><span className="nav-icon">◉</span>Reviews</a>
      </nav>
      <div className="sidebar-divider" />
      <button className="sidebar-link" onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen}><span className="nav-icon">⌄</span>More workspace</button>
      {advancedOpen && <div className="advanced-links"><a href="#time">Time</a><a href="#learning">Learning</a><a href="#insights">Insights</a><a href="#manage">Manage</a><p>Operational parity remains in each owning module.</p></div>}
      <div className="sidebar-bottom"><div className="avatar">{ownerPersona ? "AP" : "JL"}</div><div><strong>{ownerPersona ? "Avery Patel" : "Jordan Lee"}</strong><small>{route.persona === "Teamleader" ? "Team leader · fixture grants" : ownerPersona ? "Owner · no employee link" : "Project coordinator"}</small></div></div>
    </aside>

    <main className="main-area" inert={mobileDetail && isNarrow}>
      <div className="prototype-banner"><span className="pulse-dot" /> <strong>Review prototype</strong><span>Sample data · no live connection</span><button className="banner-info" aria-label="About this preview" title="All people, projects and activity are synthetic fixtures.">i</button></div>
      <div className="page-wrap">
        <div className="breadcrumbs"><span>Workspace</span><span className="crumb-chevron">/</span><strong>My Work</strong></div>
        <header className="page-heading"><div><div className="eyebrow">THURSDAY, OCTOBER 8, 2026</div><h1>My Work</h1><p>{route.workContext === "Personal work" ? "Work where you’re the primary owner or a collaborator." : route.persona === "Teamleader" ? "Manage explicitly visible reports and Harbor House project work." : "Organization work in the current organization."}</p></div><button className="outline-button" onClick={() => setScenariosOpen((open) => !open)} aria-expanded={scenariosOpen}><span className="sparkle">✳</span> Preview scenarios</button></header>

        <section className="role-context" aria-label="Prototype persona and work context"><label>Demo persona<select aria-label="Demo persona" value={route.persona} onChange={(event) => changePersona(event.target.value as Persona)}>{(["Employee", "Teamleader", "Owner"] as Persona[]).map((persona) => <option key={persona} value={persona}>{personaLabels[persona]}</option>)}</select></label><div className="context-switch" aria-label="Work context">{(route.persona === "Employee" ? ["Personal work"] : route.persona === "Teamleader" ? ["Personal work", "Manage visible work"] : ["Personal work", "Organization work"]).map((context) => <button key={context} className={route.workContext === context ? "selected" : ""} aria-pressed={route.workContext === context} onClick={() => setWorkContext(context as WorkContext)}>{context}</button>)}</div></section>

        <div className="work-tabs" aria-label="Task progress views">
          {tabs.map((tab) => <button key={tab} aria-pressed={route.tab === tab} className={`work-tab lens-${lensAccent(tab)}${route.tab === tab ? " active" : ""}`} onClick={() => updateRoute({ tab, page: "1" }, true)}><span>{tab}</span><span className="tab-count">{blocked ? "—" : tabCounts[tab]}</span></button>)}
        </div>
        <div className="sample-note"><span className="info-icon">i</span>Counts show loaded sample records only, not organization totals. Views can overlap.</div>
        {manageVisible && <section className="scope-status-counts" aria-label="Recorded task states"><span className="section-kicker">RECORDED STATE · LOADED SAMPLE</span><div>{(["NOT_STARTED", "IN_PROGRESS", "WAITING", "CORRECTIONS_REQUIRED", "IN_INTERNAL_REVIEW", "COMPLETED"] as TaskStatus[]).map((status) => <span key={status}><b>{blocked ? "—" : contextTasks.filter((task) => task.status === status).length}</b>{labelFor(status)}</span>)}</div></section>}

        {scenariosOpen && <section className="scenario-panel" aria-label="Preview source scenarios"><div className="scenario-heading"><div><span className="section-kicker">PROTOTYPE CONTROLS</span><h2>Preview source scenarios</h2><p>Switch source states and account context to inspect loading, access and recovery behavior.</p></div><button className="icon-button" onClick={() => setScenariosOpen(false)} aria-label="Close preview scenarios">×</button></div><div className="scenario-fields"><label>Task source<select value={source} onChange={(event) => setSource(event.target.value as Scenario)}>{(["Ready", "Loading", "Empty", "Denied", "Offline", "Error"] as Scenario[]).map((value) => <option key={value}>{value}</option>)}</select></label><label>Reviews source<select value={reviewSource} onChange={(event) => setReviewSource(event.target.value as Scenario)}>{(["Ready", "Loading", "Empty", "Denied", "Offline", "Error"] as Scenario[]).map((value) => <option key={value}>{value}</option>)}</select></label><label>Approval queue source<select value={approvalSource} onChange={(event) => setApprovalSource(event.target.value as Scenario)}>{(["Ready", "Loading", "Empty", "Denied", "Offline", "Error"] as Scenario[]).map((value) => <option key={value}>{value}</option>)}</select></label><label>Task scenario<select value={contextScenario} onChange={(event) => changeContextScenario(event.target.value as ContextScenario)}>{contextScenarios.map((value) => <option key={value}>{value}</option>)}</select></label><button className="outline-button retry-button" onClick={() => { setSource("Ready"); setReviewSource("Ready"); setApprovalSource("Ready"); }}>Retry sources</button></div></section>}

        <div className={`source-message ${source.toLowerCase()}`} role="status"><span className="message-symbol">{source === "Ready" ? "✓" : source === "Offline" ? "⌁" : source === "Denied" ? "⊘" : source === "Error" ? "!" : "i"}</span><span>{ownerPersona && route.workContext === "Personal work" ? "Owner account without an employee link · personal work is empty. Organization work has its own fixture scope." : manageVisible ? managementScenarioCopy[source] : scenarioCopy[source]}</span>{(source === "Error" || source === "Denied") && <button onClick={() => setSource("Ready")}>Retry</button>}</div>

        <section className="filterbar" aria-label="Task filters"><div className="search-field"><span>⌕</span><label className="sr-only" htmlFor="task-search">Search tasks</label><input id="task-search" type="search" placeholder="Search task or project" value={route.q} disabled={filterUnavailable} onChange={(event) => updateRoute({ q: event.target.value, page: "1" })} /></div><label className="filter-select"><span className="sr-only">Project</span><select disabled={filterUnavailable} value={filterUnavailable ? "" : route.project} onChange={(event) => updateRoute({ project: event.target.value, page: "1" })}><option value="">All projects</option>{!filterUnavailable && [...new Set(contextTasks.map((task) => task.project))].map((project) => <option key={project}>{project}</option>)}</select></label><label className="filter-select"><span className="sr-only">Owner</span><select disabled={filterUnavailable} value={filterUnavailable ? "" : route.owner} onChange={(event) => updateRoute({ owner: event.target.value, page: "1" })}><option value="">All owners</option>{!filterUnavailable && [...new Set(contextTasks.map((task) => task.owner))].sort().map((owner) => <option key={owner}>{owner}</option>)}</select></label><label className="filter-select"><span className="sr-only">Status</span><select disabled={filterUnavailable} value={filterUnavailable ? "" : route.status} onChange={(event) => updateRoute({ status: event.target.value, page: "1" })}><option value="">Any status</option>{!filterUnavailable && [...new Set(contextTasks.map((task) => task.status))].map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}</select></label><label className="sort-select"><span>Sort</span><select disabled={filterUnavailable} value={route.sort} onChange={(event) => updateRoute({ sort: event.target.value, page: "1" })}><option value="target">Target date</option><option value="title">Task name</option></select></label><button className="filter-reset" disabled={filterUnavailable} onClick={() => updateRoute({ q: "", project: "", owner: "", status: "", sort: "target", page: "1" })}>Reset</button></section>

        <section className="task-section" aria-label={manageVisible ? "Visible work tasks" : "Personal tasks"}><div className="section-header"><div><h2>{manageVisible ? route.persona === "Teamleader" ? "Manage visible work" : "Organization work" : route.tab === "Reviews" ? "Reviews for you" : route.status === "COMPLETED" ? "Completed tasks" : `${route.tab} tasks`}</h2><span>{blocked ? "Source status" : `${visibleTasks.length} loaded sample ${visibleTasks.length === 1 ? "task" : "tasks"}`}</span></div><div className="section-tools">{canAssign && <button className="outline-button" onClick={(event) => openManagement("create", event.currentTarget)}>Create &amp; assign</button>}<span className="list-label">☷ List</span></div></div>
          {personalEmpty && route.workContext === "Personal work" ? <div className="state-panel"><span className="state-icon">◌</span><h3>No employee-linked task scope</h3><p>Owner account Avery Patel has no employee link, so personal work is empty.</p></div>
            : source === "Denied" ? <div className="state-panel"><span className="state-icon denied">⊘</span><h3>Tasks are unavailable</h3><p>Task names and details are hidden while access is unavailable.</p><button className="outline-button" onClick={() => setSource("Ready")}>{manageVisible ? "Retry tasks" : "Retry personal tasks"}</button></div>
            : source === "Loading" ? <div className="state-panel loading-state"><span className="loading-bar" /><span className="loading-bar short" /><span className="loading-bar" /><p>{manageVisible ? "Loading tasks…" : "Loading personal tasks…"}</p></div>
              : source === "Error" ? <div className="state-panel"><span className="state-icon error">!</span><h3>{manageVisible ? "Couldn’t load tasks" : "Couldn’t load personal tasks"}</h3><p>{manageVisible ? "The task source could not be loaded. Retry to recover." : "Your other workspace sources remain available."}</p><button className="outline-button" onClick={() => setSource("Ready")}>{manageVisible ? "Retry tasks" : "Retry personal tasks"}</button></div>
                
                  : source === "Empty" || visibleTasks.length === 0 ? <div className="state-panel"><span className="state-icon">⌕</span><h3>{source === "Empty" ? manageVisible ? "No visible work" : "No assigned work yet" : "No tasks match these filters"}</h3><p>{source === "Empty" ? manageVisible ? "No visible task records exist in this sample scope." : "When a task is assigned to you as primary owner or collaborator, it will appear here." : "Try changing the search or filters."}</p>{source !== "Empty" && <button className="outline-button" onClick={() => updateRoute({ q: "", project: "", owner: "", status: "", page: "1" })}>Clear filters</button>}</div>
                  : <><div className="task-list">{pageTasks.map((task) => <button key={task.id} id={`task-row-${task.id}`} className={`task-row ${route.task === task.id ? "selected" : ""}`} onClick={() => selectTask(task)}><span className={`selection-mark urgency-${rowAccent(task)}`} /><span className="task-main"><span className="task-title-line"><strong>{task.title}</strong>{task.isReview && <span className="review-tag">Review</span>}{manageVisible && task.managementScope && <span className="review-tag management-tag">Fixture-authorized</span>}</span><span className="task-meta">{task.id}<span>·</span>{task.project}<span>·</span>{task.stage}</span><span className="mobile-row-details"><span className={`status-dot ${statusClass(task.status)}`} />{labelFor(task.status)}<span>·</span><span className={`due-cue ${dateAccent(task)}`}>{dueLabel(task.target)}</span></span><span className="secondary-row-details"><span><b>Owner</b> {task.owner}{task.collaborator && route.workContext === "Personal work" && !ownerPersona ? " · Collaborator" : ""}</span><span><b>Committed</b> {task.committed ? dateLabel(task.committed) : "Not committed"}</span><span><b>Target</b> <span className={`due-cue ${dateAccent(task)}`}>{dateLabel(task.target)}</span></span></span></span><span className={`status-pill ${statusClass(task.status)}`}>{labelFor(task.status)}</span><span className="task-owner">{task.primaryOwner ? <span className="avatar tiny">JL</span> : <span className="avatar tiny other">{task.owner.split(" ").map((part) => part[0]).join("")}</span>}<span>{task.owner}</span>{task.collaborator && route.workContext === "Personal work" && !ownerPersona && <span className="collab-dot" title="You are a collaborator">✦</span>}</span><span className="date-cell"><span>Committed date</span><strong>{task.committed ? dateLabel(task.committed) : "Not committed"}</strong><small className={`target-cue ${dateAccent(task)}`}>Target date {dateLabel(task.target)}</small></span><span className="row-chevron">›</span></button>)}</div><div className="list-footer"><span>Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, visibleTasks.length)} of {visibleTasks.length} loaded sample tasks</span><div className="pagination"><button aria-label="Previous task page" disabled={safePage <= 1} onClick={() => updateRoute({ page: String(safePage - 1) }, true)}>‹</button><span>{safePage} / {pageCount}</span><button aria-label="Next task page" disabled={safePage >= pageCount} onClick={() => updateRoute({ page: String(safePage + 1) }, true)}>›</button></div></div></>}
        </section>

        <details className="decision-details"><summary>Decisions awaiting you <span>{approvalSource === "Denied" || approvalSource === "Loading" || approvalSource === "Error" ? "Source status" : `${approvalRequests.length} typed sample request`}</span></summary><DecisionInbox items={approvalRequests} source={approvalSource} onRetry={() => setApprovalSource("Ready")} /></details>

        <div className="independent-sections">
          <IndependentSection title="Reviews needing your decision" icon="◉" items={reviewSections} page={reviewPage} setPage={setReviewPage} source={reviewSource} onOpen={startReview} empty="No review decisions are assigned to you." actionLabel="Open exact review" />
          <IndependentSection title="Corrections assigned to you" icon="↻" items={personalEmpty ? [] : correctionSections} page={correctionPage} setPage={setCorrectionPage} source={personalTaskSource} onOpen={selectTask} empty="No correction tasks are assigned to you." actionLabel="Open task" />
          <IndependentSection title="Reassignment holds in your tasks" icon="⇄" items={personalEmpty ? [] : reassignmentSections} page={reassignmentPage} setPage={setReassignmentPage} source={personalTaskSource} onOpen={selectTask} empty="No reassignment holds are linked to your tasks." actionLabel="Open task" />
        </div>
        <footer className="page-footer"><span>My Work brings together your personal task and review sources.</span><a href="#help">How My Work is assembled <span>↗</span></a></footer>
      </div>
    </main>

    <aside className={`detail-pane ${mobileDetail ? "mobile-open" : ""}`} aria-label="Selected task details">
      <div className="mobile-detail-header"><button ref={detailBackRef} className="quiet-button" onClick={closeTaskDetail}>← <span>Back to tasks</span></button><button className="icon-button" aria-label="Close task details" onClick={closeTaskDetail}>×</button></div>
      {unknownTask ? <div className="detail-hidden"><span className="state-icon">?</span><h2>Task unavailable in this sample</h2><p>This task identifier is not in the prototype dataset.</p></div> : ownerPersona && route.workContext === "Personal work" ? <div className="detail-hidden"><span className="state-icon">◌</span><h2>No employee-linked task</h2><p>Personal task details are unavailable without an employee assignment scope.</p></div> : source === "Denied" ? <div className="detail-hidden"><span className="state-icon denied">⊘</span><h2>Details unavailable</h2><p>Task names and details stay hidden while access is unavailable.</p><button className="outline-button" onClick={() => setSource("Ready")}>{manageVisible ? "Retry tasks" : "Retry personal tasks"}</button></div> : source === "Loading" ? <div className="detail-hidden"><span className="loading-bar" /><span className="loading-bar short" /><p role="status">Loading task details…</p></div> : source === "Empty" ? <div className="detail-hidden"><span className="state-icon">⌕</span><h2>No task selected</h2><p>No primary-owner or collaborator task exists in this sample.</p></div> : source === "Error" ? <div className="detail-hidden"><span className="state-icon error">!</span><h2>Task details unavailable</h2><p>Retry the task source to recover.</p><button className="outline-button" onClick={() => setSource("Ready")}>{manageVisible ? "Retry tasks" : "Retry personal tasks"}</button></div> : <>
        <div className="detail-toolbar"><span className="detail-label">TASK DETAILS</span><button className="detail-close" aria-label="Close task details" title="Close task details" onClick={closeTaskDetail}>×</button></div>
        <EvidenceStrip task={current} nextActorOverride={current.isReview && reviewUnavailable ? "Review source unavailable" : undefined} />
        <div className="detail-content"><span className="task-id">{current.id} <span>·</span> Version {current.version}</span><h2 ref={detailHeadingRef} tabIndex={-1}>{current.title}</h2><div className="detail-status-row"><span className={`status-pill ${statusClass(current.status)}`}>{labelFor(current.status)}</span>{current.isReview && <span className="review-tag">{reviewUnavailable ? "Review task" : "Exact review"}</span>}</div>
          <div className="detail-assignee"><div className="avatar">{current.primaryOwner ? "JL" : current.owner.split(" ").map((part) => part[0]).join("")}</div><div><span>Task owner</span><strong>{current.owner}</strong>{current.collaborator && route.workContext === "Personal work" && !ownerPersona && <small>Jordan Lee · collaborator</small>}</div></div>
          <dl className="detail-facts"><div><dt>Project</dt><dd>{current.project}</dd></div><div><dt>Owning branch</dt><dd>{current.branch}</dd></div><div><dt>Stage / milestone</dt><dd>{current.stage}</dd></div><div><dt>Target date</dt><dd className={`target-cue ${dateAccent(current)}`}>{dateLabel(current.target)}{current.status !== "COMPLETED" && current.target < "2026-10-08" && <em>Overdue</em>}</dd></div><div><dt>Committed date</dt><dd>{current.committed ? dateLabel(current.committed) : "Not committed"}</dd></div></dl>
          <p className="detail-description">{current.description}</p>
          {current.id === "TSK-2466" && current.status === "WAITING" && <div className="waiting-context"><span className="wait-icon">⌁</span><div><strong>Waiting on supplier sample</strong><p>Tracked by Elena Ruiz · latest update Oct 7</p></div></div>}{current.requiresReassignment && <div className="waiting-context"><span className="wait-icon">⇄</span><div><strong>Employee exit · reassignment required</strong><p>Former primary owner Devon Brooks · current owner assignment is held pending an authorized reassignment.</p></div></div>}
          <div className={`next-actor state-${statusClass(current.status)}`}><div className="next-actor-top"><span className="section-kicker">NEXT ACTOR</span><span className="version-tag">v{current.version}</span></div><strong>{current.isReview && reviewUnavailable ? "Review source unavailable" : current.nextActor}</strong><p>{current.isReview && reviewUnavailable ? "Reviewer assignment and evidence are hidden until the source recovers." : current.nextAction}</p>{current.review && !reviewUnavailable && <div className="round-info"><span>{current.review.round}</span><span>·</span><span>{current.review.revision}</span><span>·</span><span>{current.review.reviewer}</span>{current.review.clientRevision && <><span>·</span><span>Client revision {current.review.clientRevision}</span></>}</div>}</div>
          {current.review && !reviewUnavailable && <div className="evidence-mini"><div className="file-icon">▧</div><div><strong>{current.review.revision}</strong><span>{current.review.round}{current.review.clientRevision ? ` · Client revision ${current.review.clientRevision}` : ""} · Exact evidence</span></div><button aria-label="Open exact review" onClick={() => startReview(current)}>↗</button></div>}
          {source === "Offline" && <div className="offline-note"><strong>Offline sample · read only</strong><span>Task decisions need an online source.</span></div>}
          <div className="detail-actions">{current.status === "NOT_STARTED" && current.capabilities.transition && current.primaryOwner && !ownerPersona && <button className="primary-button" disabled={source === "Offline"} onClick={(event) => openAction("Start work", event.currentTarget)}>Preview start workflow <span>→</span></button>}{current.status === "IN_PROGRESS" && current.capabilities.wait && current.primaryOwner && !ownerPersona && <button className="outline-button" disabled={source === "Offline"} onClick={(event) => openAction("Wait", event.currentTarget)}>Preview wait workflow</button>}{current.status === "IN_PROGRESS" && current.capabilities.transition && current.primaryOwner && !ownerPersona && current.reviewRequirement === "NONE" && <button className="outline-button" disabled={source === "Offline"} onClick={(event) => openAction("Complete work", event.currentTarget)}>Preview completion workflow</button>}{current.status === "WAITING" && current.capabilities.resume && current.primaryOwner && !ownerPersona && !current.requiresReassignment && <button className="outline-button" disabled={source === "Offline"} onClick={(event) => openAction("Resume work", event.currentTarget)}>Preview resume workflow</button>}{current.isReview && current.capabilities.review && <button className="primary-button" disabled={reviewSource !== "Ready"} onClick={() => startReview(current)}>{ownerPersona ? "View exact review evidence" : "Open exact review"} <span>→</span></button>}{current.status === "CORRECTIONS_REQUIRED" && current.capabilities.submitCorrection && current.primaryOwner && !ownerPersona && <button className="primary-button" disabled={source === "Offline"} onClick={(event) => openAction("Submit correction", event.currentTarget)}>Preview correction submission <span>→</span></button>}</div>
          {exactReassign && <section className="management-card"><span className="section-kicker">MANAGEMENT PREVIEW</span><h3>Assignment</h3><p>Reassignment is available for this exact open task and its current version.</p><button className="outline-button" onClick={(event) => openManagement("reassign", event.currentTarget)}>Preview reassignment</button></section>}
          {manageVisible && <div className="management-scope-note">{route.persona === "Teamleader" ? "Fixture-authorized scope · reporting-tree nonproject work and managed Harbor House project membership." : "Organization scope · active work in the current organization."}</div>}
          <details className="detail-disclosure"><summary>Task details and history</summary><div><strong>{manageVisible ? "Visible through" : "Personal scope"}</strong><p>{manageVisible ? route.persona === "Teamleader" ? "Explicit fixture grants identify this report or managed Harbor House project task." : "This active task is in the current organization fixture." : "Included because you are the primary owner or a collaborator. Created by me alone does not add a task to this view."}</p><strong>Task version</strong><p>{current.version} · Exact task snapshot for this preview.</p></div></details>
          <p className="preview-only">Actions are preview only. No changes are saved.</p>
        </div>
      </>}
    </aside>

    {action && <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAction(); }}><section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="action-title"><div className="modal-header"><div><span className="section-kicker">ACTION PREVIEW</span><h2 id="action-title">{receipt ? "Preview receipt" : actionTitle(action)}</h2></div><button className="icon-button" onClick={closeAction} aria-label="Close action preview">×</button></div>{receipt ? <div className="receipt-state"><span className="receipt-check">✓</span><h3>Preview only; no change saved</h3><p>{actionTitle(action)} has been previewed for this exact task version. No source system was contacted.</p><div className="receipt-object"><strong>{current.title}</strong><span>{current.id} · Version {current.version}</span></div><button ref={receiptReturnRef} className="primary-button full" onClick={closeAction}>Return to task</button></div> : <><p className="modal-intro">Review the task, evidence and expected action. This prototype does not submit domain commands.</p><EvidenceStrip task={current} compact /><div className="action-fields"><label className="reason-label">{actionReasonLabel(action)}<textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Enter a reason of 3–1000 characters" maxLength={1000} rows={3} /></label>{action === "Wait" && <><label className="reason-label">Delay cause<textarea value={delayCause} onChange={(event) => setDelayCause(event.target.value)} placeholder="Describe the cause of the delay (3–1000 characters)" maxLength={1000} rows={2} /></label><label className="reason-label">Known responsible party <span className="optional-label">Optional</span><input value={responsibleParty} onChange={(event) => setResponsibleParty(event.target.value)} maxLength={160} placeholder="Name or organization" /></label></>}{action === "Start work" && current.hasUnfinishedDependency && <label className="dependency-ack"><input type="checkbox" checked={dependencyAck} onChange={(event) => setDependencyAck(event.target.checked)} /><span>Linked predecessor work is unfinished. Acknowledge that this start will be recorded as an early start.</span></label>}<div className="impact-note"><span>↗</span><p><strong>Expected action</strong><br />{action === "Start work" ? `Preview a request to move ${current.id} from Not started to In progress at version ${current.version}.` : action === "Wait" ? `Preview a request to move ${current.id} from In progress to Waiting at version ${current.version}.` : action === "Resume work" ? `Preview a request to move ${current.id} from Waiting to In progress at version ${current.version}.` : action === "Complete work" ? `Preview a request to move ${current.id} from In progress to Completed at version ${current.version}; this sample has no internal review requirement.` : `Preview a correction submission for ${current.review?.round ?? "the current correction round"} and ${current.review?.revision ?? "the exact task evidence"}.`} The result remains subject to the owning workflow.</p></div></div><div className="modal-actions"><button className="quiet-button" onClick={closeAction}>Cancel</button><button className="primary-button" disabled={reason.trim().length < 3 || reason.trim().length > 1000 || (action === "Wait" && (delayCause.trim().length < 3 || delayCause.trim().length > 1000)) || (action === "Start work" && current.hasUnfinishedDependency === true && !dependencyAck)} onClick={() => setReceipt(true)}>Preview action</button></div></>}</section></div>}
    {managementDialog && <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeManagement(); }}><section className="action-modal management-modal" role="dialog" aria-modal="true" aria-labelledby="management-title" data-management-dialog="true"><div className="modal-header"><div><span className="section-kicker">{managementReceipt ? "PREVIEW RECEIPT" : "FIXTURE-AUTHORIZED MANAGEMENT"}</span><h2 id="management-title">{managementDialog === "create" ? "Create & assign" : "Preview reassignment"}</h2></div><button className="icon-button" onClick={closeManagement} aria-label="Close management preview">×</button></div>{managementReceipt ? <div className="receipt-state"><span className="receipt-check">✓</span><h3>Preview only; no change saved</h3><p>{managementDialog === "create" ? "The assignment preview contains the requested values. No task was created, and owners, states, versions and loaded sample counts remain unchanged." : `The reassignment preview uses ${current.id} version ${current.version}. No owner, status, version or loaded count changed.`}</p><div className="receipt-object"><strong>{managementDialog === "create" ? manageTitle.trim() : current.title}</strong><span>{managementDialog === "create" ? `${manageType} · ${manageOwner} · ${manageTarget}` : `${current.id} · ${current.owner} → ${manageOwner} · ${labelFor(current.status)} remains recorded`}</span></div><button ref={receiptReturnRef} className="primary-button full" onClick={closeManagement}>Return to task list</button></div> : <><p className="modal-intro">This disconnected preview never creates or changes a task. Required fields follow the ordinary work form subset with review requirement NONE.</p>{managementDialog === "create" ? <div className="evidence-strip compact management-evidence"><div className="evidence-mark">✦</div><div className="evidence-fields"><div><span>TYPE / PROJECT</span><strong>{manageType === "PROJECT" ? `${manageProject} · Active` : <>Nonproject work · {route.persona === "Owner" ? "active organization employees" : "reporting-tree employees"}</>}</strong></div><div><span>ACTION</span><strong>Create and assign preview</strong></div><div><span>EXACT RECORD</span><strong>Not created · preview only</strong></div><div><span>ELIGIBLE OWNER</span><strong>{manageOwner || "Choose one active employee"}</strong></div></div></div> : <EvidenceStrip task={current} compact />}<div className="management-fields">{managementDialog === "create" ? <><label>Title<input ref={managementFirstRef} value={manageTitle} onChange={(event) => setManageTitle(event.target.value)} minLength={2} maxLength={160} required /><small>2–160 characters</small></label><label>Task type<select value={manageType} onChange={(event) => { setManageType(event.target.value as "PROJECT" | "NON_PROJECT"); setManageOwner(""); }}><option value="PROJECT">Project task</option><option value="NON_PROJECT">Nonproject task</option></select></label>{manageType === "PROJECT" && <label>Project and current state<select value={manageProject} onChange={(event) => { setManageProject(event.target.value); setManageOwner(""); }}><option value="Harbor House">Harbor House · Active</option>{route.persona === "Owner" && <option value="Cedar & Stone Hotel">Cedar &amp; Stone Hotel · Active</option>}</select><small>Only active or draft projects are eligible.</small></label>}<label>Priority<select value={managePriority} onChange={(event) => setManagePriority(event.target.value)} required><option value="">Choose priority</option>{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Target date<input type="date" value={manageTarget} onChange={(event) => setManageTarget(event.target.value)} required /></label><label>Eligible active task owner<select value={manageOwner} onChange={(event) => setManageOwner(event.target.value)} required><option value="">Choose one owner</option>{createCandidates.map((name) => <option key={name}>{name}</option>)}</select><small>Eligible candidates reflect this fixture’s explicit assignment grants.</small></label>{manageOwner === configuredWarningOwner && <label className="dependency-ack"><input type="checkbox" checked={capacityAck} onChange={(event) => setCapacityAck(event.target.checked)} /><span>Configured assignment warning for Alex Morgan. Acknowledge to preview this assignment.</span></label>}</> : <><div className="receipt-object"><strong>{current.title}</strong><span>{current.id} · Version {current.version} · {labelFor(current.status)} · {current.project} / {current.branch}</span></div><label>Replacement active owner<select ref={managementSelectRef} value={manageOwner} onChange={(event) => { setManageOwner(event.target.value); setCapacityAck(false); }} required><option value="">Choose eligible owner</option>{eligibleReassignOwners.map((name) => <option key={name}>{name}</option>)}</select></label>{manageOwner === configuredWarningOwner && <label className="dependency-ack"><input type="checkbox" checked={capacityAck} onChange={(event) => setCapacityAck(event.target.checked)} /><span>Configured assignment warning for Alex Morgan. Acknowledge to preview this reassignment.</span></label>}<div className="impact-note"><span>↗</span><p><strong>Expected result</strong><br />{current.requiresReassignment ? `The employee-exit hold preview restores ${current.heldPreviousStatus === "NOT_STARTED" ? "Not started" : "In progress"} from the stored prior state.` : current.status === "WAITING" ? "The task remains Waiting after owner reassignment." : `The task remains ${labelFor(current.status)} after owner reassignment.`} Expected version: {current.version}.</p></div></>}<label className="reason-label">Reason<textarea value={manageReason} onChange={(event) => setManageReason(event.target.value)} minLength={3} maxLength={1000} rows={3} required placeholder="Enter a reason of 3–1000 characters" /></label></div><div className="modal-actions"><button className="quiet-button" onClick={closeManagement}>Cancel</button><button className="primary-button" disabled={!managementReady} onClick={() => setManagementReceipt(true)}>{managementDialog === "create" ? "Preview assignment" : "Preview reassignment"}</button></div></>}</section></div>}
    <div className="mobile-nav" inert={mobileDetail && isNarrow}><a href="#dashboard">◫<span>Dashboard</span></a><a href="#work" className="selected">▤<span>My Work</span></a><a href="#tasks">☷<span>Tasks</span></a><a className="documents" href="#documents">▧<span>Documents</span></a><button onClick={() => setAdvancedOpen((open) => !open)}>···<span>More</span></button></div>
  </div>;
}

function EvidenceStrip({ task, compact = false, nextActorOverride }: { task: Task; compact?: boolean; nextActorOverride?: string | undefined }) {
  return <div className={`evidence-strip ${compact ? "compact" : ""}`}><div className="evidence-mark">✦</div><div className="evidence-fields"><div><span>PROJECT / BRANCH</span><strong>{task.project} <i>·</i> {task.branch}</strong></div><div><span>STATE</span><strong className={`state-${statusClass(task.status)}`}>{labelFor(task.status)}</strong></div><div><span>EXACT RECORD</span><strong>{task.id} · v{task.version}</strong></div><div><span>NEXT ACTOR</span><strong>{nextActorOverride ?? task.nextActor}</strong></div></div></div>;
}

function DecisionInbox({ items, source, onRetry }: { items: ApprovalRequest[]; source: Scenario; onRetry: () => void }) {
  const showItems = (source === "Ready" || source === "Offline") && items.length > 0;
  return <section className="decision-inbox" aria-labelledby="decision-inbox-heading"><header><div><span className="section-kicker">APPROVAL QUEUE</span><h2 id="decision-inbox-heading">Decisions awaiting you</h2></div><span className="inbox-count">{source === "Ready" || source === "Offline" ? `${items.length} loaded sample` : "Source state"}</span></header><p className="inbox-intro">Pending actions from authorized work areas. Sample request; no live connection.</p>{source === "Loading" ? <p role="status" className="inbox-state">Loading pending decisions…</p> : source === "Denied" ? <div className="inbox-state"><p>Decision queue unavailable. Request names remain hidden.</p><button className="outline-button" onClick={onRetry}>Retry approval queue</button></div> : source === "Error" ? <div className="inbox-state"><p>Pending decisions could not be loaded.</p><button className="outline-button" onClick={onRetry}>Retry approval queue</button></div> : source === "Empty" ? <p className="inbox-state">No pending decisions in this list.</p> : source === "Offline" && <p className="inbox-state offline">Offline · cached approval requests are read only. Decisions require an online source.</p>}{showItems ? <ul className="approval-request-list">{items.map((item) => <li key={item.id}><div className="approval-request-copy"><div className="approval-meta"><span>{item.approvalLevel}</span><time>{item.requestedAt}</time></div><h3>{item.title}</h3><p>{item.summary}</p><p><strong>{item.subjectLabel}</strong> · Requested by {item.requesterLabel}</p><p>Reason: {item.reason}</p>{item.expiresAt && <p>Decision due {item.expiresAt}</p>}<span className="request-id">Request {item.id}</span></div><span className="request-type">{item.typeKey}</span></li>)}</ul> : source === "Ready" && <p className="inbox-state">No pending decisions in this list.</p>}</section>;
}

function IndependentSection({ title, icon, items, page, setPage, source, onOpen, empty, actionLabel }: { title: string; icon: string; items: Task[]; page: number; setPage: React.Dispatch<React.SetStateAction<number>>; source: Scenario; onOpen: (task: Task) => void; empty: string; actionLabel: string }) {
  const pageSize = 2;
  const count = Math.max(1, Math.ceil(items.length / pageSize));
  const activePage = Math.min(page, count);
  const pageItems = items.slice((activePage - 1) * pageSize, activePage * pageSize);
  const unavailable = source === "Denied" || source === "Loading" || source === "Empty" || source === "Error";
  return <section className="independent-section"><div className="independent-head"><span className="independent-icon">{icon}</span><div><h3>{title}</h3><span>{unavailable ? source === "Denied" ? "Unavailable" : source === "Loading" ? "Loading source…" : source === "Error" ? "Source error" : "No loaded records" : `${items.length} loaded sample ${items.length === 1 ? "item" : "items"}`}</span></div><div className="section-pager"><button aria-label={`Previous page in ${title}`} disabled={activePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button><span>{activePage} / {count}</span><button aria-label={`Next page in ${title}`} disabled={activePage >= count} onClick={() => setPage((value) => Math.min(count, value + 1))}>›</button></div></div>{source === "Offline" && <div className="inline-source offline">Offline sample · read only. Decisions require an online source.</div>}{unavailable ? <p className="independent-empty">{source === "Denied" ? "This source is unavailable. Task names remain hidden." : source === "Loading" ? "Loading this source…" : source === "Error" ? "This source could not be loaded. Retry is available in Preview scenarios." : empty}</p> : pageItems.length === 0 ? <p className="independent-empty">{empty}</p> : <div className="independent-items">{pageItems.map((task) => <div className="independent-row" key={task.id}><div className="independent-task-mark">{task.isReview ? "R" : task.status === "CORRECTIONS_REQUIRED" ? "↻" : "⇄"}</div><div className="independent-task-copy"><strong>{task.title}</strong><span>{task.project} · {task.id}{task.review ? ` · ${task.review.round} · ${task.review.revision}${task.review.clientRevision ? ` · Client rev ${task.review.clientRevision}` : ""}` : ""}</span></div><span className={`status-pill ${statusClass(task.status)}`}>{labelFor(task.status)}</span><button className="text-action" onClick={() => onOpen(task)}>{actionLabel} <span>→</span></button></div>)}</div>}</section>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
