import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./task-detail-drawer.css";

export type TaskDetailDrawerTab = "overview" | "checklist" | "evidence" | "activity";

export interface TaskDetailDrawerProps {
  enabled: boolean;
  taskId: string;
  title: string;
  taskType: string;
  contextLabel: string;
  statusLabel: string;
  priorityLabel: string;
  targetLabel: string;
  waitingLabel?: string | undefined;
  checklistCompleted: number;
  checklistTotal: number;
  overview: ReactNode;
  checklist: ReactNode;
  evidence: ReactNode;
  activity: ReactNode;
  onClose: () => void;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
  busy?: boolean;
  loading?: boolean;
  errors?: ReactNode;
  feedback?: ReactNode;
  actions?: ReactNode;
  hasActions?: boolean;
  hasData?: boolean;
}

const tabs: ReadonlyArray<{ id: TaskDetailDrawerTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "checklist", label: "Checklist" },
  { id: "evidence", label: "Evidence" },
  { id: "activity", label: "Activity" },
];

export function TaskDetailDrawer({
  enabled,
  taskId,
  title,
  taskType,
  contextLabel,
  statusLabel,
  priorityLabel,
  targetLabel,
  waitingLabel,
  checklistCompleted,
  checklistTotal,
  overview,
  checklist,
  evidence,
  activity,
  onClose,
  onPrevious,
  onNext,
  busy = false,
  loading = false,
  errors,
  feedback,
  actions,
  hasActions = true,
  hasData = true,
}: TaskDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TaskDetailDrawerTab>("overview");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const pendingNavigationFocus = useRef<{ taskId: string; direction: "previous" | "next" } | null>(null);
  const onCloseRef = useRef(onClose);
  const scrollPositions = useRef(new Map<string, number>());
  const suppressCloseRef = useRef(false);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousScrollX = window.scrollX;
    const previousScrollY = window.scrollY;
    suppressCloseRef.current = false;
    body.style.overflow = "hidden";
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      suppressCloseRef.current = true;
      if (dialog.open) dialog.close();
      body.style.overflow = previousOverflow;
      if (window.scrollX !== previousScrollX || window.scrollY !== previousScrollY) {
        window.scrollTo(previousScrollX, previousScrollY);
      }
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [enabled]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !enabled) return;
    const key = `${taskId}:${activeTab}`;
    panel.scrollTop = scrollPositions.current.get(key) ?? 0;
  }, [activeTab, enabled, taskId]);
  useLayoutEffect(() => {
    const pending = pendingNavigationFocus.current;
    if (!enabled || loading || !pending || pending.taskId === taskId) return;
    (pending.direction === "next" ? nextRef.current : previousRef.current)?.focus({ preventScroll: true });
    pendingNavigationFocus.current = null;
  }, [enabled, loading, taskId]);

  const requestClose = useCallback(() => onCloseRef.current(), []);

  const selectTab = useCallback((next: TaskDetailDrawerTab) => {
    const panel = panelRef.current;
    if (panel) scrollPositions.current.set(`${taskId}:${activeTab}`, panel.scrollTop);
    setActiveTab(next);
  }, [activeTab, taskId]);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = tabs.findIndex((tab) => tab.id === activeTab);
    let next: number;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = tabs[next];
    if (!nextTab) return;
    selectTab(nextTab.id);
    document.getElementById(`task-detail-tab-${nextTab.id}`)?.focus();
  };

  const revealTaskActions = () => {
    selectTab("overview");
    requestAnimationFrame(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>("[data-task-drawer-commands]");
      if (target) {
        target.scrollIntoView({ block: "nearest" });
        if (target.tabIndex < 0) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    });
  };

  if (!enabled) return <>{overview}</>;
  if (typeof document === "undefined") return null;

  const safeChecklistCompleted = Math.max(0, Math.min(checklistTotal, checklistCompleted));
  const content: Record<TaskDetailDrawerTab, ReactNode> = { overview, checklist, evidence, activity };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="task-workspace task-detail-drawer"
      aria-labelledby="task-detail-drawer-title"
      aria-describedby="task-detail-drawer-context"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        if (!suppressCloseRef.current && !dialogRef.current?.open) onCloseRef.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <header className="task-detail-drawer__header">
        <div className="task-detail-drawer__toolbar">
          <span className="task-detail-drawer__identity">{taskId} · {taskType}</span>
          <div className="task-detail-drawer__navigation" aria-label="Task navigation">
            <button ref={previousRef} type="button" className="task-detail-drawer__icon-button" aria-label="Previous task" disabled={!onPrevious || busy || loading} onClick={() => { pendingNavigationFocus.current = { taskId, direction: "previous" }; onPrevious?.(); }}>‹</button>
            <button ref={nextRef} type="button" className="task-detail-drawer__icon-button" aria-label="Next task" disabled={!onNext || busy || loading} onClick={() => { pendingNavigationFocus.current = { taskId, direction: "next" }; onNext?.(); }}>›</button>
            <button ref={closeRef} type="button" className="task-detail-drawer__icon-button" aria-label="Close task details" onClick={requestClose}>×</button>
          </div>
        </div>
        <h2 id="task-detail-drawer-title">{loading ? "Loading task…" : title}</h2>
        <p id="task-detail-drawer-context" className="task-detail-drawer__context">{contextLabel}</p>
        {hasData && !loading && <div className="task-detail-drawer__badges" aria-label="Task status and schedule">
          <span className="task-detail-drawer__badge task-detail-drawer__badge--priority">{priorityLabel} priority</span>
          <span className="task-detail-drawer__badge task-detail-drawer__badge--status">{statusLabel}</span>
          <span className="task-detail-drawer__badge task-detail-drawer__badge--target">{targetLabel}</span>
          {waitingLabel && <span className="task-detail-drawer__badge task-detail-drawer__badge--waiting">{waitingLabel}</span>}
        </div>}
        {hasData && !loading && <div className="task-detail-drawer__summary">
          <span>Checklist</span>
          <strong>{safeChecklistCompleted}/{Math.max(0, checklistTotal)}</strong>
          <span className="task-detail-drawer__progress" role="progressbar" aria-label="Checklist completion" aria-valuemin={0} aria-valuemax={Math.max(1, checklistTotal)} aria-valuenow={safeChecklistCompleted}>
            <span style={{ width: `${checklistTotal > 0 ? safeChecklistCompleted / checklistTotal * 100 : 0}%` }} />
          </span>
        </div>}
        <div className="task-detail-drawer__tabs" role="tablist" aria-label="Task details">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              id={`task-detail-tab-${tab.id}`}
              className={activeTab === tab.id ? "is-active" : undefined}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`task-detail-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={onTabKeyDown}
            >{tab.label}</button>
          ))}
        </div>
      </header>

      <div
        ref={panelRef}
        className="task-detail-drawer__body"
        onScroll={(event) => scrollPositions.current.set(`${taskId}:${activeTab}`, event.currentTarget.scrollTop)}
      >
        {errors && <div className="task-detail-drawer__errors" role="alert">{errors}</div>}
        {feedback}
        {tabs.map((tab) => (
          <section
            key={tab.id}
            id={`task-detail-panel-${tab.id}`}
            className="task-detail-drawer__panel"
            role="tabpanel"
            aria-labelledby={`task-detail-tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
          >
            {loading ? <p className="task-detail-drawer__loading" role="status">Loading task details…</p> : content[tab.id]}
          </section>
        ))}
      </div>

      <footer className="task-detail-drawer__footer">
        <div className="task-detail-drawer__footer-actions">{actions}</div>
        <button type="button" className="task-detail-drawer__more" onClick={revealTaskActions} disabled={!hasActions || busy || loading}>Task actions <span aria-hidden="true">↗</span></button>
      </footer>
    </dialog>,
    document.body,
  );
}
