import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MyWorkAttentionResponse, MyWorkRow, MyWorkSource } from "@sense/contracts";
import type { MyWorkActionCounts, MyWorkSourceCount } from "./my-work-attention.js";
import { dueBucket, parityPriorityClass, parityPriorityLabel, parityState } from "./my-work/my-work-parity.js";
import "./actionable-work.css";

type State = { status: "loading" | "ready" | "stale" | "denied" | "unavailable"; context: string; page?: MyWorkAttentionResponse; message?: string | undefined };
const PAGE_SIZE = 25;
const sources = ["task", "review", "approval"] as const;
const labels = { task: "Tasks", review: "Assigned reviews", approval: "Decisions", all: "All work" };
const reasonLabels: Record<string, string> = { due_today: "Due today", overdue: "Overdue", correction_required: "Correction required", resume_waiting: "Review waiting task / resume", reassignment_required: "Reassignment required", review_start_required: "Start review", review_decision_required: "Review decision required", decision_required: "Decision required" };

/** Calendar day (YYYY-MM-DD) of an instant in a given timezone. */
function calendarDay(instant: Date, timezone: string): string {
  const fields = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  return ["year", "month", "day"].map(key => fields.find(part => part.type === key)!.value).join("-");
}

export function attentionFilterQuery(filters: Record<string, string>): URLSearchParams {
  const query = new URLSearchParams();
  for (const key of ["priorities", "collaboratorEmployeeIds", "q", "projectId", "status", "type", "ownerEmployeeId", "planItemId", "dateFrom", "dateTo"]) if (filters[key]) query.set(key, filters[key]!);
  if (filters.dateFrom || filters.dateTo) query.set("dateBasis", filters.dateBasis || "target");
  if (filters.phase && filters.phase !== "active") query.set("phase", filters.phase);
  return query;
}
export function validAttentionPage(value: unknown): value is MyWorkAttentionResponse {
  if (!value || typeof value !== "object") return false;
  const page = value as MyWorkAttentionResponse;
  if (page.status !== "ready" || !["all", ...sources].includes(page.source) || !page.sourceCounts || !Array.isArray(page.items) || !Number.isInteger(page.totalItems) || page.totalItems < 0 || !Number.isInteger(page.offset) || page.offset < 0 || page.limit !== PAGE_SIZE || page.items.length > PAGE_SIZE || typeof page.hasMore !== "boolean" || !Number.isFinite(Date.parse(page.readAt)) || typeof page.timezone !== "string") return false;
  try { calendarDay(new Date(page.readAt), page.timezone); } catch { return false; }
  if (!sources.every(source => { const count = page.sourceCounts[source]; return count?.status === "excluded" || count?.status === "ready" && Number.isInteger(count.total) && count.total >= 0; })) return false;
  if (!sources.every(source => (page.source === "all" || page.source === source) === (page.sourceCounts[source].status === "ready"))) return false;
  const totals = sources.reduce((sum, source) => { const c = page.sourceCounts[source]; return sum + (c.status === "ready" ? c.total : 0); }, 0);
  if (totals !== page.totalItems || page.items.length !== Math.min(PAGE_SIZE, Math.max(0, page.totalItems - page.offset)) || page.hasMore !== (page.offset + PAGE_SIZE < page.totalItems)) return false;
  const seen = new Set<string>();
  return page.items.every(row => {
    const key = `${row.source}:${row.sourceId}`;
    if (!sources.includes(row.source) || !row.sourceId || !row.title || seen.has(key) || page.source !== "all" && row.source !== page.source || page.sourceCounts[row.source].status !== "ready" || !["target_date", "review_date", "decision_expiry"].includes(row.deadlineKind) || row.deadline !== null && !Number.isFinite(Date.parse(row.deadline))) return false;
    seen.add(key);
    return row.source === "task" ? row.taskId === row.sourceId && row.deadlineKind === "target_date" : row.source === "review" ? !!row.taskId && row.roundId === row.sourceId && row.deadlineKind === "review_date" : row.requestId === row.sourceId && row.taskId === undefined && row.deadlineKind === "decision_expiry";
  });
}

