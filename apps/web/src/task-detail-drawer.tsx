import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./task-detail-drawer.css";

export type TaskDetailDrawerTab = "overview" | "checklist" | "evidence" | "activity";

export interface TaskDetailDrawerProps {
  projectPresentation?: boolean | undefined;
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
  /**
   * Initial section layout. `"single"` (default) renders Overview, Checklist,
   * Evidence and Activity in one scrollable column; `"tabs"` restores the
   * classic tabbed layout. The footer toggle switches between them at
   * runtime, and a `layout` change re-syncs the active layout.
   */
  layout?: "single" | "tabs" | undefined;
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
  layout = "single",
  projectPresentation = false,
}: TaskDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TaskDetailDrawerTab>("overview");
  /**
   * Which section layout is on screen. The default is the single scroll;
   * the footer toggle switches to the tabbed layout so in-progress drafts
   * and existing tab tests keep working. The internal `activeTab` state
   * still drives scroll restoration in both layouts.
   */
  const [sectionLayout, setSectionLayout] = useState<"single" | "tabs">(layout);
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
  const useTabs = sectionLayout === "tabs";
  /**
   * Header badges are click-to-edit affordances: clicking one reveals and
   * focuses the matching editor inside the Overview section. No new data
   * is fetched — the editors are the forms the parent already renders in
   * `overview`.
   */
  const scrollToOverview = (findTarget?: (dialog: HTMLElement | null) => HTMLElement | null): void => {
    selectTab("overview");
    requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const targetElement = findTarget?.(dialog) ?? null;
      const scroller = panelRef.current;
      if (!dialog || !scroller) return;
      scroller.scrollTop = 0;
      if (targetElement) {
        targetElement.scrollIntoView({ block: "nearest" });
        if (targetElement.tabIndex < 0) targetElement.tabIndex = -1;
        targetElement.focus({ preventScroll: true });
      }
    });
  };
  const focusEditTask = () => scrollToOverview((dialog) => {
    if (!dialog) return null;
    const form = dialog.querySelector<HTMLElement>(".task-edit-form");
    if (form) return form.querySelector<HTMLElement>("input, select") ?? form;
    const editTask = [...dialog.querySelectorAll<HTMLElement>("button")].find((element) => element.textContent?.trim() === "Edit task");
    return editTask ?? null;
  });
  const focusStatusTransition = () => scrollToOverview((dialog) => {
    if (!dialog) return null;
    const target = [...dialog.querySelectorAll<HTMLButtonElement>(".task-actions button")].find((element) => !element.disabled);
    return target ?? dialog.querySelector<HTMLElement>("[aria-label='Reason for change']") ?? null;
  });
  const focusTargetDate = () => scrollToOverview((dialog) => {
    if (!dialog) return null;
    const form = dialog.querySelector<HTMLElement>(".task-edit-form");
    if (form) return form.querySelector<HTMLElement>("input[type='date']") ?? form;
    const facts = dialog.querySelector<HTMLElement>(".task-facts");
    if (!facts) return null;
    const cell = [...facts.children].find((item) => item.querySelector<HTMLElement>("dt")?.textContent?.startsWith("Target date"));
    return (cell?.querySelector("dd") ?? facts) as HTMLElement;
  });
  const focusWaiting = () => scrollToOverview((dialog) => {
    if (!dialog) return null;
    const form = dialog.querySelector<HTMLElement>(".task-wait-form");
    if (form) return form.querySelector<HTMLElement>("input, select, textarea") ?? form;
    const details = dialog.querySelector<HTMLElement>(".task-waiting-details");
    if (details) return details.querySelector<HTMLElement>("input, select, textarea") ?? details;
    return null;
  });

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`task-workspace task-detail-drawer${projectPresentation ? " task-detail-drawer--project" : ""}`}
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
          <button type="button" className="task-detail-drawer__badge task-detail-drawer__badge--priority" onClick={focusEditTask} aria-label={`Priority ${priorityLabel} — edit task details`}>{priorityLabel} priority</button>
          <button type="button" className="task-detail-drawer__badge task-detail-drawer__badge--status" onClick={focusStatusTransition} aria-label={`Status ${statusLabel} — open status actions`}>{statusLabel}</button>
          <button type="button" className="task-detail-drawer__badge task-detail-drawer__badge--target" onClick={focusTargetDate} aria-label={`${targetLabel} — set target or committed date`}>{targetLabel}</button>
          {waitingLabel && <button type="button" className="task-detail-drawer__badge task-detail-drawer__badge--waiting" onClick={focusWaiting} aria-label={`${waitingLabel} — open waiting details`}>{waitingLabel}</button>}
        </div>}
        {hasData && !loading && <div className="task-detail-drawer__summary">
          <span>Checklist</span>
          <strong>{safeChecklistCompleted}/{Math.max(0, checklistTotal)}</strong>
          <span className="task-detail-drawer__progress" role="progressbar" aria-label="Checklist completion" aria-valuemin={0} aria-valuemax={Math.max(1, checklistTotal)} aria-valuenow={safeChecklistCompleted}>
            <span style={{ width: `${checklistTotal > 0 ? safeChecklistCompleted / checklistTotal * 100 : 0}%` }} />
          </span>
        </div>}
        {useTabs ? <div className="task-detail-drawer__tabs" role="tablist" aria-label="Task details">
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
        </div> : null}
      </header>

      <div
        ref={panelRef}
        className={`task-detail-drawer__body${useTabs ? "" : " task-detail-drawer__body--single"}`}
        onScroll={(event) => scrollPositions.current.set(`${taskId}:${activeTab}`, event.currentTarget.scrollTop)}
      >
        {errors && <div className="task-detail-drawer__errors" role="alert">{errors}</div>}
        {feedback}
        {useTabs
          ? tabs.map((tab) => (
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
            ))
          : tabs.map((tab) => (
              <section
                key={tab.id}
                id={`task-detail-panel-${tab.id}`}
                className="task-detail-drawer__section"
                aria-label={tab.label}
              >
                {loading && tab.id === "overview" ? <p className="task-detail-drawer__loading" role="status">Loading task details…</p> : content[tab.id]}
              </section>
            ))}
      </div>

      <footer className="task-detail-drawer__footer">
        <div className="task-detail-drawer__footer-actions">{actions}</div>
        <div className="task-detail-drawer__footer-controls">
          <button type="button" className="task-detail-drawer__layout-toggle" aria-pressed={useTabs} onClick={() => { setSectionLayout(useTabs ? "single" : "tabs"); setActiveTab("overview"); }}>
            {useTabs ? "Single scroll" : "Tabs"}
          </button>
          <button type="button" className="task-detail-drawer__more" onClick={revealTaskActions} disabled={!hasActions || busy || loading}>Task actions <span aria-hidden="true">↗</span></button>
        </div>
      </footer>
    </dialog>,
    document.body,
  );
}
