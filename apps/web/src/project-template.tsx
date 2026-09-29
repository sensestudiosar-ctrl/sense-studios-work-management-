import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./project-template.css";

const API = "/api/v1/project-templates";
export type DeliveryType = "DESIGN" | "TURNKEY";
export type TemplateDefinition = {
  deliveryType: DeliveryType;
  scopes: string[];
  stages: Array<{ key: string; label: string }>;
  milestones: Array<{ key: string; label: string; stageKey: string; required: boolean; targetOffsetDays?: number }>;
  folders: string[];
  fileNamingConvention?: string;
};
export type TemplateVersion = { id: string; number: number; definition: TemplateDefinition; createdAt: string };
export type ProjectTemplate = { id: string; name: string; active: boolean; versions: TemplateVersion[] };
type TemplateResponse = { templates: ProjectTemplate[]; canManage: boolean; defaults: Record<DeliveryType, Array<{ key: string; label: string }>> };
type Props = { owner: boolean; csrfToken: string; onTemplateChange: (version: TemplateVersion | undefined) => void; resetKey?: number };

const defaultDefinition = (type: DeliveryType, stages: Array<{ key: string; label: string }>): TemplateDefinition => ({
  deliveryType: type,
  scopes: [], stages: stages.map((stage) => ({ ...stage })), milestones: [], folders: [],
});
const responseJson = async (response: Response): Promise<unknown> => {
  if (!response.ok) throw Object.assign(new Error("request"), { status: response.status });
  return response.json() as Promise<unknown>;
};
const lines = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);

