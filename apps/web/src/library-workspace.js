import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowSearchParams } from "./use-window-search-params.js";
import "./library-workspace.css";
const API = "/api/v1/library";
const CHUNK_SIZE = 8 * 1024 * 1024;
class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
const commandId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
async function api(url, csrf, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("X-CSRF-Token", csrf);
    if (typeof init.body === "string" && !headers.has("Content-Type"))
        headers.set("Content-Type", "application/json");
    const response = await fetch(url, { ...init, headers, credentials: "include" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new ApiError(body.error?.message ?? body.message ?? `Request failed (${response.status})`, response.status);
    return body;
}
const reasonOf = (cause) => cause instanceof ApiError && cause.status === 409 ? "The Library changed while you were working. Current history has been reloaded; review it before retrying." : cause instanceof ApiError && cause.status === 403 ? "Your Library access changed. Current access and content have been reloaded." : cause instanceof Error ? cause.message : "The Library request failed.";
const defaultBlock = () => ({ type: "TEXT", text: "" });
export function LibraryWorkspace({ csrfToken }) {
    const [searchParams, setSearchParams] = useWindowSearchParams();
    const queryKind = searchParams.get("kind") ?? "";
    const querySearch = searchParams.get("search") ?? "";
    const queryRecordId = searchParams.get("recordId") ?? "";
    const queryVersionId = searchParams.get("versionId") ?? "";
    const [setup, setSetup] = useState(null);
    const [items, setItems] = useState([]);
    const [detail, setDetail] = useState(null);
    const [filterKind, setFilterKind] = useState(() => ["SOP", "KNOWLEDGE", "MODULE"].includes(queryKind) ? queryKind : "");
    const [search, setSearch] = useState(querySearch);
    const [selectedId, setSelectedIdState] = useState(queryRecordId);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [creating, setCreating] = useState(false);
    const [kind, setKind] = useState("SOP");
    const [audienceKey, setAudienceKey] = useState("");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("");
    const [reason, setReason] = useState("");
    const [acknowledgementRequired, setAcknowledgementRequired] = useState(false);
    const [blocks, setBlocks] = useState([defaultBlock()]);
    const [assessmentCriteria, setAssessmentCriteria] = useState("");
    const [quizPrompt, setQuizPrompt] = useState("");
    const [quizOptions, setQuizOptions] = useState(["", ""]);
    const [correctIndex, setCorrectIndex] = useState(0);
    const [minimumCorrect, setMinimumCorrect] = useState("");
    const [practicalRequired, setPracticalRequired] = useState(false);
    const [approverId, setApproverId] = useState("");
    const [decisionReasons, setDecisionReasons] = useState({});
    const [referenceVersionId, setReferenceVersionId] = useState("");
    const [referenceTargetType, setReferenceTargetType] = useState("task");
    const [referenceTargetId, setReferenceTargetId] = useState("");
    const detailRequest = useRef(0);
    const [uploadBlockType, setUploadBlockType] = useState("FILE");
    const updateLibraryQuery = useCallback((changes, replace = false) => {
        setSearchParams(current => { const next = new URLSearchParams(current); for (const [key, value] of Object.entries(changes)) {
            if (value)
                next.set(key, value);
            else
                next.delete(key);
        } return next; }, { replace });
    }, [setSearchParams]);
    const setSelectedId = useCallback((id, replace = false) => { setSelectedIdState(id); updateLibraryQuery({ recordId: id, ...(id !== queryRecordId ? { versionId: "" } : {}) }, replace); }, [queryRecordId, updateLibraryQuery]);
    useEffect(() => {
        setFilterKind(["SOP", "KNOWLEDGE", "MODULE"].includes(queryKind) ? queryKind : "");
        setSearch(querySearch);
        setSelectedIdState(queryRecordId);
    }, [queryKind, querySearch, queryRecordId]);
    const loadSetup = useCallback(async () => setSetup(await api(`${API}/setup`, csrfToken)), [csrfToken]);
    const loadList = useCallback(async () => {
        const params = new URLSearchParams();
        if (filterKind)
            params.set("kind", filterKind);
        if (search.trim())
            params.set("search", search.trim());
        const result = await api(`${API}${params.size ? `?${params}` : ""}`, csrfToken);
        const requestedRecordId = new URLSearchParams(window.location.search).get("recordId");
        setItems(result.items);
        setSelectedIdState(current => requestedRecordId ? (result.items.some(item => item.id === requestedRecordId) ? requestedRecordId : "") : current ? (result.items.some(item => item.id === current) ? current : "") : result.items[0]?.id ?? "");
        if (requestedRecordId && !result.items.some(item => item.id === requestedRecordId))
            updateLibraryQuery({ recordId: "" }, true);
    }, [csrfToken, filterKind, search, updateLibraryQuery]);
    const loadDetail = useCallback(async (id) => {
        const request = ++detailRequest.current;
        if (!id) {
            setDetail(null);
            return;
        }
        const result = await api(`${API}/${encodeURIComponent(id)}`, csrfToken);
        if (request === detailRequest.current)
            setDetail(result);
    }, [csrfToken]);
    const refresh = useCallback(async () => { await Promise.all([loadSetup(), loadList()]); }, [loadList, loadSetup]);
    useEffect(() => { let active = true; setLoading(true); setError(""); void Promise.all([loadSetup(), loadList()]).catch(cause => { if (active)
        setError(reasonOf(cause)); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [loadList, loadSetup]);
    useEffect(() => { let active = true; if (selectedId)
        void loadDetail(selectedId).catch(cause => { if (active) {
            setDetail(null);
            setError(reasonOf(cause));
        } });
    else
        setDetail(null); return () => { active = false; }; }, [loadDetail, selectedId]);
    useEffect(() => {
        if (!detail || detail.record.id !== selectedId || !queryVersionId)
            return;
        if (!detail.versions.some(version => version.id === queryVersionId)) {
            updateLibraryQuery({ versionId: "" }, true);
            return;
        }
        document.getElementById(`library-version-${queryVersionId}`)?.focus({ preventScroll: false });
    }, [detail, queryVersionId, selectedId, updateLibraryQuery]);
    const options = setup?.authorAudienceOptions[kind] ?? [];
    const activeScope = options.find(scope => `${scope.audience}:${scope.branchId ?? ""}:${scope.teamId ?? ""}` === audienceKey) ?? options[0];
    const selectedVersion = useMemo(() => detail?.versions.find(version => version.id === referenceVersionId), [detail, referenceVersionId]);
    const canCreate = !!setup && Object.values(setup.authorAudienceOptions).some(scopes => scopes.length > 0);
    const recover = async (cause) => { setError(reasonOf(cause)); if (cause instanceof ApiError && (cause.status === 403 || cause.status === 404)) {
        detailRequest.current++;
        setDetail(null);
        setSelectedId("");
        setItems([]);
    } try {
        await refresh();
        if (selectedId && !(cause instanceof ApiError && (cause.status === 403 || cause.status === 404)))
            await loadDetail(selectedId);
    }
    catch { /* keep the original access/conflict message visible */ } };
    const mutate = async (url, body, success, afterSuccess) => {
        setPending(true);
        setError("");
        setNotice("");
        try {
            await api(url, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), ...body }) });
            await refresh();
            if (selectedId)
                await loadDetail(selectedId);
            afterSuccess?.();
            setNotice(success);
        }
        catch (cause) {
            await recover(cause);
        }
        finally {
            setPending(false);
        }
    };
    const addBlock = (type) => setBlocks(current => [...current, type === "TEXT" ? { type, text: "" } : type === "CHECKLIST" ? { type, items: [""] } : type === "LINK" ? { type, label: "", url: "https://" } : type === "SOP" ? { type, versionId: "" } : { type, fileId: "" }]);
    const changeBlock = (index, key, value) => setBlocks(current => current.map((block, i) => i === index ? { ...block, [key]: value } : block));
    const submitCreate = async (event) => {
        event.preventDefault();
        if (!activeScope || quizPrompt.trim() && minimumCorrect === "") {
            setError("Enter an explicit minimum correct score for the quiz.");
            return;
        }
        const content = { blocks: blocks.map(block => ({ ...block, ...(block.type === "CHECKLIST" && Array.isArray(block.items) ? { items: block.items.map(String).filter(text => text.trim()) } : {}) })) };
        if (kind === "MODULE" && assessmentCriteria.trim()) {
            const questionId = commandId(), optionIds = quizOptions.map(() => commandId());
            content.assessment = { criteria: assessmentCriteria.trim(), practicalRequired, ...(quizPrompt.trim() ? { quiz: [{ id: questionId, prompt: quizPrompt.trim(), options: quizOptions.map((label, index) => ({ id: optionIds[index], label: label.trim() })), correctOptionIds: [optionIds[correctIndex]] }], minimumCorrect: Number(minimumCorrect) } : {}) };
        }
        setPending(true);
        setError("");
        setNotice("");
        try {
            const created = await api(API, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), kind, title: title.trim(), category: category.trim(), audience: activeScope.audience, ...(activeScope.branchId ? { branchId: activeScope.branchId } : {}), ...(activeScope.teamId ? { teamId: activeScope.teamId } : {}), content, acknowledgementRequired, reason: reason.trim() }) });
            setCreating(false);
            setTitle("");
            setReason("");
            setBlocks([defaultBlock()]);
            setNotice("Library record created.");
            await refresh();
            setSelectedId(created.record.id);
            await loadDetail(created.record.id);
        }
        catch (cause) {
            await recover(cause);
        }
        finally {
            setPending(false);
        }
    };
    const saveVersion = async (event) => {
        event.preventDefault();
        if (!detail || detail.record.id !== selectedId)
            return;
        if (detail.record.kind === "MODULE" && quizPrompt.trim() && minimumCorrect === "") {
            setError("Enter an explicit minimum correct score for the quiz.");
            return;
        }
        const content = { blocks: blocks.map(block => ({ ...block })) };
        if (detail.record.kind === "MODULE" && assessmentCriteria.trim()) {
            const questionId = commandId(), optionIds = quizOptions.map(() => commandId());
            content.assessment = { criteria: assessmentCriteria.trim(), practicalRequired, ...(quizPrompt.trim() ? { quiz: [{ id: questionId, prompt: quizPrompt.trim(), options: quizOptions.map((label, index) => ({ id: optionIds[index], label: label.trim() })), correctOptionIds: [optionIds[correctIndex]] }], minimumCorrect: Number(minimumCorrect) } : {}) };
        }
        await mutate(`${API}/${detail.record.id}/versions`, { expectedVersion: detail.record.version, content, acknowledgementRequired, reason: reason.trim() }, "New version saved.", () => { setReason(""); setBlocks([defaultBlock()]); });
    };
    const uploadFile = async (file, blockIndex) => {
        if (!detail || detail.record.id !== selectedId)
            return;
        setPending(true);
        setError("");
        setNotice("");
        try {
            const started = await api(`${API}/${detail.record.id}/uploads`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), reason: "Attach file to Library record", name: file.name, mime: file.type || "application/octet-stream", bytes: file.size }) });
            for (let index = 0; index < started.chunkCount; index++) {
                const chunk = file.slice(index * CHUNK_SIZE, Math.min(file.size, (index + 1) * CHUNK_SIZE));
                const bytes = await chunk.arrayBuffer();
                const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(value => value.toString(16).padStart(2, "0")).join("");
                await api(`${API}/uploads/${started.uploadId}/chunks/${index}`, csrfToken, { method: "PUT", headers: { "Content-Type": "application/octet-stream", "X-Chunk-SHA256": checksum }, body: bytes });
            }
            const result = await api(`${API}/uploads/${started.uploadId}/finalize`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), reason: "Finalize private Library upload" }) });
            changeBlock(blockIndex, "fileId", result.id);
            setNotice("File uploaded privately. Save the version to attach it to this content.");
        }
        catch (cause) {
            await recover(cause);
        }
        finally {
            setPending(false);
        }
    };
    const requestPublish = () => detail && void mutate(`${API}/${detail.record.id}/publication-requests`, { versionId: detail.versions[0]?.id, approverAccountId: approverId, reason: reason.trim() }, "Publication request sent to the named publisher.");
    const decidePublish = (requestId, outcome) => detail && void mutate(`${API}/publication-requests/${requestId}/decision`, { outcome, reason: decisionReasons[requestId]?.trim() ?? "" }, outcome === "APPROVED" ? "Version published." : "Publication request rejected.");
    if (loading)
        return _jsx("section", { className: "library-workspace", "aria-busy": "true", children: _jsx("p", { role: "status", children: "Loading Library\u2026" }) });
    if (!setup)
        return _jsxs("section", { className: "library-workspace", children: [_jsx("h2", { children: "Library" }), _jsx("div", { className: "library-alert", role: "alert", children: error || "The Library is unavailable." }), _jsx("button", { type: "button", onClick: () => { setLoading(true); void refresh().catch(cause => setError(reasonOf(cause))).finally(() => setLoading(false)); }, children: "Retry" })] });
    return _jsxs("section", { className: "library-workspace", "aria-busy": pending || Boolean(selectedId && !error && detail?.record.id !== selectedId), children: [_jsxs("header", { className: "library-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "library-eyebrow", children: "Private company reference" }), _jsx("h2", { children: "Library" }), _jsx("p", { children: "Versioned SOPs, shared knowledge and training modules for your current access." })] }), canCreate && _jsx("button", { type: "button", onClick: () => { setCreating(value => !value); setError(""); }, children: creating ? "Close form" : "Create record" })] }), error && _jsx("div", { className: "library-alert", role: "alert", children: error }), notice && _jsx("div", { className: "library-notice", role: "status", children: notice }), _jsxs("div", { className: "library-toolbar", children: [_jsxs("label", { children: ["Kind", _jsxs("select", { value: filterKind, onChange: event => { const value = event.target.value; setFilterKind(value); updateLibraryQuery({ kind: value }, true); }, children: [_jsx("option", { value: "", children: "All Library content" }), setup.kinds.map(value => _jsx("option", { value: value, children: value }, value))] })] }), _jsxs("label", { children: ["Search titles and accessible text", _jsx("input", { value: search, onChange: event => { setSearch(event.target.value); updateLibraryQuery({ search: event.target.value }, true); }, maxLength: 120, placeholder: "Search the Library" })] })] }), creating && _jsxs("section", { className: "library-panel", children: [_jsx("h3", { children: "Create a Library record" }), _jsxs("form", { className: "library-form", onSubmit: submitCreate, children: [_jsxs("label", { children: ["Type", _jsx("select", { value: kind, onChange: event => { setKind(event.target.value); setAudienceKey(""); setCategory(""); }, children: setup.kinds.map(value => _jsx("option", { children: value }, value)) })] }), _jsxs("label", { children: ["Audience", _jsx("select", { value: audienceKey || (options[0] ? `${options[0].audience}:${options[0].branchId ?? ""}:${options[0].teamId ?? ""}` : ""), onChange: event => setAudienceKey(event.target.value), children: options.map(scope => _jsxs("option", { value: `${scope.audience}:${scope.branchId ?? ""}:${scope.teamId ?? ""}`, children: [scope.audience, " \u00B7 ", scope.label] }, `${scope.audience}:${scope.branchId}:${scope.teamId}`)) })] }), _jsxs("label", { children: ["Title", _jsx("input", { value: title, onChange: event => setTitle(event.target.value), required: true, maxLength: 160 })] }), (setup.categories[kind]?.length ?? 0) > 0 ? _jsxs("label", { children: ["Category", _jsxs("select", { value: category, onChange: event => setCategory(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose category" }), setup.categories[kind].map(value => _jsx("option", { children: value }, value))] })] }) : _jsxs("label", { children: ["Category", _jsx("input", { value: category, onChange: event => setCategory(event.target.value), required: true, maxLength: 80 })] }), _jsx(ContentEditor, { blocks: blocks, setBlocks: setBlocks, changeBlock: changeBlock, addBlock: addBlock, onUpload: uploadFile, uploadType: uploadBlockType, setUploadType: setUploadBlockType, allowUpload: false, referenceTargets: setup.referenceTargets }), kind === "MODULE" && _jsx(AssessmentEditor, { criteria: assessmentCriteria, setCriteria: setAssessmentCriteria, prompt: quizPrompt, setPrompt: setQuizPrompt, options: quizOptions, setOptions: setQuizOptions, correctIndex: correctIndex, setCorrectIndex: setCorrectIndex, minimumCorrect: minimumCorrect, setMinimumCorrect: setMinimumCorrect, practicalRequired: practicalRequired, setPracticalRequired: setPracticalRequired }), _jsxs("label", { className: "library-inline", children: [_jsx("input", { type: "checkbox", checked: acknowledgementRequired, onChange: event => setAcknowledgementRequired(event.target.checked) }), " Require acknowledgement for this version"] }), _jsxs("label", { className: "library-wide", children: ["Reason", _jsx("textarea", { value: reason, onChange: event => setReason(event.target.value), required: true, minLength: 3, maxLength: 1000, rows: 2 })] }), _jsx("button", { type: "submit", disabled: pending || !title.trim() || !category || !activeScope || reason.trim().length < 3 || quizPrompt.trim().length > 0 && minimumCorrect === "" || blocks.some(block => block.type === "TEXT" && !String(block.text ?? "").trim()), children: "Create draft" })] })] }), _jsxs("div", { className: "library-layout", children: [_jsxs("aside", { className: "library-panel", children: [_jsxs("div", { className: "library-section-heading", children: [_jsx("h3", { children: "Records" }), _jsx("span", { children: items.length })] }), items.length === 0 ? _jsx("p", { className: "library-empty", role: "status", children: "No accessible records match these filters." }) : _jsx("div", { className: "library-record-list", children: items.map(item => _jsxs("button", { type: "button", className: `library-record ${selectedId === item.id ? "is-selected" : ""}`, onClick: () => setSelectedId(item.id), children: [_jsx("strong", { children: item.title }), _jsxs("span", { children: [item.kind, " \u00B7 ", item.category] }), _jsxs("small", { children: [item.audience, " \u00B7 ", item.publishedVersion ? `Published v${item.publishedVersion}` : item.draft ? "Draft" : "Not published"] })] }, item.id)) })] }), _jsx("div", { className: "library-detail", children: detail && detail.record.id === selectedId ? _jsxs(_Fragment, { children: [_jsxs("section", { className: "library-panel", children: [_jsxs("div", { className: "library-section-heading", children: [_jsxs("div", { children: [_jsxs("p", { className: "library-eyebrow", children: [detail.record.kind, " \u00B7 ", detail.record.audience] }), _jsx("h3", { children: detail.record.title }), _jsxs("p", { children: [detail.record.category, " \u00B7 Current version ", detail.record.version] })] }), _jsx("button", { className: "library-secondary", type: "button", onClick: () => { void loadDetail(detail.record.id).catch(recover); }, children: "Refresh" })] }), _jsxs("div", { className: "library-capabilities", children: [detail.record.capabilities.canAppend && _jsx("span", { children: "Author access" }), detail.record.capabilities.canRequestPublication && _jsx("span", { children: "Publisher review required" }), detail.record.capabilities.canActivate && _jsx("span", { children: "Training management" })] }), detail.versions.map(version => _jsxs("article", { className: `library-version ${queryVersionId === version.id ? "is-focused" : ""}`, id: `library-version-${version.id}`, tabIndex: queryVersionId === version.id ? -1 : undefined, children: [_jsxs("div", { className: "library-version-heading", children: [_jsxs("div", { children: [_jsxs("strong", { children: ["Version ", version.version, detail.record.publishedVersionId === version.id ? " · Published" : ""] }), _jsxs("p", { children: [version.reason, " \u00B7 ", new Date(version.createdAt).toLocaleString()] })] }), _jsxs("div", { className: "library-version-actions", children: [queryVersionId === version.id ? _jsx("span", { children: "Selected exact version" }) : _jsx("button", { className: "library-text-button", type: "button", onClick: () => updateLibraryQuery({ versionId: version.id }), children: "View this version" }), version.acknowledgementRequired && _jsx("span", { children: version.acknowledged ? "Acknowledged" : "Acknowledgement required" })] })] }), _jsx(ContentView, { version: version, referenceTargets: setup.referenceTargets }), version.acknowledgementRequired && !version.acknowledged && detail.publications.some(publication => publication.versionId === version.id) && _jsxs("button", { type: "button", disabled: pending, onClick: () => void mutate(`${API}/versions/${version.id}/acknowledgements`, { reason: "I have read and acknowledge this published version." }, "Acknowledgement recorded for this exact version."), children: ["Acknowledge version ", version.version] })] }, version.id)), detail.record.capabilities.canAppend && _jsxs("form", { className: "library-form library-version-form", onSubmit: saveVersion, children: [_jsx("h4", { className: "library-wide", children: "Add a new version" }), _jsx("p", { className: "library-wide", children: "A new version replaces its content; add the blocks and assessment you want retained." }), _jsx(ContentEditor, { blocks: blocks, setBlocks: setBlocks, changeBlock: changeBlock, addBlock: addBlock, onUpload: uploadFile, uploadType: uploadBlockType, setUploadType: setUploadBlockType, allowUpload: detail.record.capabilities.canUpload, referenceTargets: setup.referenceTargets }), detail.record.kind === "MODULE" && _jsx(AssessmentEditor, { criteria: assessmentCriteria, setCriteria: setAssessmentCriteria, prompt: quizPrompt, setPrompt: setQuizPrompt, options: quizOptions, setOptions: setQuizOptions, correctIndex: correctIndex, setCorrectIndex: setCorrectIndex, minimumCorrect: minimumCorrect, setMinimumCorrect: setMinimumCorrect, practicalRequired: practicalRequired, setPracticalRequired: setPracticalRequired }), _jsxs("label", { className: "library-inline", children: [_jsx("input", { type: "checkbox", checked: acknowledgementRequired, onChange: event => setAcknowledgementRequired(event.target.checked) }), " Require acknowledgement"] }), _jsxs("label", { className: "library-wide", children: ["Reason", _jsx("textarea", { value: reason, onChange: event => setReason(event.target.value), required: true, minLength: 3, maxLength: 1000, rows: 2 })] }), _jsx("button", { type: "submit", disabled: pending || reason.trim().length < 3 || detail.record.kind === "MODULE" && quizPrompt.trim().length > 0 && minimumCorrect === "", children: "Save version" })] })] }), _jsxs("section", { className: "library-panel", children: [_jsx("h3", { children: "Publication and activation" }), detail.record.capabilities.canActivate && _jsx("button", { type: "button", disabled: pending || reason.trim().length < 3, onClick: () => void mutate(`${API}/${detail.record.id}/activate`, { expectedVersion: detail.record.version, reason: reason.trim() }, "Training module activated."), children: "Activate current module version" }), detail.record.capabilities.canRequestPublication && _jsxs("div", { className: "library-action-form", children: [_jsxs("label", { children: ["Eligible publisher", _jsxs("select", { value: approverId, onChange: event => setApproverId(event.target.value), children: [_jsx("option", { value: "", children: "Choose a different publisher" }), detail.eligiblePublisherIds.map(person => _jsx("option", { value: person.accountId, children: person.label }, person.accountId))] })] }), _jsxs("label", { children: ["Reason", _jsx("textarea", { value: reason, onChange: event => setReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2 })] }), _jsxs("button", { type: "button", disabled: pending || !approverId || reason.trim().length < 3, onClick: requestPublish, children: ["Request publication of version ", detail.versions[0]?.version] })] }), detail.record.capabilities.canPublishDirect && _jsxs("div", { className: "library-action-form", children: [_jsxs("label", { children: ["Owner publication reason", _jsx("textarea", { value: reason, onChange: event => setReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2 })] }), _jsx("button", { type: "button", disabled: pending || reason.trim().length < 3 || !detail.versions[0], onClick: () => void mutate(`${API}/${detail.record.id}/publish`, { versionId: detail.versions[0]?.id, reason: reason.trim() }, "Version published by Owner."), children: "Publish current version" })] }), detail.publicationRequests.map(request => _jsxs("article", { className: "library-request", children: [_jsxs("strong", { children: ["Version ", detail.versions.find(version => version.id === request.versionId)?.version ?? "—", " \u00B7 ", request.state] }), _jsxs("p", { children: ["By ", request.requesterLabel, " \u00B7 Publisher ", request.approverLabel, " \u00B7 ", request.reason] }), request.canDecide && _jsxs("div", { className: "library-action-form", children: [_jsxs("label", { children: ["Decision reason", _jsx("textarea", { value: decisionReasons[request.id] ?? "", onChange: event => setDecisionReasons(current => ({ ...current, [request.id]: event.target.value })), minLength: 3, maxLength: 1000, rows: 2 })] }), _jsxs("div", { className: "library-actions", children: [_jsx("button", { type: "button", disabled: pending || (decisionReasons[request.id]?.trim().length ?? 0) < 3, onClick: () => decidePublish(request.id, "APPROVED"), children: "Approve and publish" }), _jsx("button", { className: "library-secondary", type: "button", disabled: pending || (decisionReasons[request.id]?.trim().length ?? 0) < 3, onClick: () => decidePublish(request.id, "REJECTED"), children: "Reject" })] })] })] }, request.id)), detail.publications.map(publication => _jsxs("p", { className: "library-publication", children: ["Published ", new Date(publication.publishedAt).toLocaleString(), " \u00B7 ", publication.reason] }, publication.id))] }), detail.record.kind === "SOP" && _jsxs("section", { className: "library-panel", children: [_jsx("h3", { children: "Reference this exact SOP version" }), _jsxs("div", { className: "library-action-form", children: [_jsxs("label", { children: ["Published SOP version", _jsxs("select", { value: referenceVersionId, onChange: event => setReferenceVersionId(event.target.value), children: [_jsx("option", { value: "", children: "Choose a version" }), detail.versions.filter(version => detail.publications.some(publication => publication.versionId === version.id)).map(version => _jsxs("option", { value: version.id, children: ["Version ", version.version] }, version.id))] })] }), _jsxs("label", { children: ["Reference target", _jsxs("select", { value: referenceTargetType, onChange: event => { setReferenceTargetType(event.target.value); setReferenceTargetId(""); }, children: [_jsx("option", { value: "task", children: "Task" }), _jsx("option", { value: "template", children: "Project template" })] })] }), _jsxs("label", { children: [referenceTargetType === "task" ? "Eligible task" : "Exact template version", _jsxs("select", { value: referenceTargetId, onChange: event => setReferenceTargetId(event.target.value), children: [_jsx("option", { value: "", children: "Choose target" }), referenceTargetType === "task" ? setup.referenceTargets.tasks.map(target => _jsx("option", { value: target.id, children: target.title }, target.id)) : setup.referenceTargets.templateVersions.map(target => _jsxs("option", { value: target.id, children: [target.name, " \u00B7 Version ", target.version] }, target.id))] })] }), _jsxs("label", { children: ["Reason", _jsx("textarea", { value: reason, onChange: event => setReason(event.target.value), minLength: 3, maxLength: 1000, rows: 2 })] }), _jsx("button", { type: "button", disabled: pending || !referenceVersionId || !referenceTargetId || reason.trim().length < 3, onClick: () => void mutate(`${API}/references`, { versionId: referenceVersionId, ...(referenceTargetType === "task" ? { taskId: referenceTargetId } : { templateVersionId: referenceTargetId }), reason: reason.trim() }, "Exact SOP reference recorded."), children: "Save reference" })] }), selectedVersion && _jsxs("p", { children: ["Selected exact SOP version ", selectedVersion.version, "; references never switch to a newer version automatically."] })] })] }) : _jsx("section", { className: "library-panel", children: _jsx("p", { className: "library-empty", role: "status", children: selectedId ? error ? "The selected Library record is unavailable." : "Loading selected Library record…" : "Choose a record to view its version history." }) }) })] })] });
}
function ContentEditor({ blocks, setBlocks, changeBlock, addBlock, onUpload, uploadType, setUploadType, allowUpload, referenceTargets }) {
    return _jsxs("fieldset", { className: "library-content-editor library-wide", children: [_jsx("legend", { children: "Structured content" }), blocks.map((block, index) => _jsxs("div", { className: "library-block", children: [_jsxs("div", { className: "library-block-heading", children: [_jsx("strong", { children: String(block.type) }), _jsx("button", { className: "library-text-button", type: "button", disabled: blocks.length <= 1, onClick: () => setBlocks(current => current.filter((_, position) => position !== index)), children: "Remove" })] }), block.type === "TEXT" && _jsxs("label", { children: ["Text", _jsx("textarea", { value: String(block.text ?? ""), onChange: event => changeBlock(index, "text", event.target.value), maxLength: 2000, rows: 3, required: true })] }), block.type === "LINK" && _jsxs("div", { className: "library-form", children: [_jsxs("label", { children: ["Label", _jsx("input", { value: String(block.label ?? ""), onChange: event => changeBlock(index, "label", event.target.value), maxLength: 160 })] }), _jsxs("label", { children: ["HTTP(S) URL", _jsx("input", { type: "url", value: String(block.url ?? ""), onChange: event => changeBlock(index, "url", event.target.value) })] })] }), block.type === "CHECKLIST" && _jsxs("div", { children: [_jsxs("label", { children: ["Checklist items", _jsx("textarea", { value: Array.isArray(block.items) ? block.items.join("\n") : "", onChange: event => changeBlock(index, "items", event.target.value.split("\n")), maxLength: 6000, rows: 3 })] }), _jsx("small", { children: "One item per line, up to 30 items." })] }), block.type === "SOP" && _jsxs("label", { children: ["Exact published SOP version", _jsxs("select", { value: String(block.versionId ?? ""), onChange: event => changeBlock(index, "versionId", event.target.value), children: [_jsx("option", { value: "", children: "Choose a published version" }), referenceTargets.sopVersions.map(target => _jsxs("option", { value: target.id, children: [target.title, " \u00B7 Version ", target.version] }, target.id))] })] }), ["FILE", "IMAGE", "PDF", "VIDEO", "TEMPLATE"].includes(String(block.type)) && _jsxs("div", { className: "library-upload-row", children: [allowUpload ? _jsxs("label", { children: ["Upload private file", _jsx("input", { type: "file", onChange: event => { const file = event.currentTarget.files?.[0]; if (file)
                                            onUpload(file, index); } })] }) : _jsx("p", { children: "Save the record first, then attach a private file to its version." }), String(block.fileId ?? "") && _jsx("span", { children: "Private file attached" })] })] }, `${String(block.type)}-${index}`)), _jsxs("div", { className: "library-add-block", children: [allowUpload && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Add file block", _jsxs("select", { value: uploadType, onChange: event => setUploadType(event.target.value), children: [_jsx("option", { value: "FILE", children: "FILE" }), _jsx("option", { value: "IMAGE", children: "IMAGE" }), _jsx("option", { value: "PDF", children: "PDF" }), _jsx("option", { value: "VIDEO", children: "VIDEO" }), _jsx("option", { value: "TEMPLATE", children: "TEMPLATE" })] })] }), _jsx("button", { className: "library-secondary", type: "button", onClick: () => addBlock(uploadType), children: "Add file block" })] }), _jsx("button", { className: "library-secondary", type: "button", onClick: () => addBlock("TEXT"), children: "Add text" }), _jsx("button", { className: "library-secondary", type: "button", onClick: () => addBlock("LINK"), children: "Add link" }), _jsx("button", { className: "library-secondary", type: "button", onClick: () => addBlock("CHECKLIST"), children: "Add checklist" }), _jsx("button", { className: "library-secondary", type: "button", onClick: () => addBlock("SOP"), children: "Add SOP" })] })] });
}
function AssessmentEditor({ criteria, setCriteria, prompt, setPrompt, options, setOptions, correctIndex, setCorrectIndex, minimumCorrect, setMinimumCorrect, practicalRequired, setPracticalRequired }) {
    return _jsxs("fieldset", { className: "library-assessment library-wide", children: [_jsx("legend", { children: "Training assessment" }), _jsxs("label", { children: ["Assessment criteria", _jsx("textarea", { value: criteria, onChange: event => setCriteria(event.target.value), maxLength: 4000, rows: 3 })] }), _jsxs("label", { children: ["Quiz question", _jsx("input", { value: prompt, onChange: event => setPrompt(event.target.value), maxLength: 1000 })] }), options.map((option, index) => _jsxs("label", { children: ["Option ", index + 1, _jsx("input", { value: option, onChange: event => setOptions(options.map((value, position) => position === index ? event.target.value : value)), maxLength: 500 })] }, index)), _jsxs("div", { className: "library-form", children: [_jsxs("label", { children: ["Correct option", _jsx("select", { value: correctIndex, onChange: event => setCorrectIndex(Number(event.target.value)), children: options.map((_, index) => _jsxs("option", { value: index, children: ["Option ", index + 1] }, index)) })] }), _jsxs("label", { children: ["Minimum correct", _jsx("input", { type: "number", min: 0, max: prompt.trim() ? 1 : 0, required: !!prompt.trim(), value: minimumCorrect, onChange: event => setMinimumCorrect(event.target.value) })] })] }), _jsxs("label", { className: "library-inline", children: [_jsx("input", { type: "checkbox", checked: practicalRequired, onChange: event => setPracticalRequired(event.target.checked) }), " Practical review required"] })] });
}
function ContentView({ version, referenceTargets }) {
    return _jsxs("div", { className: "library-content-view", children: [version.content.blocks.map((block, index) => _jsxs("div", { className: "library-view-block", children: [block.type === "TEXT" && _jsx("p", { children: String(block.text) }), block.type === "LINK" && _jsx("p", { children: _jsx("a", { href: String(block.url), target: "_blank", rel: "noreferrer", children: String(block.label) }) }), block.type === "CHECKLIST" && _jsx("ul", { children: Array.isArray(block.items) && block.items.map((item, i) => _jsx("li", { children: String(item) }, i)) }), block.type === "SOP" && (() => { const target = referenceTargets.sopVersions.find(candidate => candidate.id === block.versionId); return target ? _jsxs("p", { children: ["Exact SOP reference: ", target.title, " \u00B7 Version ", target.version] }) : _jsx("p", { children: "Exact SOP reference is unavailable to your current access." }); })(), ["FILE", "IMAGE", "PDF", "VIDEO", "TEMPLATE"].includes(String(block.type)) && (() => { const file = version.files.find(candidate => candidate.id === block.fileId); return file ? _jsxs("a", { href: `${API}/files/${encodeURIComponent(file.id)}/stream`, rel: "noreferrer", children: [file.name, " \u00B7 ", file.mime, " \u00B7 ", file.bytes.toLocaleString(), " bytes \u00B7 Open private file"] }) : _jsx("span", { children: "Private file metadata is unavailable for this version." }); })()] }, `${String(block.type)}-${index}`)), version.content.assessment && _jsxs("div", { className: "library-assessment-view", children: [_jsx("strong", { children: "Training assessment" }), _jsx("p", { children: String(version.content.assessment.criteria ?? "") }), Array.isArray(version.content.assessment.quiz) && version.content.assessment.quiz.map((question, index) => _jsxs("div", { children: [_jsx("strong", { children: String(question.prompt) }), _jsx("ul", { children: Array.isArray(question.options) && question.options.map((option, optionIndex) => _jsx("li", { children: String(option.label) }, optionIndex)) })] }, index)), _jsx("p", { children: version.content.assessment.practicalRequired ? "Practical review required" : "Practical review optional" })] })] });
}
