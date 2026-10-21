import { useEffect, useState } from "react";

type ResourceKind = "documents" | "reviews";
type ResourceItem = { id: string; label: string; detail: string; href?: string };
type ResourceSummary = { total: number; items: ResourceItem[] };
type ResourceState = { context: string; summary?: ResourceSummary; error?: string; ended?: boolean };
const PREVIEW_LIMIT = 5;
const waitingReviewQuery = (projectId: string): string => new URLSearchParams({ projectId, scope: "accessible", queue: "waiting", sort: "due", offset: "0", limit: String(PREVIEW_LIMIT) }).toString();
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function text(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }

function readSummary(body: unknown, projectId: string, kind: ResourceKind): ResourceSummary {
  if (!object(body)) throw new Error("response");
  if (kind === "documents") {
    if (!object(body.project) || body.project.id !== projectId || !Array.isArray(body.files)) throw new Error("response");
    const ids = new Set<string>();
    const items = body.files.map((row): ResourceItem => {
      if (!object(row) || !text(row.id) || ids.has(row.id) || !text(row.fileName) || typeof row.viewOnly !== "boolean") throw new Error("response");
      ids.add(row.id);
      return { id: row.id, label: row.fileName, detail: row.viewOnly ? "View only" : "File" };
    });
    return { total: items.length, items: items.slice(0, PREVIEW_LIMIT) };
  }
  if (!Number.isSafeInteger(body.total) || (body.total as number) < 0 || !Array.isArray(body.items) || body.items.length > PREVIEW_LIMIT || (body.total as number) < body.items.length) throw new Error("response");
  const ids = new Set<string>();
  const items = body.items.map((row): ResourceItem => {
    if (!object(row) || row.projectId !== projectId || !text(row.roundId) || ids.has(row.roundId) || !text(row.taskId) || !text(row.taskTitle) || !Number.isSafeInteger(row.roundNumber) || (row.roundNumber as number) < 1 || !["SUBMITTED", "IN_REVIEW"].includes(String(row.status))) throw new Error("response");
    ids.add(row.roundId);
    const query = new URLSearchParams({ projectId, scope: "accessible", queue: "waiting", sort: "due", taskId: row.taskId, roundId: row.roundId });
    return { id: row.roundId, label: row.taskTitle, detail: `Round ${row.roundNumber as number} · ${row.status === "IN_REVIEW" ? "In review" : "Submitted"}`, href: `/reviews?${query}` };
  });
  return { total: body.total as number, items };
}

/** Compose only existing authorized reads; all commands remain in owning workspaces. */
export function ProjectResourceSummary({ projectId, kind, onSessionExpired }: { projectId: string; kind: ResourceKind; onSessionExpired: () => void }): React.JSX.Element {
  const context = `${kind}:${projectId}`;
  const [state, setState] = useState<ResourceState>({ context });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true; let ended = false; let generation = 0; let controller: AbortController | undefined;
    const load = async (): Promise<void> => {
      if (ended) return;
      const request = ++generation; controller?.abort(); controller = new AbortController();
      setState({ context });
      try {
        const url = kind === "documents" ? `/api/v1/documents/projects/${encodeURIComponent(projectId)}` : `/api/v1/reviews/inbox?${waitingReviewQuery(projectId)}`;
        const response = await fetch(url, { credentials: "include", cache: "no-store", signal: controller.signal });
        if (!active || ended || generation !== request) return;
        if (!response.ok) {
          if (response.status === 401) { endSession(); onSessionExpired(); return; }
          if (response.status === 403 || response.status === 404) {
            setState({ context, error: `These ${kind} are unavailable with your current access.` }); return;
          }
          throw new Error("request");
        }
        const summary = readSummary(await response.json() as unknown, projectId, kind);
        if (active && !ended && generation === request) setState({ context, summary });
      } catch {
        if (active && !ended && generation === request) setState({ context, error: `Could not load ${kind}. Try again.` });
      }
    };
    const endSession = (): void => { ended = true; ++generation; controller?.abort(); setState({ context, ended: true }); };
    const focus = (): void => { if (document.visibilityState !== "hidden") void load(); };
    window.addEventListener("sense-session-ended", endSession);
    window.addEventListener("focus", focus); document.addEventListener("visibilitychange", focus);
    void load();
    return () => { active = false; ++generation; controller?.abort(); window.removeEventListener("sense-session-ended", endSession); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); };
  }, [context, kind, projectId, refresh, onSessionExpired]);
  const current = state.context === context ? state : undefined;
  const summary = current?.summary;
  const title = kind === "documents" ? "Accessible files" : "Waiting internal review rounds";
  return <div className="project-resource-summary" role="group" aria-label={title} aria-busy={!summary && !current?.error && !current?.ended}>
    {current?.ended ? <p role="alert">Your session ended. Sign in again to view {kind}.</p> : current?.error ? <div className="project-resource-error"><p role="alert">{current.error}</p><button type="button" onClick={() => setRefresh(value => value + 1)}>Retry {kind}</button></div> : summary ? <>
      <p className="project-resource-count"><strong>{summary.total}</strong> {kind === "documents" ? "files available to you" : "waiting review rounds available to you"}</p>
      {summary.items.length ? <><p className="project-resource-caption">{kind === "documents" ? `Latest ${summary.items.length} accessible files` : `Showing ${summary.items.length} of ${summary.total}, earliest due first`}</p><ul className="project-resource-list">{summary.items.map(item => <li key={item.id}><span>{item.href ? <a href={item.href}>{item.label}</a> : <strong>{item.label}</strong>}<small>{item.detail}</small></span></li>)}</ul></> : <p>No {kind === "documents" ? "files" : "waiting internal review rounds"} available to you in this project.</p>}
    </> : <p role="status">Loading {kind}…</p>}
  </div>;
}
