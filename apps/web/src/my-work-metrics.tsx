import { useCallback, useEffect, useRef, useState } from "react";
import type { MyWorkActionCounts, MyWorkSourceCount } from "./my-work-attention.js";

export type WorkMetric = "overdue" | "waiting" | "reviews";
export type OverdueCalendar = { status: "loading" | "ready" | "unavailable"; before?: string };
type CountState = { status: "loading" | "ready" | "stale" | "denied" | "unavailable"; total?: number; message?: string; refreshedAt?: number; before?: string };

// Use the organization calendar supplied by the existing server, never the
// browser timezone. Task date bounds are inclusive date-only UTC midnights.
export function previousCalendarDay(today: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error("The organization calendar is unavailable.");
  const date = new Date(`${today}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== today) throw new Error("The organization calendar is unavailable.");
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function overdueTaskFilters<T extends Record<string, string>>(filters: T, before: string): T {
  // A single API dateBasis cannot express Target AND Committed ranges. Keep
  // applied filters intact; this temporary preset explicitly pauses date ranges.
  return { ...filters, phase: "active", dateBasis: "target", dateFrom: "", dateTo: before };
}

function taskCountEndpoint(filters: Record<string, string>, phase: string): string {
  const query = new URLSearchParams({ scope: "personal", offset: "0", limit: "1" });
  for (const [key, value] of Object.entries(filters)) {
    if (["scope", "offset", "limit", "phase", "sort"].includes(key)) continue;
    if (key === "dateBasis" && !filters.dateFrom && !filters.dateTo) continue;
    if (value.trim()) query.set(key, value.trim());
  }
  if (phase === "reviews") query.set("metric", "reviews"); else query.set("phase", phase);
  return `/api/v1/tasks?${query}`;
}

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) {
    const error = new Error(`Could not load this source (${response.status}).`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<Record<string, unknown>>;
}

export function MyWorkTopCards({ filters, actionCounts, selectedMetric, onSelect, onOpenSources, onOverdueCalendar, refreshVersion = 0, queueStale = false, queueRefreshedAt, onSessionExpired, showSelection = true, sitePresentation = false, accountId }: {
  filters: Record<string, string>;
  actionCounts?: MyWorkActionCounts;
  selectedMetric: string;
  onSelect: (metric: WorkMetric | "") => void;
  onOpenSources: (source: "actions" | "reviews") => void;
  onOverdueCalendar: (calendar: OverdueCalendar) => void;
  refreshVersion?: number;
  queueStale?: boolean;
  queueRefreshedAt?: number | undefined;
  onSessionExpired?: (() => void) | undefined;
  showSelection?: boolean;
  sitePresentation?: boolean;
  accountId?: string | undefined;
}): React.JSX.Element {
  const [totals, setTotals] = useState<Record<string, CountState>>({});
  const changed = useCallback((key: string, state: CountState) => {
    setTotals(current => current[key]?.status === state.status && current[key]?.total === state.total && current[key]?.before === state.before ? current : { ...current, [key]: state });
  }, []);
  const selected = totals[selectedMetric];
  const label = selectedMetric === "overdue" ? "Overdue" : "Waiting";
  return <section className="my-work-top-cards my-work-phase-summary" aria-label="Work overview">
    <div className={`my-work-phase-summary__grid${sitePresentation ? " my-work-phase-summary__grid--site" : ""}`} onFocusCapture={event => {
      const strip = event.currentTarget;
      if (strip.scrollWidth > strip.clientWidth) (event.target as HTMLElement).closest<HTMLElement>(".my-work-phase")?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }}>
      <article className={`my-work-phase my-work-phase-action${selectedMetric === "attention" ? " is-selected" : ""}`}><button type="button" className="my-work-phase__select" aria-label="Needs action: filter authorized tasks, reviews and decisions" aria-pressed={selectedMetric === "attention"} onClick={() => onOpenSources("actions")}>        <span className="my-work-phase__title"><span className="my-work-phase__icon" aria-hidden="true">◈</span><span>Needs action</span></span>
        <span className="my-work-action-counts"><ActionSourceCount label="Tasks" state={actionCounts?.actionableTasks} /><ActionSourceCount label="Reviews" state={actionCounts?.assignedReviews} /><ActionSourceCount label="Decisions" state={actionCounts?.decisions} /></span>
        <small className="my-work-phase__hint"><span>Separate exact source counts</span></small>
      </button></article>
      {sitePresentation && <SiteSnagCount key={accountId ?? "current-session"} accountId={accountId} refreshVersion={refreshVersion} onSessionExpired={onSessionExpired} />}
      <MetricCount metric="overdue" label="Overdue" hint="Past Target · unfinished" icon="◷" filters={filters} selected={selectedMetric === "overdue"} refreshVersion={refreshVersion} onSelect={onSelect} onChanged={changed} onCalendar={onOverdueCalendar} onSessionExpired={onSessionExpired} />
      {!sitePresentation && <><MetricCount metric="reviews" label="Reviews" hint="Pending review / correction tasks" icon="◇" filters={filters} selected={selectedMetric === "reviews"} refreshVersion={refreshVersion} onSelect={onSelect} onChanged={changed} onSessionExpired={onSessionExpired} />
      <MetricCount metric="waiting" label="Waiting / blocked" hint="Waiting tasks only" icon="⊘" filters={filters} selected={selectedMetric === "waiting"} refreshVersion={refreshVersion} onSelect={onSelect} onChanged={changed} onSessionExpired={onSessionExpired} /></>}
    </div>
    {showSelection && ["overdue", "waiting"].includes(selectedMetric) && <p className="my-work-phase-summary__selection" role="status">
      {selected?.status === "ready" ? `${label} · ${selected.total} personal ${selected.total === 1 ? "task" : "tasks"}` : selected?.status === "stale" ? `${label} count is a stale snapshot; refresh before relying on it.` : selected?.status === "denied" ? `${label} count is not available to this account.` : selected?.status === "unavailable" ? `${label} count is unavailable.` : `Loading ${label.toLowerCase()} count`}
      {queueStale && <span> The task list is a stale snapshot{queueRefreshedAt ? ` from ${new Date(queueRefreshedAt).toLocaleString()}` : ""} and may not match this count.</span>}
      {selectedMetric === "overdue" && <span> Target through {selected?.before ?? "the previous organization day"}.{(filters.dateFrom || filters.dateTo) && " Applied date range is paused; Clear restores it."}</span>}
      <button type="button" aria-label="Clear work card selection" onClick={() => onSelect("")}>Clear</button>
    </p>}
  </section>;
}

function siteSnagTotal(body: Record<string, unknown>): number {
  const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
  const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const invalid = () => new Error("The complete authorized Site snag count is unavailable.");
  if (body.source !== "site" || typeof body.readCompletedAt !== "string" || !Number.isFinite(Date.parse(body.readCompletedAt)) || !Array.isArray(body.sections)) throw invalid();
  const ids = new Set<string>();
  for (const section of body.sections) {
    if (!object(section) || typeof section.key !== "string" || !Array.isArray(section.rows) || section.unavailable) throw invalid();
    for (const row of section.rows) {
      if (!object(row) || !object(row.sourceRef)) throw invalid();
      const ref = row.sourceRef;
      if (!uuid(ref.projectId) || section.key !== `site:${ref.projectId}`) throw invalid();
      if (ref.type === "PROJECT") continue;
      if (ref.type !== "SITE_RECORD" || !uuid(ref.recordId) || typeof ref.recordKind !== "string" || !["PACKAGE", "REPORT", "SNAG", "MANPOWER", "NOTE", "HANDOVER"].includes(ref.recordKind)) throw invalid();
      // This is an all-state record count, not a task predicate, open-snag
      // policy, employee-responsibility count or authority to act on a snag.
      if (ref.recordKind === "SNAG") ids.add(`${ref.projectId}:${ref.recordId}`);
    }
  }
  return ids.size;
}

function SiteSnagCount({ accountId, refreshVersion, onSessionExpired }: {
  accountId: string | undefined;
  refreshVersion: number;
  onSessionExpired: (() => void) | undefined;
}): React.JSX.Element {
  const [state, setState] = useState<CountState & { accountId: string | undefined }>({ status: "loading", accountId });
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const visible: CountState = state.accountId === accountId ? state : { status: "loading" };
  useEffect(() => {
    const retryOnReturn = () => { if (document.visibilityState !== "hidden") setRevision(value => value + 1); };
    window.addEventListener("focus", retryOnReturn);
    document.addEventListener("visibilitychange", retryOnReturn);
    return () => { window.removeEventListener("focus", retryOnReturn); document.removeEventListener("visibilitychange", retryOnReturn); };
  }, []);
  useEffect(() => {
    const id = ++request.current;
    const controller = new AbortController();
    setState(current => current.accountId === accountId ? { ...current, status: "loading" } : { status: "loading", accountId });
    const endSession = () => { request.current += 1; controller.abort(); setState({ status: "unavailable", accountId, message: "Sign in to refresh Site records." }); };
    window.addEventListener("sense-session-ended", endSession);
    void fetch("/api/v1/dashboard/sources/site", { credentials: "include", cache: "no-store", signal: controller.signal }).then(readResponse).then(body => {
      const total = siteSnagTotal(body);
      if (request.current === id && !controller.signal.aborted) setState({ status: "ready", accountId, total, refreshedAt: Date.parse(body.readCompletedAt as string) });
    }).catch((cause: unknown) => {
      if (request.current !== id || controller.signal.aborted) return;
      const status = cause instanceof Error ? (cause as Error & { status?: number }).status : undefined;
      if (status === 401) onSessionExpired?.();
      setState(current => ![401, 403, 404].includes(status ?? 0) && current.accountId === accountId && current.total !== undefined
        ? { ...current, status: "stale", message: "Site records could not be refreshed." }
        : { status: status === 403 || status === 404 ? "denied" : "unavailable", accountId, message: status === 403 || status === 404 ? "Site records are not available to this account." : "Site records could not be loaded." });
    });
    return () => { request.current += 1; controller.abort(); window.removeEventListener("sense-session-ended", endSession); };
  }, [accountId, refreshVersion, revision, onSessionExpired]);
  const value = visible.status === "ready" ? visible.total : visible.status === "stale" ? `${visible.total} · Stale` : visible.status === "loading" ? "Loading…" : visible.status === "denied" ? "Not available" : "Unavailable";
  const content = <><span className="my-work-phase__title"><span className="my-work-phase__icon" aria-hidden="true">◇</span><span>Site snags</span></span><strong>{value}</strong><small className="my-work-phase__hint">Open Site delivery ↗</small></>;
  return <article className="my-work-phase" aria-label="Site snags summary">
    {visible.status === "ready" || visible.status === "stale" ? <a href="/site" className="my-work-phase__select" aria-label={`Site snags: ${value}`}>{content}</a>
      : <div className="my-work-phase__select" aria-label={`Site snags: ${value}`} role="status">{content}</div>}
    <p className="my-work-phase__source-error">All states across authorized sites. Task filters do not apply.</p>
    {["stale", "unavailable", "denied"].includes(visible.status) && <div className="my-work-phase__source-error" role={visible.status === "unavailable" ? "alert" : "status"}>
      <span>{visible.status === "stale" ? `Stale · last read ${new Date(visible.refreshedAt ?? 0).toLocaleString()}. ` : ""}{visible.message}</span>
      {visible.status !== "denied" && <button type="button" onClick={() => setRevision(value => value + 1)}>Retry Site snag count</button>}
    </div>}
  </article>;
}

function ActionSourceCount({ label, state }: { label: string; state: MyWorkSourceCount | undefined }): React.JSX.Element {
  const status = state?.status ?? "loading";
  const value = status === "ready" || status === "stale" ? state?.total : status === "loading" ? "…" : "—";
  return <span className="my-work-action-count" aria-label={`${label}: ${status === "ready" ? value : status === "stale" ? `${value}, stale` : status === "denied" ? "Not available" : status === "unavailable" ? "Unavailable" : status === "excluded" ? "Excluded by filter" : "Loading"}`}><strong>{value}</strong><small>{label}</small>{status !== "ready" && <small className="my-work-action-count-state">{status === "loading" ? "Loading" : status === "denied" ? "Not available" : status === "stale" ? "Stale" : status === "excluded" ? "Excluded by filter" : "Unavailable"}</small>}</span>;
}

function MetricCount({ metric, label, hint, icon, filters, selected, refreshVersion, onSelect, onChanged, onCalendar, onSessionExpired }: {
  metric: "overdue" | "reviews" | "waiting"; label: string; hint: string; icon: string;
  filters: Record<string, string>; selected: boolean; refreshVersion: number;
  onSelect: (metric: WorkMetric | "") => void;
  onChanged: (metric: string, state: CountState) => void;
  onCalendar?: ((calendar: OverdueCalendar) => void) | undefined;
  onSessionExpired?: (() => void) | undefined;
}): React.JSX.Element {
  const filterKey = JSON.stringify(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)));
  const [state, setState] = useState<CountState & { context: string }>({ status: "loading", context: filterKey });
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  const visible = state.context === filterKey ? state : { status: "loading" as const, context: filterKey };
  useEffect(() => { onChanged(metric, visible); }, [metric, onChanged, visible]);
  useEffect(() => {
    const retryOnReturn = (): void => { if (document.visibilityState !== "hidden") setRevision(value => value + 1); };
    window.addEventListener("focus", retryOnReturn);
    document.addEventListener("visibilitychange", retryOnReturn);
    return () => { window.removeEventListener("focus", retryOnReturn); document.removeEventListener("visibilitychange", retryOnReturn); };
  }, []);
  useEffect(() => {
    const id = ++request.current;
    const controller = new AbortController();
    const options = { credentials: "include" as const, cache: "no-store" as const, signal: controller.signal };
    const currentFilters = Object.fromEntries(JSON.parse(filterKey) as Array<[string, string]>);
    setState(current => current.context === filterKey ? { ...current, status: "loading" } : { status: "loading", context: filterKey });
    if (metric === "overdue") onCalendar?.({ status: "loading" });
    void (async () => {
      let before: string | undefined;
      if (metric === "overdue") {
        const calendar = await fetch("/api/v1/dashboard/sources/tasks", options).then(readResponse);
        if (calendar.source !== "tasks" || typeof calendar.today !== "string") throw new Error("The organization calendar is unavailable.");
        before = previousCalendarDay(calendar.today);
      }
      const endpoint = taskCountEndpoint(before ? overdueTaskFilters(currentFilters, before) : currentFilters, metric === "overdue" ? "active" : metric === "reviews" ? "reviews" : "waiting");
      const body = await fetch(endpoint, options).then(readResponse);
      if (!Number.isInteger(body.total) || (body.total as number) < 0 || !Array.isArray(body.items)) throw new Error("The server returned an invalid count.");
      if (request.current !== id) return;
      setState({ status: "ready", total: body.total as number, refreshedAt: Date.now(), context: filterKey, ...(before ? { before } : {}) });
      if (before) onCalendar?.({ status: "ready", before });
    })().catch((cause: unknown) => {
      if (request.current !== id || controller.signal.aborted) return;
      const status = cause instanceof Error ? (cause as Error & { status?: number }).status : undefined;
      if (status === 401) onSessionExpired?.();
      if (metric === "overdue") onCalendar?.({ status: "unavailable" });
      setState(current => status !== 401 && status !== 403 && current.context === filterKey && current.total !== undefined && current.refreshedAt !== undefined
        ? { ...current, status: "stale", message: cause instanceof Error ? cause.message : "Could not refresh this count." }
        : { status: status === 403 ? "denied" : "unavailable", context: filterKey, message: status === 403 ? "Not available to this account." : cause instanceof Error ? cause.message : "Could not load this count." });
    });
    return () => { request.current += 1; controller.abort(); };
  }, [filterKey, metric, onCalendar, onSessionExpired, refreshVersion, revision]);
  const value = visible.status === "ready" ? visible.total : visible.status === "stale" ? `${visible.total} · Stale` : visible.status === "loading" ? "Loading…" : visible.status === "denied" ? "Not available" : "Unavailable";
  const selectable = metric !== "overdue" || visible.status === "ready";
  return <article className={`my-work-phase my-work-phase-${metric}${selected ? " is-selected" : ""}`}>
    <button type="button" className="my-work-phase__select" aria-label={`${label}: ${value}`} aria-description={hint} title={selected ? "Click to show the full list" : "Click to view only these tasks"} aria-pressed={selected} disabled={!selectable && !selected} onClick={() => onSelect(selected ? "" : metric === "waiting" ? "waiting" : metric === "reviews" ? "reviews" : "overdue")}>
      <span className="my-work-phase__title"><span className="my-work-phase__icon" aria-hidden="true">{icon}</span><span>{label}</span></span><strong>{value}</strong>
      <small className="my-work-phase__hint"><span>{selected ? "Viewing matching tasks" : hint}</span><span className="my-work-phase__arrow" aria-hidden="true">{selected ? "✓" : "↗"}</span></small>
    </button>
    {["stale", "unavailable", "denied"].includes(visible.status) && <div className="my-work-phase__source-error" role={visible.status === "unavailable" ? "alert" : "status"}>
      <span>{visible.status === "stale" ? `Stale · last refreshed ${new Date(visible.refreshedAt ?? 0).toLocaleString()}. ` : ""}{visible.message}</span>
      {visible.status !== "denied" && <button type="button" onClick={() => setRevision(value => value + 1)}>Retry {label.toLowerCase()} count</button>}
    </div>}
  </article>;
}