export function ProjectTemplatePanel({ owner, csrfToken, onTemplateChange, resetKey = 0 }: Props): React.JSX.Element | null {
  const [data, setData] = useState<TemplateResponse>();
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [editTemplateId, setEditTemplateId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [definition, setDefinition] = useState<TemplateDefinition>({ deliveryType: "DESIGN", scopes: [], stages: [], milestones: [], folders: [] });
  const [scopesText, setScopesText] = useState("");
  const [foldersText, setFoldersText] = useState("");
  const [stageRows, setStageRows] = useState<Array<{ key: string; label: string }>>([]);
  const [milestoneRows, setMilestoneRows] = useState<TemplateDefinition["milestones"]>([]);
  const [naming, setNaming] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [denied, setDenied] = useState(false);
  useEffect(() => { setSelectedVersionId(""); }, [resetKey]);

  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    void fetch(API, { credentials: "include", cache: "no-store" }).then(responseJson).then((value) => { if (live) setData(value as TemplateResponse); }).catch((cause: unknown) => {
      // A denied template endpoint is intentionally silent for non-managers.
      if (live) { const isDenied = cause instanceof Error && (cause as Error & { status?: number }).status === 403; setDenied(isDenied); if (!isDenied) setError("Project templates could not be loaded."); }
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [reload]);

  const selected = useMemo(() => data?.templates.flatMap((template) => template.versions).find((version) => version.id === selectedVersionId), [data, selectedVersionId]);
  useEffect(() => { onTemplateChange(selected); }, [selected, onTemplateChange]);
  const initNew = (type: DeliveryType) => {
    const next = defaultDefinition(type, data?.defaults[type] ?? []);
    setDefinition(next); setScopesText(next.scopes.join("\n")); setFoldersText(next.folders.join("\n")); setStageRows(next.stages); setMilestoneRows([]); setNaming(next.fileNamingConvention ?? "");
    setEditTemplateId(""); setFormOpen(true);
  };
  const beginVersion = (template: ProjectTemplate) => {
    const current = template.versions.at(-1)?.definition;
    if (!current) return;
    setEditTemplateId(template.id); setFormOpen(true); setName(template.name); setDefinition(current); setScopesText(current.scopes.join("\n")); setFoldersText(current.folders.join("\n")); setStageRows(current.stages.map((row) => ({ ...row }))); setMilestoneRows(current.milestones.map((row) => ({ ...row }))); setNaming(current.fileNamingConvention ?? ""); setReason(""); setNotice("");
  };
  const payloadDefinition = (): TemplateDefinition => ({
    deliveryType: definition.deliveryType, scopes: lines(scopesText), stages: stageRows.map((row) => ({ key: row.key.trim(), label: row.label.trim() })).filter((row) => row.key && row.label),
    milestones: milestoneRows.map((row) => ({ ...row, key: row.key.trim(), label: row.label.trim(), stageKey: row.stageKey.trim() })).filter((row) => row.key && row.label && row.stageKey),
    folders: lines(foldersText), ...(naming.trim() ? { fileNamingConvention: naming.trim() } : {}),
  });
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy || !data) return;
    setBusy(true); setError(""); setNotice("");
    const body = { ...(editTemplateId ? {} : { name: name.trim() }), definition: payloadDefinition(), reason: reason.trim() };
    const url = editTemplateId ? `${API}/${encodeURIComponent(editTemplateId)}/versions` : API;
    try {
      const result = await responseJson(await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) })) as { template?: ProjectTemplate };
      const fresh = await responseJson(await fetch(API, { credentials: "include", cache: "no-store" })) as TemplateResponse;
      setData(fresh); setNotice(editTemplateId ? "New template version saved." : "Template created."); setReason(""); setEditTemplateId(""); setFormOpen(false);
      setSelectedVersionId((result as { version?: TemplateVersion }).version?.id ?? result.template?.versions.at(-1)?.id ?? selectedVersionId);
    } catch (cause) { const status = cause instanceof Error ? (cause as Error & { status?: number }).status : undefined; setError(status === 403 ? "You do not have access to manage project templates." : status === 409 ? "The template changed. Refresh and review the latest version." : "The template could not be saved. Check the fields and try again."); }
    finally { setBusy(false); }
  };
  const updateStage = (index: number, field: "key" | "label", value: string) => setStageRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  const updateMilestone = (index: number, field: string, value: string | boolean | number | undefined) => setMilestoneRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } as typeof row : row));
  if (denied) return null;

  return <section className="project-template-panel" aria-labelledby="template-panel-title">
    {loading && <p role="status">Loading project templates…</p>}
    {owner && data && <><h3 id="template-panel-title">Choose a project template <span>(optional)</span></h3>
      <label>Project template<select aria-label="Project template" value={selectedVersionId} onChange={(event) => setSelectedVersionId(event.target.value)}><option value="">Use current project setup</option>{data.templates.filter((template) => template.active).flatMap((template) => template.versions.map((version) => <option key={version.id} value={version.id}>{template.name} · version {version.number}</option>))}</select></label>
      {selected && <p className="template-selection-note">Selecting this version fills delivery type and initial service scopes. The applied version is kept with the project.</p>}
    </>}
    {(data?.canManage || owner) && data && <div className="template-manager">
      <h3 id={owner ? undefined : "template-panel-title"}>Project templates</h3><p>Template changes create a new version. Existing projects keep their applied version.</p>
      {data.templates.length === 0 && <p>No project templates yet.</p>}
      <div className="template-list">{data.templates.map((template) => <div className="template-list-row" key={template.id}><span><strong>{template.name}</strong><small>{template.versions.length ? `Latest version ${template.versions.at(-1)?.number}` : "No versions"}{template.active ? " · Active" : " · Inactive"}</small></span><button type="button" onClick={() => beginVersion(template)}>New version</button></div>)}</div>
      <button type="button" className="template-new-button" onClick={() => { setName(""); setReason(""); initNew("DESIGN"); }}>Create template</button>
      {formOpen && <form className="template-form" onSubmit={(event) => void save(event)}>
        <h4>{editTemplateId ? `New version of ${name}` : "New template"}</h4>
        {!editTemplateId && <label>Template name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label>}
        <label>Delivery type<select value={definition.deliveryType} disabled={!!editTemplateId} onChange={(event) => initNew(event.target.value as DeliveryType)}><option value="DESIGN">Design</option><option value="TURNKEY">Turnkey</option></select></label>
        <label>Initial service scopes<textarea value={scopesText} onChange={(event) => setScopesText(event.target.value)} rows={3} required /><small>One scope per line.</small></label>
        <div className="template-edit-heading"><strong>Stages</strong><button type="button" onClick={() => setStageRows((rows) => [...rows, { key: "", label: "" }])}>Add stage</button></div>
        {stageRows.map((stage, index) => <div className="template-row" key={`stage-${index}`}><label>Stage key<input aria-label={`Stage ${index + 1} key`} value={stage.key} onChange={(event) => updateStage(index, "key", event.target.value)} required /></label><label>Stage name<input aria-label={`Stage ${index + 1} name`} value={stage.label} onChange={(event) => updateStage(index, "label", event.target.value)} required /></label><button type="button" aria-label={`Remove stage ${index + 1}`} onClick={() => setStageRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</button></div>)}
        <div className="template-edit-heading"><strong>Milestones</strong><button type="button" onClick={() => setMilestoneRows((rows) => [...rows, { key: "", label: "", stageKey: stageRows[0]?.key ?? "", required: false }])}>Add milestone</button></div>
        {milestoneRows.map((milestone, index) => <div className="template-milestone" key={`milestone-${index}`}><label>Milestone key<input aria-label={`Milestone ${index + 1} key`} value={milestone.key} onChange={(event) => updateMilestone(index, "key", event.target.value)} required /></label><label>Milestone name<input aria-label={`Milestone ${index + 1} name`} value={milestone.label} onChange={(event) => updateMilestone(index, "label", event.target.value)} required /></label><label>Stage<select aria-label={`Milestone ${index + 1} stage`} value={milestone.stageKey} onChange={(event) => updateMilestone(index, "stageKey", event.target.value)} required><option value="">Choose stage</option>{stageRows.map((row) => <option key={row.key} value={row.key}>{row.label || row.key}</option>)}</select></label><label>Target offset in days<input aria-label={`Milestone ${index + 1} target offset`} type="number" min="0" max="3650" value={milestone.targetOffsetDays ?? ""} onChange={(event) => updateMilestone(index, "targetOffsetDays", event.target.value ? Number(event.target.value) : undefined)} /></label><label className="template-checkbox"><input type="checkbox" checked={milestone.required} onChange={(event) => updateMilestone(index, "required", event.target.checked)} />Required</label><button type="button" aria-label={`Remove milestone ${index + 1}`} onClick={() => setMilestoneRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>Remove</button></div>)}
        <label>Planned folders<textarea value={foldersText} onChange={(event) => setFoldersText(event.target.value)} rows={3} /><small>One folder name per line. File storage will be available in a later workflow.</small></label>
        <label>File naming convention<input value={naming} onChange={(event) => setNaming(event.target.value)} maxLength={160} /></label>
        <label>Reason for change<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} required /></label>
        <button className="project-primary-button" disabled={busy || stageRows.length === 0 || payloadDefinition().scopes.length === 0}>{busy ? "Saving…" : editTemplateId ? "Save new version" : "Create template"}</button>
      </form>}
    </div>}
    {error && <div role="alert" className="project-inline-error">{error}<button type="button" onClick={() => setReload((value) => value + 1)}>Reload templates</button></div>}{notice && <p role="status" className="project-success">{notice}</p>}
  </section>;
}

