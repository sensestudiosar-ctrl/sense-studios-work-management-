import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { workDate, workState } from "./work-labels";
import "./dashboard-panel.css";

export type DashboardPanelRow = { id: string; label: string; status?: string; date?: string; value?: string | number; route?: string; score?: number | null; scoreScale?: { min: number; max: number } };
export type DashboardPanelSection = { key: string; label: string; rows: DashboardPanelRow[]; unavailable?: string };

/** A read-only view of the current authorized source, never a copied cache. */
export function DashboardPanel({ title, sections, loading, error, readAt, dateLabel = "Date", onRetry, onClose }: {
  title: string; sections: DashboardPanelSection[]; loading?: boolean | undefined;
  error?: string | undefined; readAt: string | null; dateLabel?: "Due" | "Date"; onRetry: () => void; onClose: () => void;
}): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null), closeRef = useRef<HTMLButtonElement>(null);
  const dismiss = useRef(onClose);
  useLayoutEffect(() => { dismiss.current = onClose; }, [onClose]);
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={dialogRef} className="dashboard-context-panel" aria-modal="true" aria-labelledby="dashboard-context-panel-title"
    onCancel={event => { event.preventDefault(); dismiss.current(); }}
    onClick={event => { if (event.target === event.currentTarget) dismiss.current(); }}>
    <div className="dashboard-context-panel__frame">
      <header className="dashboard-context-panel__header"><div><span className="eyebrow">DASHBOARD DETAILS</span><h2 id="dashboard-context-panel-title">{title}</h2></div>
        <button ref={closeRef} type="button" aria-label="Close dashboard details" onClick={onClose}>×</button>
      </header>
      <div className="dashboard-context-panel__body">
        {loading ? <p role="status">Reading current information…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Retry source</button></div> : <>
          {sections.map(section => <section className="dashboard-context-panel__section" key={section.key} aria-label={section.label}>
            <div className="dashboard-context-panel__section-heading"><h3>{section.label}</h3>{!section.unavailable && <span>{section.rows.length} items</span>}</div>
            {section.unavailable ? <div role="status"><p>{section.unavailable}</p><button type="button" onClick={onRetry}>Retry source</button></div> : section.rows.length ? <ul className="dashboard-context-panel__list">{section.rows.map(row => <li key={row.id}>
              <strong>{row.label}</strong>
              <div className="dashboard-context-panel__facts">{row.status && <span>{workState(row.status)}</span>}{row.date && <span>{dateLabel} {workDate(row.date)}</span>}{row.value !== undefined && row.value !== null && <span>{row.value}</span>}</div>
              {typeof row.score === "number" && Number.isFinite(row.score) && <p>Health score {row.score}{row.scoreScale && row.scoreScale.max > row.scoreScale.min ? ` · Scale ${row.scoreScale.min}–${row.scoreScale.max}` : " · Scale unavailable"}</p>}
              {row.route && <Link to={row.route} onClick={onClose}>Open workspace →</Link>}
            </li>)}</ul> : <p>No matching items in your current access scope.</p>}
          </section>)}
          {!sections.length && <p>No matching items in your current access scope.</p>}
        </>}
      </div>
      <footer className="dashboard-context-panel__footer"><span>{readAt && !loading && !error ? `Source read at ${new Date(readAt).toLocaleString()}` : "Current authorized source"}</span><button type="button" onClick={onRetry} disabled={loading}>Refresh details</button></footer>
    </div>
  </dialog>, document.body);
}
