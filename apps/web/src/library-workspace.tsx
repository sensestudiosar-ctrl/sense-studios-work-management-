import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowSearchParams } from "./use-window-search-params.js";
import "./library-workspace.css";

const API = "/api/v1/library";
const CHUNK_SIZE = 8 * 1024 * 1024;
type Kind = "SOP" | "KNOWLEDGE" | "MODULE";
type Audience = "ORGANIZATION" | "BRANCH" | "TEAM";
type FileSummary = { id: string; name: string; mime: string; bytes: number; checksum: string; createdAt: string };
type Version = { id: string; version: number; content: { blocks: Array<Record<string, unknown>>; assessment?: Record<string, unknown> }; acknowledgementRequired: boolean; reason: string; createdAt: string; acknowledged: boolean; files: FileSummary[] };
type Capabilities = { canAppend: boolean; canUpload: boolean; canActivate: boolean; canRequestPublication: boolean; canPublishDirect: boolean };
type Item = { id: string; kind: Kind; audience: Audience; branchId: string | null; teamId: string | null; title: string; category: string; version: number; publishedVersionId: string | null; publishedVersion: number | null; draft: boolean; capabilities: Capabilities };
type Publisher = { accountId: string; label: string };
type Detail = { record: Item & { createdAt: string }; versions: Version[]; publications: Array<{ id: string; versionId: string; approvalRequestId: string | null; reason: string; publishedAt: string }>; eligiblePublisherIds: Publisher[]; publicationRequests: Array<{ id: string; versionId: string; approverLabel: string; requesterLabel: string; state: string; requestedAt: string; reason: string; canDecide: boolean }> };
type Scope = { audience: Audience; branchId: string | null; teamId: string | null; label: string };
type ReferenceTargets = { tasks: Array<{ id: string; title: string }>; templateVersions: Array<{ id: string; name: string; version: number }>; sopVersions: Array<{ id: string; title: string; version: number }> };
type Setup = { kinds: Kind[]; audiences: Audience[]; branches: Array<{ id: string; name: string }>; teams: Array<{ id: string; name: string; branchId: string }>; authorAudienceOptions: Record<Kind, Scope[]>; referenceTargets: ReferenceTargets; categories: Record<Kind, string[]>; capabilities: { createKnowledgeSuggestion: boolean; activateModule: boolean } };
class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }
const commandId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
async function api<T>(url: string, csrf: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); headers.set("X-CSRF-Token", csrf); if (typeof init.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers, credentials: "include" });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
  if (!response.ok) throw new ApiError(body.error?.message ?? body.message ?? `Request failed (${response.status})`, response.status);
  return body as T;
}
const reasonOf = (cause: unknown) => cause instanceof ApiError && cause.status === 409 ? "The Library changed while you were working. Current history has been reloaded; review it before retrying." : cause instanceof ApiError && cause.status === 403 ? "Your Library access changed. Current access and content have been reloaded." : cause instanceof Error ? cause.message : "The Library request failed.";
const defaultBlock = () => ({ type: "TEXT", text: "" });

