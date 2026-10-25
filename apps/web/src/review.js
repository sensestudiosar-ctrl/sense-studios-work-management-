import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import "./review.css";
import { ReviewEvidence } from "./review-evidence.js";
const API = "/api/v1/reviews";
const DOCUMENTS_API = "/api/v1/documents";
const INBOX_PAGE_SIZE = 50;
function reviewRoute() {
    const query = new URLSearchParams(window.location.search);
    const parsedOffset = Number(query.get("offset") ?? 0);
    const queue = query.get("queue");
    const scope = query.get("scope");
    const sort = query.get("sort");
    const normalizedQueue = queue === "waiting" || queue === "corrections" || queue === "resubmitted" || queue === "history" ? queue : query.get("historical") === "true" ? "history" : "waiting";
    return { taskId: query.get("taskId") ?? "", roundId: query.get("roundId") ?? "", projectId: query.get("projectId") ?? "", view: normalizedQueue === "history" ? "history" : "active", offset: Number.isSafeInteger(parsedOffset) && parsedOffset > 0 ? Math.min(parsedOffset, 100000) : 0, scope: scope === "mine" ? "mine" : "accessible", queue: normalizedQueue, q: query.get("q") ?? "", sort: sort === "due" ? "due" : "project" };
}
function writeReviewRoute(changes, mode = "push") {
    const query = new URLSearchParams(window.location.search);
    for (const key of ["taskId", "roundId", "projectId", "historical", "offset", "scope", "queue", "q", "sort"])
        query.delete(key);
    const route = { ...reviewRoute(), ...changes };
    if (route.taskId)
        query.set("taskId", route.taskId);
    if (route.roundId)
        query.set("roundId", route.roundId);
    if (route.projectId)
        query.set("projectId", route.projectId);
    if (route.view === "history")
        query.set("historical", "true");
    if (route.offset > 0)
        query.set("offset", String(route.offset));
    query.set("scope", route.scope);
    query.set("queue", route.queue);
    if (route.q)
        query.set("q", route.q);
    if (route.sort !== "project")
        query.set("sort", route.sort);
    const url = `${window.location.pathname}${query.toString() ? `?${query}` : ""}${window.location.hash}`;
    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", url);
}
function statusOf(error) { return error instanceof Error ? error.status ?? 0 : 0; }
async function json(response) { if (!response.ok)
    throw Object.assign(new Error("request-failed"), { status: response.status }); return response.json(); }
