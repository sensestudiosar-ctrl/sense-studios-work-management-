import { useCallback, useEffect, useState, type FormEvent } from "react";
import "./automation.css";

const API = "/api/v1/automation";
type Project = { id: string; title: string };
type Recipient = { id: string; label: string };
type ReportDefinition = { title: string; category: string; from: string; to: string; columns: string[]; filters: { column: string; operator: "equals" | "contains"; value: string }[]; groupBy?: string | undefined; chart: "NONE" | "BAR" | "PIE" };
type SavedReport = { id: string; version: number; data: ReportDefinition };
type RuleDefinition = { title: string; enabled: boolean; eventNames: string[]; projectId?: string; condition: { subjectType?: string }; action: { kind: "NOTIFY" | "REPORT" | "RECOMMENDATION"; recipientId: string; reportId?: string; recommendation?: string } };
type Rule = { id: string; version: number; data: RuleDefinition };
type Run = { id: string; ruleId: string; sourceEventId: string; status: string; createdAt: string; actionKind: string; recommendation?: string; reportId?: string; approvalRequestId?: string; canDecide: boolean };
type Context = { owner: boolean; projects: Project[]; recipients: Recipient[]; eventNames: string[]; categories: { key: string; label: string }[]; columns: { key: string; label: string }[]; reports: SavedReport[]; rules: Rule[]; runs: Run[] };
type ReportTable = { columns: { key: string; label: string }[]; rows: Record<string, unknown>[]; unavailable?: string[] };
type Preview = { table: ReportTable; chart: { label: string; count: number }[]; chartKind: ReportDefinition["chart"] };
const id = (): string => crypto.randomUUID();
const displayChartLabel = (label: string): string => label.length > 18 ? `${label.slice(0, 17)}…` : label;
async function request<T>(path: string, csrf: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) { headers.set("Content-Type", "application/json"); headers.set("X-CSRF-Token", csrf); }
  const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? body.message ?? `Request failed (${response.status})`);
  return body as T;
}
const emptyDefinition = (): ReportDefinition => ({ title: "", category: "", from: "", to: "", columns: [], filters: [], chart: "NONE" });
const pieSlice = (start: number, end: number): string => {
  const point = (angle: number): [number, number] => [80 + 66 * Math.cos(angle - Math.PI / 2), 80 + 66 * Math.sin(angle - Math.PI / 2)];
  const [x1, y1] = point(start); const [x2, y2] = point(end);
  return `M 80 80 L ${x1} ${y1} A 66 66 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
};

export function AutomationWorkspace({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  const [context, setContext] = useState<Context | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [definition, setDefinition] = useState<ReportDefinition>(emptyDefinition());
  const [reportReason, setReportReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [runPreview, setRunPreview] = useState<{ runId: string; data: Preview } | null>(null);
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null);
  const [ruleTitle, setRuleTitle] = useState("");
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [ruleReason, setRuleReason] = useState("");
  const [ruleEnabled, setRuleEnabled] = useState(true);
  const [ruleEvents, setRuleEvents] = useState<string[]>([]);
  const [ruleProject, setRuleProject] = useState("");
  const [subjectType, setSubjectType] = useState("");
  const [actionKind, setActionKind] = useState<RuleDefinition["action"]["kind"]>("NOTIFY");
  const [recipientId, setRecipientId] = useState("");
  const [reportId, setReportId] = useState("");
  const [recommendation, setRecommendation] = useState("");

  const load = useCallback(async (initial = false): Promise<void> => {
    if (initial) setLoading(true);
    setError("");
    try { setContext(await request<Context>("/context", csrfToken)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Automation settings could not be loaded."); }
    finally { if (initial) setLoading(false); }
  }, [csrfToken]);
  useEffect(() => { void load(true); }, [load]);

  const saveReport = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); if (!definition.title.trim() || !definition.category || !definition.from || !definition.to || definition.columns.length === 0 || reportReason.trim().length < 3) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const fields = { ...definition, title: definition.title.trim() };
      if (editingReport) await request(`/reports/${encodeURIComponent(editingReport.id)}`, csrfToken, { method: "PUT", body: JSON.stringify({ ...fields, commandId: id(), reason: reportReason.trim(), expectedVersion: editingReport.version }) });
      else await request("/reports", csrfToken, { method: "POST", body: JSON.stringify({ ...fields, commandId: id(), reason: reportReason.trim() }) });
      setEditingReport(null); setReportReason(""); setNotice("Report saved."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Report could not be saved."); }
    finally { setBusy(false); }
  };
  const previewReport = async (event?: FormEvent<HTMLFormElement>, saved?: SavedReport): Promise<void> => {
    event?.preventDefault();
    const current = saved?.data ?? definition;
    setBusy(true); setError(""); setNotice("");
    try { setPreview({ ...await request<Omit<Preview, "chartKind">>(saved ? `/reports/${encodeURIComponent(saved.id)}/preview` : "/reports/preview", csrfToken, saved ? {} : { method: "POST", body: JSON.stringify(current) }), chartKind: current.chart }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Report preview could not be generated."); }
    finally { setBusy(false); }
  };
  const saveRule = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); if (!context || !ruleTitle.trim() || !ruleReason.trim() || ruleEvents.length === 0 || !recipientId) return;
    if (!context.owner && !ruleProject) return;
    const action: RuleDefinition["action"] = { kind: actionKind, recipientId, ...(actionKind === "REPORT" && reportId ? { reportId } : {}), ...(actionKind === "RECOMMENDATION" && recommendation.trim() ? { recommendation: recommendation.trim() } : {}) };
    if ((actionKind === "REPORT" && !reportId) || (actionKind === "RECOMMENDATION" && !recommendation.trim())) return;
    const data: RuleDefinition = { title: ruleTitle.trim(), enabled: ruleEnabled, eventNames: ruleEvents, ...(ruleProject ? { projectId: ruleProject } : {}), condition: subjectType ? { subjectType } : {}, action };
    setBusy(true); setError(""); setNotice("");
    try { await request(editingRule ? `/rules/${encodeURIComponent(editingRule.id)}` : "/rules", csrfToken, { method: editingRule ? "PUT" : "POST", body: JSON.stringify({ commandId: id(), reason: ruleReason.trim(), ...data, ...(editingRule ? { expectedVersion: editingRule.version } : {}) }) }); setNotice("Automation rule saved."); setEditingRule(null); setRuleTitle(""); setRuleReason(""); setRuleEnabled(true); setRuleEvents([]); setRuleProject(""); setSubjectType(""); setRecipientId(""); setReportId(""); setRecommendation(""); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Automation rule could not be saved."); }
    finally { setBusy(false); }
  };
  const decide = async (run: Run, outcome: "APPROVED" | "REJECTED"): Promise<void> => {
    const reason = window.prompt(outcome === "APPROVED" ? "Reason for approving this recommendation" : "Reason for rejecting this recommendation");
    if (!reason?.trim()) return;
    setBusy(true); setError(""); setNotice("");
    try { await request(`/runs/${encodeURIComponent(run.id)}/decision`, csrfToken, { method: "POST", body: JSON.stringify({ commandId: id(), reason: reason.trim(), outcome }) }); setNotice(outcome === "APPROVED" ? "Recommendation approved. The proposed change still requires the ordinary authorized workflow." : "Recommendation rejected."); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Recommendation decision could not be saved."); }
    finally { setBusy(false); }
  };
  const showRunReport = async (run: Run): Promise<void> => {
    setBusy(true); setError(""); setNotice("");
    try { setRunPreview({ runId: run.id, data: await request<Preview>(`/runs/${encodeURIComponent(run.id)}/report`, csrfToken) }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Generated report could not be loaded."); }
    finally { setBusy(false); }
  };
  const updateDefinition = (patch: Partial<ReportDefinition>): void => setDefinition((value) => ({ ...value, ...patch }));
  const updateFilter = (index: number, patch: Partial<ReportDefinition["filters"][number]>): void => updateDefinition({ filters: definition.filters.map((filter, current) => current === index ? { ...filter, ...patch } : filter) });

  return <section className="identity-section automation-workspace" aria-labelledby="automation-heading">
    <div className="automation-heading"><div><div className="eyebrow">MANAGEMENT</div><h2 id="automation-heading">Automation &amp; reports</h2><p>Build scoped reports and event rules. Actions run only for authorized recipients.</p></div><button type="button" className="secondary-action" onClick={() => void load()} disabled={busy}>Refresh</button></div>
    {error && <p className="automation-error" role="alert">{error}</p>}{notice && <p className="automation-notice" role="status">{notice}</p>}
    {loading ? <p role="status">Loading automation settings…</p> : context && <>
      <section className="automation-panel" aria-labelledby="report-builder-heading"><h3 id="report-builder-heading">{editingReport ? "Edit saved report" : "Custom report builder"}</h3><p>Choose a category, date range, columns, filters, grouping and chart. Report data follows your current access.</p>
        <form onSubmit={(event) => void saveReport(event)}><div className="automation-form-grid">
          <label>Report name<input value={definition.title} onChange={(e) => updateDefinition({ title: e.target.value })} maxLength={160} required /></label>
          <label>Category<select value={definition.category} onChange={(e) => updateDefinition({ category: e.target.value })} required><option value="">Choose a category</option>{context.categories.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label>From<input type="date" value={definition.from} onChange={(e) => updateDefinition({ from: e.target.value })} required /></label>
          <label>To<input type="date" value={definition.to} onChange={(e) => updateDefinition({ to: e.target.value })} required /></label>
          <fieldset className="automation-span"><legend>Columns</legend><div className="automation-column-options">{context.columns.map((column) => <label className="automation-check" key={column.key}><input type="checkbox" checked={definition.columns.includes(column.key)} onChange={(e) => updateDefinition({ columns: e.target.checked ? [...definition.columns, column.key] : definition.columns.filter((key) => key !== column.key) })} />{column.label}</label>)}</div></fieldset>
          <fieldset className="automation-span"><legend>Filters</legend>{definition.filters.map((filter, index) => <div className="automation-filter-row" key={index}>
            <label>Column<select aria-label={`Filter ${index + 1} column`} value={filter.column} onChange={(e) => updateFilter(index, { column: e.target.value })}>{context.columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label>
            <label>Match<select aria-label={`Filter ${index + 1} match`} value={filter.operator} onChange={(e) => updateFilter(index, { operator: e.target.value as "equals" | "contains" })}><option value="equals">Equals</option><option value="contains">Contains</option></select></label>
            <label>Value<input aria-label={`Filter ${index + 1} value`} value={filter.value} onChange={(e) => updateFilter(index, { value: e.target.value })} /></label>
            <button type="button" className="secondary-action" aria-label={`Remove filter ${index + 1}`} onClick={() => updateDefinition({ filters: definition.filters.filter((_, current) => current !== index) })}>Remove</button>
          </div>)}<button type="button" className="secondary-action" disabled={definition.filters.length >= 10} onClick={() => updateDefinition({ filters: [...definition.filters, { column: context.columns[0]!.key, operator: "equals", value: "" }] })}>Add filter</button></fieldset>
          <label>Group by<select value={definition.groupBy ?? ""} onChange={(e) => updateDefinition(e.target.value ? { groupBy: e.target.value } : { groupBy: undefined })}><option value="">No grouping</option>{context.columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label>
          <label>Chart<select value={definition.chart} onChange={(e) => updateDefinition({ chart: e.target.value as ReportDefinition["chart"] })}><option value="NONE">No chart</option><option value="BAR">Bar chart</option><option value="PIE">Pie chart</option></select></label>
          <label className="automation-span">Reason for saving report<textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} minLength={3} maxLength={1000} required /></label>
        </div><div className="automation-actions"><button type="button" className="secondary-action" onClick={() => void previewReport()} disabled={busy || !definition.category || !definition.from || !definition.to || definition.columns.length === 0}>{busy ? "Working…" : "Preview report"}</button><button type="submit" disabled={busy || !definition.title.trim() || definition.columns.length === 0 || reportReason.trim().length < 3}>{editingReport ? "Save report changes" : "Save report"}</button>{editingReport && <button className="secondary-action" type="button" onClick={() => { setEditingReport(null); setDefinition(emptyDefinition()); setPreview(null); setReportReason(""); }}>Cancel edit</button>}</div></form>
      </section>
      {preview && <section className="automation-panel" aria-labelledby="report-preview-heading">
        <h3 id="report-preview-heading">Report preview</h3>
        {preview.table.unavailable?.length ? <ul className="automation-reminder" aria-label="Unavailable report sources">{preview.table.unavailable.map((message) => <li key={message}>{message}</li>)}</ul> : null}
        <div className="automation-table-wrap"><table><thead><tr>{preview.table.columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{preview.table.rows.map((row, index) => <tr key={index}>{preview.table.columns.map((column) => <td key={column.key}>{String(row[column.key] ?? "—")}</td>)}</tr>)}</tbody></table></div>
        {preview.table.rows.length === 0 && <p role="status">No rows match this report.</p>}
        {preview.chart.length > 0 && preview.chartKind !== "NONE" && <div className="automation-chart" role="img" aria-label={`${preview.chartKind === "PIE" ? "Pie" : "Bar"} chart with ${preview.chart.length} groups`}>
          {preview.chartKind === "PIE" ? <svg viewBox={`0 0 320 ${Math.max(160, preview.chart.length * 24 + 40)}`} aria-hidden="true">
            {preview.chart.length === 1 ? <circle cx="80" cy="80" r="66" fill="hsl(0 34% 48%)" /> : (() => { const total = preview.chart.reduce((sum, item) => sum + Math.max(0, item.count), 0); let cursor = 0; return preview.chart.map((point, index) => { const start = cursor; cursor += total ? Math.max(0, point.count) / total * Math.PI * 2 : 0; return <path key={point.label} d={pieSlice(start, cursor)} fill={`hsl(${index * 67 % 360} 34% 48%)`} />; }); })()}
            <circle cx="80" cy="80" r="35" fill="#fffdf7" /><g transform="translate(165 20)">{preview.chart.map((point, index) => <g key={point.label} transform={`translate(0 ${index * 24})`}><rect width="12" height="12" fill={`hsl(${index * 67 % 360} 34% 48%)`} /><text x="18" y="11"><title>{point.label}: {point.count}</title>{displayChartLabel(point.label)}: {point.count}</text></g>)}</g>
          </svg> : preview.chart.map((point) => { const maximum = Math.max(1, ...preview.chart.map((item) => item.count)); return <div className="automation-chart-row" key={point.label}><span title={point.label}>{displayChartLabel(point.label)}</span><div><span style={{ width: `${Math.max(2, point.count / maximum * 100)}%` }} /></div><strong>{point.count}</strong></div>; })}
        </div>}
      </section>}
      <section className="automation-panel" aria-labelledby="saved-reports-heading"><h3 id="saved-reports-heading">Saved reports</h3>{context.reports.length === 0 ? <p role="status">No saved reports yet.</p> : <ul className="automation-list">{context.reports.map((item) => <li key={item.id}><div><strong>{item.data.title}</strong><span>{item.data.category} · Version {item.version}</span></div><div className="automation-actions"><button type="button" className="secondary-action" disabled={busy} onClick={() => void previewReport(undefined, item)}>Preview</button>{(["csv", "xlsx", "pdf", "print"] as const).map((format) => <a key={format} href={`${API}/reports/${encodeURIComponent(item.id)}/export?format=${format}`} target={format === "print" ? "_blank" : undefined} rel={format === "print" ? "noopener noreferrer" : undefined}>{format.toUpperCase()}</a>)}<button type="button" className="secondary-action" disabled={busy} onClick={() => { setEditingReport(item); setDefinition(item.data); setReportReason(""); setPreview(null); }}>Edit</button></div></li>)}</ul>}</section>
      <section className="automation-panel" aria-labelledby="rule-builder-heading"><h3 id="rule-builder-heading">Event automation</h3><p>Choose one or more events and a low-risk internal action. Scope is enforced by the server.</p>
        <form onSubmit={(event) => void saveRule(event)}><div className="automation-form-grid">
          <label>Rule name<input value={ruleTitle} onChange={(e) => setRuleTitle(e.target.value)} required maxLength={160} /></label>
          <label className="automation-check"><input type="checkbox" checked={ruleEnabled} onChange={(e) => setRuleEnabled(e.target.checked)} />Rule enabled</label>
          <label>Project scope<select value={ruleProject} onChange={(e) => setRuleProject(e.target.value)} required={!context.owner}><option value="">{context.owner ? "Organization-wide" : "Choose a project"}</option>{context.projects.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <fieldset className="automation-span"><legend>When these events occur</legend>{context.eventNames.map((name) => <label className="automation-check" key={name}><input type="checkbox" checked={ruleEvents.includes(name)} onChange={(e) => setRuleEvents((current) => e.target.checked ? [...current, name] : current.filter((entry) => entry !== name))} />{name}</label>)}</fieldset>
          <label>Condition: subject type (optional)<input value={subjectType} onChange={(e) => setSubjectType(e.target.value)} /></label>
          <label>Action<select value={actionKind} onChange={(e) => setActionKind(e.target.value as RuleDefinition["action"]["kind"])}><option value="NOTIFY">Internal notice</option><option value="REPORT">Generate report</option><option value="RECOMMENDATION">Propose recommendation</option></select></label>
          <label>Authorized recipient<select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} required><option value="">Choose a recipient</option>{context.recipients.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          {actionKind === "REPORT" && <label>Saved report<select value={reportId} onChange={(e) => setReportId(e.target.value)} required><option value="">Choose a report</option>{context.reports.map((item) => <option key={item.id} value={item.id}>{item.data.title}</option>)}</select></label>}
          {actionKind === "RECOMMENDATION" && <label className="automation-span">Recommendation<textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} minLength={3} maxLength={1000} required /></label>}
          <label className="automation-span">Reason for rule change<textarea value={ruleReason} onChange={(e) => setRuleReason(e.target.value)} minLength={3} maxLength={1000} required /></label>
        </div><div className="automation-actions"><button type="submit" disabled={busy || !ruleTitle.trim() || !ruleReason.trim() || ruleEvents.length === 0 || !recipientId || (!context.owner && !ruleProject)}>{editingRule ? "Save rule changes" : "Save automation rule"}</button>{editingRule && <button type="button" className="secondary-action" onClick={() => { setEditingRule(null); setRuleTitle(""); setRuleReason(""); setRuleEnabled(true); setRuleEvents([]); setRuleProject(""); setSubjectType(""); setRecipientId(""); setReportId(""); setRecommendation(""); }}>Cancel edit</button>}</div></form>
      </section>
      <section className="automation-panel" aria-labelledby="rules-heading"><h3 id="rules-heading">Configured rules</h3>{context.rules.length === 0 ? <p role="status">No automation rules configured.</p> : <ul className="automation-list">{context.rules.map((rule) => <li key={rule.id}><div><strong>{rule.data.title}</strong><span>Version {rule.version} · {rule.data.enabled ? "Enabled" : "Disabled"} · {rule.data.eventNames.join(", ")} · {rule.data.action.kind}</span></div><button type="button" className="secondary-action" disabled={busy} onClick={() => { setEditingRule(rule); setRuleTitle(rule.data.title); setRuleEnabled(rule.data.enabled); setRuleReason(""); setRuleEvents(rule.data.eventNames); setRuleProject(rule.data.projectId ?? ""); setSubjectType(rule.data.condition.subjectType ?? ""); setActionKind(rule.data.action.kind); setRecipientId(rule.data.action.recipientId); setReportId(rule.data.action.reportId ?? ""); setRecommendation(rule.data.action.recommendation ?? ""); }}>{"Edit"}</button></li>)}</ul>}</section>
      <section className="automation-panel" aria-labelledby="runs-heading"><h3 id="runs-heading">Recent automation activity</h3><p>Notice status means an internal notice was created. Email delivery and read receipts are managed separately.</p>{context.runs.length === 0 ? <p role="status">No automation activity recorded.</p> : <ul className="automation-list">{context.runs.map((run) => <li key={run.id}><div><strong>{run.actionKind} · {run.actionKind === "NOTIFY" && run.status === "DELIVERED" ? "Notice created" : run.status}</strong><span>{new Date(run.createdAt).toLocaleString()}</span>{run.recommendation && <p>{run.recommendation}</p>}{run.approvalRequestId && <p className="automation-reminder">Approving a recommendation records review only. The proposed change still requires the ordinary authorized workflow.</p>}{run.approvalRequestId && run.status === "PENDING" && !run.canDecide && <p>Only the named authorized reviewer can decide this recommendation.</p>}</div><div className="automation-actions">{run.actionKind === "REPORT" && <button type="button" className="secondary-action" disabled={busy} onClick={() => void showRunReport(run)}>Preview generated report</button>}{run.approvalRequestId && run.status === "PENDING" && run.canDecide && <><button type="button" className="secondary-action" disabled={busy} onClick={() => void decide(run, "APPROVED")}>Approve recommendation</button><button type="button" className="secondary-action" disabled={busy} onClick={() => void decide(run, "REJECTED")}>Reject recommendation</button></>}</div></li>)}</ul>}
        {runPreview && <div className="automation-run-report"><h4>Generated report</h4>{runPreview.data.table.unavailable?.length ? <ul className="automation-reminder" aria-label="Unavailable report sources">{runPreview.data.table.unavailable.map((message) => <li key={message}>{message}</li>)}</ul> : null}<div className="automation-actions">{(["csv", "xlsx", "pdf", "print"] as const).map((format) => <a key={format} href={`${API}/runs/${encodeURIComponent(runPreview.runId)}/report/export?format=${format}`} target={format === "print" ? "_blank" : undefined} rel={format === "print" ? "noopener noreferrer" : undefined}>{format.toUpperCase()}</a>)}</div><div className="automation-table-wrap"><table><thead><tr>{runPreview.data.table.columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{runPreview.data.table.rows.map((row, index) => <tr key={index}>{runPreview.data.table.columns.map((column) => <td key={column.key}>{String(row[column.key] ?? "—")}</td>)}</tr>)}</tbody></table></div>{runPreview.data.chart.length > 0 && <div className="automation-chart" role="img" aria-label={`Generated count chart with ${runPreview.data.chart.length} groups`}>{runPreview.data.chart.map((point) => { const maximum = Math.max(1, ...runPreview.data.chart.map((item) => item.count)); return <div className="automation-chart-row" key={point.label}><span title={point.label}>{displayChartLabel(point.label)}</span><div><span style={{ width: `${Math.max(2, point.count / maximum * 100)}%` }} /></div><strong>{point.count}</strong></div>; })}</div>}</div>}
      </section>
    </>}
  </section>;
}
