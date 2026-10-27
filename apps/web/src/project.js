import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ConfirmedDrawings } from "./confirmed-drawings.js";
import { ProjectRelationships } from "./project-relationships.js";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "./project.css";
import { TaskWorkspace } from "./task.js";
import { ProjectPlan, ProjectTemplatePanel } from "./project-template.js";
import { ProjectResourceSummary } from "./project-resources.js";
import { ProjectDirectory } from "./project-directory.js";
const API = "/api/v1/projects";
const projectSections = ["overview", "plan", "tasks", "people", "documents", "reviews", "delivery", "activity"];
const sectionDescriptions = { overview: "Project details and management actions.", plan: "Stages, milestones and planned folders.", tasks: "Work and reviews for this project.", people: "Project lead and assigned contributors.", documents: "Confirmed drawings and accessible project files.", reviews: "Internal review rounds and client review access.", delivery: "Continue delivery in the relevant project workspaces.", activity: "Project history and requests, grouped by type." };
function readProjectSection() {
    const queryValue = new URLSearchParams(window.location.search).get("projectSection");
    if (projectSections.includes(queryValue))
        return queryValue;
    return window.location.hash === "#project-plan" ? "plan" : "overview";
}
async function json(response) { if (!response.ok)
    throw Object.assign(new Error(response.status === 403 ? "denied" : response.status === 409 ? "conflict" : "request"), { status: response.status }); return response.json(); }
