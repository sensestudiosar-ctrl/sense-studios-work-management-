import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowSearchParams } from "./use-window-search-params.js";

type ApprovalItem = {
  id: string;
  typeKey: string;
  title: string;
  summary: string;
  subjectLabel: string;
  reason: string;
  requesterLabel: string;
  approvalLevel: string;
  requestedAt: string;
  expiresAt: string | null;
};

type AttentionPage = { items: ApprovalItem[]; nextCursor: string | null };

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

export function ApprovalQueue({ title = "Needs your attention", hideWhenEmpty = false }: { title?: string; hideWhenEmpty?: boolean }): React.JSX.Element | null {
  const [searchParams] = useWindowSearchParams();
  const requestedApprovalId = searchParams.get("approvalId") ?? "";
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [loadMoreError, setLoadMoreError] = useState<string>();
  const [selectedError, setSelectedError] = useState<string>();
  const [focusedApprovalId, setFocusedApprovalId] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<number | undefined>(undefined);
  const refreshedAtRef = useRef<number | undefined>(undefined);
  const [stale, setStale] = useState(false);
  const [confirmedEmptyPage, setConfirmedEmptyPage] = useState(false);
  const queueContext = useRef(requestedApprovalId);
  const requestSequence = useRef(0);
  const loadMoreSequence = useRef(0);

  const loadQueue = useCallback(async (): Promise<void> => {
    const request = ++requestSequence.current;
    loadMoreSequence.current++;
    const contextChanged = queueContext.current !== requestedApprovalId;
    queueContext.current = requestedApprovalId;
    setLoading(true);
    setLoadingMore(false);
    setError(undefined);
    setLoadMoreError(undefined);
    setSelectedError(undefined);
    setFocusedApprovalId("");
    if (contextChanged) { setItems([]); setNextCursor(null); refreshedAtRef.current = undefined; setRefreshedAt(undefined); setStale(false); }
    try {
      const response = await fetch("/api/v1/approvals/attention?limit=30", {
        credentials: "include",
        cache: "no-store",
      });
      if (response.status === 401) throw new Error("signed-out");
      if (response.status === 403) throw new Error("forbidden");
      if (!response.ok) throw new Error("unavailable");
      const page = await response.json() as AttentionPage;
      if (request !== requestSequence.current) return;
      setConfirmedEmptyPage(Array.isArray(page.items) && page.items.length === 0 && page.nextCursor === null);
      setItems(Array.isArray(page.items) ? page.items : []);
      setNextCursor(page.nextCursor ?? null);
      refreshedAtRef.current = Date.now(); setRefreshedAt(refreshedAtRef.current);
      setStale(false);
      if (requestedApprovalId) {
        try {
          const selectedResponse = await fetch(`/api/v1/approvals/attention/${encodeURIComponent(requestedApprovalId)}`, { credentials: "include", cache: "no-store" });
          if (request !== requestSequence.current) return;
          if (selectedResponse.status === 401 || selectedResponse.status === 403) {
            setItems([]); setNextCursor(null); refreshedAtRef.current = undefined; setRefreshedAt(undefined); setStale(false);
            setError(selectedResponse.status === 401
              ? "Your session ended. Sign in again to view pending decisions."
              : "You don’t have access to this decision queue.");
          } else if (selectedResponse.status === 404) {
            setSelectedError("This decision is no longer pending or is unavailable to your account.");
          } else if (!selectedResponse.ok) {
            setSelectedError("We couldn’t load the requested decision. Try refreshing the queue.");
          } else {
            const selected = await selectedResponse.json() as ApprovalItem;
            if (request !== requestSequence.current) return;
            setFocusedApprovalId(selected.id);
            setItems(current => current.some(item => item.id === selected.id) ? current : [selected, ...current]);
          }
        } catch {
          if (request === requestSequence.current) setSelectedError("We couldn’t load the requested decision. Try refreshing the queue.");
        }
      }
    } catch (cause) {
      if (request !== requestSequence.current) return;
      const code = cause instanceof Error ? cause.message : "unavailable";
      if (code === "signed-out" || code === "forbidden") {
        setItems([]); setNextCursor(null); refreshedAtRef.current = undefined; setRefreshedAt(undefined); setStale(false);
      } else if (!contextChanged && refreshedAtRef.current !== undefined) setStale(true);
      setError(code === "signed-out"
        ? "Your session ended. Sign in again to view pending decisions."
        : code === "forbidden"
          ? "You don’t have access to this decision queue."
          : "We couldn’t load pending decisions. Try again.");
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }, [requestedApprovalId]);

  const loadMore = async (): Promise<void> => {
    if (!nextCursor || loadingMore) return;
    const parentRequest = requestSequence.current;
    const loadRequest = ++loadMoreSequence.current;
    setLoadingMore(true);
    setLoadMoreError(undefined);
    try {
      const response = await fetch(`/api/v1/approvals/attention?limit=30&cursor=${encodeURIComponent(nextCursor)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (response.status === 401) throw new Error("signed-out");
      if (response.status === 403) throw new Error("forbidden");
      if (!response.ok) throw new Error("unavailable");
      const page = await response.json() as AttentionPage;
      if (parentRequest !== requestSequence.current || loadRequest !== loadMoreSequence.current) return;
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...(page.items ?? []).filter((item) => !seen.has(item.id))];
      });
      setNextCursor(page.nextCursor ?? null);
    } catch (cause) {
      if (parentRequest !== requestSequence.current || loadRequest !== loadMoreSequence.current) return;
      const code = cause instanceof Error ? cause.message : "unavailable";
      const message = code === "signed-out"
        ? "Your session ended. Sign in again to view pending decisions."
        : code === "forbidden"
          ? "You don’t have access to this decision queue."
          : "We couldn’t load more pending decisions. Try again.";
      if (code === "signed-out" || code === "forbidden") {
        setItems([]);
        setNextCursor(null);
        refreshedAtRef.current = undefined; setRefreshedAt(undefined);
        setStale(false);
        setError(message);
      } else {
        setLoadMoreError(message);
      }
    } finally {
      if (parentRequest === requestSequence.current && loadRequest === loadMoreSequence.current) setLoadingMore(false);
    }
  };

  useEffect(() => { void loadQueue(); return () => { requestSequence.current++; }; }, [loadQueue]);
  useEffect(() => {
    if (requestedApprovalId && focusedApprovalId === requestedApprovalId) document.getElementById(`approval-${focusedApprovalId}`)?.focus();
  }, [focusedApprovalId, items, requestedApprovalId]);

  const sameContext = queueContext.current === requestedApprovalId;
  const visibleItems = sameContext ? items : [];
  const visibleError = sameContext ? error : undefined;
  const visibleSelectedError = sameContext ? selectedError : undefined;
  const visibleCursor = sameContext ? nextCursor : null;
  const visibleStale = sameContext && stale;
  if (hideWhenEmpty && !requestedApprovalId && sameContext && confirmedEmptyPage && visibleItems.length === 0 && visibleCursor === null && !loading && !loadingMore && !visibleError && !visibleSelectedError && !visibleStale) return null;
  return (
    <section className="identity-section approval-queue" aria-labelledby="approval-queue-heading">
      <div className="sessions-heading-row">
        <div><div className="eyebrow">MANAGEMENT</div><h2 id="approval-queue-heading">{title}</h2></div>
        <button className="secondary-action" type="button" onClick={() => void loadQueue()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="identity-note">Pending actions from your authorized work areas appear here.</p>
      {loading && <p className="identity-note" role="status">Loading pending decisions…</p>}
      {!loading && visibleError && <div className="sessions-error"><p className="auth-error" role="alert">{visibleError}</p>{visibleStale && refreshedAt && <p className="identity-note" role="status">Previous decision data is retained but hidden · last successfully refreshed {new Date(refreshedAt).toLocaleString()}. It may no longer reflect pending decisions.</p>}<button className="secondary-action" type="button" onClick={() => void loadQueue()}>Try again</button></div>}
      {!loading && !visibleError && visibleSelectedError && <p className="identity-note" role="status">{visibleSelectedError}</p>}
      {!loading && !visibleError && visibleItems.length === 0 && <div className="approval-queue-empty task-empty-state" role="status">
        <svg className="task-empty-state__icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10m-7 6h4"/></svg>
        <p className="task-empty-state__title">No pending decisions in this list.</p>
      </div>}
      {!loading && !visibleError && visibleItems.length > 0 && (
        <>
          <ul className="approval-queue-list">
          {visibleItems.map((item) => (
              <li id={`approval-${item.id}`} tabIndex={item.id === focusedApprovalId ? -1 : undefined} aria-current={item.id === focusedApprovalId ? "true" : undefined} className={`approval-queue-item${item.id === focusedApprovalId ? " is-selected" : ""}`} key={item.id}>
                <div className="approval-queue-copy">
                  <div className="approval-queue-meta"><span>{item.approvalLevel}</span><time dateTime={item.requestedAt}>Requested {dateLabel(item.requestedAt)}</time></div>
                  <h3>{item.title}</h3>
                  <p className="approval-queue-summary">{item.summary}</p>
                  <p><strong>{item.subjectLabel}</strong> · Requested by {item.requesterLabel}</p>
                  <p>Reason: {item.reason}</p>
                  {item.expiresAt && <p className="approval-queue-expiry">Decision due {dateLabel(item.expiresAt)}</p>}
                </div>
                <span className="approval-queue-type">{item.typeKey}</span>
              </li>
          ))}
          </ul>
          {loadMoreError && <p className="auth-error" role="alert">{loadMoreError}</p>}
          {visibleStale && refreshedAt && <p className="identity-note" role="status">Previous decision data may no longer reflect pending decisions · last successfully refreshed {new Date(refreshedAt).toLocaleString()}.</p>}
          {visibleCursor && <button className="secondary-action approval-load-more" type="button" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more"}</button>}
        </>
      )}
    </section>
  );
}