export function LibraryWorkspace({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  const [searchParams, setSearchParams] = useWindowSearchParams();
  const queryKind = searchParams.get("kind") ?? "";
  const querySearch = searchParams.get("search") ?? "";
  const queryRecordId = searchParams.get("recordId") ?? "";
  const queryVersionId = searchParams.get("versionId") ?? "";
  const [setup, setSetup] = useState<Setup | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [filterKind, setFilterKind] = useState<Kind | "">(() => ["SOP", "KNOWLEDGE", "MODULE"].includes(queryKind) ? queryKind as Kind : "");
  const [search, setSearch] = useState(querySearch);
  const [selectedId, setSelectedIdState] = useState(queryRecordId);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<Kind>("SOP");
  const [audienceKey, setAudienceKey] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledgementRequired, setAcknowledgementRequired] = useState(false);
  const [blocks, setBlocks] = useState<Array<Record<string, unknown>>>([defaultBlock()]);
  const [assessmentCriteria, setAssessmentCriteria] = useState("");
  const [quizPrompt, setQuizPrompt] = useState("");
  const [quizOptions, setQuizOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [minimumCorrect, setMinimumCorrect] = useState("");
  const [practicalRequired, setPracticalRequired] = useState(false);
  const [approverId, setApproverId] = useState("");
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [referenceVersionId, setReferenceVersionId] = useState("");
  const [referenceTargetType, setReferenceTargetType] = useState<"task" | "template">("task");
  const [referenceTargetId, setReferenceTargetId] = useState("");
  const detailRequest = useRef(0);
  const [uploadBlockType, setUploadBlockType] = useState<"FILE" | "IMAGE" | "PDF" | "VIDEO" | "TEMPLATE">("FILE");

  const updateLibraryQuery = useCallback((changes: Partial<Record<"kind" | "search" | "recordId" | "versionId", string>>, replace = false) => {
    setSearchParams(current => { const next = new URLSearchParams(current); for (const [key, value] of Object.entries(changes)) { if (value) next.set(key, value); else next.delete(key); } return next; }, { replace });
  }, [setSearchParams]);
  const setSelectedId = useCallback((id: string, replace = false) => { setSelectedIdState(id); updateLibraryQuery({ recordId: id, ...(id !== queryRecordId ? { versionId: "" } : {}) }, replace); }, [queryRecordId, updateLibraryQuery]);
  useEffect(() => {
    setFilterKind(["SOP", "KNOWLEDGE", "MODULE"].includes(queryKind) ? queryKind as Kind : "");
    setSearch(querySearch);
    setSelectedIdState(queryRecordId);
  }, [queryKind, querySearch, queryRecordId]);

  const loadSetup = useCallback(async () => setSetup(await api<Setup>(`${API}/setup`, csrfToken)), [csrfToken]);
  const loadList = useCallback(async () => {
    const params = new URLSearchParams(); if (filterKind) params.set("kind", filterKind); if (search.trim()) params.set("search", search.trim());
    const result = await api<{ items: Item[] }>(`${API}${params.size ? `?${params}` : ""}`, csrfToken);
    const requestedRecordId = new URLSearchParams(window.location.search).get("recordId");
    setItems(result.items); setSelectedIdState(current => requestedRecordId ? (result.items.some(item => item.id === requestedRecordId) ? requestedRecordId : "") : current ? (result.items.some(item => item.id === current) ? current : "") : result.items[0]?.id ?? "");
    if (requestedRecordId && !result.items.some(item => item.id === requestedRecordId)) updateLibraryQuery({ recordId: "" }, true);
  }, [csrfToken, filterKind, search, updateLibraryQuery]);
  const loadDetail = useCallback(async (id: string) => {
    const request = ++detailRequest.current;
    if (!id) { setDetail(null); return; }
    const result = await api<Detail>(`${API}/${encodeURIComponent(id)}`, csrfToken);
    if (request === detailRequest.current) setDetail(result);
  }, [csrfToken]);
  const refresh = useCallback(async () => { await Promise.all([loadSetup(), loadList()]); }, [loadList, loadSetup]);
  useEffect(() => { let active = true; setLoading(true); setError(""); void Promise.all([loadSetup(), loadList()]).catch(cause => { if (active) setError(reasonOf(cause)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [loadList, loadSetup]);
  useEffect(() => { let active = true; if (selectedId) void loadDetail(selectedId).catch(cause => { if (active) { setDetail(null); setError(reasonOf(cause)); } }); else setDetail(null); return () => { active = false; }; }, [loadDetail, selectedId]);
  useEffect(() => {
    if (!detail || detail.record.id !== selectedId || !queryVersionId) return;
    if (!detail.versions.some(version => version.id === queryVersionId)) { updateLibraryQuery({ versionId: "" }, true); return; }
    document.getElementById(`library-version-${queryVersionId}`)?.focus({ preventScroll: false });
  }, [detail, queryVersionId, selectedId, updateLibraryQuery]);
  const options = setup?.authorAudienceOptions[kind] ?? [];
  const activeScope = options.find(scope => `${scope.audience}:${scope.branchId ?? ""}:${scope.teamId ?? ""}` === audienceKey) ?? options[0];
  const selectedVersion = useMemo(() => detail?.versions.find(version => version.id === referenceVersionId), [detail, referenceVersionId]);
  const canCreate = !!setup && Object.values(setup.authorAudienceOptions).some(scopes => scopes.length > 0);

  const recover = async (cause: unknown) => { setError(reasonOf(cause)); if (cause instanceof ApiError && (cause.status === 403 || cause.status === 404)) { detailRequest.current++; setDetail(null); setSelectedId(""); setItems([]); } try { await refresh(); if (selectedId && !(cause instanceof ApiError && (cause.status === 403 || cause.status === 404))) await loadDetail(selectedId); } catch { /* keep the original access/conflict message visible */ } };
  const mutate = async (url: string, body: Record<string, unknown>, success: string, afterSuccess?: () => void) => {
    setPending(true); setError(""); setNotice("");
    try { await api(url, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), ...body }) }); await refresh(); if (selectedId) await loadDetail(selectedId); afterSuccess?.(); setNotice(success); }
    catch (cause) { await recover(cause); }
    finally { setPending(false); }
  };
  const addBlock = (type: string) => setBlocks(current => [...current, type === "TEXT" ? { type, text: "" } : type === "CHECKLIST" ? { type, items: [""] } : type === "LINK" ? { type, label: "", url: "https://" } : type === "SOP" ? { type, versionId: "" } : { type, fileId: "" }]);
  const changeBlock = (index: number, key: string, value: unknown) => setBlocks(current => current.map((block, i) => i === index ? { ...block, [key]: value } : block));
  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault(); if (!activeScope || quizPrompt.trim() && minimumCorrect === "") { setError("Enter an explicit minimum correct score for the quiz."); return; }
    const content: Record<string, unknown> = { blocks: blocks.map(block => ({ ...block, ...(block.type === "CHECKLIST" && Array.isArray(block.items) ? { items: block.items.map(String).filter(text => text.trim()) } : {}) })) };
    if (kind === "MODULE" && assessmentCriteria.trim()) {
      const questionId = commandId(), optionIds = quizOptions.map(() => commandId());
      content.assessment = { criteria: assessmentCriteria.trim(), practicalRequired, ...(quizPrompt.trim() ? { quiz: [{ id: questionId, prompt: quizPrompt.trim(), options: quizOptions.map((label, index) => ({ id: optionIds[index], label: label.trim() })), correctOptionIds: [optionIds[correctIndex]!] }], minimumCorrect: Number(minimumCorrect) } : {}) };
    }
    setPending(true); setError(""); setNotice("");
    try {
      const created = await api<{ record: { id: string } }>(API, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), kind, title: title.trim(), category: category.trim(), audience: activeScope.audience, ...(activeScope.branchId ? { branchId: activeScope.branchId } : {}), ...(activeScope.teamId ? { teamId: activeScope.teamId } : {}), content, acknowledgementRequired, reason: reason.trim() }) });
      setCreating(false); setTitle(""); setReason(""); setBlocks([defaultBlock()]); setNotice("Library record created."); await refresh(); setSelectedId(created.record.id); await loadDetail(created.record.id);
    } catch (cause) { await recover(cause); }
    finally { setPending(false); }
  };
  const saveVersion = async (event: React.FormEvent) => {
    event.preventDefault(); if (!detail || detail.record.id !== selectedId) return; if (detail.record.kind === "MODULE" && quizPrompt.trim() && minimumCorrect === "") { setError("Enter an explicit minimum correct score for the quiz."); return; }
    const content: Record<string, unknown> = { blocks: blocks.map(block => ({ ...block })) };
    if (detail.record.kind === "MODULE" && assessmentCriteria.trim()) {
      const questionId = commandId(), optionIds = quizOptions.map(() => commandId());
      content.assessment = { criteria: assessmentCriteria.trim(), practicalRequired, ...(quizPrompt.trim() ? { quiz: [{ id: questionId, prompt: quizPrompt.trim(), options: quizOptions.map((label, index) => ({ id: optionIds[index], label: label.trim() })), correctOptionIds: [optionIds[correctIndex]!] }], minimumCorrect: Number(minimumCorrect) } : {}) };
    }
    await mutate(`${API}/${detail.record.id}/versions`, { expectedVersion: detail.record.version, content, acknowledgementRequired, reason: reason.trim() }, "New version saved.", () => { setReason(""); setBlocks([defaultBlock()]); });
  };
  const uploadFile = async (file: File, blockIndex: number) => {
    if (!detail || detail.record.id !== selectedId) return;
    setPending(true); setError(""); setNotice("");
    try {
      const started = await api<{ uploadId: string; chunkSize: number; chunkCount: number }>(`${API}/${detail.record.id}/uploads`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), reason: "Attach file to Library record", name: file.name, mime: file.type || "application/octet-stream", bytes: file.size }) });
      for (let index = 0; index < started.chunkCount; index++) {
        const chunk = file.slice(index * CHUNK_SIZE, Math.min(file.size, (index + 1) * CHUNK_SIZE));
        const bytes = await chunk.arrayBuffer();
        const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(value => value.toString(16).padStart(2, "0")).join("");
        await api(`${API}/uploads/${started.uploadId}/chunks/${index}`, csrfToken, { method: "PUT", headers: { "Content-Type": "application/octet-stream", "X-Chunk-SHA256": checksum }, body: bytes });
      }
      const result = await api<FileSummary>(`${API}/uploads/${started.uploadId}/finalize`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), reason: "Finalize private Library upload" }) });
      changeBlock(blockIndex, "fileId", result.id); setNotice("File uploaded privately. Save the version to attach it to this content.");
    } catch (cause) { await recover(cause); }
    finally { setPending(false); }
  };
  const requestPublish = () => detail && void mutate(`${API}/${detail.record.id}/publication-requests`, { versionId: detail.versions[0]?.id, approverAccountId: approverId, reason: reason.trim() }, "Publication request sent to the named publisher.");
  const decidePublish = (requestId: string, outcome: "APPROVED" | "REJECTED") => detail && void mutate(`${API}/publication-requests/${requestId}/decision`, { outcome, reason: decisionReasons[requestId]?.trim() ?? "" }, outcome === "APPROVED" ? "Version published." : "Publication request rejected.");

  if (loading) return <section className="library-workspace" aria-busy="true"><p role="status">Loading Library…</p></section>;
  if (!setup) return <section className="library-workspace"><h2>Library</h2><div className="library-alert" role="alert">{error || "The Library is unavailable."}</div><button type="button" onClick={() => { setLoading(true); void refresh().catch(cause => setError(reasonOf(cause))).finally(() => setLoading(false)); }}>Retry</button></section>;
  return <section className="library-workspace" aria-busy={pending || Boolean(selectedId && !error && detail?.record.id !== selectedId)}>
    <header className="library-heading"><div><p className="library-eyebrow">Private company reference</p><h2>Library</h2><p>Versioned SOPs, shared knowledge and training modules for your current access.</p></div>{canCreate && <button type="button" onClick={() => { setCreating(value => !value); setError(""); }}>{creating ? "Close form" : "Create record"}</button>}</header>
    {error && <div className="library-alert" role="alert">{error}</div>}{notice && <div className="library-notice" role="status">{notice}</div>}
    <div className="library-toolbar"><label>Kind<select value={filterKind} onChange={event => { const value = event.target.value as Kind | ""; setFilterKind(value); updateLibraryQuery({ kind: value }, true); }}><option value="">All Library content</option>{setup.kinds.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label>Search titles and accessible text<input value={search} onChange={event => { setSearch(event.target.value); updateLibraryQuery({ search: event.target.value }, true); }} maxLength={120} placeholder="Search the Library" /></label></div>
    {creating && <section className="library-panel"><h3>Create a Library record</h3><form className="library-form" onSubmit={submitCreate}>
      <label>Type<select value={kind} onChange={event => { setKind(event.target.value as Kind); setAudienceKey(""); setCategory(""); }}>{setup.kinds.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Audience<select value={audienceKey || (options[0] ? `${options[0].audience}:${options[0].branchId ?? ""}:${options[0].teamId ?? ""}` : "")} onChange={event => setAudienceKey(event.target.value)}>{options.map(scope => <option key={`${scope.audience}:${scope.branchId}:${scope.teamId}`} value={`${scope.audience}:${scope.branchId ?? ""}:${scope.teamId ?? ""}`}>{scope.audience} · {scope.label}</option>)}</select></label>
      <label>Title<input value={title} onChange={event => setTitle(event.target.value)} required maxLength={160} /></label>
      {(setup.categories[kind]?.length ?? 0) > 0 ? <label>Category<select value={category} onChange={event => setCategory(event.target.value)} required><option value="">Choose category</option>{setup.categories[kind].map(value => <option key={value}>{value}</option>)}</select></label> : <label>Category<input value={category} onChange={event => setCategory(event.target.value)} required maxLength={80} /></label>}
      <ContentEditor blocks={blocks} setBlocks={setBlocks} changeBlock={changeBlock} addBlock={addBlock} onUpload={uploadFile} uploadType={uploadBlockType} setUploadType={setUploadBlockType} allowUpload={false} referenceTargets={setup.referenceTargets} />
      {kind === "MODULE" && <AssessmentEditor criteria={assessmentCriteria} setCriteria={setAssessmentCriteria} prompt={quizPrompt} setPrompt={setQuizPrompt} options={quizOptions} setOptions={setQuizOptions} correctIndex={correctIndex} setCorrectIndex={setCorrectIndex} minimumCorrect={minimumCorrect} setMinimumCorrect={setMinimumCorrect} practicalRequired={practicalRequired} setPracticalRequired={setPracticalRequired} />}
      <label className="library-inline"><input type="checkbox" checked={acknowledgementRequired} onChange={event => setAcknowledgementRequired(event.target.checked)} /> Require acknowledgement for this version</label>
      <label className="library-wide">Reason<textarea value={reason} onChange={event => setReason(event.target.value)} required minLength={3} maxLength={1000} rows={2} /></label>
      <button type="submit" disabled={pending || !title.trim() || !category || !activeScope || reason.trim().length < 3 || quizPrompt.trim().length > 0 && minimumCorrect === "" || blocks.some(block => block.type === "TEXT" && !String(block.text ?? "").trim())}>Create draft</button>
    </form></section>}
    <div className="library-layout"><aside className="library-panel"><div className="library-section-heading"><h3>Records</h3><span>{items.length}</span></div>{items.length === 0 ? <p className="library-empty" role="status">No accessible records match these filters.</p> : <div className="library-record-list">{items.map(item => <button type="button" className={`library-record ${selectedId === item.id ? "is-selected" : ""}`} key={item.id} onClick={() => setSelectedId(item.id)}><strong>{item.title}</strong><span>{item.kind} · {item.category}</span><small>{item.audience} · {item.publishedVersion ? `Published v${item.publishedVersion}` : item.draft ? "Draft" : "Not published"}</small></button>)}</div>}</aside>
      <div className="library-detail">{detail && detail.record.id === selectedId ? <>
        <section className="library-panel"><div className="library-section-heading"><div><p className="library-eyebrow">{detail.record.kind} · {detail.record.audience}</p><h3>{detail.record.title}</h3><p>{detail.record.category} · Current version {detail.record.version}</p></div><button className="library-secondary" type="button" onClick={() => { void loadDetail(detail.record.id).catch(recover); }}>Refresh</button></div>
          <div className="library-capabilities">{detail.record.capabilities.canAppend && <span>Author access</span>}{detail.record.capabilities.canRequestPublication && <span>Publisher review required</span>}{detail.record.capabilities.canActivate && <span>Training management</span>}</div>
          {detail.versions.map(version => <article className={`library-version ${queryVersionId === version.id ? "is-focused" : ""}`} id={`library-version-${version.id}`} tabIndex={queryVersionId === version.id ? -1 : undefined} key={version.id}><div className="library-version-heading"><div><strong>Version {version.version}{detail.record.publishedVersionId === version.id ? " · Published" : ""}</strong><p>{version.reason} · {new Date(version.createdAt).toLocaleString()}</p></div><div className="library-version-actions">{queryVersionId === version.id ? <span>Selected exact version</span> : <button className="library-text-button" type="button" onClick={() => updateLibraryQuery({ versionId: version.id })}>View this version</button>}{version.acknowledgementRequired && <span>{version.acknowledged ? "Acknowledged" : "Acknowledgement required"}</span>}</div></div>
            <ContentView version={version} referenceTargets={setup.referenceTargets} />
            {version.acknowledgementRequired && !version.acknowledged && detail.publications.some(publication => publication.versionId === version.id) && <button type="button" disabled={pending} onClick={() => void mutate(`${API}/versions/${version.id}/acknowledgements`, { reason: "I have read and acknowledge this published version." }, "Acknowledgement recorded for this exact version.")}>Acknowledge version {version.version}</button>}
          </article>)}
          {detail.record.capabilities.canAppend && <form className="library-form library-version-form" onSubmit={saveVersion}><h4 className="library-wide">Add a new version</h4><p className="library-wide">A new version replaces its content; add the blocks and assessment you want retained.</p><ContentEditor blocks={blocks} setBlocks={setBlocks} changeBlock={changeBlock} addBlock={addBlock} onUpload={uploadFile} uploadType={uploadBlockType} setUploadType={setUploadBlockType} allowUpload={detail.record.capabilities.canUpload} referenceTargets={setup.referenceTargets} />{detail.record.kind === "MODULE" && <AssessmentEditor criteria={assessmentCriteria} setCriteria={setAssessmentCriteria} prompt={quizPrompt} setPrompt={setQuizPrompt} options={quizOptions} setOptions={setQuizOptions} correctIndex={correctIndex} setCorrectIndex={setCorrectIndex} minimumCorrect={minimumCorrect} setMinimumCorrect={setMinimumCorrect} practicalRequired={practicalRequired} setPracticalRequired={setPracticalRequired} />}<label className="library-inline"><input type="checkbox" checked={acknowledgementRequired} onChange={event => setAcknowledgementRequired(event.target.checked)} /> Require acknowledgement</label><label className="library-wide">Reason<textarea value={reason} onChange={event => setReason(event.target.value)} required minLength={3} maxLength={1000} rows={2} /></label><button type="submit" disabled={pending || reason.trim().length < 3 || detail.record.kind === "MODULE" && quizPrompt.trim().length > 0 && minimumCorrect === ""}>Save version</button></form>}
        </section>
        <section className="library-panel"><h3>Publication and activation</h3>
          {detail.record.capabilities.canActivate && <button type="button" disabled={pending || reason.trim().length < 3} onClick={() => void mutate(`${API}/${detail.record.id}/activate`, { expectedVersion: detail.record.version, reason: reason.trim() }, "Training module activated.")}>Activate current module version</button>}
          {detail.record.capabilities.canRequestPublication && <div className="library-action-form"><label>Eligible publisher<select value={approverId} onChange={event => setApproverId(event.target.value)}><option value="">Choose a different publisher</option>{detail.eligiblePublisherIds.map(person => <option key={person.accountId} value={person.accountId}>{person.label}</option>)}</select></label><label>Reason<textarea value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={1000} rows={2} /></label><button type="button" disabled={pending || !approverId || reason.trim().length < 3} onClick={requestPublish}>Request publication of version {detail.versions[0]?.version}</button></div>}
          {detail.record.capabilities.canPublishDirect && <div className="library-action-form"><label>Owner publication reason<textarea value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={1000} rows={2} /></label><button type="button" disabled={pending || reason.trim().length < 3 || !detail.versions[0]} onClick={() => void mutate(`${API}/${detail.record.id}/publish`, { versionId: detail.versions[0]?.id, reason: reason.trim() }, "Version published by Owner.")}>Publish current version</button></div>}
          {detail.publicationRequests.map(request => <article className="library-request" key={request.id}><strong>Version {detail.versions.find(version => version.id === request.versionId)?.version ?? "—"} · {request.state}</strong><p>By {request.requesterLabel} · Publisher {request.approverLabel} · {request.reason}</p>{request.canDecide && <div className="library-action-form"><label>Decision reason<textarea value={decisionReasons[request.id] ?? ""} onChange={event => setDecisionReasons(current => ({ ...current, [request.id]: event.target.value }))} minLength={3} maxLength={1000} rows={2} /></label><div className="library-actions"><button type="button" disabled={pending || (decisionReasons[request.id]?.trim().length ?? 0) < 3} onClick={() => decidePublish(request.id, "APPROVED")}>Approve and publish</button><button className="library-secondary" type="button" disabled={pending || (decisionReasons[request.id]?.trim().length ?? 0) < 3} onClick={() => decidePublish(request.id, "REJECTED")}>Reject</button></div></div>}</article>)}
          {detail.publications.map(publication => <p className="library-publication" key={publication.id}>Published {new Date(publication.publishedAt).toLocaleString()} · {publication.reason}</p>)}
        </section>
          {detail.record.kind === "SOP" && <section className="library-panel"><h3>Reference this exact SOP version</h3><div className="library-action-form"><label>Published SOP version<select value={referenceVersionId} onChange={event => setReferenceVersionId(event.target.value)}><option value="">Choose a version</option>{detail.versions.filter(version => detail.publications.some(publication => publication.versionId === version.id)).map(version => <option key={version.id} value={version.id}>Version {version.version}</option>)}</select></label><label>Reference target<select value={referenceTargetType} onChange={event => { setReferenceTargetType(event.target.value as "task" | "template"); setReferenceTargetId(""); }}><option value="task">Task</option><option value="template">Project template</option></select></label><label>{referenceTargetType === "task" ? "Eligible task" : "Exact template version"}<select value={referenceTargetId} onChange={event => setReferenceTargetId(event.target.value)}><option value="">Choose target</option>{referenceTargetType === "task" ? setup.referenceTargets.tasks.map(target => <option key={target.id} value={target.id}>{target.title}</option>) : setup.referenceTargets.templateVersions.map(target => <option key={target.id} value={target.id}>{target.name} · Version {target.version}</option>)}</select></label><label>Reason<textarea value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={1000} rows={2} /></label><button type="button" disabled={pending || !referenceVersionId || !referenceTargetId || reason.trim().length < 3} onClick={() => void mutate(`${API}/references`, { versionId: referenceVersionId, ...(referenceTargetType === "task" ? { taskId: referenceTargetId } : { templateVersionId: referenceTargetId }), reason: reason.trim() }, "Exact SOP reference recorded.")}>Save reference</button></div>{selectedVersion && <p>Selected exact SOP version {selectedVersion.version}; references never switch to a newer version automatically.</p>}</section>}
      </> : <section className="library-panel"><p className="library-empty" role="status">{selectedId ? error ? "The selected Library record is unavailable." : "Loading selected Library record…" : "Choose a record to view its version history."}</p></section>}</div>
    </div>
  </section>;
}

function ContentEditor({ blocks, setBlocks, changeBlock, addBlock, onUpload, uploadType, setUploadType, allowUpload, referenceTargets }: { blocks: Array<Record<string, unknown>>; setBlocks: React.Dispatch<React.SetStateAction<Array<Record<string, unknown>>>>; changeBlock: (index: number, key: string, value: unknown) => void; addBlock: (type: string) => void; onUpload: (file: File, blockIndex: number) => void; uploadType: "FILE" | "IMAGE" | "PDF" | "VIDEO" | "TEMPLATE"; setUploadType: (value: "FILE" | "IMAGE" | "PDF" | "VIDEO" | "TEMPLATE") => void; allowUpload: boolean; referenceTargets: ReferenceTargets }): React.JSX.Element {
  return <fieldset className="library-content-editor library-wide"><legend>Structured content</legend>{blocks.map((block, index) => <div className="library-block" key={`${String(block.type)}-${index}`}><div className="library-block-heading"><strong>{String(block.type)}</strong><button className="library-text-button" type="button" disabled={blocks.length <= 1} onClick={() => setBlocks(current => current.filter((_, position) => position !== index))}>Remove</button></div>
    {block.type === "TEXT" && <label>Text<textarea value={String(block.text ?? "")} onChange={event => changeBlock(index, "text", event.target.value)} maxLength={2000} rows={3} required /></label>}
    {block.type === "LINK" && <div className="library-form"><label>Label<input value={String(block.label ?? "")} onChange={event => changeBlock(index, "label", event.target.value)} maxLength={160} /></label><label>HTTP(S) URL<input type="url" value={String(block.url ?? "")} onChange={event => changeBlock(index, "url", event.target.value)} /></label></div>}
    {block.type === "CHECKLIST" && <div><label>Checklist items<textarea value={Array.isArray(block.items) ? block.items.join("\n") : ""} onChange={event => changeBlock(index, "items", event.target.value.split("\n"))} maxLength={6000} rows={3} /></label><small>One item per line, up to 30 items.</small></div>}
    {block.type === "SOP" && <label>Exact published SOP version<select value={String(block.versionId ?? "")} onChange={event => changeBlock(index, "versionId", event.target.value)}><option value="">Choose a published version</option>{referenceTargets.sopVersions.map(target => <option key={target.id} value={target.id}>{target.title} · Version {target.version}</option>)}</select></label>}
    {["FILE", "IMAGE", "PDF", "VIDEO", "TEMPLATE"].includes(String(block.type)) && <div className="library-upload-row">{allowUpload ? <label>Upload private file<input type="file" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onUpload(file, index); }} /></label> : <p>Save the record first, then attach a private file to its version.</p>}{String(block.fileId ?? "") && <span>Private file attached</span>}</div>}
  </div>)}<div className="library-add-block">{allowUpload && <><label>Add file block<select value={uploadType} onChange={event => setUploadType(event.target.value as typeof uploadType)}><option value="FILE">FILE</option><option value="IMAGE">IMAGE</option><option value="PDF">PDF</option><option value="VIDEO">VIDEO</option><option value="TEMPLATE">TEMPLATE</option></select></label><button className="library-secondary" type="button" onClick={() => addBlock(uploadType)}>Add file block</button></>}<button className="library-secondary" type="button" onClick={() => addBlock("TEXT")}>Add text</button><button className="library-secondary" type="button" onClick={() => addBlock("LINK")}>Add link</button><button className="library-secondary" type="button" onClick={() => addBlock("CHECKLIST")}>Add checklist</button><button className="library-secondary" type="button" onClick={() => addBlock("SOP")}>Add SOP</button></div></fieldset>;
}