export function ActionableWork({ accountId, enabled = true, filters = {}, refreshVersion = 0, onActionCounts, onSessionExpired, onOpenTask, onClear, onClearTaskFilters }: {
  accountId: string; enabled?: boolean; filters?: Record<string, string>; refreshVersion?: number;
  onActionCounts: (counts: MyWorkActionCounts) => void; onSessionExpired?: (() => void) | undefined;
  onOpenTask?: ((id: string) => void) | undefined; onClear?: (() => void) | undefined; onClearTaskFilters?: (() => void) | undefined;
}): React.JSX.Element | null {
  const [source, setSource] = useState<"all" | MyWorkSource>("all");
  const [paging, setPaging] = useState({ context: "", offset: 0 });
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<State>({ status: "loading", context: "" });
  const generation = useRef(0);
  const filterQuery = attentionFilterQuery(filters);
  const filterKey = filterQuery.toString();
  const taskOnly = ["priorities", "collaboratorEmployeeIds", "status", "type", "ownerEmployeeId", "planItemId", "dateBasis", "dateFrom", "dateTo", "phase"].some(key => filterQuery.has(key));
  const effectiveSource = taskOnly ? "task" : enabled ? source : "all";
  const context = `${accountId}:${effectiveSource}:${filterKey}`;
  const offset = enabled && paging.context === context ? paging.offset : 0;
  const pageContext = `${context}:${offset}`;
  const visible = state.context === pageContext ? state : { status: "loading" as const, context: pageContext };
  useEffect(() => { if (taskOnly) setSource("all"); }, [taskOnly]);
  useEffect(() => {
    const id = ++generation.current, controller = new AbortController();
    const query = new URLSearchParams(filterKey);
    query.set("source", effectiveSource); query.set("offset", String(offset)); query.set("limit", String(PAGE_SIZE));
    setState(current => current.context === pageContext ? { ...current, status: "loading", message: undefined } : { status: "loading", context: pageContext });
    void fetch(`/api/v1/my-work/attention?${query}`, { credentials: "include", cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw Object.assign(new Error("Attention could not be refreshed."), { status: response.status });
      const body: unknown = await response.json();
      if (!validAttentionPage(body) || body.offset !== offset || body.source !== effectiveSource) throw new Error("The server returned an invalid attention page.");
      return body;
    }).then(page => { if (id === generation.current) setState({ status: "ready", context: pageContext, page }); }).catch((error: unknown) => {
      if (id !== generation.current || controller.signal.aborted) return;
      const status = (error as { status?: number }).status;
      if (status === 401) { generation.current++; setState({ status: "unavailable", context: pageContext, message: "Session ended. Sign in again." }); onSessionExpired?.(); return; }
      setState(current => status === 403 ? { status: "denied", context: pageContext, message: "Attention is not available with your current access." } : current.context === pageContext && current.page ? { ...current, status: "stale", message: "Refresh failed. These rows and counts are an older snapshot." } : { status: "unavailable", context: pageContext, message: "Attention sources are unavailable. No complete queue or fresh count is available." });
    });
    return () => { generation.current++; controller.abort(); };
  }, [pageContext, filterKey, effectiveSource, offset, refreshVersion, revision, onSessionExpired]);
  useEffect(() => {
    const count = (sourceKey: MyWorkSource): MyWorkSourceCount => {
      const c = visible.page?.sourceCounts[sourceKey];
      if (visible.status === "ready" || visible.status === "stale") return c?.status === "ready" ? { status: visible.status, total: c.total } : { status: "excluded" };
      return { status: visible.status };
    };
    onActionCounts({ actionableTasks: count("task"), assignedReviews: count("review"), decisions: count("approval") });
  }, [state, pageContext, onActionCounts]);
  useEffect(() => {
    const clear = () => { generation.current++; setState({ status: "loading", context: "" }); };
    const refresh = () => { if (document.visibilityState !== "hidden") setRevision(value => value + 1); };
    window.addEventListener("sense-session-ended", clear); window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("sense-session-ended", clear); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  if (!enabled) return null;
  const page = visible.status === "ready" || visible.status === "stale" ? visible.page : undefined;
  // Due buckets and the overdue flag must agree with the server, so "today" is
  // derived from the organization timezone the page reports — never the browser
  // clock, which can put a row in the wrong bucket near midnight.
  const today = page ? calendarDay(new Date(page.readAt), page.timezone) : "";
  return <section className="actionable-work" aria-label="Needs your attention">
    <header className="actionable-work__header"><div><h3>Needs your attention</h3><p>{taskOnly ? "Tasks · task-only filters applied" : labels[effectiveSource]} · Next required action</p></div><button type="button" onClick={() => setRevision(value => value + 1)} disabled={visible.status === "loading"}>Refresh attention</button><button type="button" className="actionable-work__clear" onClick={() => onClear?.()} disabled={!enabled}>Clear Needs action selection</button></header>
    <div className="actionable-work__controls"><label>Work type<select aria-label="Attention work type" value={effectiveSource} disabled={taskOnly} onChange={event => { setSource(event.target.value as "all" | MyWorkSource); setPaging({ context: "", offset: 0 }); }}>{(["all", ...sources] as const).map(key => <option key={key} value={key}>{labels[key]}</option>)}</select></label>{taskOnly && <button type="button" onClick={() => { setSource("all"); onClearTaskFilters?.(); }}>Clear task-only filters · restore all work</button>}</div>
    <nav aria-label="Other authorized work"><Link to="/reviews?scope=mine&queue=waiting">Assigned reviewer inbox ↗</Link><Link to="/decisions">Open decisions ↗</Link></nav>
    {visible.status === "loading" && <p className="actionable-work__read-at" role="status">Loading attention…</p>}
    {visible.message && <p className="actionable-work__read-at" role={visible.status === "unavailable" ? "alert" : "status"}>{visible.message}{visible.status !== "denied" && <button type="button" onClick={() => setRevision(value => value + 1)}>Retry attention</button>}</p>}
    {page && <>{page.items.length === 0 ? <div className="actionable-work__empty"><p>{"No authorized actions match these filters."}</p><p>{taskOnly ? "Clear the task-only filters to see reviews and decisions too." : "Nothing needs your attention in this selection."}</p></div> : <ul>{page.items.map(row => <ActionRowView key={`${row.source}:${row.sourceId}`} row={row} onOpenTask={onOpenTask} today={today} />)}</ul>}<p className="actionable-work__read-at">{visible.status === "stale" ? "Stale · " : ""}Read {new Date(page.readAt).toLocaleString()} · {page.timezone}</p>{page.totalItems > PAGE_SIZE && <nav aria-label="Attention pages" className="actionable-work__pager"><button type="button" disabled={visible.status !== "ready" || offset === 0} onClick={() => setPaging({ context, offset: Math.max(0, offset - PAGE_SIZE) })}>Previous</button><span>{offset + 1}–{offset + page.items.length} of {page.totalItems} work items</span><button type="button" disabled={visible.status !== "ready" || !page.hasMore} onClick={() => setPaging({ context, offset: offset + PAGE_SIZE })}>Next</button></nav>}</>}
  </section>;
}
function ActionRowView({ row, onOpenTask, today }: { row: MyWorkRow; onOpenTask?: ((id: string) => void) | undefined; today: string }): React.JSX.Element {
  const responsibility = row.responsibility === "primary_owner" ? "Primary owner" : row.responsibility === "manager" ? "Manager action" : row.responsibility === "assigned_reviewer" ? "Assigned reviewer" : "Decision authority";
  const reason = (row.reasons ?? [row.reason]).map(value => reasonLabels[value] ?? value.replaceAll("_", " ")).join(" · ");
  const deadlineLabel = row.deadline ? `${row.deadlineKind === "target_date" ? "Target" : row.deadlineKind === "review_date" ? "Review due" : "Decision expires"} ${row.deadlineKind === "decision_expiry" ? new Date(row.deadline).toLocaleString() : row.deadline.slice(0, 10)}` : "No decision expiry";
  // Sources without a projected status retain their source label; an absent
  // priority must not be presented as a canonical Normal priority.
  const status = row.status;
  const state = status ? parityState(status) : undefined;
  const statusLabel = status ? status.replaceAll("_", " ") : labels[row.source];
  const day = row.deadlineKind === "decision_expiry" ? null : row.deadline?.slice(0, 10) ?? null;
  const overdue = day !== null && day < today && status !== "COMPLETED";
  const priorityClass = row.priority ? parityPriorityClass(row.priority) : undefined;
  const priorityLabel = row.priority ? parityPriorityLabel(row.priority) : undefined;
  const bucket = dueBucket(day, today, false);
  const stage = `${row.deadlineKind === "target_date" ? "Task" : row.deadlineKind === "review_date" ? "Review" : "Decision"} · ${bucket}`;
  const content = <>
    <span className="actionable-work__row-text">
      <span className="actionable-work__row-heading"><strong>{row.title}</strong>{priorityLabel && <span className={`my-work-priority ${priorityClass}`} title={`${priorityLabel} priority`}>{priorityLabel}</span>}</span>
      <small>{row.project?.title ? `${row.project.title} · ` : ""}{responsibility} · {reason}</small>
      <small>{row.isSubtask ? "Subtask · " : ""}{stage} · {deadlineLabel}</small>
    </span>
    <span className={`my-work-status my-work-status-${state ?? "none"}`} data-state={state ?? "none"}>{statusLabel}</span>
  </>;
  const href = row.source === "review" ? `/reviews?taskId=${encodeURIComponent(row.taskId!)}&roundId=${encodeURIComponent(row.roundId!)}` : `/decisions?approvalId=${encodeURIComponent(row.requestId!)}`;
  const label = `${row.title} · ${labels[row.source]} · ${responsibility} · ${reason} · ${deadlineLabel}${status ? ` · ${statusLabel}` : ""}${priorityLabel ? ` · ${priorityLabel} priority` : ""}`;
  const className = `actionable-work__row actionable-work__row--${row.source} my-work-demo-row${state ? ` state-${state}` : " state-none"}${overdue ? " is-overdue" : ""}`;
  return <li className={className}>{row.source === "task" ? <button type="button" aria-label={label} onClick={() => onOpenTask?.(row.taskId!)}>{content}</button> : <Link to={href} aria-label={label}>{content}</Link>}</li>;
}