export function ReviewWorkspace({ csrfToken }) {
    const initialRoute = reviewRoute();
    const [inbox, setInbox] = useState([]);
    const [inboxTotal, setInboxTotal] = useState();
    const [inboxOffset, setInboxOffset] = useState(initialRoute.offset);
    const [taskId, setTaskId] = useState("");
    const [review, setReview] = useState();
    const [roundUnavailable, setRoundUnavailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [denied, setDenied] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [reason, setReason] = useState("");
    const [reviewerId, setReviewerId] = useState("");
    const [revisionId, setRevisionId] = useState("");
    const [evidenceKind, setEvidenceKind] = useState("DRAWING");
    const [workFileId, setWorkFileId] = useState("");
    const [reviewUrl, setReviewUrl] = useState("");
    const [commentDraft, setCommentDraft] = useState("");
    const [decisionDraft, setDecisionDraft] = useState("");
    const [inboxView, setInboxView] = useState(initialRoute.view);
    const [inboxScope, setInboxScope] = useState(initialRoute.scope);
    const [inboxQueue, setInboxQueue] = useState(initialRoute.queue);
    const [inboxQuery, setInboxQuery] = useState(initialRoute.q);
    const [inboxSort, setInboxSort] = useState(initialRoute.sort);
    const [commentPage, setCommentPage] = useState("1");
    const [commentX, setCommentX] = useState("0");
    const [commentY, setCommentY] = useState("0");
    const [commentAnnotation, setCommentAnnotation] = useState("");
    const [commentMarkupFileId, setCommentMarkupFileId] = useState("");
    const [decisionPage, setDecisionPage] = useState("1");
    const [decisionX, setDecisionX] = useState("0");
    const [decisionY, setDecisionY] = useState("0");
    const [decisionAnnotation, setDecisionAnnotation] = useState("");
    const [decisionMarkupFileId, setDecisionMarkupFileId] = useState("");
    const [decisionKind, setDecisionKind] = useState("APPROVED");
    const [severity, setSeverity] = useState("Minor");
    const [categoryId, setCategoryId] = useState("");
    const [correctionOwner, setCorrectionOwner] = useState("");
    const [categoryName, setCategoryName] = useState("");
    const [priorityDraft, setPriorityDraft] = useState("MEDIUM");
    const [deadlineDraft, setDeadlineDraft] = useState("");
    const [evidenceRoundId, setEvidenceRoundId] = useState("");
    const [selectedRoundId, setSelectedRoundId] = useState(initialRoute.roundId);
    const [evidenceStates, setEvidenceStates] = useState({});
    const [selectedPoint, setSelectedPoint] = useState();
    const [evidenceEpoch, setEvidenceEpoch] = useState(0);
    const evidenceContext = useRef("");
    const evidenceEpochRef = useRef(0);
    const draftContext = useRef("");
    const loadGeneration = useRef(0);
    const [managedCategories, setManagedCategories] = useState([]);
    const [categoriesError, setCategoriesError] = useState("");
    useEffect(() => { setRevisionId(""); setWorkFileId(""); setReviewUrl(""); }, [review?.task.id]);
    const clearEvidence = useCallback(() => {
        evidenceContext.current = "";
        setEvidenceRoundId("");
        setEvidenceStates({});
        setSelectedPoint(undefined);
        setEvidenceEpoch(++evidenceEpochRef.current);
        setCommentAnnotation("");
        setDecisionAnnotation("");
        setCommentMarkupFileId("");
        setDecisionMarkupFileId("");
        setCommentPage("1");
        setCommentX("0");
        setCommentY("0");
        setDecisionPage("1");
        setDecisionX("0");
        setDecisionY("0");
    }, []);
    const clearProtected = useCallback(() => {
        ++loadGeneration.current;
        clearEvidence();
        setReview(undefined);
        setInbox([]);
        setManagedCategories([]);
        setSelectedRoundId("");
        draftContext.current = "";
        setCommentDraft("");
        setDecisionDraft("");
        setReason("");
        setDenied(true);
        setRoundUnavailable(false);
        setInboxTotal(undefined);
        setLoading(false);
    }, [clearEvidence]);
    const load = useCallback(async (id = taskId, view = inboxView, roundId = selectedRoundId, offset = inboxOffset) => {
        const generation = ++loadGeneration.current;
        if (commentAnnotation || decisionAnnotation || commentMarkupFileId || decisionMarkupFileId)
            setNotice("Location annotations and markup selections were cleared for this refreshed context. General feedback remains attached to its current round.");
        setLoading(true);
        setError("");
        setDenied(false);
        setReview(undefined);
        clearEvidence();
        try {
            const route = reviewRoute();
            const query = new URLSearchParams();
            if (route.projectId)
                query.set("projectId", route.projectId);
            if (view === "history")
                query.set("historical", "true");
            query.set("offset", String(offset));
            query.set("limit", String(INBOX_PAGE_SIZE));
            query.set("scope", route.scope);
            query.set("queue", route.queue);
            if (route.q)
                query.set("q", route.q);
            query.set("sort", route.sort);
            const page = await json(await fetch(`${API}/inbox?${query}`, { credentials: "include", cache: "no-store" }));
            if (generation !== loadGeneration.current)
                return false;
            setInbox(page.items);
            setInboxTotal(page.total);
            setInboxOffset(offset);
            if (id) {
                const detail = await json(await fetch(`${API}/tasks/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }));
                if (generation !== loadGeneration.current)
                    return false;
                const context = `${detail.task.id}:${detail.rounds.at(-1)?.id ?? ""}`;
                if (draftContext.current !== context) {
                    setCommentDraft("");
                    setDecisionDraft("");
                    setReason("");
                }
                draftContext.current = context;
                const exactRoundId = detail.rounds.some((item) => item.id === roundId) ? roundId : "";
                const unavailable = !!roundId && !exactRoundId;
                setRoundUnavailable(unavailable);
                setReview(unavailable ? undefined : detail);
                setTaskId(id);
                setSelectedRoundId(exactRoundId);
                setPriorityDraft(detail.task.priority);
                setDeadlineDraft(detail.task.committedDueDate?.slice(0, 10) ?? "");
            }
            else {
                setReview(undefined);
                setTaskId("");
                setSelectedRoundId("");
                setRoundUnavailable(false);
            }
            return true;
        }
        catch (cause) {
            if (generation !== loadGeneration.current)
                return false;
            setReview(undefined);
            setInbox([]);
            setInboxTotal(undefined);
            if ([401, 403, 404].includes(statusOf(cause)))
                clearProtected();
            else
                setError("Internal reviews could not be loaded. Try again.");
            return false;
        }
        finally {
            if (generation === loadGeneration.current)
                setLoading(false);
        }
    }, [taskId, inboxView, selectedRoundId, inboxOffset, clearEvidence, clearProtected, commentAnnotation, decisionAnnotation, commentMarkupFileId, decisionMarkupFileId]);
    useEffect(() => { const route = reviewRoute(); setTaskId(route.taskId); setSelectedRoundId(route.roundId); void load(route.taskId, route.view, route.roundId, route.offset); return () => { ++loadGeneration.current; }; }, []);
    useEffect(() => {
        const onPopState = () => { const route = reviewRoute(); setInboxView(route.view); setInboxOffset(route.offset); setTaskId(route.taskId); setSelectedRoundId(route.roundId); setInboxScope(route.scope); setInboxQueue(route.queue); setInboxQuery(route.q); setInboxSort(route.sort); void load(route.taskId, route.view, route.roundId, route.offset); };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [load]);
    useEffect(() => {
        if (!review?.capabilities.manageCategories) {
            setManagedCategories([]);
            setCategoriesError("");
            return;
        }
        let active = true;
        const generation = loadGeneration.current;
        void fetch(`${API}/categories`, { credentials: "include", cache: "no-store" }).then((response) => json(response)).then((value) => { if (active && generation === loadGeneration.current)
            setManagedCategories(value.categories); }).catch((cause) => { if (!active || generation !== loadGeneration.current)
            return; if ([401, 403, 404].includes(statusOf(cause)))
            clearProtected();
        else
            setCategoriesError("Correction categories could not be loaded."); });
        return () => { active = false; };
    }, [review?.task.id, review?.capabilities.manageCategories, clearProtected]);
    const post = async (path, body, success) => {
        if (busy)
            return false;
        setBusy(true);
        setError("");
        setNotice("");
        const generation = loadGeneration.current;
        const activeTaskId = review?.task.id ?? taskId;
        try {
            await json(await fetch(`${API}${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) }));
            if (generation !== loadGeneration.current)
                return false;
            if (path.endsWith("/comment"))
                setCommentDraft((value) => value === body.comment ? "" : value);
            if (path.endsWith("/decision"))
                setDecisionDraft((value) => value === body.comment ? "" : value);
            setReason("");
            if (await load(activeTaskId)) {
                setNotice(success);
                return true;
            }
            return false;
        }
        catch (cause) {
            if (generation !== loadGeneration.current)
                return false;
            if ([401, 403, 404].includes(statusOf(cause)))
                clearProtected();
            else if (statusOf(cause) === 409) {
                if (await load(activeTaskId))
                    setError("The review changed elsewhere. Latest details were refreshed.");
            }
            else
                setError("The review action could not be completed. Try again.");
            return false;
        }
        finally {
            setBusy(false);
        }
    };
    const commentAnnotations = commentAnnotation.trim() ? [{ page: Number(commentPage), x: Number(commentX), y: Number(commentY), text: commentAnnotation.trim() }] : [];
    const decisionAnnotations = decisionAnnotation.trim() ? [{ page: Number(decisionPage), x: Number(decisionX), y: Number(decisionY), text: decisionAnnotation.trim() }] : [];
    const latestRound = review?.rounds.at(-1);
    const evidenceReady = (item) => !item.revisionFileId || evidenceRoundId === item.id && evidenceStates[item.id] === "ready";
    const annotationReady = (item, annotations) => !annotations.length || !item.revisionFileId || evidenceReady(item) && !!selectedPoint && annotations.every((annotation) => annotation.page === selectedPoint.page && annotation.x === selectedPoint.x && annotation.y === selectedPoint.y);
    const reasonInput = (label = "Reason") => _jsxs("label", { children: [label, _jsx("textarea", { required: true, minLength: 3, maxLength: 1000, value: reason, onChange: (event) => setReason(event.target.value) })] });
    return _jsxs("section", { className: "review-workspace", "aria-labelledby": "review-title", children: [_jsxs("header", { className: "review-header", children: [_jsxs("div", { children: [_jsx("p", { className: "review-eyebrow", children: "S13 \u00B7 DESIGN CONTROL" }), _jsx("h2", { id: "review-title", children: "Internal work review" }), _jsx("p", { children: "Review the file, link or drawing revision submitted for the task." })] }), _jsxs("label", { children: ["Review scope", _jsxs("select", { "aria-label": "Review scope", value: inboxScope, onChange: (event) => { const scope = event.target.value; setInboxScope(scope); setInboxOffset(0); writeReviewRoute({ scope, offset: 0 }); void load(taskId, inboxView, selectedRoundId, 0); }, children: [_jsx("option", { value: "accessible", children: "All accessible reviews" }), _jsx("option", { value: "mine", children: "My review assignments" })] })] }), _jsx("button", { type: "button", onClick: () => void load(taskId), disabled: loading || busy, children: "Refresh" })] }), loading && _jsx("p", { role: "status", className: "review-muted", children: "Loading review inbox\u2026" }), error && _jsxs("p", { role: "alert", className: "review-error", children: [error, " ", _jsx("button", { type: "button", onClick: () => void load(taskId), children: "Try again" })] }), denied && _jsx("p", { role: "alert", className: "review-denied", children: "You do not have access to this review or task." }), notice && _jsx("p", { role: "status", className: "review-notice", children: notice }), !loading && !denied && _jsxs("div", { className: review ? "review-layout review-has-selection" : "review-layout", children: [_jsxs("aside", { className: "review-panel", children: [_jsx("h3", { children: "Review inbox" }), _jsxs("div", { className: "review-inbox-filters", children: [_jsxs("label", { children: ["Queue", _jsxs("select", { "aria-label": "Review queue", value: inboxQueue, onChange: (event) => { const queue = event.target.value; const view = queue === "history" ? "history" : "active"; setInboxQueue(queue); setInboxView(view); setInboxOffset(0); writeReviewRoute({ queue, view, offset: 0 }); void load(taskId, view, selectedRoundId, 0); }, children: [_jsx("option", { value: "waiting", children: "Waiting" }), _jsx("option", { value: "corrections", children: "Corrections required" }), _jsx("option", { value: "resubmitted", children: "Resubmitted" }), _jsx("option", { value: "history", children: "History" })] })] }), _jsxs("label", { children: ["Sort by", _jsxs("select", { "aria-label": "Review sort", value: inboxSort, onChange: (event) => { const sort = event.target.value; setInboxSort(sort); setInboxOffset(0); writeReviewRoute({ sort, offset: 0 }); void load(taskId, inboxView, selectedRoundId, 0); }, children: [_jsx("option", { value: "project", children: "Project name" }), _jsx("option", { value: "due", children: "Due date" })] })] }), _jsxs("form", { className: "review-inbox-search", onSubmit: (event) => { event.preventDefault(); const q = inboxQuery.trim(); setInboxQuery(q); setInboxOffset(0); writeReviewRoute({ q, offset: 0 }); void load(taskId, inboxView, selectedRoundId, 0); }, children: [_jsxs("label", { children: ["Search authorized reviews", _jsx("input", { "aria-label": "Search reviews", maxLength: 160, value: inboxQuery, onChange: (event) => setInboxQuery(event.target.value) })] }), _jsx("button", { type: "submit", children: "Search" })] })] }), inbox.length === 0 && inboxTotal === undefined ? _jsx("p", { className: "review-muted", children: "Review inbox unavailable." }) : inbox.length === 0 ? _jsx("p", { className: "review-muted", children: inboxQueue === "history" ? "No review history is available in this list." : `No reviews match the ${inboxQueue} queue.` }) : _jsx("ul", { className: "review-inbox", children: inbox.map((item) => _jsx("li", { children: _jsxs("button", { type: "button", "aria-current": taskId === item.taskId && selectedRoundId === item.roundId ? "true" : undefined, onClick: () => { writeReviewRoute({ taskId: item.taskId, roundId: item.roundId }); void load(item.taskId, inboxView, item.roundId); }, children: [_jsx("strong", { children: item.taskTitle }), _jsxs("span", { children: [item.projectTitle, " \u00B7 Round ", item.roundNumber, item.revisionLabel ? ` · ${item.revisionLabel}` : ""] }), _jsxs("small", { children: [item.status.replaceAll("_", " "), item.reviewerName ? ` · Reviewer ${item.reviewerName}` : "", item.dueDate ? ` · Due ${item.dueDate.slice(0, 10)}` : " · No due date"] })] }) }, item.roundId)) }), inboxTotal !== undefined && (inboxTotal > 0 || inboxOffset > 0) && _jsxs("nav", { className: "review-pagination", "aria-label": "Review inbox pages", children: [_jsx("span", { children: inboxOffset >= inboxTotal ? `No items on this page · ${inboxTotal} total` : `Showing ${inboxOffset + 1}–${Math.min(inboxOffset + inbox.length, inboxTotal)} of ${inboxTotal}` }), _jsx("button", { type: "button", onClick: () => { const offset = Math.max(0, inboxOffset - INBOX_PAGE_SIZE); setInboxOffset(offset); writeReviewRoute({ offset }); void load(taskId, inboxView, selectedRoundId, offset); }, disabled: loading || inboxOffset === 0, children: "Previous" }), _jsx("button", { type: "button", onClick: () => { const offset = inboxOffset + INBOX_PAGE_SIZE; setInboxOffset(offset); writeReviewRoute({ offset }); void load(taskId, inboxView, selectedRoundId, offset); }, disabled: loading || inboxOffset + inbox.length >= inboxTotal, children: "Next" })] }), _jsxs("form", { className: "review-form", onSubmit: (event) => { event.preventDefault(); writeReviewRoute({ taskId, roundId: "" }); void load(taskId, inboxView, ""); }, children: [_jsx("label", { htmlFor: "review-task-id", children: "Open linked project task by ID" }), _jsx("input", { id: "review-task-id", required: true, value: taskId, onChange: (event) => setTaskId(event.target.value) }), _jsx("button", { type: "submit", disabled: loading || !taskId, children: "Open task" })] })] }), !review ? _jsx("section", { className: "review-panel", children: roundUnavailable ? _jsxs(_Fragment, { children: [_jsx("p", { role: "alert", className: "review-error", children: "This exact review round is unavailable for this task. No other round has been selected." }), _jsx("button", { type: "button", onClick: () => { writeReviewRoute({ taskId: "", roundId: "" }); void load("", inboxView, "", inboxOffset); }, children: "Back to review inbox" })] }) : _jsx("p", { className: "review-muted", children: "Select a review or open a project task to see its review history." }) }) : _jsxs("article", { className: "review-panel review-detail", children: [_jsx("button", { className: "review-back", type: "button", onClick: () => { writeReviewRoute({ taskId: "", roundId: "" }); void load("", inboxView, "", inboxOffset); }, children: "Back to review inbox" }), _jsxs("div", { className: "review-detail-heading", children: [_jsxs("div", { children: [_jsx("h3", { children: review.task.title }), _jsxs("p", { children: ["Task ", review.task.id, " \u00B7 ", review.task.status.replaceAll("_", " "), " \u00B7 ", review.task.reviewRequirement] })] }), _jsx("span", { children: review.assignment ? `Reviewer: ${review.assignment.reviewerName}` : "Reviewer not assigned" })] }), review.capabilities.assignReviewer && _jsxs("form", { className: "review-form review-inline-form", onSubmit: (event) => { event.preventDefault(); if (reviewerId && reason.trim().length >= 3)
                                    void post(`/tasks/${encodeURIComponent(review.task.id)}/reviewer`, { employeeId: reviewerId, expectedVersion: review.task.version, reason: reason.trim() }, "Reviewer assignment saved."); }, children: [_jsxs("label", { children: ["Assign reviewer", _jsxs("select", { required: true, value: reviewerId, onChange: (event) => setReviewerId(event.target.value), children: [_jsx("option", { value: "", children: "Choose an authorized reviewer" }), review.reviewerCandidates.map((item) => _jsx("option", { value: item.employeeId, children: item.name }, item.employeeId))] })] }), reasonInput(), _jsx("button", { disabled: busy || !reviewerId || reason.trim().length < 3, children: "Assign reviewer" })] }), latestRound && (review.capabilities.changePriority || review.capabilities.changeDeadline) && _jsxs("section", { className: "review-task-controls", children: [_jsx("h4", { children: "Task controls" }), _jsxs("p", { children: [_jsx("span", { children: "Task priority" }), ": ", _jsx("strong", { children: review.task.priority }), " \u00B7 ", _jsx("span", { children: "Committed date" }), ": ", _jsx("strong", { children: review.task.committedDueDate?.slice(0, 10) ?? "Not set" })] }), review.capabilities.changePriority && _jsxs("form", { className: "review-form", onSubmit: (event) => { event.preventDefault(); if (reason.trim().length >= 3 && priorityDraft !== review.task.priority)
                                            void post(`/rounds/${encodeURIComponent(latestRound.id)}/priority`, { priority: priorityDraft, expectedVersion: review.task.version, reason: reason.trim() }, "Task priority updated."); }, children: [_jsxs("label", { children: ["New priority", _jsx("select", { value: priorityDraft, onChange: (event) => setPriorityDraft(event.target.value), children: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => _jsx("option", { children: value }, value)) })] }), reasonInput("Priority change reason"), _jsx("button", { disabled: busy || priorityDraft === review.task.priority || reason.trim().length < 3, children: "Change priority" })] }), review.capabilities.changeDeadline && _jsxs("form", { className: "review-form", onSubmit: (event) => { event.preventDefault(); if (reason.trim().length >= 3 && deadlineDraft && deadlineDraft !== review.task.committedDueDate?.slice(0, 10))
                                            void post(`/rounds/${encodeURIComponent(latestRound.id)}/deadline`, { committedDueDate: deadlineDraft, expectedVersion: review.task.version, reason: reason.trim() }, "Committed date updated."); }, children: [_jsxs("label", { children: ["New committed date", _jsx("input", { type: "date", required: true, value: deadlineDraft, onChange: (event) => setDeadlineDraft(event.target.value) })] }), reasonInput("Committed date change reason"), _jsx("button", { disabled: busy || !deadlineDraft || deadlineDraft === review.task.committedDueDate?.slice(0, 10) || reason.trim().length < 3, children: "Change committed date" })] })] }), review.capabilities.configureClientRouting && review.rounds.length === 0 && review.task.reviewRequirement === "BOTH" && !review.automaticClientRouting && _jsxs("form", { className: "review-form", onSubmit: event => { event.preventDefault(); void post(`/tasks/${encodeURIComponent(review.task.id)}/routing`, { expectedVersion: review.task.version, internal: true, client: true, reason: reason.trim() }, "Automatic client routing authorized after internal approval."); }, children: [_jsx("p", { children: "This task requires internal and client review. Authorize automatic delivery after internal approval." }), reasonInput("Review configuration reason"), _jsx("button", { disabled: busy || reason.trim().length < 3, children: "Authorize automatic client routing" })] }), review.routing && _jsxs("section", { className: "review-form", "aria-label": "Automatic client routing", children: [_jsx("h4", { children: "Client review delivery" }), _jsx("p", { role: "status", children: review.routing.status === "SENT" ? "Approved work sent to client review." : review.routing.status === "PENDING" ? "Internal approval recorded. Client review delivery is pending." : review.routing.blockedReason }), review.routing.status === "BLOCKED" && review.capabilities.configureClientRouting && _jsx("button", { type: "button", disabled: busy, onClick: () => void post(`/tasks/${encodeURIComponent(review.task.id)}/routing/retry`, {}, "Client routing checked. See the current delivery status."), children: "Retry client routing" })] }), review.capabilities.configureClientRouting && review.task.status === "INTERNAL_APPROVED" && review.task.reviewRequirement === "BOTH" && (!review.automaticClientRouting || review.routing?.status === "BLOCKED") && _jsxs("form", { className: "review-form", onSubmit: event => { event.preventDefault(); void post(`/tasks/${encodeURIComponent(review.task.id)}/routing`, { expectedVersion: review.task.version, internal: true, client: true, reason: reason.trim() }, "Client routing reauthorized for the same internally approved evidence."); }, children: [_jsx("h4", { children: "Authorize client delivery" }), _jsx("p", { children: "Use your current publishing authority to resume delivery of the exact approved work. Previous authorizations remain in history." }), reasonInput("New publishing authorization reason"), _jsx("button", { disabled: busy || reason.trim().length < 3, children: "Authorize and queue client review" })] }), review.automaticClientRouting && review.capabilities.configureClientRouting && _jsxs("form", { className: "review-form", onSubmit: event => { event.preventDefault(); void post(`/tasks/${encodeURIComponent(review.task.id)}/routing/revoke`, { reason: reason.trim() }, "Automatic client routing revoked. Existing review evidence is preserved."); }, children: [reasonInput("Routing revocation reason"), _jsx("button", { disabled: busy || reason.trim().length < 3, children: "Revoke automatic client routing" })] }), review.capabilities.submit && _jsxs("form", { className: "review-form review-inline-form", onSubmit: event => { event.preventDefault(); if (reason.trim().length >= 3)
                                    void post(`/tasks/${encodeURIComponent(review.task.id)}/submit`, { ...(evidenceKind === "DRAWING" ? { revisionId } : evidenceKind === "FILE" ? { fileId: workFileId } : { reviewUrl }), expectedVersion: review.task.version, reason: reason.trim() }, "Work submitted for internal review. Client delivery waits for approval."); }, children: [_jsx("h4", { children: "Submit work" }), _jsx("p", { children: "A file or link is required. Client review starts only after internal approval of this submission." }), _jsxs("label", { children: ["Evidence type", _jsxs("select", { value: evidenceKind, onChange: event => { setEvidenceKind(event.target.value); setRevisionId(""); setWorkFileId(""); setReviewUrl(""); }, children: [_jsx("option", { value: "DRAWING", children: "Exact drawing revision" }), _jsx("option", { value: "FILE", children: "Uploaded project file" }), _jsx("option", { value: "LINK", children: "Review link" })] })] }), evidenceKind === "DRAWING" ? _jsxs("label", { children: ["Exact drawing revision", _jsxs("select", { required: true, value: revisionId, onChange: event => setRevisionId(event.target.value), children: [_jsx("option", { value: "", children: "Choose a revision" }), review.availableRevisions.map(item => _jsxs("option", { value: item.id, children: [item.label, " \u00B7 ", item.state] }, item.id))] })] }) : evidenceKind === "FILE" ? _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Uploaded project file", _jsxs("select", { required: true, value: workFileId, onChange: event => setWorkFileId(event.target.value), children: [_jsx("option", { value: "", children: "Choose a file" }), review.availableMarkupFiles.map(item => _jsx("option", { value: item.id, children: item.fileName }, item.id))] })] }), _jsx("a", { href: `/documents?projectId=${encodeURIComponent(review.task.projectId)}`, target: "_blank", rel: "noopener noreferrer", children: "Upload a file in Project Documents" }), _jsx("button", { type: "button", disabled: busy, onClick: () => void load(review.task.id), children: "Refresh uploaded files" })] }) : _jsxs("label", { children: ["HTTPS review link", _jsx("input", { type: "url", required: true, maxLength: 2048, placeholder: "https://\u2026", value: reviewUrl, onChange: event => setReviewUrl(event.target.value) }), _jsx("small", { children: "The exact URL is kept with this round. External content may change." })] }), reasonInput("Submission reason"), _jsx("button", { disabled: busy || reason.trim().length < 3 || !(evidenceKind === "DRAWING" ? revisionId : evidenceKind === "FILE" ? workFileId : reviewUrl), children: "Submit for internal review" })] }), review.rounds.length === 0 && _jsx("p", { className: "review-muted", children: "No submissions yet. Review history appears here after task submission." }), _jsx("ol", { className: "review-rounds", children: review.rounds.map((item) => _jsxs("li", { id: `review-round-${item.id}`, "aria-current": selectedRoundId === item.id ? "true" : undefined, children: [_jsxs("div", { className: "review-round-heading", children: [_jsxs("h4", { children: ["Round ", item.roundNumber, item.revisionLabel ? ` · ${item.revisionLabel}` : ""] }), _jsx("span", { children: item.status.replaceAll("_", " ") })] }), _jsxs("p", { children: ["Submitted by ", item.submittedByName, " \u00B7 ", new Date(item.submittedAt).toLocaleString(), " \u00B7 Reviewer ", item.reviewerName] }), _jsxs("section", { className: "review-submission-snapshot", "aria-label": `Round ${item.roundNumber} submission snapshot`, children: [_jsx("h5", { children: "Submitted task snapshot" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Task version" }), _jsx("dd", { children: item.taskVersion })] }), _jsxs("div", { children: [_jsx("dt", { children: "Title at submission" }), _jsx("dd", { children: item.taskSnapshot.title })] }), _jsxs("div", { children: [_jsx("dt", { children: "Priority at submission" }), _jsx("dd", { children: item.taskSnapshot.priority.replaceAll("_", " ") })] }), _jsxs("div", { children: [_jsx("dt", { children: "Committed date at submission" }), _jsx("dd", { children: item.taskSnapshot.committedDueDate ? item.taskSnapshot.committedDueDate.slice(0, 10) : "No committed date" })] })] })] }), !!item.taskSnapshot.workEvidence && item.taskSnapshot.workEvidence.kind === "LINK" && _jsxs("p", { children: [_jsx("a", { href: item.taskSnapshot.workEvidence.url, target: "_blank", rel: "noopener noreferrer", children: "Open submitted review link" }), " \u00B7 External content may change; the submitted URL is preserved."] }), item.revisionFileId && _jsxs(_Fragment, { children: [_jsx("p", { className: "review-evidence-link", children: _jsxs("a", { href: `${DOCUMENTS_API}/files/${encodeURIComponent(item.revisionFileId)}/stream`, children: ["Open exact submitted file ", item.revisionLabel ?? "drawing"] }) }), _jsxs("button", { type: "button", onClick: () => { clearEvidence(); setSelectedRoundId(item.id); writeReviewRoute({ taskId: review.task.id, roundId: item.id }); if (evidenceRoundId !== item.id) {
                                                        evidenceContext.current = `${item.id}:${evidenceEpochRef.current}`;
                                                        setEvidenceRoundId(item.id);
                                                    } }, "aria-expanded": evidenceRoundId === item.id, children: ["Inspect exact round ", item.roundNumber, " evidence"] }), item.id !== latestRound?.id && _jsx("p", { className: "review-read-only", children: "Historical round \u00B7 read only. Feedback remains attached to its exact round." }), evidenceRoundId === item.id && _jsx(ReviewEvidence, { fileId: item.revisionFileId, roundId: item.id, revisionLabel: item.revisionLabel ?? "Submitted evidence", mimeType: item.revisionFileMimeType ?? "application/octet-stream", filename: item.revisionFileName ?? "Submitted file", annotations: item.comments.flatMap((entry) => entry.annotations.map((annotation, index) => ({ ...annotation, id: `${entry.id}-${index}` }))), canAnnotate: item.id === latestRound?.id && item.status === "IN_REVIEW" && review.capabilities.comment, ...(selectedPoint === undefined ? {} : { selectedPoint }), onSelectPoint: (point) => { if (!Number.isInteger(point.page) || point.page < 1 || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1 || evidenceContext.current !== `${item.id}:${evidenceEpoch}` || !evidenceReady(item) || item.id !== latestRound?.id || item.status !== "IN_REVIEW" || !review.capabilities.comment)
                                                        return; setSelectedPoint(point); setCommentPage(String(point.page)); setCommentX(String(point.x)); setCommentY(String(point.y)); setDecisionPage(String(point.page)); setDecisionX(String(point.x)); setDecisionY(String(point.y)); setCommentAnnotation(""); setDecisionAnnotation(""); }, onEvidenceState: (state) => { if (evidenceContext.current !== `${item.id}:${evidenceEpoch}`)
                                                        return; if (state === "denied") {
                                                        clearProtected();
                                                        return;
                                                    } setEvidenceStates((previous) => ({ ...previous, [item.id]: state })); if (state === "error" || state === "unsupported") {
                                                        setSelectedPoint(undefined);
                                                        setCommentAnnotation("");
                                                        setDecisionAnnotation("");
                                                    } } }, `${item.id}:${item.revisionFileId}:${evidenceEpoch}`)] }), item.withdrawal && _jsxs("p", { className: "review-history-withdrawal", children: [_jsx("strong", { children: "Submission withdrawn" }), " \u00B7 ", item.withdrawal.reason, " \u00B7 ", new Date(item.withdrawal.at).toLocaleString()] }), (item.escalations?.length ?? 0) > 0 && _jsxs("section", { className: "review-escalation-history", children: [_jsx("h5", { children: "Escalation history" }), _jsx("ul", { children: item.escalations.map((escalation) => _jsxs("li", { children: ["Escalated to ", escalation.recipientAccountId, " \u00B7 ", escalation.reason, " \u00B7 ", new Date(escalation.createdAt).toLocaleString()] }, escalation.id)) })] }), review.capabilities.escalate && item.id === latestRound?.id && _jsxs("form", { className: "review-form review-round-action", onSubmit: (event) => { event.preventDefault(); if (reason.trim().length >= 3)
                                                void post(`/rounds/${encodeURIComponent(item.id)}/escalate`, { reason: reason.trim() }, "Review escalation recorded."); }, children: [_jsx("h4", { children: "Escalate review" }), reasonInput("Escalation reason"), _jsx("button", { disabled: busy || reason.trim().length < 3, children: "Record escalation" })] }), review.capabilities.withdraw && item.id === latestRound?.id && ["SUBMITTED", "IN_REVIEW"].includes(item.status) && _jsxs("form", { className: "review-form review-round-action", onSubmit: (event) => { event.preventDefault(); if (reason.trim().length >= 3)
                                                void post(`/rounds/${encodeURIComponent(item.id)}/withdraw`, { reason: reason.trim() }, "Submission withdrawn."); }, children: [_jsx("h4", { children: "Withdraw submission" }), reasonInput("Withdrawal reason"), _jsx("button", { disabled: busy || reason.trim().length < 3, children: "Withdraw submission" })] }), item.comments.map((entry) => _jsxs("blockquote", { children: [_jsx("p", { children: entry.comment }), _jsxs("footer", { children: [entry.authorName, " \u00B7 ", new Date(entry.createdAt).toLocaleString()] }), entry.annotations.map((note, index) => _jsxs("small", { children: ["Page ", note.page, " (", note.x, ", ", note.y, "): ", note.text] }, `${entry.id}-${index}`)), entry.markupFileId && _jsx("small", { children: _jsx("a", { href: `${DOCUMENTS_API}/files/${encodeURIComponent(entry.markupFileId)}/stream`, children: "Download markup file" }) })] }, entry.id)), item.decision && _jsxs("p", { className: `review-decision review-decision-${item.decision.kind.toLowerCase()}`, children: [_jsx("strong", { children: item.decision.kind === "APPROVED" ? "Approved" : "Corrections required" }), item.decision.severity ? ` · ${item.decision.severity}` : "", item.decision.categoryName ? ` · ${item.decision.categoryName}` : "", _jsx("br", {}), item.decision.comment] }), review.capabilities.start && item.id === latestRound?.id && item.status === "SUBMITTED" && _jsxs("form", { className: "review-form", onSubmit: (event) => { event.preventDefault(); if (reason.trim().length >= 3)
                                                void post(`/rounds/${encodeURIComponent(item.id)}/start`, { reason: reason.trim() }, "Review started."); }, children: [_jsx("h4", { children: "Begin assigned review" }), reasonInput(), _jsx("button", { disabled: busy || reason.trim().length < 3, children: "Start review" })] }), (review.capabilities.comment || review.capabilities.decide) && item.id === latestRound?.id && item.status === "IN_REVIEW" && _jsxs("div", { className: "review-columns", children: [review.capabilities.comment && _jsxs("form", { className: "review-form", onSubmit: (event) => { event.preventDefault(); if (commentDraft.trim().length >= 1 && reason.trim().length >= 3 && (!commentAnnotations.length || annotationReady(item, commentAnnotations)))
                                                        void post(`/rounds/${encodeURIComponent(item.id)}/comment`, { comment: commentDraft.trim(), ...(commentAnnotations.length ? { annotations: commentAnnotations } : {}), ...(commentMarkupFileId ? { markupFileId: commentMarkupFileId } : {}), reason: reason.trim() }, "Comment added to this immutable round."); }, children: [_jsx("h4", { children: "Add comment or markup" }), _jsxs("label", { children: ["Comment", _jsx("textarea", { required: true, value: commentDraft, onChange: (event) => setCommentDraft(event.target.value) })] }), _jsx(AnnotationFields, { coordinatesReadOnly: !!item.revisionFileId, page: commentPage, setPage: setCommentPage, x: commentX, setX: setCommentX, y: commentY, setY: setCommentY, annotationText: commentAnnotation, setAnnotationText: setCommentAnnotation, markupFileId: commentMarkupFileId, setMarkupFileId: setCommentMarkupFileId, files: review.availableMarkupFiles, projectId: review.task.projectId }), reasonInput(), _jsx("button", { disabled: busy || !commentDraft.trim() || reason.trim().length < 3 || !!commentAnnotations.length && !annotationReady(item, commentAnnotations), children: "Add comment" })] }), review.capabilities.decide && _jsxs("form", { className: "review-form", onSubmit: (event) => { event.preventDefault(); if (decisionDraft.trim() && reason.trim().length >= 3 && evidenceReady(item) && annotationReady(item, decisionAnnotations))
                                                        void post(`/rounds/${encodeURIComponent(item.id)}/decision`, { kind: decisionKind, comment: decisionDraft.trim(), reason: reason.trim(), ...(decisionKind === "CORRECTIONS_REQUIRED" ? { severity, ...(categoryId ? { categoryId } : {}), ...(decisionAnnotations.length ? { annotations: decisionAnnotations } : {}), ...(decisionMarkupFileId ? { markupFileId: decisionMarkupFileId } : {}) } : {}) }, decisionKind === "APPROVED" ? "Review approved." : "Corrections requested."); }, children: [_jsx("h4", { children: "Record decision" }), _jsxs("label", { children: ["Decision", _jsxs("select", { value: decisionKind, onChange: (event) => setDecisionKind(event.target.value), children: [_jsx("option", { value: "APPROVED", children: "Approve" }), _jsx("option", { value: "CORRECTIONS_REQUIRED", children: "Request corrections" })] })] }), _jsxs("label", { children: ["Decision comment", _jsx("textarea", { required: true, value: decisionDraft, onChange: (event) => setDecisionDraft(event.target.value) })] }), decisionKind === "CORRECTIONS_REQUIRED" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Severity", _jsx("select", { value: severity, onChange: (event) => setSeverity(event.target.value), children: ["Minor", "Moderate", "Major", "Critical"].map((value) => _jsx("option", { children: value }, value)) })] }), _jsxs("label", { children: ["Category", _jsxs("select", { value: categoryId, onChange: (event) => setCategoryId(event.target.value), children: [_jsx("option", { value: "", children: "Choose category" }), review.categories.map((value) => _jsx("option", { value: value.id, children: value.name }, value.id))] })] }), _jsx(AnnotationFields, { coordinatesReadOnly: !!item.revisionFileId, page: decisionPage, setPage: setDecisionPage, x: decisionX, setX: setDecisionX, y: decisionY, setY: setDecisionY, annotationText: decisionAnnotation, setAnnotationText: setDecisionAnnotation, markupFileId: decisionMarkupFileId, setMarkupFileId: setDecisionMarkupFileId, files: review.availableMarkupFiles, projectId: review.task.projectId })] }), !evidenceReady(item) && _jsx("p", { role: "status", children: "Decision is unavailable until this exact submitted evidence is ready to inspect." }), reasonInput("Decision reason"), _jsx("button", { disabled: busy || !decisionDraft.trim() || reason.trim().length < 3 || !evidenceReady(item) || !annotationReady(item, decisionAnnotations), children: "Save decision" })] })] }), review.capabilities.assignCorrection && item.id === latestRound?.id && item.decision?.kind === "CORRECTIONS_REQUIRED" && !item.correctionTaskId && _jsxs("form", { className: "review-form review-inline-form", onSubmit: (event) => { event.preventDefault(); if (correctionOwner && reason.trim().length >= 3)
                                                void post(`/rounds/${encodeURIComponent(item.id)}/correction`, { ownerEmployeeId: correctionOwner, reason: reason.trim() }, "Correction task assigned."); }, children: [_jsx("h4", { children: "Assign correction task" }), _jsxs("label", { children: ["Correction owner", _jsxs("select", { required: true, value: correctionOwner, onChange: (event) => setCorrectionOwner(event.target.value), children: [_jsx("option", { value: "", children: "Choose owner" }), review.correctionOwnerCandidates.map((candidate) => _jsx("option", { value: candidate.employeeId, children: candidate.name }, candidate.employeeId))] })] }), reasonInput(), _jsx("button", { disabled: busy || !correctionOwner || reason.trim().length < 3, children: "Create correction task" })] })] }, item.id)) }), review.capabilities.complete && _jsxs("form", { className: "review-form review-inline-form", onSubmit: (event) => { event.preventDefault(); if (reason.trim().length >= 3)
                                    void post(`/tasks/${encodeURIComponent(review.task.id)}/complete`, { expectedVersion: review.task.version, reason: reason.trim() }, "Task completed."); }, children: [_jsx("h4", { children: "Complete task" }), reasonInput(), _jsx("button", { disabled: busy || reason.trim().length < 3, children: "Complete task" })] }), review.capabilities.manageCategories && _jsxs("section", { className: "review-form review-inline-form", children: [_jsx("h4", { children: "Correction categories" }), categoriesError && _jsx("p", { role: "alert", className: "review-error", children: categoriesError }), _jsx("ul", { className: "review-category-list", children: managedCategories.map((category) => _jsxs("li", { children: [_jsxs("span", { children: [category.name, " \u00B7 ", category.active ? "Active" : "Inactive"] }), _jsx("button", { type: "button", disabled: busy || reason.trim().length < 3, onClick: () => void post(`/categories/${encodeURIComponent(category.id)}/active`, { active: !category.active, reason: reason.trim() }, `Category ${category.active ? "deactivated" : "activated"}.`), children: category.active ? "Deactivate" : "Activate" })] }, category.id)) }), _jsxs("form", { className: "review-form", onSubmit: (event) => { event.preventDefault(); if (categoryName.trim() && reason.trim().length >= 3)
                                            void post("/categories", { name: categoryName.trim(), reason: reason.trim() }, "Correction category added.").then((saved) => { if (saved)
                                                setCategoryName(""); }); }, children: [_jsxs("label", { children: ["New category", _jsx("input", { value: categoryName, onChange: (event) => setCategoryName(event.target.value) })] }), reasonInput(), _jsx("button", { disabled: busy || !categoryName.trim() || reason.trim().length < 3, children: "Add category" })] })] })] })] })] });
}
function AnnotationFields(props) {
    return _jsxs("fieldset", { className: "review-annotation", children: [_jsx("legend", { children: "Structured annotation (optional)" }), _jsxs("div", { children: [_jsxs("label", { children: ["Page", _jsx("input", { type: "number", readOnly: props.coordinatesReadOnly, min: "1", value: props.page, onChange: (event) => props.setPage(event.target.value) })] }), _jsxs("label", { children: ["X", _jsx("input", { type: "number", readOnly: props.coordinatesReadOnly, min: "0", max: "1", step: "0.001", value: props.x, onChange: (event) => props.setX(event.target.value) })] }), _jsxs("label", { children: ["Y", _jsx("input", { type: "number", readOnly: props.coordinatesReadOnly, min: "0", max: "1", step: "0.001", value: props.y, onChange: (event) => props.setY(event.target.value) })] })] }), _jsxs("label", { children: ["Annotation text", _jsx("input", { value: props.annotationText, onChange: (event) => props.setAnnotationText(event.target.value) })] }), _jsxs("label", { children: ["Uploaded markup file", _jsxs("select", { value: props.markupFileId, onChange: (event) => props.setMarkupFileId(event.target.value), children: [_jsx("option", { value: "", children: "No markup file" }), props.files.map((file) => _jsxs("option", { value: file.id, children: [file.fileName, " \u00B7 ", file.mimeType] }, file.id))] })] }), props.files.length === 0 && _jsx("small", { children: "No accessible PDF or image files are available as markup." }), props.coordinatesReadOnly && _jsx("small", { children: "Select a location in the ready evidence viewer to attach an annotation." }), _jsxs("small", { children: ["Coordinates are normalized from 0 to 1. ", _jsx("a", { href: `/documents?projectId=${encodeURIComponent(props.projectId)}`, children: "Upload markup in the project document register" }), "."] })] });
}