function AssessmentEditor({ criteria, setCriteria, prompt, setPrompt, options, setOptions, correctIndex, setCorrectIndex, minimumCorrect, setMinimumCorrect, practicalRequired, setPracticalRequired }: { criteria: string; setCriteria: (value: string) => void; prompt: string; setPrompt: (value: string) => void; options: string[]; setOptions: (value: string[]) => void; correctIndex: number; setCorrectIndex: (value: number) => void; minimumCorrect: string; setMinimumCorrect: (value: string) => void; practicalRequired: boolean; setPracticalRequired: (value: boolean) => void }): React.JSX.Element {
  return <fieldset className="library-assessment library-wide"><legend>Training assessment</legend><label>Assessment criteria<textarea value={criteria} onChange={event => setCriteria(event.target.value)} maxLength={4000} rows={3} /></label><label>Quiz question<input value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={1000} /></label>{options.map((option, index) => <label key={index}>Option {index + 1}<input value={option} onChange={event => setOptions(options.map((value, position) => position === index ? event.target.value : value))} maxLength={500} /></label>)}<div className="library-form"><label>Correct option<select value={correctIndex} onChange={event => setCorrectIndex(Number(event.target.value))}>{options.map((_, index) => <option key={index} value={index}>Option {index + 1}</option>)}</select></label><label>Minimum correct<input type="number" min={0} max={prompt.trim() ? 1 : 0} required={!!prompt.trim()} value={minimumCorrect} onChange={event => setMinimumCorrect(event.target.value)} /></label></div><label className="library-inline"><input type="checkbox" checked={practicalRequired} onChange={event => setPracticalRequired(event.target.checked)} /> Practical review required</label></fieldset>;
}

