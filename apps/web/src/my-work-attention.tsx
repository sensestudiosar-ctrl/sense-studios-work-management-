import { useCallback, useEffect, useRef, useState } from "react";
import "./my-work-attention.css";

type ReviewItem = { roundId: string; taskId: string; taskTitle: string; projectTitle: string; projectId: string; roundNumber: number; status: string; revisionLabel?: string };
type AttentionTask = { id: string; title: string; projectTitle: string | null; reason: string };
type Page<T> = { total: number; items: T[] };
type SectionState<T> = { offset: number; page: Page<T> | undefined; loading: boolean; error: string; revision: number };
type SectionKey = "reviews" | "corrections" | "reassignment";
type Config<T> = { title: string; endpoint: (offset: number) => string; href: (item: T) => string; label: (item: T) => string; description: (item: T) => string; itemKey: (item: T) => string };

const LIMIT = 50;
const initial = (): SectionState<never> => ({ offset: 0, page: undefined, loading: true, error: "", revision: 0 });

async function readPage<T>(response: Response): Promise<Page<T>> {
  if (!response.ok) {
    const body = await response.clone().json().catch(() => ({})) as { message?: string; error?: { message?: string } };
    const error = new Error(body.error?.message ?? body.message ?? `Could not load this list (${response.status}).`) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  const body = await response.json() as Partial<Page<T>>;
  if (!Number.isInteger(body.total) || !Array.isArray(body.items)) throw new Error("The server returned an invalid attention list.");
  return body as Page<T>;
}

function useIndependentPage<T>(key: SectionKey, endpoint: (offset: number) => string, onUnauthorized: () => void) {
  const [state, setState] = useState<SectionState<T>>(() => initial() as SectionState<T>);
  const request = useRef(0);
  useEffect(() => {
    const offset = state.offset;
    const id = ++request.current;
    const controller = new AbortController();
    setState((current) => ({ ...current, offset, loading: true, error: "", page: undefined }));
    void fetch(endpoint(offset), { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(readPage<T>)
      .then((page) => { if (request.current === id) setState((current) => ({ ...current, offset, page, loading: false, error: "" })); })
      .catch((error: unknown) => {
        if (request.current !== id || error instanceof DOMException && error.name === "AbortError") return;
        if (error instanceof Error && (error as Error & { status?: number }).status === 401) onUnauthorized();
        setState((current) => ({ ...current, offset, page: undefined, loading: false, error: error instanceof Error ? error.message : "Could not load this list." }));
      });
    return () => controller.abort();
  }, [key, endpoint, onUnauthorized, state.offset, state.revision]);
  const retry = () => setState((current) => ({ ...current, revision: current.revision + 1 }));
  const pageTo = (offset: number) => setState((current) => ({ ...current, offset: Math.max(0, offset) }));
  return { state, retry, pageTo };
}

const reviewConfig: Config<ReviewItem> = {
  title: "Reviews awaiting you",
  endpoint: (offset) => `/api/v1/reviews/inbox?personal=true&offset=${offset}&limit=${LIMIT}`,
  href: (item) => `/reviews?taskId=${encodeURIComponent(item.taskId)}&roundId=${encodeURIComponent(item.roundId)}`,
  label: (item) => item.taskTitle,
  description: (item) => `${item.projectTitle} · Round ${item.roundNumber}${item.revisionLabel ? ` · Revision ${item.revisionLabel}` : ""}`,
  itemKey: (item) => item.roundId,
};
const correctionConfig: Config<AttentionTask> = {
  title: "Your correction tasks",
  endpoint: (offset) => `/api/v1/tasks/attention?kind=corrections&offset=${offset}&limit=${LIMIT}`,
  href: (item) => `/tasks?taskId=${encodeURIComponent(item.id)}`,
  label: (item) => item.title,
  description: (item) => item.projectTitle ? `${item.projectTitle} · ${item.reason}` : item.reason,
  itemKey: (item) => item.id,
};
const reassignmentConfig: Config<AttentionTask> = {
  title: "Management: employee-exit reassignment",
  endpoint: (offset) => `/api/v1/tasks/attention?kind=reassignment&offset=${offset}&limit=${LIMIT}`,
  href: (item) => `/tasks?taskId=${encodeURIComponent(item.id)}`,
  label: (item) => item.title,
  description: (item) => item.projectTitle ? `${item.projectTitle} · ${item.reason}` : item.reason,
  itemKey: (item) => item.id,
};

export function MyWorkAttention({ onSessionExpired }: { onSessionExpired?: () => void }): React.JSX.Element {
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;
  const handleUnauthorized = useCallback(() => onSessionExpiredRef.current?.(), []);
  const reviews = useIndependentPage<ReviewItem>("reviews", reviewConfig.endpoint, handleUnauthorized);
  const corrections = useIndependentPage<AttentionTask>("corrections", correctionConfig.endpoint, handleUnauthorized);
  const reassignment = useIndependentPage<AttentionTask>("reassignment", reassignmentConfig.endpoint, handleUnauthorized);
  return <section className="my-work-attention" aria-label="Work needing attention">
    <AttentionSection config={reviewConfig} {...reviews} />
    <AttentionSection config={correctionConfig} {...corrections} />
    <AttentionSection config={reassignmentConfig} {...reassignment} />
  </section>;
}

function AttentionSection<T>({ config, state, retry, pageTo }: { config: Config<T>; state: SectionState<T>; retry: () => void; pageTo: (offset: number) => void }): React.JSX.Element {
  const total = state.page?.total ?? 0;
  const start = state.page?.items.length ? state.offset + 1 : 0;
  const end = state.page?.items.length ? state.offset + state.page.items.length : 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const pageNumber = Math.floor(state.offset / LIMIT) + 1;
  return <section className="my-work-attention__section" aria-labelledby={`attention-${config.title.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
    <header><h2 id={`attention-${config.title.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>{config.title}</h2>{state.page && !state.loading && <span className="my-work-attention__count">{total} {total === 1 ? "item" : "items"}</span>}</header>
    {state.loading && <p role="status">Loading…</p>}
    {state.error && <div className="my-work-attention__error" role="alert"><p>{state.error}</p><button type="button" onClick={retry}>Retry {config.title.toLowerCase()}</button></div>}
    {!state.loading && !state.error && state.page && <>
      {state.page.items.length === 0 ? <p className="my-work-attention__empty">Nothing in this list right now.</p> : <ul>
        {state.page.items.map((item) => <li key={config.itemKey(item)}><a href={config.href(item)}><strong>{config.label(item)}</strong><span>{config.description(item)}</span></a></li>)}
      </ul>}
      {total > LIMIT && <nav className="my-work-attention__pager" aria-label={`${config.title} pages`}><button type="button" disabled={state.loading || state.offset === 0} onClick={() => pageTo(state.offset - LIMIT)}>Previous</button><span>Showing {start}–{end} of {total} · Page {pageNumber} of {pages}</span><button type="button" disabled={state.loading || state.offset + LIMIT >= total} onClick={() => pageTo(state.offset + LIMIT)}>Next</button></nav>}
    </>}
  </section>;
}