function directoryContextKey(branchId, context) {
    return JSON.stringify([branchId, context.q, context.stageKey, context.sort, context.direction]);
}
function readProjectListContext() {
    const query = new URLSearchParams(window.location.search);
    const rawOffset = Number(query.get("offset") ?? 0);
    const sort = query.get("sort");
    const direction = query.get("direction");
    return { branchId: query.get("branchId") ?? "", q: query.get("q") ?? "", stageKey: query.get("stageKey") ?? "", sort: sort === "name" || sort === "milestone" ? sort : "created", direction: direction === "asc" ? "asc" : "desc", offset: Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0, projectId: query.get("projectId") ?? "" };
}
function writeProjectListContext(changes) {
    const current = readProjectListContext();
    const next = { ...current, ...changes };
    const query = new URLSearchParams(window.location.search);
    const changedProject = changes.projectId !== undefined && changes.projectId !== current.projectId;
    if (changedProject) {
        query.delete("projectSection");
        for (const key of [...query.keys()])
            if (key.startsWith("projectTask"))
                query.delete(key);
    }
    for (const key of ["branchId", "q", "stageKey", "sort", "direction", "offset", "projectId"])
        query.delete(key);
    if (next.branchId)
        query.set("branchId", next.branchId);
    if (next.q)
        query.set("q", next.q);
    if (next.stageKey)
        query.set("stageKey", next.stageKey);
    if (next.sort !== "created")
        query.set("sort", next.sort);
    if (next.direction !== "desc")
        query.set("direction", next.direction);
    if (next.offset > 0)
        query.set("offset", String(next.offset));
    if (next.projectId)
        query.set("projectId", next.projectId);
    window.history.pushState(null, "", `${window.location.pathname}${query.toString() ? `?${query}` : ""}${changedProject ? "" : window.location.hash}`);
}
function writeProjectSection(section, projectId) {
    const query = new URLSearchParams(window.location.search);
    if (projectId)
        query.set("projectId", projectId);
    if (section === "overview")
        query.delete("projectSection");
    else
        query.set("projectSection", section);
    window.history.pushState(null, "", `${window.location.pathname}${query.toString() ? `?${query}` : ""}${section === "plan" ? "#project-plan" : ""}`);
}
const projectStatusTones = new Set(["draft", "active", "on_hold", "completed", "cancelled", "archived"]);
/** Presentation-only tone class for a canonical project status; unknown values stay neutral. */
function projectStatusClass(status, prefix = "is-") {
    const tone = String(status ?? "").toLowerCase();
    return projectStatusTones.has(tone) ? `${prefix}${tone}` : `${prefix}neutral`;
}
export function ProjectWorkspace({ csrfToken, owner, listFirst = false, initialProjectId = "" }) {
    const initialListContext = readProjectListContext();
    const [setup, setSetup] = useState();
    const createDisclosure = useRef(null);
    const [branchId, setBranchId] = useState(initialListContext.branchId);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(initialListContext.offset);
    const [search, setSearch] = useState(initialListContext.q);
    const [searchDraft, setSearchDraft] = useState(initialListContext.q);
    const [stageKey, setStageKey] = useState(initialListContext.stageKey);
    const [sort, setSort] = useState(initialListContext.sort);
    const [direction, setDirection] = useState(initialListContext.direction);
    const [stageKeys, setStageKeys] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [projectSection, setProjectSection] = useState(readProjectSection);
    const [detail, setDetail] = useState();
    const [setupLoading, setSetupLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [directoryFailed, setDirectoryFailed] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState("");
    const [detailError, setDetailError] = useState("");
    const [pending, setPending] = useState(false);
    const [title, setTitle] = useState("");
    const [deliveryType, setDeliveryType] = useState("DESIGN");
    const [scopes, setScopes] = useState("");
    const [clientId, setClientId] = useState("");
    const [wonLeadId, setWonLeadId] = useState("");
    const [reason, setReason] = useState("");
    const [success, setSuccess] = useState("");
    const [actionStatus, setActionStatus] = useState("");
    const [leadEmployee, setLeadEmployee] = useState("");
    const [contributorEmployee, setContributorEmployee] = useState("");
    const [actionBranch, setActionBranch] = useState("");
    const [actionAccount, setActionAccount] = useState("");
    const [actionScope, setActionScope] = useState("");
    const [templateVersion, setTemplateVersion] = useState();
    const [templateReset, setTemplateReset] = useState(0);
    const [overrideMilestones, setOverrideMilestones] = useState(false);
    const [confirmCancellation, setConfirmCancellation] = useState(false);
    const listRequest = useRef(0);
    const initialProjectHandled = useRef(false);
    const detailRequest = useRef(0);
    const creationRequest = useRef(undefined);
    const creationPending = useRef(false);
    const [uncertainCreation, setUncertainCreation] = useState();
    const [confirmedCreationId, setConfirmedCreationId] = useState("");
    const recoveryButton = useRef(null);
    useEffect(() => { if (uncertainCreation)
        recoveryButton.current?.focus(); }, [uncertainCreation]);
    useEffect(() => {
        if (!uncertainCreation && !pending)
            return;
        const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [uncertainCreation, pending]);
    const activeProjectId = useRef("");
    const loadedProjectId = useRef("");
    const skipListEffect = useRef(false);
    const firstListRead = useRef(true);
    const loadedDirectoryContext = useRef("");
    const requestedDirectoryOffset = useRef(initialListContext.offset);
    const taskLeaveGuard = useRef(null);
    const projectHistory = useRef({ url: window.location.href, state: window.history.state });
    const sectionNavigation = useRef(null);
    useLayoutEffect(() => {
        sectionNavigation.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }, [projectSection, detail?.project.id]);
    const registerTaskGuard = useCallback((guard) => { taskLeaveGuard.current = guard; if (guard)
        projectHistory.current = { url: window.location.href, state: window.history.state }; }, []);
    const leaveTaskContext = () => taskLeaveGuard.current?.() ?? true;
    const taskSessionExpired = useCallback(() => window.dispatchEvent(new Event("sense-session-ended")), []);
    useLayoutEffect(() => { projectHistory.current = { url: window.location.href, state: window.history.state }; });
    const resetProjectDrafts = () => {
        setReason("");
        setActionStatus("");
        setLeadEmployee("");
        setContributorEmployee("");
        setActionBranch("");
        setActionAccount("");
        setActionScope("");
        setOverrideMilestones(false);
        setConfirmCancellation(false);
    };
    const applyTemplateVersion = useCallback((version) => {
        setTemplateVersion(version);
        if (version) {
            setDeliveryType(version.definition.deliveryType);
            setScopes(version.definition.scopes.join("\n"));
        }
    }, []);
    const clearProjectFilters = () => {
        if (!leaveTaskContext())
            return;
        setSearch("");
        setSearchDraft("");
        setStageKey("");
        setSort("created");
        setDirection("desc");
        setOffset(0);
        writeProjectListContext({ q: "", stageKey: "", sort: "created", direction: "desc", offset: 0, projectId: "" });
        setSelectedId("");
        setDetail(undefined);
        void loadList(branchId, false, 0, { q: "", stageKey: "", sort: "created", direction: "desc" });
    };
    const request = useCallback(async (url, init) => json(await fetch(url, { credentials: "include", cache: "no-store", ...init })), []);
    const loadSetup = useCallback(async () => {
        setSetupLoading(true);
        setError("");
        try {
            const result = await request(`${API}/setup`);
            setSetup(result);
            const requestedBranch = readProjectListContext().branchId;
            setBranchId((current) => result.branches.some((b) => b.id === (current || requestedBranch)) ? current || requestedBranch : "");
        }
        catch (cause) {
            setError(cause instanceof Error && cause.message === "denied" && owner ? "You need Owner access to manage projects." : "Project access could not be loaded. Check your connection and try again.");
        }
        finally {
            setSetupLoading(false);
        }
    }, [request]);
    const loadList = useCallback(async (currentBranch, preserveSelection = false, pageOffset = 0, context = { q: search, stageKey, sort, direction }) => {
        const requestId = ++listRequest.current;
        loadedDirectoryContext.current = directoryContextKey(currentBranch, context);
        requestedDirectoryOffset.current = pageOffset;
        setLoading(true);
        setDirectoryFailed(false);
        setError("");
        if (!preserveSelection) {
            ++detailRequest.current;
            activeProjectId.current = "";
            loadedProjectId.current = "";
            setSelectedId("");
            setDetail(undefined);
            setDetailLoading(false);
            setDetailError("");
        }
        try {
            const query = new URLSearchParams({ offset: String(pageOffset), limit: "50", sort: context.sort, direction: context.direction });
            if (currentBranch)
                query.set("branchId", currentBranch);
            if (context.q)
                query.set("q", context.q);
            if (context.stageKey)
                query.set("stageKey", context.stageKey);
            const result = await request(`${API}?${query}`);
            if (requestId === listRequest.current) {
                setItems(result.items);
                setTotal(result.total);
                setOffset(pageOffset);
                setStageKeys(result.stageKeys ?? []);
            }
        }
        catch (cause) {
            if (requestId === listRequest.current) {
                setDirectoryFailed(true);
                setItems([]);
                setTotal(0);
                setOffset(0);
                setError(cause instanceof Error && cause.message === "denied" ? "You do not have access to these projects." : "Projects could not be loaded. Try again.");
            }
        }
        finally {
            if (requestId === listRequest.current)
                setLoading(false);
        }
    }, [request, search, stageKey, sort, direction]);
    useEffect(() => { void loadSetup(); }, [loadSetup]);
    useEffect(() => {
        if (skipListEffect.current) {
            skipListEffect.current = false;
            return;
        }
        if (!setupLoading && setup) {
            const sameContext = loadedDirectoryContext.current === directoryContextKey(branchId, { q: search, stageKey, sort, direction });
            const first = firstListRead.current;
            firstListRead.current = false;
            const pageOffset = first ? initialListContext.offset : sameContext ? requestedDirectoryOffset.current : 0;
            void loadList(branchId, sameContext || first && !!initialProjectId, pageOffset);
        }
    }, [branchId, setupLoading, setup, loadList, search, stageKey, sort, direction, initialProjectId]);
    const selectProject = async (id) => {
        if (activeProjectId.current !== id) {
            resetProjectDrafts();
            activeProjectId.current = id;
        }
        loadedProjectId.current = "";
        const requestId = ++detailRequest.current;
        setSelectedId(id);
        setDetail(undefined);
        setOverrideMilestones(false);
        setDetailError("");
        setDetailLoading(true);
        try {
            const result = await request(`${API}/${encodeURIComponent(id)}`);
            if (!result?.project || result.project.id !== id)
                throw new Error("Unconfirmed project detail");
            if (requestId === detailRequest.current) {
                loadedProjectId.current = id;
                setDetail(result);
            }
        }
        catch (cause) {
            if (requestId === detailRequest.current)
                setDetailError(cause instanceof Error && cause.message === "denied" ? "You do not have access to this project." : "Project details could not be loaded. Try again.");
        }
        finally {
            if (requestId === detailRequest.current)
                setDetailLoading(false);
        }
    };
    useEffect(() => {
        const onPopState = () => {
            const context = readProjectListContext();
            const nextSection = readProjectSection();
            const leavesTasks = context.projectId !== activeProjectId.current || nextSection !== projectSection || context.branchId !== branchId || context.q !== search || context.stageKey !== stageKey || context.sort !== sort || context.direction !== direction || context.offset !== offset;
            if (leavesTasks && !leaveTaskContext()) {
                window.history.pushState(projectHistory.current.state, "", projectHistory.current.url);
                return;
            }
            skipListEffect.current = context.branchId !== branchId || context.q !== search || context.stageKey !== stageKey || context.sort !== sort || context.direction !== direction;
            setProjectSection(readProjectSection());
            setBranchId(context.branchId);
            setSearch(context.q);
            setSearchDraft(context.q);
            setStageKey(context.stageKey);
            setSort(context.sort);
            setDirection(context.direction);
            setOffset(context.offset);
            void loadList(context.branchId, true, context.offset, context);
            if (context.projectId) {
                if (activeProjectId.current !== context.projectId || loadedProjectId.current !== context.projectId)
                    void selectProject(context.projectId);
                else
                    setSelectedId(context.projectId);
            }
            else {
                ++detailRequest.current;
                activeProjectId.current = "";
                loadedProjectId.current = "";
                setSelectedId("");
                setDetail(undefined);
                setDetailError("");
                setDetailLoading(false);
            }
        };
        const onHashChange = () => { if (window.location.hash === "#project-plan") {
            if (!leaveTaskContext()) {
                window.history.replaceState(projectHistory.current.state, "", projectHistory.current.url);
                return;
            }
            setProjectSection("plan");
        } };
        window.addEventListener("popstate", onPopState);
        window.addEventListener("hashchange", onHashChange);
        return () => { window.removeEventListener("popstate", onPopState); window.removeEventListener("hashchange", onHashChange); };
    }, [branchId, direction, loadList, search, sort, stageKey, projectSection, offset]);
    useEffect(() => { if (!setupLoading && !initialProjectHandled.current && initialProjectId) {
        initialProjectHandled.current = true;
        void selectProject(initialProjectId);
    } }, [setupLoading, initialProjectId]);
    const changePage = (pageOffset) => {
        if (loading || pageOffset < 0 || pageOffset >= total)
            return;
        setSelectedId("");
        setDetail(undefined);
        setDetailError("");
        activeProjectId.current = "";
        loadedProjectId.current = "";
        ++detailRequest.current;
        void loadList(branchId, false, pageOffset);
    };
    const performCreation = async (body) => {
        if (pending || creationPending.current)
            return;
        creationPending.current = true;
        setPending(true);
        setError("");
        setSuccess("");
        setConfirmedCreationId("");
        try {
            const result = await request(API, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
            const id = result?.project?.id;
            if (typeof id !== "string" || !id)
                throw new Error("Unconfirmed project result");
            setConfirmedCreationId(id);
            setUncertainCreation(undefined);
            setTitle("");
            setScopes("");
            setClientId("");
            setWonLeadId("");
            setReason("");
            setTemplateVersion(undefined);
            setTemplateReset((value) => value + 1);
            creationRequest.current = undefined;
            setSuccess("Draft project created.");
            await loadList(branchId, true, offset);
            setProjectSection("overview");
            writeProjectListContext({ projectId: id });
            await selectProject(id);
        }
        catch (cause) {
            const status = cause instanceof Error && "status" in cause ? Number(cause.status) : undefined;
            if (status === undefined || status >= 500) {
                setUncertainCreation({ body, retryable: typeof body.idempotencyKey === "string" });
                setError("We could not confirm whether the project was created. The submitted details are preserved; do not submit another copy.");
            }
            else
                setError(status === 409 ? "This Won lead was already converted or the project details conflict. Review the values and try again." : status === 403 ? "You need Owner access to create or recover a project." : "The project could not be created. Check the details and try again.");
        }
        finally {
            creationPending.current = false;
            setPending(false);
        }
    };
    const createProject = async (event) => {
        event.preventDefault();
        if (pending || creationPending.current || uncertainCreation || !branchId)
            return;
        const scopeNames = scopes.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean);
        const payload = { branchId, title: title.trim(), deliveryType, scopes: scopeNames, ...(clientId.trim() ? { clientId: clientId.trim() } : {}), ...(wonLeadId.trim() ? { wonLeadId: wonLeadId.trim() } : {}), reason: reason.trim(), ...(templateVersion ? { templateVersionId: templateVersion.id } : {}) };
        const fingerprint = JSON.stringify(payload);
        if (!creationRequest.current || creationRequest.current.fingerprint !== fingerprint)
            creationRequest.current = { fingerprint, key: crypto.randomUUID() };
        await performCreation({ ...payload, ...(templateVersion ? { idempotencyKey: creationRequest.current.key } : {}) });
    };
    const discardUnconfirmedCreation = () => {
        if (pending || !window.confirm("The project may already exist. Discard this recovery request and check the directory before creating another project?"))
            return;
        setUncertainCreation(undefined);
        creationRequest.current = undefined;
        setError("");
    };
    const sendAction = async (path, payload) => {
        if (!detail || pending)
            return;
        setPending(true);
        setDetailError("");
        setSuccess("");
        try {
            await request(`${API}/${encodeURIComponent(detail.project.id)}${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ ...payload, ...(path === "/status" && overrideMilestones ? { overrideMilestones: true } : {}), expectedVersion: detail.project.version, reason: reason.trim() }) });
            setReason("");
            setOverrideMilestones(false);
            setConfirmCancellation(false);
            setSuccess(path === "/cancel" ? "Project cancelled. Unfinished delivery tasks stopped; completed work is retained." : "Action saved.");
            await selectProject(detail.project.id);
            await loadList(branchId, true);
        }
        catch (cause) {
            if (cause instanceof Error && cause.message === "conflict") {
                await selectProject(detail.project.id);
                setDetailError("This project changed. The latest details are loaded; review them before retrying.");
            }
            else
                setDetailError(cause instanceof Error && cause.message === "denied" ? "You do not have permission for that action." : "The action could not be saved. Try again.");
        }
        finally {
            setPending(false);
        }
    };
    const sendCancellationRequest = async () => {
        if (!detail || pending)
            return;
        setPending(true);
        setDetailError("");
        setSuccess("");
        try {
            await request(`${API}/${encodeURIComponent(detail.project.id)}/cancellation-requests`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ reason: reason.trim() }) });
            setReason("");
            setSuccess("Cancellation request submitted and pending Owner review.");
            await selectProject(detail.project.id);
        }
        catch (cause) {
            setDetailError(cause instanceof Error && cause.message === "denied" ? "You cannot request cancellation for this project." : "Cancellation request could not be saved. Try again.");
        }
        finally {
            setPending(false);
        }
    };
    const decideScope = async (approvalId, outcome) => {
        if (!detail || pending || reason.trim().length < 3)
            return;
        setPending(true);
        setDetailError("");
        setSuccess("");
        try {
            await request(`${API}/${encodeURIComponent(detail.project.id)}/scope-requests/${encodeURIComponent(approvalId)}/decision`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ outcome, reason: reason.trim() }) });
            setReason("");
            setSuccess(outcome === "APPROVED" ? "Scope change approved." : "Scope change rejected.");
            await selectProject(detail.project.id);
        }
        catch (cause) {
            if (cause instanceof Error && cause.message === "conflict") {
                await selectProject(detail.project.id);
                setDetailError("This approval changed. The latest project details are loaded.");
            }
            else
                setDetailError(cause instanceof Error && cause.message === "denied" ? "You are not the current scope approver." : "The scope decision could not be saved. Try again.");
        }
        finally {
            setPending(false);
        }
    };
    const withdrawScope = async (approvalId) => {
        if (!detail || !owner || pending || reason.trim().length < 3)
            return;
        setPending(true);
        setDetailError("");
        setSuccess("");
        try {
            await request(`${API}/${encodeURIComponent(detail.project.id)}/scope-requests/${encodeURIComponent(approvalId)}/withdraw`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ reason: reason.trim() }) });
            setReason("");
            setSuccess("Pending scope request withdrawn. The Owner can change the approver, then the requester may submit again.");
            await selectProject(detail.project.id);
        }
        catch (cause) {
            if (cause instanceof Error && cause.message === "conflict") {
                await selectProject(detail.project.id);
                setDetailError("This scope request changed. The latest project details are loaded.");
            }
            else
                setDetailError(cause instanceof Error && cause.message === "denied" ? "Only the Owner can withdraw a pending scope request." : "The scope request could not be withdrawn. Try again.");
        }
        finally {
            setPending(false);
        }
    };
    const removeContributor = async (employeeId) => {
        if (!detail || pending)
            return;
        setPending(true);
        setDetailError("");
        try {
            await request(`${API}/${encodeURIComponent(detail.project.id)}/assignments/${encodeURIComponent(employeeId)}`, { method: "DELETE", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ expectedVersion: detail.project.version, reason: reason.trim() }) });
            setSuccess("Contributor assignment removed.");
            await selectProject(detail.project.id);
        }
        catch (cause) {
            if (cause instanceof Error && cause.message === "conflict") {
                await selectProject(detail.project.id);
                setDetailError("This project changed. The latest details are loaded; review them before retrying.");
            }
            else
                setDetailError("Contributor assignment could not be removed.");
        }
        finally {
            setPending(false);
        }
    };
    const focusedProject = listFirst && !!selectedId;
    const backToProjects = () => {
        if (pending || !leaveTaskContext())
            return;
        ++detailRequest.current;
        activeProjectId.current = "";
        loadedProjectId.current = "";
        setSelectedId("");
        setDetail(undefined);
        setDetailError("");
        setDetailLoading(false);
        resetProjectDrafts();
        writeProjectListContext({ projectId: "" });
    };
    return _jsxs("section", { className: `project-workspace${listFirst ? " project-workspace-list-first" : ""}${focusedProject ? " is-project-open" : ""}`, "aria-labelledby": "projects-heading", children: [_jsxs("header", { className: "project-heading", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "DELIVERY" }), _jsx("h1", { id: "projects-heading", children: "Projects" }), _jsx("p", { children: owner ? "Your studio projects, from first scope to final delivery." : "Your project work, people and next milestones in one place." })] }), _jsxs("div", { className: "project-heading-actions", children: [_jsx("span", { className: "project-count", children: setupLoading || loading ? "Updating…" : directoryFailed || !setup ? "Count unavailable" : `${total} ${search || stageKey || branchId ? "matching" : "available"}` }), owner && !focusedProject && _jsxs("button", { type: "button", className: "project-primary-button project-new-button", onClick: () => { const heading = document.getElementById("create-project-heading"); if (createDisclosure.current)
                                    createDisclosure.current.open = true; heading?.scrollIntoView?.({ block: "start" }); heading?.focus(); }, children: [_jsx("svg", { "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M12 5v14M5 12h14" }) }), "New project"] })] })] }), error && _jsxs("div", { className: "project-alert", role: "alert", children: [_jsx("span", { children: error }), _jsx("button", { type: "button", onClick: () => branchId || setup ? void loadList(branchId) : void loadSetup(), children: "Try again" })] }), success && _jsx("p", { className: "project-success", role: "status", children: success }), confirmedCreationId && _jsxs("p", { className: "project-success", children: ["Created project: ", _jsx("button", { type: "button", disabled: pending, onClick: () => { if (!leaveTaskContext())
                            return; setProjectSection("overview"); writeProjectListContext({ projectId: confirmedCreationId }); void selectProject(confirmedCreationId); }, children: confirmedCreationId })] }), uncertainCreation && _jsxs("section", { className: "project-alert project-create-recovery", "aria-label": "Unconfirmed project creation", children: [_jsx("p", { children: uncertainCreation.retryable ? "Check the same template creation request to recover its result. Submitted details are locked." : "This creation has no retry receipt. Check the project directory and its filters. A matching title does not confirm this request." }), uncertainCreation.retryable && _jsx("button", { ref: recoveryButton, type: "button", disabled: pending, onClick: () => void performCreation(uncertainCreation.body), children: "Check creation result" }), _jsx("button", { ref: uncertainCreation.retryable ? undefined : recoveryButton, type: "button", disabled: pending || loading, onClick: () => void loadList(branchId, true, offset), children: "Check project directory" }), _jsx("button", { type: "button", disabled: pending, onClick: discardUnconfirmedCreation, children: "Discard recovery request" })] }), setupLoading ? _jsx("p", { className: "project-status", role: "status", children: "Loading project setup\u2026" }) : _jsxs(_Fragment, { children: [setup && !focusedProject && _jsxs("label", { className: "project-branch", children: ["Project directory", _jsxs("select", { "aria-label": "Project branch", disabled: pending, value: branchId, onChange: (event) => { if (!leaveTaskContext())
                                    return; const nextBranch = event.target.value; ++listRequest.current; ++detailRequest.current; setItems([]); setTotal(0); setOffset(0); setBranchId(nextBranch); setSelectedId(""); setDetail(undefined); setDetailError(""); writeProjectListContext({ branchId: nextBranch, offset: 0, projectId: "" }); }, children: [_jsx("option", { value: "", children: "All projects available to me" }), setup.branches.map((branch) => _jsx("option", { value: branch.id, children: branch.name }, branch.id))] })] }), setup && _jsxs("div", { className: "project-columns", children: [_jsxs("section", { className: "project-panel", "aria-label": focusedProject ? "Selected project" : "Project directory", children: [focusedProject && _jsx("button", { type: "button", className: "project-quiet-button", disabled: pending, onClick: backToProjects, children: "\u2190 Back to projects" }), _jsxs("div", { hidden: focusedProject, children: [_jsxs("div", { className: "project-panel-heading", children: [_jsxs("div", { children: [_jsx("h3", { id: "project-list-heading", children: "Project directory" }), _jsx("span", { className: "project-count", children: directoryFailed ? "Project count unavailable" : loading ? "Updating projects…" : `Showing ${total ? `${offset + 1}–${Math.min(offset + items.length, total)} of ${total}` : "0"}` })] }), _jsx("button", { className: "project-quiet-button", type: "button", onClick: () => { if (leaveTaskContext())
                                                            void loadList(branchId, false, offset); }, disabled: loading, children: "Refresh" })] }), _jsxs("form", { className: "project-list-filters", onSubmit: (event) => { event.preventDefault(); if (!leaveTaskContext())
                                                    return; const q = searchDraft.trim(); setSearch(q); setSearchDraft(q); setOffset(0); writeProjectListContext({ q, stageKey, sort, direction, offset: 0, projectId: "" }); setSelectedId(""); setDetail(undefined); }, children: [_jsxs("label", { children: ["Find a project", _jsx("input", { placeholder: "Title, delivery type or lead", "aria-label": "Search projects", maxLength: 160, value: searchDraft, onChange: (event) => setSearchDraft(event.target.value) })] }), _jsxs("label", { children: ["Applied plan stage", _jsxs("select", { "aria-label": "Applied stage key", value: stageKey, onChange: (event) => { if (!leaveTaskContext())
                                                                    return; setStageKey(event.target.value); setOffset(0); writeProjectListContext({ stageKey: event.target.value, offset: 0, projectId: "" }); setSelectedId(""); setDetail(undefined); }, children: [_jsx("option", { value: "", children: "All applied stages" }), stageKeys.map((key) => _jsx("option", { value: key, children: key }, key))] })] }), _jsxs("label", { children: ["Sort projects", _jsxs("select", { "aria-label": "Sort projects", value: sort, onChange: (event) => { if (!leaveTaskContext())
                                                                    return; const nextSort = event.target.value; setSort(nextSort); setOffset(0); writeProjectListContext({ sort: nextSort, offset: 0 }); }, children: [_jsx("option", { value: "created", children: "Created" }), _jsx("option", { value: "name", children: "Name" }), _jsx("option", { value: "milestone", children: "Next milestone" })] })] }), _jsxs("label", { children: ["Order", _jsxs("select", { "aria-label": "Sort direction", value: direction, onChange: (event) => { if (!leaveTaskContext())
                                                                    return; const nextDirection = event.target.value; setDirection(nextDirection); setOffset(0); writeProjectListContext({ direction: nextDirection, offset: 0 }); }, children: [_jsx("option", { value: "desc", children: "Descending" }), _jsx("option", { value: "asc", children: "Ascending" })] })] }), _jsx("button", { type: "submit", children: "Search" }), items.length > 0 && (search || stageKey || branchId || sort !== "created" || direction !== "desc") && _jsx("button", { type: "button", className: "project-clear-filters", onClick: clearProjectFilters, children: "Clear filters" })] }), loading ? _jsx("p", { className: "project-status", role: "status", children: "Loading projects\u2026" }) : items.length === 0 && !directoryFailed ? _jsxs("div", { className: "task-empty-state", role: "status", children: [_jsx("svg", { className: "task-empty-state__icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M4 6h16M7 12h10m-7 6h4" }) }), _jsx("p", { className: "task-empty-state__title", children: "No projects match these filters." }), _jsx("button", { type: "button", className: "task-empty-state__action", onClick: clearProjectFilters, children: "Clear filters" })] }) : null, _jsx("div", { hidden: loading || items.length === 0, children: _jsx(ProjectDirectory, { items: items, selectedId: selectedId, pending: pending, initialView: listFirst ? "cards" : "list", onSelect: (id) => { if (!leaveTaskContext())
                                                        return; if (activeProjectId.current !== id)
                                                        setProjectSection("overview"); writeProjectListContext({ projectId: id }); void selectProject(id); } }) }), _jsxs("nav", { className: "project-pagination", "aria-label": "Project list pages", children: [_jsx("button", { type: "button", onClick: () => { if (!leaveTaskContext())
                                                            return; const next = offset - 50; writeProjectListContext({ offset: next, projectId: "" }); changePage(next); }, disabled: loading || total === 0 || offset === 0, children: "Previous" }), _jsx("span", { children: directoryFailed ? "Pages unavailable" : loading ? "Updating…" : total ? `Page ${Math.floor(offset / 50) + 1} of ${Math.ceil(total / 50)}` : "No pages" }), _jsx("button", { type: "button", onClick: () => { if (!leaveTaskContext())
                                                            return; const next = offset + 50; writeProjectListContext({ offset: next, projectId: "" }); changePage(next); }, disabled: loading || offset + 50 >= total, children: "Next" })] })] }), detailLoading && _jsx("p", { className: "project-status", role: "status", children: "Loading project details\u2026" }), detailError && _jsx("p", { role: "alert", className: "project-inline-error", children: detailError }), detail && _jsxs("article", { className: "project-detail", children: [_jsxs("div", { className: "project-detail-heading", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "PROJECT DETAIL" }), _jsx("h3", { children: detail.project.title }), _jsxs("p", { className: "project-detail-meta", children: [detail.project.deliveryType === "DESIGN" ? "Design" : "Turnkey", " delivery \u00B7 ", detail.project.branch.name, " branch"] })] }), _jsx("span", { className: `project-status-pill ${projectStatusClass(detail.project.status)}`, children: detail.project.status })] }), _jsx("nav", { ref: sectionNavigation, className: "project-section-nav", "aria-label": `${detail.project.title} sections`, children: projectSections.map((section) => _jsx("button", { type: "button", disabled: pending, "aria-current": projectSection === section ? "page" : undefined, onClick: () => { if (section !== projectSection && !leaveTaskContext())
                                                        return; setProjectSection(section); writeProjectSection(section, detail.project.id); }, children: section === "overview" ? "Overview" : section === "plan" ? "Plan" : section === "tasks" ? "Tasks" : section === "people" ? "People" : section === "documents" ? "Documents" : section === "reviews" ? "Reviews" : section === "delivery" ? "Delivery" : "Activity" }, section)) }), _jsxs("div", { className: "project-section-intro", children: [_jsx("h4", { className: "project-active-section", children: projectSection === "overview" ? "Overview" : projectSection === "plan" ? "Plan" : projectSection === "tasks" ? "Tasks" : projectSection === "people" ? "People" : projectSection === "documents" ? "Documents" : projectSection === "reviews" ? "Reviews" : projectSection === "delivery" ? "Delivery" : "Activity" }), _jsx("p", { children: sectionDescriptions[projectSection] })] }), _jsxs("section", { className: "project-section-panel project-overview-facts", hidden: projectSection !== "overview", children: [_jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Branch" }), _jsx("dd", { children: detail.project.branch.name })] }), _jsxs("div", { children: [_jsx("dt", { children: "Delivery type" }), _jsx("dd", { children: detail.project.deliveryType === "DESIGN" ? "Design" : "Turnkey" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Client" }), _jsx("dd", { children: detail.project.client?.name ?? "Not linked" })] })] }), _jsx("h4", { children: "Baseline scopes" }), _jsx("ul", { className: "project-scope-list", children: detail.project.scopes.map((scope) => _jsx("li", { children: scope.name }, scope.id)) }), detail.wonLeadProvenance && _jsxs("p", { className: "project-provenance", children: ["Converted from Won lead \u00B7 recorded ", new Date(detail.wonLeadProvenance.occurredAt).toLocaleString()] })] }), ["overview", "people", "activity"].includes(projectSection) && _jsxs("label", { className: "project-shared-reason", children: ["Reason for project action", _jsx("input", { "aria-label": "Project action reason", value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000 }), _jsx("small", { children: "Required (at least 3 characters) before any action below is saved. It is recorded in the project history." })] }), _jsxs("section", { className: "project-section-panel", hidden: projectSection !== "activity", children: [_jsx("h4", { children: "History and requests" }), _jsxs("ul", { className: "project-history project-timeline", children: [(detail.project.statusChanges ?? []).map((row) => _jsxs("li", { children: [row.fromStatus ?? "Created", " \u2192 ", row.toStatus, " \u00B7 ", row.reason] }, row.id)), (detail.transfers ?? []).map((row, index) => _jsxs("li", { children: ["Branch transfer \u00B7 ", row.reason, ". Contributors whose home branch differs from the new owning branch need an explicit Owner regrant."] }, `transfer-${index}`)), (detail.leadChanges ?? []).map((row, index) => _jsxs("li", { children: ["Lead change \u00B7 ", row.reason] }, `lead-${index}`)), (detail.scopeChanges ?? []).map((row, index) => _jsxs("li", { children: ["Scope change: ", row.name, " \u00B7 ", row.status, " \u00B7 ", row.reason, row.approvalId && (row.approval?.state === "PENDING" || row.status === "PENDING") && _jsxs("span", { className: "project-scope-decision", children: [detail.capabilities?.decideScope && _jsxs(_Fragment, { children: [_jsx("button", { type: "button", disabled: pending || reason.trim().length < 3, onClick: () => void decideScope(row.approvalId, "APPROVED"), children: "Approve" }), _jsx("button", { type: "button", disabled: pending || reason.trim().length < 3, onClick: () => void decideScope(row.approvalId, "REJECTED"), children: "Reject" })] }), owner && _jsx("button", { type: "button", disabled: pending || reason.trim().length < 3, onClick: () => void withdrawScope(row.approvalId), children: "Withdraw" })] })] }, `scope-${index}`)), (detail.cancellationRequests ?? []).map((row, index) => _jsxs("li", { children: ["Cancellation request \u00B7 ", row.status, " \u00B7 ", row.reason] }, `cancel-${index}`))] }), detail.scopeChanges?.some((row) => detail.capabilities?.decideScope && row.approvalId && (row.approval?.state === "PENDING" || row.status === "PENDING")) && _jsx("p", { className: "project-decision-help", children: "Enter a decision reason above before approving or rejecting a pending scope change. The requester cannot approve their own request." }), owner && detail.scopeChanges?.some((row) => row.approvalId && (row.approval?.state === "PENDING" || row.status === "PENDING")) && _jsx("p", { className: "project-decision-help", children: "If the named approver is unavailable, withdraw the request with a reason, change the approver above, then the requester may submit again." })] }), _jsxs("section", { className: "project-section-panel", hidden: projectSection !== "people", children: [_jsx("h4", { children: "Project Lead" }), _jsx("p", { children: detail.currentLeadName ?? detail.project.currentLeadName ?? setup?.employees?.find((employee) => employee.id === (detail.currentLeadEmployeeId ?? detail.project.currentLeadEmployeeId))?.name ?? "No Project Lead assigned" }), _jsx("h4", { children: "Assigned contributors" }), (detail.assignments ?? []).length ? _jsx("ul", { className: "project-history", children: detail.assignments?.map((row) => _jsxs("li", { children: [row.employee?.name ?? row.name ?? row.employeeId, owner && !["CANCELLED", "ARCHIVED"].includes(detail.project.status) && _jsx("button", { type: "button", disabled: pending || reason.trim().length < 3, onClick: () => void removeContributor(row.employeeId), children: "Remove" })] }, row.employeeId)) }) : _jsx("p", { children: "No additional contributors" }), _jsxs("div", { className: "project-actions", children: ["              ", owner && !["CANCELLED", "ARCHIVED"].includes(detail.project.status) && _jsxs("div", { className: "project-action-row", children: [_jsxs("select", { "aria-label": "Project lead", value: leadEmployee, onChange: (event) => setLeadEmployee(event.target.value), children: [_jsx("option", { value: "", children: "Choose active employee" }), setup?.employees?.map((employee) => _jsx("option", { value: employee.id, children: employee.name }, employee.id))] }), _jsx("button", { disabled: pending || !leadEmployee || reason.trim().length < 3, onClick: () => void sendAction("/lead", { employeeId: leadEmployee }), children: "Set lead" })] }), "              ", owner && !["CANCELLED", "ARCHIVED"].includes(detail.project.status) && _jsxs("div", { className: "project-action-row", children: [_jsxs("select", { "aria-label": "Contributor", value: contributorEmployee, onChange: (event) => setContributorEmployee(event.target.value), children: [_jsx("option", { value: "", children: "Choose employee" }), setup?.employees?.map((employee) => _jsx("option", { value: employee.id, children: employee.name }, employee.id))] }), _jsx("button", { disabled: pending || !contributorEmployee || reason.trim().length < 3, onClick: () => void sendAction("/assignments", { employeeId: contributorEmployee }), children: "Assign contributor" })] })] })] }), _jsxs("section", { className: "project-section-panel", hidden: projectSection !== "plan", children: [_jsx("h4", { className: "task-sr-only", children: "Plan" }), _jsx("div", { id: "project-plan", children: _jsx(ProjectPlan, { projectId: detail.project.id, projectVersion: detail.project.version, csrfToken: csrfToken, onSaved: () => void selectProject(detail.project.id) }) })] }), _jsx("section", { className: "project-section-panel project-task-panel", hidden: projectSection !== "tasks", children: projectSection === "tasks" && _jsx(TaskWorkspace, { csrfToken: csrfToken, owner: owner, listFirst: true, projectContext: { id: detail.project.id, title: detail.project.title, status: detail.project.status }, onLeaveGuard: registerTaskGuard, onSessionExpired: taskSessionExpired }, detail.project.id) }), _jsxs("section", { className: "project-section-panel", hidden: projectSection !== "documents", children: [_jsx("p", { children: "Files available to you in this project. Open Documents for folders, uploads and file access; revision records have their own workspace." }), projectSection === "documents" && _jsxs(_Fragment, { children: [_jsx(ConfirmedDrawings, { projectId: detail.project.id, onSessionExpired: taskSessionExpired }, `confirmed:${detail.project.id}`), _jsx(ProjectResourceSummary, { projectId: detail.project.id, kind: "documents", onSessionExpired: taskSessionExpired }, `documents:${detail.project.id}`)] }), _jsxs("div", { className: "project-section-links", children: [_jsx("a", { href: `/documents?projectId=${encodeURIComponent(detail.project.id)}`, children: "Open documents" }), _jsx("a", { href: `/revisions?projectId=${encodeURIComponent(detail.project.id)}`, children: "Open design / revisions" })] })] }), _jsxs("section", { className: "project-section-panel", hidden: projectSection !== "reviews", children: [_jsx("p", { children: "Waiting internal rounds you can currently access, ordered by due date. Client review uses its separate workspace." }), projectSection === "reviews" && _jsx(ProjectResourceSummary, { projectId: detail.project.id, kind: "reviews", onSessionExpired: taskSessionExpired }, `reviews:${detail.project.id}`), _jsxs("div", { className: "project-section-links", children: [_jsx("a", { href: `/reviews?projectId=${encodeURIComponent(detail.project.id)}`, children: "Open internal reviews" }), _jsx("a", { href: `/client-reviews?projectId=${encodeURIComponent(detail.project.id)}`, children: "Open client reviews" })] })] }), _jsx("section", { className: "project-section-panel", hidden: projectSection !== "delivery", children: detail.project.deliveryType === "TURNKEY" ? _jsxs("div", { className: "project-section-links", children: [_jsx("a", { href: `/turnkey?projectId=${encodeURIComponent(detail.project.id)}`, children: "Open Turnkey operations" }), detail.project.status === "ACTIVE" ? _jsx("a", { href: `/site?projectId=${encodeURIComponent(detail.project.id)}`, children: "Open Site delivery" }) : _jsx("p", { children: "Site delivery currently lists active projects only." })] }) : _jsxs("div", { children: [_jsxs("p", { children: ["Design delivery follows this project\u2019s Plan, revisions and review workflows. Current project state: ", detail.project.status.replaceAll("_", " ").toLowerCase(), "."] }), _jsxs("div", { className: "project-section-links", children: [_jsx("a", { href: `/projects?projectId=${encodeURIComponent(detail.project.id)}&projectSection=plan#project-plan`, children: "Open delivery plan" }), _jsx("a", { href: `/revisions?projectId=${encodeURIComponent(detail.project.id)}`, children: "Open design / revisions" }), _jsx("a", { href: `/reviews?projectId=${encodeURIComponent(detail.project.id)}`, children: "Open internal reviews" }), _jsx("a", { href: `/client-reviews?projectId=${encodeURIComponent(detail.project.id)}`, children: "Open client reviews" })] })] }) }), _jsx("section", { className: "project-section-panel", hidden: projectSection !== "overview", children: _jsx("div", { className: "project-actions", children: ["CANCELLED", "ARCHIVED"].includes(detail.project.status) ? _jsx("p", { children: "This project is closed. Its delivery history is retained. Approved closeout work is managed in Tasks." }) : _jsxs(_Fragment, { children: [((detail.capabilities?.changeStatus ?? owner) || detail.capabilities?.manageLifecycle) && _jsxs("div", { className: "project-action-row", children: [_jsxs("select", { "aria-label": "New project status", value: actionStatus, onChange: (event) => { setActionStatus(event.target.value); setOverrideMilestones(false); }, children: [_jsx("option", { value: "", children: "Choose status" }), ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"].map((status) => _jsx("option", { children: status }, status))] }), _jsx("button", { disabled: pending || !actionStatus || reason.trim().length < 3 || (actionStatus === "COMPLETED" && !owner && !detail.capabilities?.override), onClick: () => void sendAction("/status", { toStatus: actionStatus }), children: "Change status" }), _jsx("small", { children: "Project gates apply before completion." }), actionStatus === "COMPLETED" && detail.capabilities?.override && _jsxs("label", { className: "project-override-option", children: [_jsx("input", { type: "checkbox", checked: overrideMilestones, onChange: (event) => setOverrideMilestones(event.target.checked) }), "Override incomplete required milestones with this reason"] })] }), owner && ["DRAFT", "ACTIVE", "ON_HOLD"].includes(detail.project.status) && _jsxs("div", { className: "project-action-row", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: confirmCancellation, onChange: (event) => setConfirmCancellation(event.target.checked) }), "Stop unfinished delivery work and retain completed work and history"] }), _jsx("button", { disabled: pending || !confirmCancellation || reason.trim().length < 3, onClick: () => void sendAction("/cancel", {}), children: "Cancel project" })] }), owner && _jsxs(_Fragment, { children: [_jsxs("div", { className: "project-action-row", children: [_jsxs("select", { "aria-label": "Transfer owning branch", value: actionBranch, onChange: (event) => setActionBranch(event.target.value), children: [_jsx("option", { value: "", children: "Choose branch" }), setup?.branches.filter((branch) => branch.id !== branchId).map((branch) => _jsx("option", { value: branch.id, children: branch.name }, branch.id))] }), _jsx("button", { disabled: pending || !actionBranch || reason.trim().length < 3, onClick: () => void sendAction("/transfer", { toBranchId: actionBranch }), children: "Transfer branch" })] }), _jsxs("div", { className: "project-action-row", children: [_jsxs("select", { "aria-label": "Scope approver", value: actionAccount, onChange: (event) => setActionAccount(event.target.value), children: [_jsx("option", { value: "", children: "Choose scope approver" }), setup?.ownerAccountId && _jsx("option", { value: setup.ownerAccountId, children: "Owner" }), setup?.employees?.map((employee) => _jsx("option", { value: employee.accountId, children: employee.name }, employee.accountId))] }), _jsx("button", { disabled: pending || !actionAccount || reason.trim().length < 3, onClick: () => void sendAction("/scope-approver", { accountId: actionAccount }), children: "Set scope approver" })] })] }), ((detail.capabilities?.requestScopeChange ?? owner) || detail.capabilities?.requestScope) && _jsxs("div", { className: "project-action-row", children: [_jsx("input", { "aria-label": "Proposed scope", placeholder: "Proposed service scope", value: actionScope, onChange: (event) => setActionScope(event.target.value) }), _jsx("button", { disabled: pending || !actionScope.trim() || reason.trim().length < 3, onClick: () => void sendAction("/scope-requests", { name: actionScope.trim() }), children: "Request scope change" })] }), !owner && detail.capabilities?.requestCancellation && _jsx("button", { disabled: pending || reason.trim().length < 3, onClick: () => void sendCancellationRequest(), children: "Request cancellation" })] }) }) })] })] }), owner && !focusedProject && _jsxs("details", { ref: createDisclosure, open: !listFirst || undefined, className: "project-panel project-create-panel", "aria-label": "Create project panel", children: [_jsxs("summary", { className: "project-create-summary", children: ["Create a Draft project", _jsx("span", { children: "Set up a new project" })] }), _jsxs("section", { "aria-labelledby": "create-project-heading", children: [_jsxs("div", { className: "project-panel-heading", children: [_jsx("h3", { id: "create-project-heading", tabIndex: -1, children: "Create Draft project" }), _jsx("span", { className: "project-status-pill", children: "Draft" })] }), _jsxs("details", { className: "project-template-disclosure", children: [_jsx("summary", { children: "Project template (optional)" }), _jsxs("fieldset", { className: "project-create-fields", disabled: pending || !!uncertainCreation, children: [_jsx("legend", { className: "task-sr-only", children: "Project template" }), _jsx(ProjectTemplatePanel, { owner: owner, csrfToken: csrfToken, onTemplateChange: applyTemplateVersion, resetKey: templateReset })] })] }), _jsx("form", { className: "project-form", "aria-label": "Create project", onSubmit: (event) => void createProject(event), children: _jsxs("fieldset", { className: "project-create-fields", disabled: pending || !!uncertainCreation, children: [_jsx("legend", { className: "task-sr-only", children: "Project details" }), _jsxs("label", { children: ["Project title", _jsx("input", { value: title, onChange: (event) => setTitle(event.target.value), minLength: 2, maxLength: 160, required: true })] }), _jsxs("label", { children: ["Delivery type", _jsxs("select", { value: deliveryType, disabled: !!templateVersion, onChange: (event) => setDeliveryType(event.target.value), children: [_jsx("option", { value: "DESIGN", children: "Design" }), _jsx("option", { value: "TURNKEY", children: "Turnkey" })] })] }), _jsxs("label", { children: ["Initial service scopes", _jsx("textarea", { "aria-label": "Initial service scopes", value: scopes, readOnly: !!templateVersion, onChange: (event) => setScopes(event.target.value), placeholder: "Architecture\nInterior design", required: true, rows: 3 }), _jsx("small", { children: templateVersion ? "Scopes come from the selected template version. Choose current project setup to enter different scopes." : "Enter 1–12 scopes, one per line or separated by commas." })] }), _jsx(ProjectRelationships, { branchId: branchId, clientId: clientId, wonLeadId: wonLeadId, onClient: setClientId, onLead: setWonLeadId, disabled: pending || !!uncertainCreation }), _jsxs("label", { children: ["Creation reason", _jsx("input", { value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { className: "project-primary-button", type: "submit", disabled: pending || !branchId, children: pending ? "Creating Draft…" : "Create Draft project" })] }) })] })] })] }), !owner && !focusedProject && _jsxs("details", { className: "project-template-disclosure", children: [_jsx("summary", { children: "Project template reference" }), _jsx(ProjectTemplatePanel, { owner: false, csrfToken: csrfToken, onTemplateChange: applyTemplateVersion, resetKey: templateReset })] })] })] });
}