export type PlanItem = { id: string; kind: "STAGE" | "MILESTONE"; key: string; label: string; stageKey: string | null; position: number; required: boolean; targetAt: string | null; completedAt: string | null };
type PlanResponse = { plan: null | { templateVersion: { id: string; number: number; template: { name: string } }; definition: TemplateDefinition; createdAt: string }; items: PlanItem[]; history: Array<{ id: string; itemId: string; actorId: string; reason: string; occurredAt: string }>; capabilities: { complete: boolean; override: boolean } };
export function ProjectPlan({ projectId, projectVersion, csrfToken, onSaved }: { projectId: string; projectVersion: number; csrfToken: string; onSaved: () => void }): React.JSX.Element {
  const [data, setData] = useState<PlanResponse>(); const [error, setError] = useState(""); const [reason, setReason] = useState(""); const [busyId, setBusyId] = useState("");
  const readSequence = useRef(0);
  const load = useCallback(async () => { const requestId = ++readSequence.current; setError(""); try { const next = await responseJson(await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/plan`, { credentials: "include", cache: "no-store" })) as PlanResponse; if (requestId === readSequence.current) setData(next); } catch (cause) { if (requestId !== readSequence.current) return; const status = cause instanceof Error ? (cause as Error & { status?: number }).status : undefined; setError(status === 403 ? "This project plan is not available to you." : "Project plan could not be loaded. Try again."); } }, [projectId]);
  useEffect(() => { setData(undefined); setReason(""); void load(); return () => { ++readSequence.current; }; }, [load, projectVersion]);
  const complete = async (item: PlanItem) => {
    if (!data?.capabilities.complete || reason.trim().length < 3 || busyId) return;
    setBusyId(item.id); setError("");
    try { await responseJson(await fetch(`/api/v1/projects/${encodeURIComponent(projectId)}/plan-items/${encodeURIComponent(item.id)}/complete`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ expectedVersion: projectVersion, reason: reason.trim() }) })); setReason(""); await load(); onSaved(); }
    catch (cause) { const status = cause instanceof Error ? (cause as Error & { status?: number }).status : undefined; if (status === 409) onSaved(); setError(status === 403 ? "You cannot complete this plan item." : status === 409 ? "The project changed. The latest project details are being loaded." : "The plan item could not be completed. Try again."); }
    finally { setBusyId(""); }
  };
  const completed = data?.items.filter((item) => item.completedAt).length ?? 0;
  return <section className="project-plan" aria-labelledby="project-plan-heading"><h4 id="project-plan-heading">Project plan</h4>
    {error && <div role="alert" className="project-inline-error">{error}<button type="button" onClick={() => void load()}>Reload plan</button></div>}{!data && !error ? <p role="status">Loading project plan…</p> : !data ? null : !data.plan ? <p>No template version was applied to this project.</p> : <>
      <p className="project-plan-provenance">{data.plan.templateVersion.template.name} · version {data.plan.templateVersion.number}</p>
      <p>{completed} of {data.items.length} plan items complete</p>
      <p className="project-decision-help">Review and approval decisions require their dedicated workflows.</p>
      <ol className="project-plan-items">{data.items.slice().sort((a, b) => a.kind === b.kind ? a.position - b.position : a.kind === "STAGE" ? -1 : 1).map((item) => <li key={item.id} className={item.completedAt ? "is-complete" : ""}><span><strong>{item.label}</strong><small>{item.kind === "STAGE" ? "Stage" : `Milestone${item.required ? " · required" : ""} · ${data.items.find((stage) => stage.kind === "STAGE" && stage.key === item.stageKey)?.label ?? item.stageKey}`}{item.targetAt ? ` · target ${new Date(item.targetAt).toLocaleDateString()}` : ""}</small></span>{item.completedAt ? <span>Complete</span> : data.capabilities.complete && <button type="button" disabled={!!busyId || reason.trim().length < 3} onClick={() => void complete(item)}>{busyId === item.id ? "Saving…" : "Mark complete"}</button>}</li>)}</ol>
      <h5>Planned folders</h5>{data.plan.definition.folders.length ? <ul className="project-plan-folders">{data.plan.definition.folders.map((folder) => <li key={folder}>{folder}</li>)}</ul> : <p>No planned folders.</p>}
      <p className="project-decision-help">File storage will be available in a later workflow.</p>
      {data.plan.definition.fileNamingConvention && <p>File naming convention: {data.plan.definition.fileNamingConvention}</p>}
      {data.capabilities.complete && data.items.some((item) => !item.completedAt) && <label className="project-plan-reason">Reason for plan update<input value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={1000} /></label>}
      {!!data.history.length && <><h5>Plan history</h5><ul className="project-history">{data.history.map((entry) => <li key={entry.id}>{entry.reason} · {new Date(entry.occurredAt).toLocaleString()}</li>)}</ul></>}
    </>}
  </section>;
}
