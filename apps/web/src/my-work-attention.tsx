import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./my-work-attention.css";

type ReviewItem = { roundId: string; taskId: string; taskTitle: string; projectTitle: string; projectId: string; roundNumber: number; status: string; revisionLabel?: string };
type AttentionTask = { id: string; title: string; projectTitle: string | null; reason: string };
type Page<T> = { total: number; items: T[] };
type SectionState<T> = { offset: number; page: Page<T> | undefined; loading: boolean; error: string; failureStatus: number | undefined; revision: number; refreshedAt: number | undefined; stale: boolean };
type SectionKey = "reviews" | "corrections" | "reassignment";
type Config<T> = { source: SectionKey; title: string; summaryTitle?: string; endpoint: (offset: number) => string; href: (item: T) => string; label: (item: T) => string; description: (item: T) => string; itemKey: (item: T) => string };

const LIMIT = 50;
const initial = (): SectionState<never> => ({ offset: 0, page: undefined, loading: true, error: "", failureStatus: undefined, revision: 0, refreshedAt: undefined, stale: false });

const PERSONAL_PHASES = [
  { key: "active", label: "Active personal tasks", short: "Active", icon: "◈" },
  { key: "waiting", label: "Waiting personal tasks", short: "Waiting", icon: "⊘" },
  { key: "review", label: "Personal tasks in review phase", short: "Review phase", icon: "◇" },
  { key: "completed", label: "Completed personal tasks", short: "Completed", icon: "✓" },
] as const;

type PhaseCountState = { status: "loading" | "ready" | "stale" | "denied" | "unavailable"; total?: number | undefined; message?: string | undefined; revision: number; contextKey: string; refreshedAt?: number | undefined };

function personalPhaseEndpoint(filterQuery: string, phase: string): string {
  const query = new URLSearchParams("scope=personal&offset=0&limit=1");
  const filters = new URLSearchParams(filterQuery);
  for (const [key, value] of filters) {
    if (key === "phase" || key === "offset" || key === "limit" || key === "scope") continue;
    if (key === "dateBasis" && !filters.get("dateFrom") && !filters.get("dateTo")) continue;
    if (value.trim()) query.set(key, value.trim());
  }
  query.set("phase", phase);
  return `/api/v1/tasks?${query.toString()}`;
}

export function MyWorkPhaseSummary({ filters, selectedPhase, onSelect, refreshVersion = 0, queueStale = false, queueRefreshedAt, onSessionExpired, includeAbout = true }: {
  filters: Record<string, string>;
  selectedPhase: string;
  onSelect: (phase: string) => void;
  refreshVersion?: number;
  queueStale?: boolean;
  queueRefreshedAt?: number | undefined;
  onSessionExpired?: (() => void) | undefined;
  includeAbout?: boolean;
}): React.JSX.Element {
  const filterQuery = new URLSearchParams(Object.entries(filters).sort(([left], [right]) => left.localeCompare(right))).toString();
  const contextKey = filterQuery;
  const [phaseTotals, setPhaseTotals] = useState<Record<string, { status: PhaseCountState["status"]; total: number | undefined; contextKey: string; refreshedAt?: number | undefined }>>({});
  const expired = useRef(false);
  const handleSessionExpired = useCallback(() => {
    if (expired.current) return;
    expired.current = true;
    onSessionExpired?.();
  }, [onSessionExpired]);
  const updatePhaseTotal = useCallback((phase: string, status: PhaseCountState["status"], total: number | undefined, key: string, refreshedAt?: number) => {
    setPhaseTotals((current) => current[phase]?.status === status && current[phase]?.total === total && current[phase]?.contextKey === key && current[phase]?.refreshedAt === refreshedAt ? current : { ...current, [phase]: { status, total, contextKey: key, refreshedAt } });
  }, []);
  const selected = PERSONAL_PHASES.find((phase) => phase.key === selectedPhase);
  const storedTotal = selectedPhase ? phaseTotals[selectedPhase] : undefined;
  const selectedTotal = storedTotal?.contextKey === contextKey ? storedTotal : undefined;
  return <section className="my-work-phase-summary" aria-label="Personal task phases">
    <div className="my-work-phase-summary__grid">
      {PERSONAL_PHASES.map((phase) => <PersonalPhaseCount key={phase.key} phase={phase.key} label={phase.label} shortLabel={phase.short} icon={phase.icon} filterQuery={filterQuery} refreshVersion={refreshVersion} selected={selectedPhase === phase.key} onSelect={onSelect} onCountChange={updatePhaseTotal} onSessionExpired={handleSessionExpired} />)}
    </div>
    {selected && <p className="my-work-phase-summary__selection" role="status">{queueStale ? `The task list is a stale snapshot${queueRefreshedAt ? ` from ${new Date(queueRefreshedAt).toLocaleString()}` : ""} and may not match this summary.` : selectedTotal?.status === "ready" ? `${selected.short} · ${selectedTotal.total} personal ${selectedTotal.total === 1 ? "task" : "tasks"}` : selectedTotal?.status === "stale" ? `${selected.short} task count is a stale snapshot from ${new Date(selectedTotal.refreshedAt ?? 0).toLocaleString()}; the task list may have changed` : selectedTotal?.status === "denied" ? `${selected.short} task count is not available to this account` : selectedTotal?.status === "unavailable" ? `${selected.short} task count is unavailable` : `Loading ${selected.short.toLowerCase()} task count`}  <button type="button" aria-label="Clear phase selection" onClick={() => onSelect("")}>Clear</button></p>}
    {includeAbout && <MyWorkTaskCountInformation />}
  </section>;
}

