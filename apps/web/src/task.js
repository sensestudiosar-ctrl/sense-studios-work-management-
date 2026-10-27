import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TASK_DESCRIPTION_MAX_LENGTH } from "@sense/contracts";
import { MyWorkPhaseSummary, MyWorkTaskCountInformation } from "./my-work-attention.js";
import { MyWorkFilterChips } from "./my-work-filter-chips.js";
import { TaskPeople } from "./task-people.js";
import { ActionableWork } from "./actionable-work.js";
import { TaskComposerFields, taskCreateBody, taskDraftError, taskDraftReadiness } from "./task-composer-fields.js";
import { useTaskCreationOptions } from "./task-creation-options.js";
import { TaskRefinementFields } from "./task-refinement-fields.js";
import { taskRefinementError, selectionValues } from "./task-query-refinements.js";
import { TaskCreateDialog } from "./task-create-dialog.js";
import { TaskDetailDrawer } from "./task-detail-drawer.js";
import { MyWorkTopCards, overdueTaskFilters, previousCalendarDay } from "./my-work-metrics.js";
import { MyWorkMetricFocus } from "./my-work-metric-focus.js";
import { MyWorkQueuePreferences } from "./my-work-queue-preferences.js";
import { parityPriorityClass, parityPriorityLabel } from "./my-work/my-work-parity.js";
import { MyWorkParityList } from "./my-work/my-work-parity.js";
import "./task.css";
import "./my-work-visual.css";
import "./my-work/my-work-visual-overrides.css";
import "./my-work/my-work-parity.css";
import "./task-register.css";
/** Field-help fragments stay within the current document and do not discard drafts. */
function isInPageAnchor(anchor) {
    return !!anchor.hash && anchor.origin === window.location.origin && anchor.pathname === window.location.pathname && anchor.search === window.location.search;
}
/** Renders a structured empty-state with an optional Clear filters action button. */
function TaskEmptyState({ message, showClearFilters, onClearFilters }) {
    return (_jsxs("div", { className: "task-empty-state", role: "status", children: [_jsx("svg", { className: "task-empty-state__icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M4 6h16M7 12h10m-7 6h4" }) }), _jsx("p", { className: "task-empty-state__title", children: message }), showClearFilters && _jsx("button", { type: "button", className: "task-empty-state__action", onClick: onClearFilters, children: "Clear filters" })] }));
}
const ROOT = "/api/v1/tasks";
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TASK_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "WAITING", "SUBMITTED_INTERNAL_REVIEW", "IN_INTERNAL_REVIEW", "CORRECTIONS_REQUIRED", "INTERNAL_APPROVED", "SUBMITTED_CLIENT_REVIEW", "IN_CLIENT_REVIEW", "CLIENT_REVISION_REQUIRED", "CLIENT_APPROVED", "COMPLETED", "STOPPED_DUE_TO_PROJECT_CANCELLATION"];
async function json(response) {
    if (!response.ok) {
        const body = await response.clone().json().catch(() => ({}));
        const error = new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
function statusOf(error) { return error instanceof Error ? error.status : undefined; }
function stateLabel(value) { return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
/**
 * Presentation label for the parity row's last-column action button.
 * Mirrors the intent of the demo's `t.next` field: a one-phrase invitation
 * to open the task. It is status-derived only and can never widen permissions.
 * Must stay in sync with the "Next action" label the legacy queue row renders.
 */
function parityNextAction(task) {
    switch (task.status) {
        case "CORRECTIONS_REQUIRED": return "Open correction";
        case "INTERNAL_APPROVED": return "Submit for review";
        case "SUBMITTED_CLIENT_REVIEW": return "Await client review";
        case "CLIENT_REVISION_REQUIRED": return "Client revisions";
        case "IN_CLIENT_REVIEW": return "Under client review";
        case "CLIENT_APPROVED": return "Complete task";
        case "SUBMITTED_INTERNAL_REVIEW": return "Review pending";
        case "IN_INTERNAL_REVIEW": return "Under internal review";
        default: return "Open task";
    }
}
/**
 * Overdue test for the row's mobile due chip. Uses the organization-calendar
 * cutoff the server supplies through the Overdue metric (`before` is the last
 * day that is still on time), never the browser clock. Without a resolved
 * cutoff the chip simply renders without the overdue treatment rather than
 * guessing from the user's local timezone.
 */
function rowIsOverdue(targetDate, before) {
    if (before === undefined)
        return false;
    return targetDate.slice(0, 10) < before;
}
const FILTER_KEYS = ["priorities", "collaboratorEmployeeIds", "projectId", "planItemId", "ownerEmployeeId", "teamId", "q", "status", "phase", "dateBasis", "dateFrom", "dateTo"];
function taskUrlKey(key, projectContext) { return !projectContext ? key : key === "taskId" ? "projectTaskId" : `projectTask${key[0]?.toUpperCase()}${key.slice(1)}`; }
function readTaskUrlState(personalOnly, owner, listFirst, projectContext) {
    const source = new URLSearchParams(window.location.search);
    const params = new URLSearchParams();
    for (const key of [...FILTER_KEYS, "taskId", "scope", "offset", "view", "sort", "workPhase"]) {
        const value = source.get(taskUrlKey(key, projectContext));
        if (value !== null)
            params.set(key, value);
    }
    if (projectContext)
        params.set("projectId", projectContext.id);
    const rawOffset = Number(params.get("offset"));
    const sortValue = params.get("sort");
    const sort = sortValue === "target_asc" || sortValue === "title_asc" || sortValue === "owner_asc" || sortValue === "priority_desc" ? sortValue : "created_desc";
    const filters = { ...Object.fromEntries(FILTER_KEYS.map((key) => [key, params.get(key) ?? (key === "phase" && personalOnly ? "active" : "")])), sort };
    const scopeValue = params.get("scope");
    const phaseSelection = params.get("workPhase") ?? "";
    return {
        taskId: params.get("taskId") ?? "",
        scope: projectContext ? "all" : personalOnly ? scopeValue === "all" ? "all" : "personal" : owner && !listFirst ? "all" : scopeValue === "all" || scopeValue === "owned" || scopeValue === "created" || scopeValue === "collaborating" || scopeValue === "assigned" || scopeValue === "mine" ? scopeValue : owner ? "all" : "mine",
        filters,
        temporaryPhase: personalOnly && scopeValue !== "all" && ["active", "waiting", "review", "reviews", "completed", "overdue", "attention"].includes(phaseSelection) ? phaseSelection : "",
        offset: Number.isSafeInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0,
        view: params.get("view") === "cards" ? "cards" : params.get("view") === "board" || params.get("view") === "kanban" ? "board" : params.get("view") === "timeline" ? "timeline" : "list"
    };
}
function writeTaskUrlState(state, projectContext) {
    const url = new URL(window.location.href);
    const values = { scope: state.scope, offset: state.offset ? String(state.offset) : "", view: state.view === "list" ? "" : state.view, taskId: state.taskId, sort: state.filters.sort === "created_desc" ? "" : state.filters.sort, workPhase: state.personalOnly ? state.temporaryPhase : "" };
    for (const key of FILTER_KEYS)
        values[key] = key === "dateBasis" && !state.filters.dateFrom && !state.filters.dateTo ? "" : state.filters[key];
    for (const [key, value] of Object.entries(values)) {
        if (projectContext && key === "projectId")
            continue;
        const urlKey = taskUrlKey(key, projectContext);
        if (value)
            url.searchParams.set(urlKey, value);
        else
            url.searchParams.delete(urlKey);
    }
    window.history.replaceState(window.history.state, "", url);
}
export function TaskWorkspace({ projectContext, onLeaveGuard, csrfToken, owner, accountId, listFirst = false, personalOnly = false, personalObligations, onSessionExpired }) {
    const registerMode = listFirst && !personalOnly && !projectContext;
    const initialUrlState = useRef(readTaskUrlState(personalOnly, owner, listFirst, projectContext)).current;
    const deepLinkInitialized = useRef(false);
    const requestId = useRef(0);
    const pageContextRef = useRef("");
    const [setup, setSetup] = useState();
    const [scope, setScope] = useState(initialUrlState.scope);
    const defaultFilters = { ...initialUrlState.filters, priorities: "", collaboratorEmployeeIds: "", projectId: projectContext?.id ?? "", planItemId: "", ownerEmployeeId: "", teamId: "", q: "", status: "", phase: personalOnly ? "active" : "", dateBasis: "", dateFrom: "", dateTo: "", sort: "created_desc" };
    const [draftFilters, setDraftFilters] = useState(initialUrlState.filters);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const filterDisclosureRef = useRef(null);
    const [filterPosition, setFilterPosition] = useState({ top: 120, right: 16, maxHeight: 500 });
    const [filters, setFilters] = useState(initialUrlState.filters);
    const [offset, setOffset] = useState(initialUrlState.offset);
    const [view, setView] = useState(initialUrlState.view);
    const [urlTaskId, setUrlTaskId] = useState(initialUrlState.taskId);
    const [temporaryPhase, setTemporaryPhase] = useState(initialUrlState.temporaryPhase);
    const [overdueCalendar, setOverdueCalendar] = useState({ status: "loading" });
    const [managementToday, setManagementToday] = useState();
    const workspaceRef = useRef(null);
    const queueHeadingRef = useRef(null);
    const displayOptionsRef = useRef(null);
    const detailDraftDirtyRef = useRef(false);
    const drawerHistoryRef = useRef({ taskId: "", url: window.location.href, state: null, canLeave: () => true });
    const [queueReveal, setQueueReveal] = useState(0);
    useLayoutEffect(() => {
        if (!queueReveal)
            return;
        // Reveal the real queue after the new selection has committed. Move focus
        // with it so keyboard users continue at its controls, below the header.
        queueHeadingRef.current?.focus({ preventScroll: true });
        queueHeadingRef.current?.parentElement?.parentElement?.scrollIntoView({ block: "start", behavior: "instant" });
    }, [queueReveal]);
    const updateOverdueCalendar = useCallback((calendar) => setOverdueCalendar(calendar), []);
    const [summaryRevision, setSummaryRevision] = useState(0);
    const [compact, setCompact] = useState(false);
    const [preferenceMode, setPreferenceMode] = useState(null);
    const [sourceRequest, setSourceRequest] = useState();
    const [actionCounts, setActionCounts] = useState({ corrections: { status: "loading" }, management: { status: "loading" } });
    const updateActionCounts = useCallback((counts) => setActionCounts(counts), []);
    const [desktop, setDesktop] = useState(() => typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1024px)").matches);
    /**
     * Demo-parity row rendering, active only for the personal My Work list. It
     * is presentation only: the same authorized page renders through
     * `MyWorkParityList` instead of the legacy `.task-queue-row` markup. The
     * Cards / Board / Timeline views and every non-personal route keep their
     * existing markup, so the Tasks route is untouched.
     *
     * The legacy `<nav>` still renders around it, but only for its empty state:
     * when rows exist and parity is active the legacy rows are suppressed, so
     * the page shows exactly one row set. The `.task-queue-row` markup remains
     * the accepted contract for every non-personal route and for the empty and
     * card/board/timeline views.
     */
    const parityEnabled = personalOnly && listFirst;
    const [, setMobileLayout] = useState(() => window.innerWidth <= 700);
    const [page, setPage] = useState();
    const pageRef = useRef(page);
    pageRef.current = page;
    const [detail, setDetail] = useState();
    const [subtasks, setSubtasks] = useState();
    const [subtasksTaskId, setSubtasksTaskId] = useState("");
    const [subtasksLoading, setSubtasksLoading] = useState(false);
    const [subtasksError, setSubtasksError] = useState("");
    const [subtasksRetry, setSubtasksRetry] = useState(0);
    const [showSubtaskForm, setShowSubtaskForm] = useState(false);
    const [selectedId, setSelectedId] = useState("");
    const [loading, setLoading] = useState(true);
    const [denied, setDenied] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const creationPending = useRef(false);
    const creationAttempt = useRef(undefined);
    const [uncertainCreation, setUncertainCreation] = useState();
    const [createdSubtask, setCreatedSubtask] = useState();
    useEffect(() => {
        if (!uncertainCreation)
            return;
        const surface = document.querySelector("dialog[open]") ?? document;
        surface.querySelector("[data-task-creation-recovery]")?.focus({ preventScroll: false });
    }, [uncertainCreation]);
    const [overloadPrompt, setOverloadPrompt] = useState();
    const [showForm, setShowForm] = useState(false);
    const [validationAttempt, setValidationAttempt] = useState(0);
    useEffect(() => { setValidationAttempt(0); }, [showForm, showSubtaskForm]);
    const createDraftDirtyRef = useRef(false);
    const [showCloseoutForm, setShowCloseoutForm] = useState(false);
    const [editing, setEditing] = useState(false);
    const [assignTo, setAssignTo] = useState(false);
    const [title, setTitle] = useState("");
    const [type, setType] = useState("NON_PROJECT");
    const [priority, setPriority] = useState("MEDIUM");
    const [reviewRequirement, setReviewRequirement] = useState("NONE");
    const [targetDate, setTargetDate] = useState("");
    const [description, setDescription] = useState("");
    const [projectId, setProjectId] = useState(projectContext?.id ?? "");
    const [ownerId, setOwnerId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [estimatedHours, setEstimatedHours] = useState("");
    const [collaboratorIds, setCollaboratorIds] = useState([]);
    const [collaboratorHours, setCollaboratorHours] = useState({});
    const [workScope, setWorkScope] = useState("");
    const [planItemId, setPlanItemId] = useState("");
    const [tagsText, setTagsText] = useState("");
    const [checklistText, setChecklistText] = useState("");
    const [reason, setReason] = useState("");
    const creationProjectId = showSubtaskForm ? detail?.task?.projectId ?? "" : projectContext?.id ?? projectId;
    const creation = useTaskCreationOptions(showForm || showSubtaskForm, creationProjectId, onSessionExpired);
    useEffect(() => {
        const options = creation.options;
        if (!options)
            return;
        if (!options.canAssign)
            setAssignTo(false);
        setOwnerId(current => options.owners.some(person => person.id === current) ? current : "");
        setCollaboratorIds(current => current.filter(id => options.collaborators.some(person => person.id === id)));
    }, [creation.options]);
    const composerDraft = { title, type, priority, targetDate, description, projectId: creationProjectId, ownerId, startDate, estimatedHours, collaboratorIds, collaboratorHours, planItemId, tagsText, checklistText, reason, assignTo, reviewRequirement };
    const changeComposer = (patch) => {
        if (uncertainCreation)
            return;
        if (overloadPrompt?.kind === "create")
            setOverloadPrompt(undefined);
        if (patch.title !== undefined)
            setTitle(patch.title);
        if (patch.type !== undefined)
            setType(patch.type);
        if (patch.priority !== undefined)
            setPriority(patch.priority);
        if (patch.targetDate !== undefined)
            setTargetDate(patch.targetDate);
        if (patch.description !== undefined)
            setDescription(patch.description);
        if (patch.projectId !== undefined)
            setProjectId(patch.projectId);
        if (patch.ownerId !== undefined)
            setOwnerId(patch.ownerId);
        if (patch.startDate !== undefined)
            setStartDate(patch.startDate);
        if (patch.estimatedHours !== undefined)
            setEstimatedHours(patch.estimatedHours);
        if (patch.collaboratorIds !== undefined)
            setCollaboratorIds(patch.collaboratorIds);
        if (patch.collaboratorHours !== undefined)
            setCollaboratorHours(patch.collaboratorHours);
        if (patch.planItemId !== undefined)
            setPlanItemId(patch.planItemId);
        if (patch.tagsText !== undefined)
            setTagsText(patch.tagsText);
        if (patch.checklistText !== undefined)
            setChecklistText(patch.checklistText);
        if (patch.reason !== undefined)
            setReason(patch.reason);
        if (patch.assignTo !== undefined)
            setAssignTo(patch.assignTo);
        if (patch.reviewRequirement !== undefined)
            setReviewRequirement(patch.reviewRequirement);
    };
    const validateCreation = () => {
        setValidationAttempt(value => value + 1);
        const options = creation.options;
        if (!options || !options.canCreate) {
            setError("Load eligible participants before creating this task.");
            return false;
        }
        const fieldError = taskDraftError(composerDraft);
        if (fieldError) {
            setError("");
            return false;
        }
        const explicit = options.canAssign && assignTo || options.actorEmployeeId === null;
        const chosenOwner = explicit ? ownerId : options.actorEmployeeId;
        if (!options.owners.some(person => person.id === chosenOwner) || explicit && !options.canAssign || collaboratorIds.some(id => id === chosenOwner || !options.collaborators.some(person => person.id === id))) {
            setError("Review the primary owner and collaborators for the current context.");
            return false;
        }
        return true;
    };
    const creationBlocked = creation.status !== "ready" || !creation.options?.canCreate;
    const [reassignId, setReassignId] = useState("");
    const [waitReason, setWaitReason] = useState("");
    const [delayCause, setDelayCause] = useState("");
    const [responsibleParty, setResponsibleParty] = useState("");
    const [resumeReason, setResumeReason] = useState("");
    const [dependencyCandidates, setDependencyCandidates] = useState([]);
    const [dependencySearch, setDependencySearch] = useState("");
    const [predecessorId, setPredecessorId] = useState("");
    const [dependencyReason, setDependencyReason] = useState("");
    const [confirmEarlyStart, setConfirmEarlyStart] = useState(false);
    const [committedDate, setCommittedDate] = useState("");
    const [committedDateReason, setCommittedDateReason] = useState("");
    const [extensionApprovers, setExtensionApprovers] = useState([]);
    const [extensionApproversLoading, setExtensionApproversLoading] = useState(false);
    const [extensionApproversError, setExtensionApproversError] = useState("");
    const [extensionApproverRetry, setExtensionApproverRetry] = useState(0);
    const [extensionDate, setExtensionDate] = useState("");
    const [extensionReason, setExtensionReason] = useState("");
    const [extensionApproverId, setExtensionApproverId] = useState("");
    const [extensionDecisionReason, setExtensionDecisionReason] = useState("");
    const [recurrence, setRecurrence] = useState();
    const [recurrenceLoading, setRecurrenceLoading] = useState(false);
    const [recurrenceError, setRecurrenceError] = useState("");
    const [recurrenceRetry, setRecurrenceRetry] = useState(0);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState("WEEKLY");
    const [recurrenceDate, setRecurrenceDate] = useState("");
    const [recurrenceReason, setRecurrenceReason] = useState("");
    const [recurrenceActionReason, setRecurrenceActionReason] = useState("");
    useEffect(() => {
        if (!detail?.task.id) {
            setSubtasks(undefined);
            setSubtasksTaskId("");
            setSubtasksError("");
            return;
        }
        let active = true;
        setSubtasks(undefined);
        setSubtasksTaskId("");
        setSubtasksLoading(true);
        setSubtasksError("");
        void fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/subtasks`, { credentials: "include", cache: "no-store" })
            .then((response) => json(response))
            .then((value) => {
            const validItems = Array.isArray(value?.items) && value.items.every((item) => item && typeof item.id === "string" && item.id.length > 0 && typeof item.title === "string" && item.title.trim().length > 0 && typeof item.status === "string" && item.status.length > 0 && typeof item.targetDate === "string" && Number.isFinite(Date.parse(item.targetDate)) && typeof item.primaryOwnerEmployeeId === "string" && item.primaryOwnerEmployeeId.length > 0 && typeof item.primaryOwnerName === "string" && item.primaryOwnerName.length > 0 && Number.isSafeInteger(item.version) && item.version > 0);
            const validParent = value?.parent === null || !!value?.parent && typeof value.parent.id === "string" && value.parent.id.length > 0 && typeof value.parent.title === "string" && value.parent.title.trim().length > 0;
            if (!value || !validItems || !validParent || typeof value.isSubtask !== "boolean" || typeof value.completionBlocked !== "boolean" || typeof value.canCreate !== "boolean" || !Number.isSafeInteger(value.taskVersion) || value.taskVersion < 1)
                throw new Error("subtasks-response-invalid");
            if (active) {
                setSubtasks(value);
                setSubtasksTaskId(detail.task.id);
            }
        })
            .catch(() => { if (active) {
            setSubtasks(undefined);
            setSubtasksError("Subtasks could not be loaded.");
        } })
            .finally(() => { if (active)
            setSubtasksLoading(false); });
        return () => { active = false; };
    }, [detail?.task?.id, detail?.task?.version, subtasksRetry]);
    /**
     * "Site work" is a presentation scope over the existing `all` backend
     * scope, narrowed to site-type tasks. Applying it as a type filter keeps
     * the backend authorization path exactly as it is for `all`, so no new
     * authorization rule is introduced. Declared here because `queueFilters`
     * below needs it, and it must not depend on anything declared later.
     */
    const siteWorkScope = !projectContext && !owner && scope === "all" && (() => {
        const profile = setup?.creationProfile;
        return profile?.version === 1 && profile.variant === "SITE";
    })();
    const queueFilters = useMemo(() => {
        const base = personalOnly && temporaryPhase === "overdue" && overdueCalendar.before
            ? overdueTaskFilters(filters, overdueCalendar.before)
            : personalOnly && temporaryPhase === "reviews" ? { ...filters, metric: "reviews", phase: "" } : personalOnly && temporaryPhase && !["overdue", "attention"].includes(temporaryPhase) ? { ...filters, phase: temporaryPhase } : filters;
        return siteWorkScope ? { ...base, type: "SITE", phase: "" } : base;
    }, [filters, personalOnly, temporaryPhase, overdueCalendar.before, siteWorkScope]);
    const taskPageContext = JSON.stringify([scope, Object.entries(queueFilters).sort(([left], [right]) => left.localeCompare(right)), offset]);
    const visiblePage = pageContextRef.current === taskPageContext ? page : undefined;
    const [pageStale, setPageStale] = useState(false);
    const [pageRefreshedAt, setPageRefreshedAt] = useState();
    const load = useCallback(async (preferredId = "", requestedOffset = offset) => {
        const request = ++requestId.current;
        const contextKey = JSON.stringify([scope, Object.entries(queueFilters).sort(([left], [right]) => left.localeCompare(right)), requestedOffset]);
        let readingDetail = false;
        setLoading(true);
        setError("");
        setDenied(false);
        if (pageContextRef.current !== contextKey) {
            pageContextRef.current = contextKey;
            pageRef.current = undefined;
            setPage(undefined);
            setPageStale(false);
            setPageRefreshedAt(undefined);
        }
        if (listFirst) {
            setDetail(undefined);
            if (!preferredId)
                setSelectedId("");
        }
        if (personalOnly && temporaryPhase === "overdue" && overdueCalendar.status !== "ready") {
            pageRef.current = undefined;
            setPage(undefined);
            setLoading(overdueCalendar.status === "loading");
            if (overdueCalendar.status === "unavailable")
                setError("The Overdue calendar or count is unavailable. Retry the card or clear its selection.");
            return;
        }
        try {
            // `scope` is the request scope and honours personalOnly; `activeScopeOption`
            // only mirrors the visible tab, which for My Work reads "mine". Sending the
            // tab value would ask the API for the wrong queue.
            const query = new URLSearchParams({ scope, offset: String(requestedOffset), limit: "50" });
            for (const [key, value] of Object.entries(queueFilters)) {
                if (key === "dateBasis" && !queueFilters.dateFrom && !queueFilters.dateTo)
                    continue;
                if (value.trim())
                    query.set(key, value.trim());
            }
            const [nextSetup, nextPage] = await Promise.all([
                fetch(`${ROOT}/setup`, { credentials: "include", cache: "no-store" }).then((response) => json(response)),
                fetch(`${ROOT}?${query.toString()}`, { credentials: "include", cache: "no-store" }).then((response) => json(response))
            ]);
            if (request !== requestId.current)
                return;
            setSetup(nextSetup);
            pageRef.current = nextPage;
            setPage(nextPage);
            pageContextRef.current = contextKey;
            setPageStale(false);
            setPageRefreshedAt(Date.now());
            const id = preferredId || (listFirst ? "" : nextPage.items[0]?.id || "");
            setSelectedId(id);
            if (id) {
                readingDetail = true;
                const value = await fetch(`${ROOT}/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }).then((response) => json(response));
                if (projectContext && value.task.projectId !== projectContext.id)
                    throw Object.assign(new Error("Task is outside this project"), { status: 404 });
                if (request === requestId.current) {
                    detailDraftDirtyRef.current = false;
                    setDetail(value);
                }
            }
            else if (request === requestId.current)
                setDetail(undefined);
        }
        catch (cause) {
            if (request === requestId.current) {
                setDetail(undefined);
                setSelectedId("");
                const status = statusOf(cause);
                if (status === 401 || status === 403 || readingDetail && status === 404) {
                    setSetup(undefined);
                    pageRef.current = undefined;
                    setPage(undefined);
                    setPageStale(false);
                    setPageRefreshedAt(undefined);
                    setDenied(true);
                    if (status === 401)
                        onSessionExpired?.();
                }
                else if (pageContextRef.current === contextKey && pageRef.current) {
                    setPageStale(true);
                    setError("Tasks could not be refreshed. The displayed page is a stale snapshot.");
                }
                else {
                    pageRef.current = undefined;
                    setPage(undefined);
                    setPageStale(false);
                    setPageRefreshedAt(undefined);
                    setError("Tasks could not be loaded. Try again.");
                }
            }
        }
        finally {
            if (request === requestId.current) {
                setLoading(false);
                deepLinkInitialized.current = true;
            }
        }
    }, [scope, queueFilters, offset, listFirst, onSessionExpired, personalOnly, temporaryPhase, overdueCalendar.status, projectContext?.id]);
    useEffect(() => { void load(listFirst ? urlTaskId : deepLinkInitialized.current ? "" : initialUrlState.taskId); return () => { requestId.current += 1; }; }, [load, urlTaskId, listFirst, initialUrlState.taskId]);
    useEffect(() => {
        if (listFirst)
            writeTaskUrlState({ taskId: urlTaskId, scope, filters, offset, view, temporaryPhase, personalOnly }, projectContext);
    }, [listFirst, urlTaskId, scope, filters, offset, view, temporaryPhase, personalOnly, projectContext?.id]);
    useEffect(() => {
        if (!listFirst)
            return;
        const onPopState = () => {
            if (projectContext && new URLSearchParams(window.location.search).get("projectId") !== projectContext.id)
                return;
            const next = readTaskUrlState(personalOnly, owner, listFirst, projectContext);
            const currentDrawer = drawerHistoryRef.current;
            if ((personalOnly || projectContext || registerMode) && currentDrawer.taskId && (next.taskId !== currentDrawer.taskId || window.location.href !== currentDrawer.url) && !currentDrawer.canLeave()) {
                window.history.pushState(currentDrawer.state, "", currentDrawer.url);
                return;
            }
            setScope(next.scope);
            setFilters(next.filters);
            setDraftFilters(next.filters);
            setOffset(next.offset);
            setView(next.view);
            setUrlTaskId(next.taskId);
            setTemporaryPhase(next.temporaryPhase);
            setWaitReason("");
            setDelayCause("");
            setResponsibleParty("");
            setResumeReason("");
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [listFirst, personalOnly, owner, projectContext?.id]);
    useEffect(() => {
        const update = () => {
            const nextDesktop = window.matchMedia?.("(min-width: 1024px)").matches ?? window.innerWidth >= 1024;
            setDesktop(nextDesktop);
            setMobileLayout(window.innerWidth <= 700);
            if (!nextDesktop)
                setCompact(false);
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);
    useEffect(() => {
        if (!detail?.capabilities.manageDependencies) {
            setDependencyCandidates([]);
            return;
        }
        let active = true;
        const query = dependencySearch.trim();
        void fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/dependency-candidates${query ? `?q=${encodeURIComponent(query)}` : ""}`, { credentials: "include", cache: "no-store" })
            .then((response) => json(response)).then((value) => { if (active)
            setDependencyCandidates(value.items); })
            .catch(() => { if (active)
            setDependencyCandidates([]); });
        return () => { active = false; };
    }, [detail?.task?.id, detail?.task?.version, detail?.capabilities?.manageDependencies, dependencySearch]);
    useEffect(() => {
        if (!detail?.capabilities.requestExtension) {
            setExtensionApprovers([]);
            setExtensionApproversLoading(false);
            setExtensionApproversError("");
            return;
        }
        let active = true;
        setExtensionApproversLoading(true);
        setExtensionApproversError("");
        void fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/extension-approvers`, { credentials: "include", cache: "no-store" })
            .then((response) => json(response)).then((value) => { if (active)
            setExtensionApprovers(value.items); })
            .catch(() => { if (active) {
            setExtensionApprovers([]);
            setExtensionApproversError("Eligible approvers could not be loaded.");
        } })
            .finally(() => { if (active)
            setExtensionApproversLoading(false); });
        return () => { active = false; };
    }, [detail?.task?.id, detail?.task?.version, detail?.capabilities?.requestExtension, extensionApproverRetry]);
    useEffect(() => {
        if (detail?.task.type !== "RECURRING") {
            setRecurrence(undefined);
            setRecurrenceError("");
            setRecurrenceLoading(false);
            return;
        }
        let active = true;
        setRecurrenceLoading(true);
        setRecurrenceError("");
        void fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/recurrence`, { credentials: "include", cache: "no-store" })
            .then((response) => json(response)).then((value) => { if (active) {
            setRecurrence(value);
            setRecurrenceFrequency(value.rule?.frequency ?? "WEEKLY");
            setRecurrenceDate("");
            setRecurrenceReason("");
            setRecurrenceActionReason("");
        } })
            .catch(() => { if (active) {
            setRecurrence(undefined);
            setRecurrenceError("Recurrence details could not be loaded.");
        } })
            .finally(() => { if (active)
            setRecurrenceLoading(false); });
        return () => { active = false; };
    }, [detail?.task?.id, detail?.task?.type, detail?.task?.version, recurrenceRetry]);
    const refresh = () => { setSummaryRevision((revision) => revision + 1); void load(selectedId); if (detail?.task.type === "RECURRING")
        setRecurrenceRetry((count) => count + 1); };
    const validateDescription = () => {
        if (description.trim().length <= TASK_DESCRIPTION_MAX_LENGTH)
            return true;
        setError(`Description must be ${TASK_DESCRIPTION_MAX_LENGTH} characters or fewer.`);
        return false;
    };
    const performCreation = async (body, parentId) => {
        if (busy || creationPending.current)
            return;
        creationPending.current = true;
        setBusy(true);
        setError("");
        setNotice("");
        const fingerprint = JSON.stringify({ parentId: parentId ?? null, body });
        if (!creationAttempt.current || creationAttempt.current.fingerprint !== fingerprint)
            creationAttempt.current = { fingerprint, key: crypto.randomUUID() };
        const command = { ...body, idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : creationAttempt.current.key };
        try {
            const result = await fetch(parentId ? `${ROOT}/${encodeURIComponent(parentId)}/subtasks` : ROOT, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(command) }).then((response) => json(response));
            const created = parentId ? result?.task : result;
            if (!created || typeof created.id !== "string" || !created.id)
                throw new Error("Unconfirmed task result");
            const wasRecovery = !!uncertainCreation;
            if (parentId)
                setCreatedSubtask({ id: created.id, parentId });
            setUncertainCreation(undefined);
            creationAttempt.current = undefined;
            setOverloadPrompt(undefined);
            createDraftDirtyRef.current = false;
            setTitle("");
            setDescription("");
            setReason("");
            setTargetDate("");
            setStartDate("");
            setEstimatedHours("");
            setProjectId("");
            setPlanItemId("");
            setTagsText("");
            setChecklistText("");
            setAssignTo(false);
            setShowForm(false);
            setShowSubtaskForm(false);
            setCollaboratorIds([]);
            setCollaboratorHours({});
            setNotice(parentId ? wasRecovery ? "Subtask creation confirmed." : body.acknowledgeOverload ? "Subtask created after overload acknowledgement." : "Subtask created." : wasRecovery ? "Task creation confirmed." : body.acknowledgeOverload ? "Task created after overload acknowledgement." : "Task created.");
            setSummaryRevision((revision) => revision + 1);
            if (parentId) {
                await load(parentId);
                setSubtasksRetry(count => count + 1);
            }
            else if (listFirst) {
                const url = new URL(window.location.href);
                url.searchParams.set(taskUrlKey("taskId", projectContext), created.id);
                window.history.pushState({ taskWorkspaceSelection: true, taskWorkspaceView: view }, "", url);
                setUrlTaskId(created.id);
            }
            else
                await load(created.id);
        }
        catch (cause) {
            const status = statusOf(cause), message = cause instanceof Error ? cause.message : "";
            if (status === 409 && message.includes("Overload warning")) {
                setUncertainCreation(undefined);
                setOverloadPrompt({ kind: "create", body: command, message, ...(parentId ? { parentId, expectedParentVersion: Number(body.expectedParentVersion) } : {}) });
            }
            else {
                if (status === undefined || status >= 500) {
                    setUncertainCreation({ body: command, ...(parentId ? { parentId } : {}) });
                    setOverloadPrompt(undefined);
                    setError(`We could not confirm whether the ${parentId ? "subtask" : "task"} was created. Your submitted details are preserved. Use Check creation result to recover this same request.`);
                }
                else
                    setError(status === 403 ? "You do not have permission to create or recover this task." : status === 409 ? "The task or retry details changed. Review the latest details before continuing." : "Task could not be created. Check the fields and try again.");
            }
        }
        finally {
            creationPending.current = false;
            setBusy(false);
        }
    };
    const submit = async (event) => {
        event.preventDefault();
        if (busy || creationPending.current || uncertainCreation || !setup || !validateCreation())
            return;
        await performCreation(taskCreateBody(composerDraft, creation.options));
    };
    const submitSubtask = async (event) => {
        event.preventDefault();
        const parent = detail?.task;
        const projection = selectedSubtasks;
        if (!parent || !projection?.canCreate || projection.isSubtask || projection.taskVersion !== parent.version || busy || creationPending.current || uncertainCreation || !setup) {
            if (parent && projection && projection.taskVersion !== parent.version) {
                setSubtasksError("This task changed while its subtasks loaded. Refresh before creating a subtask.");
                setShowSubtaskForm(false);
            }
            return;
        }
        if (!validateCreation())
            return;
        const body = { ...taskCreateBody(composerDraft, creation.options), expectedParentVersion: projection.taskVersion };
        await performCreation(body, parent.id);
    };
    const acknowledgeOverload = async () => {
        if (!overloadPrompt || busy || creationPending.current)
            return;
        const pending = overloadPrompt;
        if (pending.kind === "create" && (!validateCreation() || pending.parentId && (detail?.task.id !== pending.parentId || subtasks?.taskVersion !== pending.expectedParentVersion))) {
            setOverloadPrompt(undefined);
            return;
        }
        if (pending.kind === "reassign" && pending.taskId !== detail?.task.id) {
            setOverloadPrompt(undefined);
            setError("Review the selected task's assignment before acknowledging its capacity warning.");
            return;
        }
        if (pending.kind === "create") {
            await performCreation({ ...pending.body, acknowledgeOverload: true }, pending.parentId);
            return;
        }
        creationPending.current = true;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            if (detail) {
                await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/reassign`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ ...pending.body, acknowledgeOverload: true }) }).then(response => json(response));
                setReason("");
                setReassignId("");
                setOverloadPrompt(undefined);
                setNotice("Task owner reassigned after overload acknowledgement.");
                setSummaryRevision((revision) => revision + 1);
                await load(detail.task.id);
            }
        }
        catch (cause) {
            const status = statusOf(cause);
            setError(status === 403 ? "You do not have permission to make this assignment." : status === 409 ? "Capacity or task state changed. Review the latest details and retry." : "The task could not be assigned.");
            if (status === 409) {
                setOverloadPrompt(undefined);
            }
        }
        finally {
            creationPending.current = false;
            setBusy(false);
        }
    };
    const editTask = async (event) => {
        event.preventDefault();
        if (!detail || busy || reason.trim().length < 3 || !validateDescription())
            return;
        setBusy(true);
        setError("");
        const body = { expectedVersion: detail.task.version, reason: reason.trim(), title: title.trim(), targetDate, priority, ...(description.trim() ? { description: description.trim() } : {}), ...(startDate ? { startDate } : {}), ...(estimatedHours ? { estimatedHours: Number(estimatedHours) } : {}), planItemId: planItemId || null, tags: tagsText.split(",").map((tag) => tag.trim()).filter(Boolean), checklist: checklistText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => ({ label: line.replace(/^\[x\]\s*/i, "").replace(/^\[ \]\s*/, ""), checked: /^\[x\]\s*/i.test(line) })) };
        try {
            await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }).then((response) => json(response));
            setEditing(false);
            setNotice("Task details updated.");
            setSummaryRevision((revision) => revision + 1);
            await load(detail.task.id);
        }
        catch (cause) {
            setError(statusOf(cause) === 409 ? "This task changed elsewhere. Reloaded the latest details." : statusOf(cause) === 403 ? "You do not have permission to edit this task." : "Task details could not be updated. Try again.");
            if (statusOf(cause) === 409)
                await load(detail.task.id);
        }
        finally {
            setBusy(false);
        }
    };
    const createCloseout = async (event) => {
        event.preventDefault();
        if (busy || !projectId || !ownerId || reason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        try {
            await fetch(`${ROOT}/closeout`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ projectId, ownerEmployeeId: ownerId, title: title.trim(), workScope: workScope.trim(), targetDate, priority, reason: reason.trim() }) }).then((response) => json(response));
            setShowCloseoutForm(false);
            setNotice("Approved closeout task created.");
            setTitle("");
            setWorkScope("");
            setTargetDate("");
            setProjectId("");
            setOwnerId("");
            setReason("");
            setSummaryRevision((revision) => revision + 1);
            await load("");
        }
        catch (cause) {
            setError(statusOf(cause) === 403 ? "You are not authorized to approve closeout work for this project." : statusOf(cause) === 409 ? "The project changed or is no longer eligible for closeout." : "Closeout task could not be created. Check the fields and try again.");
        }
        finally {
            setBusy(false);
        }
    };
    const revokeCloseout = () => { if (!detail)
        return; void mutate("/closeout/revoke", { reason: reason.trim() }, "Closeout approval revoked."); };
    const mutate = async (path, body, success) => {
        if (!detail || busy)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }).then((response) => json(response));
            setReason("");
            if (path.includes("/dependencies")) {
                setDependencyReason("");
                setPredecessorId("");
            }
            if (path === "/state")
                setConfirmEarlyStart(false);
            if (path === "/committed-date")
                setCommittedDateReason("");
            if (path.includes("/extension-requests")) {
                setExtensionReason("");
                setExtensionDecisionReason("");
                setExtensionApproverId("");
                setExtensionDate("");
            }
            if (path === "/wait" || path === "/resume")
                clearWaitingForm();
            setNotice(success);
            setSummaryRevision((revision) => revision + 1);
            await load(detail.task.id);
        }
        catch (cause) {
            const message = cause instanceof Error ? cause.message : "";
            if (path === "/reassign" && statusOf(cause) === 409 && message.includes("Overload warning"))
                setOverloadPrompt({ kind: "reassign", taskId: detail.task.id, body: body, message });
            else if (statusOf(cause) === 409) {
                await load(detail.task.id);
                setError("This task changed elsewhere. The latest details are now loaded.");
            }
            else
                setError(statusOf(cause) === 403 ? "You do not have permission to make this change." : "The task could not be updated. Try again.");
        }
        finally {
            setBusy(false);
        }
    };
    const transition = (toState, acknowledgeUnfinishedDependencies = false) => {
        if (!detail)
            return;
        void mutate("/state", { toState, expectedVersion: detail.task.version, reason: reason.trim(), ...(acknowledgeUnfinishedDependencies ? { acknowledgeUnfinishedDependencies: true } : {}) }, `Task marked ${stateLabel(toState).toLowerCase()}.`);
    };
    const mutateRecurrence = async (method, suffix, reasonText, frequency, firstOccurrenceDate) => {
        if (!detail || !recurrence || busy)
            return;
        setBusy(true);
        setRecurrenceError("");
        setNotice("");
        const body = method === "PUT"
            ? { expectedTaskVersion: detail.task.version, expectedVersion: recurrence.rule?.version ?? 0, frequency, firstOccurrenceDate, reason: reasonText.trim() }
            : { expectedTaskVersion: detail.task.version, expectedVersion: recurrence.rule.version, reason: reasonText.trim() };
        try {
            await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/recurrence${suffix}`, { method, credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }).then((response) => json(response));
            setRecurrenceReason("");
            setRecurrenceActionReason("");
            setRecurrenceDate("");
            const current = await fetch(`${ROOT}/${encodeURIComponent(detail.task.id)}/recurrence`, { credentials: "include", cache: "no-store" }).then((response) => json(response));
            setRecurrence(current);
            setNotice(suffix === "/pause" ? "Recurrence paused." : suffix === "/resume" ? "Recurrence resumed." : "Recurrence rule saved.");
        }
        catch (cause) {
            setRecurrenceError(statusOf(cause) === 409 ? "The task or recurrence changed elsewhere. Refresh and review the latest rule." : statusOf(cause) === 403 ? "You do not have permission to change this recurrence." : "The recurrence could not be updated. Try again.");
            if (statusOf(cause) === 409) {
                void load(detail.task.id);
                setRecurrenceRetry((count) => count + 1);
            }
        }
        finally {
            setBusy(false);
        }
    };
    const clearWaitingForm = () => { setWaitReason(""); setDelayCause(""); setResponsibleParty(""); setResumeReason(""); };
    const leaveDrawerTask = () => {
        if (busy)
            return false;
        if (uncertainCreation) {
            if (!window.confirm("Creation is unconfirmed. Leaving loses this recovery request; the task may already exist. Leave without recovery?"))
                return false;
            setUncertainCreation(undefined);
            creationAttempt.current = undefined;
        }
        if (detailDraftDirtyRef.current && !window.confirm("Discard unsaved task changes?"))
            return false;
        detailDraftDirtyRef.current = false;
        setOverloadPrompt(current => current?.kind === "reassign" || current?.kind === "create" && current.parentId ? undefined : current);
        setShowSubtaskForm(false);
        if (showSubtaskForm) {
            setTitle("");
            setDescription("");
            setTargetDate("");
            setStartDate("");
            setEstimatedHours("");
            setOwnerId("");
            setPlanItemId("");
            setTagsText("");
            setChecklistText("");
            setCollaboratorIds([]);
            setCollaboratorHours({});
        }
        clearWaitingForm();
        setEditing(false);
        setReason("");
        setReassignId("");
        setCommittedDate("");
        setCommittedDateReason("");
        setExtensionDate("");
        setExtensionReason("");
        setExtensionDecisionReason("");
        setDependencyReason("");
        setConfirmEarlyStart(false);
        setRecurrenceReason("");
        setRecurrenceActionReason("");
        return true;
    };
    const closeTaskDrawer = () => {
        if (!leaveDrawerTask())
            return;
        if (window.history.state?.taskWorkspaceSelection)
            window.history.back();
        else {
            const url = new URL(window.location.href);
            url.searchParams.delete(taskUrlKey("taskId", projectContext));
            window.history.replaceState(window.history.state, "", url);
        }
        setUrlTaskId("");
        setSelectedId("");
        setDetail(undefined);
    };
    const navigateDrawerTask = (taskId) => {
        if (!visiblePage?.items.some(task => task.id === taskId) || !leaveDrawerTask())
            return;
        const url = new URL(window.location.href);
        url.searchParams.set(taskUrlKey("taskId", projectContext), taskId);
        window.history.replaceState(window.history.state, "", url);
        setUrlTaskId(taskId);
        setDetail(undefined);
    };
    const openRelatedTask = (taskId) => {
        if ((personalOnly || projectContext || registerMode) && !leaveDrawerTask())
            return;
        if (listFirst) {
            const url = new URL(window.location.href);
            url.searchParams.set(taskUrlKey("taskId", projectContext), taskId);
            window.history.pushState({ taskWorkspaceSelection: true, taskWorkspaceView: view }, "", url);
            setUrlTaskId(taskId);
            setDetail(undefined);
        }
        else
            void load(taskId);
    };
    // Undefined setup also represents loading or denied setup; only a successful
    // authoritative response can establish that this Owner has no employee identity.
    const employeeLessOwnerPersonal = personalOnly && scope === "personal" && owner && setup !== undefined && setup.actorEmployeeId === null;
    const requiresExplicitOwner = setup !== undefined && setup.actorEmployeeId === null;
    const canCreate = !!setup && (setup.canAssign || !!setup.actorEmployeeId) && (!projectContext || ["DRAFT", "ACTIVE"].includes(projectContext.status));
    const createIntent = useRef(!projectContext && new URL(window.location.href).searchParams.get("create") === "1");
    useEffect(() => {
        if (!canCreate || !createIntent.current)
            return;
        createIntent.current = false;
        const url = new URL(window.location.href);
        url.searchParams.delete("create");
        window.history.replaceState(window.history.state, "", url);
        setShowForm(true);
    }, [canCreate]);
    const selected = detail?.task;
    const selectedSubtasks = selected && subtasksTaskId === selected.id ? subtasks : undefined;
    const profile = setup?.creationProfile;
    const profileIsValid = profile?.version === 1 && (profile.variant === "OWNER" || profile.variant === "EMPLOYEE" || profile.variant === "LEADER" || profile.variant === "SITE");
    const creationVariant = owner ? "OWNER" : profileIsValid && profile.variant !== "OWNER" ? profile.variant : "EMPLOYEE";
    const siteSummaryPresentation = !owner && !!setup?.actorEmployeeId && profileIsValid && profile.variant === "SITE" && profile.resolution === "CONFIGURED_ROLE";
    const creationHeading = creationVariant === "OWNER" ? "Create or assign a task" : creationVariant === "LEADER" ? "Assign work" : creationVariant === "SITE" ? "Create site work" : "Create my task";
    const compactOptionalPlanning = creationVariant === "EMPLOYEE" || creationVariant === "SITE";
    const hasTaskCommands = !!detail && (Object.values(detail.capabilities ?? {}).some(Boolean) || !!detail.extensions?.some(item => item.canDecide || item.canWithdraw) || !!recurrence && Object.values(recurrence.capabilities ?? {}).some(Boolean));
    const taskListTitle = projectContext ? "Project tasks" : personalOnly ? scope === "all" ? "Team and employee tasks" : "My tasks" : !listFirst ? owner ? "Organization tasks" : scope === "mine" ? "My tasks" : "Assigned tasks" : owner && (scope === "mine" || scope === "assigned") ? registerMode ? "All organization tasks" : "Organization tasks (legacy scope)" : scope === "mine" ? "My primary tasks" : scope === "assigned" ? "Collaborating or managed tasks" : scope === "owned" ? "Owned by me" : scope === "created" ? "Created by me" : scope === "collaborating" ? "Collaborating" : owner ? "All organization tasks" : "All visible tasks";
    /**
     * Scope tabs follow the server-derived presentation role, matching the
     * demo's role-dependent scope bar. Every value here is an existing
     * backend scope, so authorization is unchanged — this only decides which
     * of the already-authorized views a person is offered:
     *  - Owner          → My Work, Organization
     *  - Team Leader    → My Work, My Team
     *  - Site employee  → My Work, Site work
     *  - Other staff    → My Work only
     * "My Team" reuses `assigned`, which the backend already restricts to the
     * manager's reporting tree. "Site work" reuses `all` with a SITE type
     * filter rather than a new scope value.
     */
    const visibleScopeOptions = (() => {
        if (projectContext)
            return [{ scope: "all", label: "Project tasks" }];
        const mine = { scope: "mine", label: registerMode ? "Assigned to me" : "My Work" };
        if (owner)
            return registerMode ? [{ scope: "all", label: "Organization" }] : [mine, { scope: "all", label: "Organization" }];
        if (creationVariant === "LEADER")
            return [mine, { scope: "assigned", label: "My Team" }];
        if (creationVariant === "SITE")
            return [mine, { scope: "all", label: "Site work" }];
        return [mine];
    })();
    /**
     * A shared or bookmarked URL can name a scope this role is not offered
     * (for example `?scope=owned` after the role-aware scope bar landed).
     * Fall back to the first available scope so the active tab and the data
     * never disagree. Every branch above starts with the "mine" option, so the
     * list is never empty and the fallback is always a real scope.
     */
    const activeScopeOption = visibleScopeOptions.some(option => option.scope === scope) ? scope : visibleScopeOptions[0]?.scope ?? "mine";
    const managementWork = personalOnly && scope === "all";
    useEffect(() => {
        if (!managementWork)
            return;
        let current = true;
        setManagementToday(undefined);
        void fetch("/api/v1/dashboard/sources/tasks", { credentials: "include", cache: "no-store" })
            .then(response => json(response))
            .then(calendar => { previousCalendarDay(calendar.today); if (current)
            setManagementToday(calendar.today); })
            .catch(() => { if (current)
            setManagementToday(undefined); });
        return () => { current = false; };
    }, [managementWork, summaryRevision]);
    const canOverseeWork = owner || creationVariant === "LEADER" || setup?.canAssign === true;
    const managementTeams = [...new Map((setup?.employees ?? []).filter(employee => employee.homeTeamId).map(employee => [employee.homeTeamId, { id: employee.homeTeamId, name: employee.homeTeamName ?? "Team", branchId: employee.homeBranchId }])).values()];
    const managementEmployees = (setup?.employees ?? []).filter(employee => !filters.teamId || employee.homeTeamId === filters.teamId);
    useEffect(() => {
        if (personalOnly && setup && !canOverseeWork && scope !== "personal") {
            setScope("personal");
            setTemporaryPhase("");
        }
    }, [personalOnly, setup, canOverseeWork, scope]);
    const switchWorkScope = (next) => {
        if (!leaveDrawerTask())
            return;
        clearWaitingForm();
        setUrlTaskId("");
        setSelectedId("");
        setDetail(undefined);
        setOffset(0);
        setTemporaryPhase("");
        setSourceRequest(undefined);
        const nextFilters = { ...defaultFilters, phase: "active" };
        setFilters(nextFilters);
        setDraftFilters(nextFilters);
        setScope(next);
    };
    const drillDown = (next) => {
        if (!leaveDrawerTask())
            return;
        const updated = { ...filters, ...next };
        clearWaitingForm();
        setUrlTaskId("");
        setSelectedId("");
        setDetail(undefined);
        setOffset(0);
        setFilters(updated);
        setDraftFilters(updated);
    };
    const secondaryFilterCount = FILTER_KEYS.filter(key => key !== "q" && key !== "dateBasis" && !!filters[key] && !(key === "phase" && filters.phase === defaultFilters.phase)).length + (filters.sort !== "created_desc" ? 1 : 0);
    const filterError = taskRefinementError(draftFilters) || ((draftFilters.dateFrom || draftFilters.dateTo) && !draftFilters.dateBasis
        ? "Choose Target date or Committed date before filtering by date."
        : draftFilters.dateFrom && draftFilters.dateTo && draftFilters.dateFrom > draftFilters.dateTo
            ? "The start date must be on or before the end date."
            : "");
    const pageRange = loading ? (visiblePage ? "Refreshing current page…" : "Loading current page…") : !visiblePage ? "Current page unavailable" : pageStale ? `Stale snapshot · last successfully refreshed ${pageRefreshedAt ? new Date(pageRefreshedAt).toLocaleString() : "time unavailable"} · ${visiblePage.total === 0 ? "0 filtered tasks" : `${offset + 1}–${Math.min(offset + visiblePage.items.length, visiblePage.total)} of ${visiblePage.total}`}` : visiblePage.total === 0 ? "0 filtered tasks" : `${offset + 1}–${Math.min(offset + visiblePage.items.length, visiblePage.total)} of ${visiblePage.total}`;
    const compactOwnerEmpty = employeeLessOwnerPersonal && !loading && !denied && !!visiblePage && visiblePage.total === 0 && !selectedId;
    const closeFilterPanel = (restoreFocus = false) => {
        setFilterOpen(false);
        if (restoreFocus)
            filterDisclosureRef.current?.querySelector("summary")?.focus();
    };
    const toggleFilterPanel = () => {
        const rect = filterDisclosureRef.current?.querySelector("summary")?.getBoundingClientRect();
        if (rect && window.innerWidth > 700) {
            const top = Math.max(80, Math.min(rect.bottom + 8, window.innerHeight - 180));
            setFilterPosition({ top, right: Math.max(16, Math.min(window.innerWidth - rect.right, window.innerWidth - 336)), maxHeight: Math.min(620, window.innerHeight - top - 16) });
        }
        setFilterOpen(value => !value);
    };
    useEffect(() => {
        if (!filterOpen)
            return;
        const outside = (event) => {
            if (event.target instanceof Node && !filterDisclosureRef.current?.contains(event.target))
                setFilterOpen(false);
        };
        const escape = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setFilterOpen(false);
                filterDisclosureRef.current?.querySelector("summary")?.focus();
            }
        };
        document.addEventListener("pointerdown", outside);
        document.addEventListener("keydown", escape);
        return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
    }, [filterOpen]);
    const applyFilters = (event) => {
        event.preventDefault();
        if (filterError || registerMode && !leaveDrawerTask())
            return;
        setDetail(undefined);
        setOffset(0);
        setFilters({ ...draftFilters, q: draftFilters.q.trim() });
        closeFilterPanel(true);
    };
    const resetFilters = () => {
        if (registerMode && !leaveDrawerTask())
            return;
        const reset = { ...defaultFilters };
        setDetail(undefined);
        setDraftFilters(reset);
        setFilters(reset);
        setOffset(0);
        setSearchExpanded(false);
        closeFilterPanel(true);
    };
    const appliedFilterItems = [];
    const addFilter = (key, label, value = filters[key]) => {
        if (filters[key])
            appliedFilterItems.push({ key, label, value });
    };
    addFilter("priorities", "Priority", selectionValues(filters.priorities).map(stateLabel).join(", "));
    addFilter("collaboratorEmployeeIds", "Collaborators", selectionValues(filters.collaboratorEmployeeIds).map(id => setup?.employees.find(employee => employee.id === id)?.name ?? "Selected employee unavailable").join(", "));
    addFilter("q", "Search");
    addFilter("projectId", "Project", setup?.projects?.find(project => project.id === filters.projectId)?.title ?? "Selected project");
    addFilter("planItemId", "Stage or milestone", setup?.planItems?.find(item => item.id === filters.planItemId)?.label ?? "Selected stage or milestone");
    addFilter("teamId", "Team", managementTeams.find(team => team.id === filters.teamId)?.name ?? "Selected team");
    addFilter("ownerEmployeeId", "Owner", setup?.employees?.find(employee => employee.id === filters.ownerEmployeeId)?.name ?? "Selected owner");
    addFilter("status", "Status", stateLabel(filters.status));
    if (filters.phase !== defaultFilters.phase)
        appliedFilterItems.push({ key: "phase", label: "Phase", value: filters.phase ? stateLabel(filters.phase) : "All phases" });
    if (filters.sort !== "created_desc")
        addFilter("sort", personalOnly && temporaryPhase === "attention" ? "Task list sort (paused)" : "Sort", { target_asc: "Nearest Target", title_asc: "Task name", owner_asc: "Primary owner", priority_desc: "Highest priority, then Target" }[filters.sort]);
    addFilter("dateFrom", `${filters.dateBasis === "committed" ? "Committed" : "Target"} from`);
    addFilter("dateTo", `${filters.dateBasis === "committed" ? "Committed" : "Target"} through`);
    const removeAppliedFilter = (key) => {
        if (registerMode && !leaveDrawerTask())
            return;
        if (![...FILTER_KEYS, "sort"].includes(key))
            return;
        const remove = (current) => {
            const next = { ...current, [key]: defaultFilters[key] };
            if (key === "projectId")
                next.planItemId = "";
            if (key === "teamId")
                next.ownerEmployeeId = "";
            if ((key === "dateFrom" || key === "dateTo") && !next.dateFrom && !next.dateTo)
                next.dateBasis = "";
            return next;
        };
        clearWaitingForm();
        setDetail(undefined);
        setUrlTaskId("");
        setOffset(0);
        filterDisclosureRef.current?.querySelector("summary")?.focus();
        setFilters(remove);
        setDraftFilters(remove);
    };
    const queueSnapshot = useMemo(() => ({ filters, view, compact, temporaryPhase: temporaryPhase }), [filters, view, compact, temporaryPhase]);
    const applyQueuePreferences = (snapshot) => {
        clearWaitingForm();
        setDetail(undefined);
        setUrlTaskId("");
        setOffset(0);
        setFilters({ priorities: "", collaboratorEmployeeIds: "", teamId: "", ...snapshot.filters });
        setDraftFilters({ priorities: "", collaboratorEmployeeIds: "", teamId: "", ...snapshot.filters });
        setView(snapshot.view);
        setCompact(snapshot.compact);
        setTemporaryPhase(snapshot.temporaryPhase);
    };
    const requestCreateClose = () => {
        if (busy || (uncertainCreation ? !window.confirm("Creation is unconfirmed. Leaving loses this recovery request; the task may already exist. Leave without recovery?") : createDraftDirtyRef.current && !window.confirm("Discard unsaved new task details?")))
            return false;
        setUncertainCreation(undefined);
        creationAttempt.current = undefined;
        createDraftDirtyRef.current = false;
        setShowForm(false);
        if (overloadPrompt?.kind === "create")
            setOverloadPrompt(undefined);
        return true;
    };
    /** Toggle the create-task dialog: opens it with a clean draft, or closes it with the guarded leave check. */
    const toggleCreateTask = () => {
        if (showForm) {
            requestCreateClose();
            return;
        }
        createDraftDirtyRef.current = false;
        setTitle("");
        setDescription("");
        setReason("");
        setTargetDate("");
        setStartDate("");
        setEstimatedHours("");
        setProjectId("");
        setPlanItemId("");
        setTagsText("");
        setChecklistText("");
        setType(projectContext ? "PROJECT" : "NON_PROJECT");
        setProjectId(projectContext?.id ?? "");
        setReviewRequirement("NONE");
        setPriority("MEDIUM");
        setAssignTo(false);
        setOwnerId("");
        setCollaboratorIds([]);
        setCollaboratorHours({});
        setShowForm(true);
    };
    const toggleCreateTaskRef = useRef(toggleCreateTask);
    toggleCreateTaskRef.current = toggleCreateTask;
    /**
     * "C" opens (or closes) the create-task dialog on the list-first routes where
     * the Create task control is available. It never fires while typing in a
     * field, while the closeout form is open, or where creation is not authorized
     * for the current context. Presentation-level affordance only — it delegates
     * to the same guarded toggle the button already uses.
     */
    useEffect(() => {
        if (!listFirst || projectContext || !canCreate || showCloseoutForm)
            return;
        const onKey = (event) => {
            if (event.key.toLowerCase() !== "c" || event.metaKey || event.ctrlKey || event.altKey || event.repeat)
                return;
            const target = event.target instanceof HTMLElement ? event.target : null;
            if (target && target.closest("input, textarea, select, [contenteditable='true']"))
                return;
            toggleCreateTaskRef.current();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [listFirst, projectContext, canCreate, showCloseoutForm]);
    const createTaskControl = _jsxs("button", { type: "button", className: `task-primary${personalOnly ? " my-work-create-task" : ""}`, "aria-label": "Create task", onClick: toggleCreateTask, disabled: !canCreate, children: [personalOnly && _jsx("span", { "aria-hidden": "true", className: "my-work-create-symbol", children: "＋" }), _jsx("span", { className: "my-work-create-label", children: "Create task" })] });
    const filterActions = _jsxs("div", { className: "task-filter-actions", children: [_jsx("button", { type: "submit", className: "task-primary", disabled: !!filterError || loading, children: "Apply filters" }), _jsx("button", { type: "button", onClick: resetFilters, disabled: loading, children: "Reset filters" })] });
    const paging = _jsxs("div", { className: "task-list-paging", "data-single-page": registerMode && offset === 0 && !!visiblePage && visiblePage.total <= 50 || undefined, children: [_jsx("span", { children: loading || !visiblePage || visiblePage.total === 0 || pageStale ? pageRange : _jsxs(_Fragment, { children: ["Showing ", _jsx("span", { children: pageRange }), " filtered tasks"] }) }), _jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => setOffset(Math.max(0, offset - 50)), disabled: loading || pageStale || offset === 0, children: "Previous" }), _jsx("button", { type: "button", onClick: () => setOffset(offset + 50), disabled: loading || pageStale || !visiblePage || offset + visiblePage.items.length >= visiblePage.total, children: "Next" })] })] });
    const toolbar = _jsxs("div", { className: "task-toolbar", children: [!personalOnly && !registerMode && _jsxs(_Fragment, { children: [_jsx("div", { role: "group", "aria-label": "Task list scope", className: "task-tabs task-scope-buttons", children: listFirst ? visibleScopeOptions.map((option) => _jsx("button", { type: "button", "aria-pressed": activeScopeOption === option.scope, onClick: () => { clearWaitingForm(); setOffset(0); setScope(option.scope); }, children: option.label }, option.scope)) : owner ? _jsx("span", { children: "Organization tasks" }) : _jsxs(_Fragment, { children: [_jsx("button", { type: "button", "aria-pressed": scope === "mine", onClick: () => { clearWaitingForm(); setOffset(0); setScope("mine"); }, children: "My tasks" }), _jsx("button", { type: "button", "aria-pressed": scope === "assigned", onClick: () => { clearWaitingForm(); setOffset(0); setScope("assigned"); }, children: "Assigned tasks" })] }) }), listFirst && _jsxs("label", { className: "task-mobile-control task-mobile-scope", children: ["Scope", _jsx("select", { "aria-label": "Task scope", value: activeScopeOption, onChange: (event) => { clearWaitingForm(); setOffset(0); setScope(event.target.value); }, children: visibleScopeOptions.map((option) => _jsx("option", { value: option.scope, children: option.label }, option.scope)) })] })] }), listFirst && _jsxs(_Fragment, { children: [_jsxs("div", { role: "group", "aria-label": "Task display", className: "task-tabs task-view-buttons", children: [_jsx("button", { type: "button", "aria-pressed": view === "list", onClick: () => setView("list"), children: "List" }), _jsx("button", { type: "button", "aria-pressed": view === "cards", onClick: () => setView("cards"), children: "Cards" }), _jsx("button", { type: "button", "aria-pressed": view === "board", onClick: () => setView("board"), children: "Kanban" }), _jsx("button", { type: "button", "aria-pressed": view === "timeline", onClick: () => setView("timeline"), children: "Timeline" })] }), _jsxs("label", { className: "task-mobile-control", children: ["Display", _jsxs("select", { "aria-label": "Task display mode", value: view, onChange: (event) => setView(event.target.value), children: [_jsx("option", { value: "list", children: "List" }), _jsx("option", { value: "cards", children: "Cards" }), _jsx("option", { value: "board", children: "Kanban" }), _jsx("option", { value: "timeline", children: "Timeline" })] })] })] }), listFirst && desktop && _jsxs("label", { className: "task-compact-toggle", children: [_jsx("input", { type: "checkbox", checked: compact, onChange: (event) => setCompact(event.target.checked) }), " Compact"] }), _jsx("button", { type: "button", onClick: refresh, children: "Refresh" })] });
    const primaryOwnerLabel = useCallback((task) => {
        const employee = setup?.employees.find((candidate) => candidate.id === task.primaryOwnerEmployeeId);
        if (employee)
            return employee.name;
        const email = task.primaryOwner?.account?.normalizedEmail;
        if (email)
            return email;
        return task.primaryOwnerEmployeeId === setup?.actorEmployeeId ? "You" : "Task owner";
    }, [setup]);
    /**
     * Presentation mapping for the My Work demo-parity row renderer. Reads the
     * same fields the legacy `.task-queue-row` markup already renders; the
     * parity renderer only changes how they are shown, never which rows are
     * visible (that stays the server's authorization decision).
     *
     * `nextAction` is a *label for the same open action* the legacy row offers.
     * It is deliberately derived from status only, so it can never widen what
     * the user is permitted to do.
     */
    const parityRows = useMemo(() => {
        if (!personalOnly)
            return [];
        return (visiblePage?.items ?? []).map((task) => {
            const project = setup?.projects.find((item) => item.id === task.projectId)?.title ?? "No project";
            const planItem = setup?.planItems.find((item) => item.id === task.planItemId)?.label;
            return {
                id: task.id,
                title: task.title,
                context: [project, planItem].filter(Boolean).join(" · "),
                project,
                stage: planItem ?? setup?.projects.find((item) => item.id === task.projectId)?.status ?? "—",
                people: primaryOwnerLabel(task),
                dueDate: task.targetDate.slice(0, 10),
                status: task.status,
                priority: task.priority,
                nextAction: parityNextAction(task),
                ...(task.isSubtask ? { isSubtask: true } : {}),
                ...(task.requiresReassignment ? { requiresReassignment: true } : {}),
            };
        });
    }, [personalOnly, visiblePage, setup, primaryOwnerLabel]);
    const renderTaskButton = (task, extraClass = "") => {
        const primaryOwner = primaryOwnerLabel(task);
        const queueRow = view === "list" && !extraClass && (listFirst === true || owner);
        const project = setup?.projects.find((item) => item.id === task.projectId)?.title ?? "No project";
        const planItem = setup?.planItems.find((item) => item.id === task.planItemId)?.label;
        const openTask = () => { if ((personalOnly || projectContext || registerMode) && task.id !== selectedId && !leaveDrawerTask())
            return; if (task.id !== selectedId)
            clearWaitingForm(); if (listFirst) {
            const url = new URL(window.location.href);
            url.searchParams.set(taskUrlKey("taskId", projectContext), task.id);
            window.history.pushState({ taskWorkspaceSelection: true, taskWorkspaceView: view }, "", url);
            setUrlTaskId(task.id);
            setDetail(undefined);
        }
        else
            void load(task.id); };
        if (queueRow)
            return _jsxs("div", { className: `task-list-item task-queue-row task-row-state-${task.status.toLowerCase()}${task.id === selectedId ? " is-selected" : ""}`, children: [_jsxs("button", { type: "button", className: "task-queue-open-main", "aria-label": `Open task: ${task.title}`, "aria-describedby": `task-queue-description-${task.id}`, "aria-current": task.id === selectedId ? "true" : undefined, onClick: openTask, children: [_jsxs("span", { className: "task-queue-cell task-queue-primary", children: [_jsx("span", { className: "task-queue-value-label", children: "Task" }), personalOnly && _jsx("span", { className: "task-queue-type", children: stateLabel(task.type) }), task.isSubtask && _jsx("span", { className: "task-subtask-marker", children: "Subtask" }), _jsx("strong", { children: task.title }), _jsxs("span", { className: "task-queue-context", children: [project, planItem ? ` · ${planItem}` : ""] }), task.requiresReassignment && _jsx("span", { className: "task-reassignment-alert", children: "Needs reassignment after employee exit" }), personalOnly && _jsxs(_Fragment, { children: [_jsx("span", { className: "my-work-mobile-state", "data-state": task.status.toLowerCase(), children: stateLabel(task.status) }), _jsx("span", { className: `my-work-mobile-due${rowIsOverdue(task.targetDate, overdueCalendar.before) ? " overdue" : ""}`, children: task.targetDate.slice(0, 10) })] })] }), _jsxs("span", { className: "task-queue-cell task-queue-priority", children: [_jsx("span", { className: "task-queue-value-label", children: "Priority" }), personalOnly ? _jsx("span", { className: `priority-pill ${parityPriorityClass(task.priority)}`, "data-priority": parityPriorityClass(task.priority).replace("pr-", ""), title: `${parityPriorityLabel(task.priority)} priority`, children: parityPriorityLabel(task.priority) }) : _jsx("strong", { className: `task-priority task-priority-${task.priority.toLowerCase()}`, children: registerMode ? stateLabel(task.priority) : task.priority })] }), _jsxs("span", { className: "task-queue-cell task-queue-status", children: [_jsx("span", { className: "task-queue-value-label", children: "Status" }), _jsx("span", { className: `task-state task-state-${task.status.toLowerCase()}`, children: stateLabel(task.status) })] }), _jsxs("span", { className: "task-queue-cell task-queue-target", children: [_jsx("span", { className: "task-queue-value-label", children: "Target" }), _jsx("strong", { children: registerMode ? registerDate(task.targetDate) : task.targetDate.slice(0, 10) })] }), _jsxs("span", { className: "task-queue-cell task-queue-committed", children: [_jsx("span", { className: "task-queue-value-label", children: "Committed" }), _jsx("strong", { children: registerMode ? task.committedDueDate ? registerDate(task.committedDueDate) : "—" : task.committedDueDate?.slice(0, 10) ?? "Not committed" })] }), _jsxs("span", { className: "task-queue-open", children: [personalOnly && _jsx("span", { className: "task-next-action", children: "Next: Open task" }), _jsxs("span", { className: "task-open-label", children: ["Open task ", _jsx("span", { "aria-hidden": "true", children: "\u2192" })] })] })] }), _jsxs("span", { className: "task-queue-cell task-queue-owner", children: [_jsx("span", { className: "task-queue-value-label", children: registerMode ? "Primary owner" : "People · Primary owner" }), _jsx(TaskPeople, { task: task, primaryOwnerLabel: primaryOwner, refreshVersion: summaryRevision, onOpenTask: openTask, ...(onSessionExpired ? { onSessionExpired } : {}) })] }), _jsxs("span", { className: "task-sr-only", id: `task-queue-description-${task.id}`, children: ["Primary owner: ", primaryOwner, ". Priority: ", task.priority, ". Status: ", stateLabel(task.status), ". Target date: ", task.targetDate.slice(0, 10), ". Committed date: ", task.committedDueDate?.slice(0, 10) ?? "Not committed", ".", task.requiresReassignment ? " Needs reassignment after employee exit." : ""] })] }, task.id);
        return _jsxs("button", { type: "button", className: `task-list-item${extraClass}${task.id === selectedId ? " is-selected" : ""}`, "aria-label": `Open task: ${task.title}`, "aria-current": task.id === selectedId ? "true" : undefined, onClick: openTask, children: [task.isSubtask && _jsx("span", { className: "task-subtask-marker", children: "Subtask" }), _jsx("strong", { children: task.title }), _jsxs("span", { children: [project, " \u00B7 ", primaryOwner] }), _jsxs("span", { children: [stateLabel(task.status), " \u00B7 ", stateLabel(task.priority)] }), task.requiresReassignment && _jsx("span", { className: "task-reassignment-alert", children: "Needs reassignment after employee exit" }), _jsxs("small", { children: ["Target date: ", task.targetDate.slice(0, 10)] }), _jsxs("small", { children: ["Committed date: ", task.committedDueDate?.slice(0, 10) ?? "Not committed"] })] }, task.id);
    };
    useEffect(() => {
        setCommittedDate(selected?.committedDueDate?.slice(0, 10) ?? "");
        setCommittedDateReason("");
        setConfirmEarlyStart(false);
    }, [selectedId, selected?.committedDueDate]);
    const selectWorkPhase = (phase) => {
        if (!leaveDrawerTask())
            return false;
        clearWaitingForm();
        setTemporaryPhase(phase);
        setOffset(0);
        setDetail(undefined);
        setSelectedId("");
        setUrlTaskId("");
        setFilterOpen(false);
        if (displayOptionsRef.current)
            displayOptionsRef.current.open = false;
        setQueueReveal(value => value + 1);
        return true;
    };
    const openWorkSources = (source) => {
        if (!selectWorkPhase(temporaryPhase === "attention" ? "" : "attention"))
            return;
        setSourceRequest(current => ({ source, version: (current?.version ?? 0) + 1 }));
    };
    const taskChecklistContent = selected ? _jsxs("section", { "aria-label": "Task checklist", children: [!!selected.checklist.length && _jsxs(_Fragment, { children: [_jsxs("h4", { children: ["Checklist ", _jsxs("span", { className: "task-checklist-count", children: [selected.checklist.filter((item) => item.checked).length, "/", selected.checklist.length] })] }), _jsx("ul", { className: "task-checklist", children: selected.checklist.map((item, index) => _jsxs("li", { children: [_jsx("input", { type: "checkbox", checked: item.checked, disabled: true, "aria-label": item.label }), _jsx("span", { children: item.label })] }, `${item.label}-${index}`)) }), _jsx("p", { className: "task-decision-help", children: "Checklist progress does not complete the task automatically." })] }), !selected.checklist.length && _jsxs(_Fragment, { children: [_jsx("h3", { children: "Checklist" }), _jsx("p", { children: "No checklist items are recorded for this task." })] }), selected.checklist.length > 0 && _jsx("p", { children: "Update checklist items through Edit task in Overview." })] }) : null;
    const taskActivityContent = selected && detail ? _jsxs("section", { "aria-label": "Task activity", children: [(detail.history.statusChanges.length > 0 || detail.history.ownerChanges.length > 0 || (detail.history.committedDateChanges?.length ?? 0) > 0) && _jsxs(_Fragment, { children: [_jsx("h4", { children: "Task history" }), _jsx("ol", { className: "task-history", children: [...detail.history.statusChanges.map((event) => ({ ...event, kind: "status" })), ...detail.history.ownerChanges.map((event) => ({ ...event, kind: "owner" })), ...(detail.history.committedDateChanges ?? []).map((event) => ({ ...event, kind: "committed-date" }))].sort((a, b) => (a.occurredAt ?? "").localeCompare(b.occurredAt ?? "")).map((event, index) => _jsxs("li", { children: [_jsxs("span", { children: [event.kind === "committed-date" ? `Committed due date ${event.oldDate ? `changed from ${event.oldDate.slice(0, 10)}` : "set"} to ${event.newDate.slice(0, 10)}: ${event.reason}` : event.reason ?? (event.toStatus ? `${stateLabel(event.fromStatus ?? "Created")} → ${stateLabel(event.toStatus)}` : event.kind === "owner" ? `Owner reassigned: ${setup?.employees.find((employee) => employee.id === event.oldOwnerEmployeeId)?.name ?? "Previous owner"} → ${setup?.employees.find((employee) => employee.id === event.newOwnerEmployeeId)?.name ?? "New owner"}` : event.action ?? "Task updated"), event.occurredAt ? ` · ${new Date(event.occurredAt).toLocaleString()}` : ""] }), "delayCause" in event && event.delayCause && _jsxs("span", { className: "task-history-waiting", children: ["Delay cause: ", event.delayCause, event.responsibleParty ? ` · Responsible party: ${event.responsibleParty}` : ""] })] }, event.id ?? index)) })] }), !detail.history.statusChanges.length && !detail.history.ownerChanges.length && !(detail.history.committedDateChanges?.length ?? 0) && _jsxs(_Fragment, { children: [_jsx("h3", { children: "Activity" }), _jsx("p", { children: "No task changes are recorded yet." })] })] }) : null;
    const taskEvidenceContent = selected ? _jsxs("section", { "aria-label": "Task evidence", children: [_jsx("h3", { children: "Evidence" }), selected.projectId ? _jsxs(_Fragment, { children: [_jsx("p", { children: "Open this task's internal review to see or submit its evidence." }), _jsx("a", { className: "task-review-link", href: `/reviews?taskId=${encodeURIComponent(detail?.linkedReviewTaskId || selected.id)}`, onClick: event => { if (!leaveDrawerTask())
                            event.preventDefault(); }, children: detail?.linkedReviewTaskId ? "Open correction instructions in internal review" : "Open internal review" })] }) : _jsx("p", { children: "No review evidence workflow is linked to this task." })] }) : null;
    const creationRecovery = uncertainCreation ? _jsxs("section", { className: "task-capacity-warning task-create-recovery", "aria-label": "Unconfirmed creation", children: [_jsx("p", { children: "The submitted details are locked while this result is unconfirmed. Checking uses the same request and cannot create a second copy." }), _jsx("button", { type: "button", "data-task-creation-recovery": true, disabled: busy, onClick: () => void performCreation(uncertainCreation.body, uncertainCreation.parentId), children: busy ? "Checking…" : "Check creation result" })] }) : null;
    const taskDetailView = _jsxs("article", { className: "task-detail", "aria-label": "Task details", onClickCapture: event => { if ((personalOnly || projectContext || registerMode) && event.target instanceof Element && event.target.closest("a[href]") instanceof HTMLAnchorElement && !isInPageAnchor(event.target.closest("a[href]")) && !leaveDrawerTask())
            event.preventDefault(); }, children: [creationRecovery, selected ? _jsxs(_Fragment, { children: [!personalOnly && _jsxs("div", { className: "task-detail-heading", children: [_jsxs("div", { children: [listFirst && _jsx("button", { type: "button", className: "task-back", onClick: () => { if (!leaveDrawerTask())
                                            return; clearWaitingForm(); if (window.history.state?.taskWorkspaceSelection)
                                            window.history.back();
                                        else {
                                            const url = new URL(window.location.href);
                                            url.searchParams.delete(taskUrlKey("taskId", projectContext));
                                            window.history.replaceState(null, "", url);
                                            setUrlTaskId("");
                                        } }, children: "Back to task list" }), _jsxs("p", { className: "task-eyebrow", children: [stateLabel(selected.type), selected.projectId ? " · Project task" : " · No project"] }), _jsx("h3", { children: selected.title })] }), _jsx("span", { className: `task-state task-state-${selected.status.toLowerCase()}`, children: stateLabel(selected.status) })] }), registerMode && _jsxs("section", { className: "task-register-next", "aria-label": "Next step", children: [_jsx("h4", { children: "Next step" }), _jsx("p", { children: selected.requiresReassignment ? "A manager must reassign this task before work can continue." : selected.status === "COMPLETED" ? "This task is complete. Its history remains available below." : selected.status.includes("INTERNAL_REVIEW") ? "Open internal review to see the submitted evidence and review progress." : selected.status.includes("CLIENT_REVIEW") ? "Waiting for client review. Open client reviews for the current request." : selected.status === "CORRECTIONS_REQUIRED" || selected.status === "CLIENT_REVISION_REQUIRED" ? "Read the review feedback and submit corrected evidence through the required review workflow." : selected.status === "INTERNAL_APPROVED" ? "Internal approval is recorded. Check the review workspace for client routing or the authorized completion step." : selected.status === "CLIENT_APPROVED" ? "Client approval is recorded. Use client reviews for the authorized final-approval and completion workflow." : selected.status === "WAITING" ? "Work is waiting. Review the waiting details and resume when the blocker is resolved." : selected.status === "STOPPED_DUE_TO_PROJECT_CANCELLATION" ? "This task is stopped because its project was cancelled." : selected.status === "IN_PROGRESS" ? "Continue the work, then submit required evidence for review or complete the task when permitted." : "Start the task when you are ready. Available actions follow your current permissions." }), (detail.capabilities.transition && !selected.requiresReassignment && ["NOT_STARTED", "IN_PROGRESS"].includes(selected.status)) && _jsxs("label", { children: ["Reason for change", _jsx("input", { "aria-label": "Reason for change", value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000 })] }), detail.capabilities.resume && selected.status === "WAITING" && !selected.requiresReassignment && _jsxs("form", { className: "task-wait-form", "aria-label": "Resume task", onSubmit: (event) => { event.preventDefault(); void mutate("/resume", { expectedVersion: selected.version, reason: resumeReason.trim() }, "Task resumed."); }, children: [_jsx("h4", { children: "Resume work" }), _jsx("p", { children: "The task will return to In progress." }), _jsxs("label", { children: ["Reason for resuming", _jsx("input", { value: resumeReason, onChange: (event) => setResumeReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || resumeReason.trim().length < 3, children: busy ? "Saving…" : "Resume task" })] }), detail.capabilities.transition && selected.status === "IN_PROGRESS" && (selectedSubtasks?.completionBlocked || selected.reviewRequirement !== "NONE") && _jsx("p", { className: "task-completion-help", role: "status", children: selectedSubtasks?.completionBlocked ? "Complete all subtasks before completing this task." : "Finish the required review before completing this task. Use the review link below." }), detail.capabilities.transition && !selected.requiresReassignment && _jsxs("div", { className: "task-actions", children: [selected.status === "NOT_STARTED" && (detail.dependencies?.hasUnfinished ? _jsx(_Fragment, { children: !confirmEarlyStart ? _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => setConfirmEarlyStart(true), children: "Review early start" }) : _jsxs(_Fragment, { children: [_jsx("p", { className: "task-dependency-warning", children: "Linked predecessor work is unfinished. Your start will be recorded as an early start." }), _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => transition("IN_PROGRESS", true), children: "Start anyway" }), _jsx("button", { type: "button", onClick: () => setConfirmEarlyStart(false), children: "Cancel" })] }) }) : _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => transition("IN_PROGRESS"), children: "Start task" })), selected.status === "IN_PROGRESS" && (selectedSubtasks?.completionBlocked ? _jsx("button", { type: "button", disabled: true, title: "Complete this task after its subtasks are complete", children: "Complete task" }) : _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3 || selected.reviewRequirement !== "NONE", title: selected.reviewRequirement !== "NONE" ? "Complete this task through its required review workflow. Open internal review above." : undefined, onClick: () => transition("COMPLETED"), children: "Complete task" }))] }), (detail.capabilities.transition && !selected.requiresReassignment && ["NOT_STARTED", "IN_PROGRESS"].includes(selected.status)) && reason.trim().length < 3 && _jsx("p", { className: "task-register-action-help", children: "Enter a reason of at least 3 characters to enable the applicable action." }), selected.projectId && (detail.linkedReviewTaskId || (selected.reviewRequirement !== "NONE" && selected.status !== "NOT_STARTED")) && _jsx("a", { className: "task-review-link", href: `/reviews?taskId=${encodeURIComponent(detail.linkedReviewTaskId || selected.id)}`, children: detail.linkedReviewTaskId ? "Open correction instructions in internal review" : selected.status === "IN_PROGRESS" ? "Submit work for review" : "Open internal review" }), selected.projectId && ["SUBMITTED_CLIENT_REVIEW", "IN_CLIENT_REVIEW", "CLIENT_REVISION_REQUIRED", "CLIENT_APPROVED"].includes(selected.status) && _jsx("a", { href: `/client-reviews?projectId=${encodeURIComponent(selected.projectId)}`, children: "Open client reviews" })] }), !registerMode && selected.projectId && detail.linkedReviewTaskId && _jsx("p", { children: _jsx("a", { className: "task-review-link", href: `/reviews?taskId=${encodeURIComponent(detail.linkedReviewTaskId)}`, children: "Open correction instructions in internal review" }) }), !registerMode && selected.projectId && !detail.linkedReviewTaskId && _jsx("p", { children: _jsx("a", { className: "task-review-link", href: `/reviews?taskId=${encodeURIComponent(selected.id)}`, children: "Open internal review" }) }), registerMode && selected.description && !editing && _jsxs(_Fragment, { children: [_jsx("h4", { children: "Description" }), _jsx("p", { className: "task-description", children: selected.description })] }), selected.requiresReassignment && _jsx("p", { className: "task-reassignment-alert", role: "status", children: "Needs reassignment after employee exit. A manager must reassign this task before it can resume." }), selected.status === "WAITING" && !selected.requiresReassignment && _jsxs("section", { className: "task-waiting-details", "aria-label": "Waiting details", children: [_jsx("h4", { children: "Waiting details" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Reason" }), _jsx("dd", { children: selected.waitingReason || "Not recorded" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Delay cause" }), _jsx("dd", { children: selected.waitingDelayCause || "Not recorded" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Responsible party" }), _jsx("dd", { children: selected.waitingResponsibleParty || "Not specified" })] })] })] }), (subtasksLoading || selectedSubtasks || subtasksError) && _jsxs("section", { className: "task-subtasks", "aria-label": "Subtasks", children: [_jsx("h4", { children: "Subtasks" }), createdSubtask?.parentId === selected.id && _jsxs("p", { role: "status", children: ["Created subtask: ", _jsx("button", { type: "button", onClick: () => openRelatedTask(createdSubtask.id), children: createdSubtask.id })] }), subtasksLoading && _jsx("p", { role: "status", children: "Loading subtasks\u2026" }), subtasksError && _jsxs("p", { role: "status", children: [subtasksError, " ", _jsx("button", { type: "button", onClick: () => setSubtasksRetry((count) => count + 1), children: "Refresh" })] }), selectedSubtasks?.parent && _jsxs("p", { children: ["Part of ", _jsx("button", { type: "button", className: "task-related-link", onClick: () => openRelatedTask(selectedSubtasks.parent.id), children: selectedSubtasks.parent.title })] }), selectedSubtasks && (selectedSubtasks.items.length ? _jsx("ul", { children: selectedSubtasks.items.map((child) => _jsxs("li", { children: [_jsx("button", { type: "button", className: "task-related-link", onClick: () => openRelatedTask(child.id), children: child.title }), _jsxs("span", { children: [stateLabel(child.status), " \u00B7 Target ", child.targetDate.slice(0, 10), " \u00B7 ", child.primaryOwnerName] })] }, child.id)) }) : _jsx("p", { children: "No subtasks." })), selectedSubtasks?.completionBlocked && _jsx("p", { className: "task-dependency-warning", role: "status", children: "This task cannot be completed until its subtasks are complete." }), selectedSubtasks?.canCreate && !selectedSubtasks.isSubtask && _jsx("button", { type: "button", disabled: busy || subtasksLoading || selectedSubtasks.taskVersion !== selected.version, onClick: () => { if (showSubtaskForm) {
                                    if (!leaveDrawerTask())
                                        return;
                                    setShowSubtaskForm(false);
                                }
                                else {
                                    setShowForm(false);
                                    setTitle("");
                                    setDescription("");
                                    setReason("");
                                    setTargetDate("");
                                    setStartDate("");
                                    setEstimatedHours("");
                                    setPlanItemId("");
                                    setTagsText("");
                                    setChecklistText("");
                                    setOwnerId("");
                                    setAssignTo(false);
                                    setCollaboratorIds([]);
                                    setCollaboratorHours({});
                                    setType(selected.projectId ? "PROJECT" : "NON_PROJECT");
                                    setReviewRequirement("NONE");
                                    setShowSubtaskForm(true);
                                    setError("");
                                } }, children: showSubtaskForm ? "Close subtask form" : "Create subtask" }), selectedSubtasks?.canCreate && selectedSubtasks.taskVersion !== selected.version && _jsxs("p", { role: "alert", children: ["Task details changed while subtasks loaded. ", _jsx("button", { type: "button", onClick: () => refresh(), children: "Refresh" })] }), showSubtaskForm && selectedSubtasks?.canCreate && !selectedSubtasks.isSubtask && selectedSubtasks.taskVersion === selected.version && _jsxs("form", { noValidate: true, className: "task-form task-subtask-form", "aria-label": "Create subtask", onSubmit: (event) => void submitSubtask(event), children: [_jsxs("h4", { children: [creationHeading, " \u00B7 subtask"] }), _jsx("p", { children: "This work stays in the same project as its parent task." }), _jsx(TaskComposerFields, { validationAttempt: validationAttempt, draft: composerDraft, onChange: changeComposer, projects: setup?.projects ?? [], planItems: setup?.planItems ?? [], options: creation.options, optionsError: creation.error, retryOptions: creation.retry, compact: compactOptionalPlanning, busy: busy || !!uncertainCreation, subtask: true, fixedProject: { id: selected.projectId ?? "", title: setup?.projects.find(project => project.id === selected.projectId)?.title ?? (selected.projectId ? "Project" : "No project") } }), _jsx("button", { type: "submit", className: "task-primary", disabled: busy || !!uncertainCreation || creationBlocked || selectedSubtasks.taskVersion !== selected.version, children: busy ? "Creating…" : "Create subtask" })] })] }), _jsxs("dl", { className: "task-facts", children: [_jsxs("div", { children: [_jsx("dt", { children: "Priority" }), _jsx("dd", { children: stateLabel(selected.priority) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Target date" }), _jsx("dd", { children: registerMode ? registerDate(selected.targetDate) : selected.targetDate.slice(0, 10) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Committed due date" }), _jsx("dd", { children: registerMode ? selected.committedDueDate ? registerDate(selected.committedDueDate) : "Not set" : selected.committedDueDate?.slice(0, 10) ?? "Not set" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Owner" }), _jsx("dd", { children: setup?.employees.find((employee) => employee.id === selected.primaryOwnerEmployeeId)?.name ?? (selected.primaryOwnerEmployeeId === setup?.actorEmployeeId ? "You" : "Task owner") })] }), !registerMode && _jsxs("div", { children: [_jsx("dt", { children: "Version" }), _jsx("dd", { children: selected.version })] })] }), _jsx(TaskRegisterDisclosure, { enabled: registerMode, label: "Dependencies", children: selected.projectId && _jsxs("section", { className: "task-dependencies", "aria-label": "Task dependencies", children: [_jsx("h4", { children: "Finish-to-start dependencies" }), detail.dependencies?.predecessors.length ? _jsx("ul", { children: detail.dependencies.predecessors.map((predecessor) => _jsxs("li", { children: [_jsxs("span", { children: [predecessor.title, " \u00B7 ", stateLabel(predecessor.status)] }), detail.capabilities.manageDependencies && _jsx("button", { type: "button", disabled: busy || dependencyReason.trim().length < 3, onClick: () => void mutate(`/dependencies/${encodeURIComponent(predecessor.id)}/remove`, { expectedVersion: selected.version, reason: dependencyReason.trim() }, "Dependency removed."), children: "Remove" })] }, predecessor.id)) }) : _jsx("p", { children: "No visible predecessor tasks linked." }), (detail.dependencies?.hiddenCount ?? 0) > 0 && _jsx("p", { children: "Additional linked tasks are unavailable under your current access." }), detail.dependencies?.hasUnfinished && _jsx("p", { className: "task-dependency-warning", role: "status", children: "At least one predecessor is unfinished. Starting this task early requires an explicit acknowledgement." }), detail.capabilities.manageDependencies && _jsxs("form", { onSubmit: (event) => { event.preventDefault(); if (predecessorId)
                                        void mutate("/dependencies", { predecessorTaskId: predecessorId, expectedVersion: selected.version, reason: dependencyReason.trim() }, "Dependency added."); }, children: [_jsxs("label", { children: ["Search predecessor tasks", _jsx("input", { value: dependencySearch, onChange: (event) => { setDependencySearch(event.target.value); setPredecessorId(""); }, maxLength: 160 })] }), _jsxs("label", { children: ["Link an accessible predecessor", _jsxs("select", { value: predecessorId, onChange: (event) => setPredecessorId(event.target.value), children: [_jsx("option", { value: "", children: "Choose a task" }), dependencyCandidates.filter((candidate) => !detail.dependencies?.predecessors.some((linked) => linked.id === candidate.id)).map((candidate) => _jsxs("option", { value: candidate.id, children: [candidate.title, " \u00B7 ", stateLabel(candidate.status)] }, candidate.id))] })] }), _jsxs("label", { children: ["Reason for dependency change", _jsx("input", { value: dependencyReason, onChange: (event) => setDependencyReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || !predecessorId || dependencyReason.trim().length < 3, children: "Add dependency" })] })] }) }), selected.planItemId && _jsxs("p", { className: "task-linked-plan", children: ["Linked plan item: ", setup?.planItems.find((item) => item.id === selected.planItemId)?.label ?? "Project plan item"] }), !!selected.tags.length && _jsxs(_Fragment, { children: [_jsx("h4", { children: "Tags" }), _jsx("ul", { className: "task-tags", children: selected.tags.map((tag) => _jsx("li", { children: tag }, tag)) })] }), !personalOnly && _jsx(_Fragment, { children: !!selected.checklist.length && _jsxs(_Fragment, { children: [_jsxs("h4", { children: ["Checklist ", _jsxs("span", { className: "task-checklist-count", children: [selected.checklist.filter((item) => item.checked).length, "/", selected.checklist.length] })] }), _jsx("ul", { className: "task-checklist", children: selected.checklist.map((item, index) => _jsxs("li", { children: [_jsx("input", { type: "checkbox", checked: item.checked, disabled: true, "aria-label": item.label }), _jsx("span", { children: item.label })] }, `${item.label}-${index}`)) }), _jsx("p", { className: "task-decision-help", children: "Checklist progress does not complete the task automatically." })] }) }), personalOnly && hasTaskCommands && _jsx("h4", { "data-task-drawer-commands": true, tabIndex: -1, children: "Task actions" }), detail.capabilities.edit && !editing && _jsx("button", { type: "button", onClick: () => { setTitle(selected.title); setDescription(selected.description ?? ""); setTargetDate(selected.targetDate.slice(0, 10)); setPriority(selected.priority); setStartDate(selected.startDate?.slice(0, 10) ?? ""); setEstimatedHours(selected.estimatedHours == null ? "" : String(selected.estimatedHours)); setPlanItemId(selected.planItemId ?? ""); setTagsText(selected.tags.join(", ")); setChecklistText(selected.checklist.map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.label}`).join("\n")); setEditing(true); }, children: "Edit task" }), editing && _jsxs("form", { className: "task-edit-form", onSubmit: (event) => void editTask(event), children: [_jsx("h4", { children: "Edit task" }), _jsxs("label", { children: ["Task name", _jsx("input", { value: title, onChange: (event) => setTitle(event.target.value), minLength: 2, maxLength: 160, required: true })] }), _jsxs("label", { children: ["Description", _jsx("textarea", { value: description, onChange: (event) => setDescription(event.target.value), maxLength: TASK_DESCRIPTION_MAX_LENGTH, rows: 3 })] }), _jsxs("div", { className: "task-form-grid", children: [_jsxs("label", { children: ["Target date", _jsx("input", { type: "date", value: targetDate, onChange: (event) => setTargetDate(event.target.value), required: true })] }), _jsxs("label", { children: ["Priority", _jsx("select", { value: priority, onChange: (event) => setPriority(event.target.value), children: PRIORITIES.map((item) => _jsx("option", { value: item, children: stateLabel(item) }, item)) })] }), _jsxs("label", { children: ["Start date", _jsx("input", { type: "date", value: startDate, onChange: (event) => setStartDate(event.target.value) })] }), _jsxs("label", { children: ["Estimated hours", _jsx("input", { type: "number", min: "0", step: "0.25", value: estimatedHours, onChange: (event) => setEstimatedHours(event.target.value) })] })] }), _jsxs("label", { children: ["Stage or milestone", _jsxs("select", { "aria-label": "Edit plan item", value: planItemId, onChange: (event) => setPlanItemId(event.target.value), disabled: !selected.projectId, children: [_jsx("option", { value: "", children: "No plan item" }), setup?.planItems.filter((item) => item.projectId === selected.projectId).map((item) => _jsxs("option", { value: item.id, children: [item.kind === "STAGE" ? "Stage" : "Milestone", " \u00B7 ", item.label] }, item.id))] })] }), _jsxs("label", { children: ["Tags (comma separated)", _jsx("input", { "aria-label": "Edit tags", value: tagsText, onChange: (event) => setTagsText(event.target.value) })] }), _jsxs("label", { children: ["Checklist (one item per line; prefix with [x] when checked)", _jsx("textarea", { "aria-label": "Edit checklist", value: checklistText, onChange: (event) => setChecklistText(event.target.value), rows: 3 })] }), _jsxs("label", { children: ["Reason", _jsx("input", { "aria-label": "Edit reason", value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsxs("div", { className: "task-edit-actions", children: [_jsx("button", { type: "submit", disabled: busy || reason.trim().length < 3, children: busy ? "Saving…" : "Save task" }), _jsx("button", { type: "button", onClick: () => setEditing(false), children: "Cancel edit" })] })] }), !registerMode && selected.description && !editing && _jsxs(_Fragment, { children: [_jsx("h4", { children: "Description" }), _jsx("p", { className: "task-description", children: selected.description })] }), detail.collaborators.length > 0 && _jsxs(_Fragment, { children: [_jsx("h4", { children: "Collaborators" }), _jsx("ul", { children: detail.collaborators.map((person) => _jsxs("li", { children: [person.name, person.estimatedHours !== undefined ? ` · ${person.estimatedHours} estimated hours` : ""] }, person.employeeId)) })] }), _jsx(TaskRegisterDisclosure, { enabled: registerMode, label: "Set or change committed date", children: detail.capabilities.changeCommittedDate && selected.type !== "CLOSEOUT" && _jsxs("form", { className: "task-committed-date", "aria-label": "Set committed due date", onSubmit: (event) => { event.preventDefault(); void mutate("/committed-date", { expectedVersion: selected.version, committedDueDate: committedDate, reason: committedDateReason.trim() }, selected.committedDueDate ? "Committed due date updated." : "Committed due date set."); }, children: [_jsx("h4", { children: selected.committedDueDate ? "Change committed due date" : "Set committed due date" }), _jsx("p", { children: "This commitment is separate from the operational target date." }), _jsxs("label", { children: ["Committed due date", _jsx("input", { type: "date", value: committedDate, onChange: (event) => setCommittedDate(event.target.value), required: true })] }), _jsxs("label", { children: ["Reason", _jsx("input", { value: committedDateReason, onChange: (event) => setCommittedDateReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || !committedDate || committedDateReason.trim().length < 3, children: busy ? "Saving…" : selected.committedDueDate ? "Change committed date" : "Set committed date" })] }) }), selected.type === "RECURRING" && _jsxs("section", { className: "task-recurrence", "aria-label": "Recurrence schedule", children: [_jsx("h4", { children: "Recurrence schedule" }), recurrenceLoading && _jsx("p", { role: "status", children: "Loading recurrence\u2026" }), recurrenceError && _jsxs("p", { role: "alert", children: [recurrenceError, " ", _jsx("button", { type: "button", onClick: () => setRecurrenceRetry((count) => count + 1), children: "Retry" })] }), recurrence && _jsxs(_Fragment, { children: [_jsxs("p", { children: ["Organization timezone: ", _jsx("strong", { children: recurrence.timezone })] }), recurrence.rule ? _jsxs("dl", { className: "task-recurrence-facts", children: [_jsxs("div", { children: [_jsx("dt", { children: "Frequency" }), _jsx("dd", { children: stateLabel(recurrence.rule.frequency) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Anchor date" }), _jsx("dd", { children: recurrence.rule.anchorDate.slice(0, 10) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Effective first date" }), _jsx("dd", { children: recurrence.rule.effectiveFromDate.slice(0, 10) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Schedule status" }), _jsx("dd", { children: recurrence.rule.paused ? "Paused" : "Active" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Rule version" }), _jsx("dd", { children: recurrence.rule.version })] })] }) : _jsx("p", { children: "No recurrence rule has been configured." }), recurrence.capabilities.configure && _jsxs("form", { className: "task-recurrence-form", "aria-label": "Configure recurrence", onSubmit: (event) => { event.preventDefault(); void mutateRecurrence("PUT", "", recurrenceReason, recurrenceFrequency, recurrenceDate); }, children: [_jsx("h5", { children: recurrence.rule ? "Change schedule" : "Configure schedule" }), _jsx("p", { children: "Choose a future first occurrence date in the organization timezone. Missed dates are skipped." }), _jsxs("label", { children: ["Frequency", _jsxs("select", { value: recurrenceFrequency, onChange: (event) => setRecurrenceFrequency(event.target.value), children: [_jsx("option", { value: "DAILY", children: "Daily" }), _jsx("option", { value: "WEEKLY", children: "Weekly" }), _jsx("option", { value: "MONTHLY", children: "Monthly" })] })] }), _jsxs("label", { children: ["First occurrence date", _jsx("input", { type: "date", value: recurrenceDate, onChange: (event) => setRecurrenceDate(event.target.value), required: true })] }), _jsxs("label", { children: ["Reason", _jsx("input", { value: recurrenceReason, onChange: (event) => setRecurrenceReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || recurrenceLoading || !recurrenceDate || recurrenceReason.trim().length < 3, children: busy ? "Saving…" : "Save recurrence rule" })] }), (recurrence.capabilities.pause || recurrence.capabilities.resume) && _jsxs("div", { className: "task-recurrence-control", children: [_jsx("h5", { children: recurrence.rule?.paused ? "Resume schedule" : "Pause schedule" }), _jsxs("label", { children: [recurrence.rule?.paused ? "Reason for resuming" : "Reason for pausing", _jsx("input", { value: recurrenceActionReason, onChange: (event) => setRecurrenceActionReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "button", disabled: busy || recurrenceActionReason.trim().length < 3, onClick: () => void mutateRecurrence("POST", recurrence.rule?.paused ? "/resume" : "/pause", recurrenceActionReason), children: busy ? "Saving…" : recurrence.rule?.paused ? "Resume recurrence" : "Pause recurrence" })] }), recurrence.history.length > 0 && _jsxs("div", { className: "task-recurrence-history", children: [_jsx("h5", { children: "Schedule history" }), _jsx("ol", { children: recurrence.history.map((entry) => _jsxs("li", { children: [_jsxs("p", { children: [_jsx("strong", { children: stateLabel(entry.action) }), " \u00B7 ", entry.reason, entry.occurredAt ? ` · ${new Date(entry.occurredAt).toLocaleString()}` : ""] }), _jsxs("details", { children: [_jsx("summary", { children: "Recorded rule details" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Before" }), _jsx("dd", { children: _jsx("code", { children: entry.before === null ? "No prior rule" : JSON.stringify(entry.before) }) })] }), _jsxs("div", { children: [_jsx("dt", { children: "After" }), _jsx("dd", { children: _jsx("code", { children: JSON.stringify(entry.after) }) })] })] })] })] }, entry.id)) })] })] })] }), (detail.capabilities.requestExtension || (detail.extensions?.length ?? 0) > 0) && _jsxs("section", { className: "task-extensions", "aria-label": "Deadline extensions", children: [_jsx("h4", { children: "Deadline extension requests" }), detail.capabilities.requestExtension && _jsxs("form", { onSubmit: (event) => { event.preventDefault(); void mutate("/extension-requests", { expectedVersion: selected.version, proposedDate: extensionDate, approverAccountId: extensionApproverId, reason: extensionReason.trim() }, "Deadline extension requested."); }, children: [_jsx("p", { children: "The current primary owner can ask a scoped manager or Owner to approve a later committed date." }), extensionApproversLoading && _jsx("p", { role: "status", children: "Loading eligible approvers\u2026" }), extensionApproversError && _jsxs("p", { role: "alert", children: [extensionApproversError, " ", _jsx("button", { type: "button", onClick: () => setExtensionApproverRetry((count) => count + 1), children: "Retry" })] }), _jsxs("label", { children: ["Proposed new date", _jsx("input", { type: "date", min: selected.committedDueDate?.slice(0, 10), value: extensionDate, onChange: (event) => setExtensionDate(event.target.value), required: true })] }), _jsxs("label", { children: ["Approver", _jsxs("select", { value: extensionApproverId, onChange: (event) => setExtensionApproverId(event.target.value), required: true, disabled: extensionApproversLoading || !!extensionApproversError || extensionApprovers.length === 0, children: [_jsx("option", { value: "", children: "Choose an approver" }), extensionApprovers.map((item) => _jsxs("option", { value: item.accountId, children: [item.name, " \u00B7 ", item.kind === "OWNER" ? "Owner" : "Scoped manager"] }, item.accountId))] })] }), _jsxs("label", { children: ["Reason", _jsx("input", { value: extensionReason, onChange: (event) => setExtensionReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || extensionApproversLoading || !!extensionApproversError || extensionApprovers.length === 0 || !extensionDate || extensionDate <= (selected.committedDueDate?.slice(0, 10) ?? "") || !extensionApproverId || extensionReason.trim().length < 3, children: "Request extension" })] }), detail.extensions?.length ? _jsx("ol", { className: "task-extension-list", children: detail.extensions.map((item) => _jsxs("li", { children: [_jsxs("p", { children: [_jsx("strong", { children: stateLabel(item.state) }), " \u00B7 ", item.previousDate, " \u2192 ", item.proposedDate] }), _jsx("p", { children: item.reason }), item.decision && _jsxs("p", { children: [stateLabel(item.decision.outcome), ": ", item.decision.reason] }), (item.canDecide || item.canWithdraw) && _jsxs("div", { children: [_jsxs("label", { children: [item.canDecide ? "Decision reason" : "Reason for withdrawing request", _jsx("input", { value: extensionDecisionReason, onChange: (event) => setExtensionDecisionReason(event.target.value), minLength: 3, maxLength: 1000 })] }), _jsxs("div", { className: "task-actions", children: [item.canDecide && _jsxs(_Fragment, { children: [_jsx("button", { type: "button", disabled: busy || extensionDecisionReason.trim().length < 3, onClick: () => void mutate(`/extension-requests/${encodeURIComponent(item.id)}/decision`, { outcome: "APPROVED", reason: extensionDecisionReason.trim() }, "Deadline extension approved."), children: "Approve extension" }), _jsx("button", { type: "button", disabled: busy || extensionDecisionReason.trim().length < 3, onClick: () => void mutate(`/extension-requests/${encodeURIComponent(item.id)}/decision`, { outcome: "REJECTED", reason: extensionDecisionReason.trim() }, "Deadline extension rejected."), children: "Reject extension" })] }), item.canWithdraw && _jsx("button", { type: "button", disabled: busy || extensionDecisionReason.trim().length < 3, onClick: () => void mutate(`/extension-requests/${encodeURIComponent(item.id)}/withdraw`, { reason: extensionDecisionReason.trim() }, "Deadline extension request withdrawn."), children: "Withdraw extension request" })] })] })] }, item.id)) }) : _jsx("p", { children: "No extension requests yet." })] }), selected.type === "CLOSEOUT" && detail.closeoutApproval && _jsxs("section", { className: "task-approval", "aria-label": "Closeout approval", children: [_jsx("h4", { children: "Closeout approval" }), _jsx("p", { children: detail.closeoutApproval.revokedAt ? `Revoked · ${detail.closeoutApproval.revocationReason ?? "No reason provided"}` : `Approved · ${new Date(detail.closeoutApproval.approvedAt).toLocaleString()}` }), _jsxs("p", { children: [_jsx("strong", { children: "Approved scope:" }), " ", detail.closeoutApproval.workScope] }), detail.capabilities.revokeCloseout && !detail.closeoutApproval.revokedAt && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Revocation reason", _jsx("input", { "aria-label": "Revocation reason", value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000 })] }), _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: revokeCloseout, children: "Revoke closeout approval" })] })] }), !registerMode && _jsx(_Fragment, { children: (detail.capabilities.reassign || detail.capabilities.transition) && _jsxs("label", { children: ["Reason for change", _jsx("input", { "aria-label": "Reason for change", value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000 })] }) }), _jsx(TaskRegisterDisclosure, { enabled: registerMode, label: "Pause work / record a blocker", children: detail.capabilities.wait && selected.status === "IN_PROGRESS" && !selected.requiresReassignment && _jsxs("form", { className: "task-wait-form", "aria-label": "Wait on task", onSubmit: (event) => { event.preventDefault(); void mutate("/wait", { expectedVersion: selected.version, reason: waitReason.trim(), delayCause: delayCause.trim(), ...(responsibleParty.trim() ? { responsibleParty: responsibleParty.trim() } : {}) }, "Task moved to waiting."); }, children: [_jsx("h4", { children: "Wait on this task" }), _jsxs("label", { children: ["Reason for waiting", _jsx("input", { value: waitReason, onChange: (event) => setWaitReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsxs("label", { children: ["Delay cause", _jsx("input", { value: delayCause, onChange: (event) => setDelayCause(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsxs("label", { children: ["Known responsible party (optional)", _jsx("input", { list: "task-responsible-parties", value: responsibleParty, onChange: (event) => setResponsibleParty(event.target.value), maxLength: 160 }), _jsx("datalist", { id: "task-responsible-parties", children: setup?.employees.map((employee) => _jsx("option", { value: employee.name }, employee.id)) })] }), _jsx("button", { type: "submit", disabled: busy || waitReason.trim().length < 3 || delayCause.trim().length < 3 || responsibleParty.trim().length > 160, children: busy ? "Saving…" : "Move to waiting" })] }) }), !registerMode && _jsx(_Fragment, { children: detail.capabilities.resume && selected.status === "WAITING" && !selected.requiresReassignment && _jsxs("form", { className: "task-wait-form", "aria-label": "Resume task", onSubmit: (event) => { event.preventDefault(); void mutate("/resume", { expectedVersion: selected.version, reason: resumeReason.trim() }, "Task resumed."); }, children: [_jsx("h4", { children: "Resume work" }), _jsx("p", { children: "The task will return to In progress." }), _jsxs("label", { children: ["Reason for resuming", _jsx("input", { value: resumeReason, onChange: (event) => setResumeReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", disabled: busy || resumeReason.trim().length < 3, children: busy ? "Saving…" : "Resume task" })] }) }), _jsx(TaskRegisterDisclosure, { enabled: registerMode, label: "Reassign owner", children: detail.capabilities.reassign && setup?.canAssign && _jsxs("div", { className: "task-change-owner", children: [_jsx("h4", { children: "Reassign owner" }), registerMode && _jsxs("label", { children: ["Reason for reassignment", _jsx("input", { value: reason, onChange: event => setReason(event.target.value), minLength: 3, maxLength: 1000 }), _jsx("span", { className: "task-register-action-help", children: "Enter at least 3 characters and choose a new owner." })] }), _jsxs("label", { children: ["New owner", _jsxs("select", { "aria-label": "New owner", value: reassignId, onChange: (event) => setReassignId(event.target.value), children: [_jsx("option", { value: "", children: "Choose an employee" }), setup.employees.filter((employee) => employee.id !== selected.primaryOwnerEmployeeId).map((employee) => _jsx("option", { value: employee.id, children: employee.name }, employee.id))] })] }), _jsx("button", { type: "button", disabled: !reassignId || busy || reason.trim().length < 3, onClick: () => void mutate("/reassign", { newOwnerEmployeeId: reassignId, expectedVersion: selected.version, reason: reason.trim() }, "Task owner reassigned."), children: "Reassign" })] }) }), !registerMode && _jsx(_Fragment, { children: detail.capabilities.transition && selected.status === "IN_PROGRESS" && (selectedSubtasks?.completionBlocked || selected.reviewRequirement !== "NONE") && _jsx("p", { className: "task-completion-help", role: "status", children: selectedSubtasks?.completionBlocked ? "Complete all subtasks before completing this task." : "Finish the required review before completing this task. Use the review actions above." }) }), !registerMode && _jsx(_Fragment, { children: detail.capabilities.transition && !selected.requiresReassignment && _jsxs("div", { className: "task-actions", children: [selected.status === "NOT_STARTED" && (detail.dependencies?.hasUnfinished ? _jsx(_Fragment, { children: !confirmEarlyStart ? _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => setConfirmEarlyStart(true), children: "Review early start" }) : _jsxs(_Fragment, { children: [_jsx("p", { className: "task-dependency-warning", children: "Linked predecessor work is unfinished. Your start will be recorded as an early start." }), _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => transition("IN_PROGRESS", true), children: "Start anyway" }), _jsx("button", { type: "button", onClick: () => setConfirmEarlyStart(false), children: "Cancel" })] }) }) : _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => transition("IN_PROGRESS"), children: "Start task" })), selected.status === "IN_PROGRESS" && (selectedSubtasks?.completionBlocked ? _jsx("button", { type: "button", disabled: true, title: "Complete this task after its subtasks are complete", children: "Complete task" }) : _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3 || selected.reviewRequirement !== "NONE", title: selected.reviewRequirement !== "NONE" ? "Complete this task through its required review workflow. Open internal review above." : undefined, onClick: () => transition("COMPLETED"), children: "Complete task" }))] }) }), registerMode && _jsxs("details", { className: "task-register-technical", children: [_jsx("summary", { children: "Technical details" }), _jsxs("p", { children: ["Task version ", selected.version] })] }), !personalOnly && _jsx(_Fragment, { children: (detail.history.statusChanges.length > 0 || detail.history.ownerChanges.length > 0 || (detail.history.committedDateChanges?.length ?? 0) > 0) && _jsxs(_Fragment, { children: [_jsx("h4", { children: "Task history" }), _jsx("ol", { className: "task-history", children: [...detail.history.statusChanges.map((event) => ({ ...event, kind: "status" })), ...detail.history.ownerChanges.map((event) => ({ ...event, kind: "owner" })), ...(detail.history.committedDateChanges ?? []).map((event) => ({ ...event, kind: "committed-date" }))].sort((a, b) => (a.occurredAt ?? "").localeCompare(b.occurredAt ?? "")).map((event, index) => _jsxs("li", { children: [_jsxs("span", { children: [event.kind === "committed-date" ? `Committed due date ${event.oldDate ? `changed from ${event.oldDate.slice(0, 10)}` : "set"} to ${event.newDate.slice(0, 10)}: ${event.reason}` : event.reason ?? (event.toStatus ? `${stateLabel(event.fromStatus ?? "Created")} → ${stateLabel(event.toStatus)}` : event.kind === "owner" ? `Owner reassigned: ${setup?.employees.find((employee) => employee.id === event.oldOwnerEmployeeId)?.name ?? "Previous owner"} → ${setup?.employees.find((employee) => employee.id === event.newOwnerEmployeeId)?.name ?? "New owner"}` : event.action ?? "Task updated"), event.occurredAt ? ` · ${new Date(event.occurredAt).toLocaleString()}` : ""] }), "delayCause" in event && event.delayCause && _jsxs("span", { className: "task-history-waiting", children: ["Delay cause: ", event.delayCause, event.responsibleParty ? ` · Responsible party: ${event.responsibleParty}` : ""] })] }, event.id ?? index)) })] }) })] }) : _jsx(TaskEmptyState, { message: "Select a task to see its details.", showClearFilters: false, onClearFilters: () => { } })] });
    const leaveProjectTasks = () => {
        if (busy || creationPending.current)
            return false;
        if (showForm && !requestCreateClose())
            return false;
        if (detailDraftDirtyRef.current && !window.confirm("Discard unsaved task changes?"))
            return false;
        createDraftDirtyRef.current = false;
        detailDraftDirtyRef.current = false;
        setShowForm(false);
        return leaveDrawerTask();
    };
    const leaveProjectRef = useRef(leaveProjectTasks);
    leaveProjectRef.current = leaveProjectTasks;
    useLayoutEffect(() => { if (!onLeaveGuard)
        return; onLeaveGuard(() => leaveProjectRef.current()); return () => onLeaveGuard(null); });
    useEffect(() => {
        if (!projectContext && !registerMode && !showForm && !uncertainCreation)
            return;
        const beforeUnload = (event) => {
            if (busy || creationPending.current || uncertainCreation || showForm && createDraftDirtyRef.current || detailDraftDirtyRef.current) {
                event.preventDefault();
                event.returnValue = "";
            }
        };
        const navigate = (event) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
                return;
            const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
            if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download") || isInPageAnchor(anchor))
                return;
            if (!leaveProjectRef.current()) {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        window.addEventListener("beforeunload", beforeUnload);
        document.addEventListener("click", navigate, true);
        return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", navigate, true); };
    }, [projectContext?.id, registerMode, busy, showForm, uncertainCreation]);
    const drawerTaskId = selectedId || urlTaskId;
    const drawerIndex = visiblePage?.items.findIndex(task => task.id === drawerTaskId) ?? -1;
    const drawerItems = visiblePage?.items ?? [];
    const previousDrawerTask = drawerIndex >= 0 && drawerItems.length > 1 ? drawerItems[(drawerIndex - 1 + drawerItems.length) % drawerItems.length] : undefined;
    const nextDrawerTask = drawerIndex >= 0 && drawerItems.length > 1 ? drawerItems[(drawerIndex + 1) % drawerItems.length] : undefined;
    const drawerContext = selected?.projectId ? setup?.projects.find(project => project.id === selected.projectId)?.title ?? "Project task" : "No project";
    const drawerPlan = setup?.planItems.find(item => item.id === selected?.planItemId)?.label;
    const capacityWarning = overloadPrompt && _jsxs("section", { className: "task-overload-warning", role: "alert", "aria-label": "Capacity warning", children: [_jsx("h3", { children: "Capacity warning" }), _jsx("p", { children: overloadPrompt.message }), _jsx("p", { children: "Assignment remains unchanged unless you acknowledge this warning." }), _jsxs("button", { type: "button", className: "task-primary", disabled: busy, onClick: () => void acknowledgeOverload(), children: ["Acknowledge and ", overloadPrompt.kind === "create" ? overloadPrompt.parentId ? "create subtask" : "create task" : "reassign owner"] }), _jsx("button", { type: "button", disabled: busy, onClick: () => setOverloadPrompt(undefined), children: "Cancel assignment" })] });
    useLayoutEffect(() => {
        drawerHistoryRef.current = { taskId: drawerTaskId, url: window.location.href, state: window.history.state, canLeave: leaveDrawerTask };
    });
    /**
     * Organization-calendar "today" for the parity list. Uses the Overdue
     * metric's resolved cutoff, which the server derives from the organization
     * timezone — never the browser clock. If the cutoff has not resolved yet the
     * earliest target date on the page stands in so rows still group; the
     * `my-work-parity-page-note` line keeps the page boundary honest.
     */
    const parityToday = managementWork ? managementToday ?? "" : overdueCalendar.before ?? (visiblePage?.items ?? []).map((task) => task.targetDate.slice(0, 10)).sort()[0] ?? "";
    /** Open a parity row through the same guarded path the legacy rows use. */
    const openParityTask = useCallback((taskId) => {
        if ((personalOnly || projectContext || registerMode) && taskId !== selectedId && !leaveDrawerTask())
            return;
        clearWaitingForm();
        if (listFirst) {
            const url = new URL(window.location.href);
            url.searchParams.set(taskUrlKey("taskId", projectContext), taskId);
            window.history.pushState({ taskWorkspaceSelection: true, taskWorkspaceView: view }, "", url);
            setUrlTaskId(taskId);
            setDetail(undefined);
        }
        else
            void load(taskId);
    }, [clearWaitingForm, leaveDrawerTask, listFirst, personalOnly, selectedId, view, projectContext?.id]);
    return _jsxs("section", { ref: workspaceRef, onChangeCapture: event => { if (event.target instanceof HTMLElement && event.target.closest(".task-detail"))
            detailDraftDirtyRef.current = true; }, className: `task-workspace${registerMode ? " task-register" : ""}${listFirst ? " task-workspace-list-first" : ""}${personalOnly ? " task-workspace-personal" : ""}${listFirst && selectedId && !personalOnly ? " task-workspace-detail-active" : ""}${listFirst && selectedId && !personalOnly && view !== "list" ? " task-workspace-detail-with-view" : ""}${compact && desktop ? " is-compact" : ""}`, "aria-labelledby": "task-workspace-title", children: [_jsxs("header", { className: "task-header", children: [_jsxs("div", { children: [personalOnly ? _jsx("p", { className: "my-work-kicker", children: "Workspace / Tasks" }) : _jsx("p", { className: "task-eyebrow", children: "Work management" }), projectContext ? _jsx("h2", { id: "task-workspace-title", children: "Tasks" }) : _jsx("h1", { id: "task-workspace-title", children: personalOnly ? "My work" : "Tasks" }), !personalOnly && _jsx("p", { children: registerMode ? "Browse tasks across your authorized scope. Use My Work for your daily actions." : "Track your work, collaborators and progress." })] }), _jsxs("div", { className: "task-header-actions", children: [!projectContext && setup?.projects.some((project) => project.status === "CANCELLED" && project.canApproveCloseout) && _jsx("button", { type: "button", onClick: () => { setShowCloseoutForm((open) => !open); setShowForm(false); }, children: showCloseoutForm ? "Close closeout form" : "Approve closeout task" }), !personalOnly && createTaskControl] })] }), personalOnly && canOverseeWork && _jsxs("section", { className: "my-work-management", "aria-label": "Work scope", children: [_jsxs("div", { className: "my-work-context-tabs", role: "group", "aria-label": "My Work scope", children: [_jsx("button", { type: "button", "aria-pressed": !managementWork, onClick: () => switchWorkScope("personal"), children: "My Work" }), _jsx("button", { type: "button", "aria-pressed": managementWork, onClick: () => switchWorkScope("all"), children: "All teams" })] }), managementWork && _jsxs(_Fragment, { children: [_jsxs("p", { children: [owner ? "Organization work across all teams." : "All teams within your authorized reporting and project scope.", " Select a team, then an employee to inspect their tasks."] }), _jsxs("div", { className: "my-work-drilldown", children: [_jsxs("label", { children: ["Team", _jsxs("select", { "aria-label": "Work team", value: filters.teamId, onChange: event => drillDown({ teamId: event.target.value, ownerEmployeeId: "" }), children: [_jsx("option", { value: "", children: "All teams" }), managementTeams.map(team => _jsx("option", { value: team.id, children: team.name }, team.id))] })] }), _jsxs("label", { children: ["Employee", _jsxs("select", { "aria-label": "Work employee", value: filters.ownerEmployeeId, onChange: event => drillDown({ ownerEmployeeId: event.target.value }), children: [_jsx("option", { value: "", children: "All employees" }), managementEmployees.map(employee => _jsx("option", { value: employee.id, children: employee.name }, employee.id))] })] }), _jsxs("label", { children: ["Work phase", _jsxs("select", { "aria-label": "Management work phase", value: filters.phase, onChange: event => drillDown({ phase: event.target.value, status: "" }), children: [_jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "waiting", children: "Waiting" }), _jsx("option", { value: "review", children: "In review / corrections" }), _jsx("option", { value: "completed", children: "Completed" }), _jsx("option", { value: "", children: "All phases" })] })] })] }), _jsx("small", { children: "Task visibility and available actions follow current permissions. Team membership is the primary owner's current home team." })] })] }), personalOnly && !managementWork && _jsx(MyWorkTopCards, { filters: filters, actionCounts: actionCounts, selectedMetric: temporaryPhase, refreshVersion: summaryRevision, queueStale: pageStale, queueRefreshedAt: pageRefreshedAt, onSelect: selectWorkPhase, onOpenSources: openWorkSources, onOverdueCalendar: updateOverdueCalendar, onSessionExpired: onSessionExpired, showSelection: false, sitePresentation: siteSummaryPresentation, accountId: accountId }), personalOnly && !managementWork && personalObligations && _jsx("div", { className: "my-work-obligations-first", children: personalObligations({ employeeLessOwner: compactOwnerEmpty, onActionCounts: updateActionCounts, ...(sourceRequest ? { sourceRequest } : {}) }) }), !personalOnly && !compactOwnerEmpty && (registerMode ? _jsxs("div", { className: "task-register-toolbar", children: [_jsxs("label", { children: ["Task scope", _jsx("select", { "aria-label": "Task scope", value: activeScopeOption, onChange: event => { if (!leaveDrawerTask())
                                    return; clearWaitingForm(); setOffset(0); setScope(event.target.value); }, children: visibleScopeOptions.map(option => _jsx("option", { value: option.scope, children: option.label }, option.scope)) })] }), _jsxs("details", { className: "task-register-display", children: [_jsx("summary", { children: "View options" }), toolbar] })] }) : toolbar), registerMode && _jsx("nav", { className: "task-register-phases", "aria-label": "Task phase", children: [["", "All tasks"], ["active", "Active"], ["waiting", "Waiting"], ["review", "In review"], ["completed", "Completed"]].map(([phase, label]) => _jsx("button", { type: "button", "aria-pressed": filters.phase === phase && !filters.status, onClick: () => { if (!leaveDrawerTask())
                        return; clearWaitingForm(); setDetail(undefined); setUrlTaskId(""); setOffset(0); const next = { ...filters, phase: phase, status: "" }; setFilters(next); setDraftFilters(previous => ({ ...previous, phase: phase, status: "" })); }, children: label }, label)) }), listFirst && _jsxs(_Fragment, { children: [personalOnly && _jsxs("div", { className: "my-work-queue-heading", children: [_jsxs("div", { children: [_jsx("h3", { ref: queueHeadingRef, tabIndex: -1, children: "Work queue" }), visiblePage && _jsxs("p", { children: [temporaryPhase === "attention" ? "Authorized tasks, reviews and decisions" : `${visiblePage.total} ${visiblePage.total === 1 ? "task" : "tasks"} · ${managementWork ? owner ? "Organization queue" : "Authorized team queue" : "Personal queue"}`, pageStale ? " · Stale snapshot" : ""] })] }), _jsxs("div", { className: "my-work-queue-heading-actions", children: [createTaskControl, !managementWork && _jsxs("button", { type: "button", className: "my-work-customize", onClick: () => setPreferenceMode("customize"), children: [_jsx("span", { "aria-hidden": "true", children: "\u2699" }), " Customize"] })] })] }), _jsxs("form", { className: `task-list-filters${personalOnly && searchExpanded ? " has-expanded-search" : ""}${FILTER_KEYS.some(key => draftFilters[key] !== filters[key]) || draftFilters.sort !== filters.sort ? " has-pending-filters" : ""}`, "aria-label": "Task filters", onSubmit: applyFilters, children: [_jsxs("label", { className: "task-search-control", children: [_jsx("span", { className: "task-search-label", children: "Search tasks" }), _jsxs("svg", { className: "task-search-icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: [_jsx("circle", { cx: "10.8", cy: "10.8", r: "6.3" }), _jsx("path", { d: "m16 16 4.2 4.2" })] }), _jsx("input", { "aria-label": "Search tasks", placeholder: "Search tasks or projects", value: draftFilters.q, onFocus: () => setSearchExpanded(true), onChange: (event) => setDraftFilters({ ...draftFilters, q: event.target.value }), maxLength: 160 })] }), _jsxs("details", { ref: filterDisclosureRef, className: "task-secondary-filters", open: filterOpen || undefined, children: [_jsxs("summary", { "aria-label": "Filters and sort", "aria-expanded": filterOpen || undefined, onClick: event => { event.preventDefault(); toggleFilterPanel(); }, children: [_jsx("svg", { className: "task-filter-icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M4 6h16M7 12h10m-7 6h4" }) }), _jsx("span", { children: "Filters" }), secondaryFilterCount > 0 && _jsxs("span", { className: "task-filter-count", children: [secondaryFilterCount, " applied"] })] }), _jsxs("div", { className: "task-filter-popover", style: filterPosition, role: "region", "aria-label": personalOnly ? "Filter My Work" : "Filter tasks", children: [!personalOnly && _jsxs("header", { children: [_jsx("h3", { children: "Filter tasks" }), _jsx("button", { type: "button", "aria-label": "Close filters", onClick: () => closeFilterPanel(true), children: "\u00D7" })] }), _jsxs("div", { className: "task-secondary-filter-grid", children: [_jsxs("label", { children: ["Project", _jsxs("select", { disabled: !!projectContext, "aria-label": "Filter by project", value: draftFilters.projectId, onChange: (event) => setDraftFilters({ ...draftFilters, projectId: event.target.value, planItemId: "" }), children: [_jsx("option", { value: "", children: "All projects" }), setup?.projects.map((project) => _jsx("option", { value: project.id, children: project.title }, project.id))] })] }), _jsxs("label", { children: ["Stage or milestone", _jsxs("select", { "aria-label": "Filter by stage or milestone", value: draftFilters.planItemId, onChange: (event) => setDraftFilters({ ...draftFilters, planItemId: event.target.value }), children: [_jsx("option", { value: "", children: "All plan items" }), (setup?.planItems ?? []).filter((item) => !draftFilters.projectId || item.projectId === draftFilters.projectId).map((item) => _jsxs("option", { value: item.id, children: [item.kind === "STAGE" ? "Stage" : "Milestone", " \u00B7 ", item.label] }, item.id))] })] }), _jsx(TaskRefinementFields, { priorities: draftFilters.priorities, collaboratorEmployeeIds: draftFilters.collaboratorEmployeeIds, employees: setup?.employees ?? [], onChange: patch => setDraftFilters({ ...draftFilters, ...patch }) }), _jsxs("label", { children: ["Primary owner", _jsxs("select", { "aria-label": "Filter by primary owner", value: draftFilters.ownerEmployeeId, onChange: (event) => setDraftFilters({ ...draftFilters, ownerEmployeeId: event.target.value }), children: [_jsx("option", { value: "", children: "All owners" }), (managementWork ? managementEmployees : setup?.employees)?.map((employee) => _jsx("option", { value: employee.id, children: employee.name }, employee.id))] })] }), _jsxs("label", { children: ["Status", _jsxs("select", { "aria-label": "Filter by status", value: draftFilters.status, onChange: (event) => setDraftFilters({ ...draftFilters, status: event.target.value }), children: [_jsx("option", { value: "", children: "All statuses" }), TASK_STATUSES.map((status) => _jsx("option", { value: status, children: stateLabel(status) }, status))] })] }), _jsxs("label", { children: [registerMode ? "Work phase" : "Phase", _jsxs("select", { "aria-label": "Filter by phase", value: draftFilters.phase, onChange: (event) => setDraftFilters({ ...draftFilters, phase: event.target.value }), children: [_jsx("option", { value: "", children: "All phases" }), _jsx("option", { value: "active", children: "Active" }), _jsx("option", { value: "waiting", children: "Waiting" }), _jsx("option", { value: "review", children: "Review" }), _jsx("option", { value: "completed", children: "Completed" })] })] }), _jsxs("label", { children: ["Sort by", _jsxs("select", { "aria-label": "Sort tasks", disabled: personalOnly && temporaryPhase === "attention", value: draftFilters.sort, onChange: (event) => setDraftFilters({ ...draftFilters, sort: event.target.value }), children: [_jsx("option", { value: "created_desc", children: "Recently created" }), _jsx("option", { value: "target_asc", children: "Target date \u00B7 earliest first" }), _jsx("option", { value: "title_asc", children: "Title \u00B7 A to Z" }), _jsx("option", { value: "owner_asc", children: "Primary owner \u00B7 A to Z" }), _jsx("option", { value: "priority_desc", children: "Priority \u00B7 highest first, then Target" })] })] }), _jsxs("label", { children: ["Date basis", _jsxs("select", { "aria-label": "Filter date basis", value: draftFilters.dateBasis, onChange: (event) => setDraftFilters({ ...draftFilters, dateBasis: event.target.value }), children: [_jsx("option", { value: "", children: "Choose date basis" }), _jsx("option", { value: "target", children: "Target date" }), _jsx("option", { value: "committed", children: "Committed date" })] })] }), _jsxs("label", { children: ["Date from", _jsx("input", { "aria-label": "Filter date from", type: "date", value: draftFilters.dateFrom, onChange: (event) => setDraftFilters({ ...draftFilters, dateFrom: event.target.value }) })] }), _jsxs("label", { children: ["Date through", _jsx("input", { "aria-label": "Filter date through", type: "date", value: draftFilters.dateTo, onChange: (event) => setDraftFilters({ ...draftFilters, dateTo: event.target.value }) })] })] }), filterOpen && _jsxs(_Fragment, { children: [filterError && _jsx("p", { className: "task-filter-error", role: "alert", children: filterError }), filterActions] })] })] }), managementWork && _jsxs("details", { className: "task-display-options", children: [_jsx("summary", { children: "Display and refresh" }), toolbar] }), personalOnly && !managementWork && _jsxs(_Fragment, { children: [_jsx(MyWorkQueuePreferences, { accountId: accountId, snapshot: queueSnapshot, defaults: { filters: defaultFilters, view: "list", compact: false, temporaryPhase: "" }, mode: preferenceMode, onMode: setPreferenceMode, onApply: applyQueuePreferences }), _jsxs("details", { ref: displayOptionsRef, className: "task-display-options", children: [_jsxs("summary", { children: ["More", _jsx("span", { className: "task-sr-only", children: " display and refresh options" })] }), _jsx("button", { type: "button", className: "my-work-mobile-customize", onClick: () => setPreferenceMode("customize"), children: "Customize view" }), toolbar, _jsx(MyWorkPhaseSummary, { filters: filters, selectedPhase: temporaryPhase, refreshVersion: summaryRevision, queueStale: pageStale, queueRefreshedAt: pageRefreshedAt, onSelect: selectWorkPhase, onSessionExpired: onSessionExpired, includeAbout: false }), _jsxs("div", { className: "my-work-status-legend", role: "group", "aria-label": "Filter by task status colour", children: [_jsx("strong", { children: "Status colours" }), _jsx("div", { children: ["NOT_STARTED", "IN_PROGRESS", "IN_INTERNAL_REVIEW", "CORRECTIONS_REQUIRED", "WAITING", "COMPLETED"].map(status => _jsxs("button", { type: "button", className: `my-work-status-shortcut task-row-state-${status.toLowerCase()}`, "aria-label": `Filter tasks: ${stateLabel(status)}`, "aria-pressed": filters.status === status, onClick: () => { const next = { ...filters, status: filters.status === status ? "" : status, phase: "" }; clearWaitingForm(); if (temporaryPhase !== "attention")
                                                                setTemporaryPhase(""); setDetail(undefined); setUrlTaskId(""); setOffset(0); setFilters(next); setDraftFilters(next); }, children: [_jsx("i", { "aria-hidden": "true" }), stateLabel(status)] }, status)) }), _jsx("span", { children: "All statuses stay in Filters" })] })] })] }), !filterOpen && filterError && _jsx("p", { className: "task-filter-error", role: "alert", children: filterError }), !filterOpen && filterActions, registerMode && (FILTER_KEYS.some(key => draftFilters[key] !== filters[key]) || draftFilters.sort !== filters.sort) && _jsx("p", { className: "task-register-filter-note", role: "status", children: "Filters changed. Choose Apply filters to update the list." })] }), _jsx(MyWorkFilterChips, { items: appliedFilterItems, onRemove: removeAppliedFilter, onClear: resetFilters }), !personalOnly && paging, personalOnly && _jsx("div", { className: "my-work-queue-layoutbar", children: _jsx("span", { children: temporaryPhase === "attention" ? "Ordered by deadline, then priority" : visiblePage ? `${visiblePage.total} tasks` : "Tasks loading" }) })] }), personalOnly && _jsx(MyWorkMetricFocus, { metric: temporaryPhase, total: visiblePage?.total, loading: loading, stale: pageStale, denied: denied, error: error, refreshedAt: pageRefreshedAt, overdueBefore: overdueCalendar.before, dateRangePaused: !!(filters.dateFrom || filters.dateTo), onClear: () => selectWorkPhase("") }), notice && _jsx("p", { className: "task-notice", role: "status", children: notice }), error && _jsxs("p", { className: "task-error", role: "alert", children: [error, pageStale && pageRefreshedAt ? ` Last successful refresh: ${new Date(pageRefreshedAt).toLocaleString()}.` : "", " ", _jsx("button", { type: "button", onClick: refresh, children: "Reload" })] }), !showForm && (!personalOnly || !drawerTaskId) && capacityWarning, showForm && _jsxs(TaskCreateDialog, { title: creationHeading, variant: creationVariant, busy: busy, onRequestClose: requestCreateClose, footer: _jsxs(_Fragment, { children: [_jsx("p", { className: "task-create-readiness", role: "status", "aria-live": "polite", children: busy ? "Creating…" : taskDraftReadiness(composerDraft, creation.options) }), _jsx("button", { type: "button", disabled: busy, onClick: requestCreateClose, children: "Cancel" }), _jsx("button", { type: "submit", form: "task-create-form", className: "task-primary", disabled: busy || !!uncertainCreation || creationBlocked || !setup, children: busy ? "Creating…" : "Create task" })] }), children: [error && _jsx("p", { role: "alert", className: "task-error", children: error }), capacityWarning, creationRecovery, _jsxs("form", { noValidate: true, id: "task-create-form", className: "task-form", onChangeCapture: () => { createDraftDirtyRef.current = true; }, onSubmit: (event) => void submit(event), "aria-label": "Create task", children: [_jsx("p", { children: requiresExplicitOwner ? "Choose the employee responsible for this task." : "This task is assigned to you unless you choose an authorized assignment." }), _jsx(TaskComposerFields, { validationAttempt: validationAttempt, draft: composerDraft, onChange: changeComposer, projects: setup?.projects ?? [], planItems: setup?.planItems ?? [], options: creation.options, optionsError: creation.error, retryOptions: creation.retry, compact: compactOptionalPlanning, busy: busy || !!uncertainCreation, ...(projectContext ? { fixedProject: projectContext } : {}) })] })] }), showCloseoutForm && _jsxs("form", { className: "task-form task-closeout-form", onSubmit: (event) => void createCloseout(event), "aria-label": "Approve closeout task", children: [_jsx("h3", { children: "Approve closeout task" }), _jsx("p", { children: "This creates separately identified work on a cancelled project and records your approval." }), _jsxs("label", { children: ["Cancelled project", _jsxs("select", { value: projectId, onChange: (event) => setProjectId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an eligible project" }), setup?.projects.filter((project) => project.status === "CANCELLED" && project.canApproveCloseout).map((project) => _jsx("option", { value: project.id, children: project.title }, project.id))] })] }), _jsxs("label", { children: ["Task name", _jsx("input", { value: title, onChange: (event) => setTitle(event.target.value), minLength: 2, maxLength: 160, required: true })] }), _jsxs("label", { children: ["Approved work scope", _jsx("textarea", { value: workScope, onChange: (event) => setWorkScope(event.target.value), minLength: 3, maxLength: 2000, required: true, rows: 3 })] }), _jsxs("div", { className: "task-form-grid", children: [_jsxs("label", { children: ["Primary owner", _jsxs("select", { value: ownerId, onChange: (event) => setOwnerId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose an eligible employee" }), setup?.employees.map((employee) => _jsx("option", { value: employee.id, children: employee.name }, employee.id))] })] }), _jsxs("label", { children: ["Priority", _jsx("select", { value: priority, onChange: (event) => setPriority(event.target.value), children: PRIORITIES.map((item) => _jsx("option", { value: item, children: stateLabel(item) }, item)) })] }), _jsxs("label", { children: ["Target date", _jsx("input", { type: "date", value: targetDate, onChange: (event) => setTargetDate(event.target.value), required: true })] })] }), _jsxs("label", { children: ["Reason for approval", _jsx("input", { value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { type: "submit", className: "task-primary", disabled: busy || !projectId || !ownerId || workScope.trim().length < 3 || reason.trim().length < 3, children: "Create approved closeout task" })] }), personalOnly && !managementWork && _jsx(ActionableWork, { accountId: accountId ?? "", enabled: temporaryPhase === "attention", filters: filters, refreshVersion: summaryRevision, onActionCounts: updateActionCounts, onSessionExpired: onSessionExpired, onOpenTask: openRelatedTask, onClear: () => selectWorkPhase(""), onClearTaskFilters: () => { const next = { ...defaultFilters, q: filters.q, projectId: filters.projectId }; setFilters(next); setDraftFilters(next); setOffset(0); } }, `attention-${accountId}`), personalOnly && temporaryPhase === "attention" ? null : compactOwnerEmpty ? _jsxs("section", { className: "task-owner-empty", children: [_jsx("h3", { children: "No personal tasks" }), _jsx("p", { children: "This Owner account is not linked to an employee. Open organization work to manage tasks." }), _jsx("a", { className: "task-owner-empty-link", href: "/tasks", children: "Open organization work" })] }) : loading && (!personalOnly || !visiblePage) ? _jsx("p", { role: "status", children: visiblePage ? "Refreshing tasks…" : "Loading tasks…" }) : denied ? _jsx("p", { role: "alert", children: "You do not have access to these tasks." }) : !visiblePage ? null : _jsx(_Fragment, { children: _jsxs("div", { className: listFirst && view !== "list" ? `task-work-context${selected && !personalOnly ? " has-detail" : ""}` : undefined, children: [listFirst && view === "cards" && _jsxs("section", { className: "task-cards", "aria-label": "Task cards", children: [_jsxs("h3", { children: [taskListTitle, " ", _jsx("span", { children: "Cards show the same filtered page." })] }), visiblePage.items.length === 0 ? _jsx(TaskEmptyState, { message: "No tasks match this scope and filters.", showClearFilters: true, onClearFilters: resetFilters }) : _jsx("ul", { className: "task-card-grid", children: visiblePage.items.map(task => _jsx("li", { children: renderTaskButton(task, " task-card-choice") }, task.id)) })] }), listFirst && view === "board" && _jsxs("section", { className: "task-board", "aria-label": "Tasks grouped by status", children: [_jsxs("h3", { children: ["Kanban ", _jsx("span", { children: "Counts show tasks on this page only." })] }), _jsx("div", { className: "task-board-columns", children: TASK_STATUSES.map((status) => { const tasks = visiblePage.items.filter((task) => task.status === status); return _jsxs("section", { className: "task-board-column", children: [_jsxs("h4", { children: [stateLabel(status), " ", _jsx("span", { children: tasks.length })] }), tasks.length ? tasks.map((task) => renderTaskButton(task, " task-board-card")) : _jsx(TaskEmptyState, { message: "No tasks on this page.", showClearFilters: true, onClearFilters: resetFilters })] }, status); }) })] }), listFirst && view === "timeline" && _jsxs("section", { className: "task-timeline", "aria-label": "Task dates timeline", children: [_jsxs("h3", { children: ["Timeline ", _jsx("span", { children: "Recorded dates are shown separately; duration is not calculated." })] }), visiblePage.items.length === 0 ? _jsx(TaskEmptyState, { message: "No tasks on this page.", showClearFilters: true, onClearFilters: resetFilters }) : _jsx("ol", { children: visiblePage.items.map((task) => _jsxs("li", { children: [renderTaskButton(task, " task-timeline-task"), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Start date" }), _jsx("dd", { children: task.startDate?.slice(0, 10) ?? "Not set" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Target date" }), _jsx("dd", { children: task.targetDate.slice(0, 10) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Committed date" }), _jsx("dd", { children: task.committedDueDate?.slice(0, 10) ?? "Not committed" })] })] })] }, task.id)) })] }), parityEnabled && view === "list" && visiblePage.items.length > 0 && _jsxs("div", { className: "my-work-parity-queue", children: [_jsx(MyWorkParityList, { rows: parityRows, today: parityToday, groupBy: managementWork && !managementToday ? "priority" : "due", selectedId: selectedId, loading: loading, ...(denied ? { error: "You do not have access to these tasks." } : {}), onOpenTask: openParityTask }), managementWork && !managementToday && _jsx("p", { className: "my-work-parity-page-note", children: "Organization calendar unavailable or loading. Grouped by priority; overdue comparison is unavailable." }), _jsx("p", { className: "my-work-parity-page-note", children: "Grouping and \u201CShow more\u201D apply to this page only." })] }), (!listFirst || view === "list" || !!selected && !personalOnly) && _jsxs("div", { className: `task-columns${listFirst && view === "list" && (!selected || personalOnly) ? " task-queue-no-selection" : ""}`, children: [_jsxs("nav", { className: `task-list${listFirst && view === "list" ? " task-queue-list" : ""}`, "aria-label": taskListTitle, children: [!(parityEnabled && view === "list") && _jsxs(_Fragment, { children: [_jsxs("h3", { children: [taskListTitle, _jsx("span", { children: visiblePage.total })] }), listFirst && view === "list" && _jsxs("div", { className: "task-queue-header", "aria-hidden": "true", children: [_jsx("span", { children: "Task" }), _jsx("span", { children: "People \u00B7 Primary owner" }), _jsx("span", { children: "Priority" }), _jsx("span", { children: "Status" }), _jsx("span", { children: "Target" }), _jsx("span", { children: "Committed" }), _jsx("span", { children: "Next action" })] })] }), visiblePage.items.length === 0 ? _jsx(TaskEmptyState, { message: managementWork ? "No authorized tasks match this team, employee and filters." : personalOnly ? employeeLessOwnerPersonal ? "This Owner account is not linked to an employee. Open organization work to manage tasks." : "No tasks are assigned to you or include you as a collaborator." : owner && scope !== "owned" && scope !== "created" && scope !== "collaborating" ? "No organization tasks match these filters." : scope === "mine" ? "No primary tasks match these filters." : scope === "owned" ? "No tasks are owned by you." : scope === "created" ? "No tasks were created by you that match these filters." : scope === "collaborating" ? "No tasks include you as a collaborator." : scope === "assigned" ? "No collaborating or managed tasks match these filters." : "No visible tasks match these filters.", showClearFilters: !employeeLessOwnerPersonal, onClearFilters: resetFilters }) : !(parityEnabled && view === "list") && visiblePage.items.map((task) => renderTaskButton(task))] }), !personalOnly && (!listFirst || selected) && taskDetailView] })] }) }), personalOnly && !compactOwnerEmpty && temporaryPhase !== "attention" && _jsxs(_Fragment, { children: [paging, managementWork ? _jsx("p", { className: "my-work-parity-page-note", children: "Totals reflect authorized tasks matching these filters. Grouping applies to the current page; personal reviews and decisions remain in My Work." }) : _jsx(MyWorkTaskCountInformation, {}), _jsx("a", { className: "my-work-review-inbox-link", href: "/reviews?scope=mine&queue=waiting", children: "Assigned reviewer inbox" }), _jsx("a", { className: "my-work-decisions-link", href: "/decisions", children: "Authorized decisions" })] }), personalOnly && listFirst && drawerTaskId && !denied && _jsx(TaskDetailDrawer, { enabled: true, taskId: drawerTaskId, title: selected?.title ?? "Task unavailable", taskType: selected ? stateLabel(selected.type) : "Task", contextLabel: selected ? `${drawerContext}${drawerPlan ? ` / ${drawerPlan}` : ""}` : "", statusLabel: selected ? stateLabel(selected.status) : "", priorityLabel: selected ? stateLabel(selected.priority) : "", targetLabel: selected ? `Target ${selected.targetDate.slice(0, 10)}` : "", waitingLabel: selected?.status === "WAITING" ? selected.waitingResponsibleParty ? `Waiting on ${selected.waitingResponsibleParty}` : "Waiting" : undefined, checklistCompleted: selected?.checklist.filter(item => item.checked).length ?? 0, checklistTotal: selected?.checklist.length ?? 0, overview: taskDetailView, checklist: taskChecklistContent, evidence: taskEvidenceContent, activity: taskActivityContent, onClose: closeTaskDrawer, busy: busy, loading: loading && !selected, hasActions: hasTaskCommands, hasData: !!selected, onPrevious: previousDrawerTask ? () => navigateDrawerTask(previousDrawerTask.id) : undefined, onNext: nextDrawerTask ? () => navigateDrawerTask(nextDrawerTask.id) : undefined, errors: error || capacityWarning ? _jsxs(_Fragment, { children: [error && _jsxs(_Fragment, { children: [error, " ", _jsx("button", { type: "button", onClick: refresh, children: "Reload" })] }), capacityWarning] }) : undefined, feedback: notice ? _jsx("p", { className: "task-notice", role: "status", children: notice }) : undefined, actions: _jsx("button", { type: "button", className: "task-detail-drawer__close-footer", onClick: closeTaskDrawer, children: "Back to task list" }) })] });
}
function TaskRegisterDisclosure({ enabled, label, children }) {
    if (!children)
        return _jsx(_Fragment, {});
    return enabled ? _jsxs("details", { className: "task-register-manage", children: [_jsx("summary", { children: label }), children] }) : _jsx(_Fragment, { children: children });
}
function registerDate(value) {
    const day = value.slice(0, 10);
    const date = new Date(`${day}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? day : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