function ContentView({ version, referenceTargets }: { version: Version; referenceTargets: ReferenceTargets }): React.JSX.Element {
  return <div className="library-content-view">{version.content.blocks.map((block, index) => <div className="library-view-block" key={`${String(block.type)}-${index}`}>
    {block.type === "TEXT" && <p>{String(block.text)}</p>}
    {block.type === "LINK" && <p><a href={String(block.url)} target="_blank" rel="noreferrer">{String(block.label)}</a></p>}
    {block.type === "CHECKLIST" && <ul>{Array.isArray(block.items) && block.items.map((item, i) => <li key={i}>{String(item)}</li>)}</ul>}
    {block.type === "SOP" && (() => { const target = referenceTargets.sopVersions.find(candidate => candidate.id === block.versionId); return target ? <p>Exact SOP reference: {target.title} · Version {target.version}</p> : <p>Exact SOP reference is unavailable to your current access.</p>; })()}
    {["FILE", "IMAGE", "PDF", "VIDEO", "TEMPLATE"].includes(String(block.type)) && (() => { const file = version.files.find(candidate => candidate.id === block.fileId); return file ? <a href={`${API}/files/${encodeURIComponent(file.id)}/stream`} rel="noreferrer">{file.name} · {file.mime} · {file.bytes.toLocaleString()} bytes · Open private file</a> : <span>Private file metadata is unavailable for this version.</span>; })()}
  </div>)}{version.content.assessment && <div className="library-assessment-view"><strong>Training assessment</strong><p>{String(version.content.assessment.criteria ?? "")}</p>{Array.isArray(version.content.assessment.quiz) && version.content.assessment.quiz.map((question: Record<string, unknown>, index: number) => <div key={index}><strong>{String(question.prompt)}</strong><ul>{Array.isArray(question.options) && question.options.map((option: Record<string, unknown>, optionIndex: number) => <li key={optionIndex}>{String(option.label)}</li>)}</ul></div>)}<p>{version.content.assessment.practicalRequired ? "Practical review required" : "Practical review optional"}</p></div>}</div>;
}