export function MyWorkTaskCountInformation(): React.JSX.Element {
  return <details className="my-work-phase-summary__about">
    <summary>About task counts</summary>
    <p>Counts include tasks you own or where you are explicitly listed as a collaborator. Review includes approved and correction work; it does not include your reviewer inbox. The task list remains paginated.</p>
    <p>The top Reviews card filters pending review and correction tasks. Assigned reviewer obligations remain separate from owned tasks. Needs action filters authorized task, review and decision actions in one queue, retaining separate source counts. Overdue uses unfinished personal tasks past their Target date in the organization calendar; its temporary date preset clears back to your applied filters. Waiting / blocked counts Waiting tasks only. Counts and the task queue refresh independently.</p>
  </details>;
}

function PersonalPhaseCount({ phase, label, shortLabel, icon, filterQuery, refreshVersion, selected, onSelect, onCountChange, onSessionExpired }: {
  phase: string; label: string; shortLabel: string; icon: string; filterQuery: string; refreshVersion: number; selected: boolean;
  onSelect: (phase: string) => void; onCountChange: (phase: string, status: PhaseCountState["status"], total: number | undefined, contextKey: string, refreshedAt?: number) => void; onSessionExpired: () => void;
}): React.JSX.Element {
  const [state, setState] = useState<PhaseCountState>({ status: "loading", revision: 0, contextKey: "" });
  const sequence = useRef(0);
  const contextKey = filterQuery;
  const visibleState = state.contextKey === contextKey ? state : { status: "loading" as const, revision: state.revision, contextKey };
  useEffect(() => { onCountChange(phase, visibleState.status, visibleState.total, contextKey, visibleState.refreshedAt); }, [contextKey, onCountChange, phase, visibleState.status, visibleState.total, visibleState.refreshedAt]);
  useEffect(() => {
    const requestId = ++sequence.current;
    const controller = new AbortController();
    setState((current) => current.contextKey === contextKey
      ? { ...current, status: "loading", message: undefined }
      : { status: "loading", revision: current.revision, contextKey });
    void fetch(personalPhaseEndpoint(filterQuery, phase), { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.clone().json().catch(() => ({})) as { message?: string; error?: { message?: string } };
          const error = new Error(body.error?.message ?? body.message ?? `Could not load this count (${response.status}).`) as Error & { status: number };
          error.status = response.status;
          throw error;
        }
        const body = await response.json() as Partial<Page<unknown>>;
        if (!Number.isInteger(body.total) || (body.total ?? -1) < 0 || !Array.isArray(body.items)) throw new Error("The server returned an invalid task count.");
        return body.total as number;
      })
      .then((total) => { if (sequence.current === requestId) setState((current) => ({ status: "ready", total, revision: current.revision, contextKey, refreshedAt: Date.now() })); })
      .catch((cause: unknown) => {
        if (sequence.current !== requestId || cause instanceof DOMException && cause.name === "AbortError") return;
        const status = cause instanceof Error ? (cause as Error & { status?: number }).status : undefined;
        if (status === 401) onSessionExpired();
        setState((current) => status !== 401 && status !== 403 && current.total !== undefined && current.refreshedAt !== undefined
          ? { ...current, status: "stale", message: cause instanceof Error ? cause.message : "Could not refresh this count.", revision: current.revision, contextKey }
          : { status: status === 403 ? "denied" : "unavailable", message: status === 403 ? "Not available to this account." : cause instanceof Error ? cause.message : "Could not load this count.", revision: current.revision, contextKey });
      });
    return () => { controller.abort(); sequence.current += 1; };
  }, [contextKey, filterQuery, onSessionExpired, phase, refreshVersion, state.revision]);
  const retry = (): void => setState((current) => ({ ...current, status: "loading", message: undefined, revision: current.revision + 1, contextKey }));
  return <article className={`my-work-phase my-work-phase-${phase}${selected ? " is-selected" : ""}`}>
    <button type="button" className="my-work-phase__select" aria-label={`${label}: ${visibleState.status === "ready" ? visibleState.total : visibleState.status === "stale" ? `Stale count ${visibleState.total}` : visibleState.status === "loading" ? "Loading" : visibleState.status === "denied" ? "Not available" : "Unavailable"}`} aria-description={selected ? "Selected; click to clear" : "Open matching tasks"} aria-pressed={selected} onFocus={(event) => { const strip = event.currentTarget.closest<HTMLElement>(".my-work-phase-summary__grid"); if (strip && strip.scrollWidth > strip.clientWidth) event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" }); }} onClick={() => onSelect(selected ? "" : phase)}>
      <span className="my-work-phase__title"><span className="my-work-phase__icon" aria-hidden="true">{icon}</span><span>{shortLabel}</span></span>
      <strong>{visibleState.status === "ready" ? visibleState.total : visibleState.status === "stale" ? `${visibleState.total} · Stale` : visibleState.status === "loading" ? "Loading…" : visibleState.status === "denied" ? "Not available" : "Unavailable"}</strong>
      <small className="my-work-phase__hint"><span>{selected ? "Selected · click to clear" : "Open matching tasks"}</span><span className="my-work-phase__arrow" aria-hidden="true">{selected ? "✓" : "↗"}</span></small>
    </button>
    {visibleState.status === "unavailable" && <div className="my-work-phase__source-error" role="alert"><span>{visibleState.message}</span><button type="button" onClick={retry}>Retry {shortLabel.toLowerCase()} count</button></div>}
    {visibleState.status === "stale" && <div className="my-work-phase__source-error" role="status"><span>Stale · last successfully refreshed {new Date(visibleState.refreshedAt ?? 0).toLocaleString()}. {visibleState.message}</span><button type="button" onClick={retry}>Retry {shortLabel.toLowerCase()} count</button></div>}
    {visibleState.status === "denied" && <p className="my-work-phase__source-error" role="status">{visibleState.message}</p>}
  </article>;
}

async function readPage<T>(response: Response): Promise<Page<T>> {
  if (!response.ok) {
    const body = await response.clone().json().catch(() => ({})) as { message?: string; error?: { message?: string } };
    const error = new Error(body.error?.message ?? body.message ?? `Could not load this list (${response.status}).`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  const body = await response.json() as Partial<Page<T>>;
  if (!Number.isInteger(body.total) || (body.total ?? -1) < 0 || !Array.isArray(body.items)) throw new Error("The server returned an invalid attention list.");
  return body as Page<T>;
}

function useIndependentPage<T>(key: SectionKey, endpoint: (offset: number) => string, onUnauthorized: () => void) {
  const [state, setState] = useState<SectionState<T>>(() => initial() as SectionState<T>);
  const request = useRef(0);
  useEffect(() => {
    const offset = state.offset;
    const id = ++request.current;
    const controller = new AbortController();
    setState((current) => ({ ...current, offset, loading: true, error: "", failureStatus: undefined, stale: false }));
    void fetch(endpoint(offset), { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(readPage<T>)
      .then((page) => { if (request.current === id) setState((current) => ({ ...current, offset, page, loading: false, error: "", refreshedAt: Date.now(), stale: false })); })
      .catch((error: unknown) => {
        if (request.current !== id || error instanceof DOMException && error.name === "AbortError") return;
        const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
        if (status === 401) onUnauthorized();
        setState((current) => status !== 401 && status !== 403 && current.page
          ? { ...current, offset, loading: false, failureStatus: status, stale: true, error: error instanceof Error ? error.message : "Could not refresh this list." }
          : { ...current, offset, page: undefined, loading: false, failureStatus: status, stale: false, refreshedAt: undefined, error: error instanceof Error ? error.message : "Could not load this list." });
      });
    return () => controller.abort();
  }, [key, endpoint, onUnauthorized, state.offset, state.revision]);
  const retry = useCallback(() => setState((current) => ({ ...current, error: "", failureStatus: undefined, revision: current.revision + 1 })), []);
  const pageTo = useCallback((offset: number) => setState((current) => ({ ...current, offset: Math.max(0, offset), page: undefined, refreshedAt: undefined, stale: false })), []);
  const refresh = useCallback(() => setState((current) => ({ ...current, error: "", failureStatus: undefined, revision: current.revision + 1 })), []);
  return { state, retry, pageTo, refresh };
}

const reviewConfig: Config<ReviewItem> = {
  source: "reviews",
  title: "Reviews awaiting you",
  summaryTitle: "Reviews",
  endpoint: (offset) => `/api/v1/reviews/inbox?personal=true&offset=${offset}&limit=${LIMIT}`,
  href: (item) => `/reviews?taskId=${encodeURIComponent(item.taskId)}&roundId=${encodeURIComponent(item.roundId)}`,
  label: (item) => item.taskTitle,
  description: (item) => `${item.projectTitle} · Round ${item.roundNumber}${item.revisionLabel ? ` · Revision ${item.revisionLabel}` : ""}`,
  itemKey: (item) => item.roundId,
};
const correctionConfig: Config<AttentionTask> = {
  source: "corrections",
  title: "Your correction tasks",
  summaryTitle: "Corrections",
  endpoint: (offset) => `/api/v1/tasks/attention?kind=corrections&offset=${offset}&limit=${LIMIT}`,
  href: (item) => `/tasks?taskId=${encodeURIComponent(item.id)}`,
  label: (item) => item.title,
  description: (item) => item.projectTitle ? `${item.projectTitle} · ${item.reason}` : item.reason,
  itemKey: (item) => item.id,
};
const reassignmentConfig: Config<AttentionTask> = {
  source: "reassignment",
  title: "Management: employee-exit reassignment",
  summaryTitle: "Management",
  endpoint: (offset) => `/api/v1/tasks/attention?kind=reassignment&offset=${offset}&limit=${LIMIT}`,
  href: (item) => `/tasks?taskId=${encodeURIComponent(item.id)}`,
  label: (item) => item.title,
  description: (item) => item.projectTitle ? `${item.projectTitle} · ${item.reason}` : item.reason,
  itemKey: (item) => item.id,
};

export type MyWorkAttentionSourceRequest = { source: "actions" | "reviews"; version: number };
export type MyWorkSourceCount = { status: "loading" | "ready" | "stale" | "denied" | "unavailable" | "excluded"; total?: number | undefined };
export type MyWorkActionCounts = {
  corrections?: MyWorkSourceCount;
  management?: MyWorkSourceCount;
  actionableTasks?: MyWorkSourceCount;
  assignedReviews?: MyWorkSourceCount;
  decisions?: MyWorkSourceCount;
};

function sourceCount(state: SectionState<unknown>): MyWorkSourceCount {
  if (state.failureStatus === 401) return { status: "unavailable" };
  if (state.failureStatus === 403) return { status: "denied" };
  if (state.loading) return { status: "loading" };
  if (state.stale && state.page) return { status: "stale", total: state.page.total };
  if (state.error || !state.page) return { status: "unavailable" };
  return { status: "ready", total: state.page.total };
}

export function MyWorkManagement({ onSessionExpired, prioritizeReassignment = false }: { onSessionExpired?: (() => void) | undefined; prioritizeReassignment?: boolean }): React.JSX.Element | null {
  const expiredRef = useRef(onSessionExpired);
  expiredRef.current = onSessionExpired;
  const expired = useCallback(() => expiredRef.current?.(), []);
  const reassignment = useIndependentPage<AttentionTask>("reassignment", reassignmentConfig.endpoint, expired);
  if (!reassignment.state.loading && !reassignment.state.error && !reassignment.state.stale && reassignment.state.page?.total === 0) return null;
  return <section className="my-work-attention" aria-label="Authorized management obligations"><AttentionDisclosure config={reassignmentConfig} {...reassignment} defaultOpen={prioritizeReassignment} /></section>;
}

export function MyWorkAttention({ onSessionExpired, prioritizeReassignment = false, sourceRequest, onActionCounts }: { onSessionExpired?: () => void; prioritizeReassignment?: boolean; sourceRequest?: MyWorkAttentionSourceRequest | undefined; onActionCounts?: ((counts: MyWorkActionCounts) => void) | undefined }): React.JSX.Element {
  const [modalRequest, setModalRequest] = useState<MyWorkAttentionSourceRequest | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const hadModal = useRef(false);
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;
  const handleUnauthorized = useCallback(() => onSessionExpiredRef.current?.(), []);
  const reviews = useIndependentPage<ReviewItem>("reviews", reviewConfig.endpoint, handleUnauthorized);
  const corrections = useIndependentPage<AttentionTask>("corrections", correctionConfig.endpoint, handleUnauthorized);
  const reassignment = useIndependentPage<AttentionTask>("reassignment", reassignmentConfig.endpoint, handleUnauthorized);
  const actionCounts = useMemo(() => ({ corrections: sourceCount(corrections.state), management: sourceCount(reassignment.state) }), [corrections.state, reassignment.state]);
  useEffect(() => {
    onActionCounts?.(actionCounts);
  }, [onActionCounts, actionCounts]);
  const latestSources = useRef({ reviews, corrections, reassignment });
  latestSources.current = { reviews, corrections, reassignment };
  const confirmedEmpty = (state: SectionState<unknown>) => Boolean(state.page && state.page.total === 0 && state.page.items.length === 0 && !state.loading && !state.stale && !state.error && !state.failureStatus);
  const requestedSource = sourceRequest?.source;
  const requestedVersion = sourceRequest?.version;
  useEffect(() => {
    if (!requestedSource || requestedVersion === undefined) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setModalRequest({ source: requestedSource, version: requestedVersion });
    const refreshLoaded = <T,>(state: SectionState<T>, refresh: () => void): void => { if (state.page && !state.loading) refresh(); };
    const sources = latestSources.current;
    if (requestedSource === "reviews") refreshLoaded(sources.reviews.state, sources.reviews.refresh);
    else {
      refreshLoaded(sources.corrections.state, sources.corrections.refresh);
      refreshLoaded(sources.reassignment.state, sources.reassignment.refresh);
    }
  }, [requestedSource, requestedVersion, reviews.refresh, corrections.refresh, reassignment.refresh]);
  useEffect(() => {
    if (modalRequest) { hadModal.current = true; return; }
    if (hadModal.current) {
      hadModal.current = false;
      returnFocus.current?.focus();
      returnFocus.current = null;
    }
  }, [modalRequest]);
  const showReviewsInModal = modalRequest?.source === "reviews";
  const showActionsInModal = modalRequest?.source === "actions";
  return <section className="my-work-attention" aria-label="Work needing attention">
    {!showReviewsInModal && !confirmedEmpty(reviews.state) && <AttentionDisclosure config={reviewConfig} {...reviews} />}
    {!showActionsInModal && !confirmedEmpty(corrections.state) && <AttentionDisclosure config={correctionConfig} {...corrections} />}
    {!showActionsInModal && !confirmedEmpty(reassignment.state) && <AttentionDisclosure config={reassignmentConfig} {...reassignment} defaultOpen={prioritizeReassignment} />}
    {modalRequest && <AttentionModal source={modalRequest.source} onClose={() => setModalRequest(null)}>
      {modalRequest.source === "reviews" ? <AttentionSection config={reviewConfig} {...reviews} /> : <>
        <a className="my-work-attention__modal-link" href="/decisions">Open decisions</a>
        <AttentionSection config={correctionConfig} {...corrections} />
        <AttentionSection config={reassignmentConfig} {...reassignment} />
        <div className="my-work-attention__client-context"><p>Client reviews are project context and have no personal count.</p><a className="my-work-attention__modal-link" href="/client-reviews">Open project client reviews</a></div>
      </>}
    </AttentionModal>}
  </section>;
}

function AttentionModal({ source, onClose, children }: { source: "actions" | "reviews"; onClose: () => void; children: React.ReactNode }): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const title = source === "reviews" ? "Reviews awaiting you" : "Work needing attention";
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);
  const close = (): void => {
    const dialog = dialogRef.current;
    if (dialog?.open && typeof dialog.close === "function") dialog.close();
    else onClose();
  };
  return createPortal(<dialog ref={dialogRef} className="my-work-attention__modal" aria-labelledby="my-work-attention-modal-title" onClose={onClose}>
    <header className="my-work-attention__modal-header"><h2 id="my-work-attention-modal-title">{title}</h2><button type="button" className="my-work-attention__modal-close" onClick={close} aria-label="Close">Close</button></header>
    <div className="my-work-attention__modal-content">{children}</div>
  </dialog>, document.body);
}

function AttentionDisclosure<T>({ config, state, retry, pageTo, refresh, defaultOpen = false }: { config: Config<T>; state: SectionState<T>; retry: () => void; pageTo: (offset: number) => void; refresh: () => void; defaultOpen?: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  const total = state.page?.total;
  const needsAttention = (total ?? 0) > 0 || state.stale || !!state.error || state.failureStatus === 401 || state.failureStatus === 403;
  useEffect(() => { if (needsAttention) setOpen(true); }, [needsAttention]);
  const summary = state.loading ? "Loading" : state.failureStatus === 403 ? "Access not available" : state.failureStatus === 401 ? "Session ended" : state.stale ? `Stale · ${total} items` : state.error ? "Unavailable" : total === undefined ? "Not loaded" : `${total} ${total === 1 ? "item" : "items"}`;
  return <details className="my-work-attention__disclosure" data-work-source={config.source} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><span>{config.summaryTitle ?? config.title}</span><strong>{summary}</strong></summary>
    <AttentionSection config={config} state={state} retry={retry} pageTo={pageTo} refresh={refresh} />
  </details>;
}

function AttentionSection<T>({ config, state, retry, pageTo, refresh }: { config: Config<T>; state: SectionState<T>; retry: () => void; pageTo: (offset: number) => void; refresh: () => void }): React.JSX.Element {
  const total = state.page?.total ?? 0;
  const start = state.page?.items.length ? state.offset + 1 : 0;
  const end = state.page?.items.length ? state.offset + state.page.items.length : 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const pageNumber = Math.floor(state.offset / LIMIT) + 1;
  const headingId = `attention-${config.title.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return <section className="my-work-attention__section" aria-labelledby={headingId}>
    <header><h2 id={headingId}>{config.title}</h2><button type="button" onClick={refresh} disabled={state.loading}>Refresh</button></header>
    {state.loading && <p role="status">{state.page ? "Refreshing…" : "Loading…"}</p>}
    {state.error && <div className={state.stale ? "my-work-attention__error is-stale" : "my-work-attention__error"} role={state.stale ? "status" : "alert"}><p>{state.stale && state.refreshedAt ? `Stale · last successfully refreshed ${new Date(state.refreshedAt).toLocaleString()}. ` : ""}{state.error}</p><button type="button" onClick={retry}>Retry {config.title.toLowerCase()}</button></div>}
    {state.page && (!state.failureStatus || state.stale) && <>
      {state.page.items.length === 0 ? <p className="my-work-attention__empty">Nothing in this list right now.</p> : <ul>
        {state.page.items.map((item) => <li key={config.itemKey(item)}><a href={config.href(item)}><strong>{config.label(item)}</strong><span>{config.description(item)}</span></a></li>)}
      </ul>}
      {total > LIMIT && <nav className="my-work-attention__pager" aria-label={`${config.title} pages`}><button type="button" disabled={state.loading || state.stale || state.offset === 0} onClick={() => pageTo(state.offset - LIMIT)}>Previous</button><span>{state.stale ? "Stale snapshot · " : ""}Showing {start}–{end} of {total} · Page {pageNumber} of {pages}</span><button type="button" disabled={state.loading || state.stale || state.offset + LIMIT >= total} onClick={() => pageTo(state.offset + LIMIT)}>Next</button></nav>}
    </>}
  </section>;
}
