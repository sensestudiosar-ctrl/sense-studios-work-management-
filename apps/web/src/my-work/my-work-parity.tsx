import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initials } from "../task-people.js";

/**
 * My Work demo-parity row renderer.
 *
 * Renders the supplied prototype's queue presentation: a per-state coloured
 * rail plus row tint, solid status chips, priority pills, a pin toggle, a
 * next-action button, due-bucket or priority grouping with per-group
 * "show more", a clickable status legend, and a metric focus panel.
 *
 * PRESENTATION ONLY. This component never authorizes anything and never
 * decides what work a user may see. It receives already-authorized rows from
 * its caller and renders them. Every action is delegated upward through
 * `onOpenTask` / `onPin` / `onQuickAction`; the real endpoints and permission
 * checks stay where they already are.
 *
 * It deliberately does NOT reproduce the prototype's fake behaviours:
 * localStorage task creation, demo-only file names, the unpersisted review
 * canvas, or role switching from the client.
 */

export type MyWorkParityRow = {
  id: string;
  title: string;
  /** Short context line under the title, e.g. "SS-142 · Lakeview Residence". */
  context: string;
  project: string;
  stage: string;
  /** Owner/people label for the People column. */
  people: string;
  /** Target date as YYYY-MM-DD, or null when there is no date. */
  dueDate: string | null;
  /** Canonical status from the application, e.g. IN_PROGRESS, WAITING. */
  status: string;
  priority: string;
  /** Label for the last-column action button, e.g. "Open correction". */
  nextAction: string;
  pinned?: boolean;
  isSubtask?: boolean;
  requiresReassignment?: boolean;
};

export type MyWorkParityGroup = {
  key: string;
  label: string;
  rows: MyWorkParityRow[];
};

/** Prototype due buckets, in display order. */
export const DUE_BUCKETS = ["Overdue", "Today", "This week", "Next week", "This month", "Later", "Without a date"] as const;
export type DueBucket = (typeof DUE_BUCKETS)[number];

/** Prototype priority order. */
const PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

/**
 * The next-action value the caller emits when no task-specific action
 * applies. Rows that carry this value render the quiet right-edge chevron
 * instead of a filled labelled button; informational labels (corrections,
 * reviews, approvals) keep the labelled action button.
 */
const DEFAULT_NEXT_ACTION = "Open task";

/**
 * Maps an application status to the prototype's six visual states. The
 * prototype has exactly six states; the application has thirteen statuses.
 * This is a pure presentation mapping and must never be used to decide
 * behaviour — canonical status stays authoritative everywhere else.
 */
export function parityState(status: string): "todo" | "progress" | "review" | "waiting" | "correction" | "done" {
  switch (status) {
    case "NOT_STARTED":
      return "todo";
    case "IN_PROGRESS":
      return "progress";
    case "WAITING":
      return "waiting";
    case "SUBMITTED_INTERNAL_REVIEW":
    case "IN_INTERNAL_REVIEW":
    case "SUBMITTED_CLIENT_REVIEW":
    case "IN_CLIENT_REVIEW":
      return "review";
    case "CORRECTIONS_REQUIRED":
    case "CLIENT_REVISION_REQUIRED":
    case "STOPPED_DUE_TO_PROJECT_CANCELLATION":
      return "correction";
    case "INTERNAL_APPROVED":
    case "CLIENT_APPROVED":
    case "COMPLETED":
      return "done";
    default:
      return "todo";
  }
}

/** Maps an application priority to the prototype's four priority pills. */
export function parityPriorityClass(priority: string): string {
  switch (priority) {
    case "CRITICAL":
      return "pr-Urgent";
    case "HIGH":
      return "pr-High";
    case "MEDIUM":
      return "pr-Normal";
    case "LOW":
      return "pr-Low";
    default:
      return "pr-Normal";
  }
}

/** Human label for a priority pill. The prototype uses Urgent for CRITICAL. */
export function parityPriorityLabel(priority: string): string {
  return priority === "CRITICAL" ? "Urgent" : priority === "MEDIUM" ? "Normal" : priority;
}

/** Human label for a status, matching the rest of the application's wording. */
export function parityStatusLabel(status: string): string {
  return status.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
}

/**
 * Assigns a due bucket using an explicit "today" so the result is testable
 * and does not depend on the browser clock. Dates are compared as calendar
 * days in UTC, matching how the application stores date-only bounds.
 */
export function dueBucket(dueDate: string | null, today: string, completed: boolean): DueBucket {
  if (!dueDate) return "Without a date";
  if (dueDate < today) return completed ? "Later" : "Overdue";
  if (dueDate === today) return "Today";
  const due = new Date(`${dueDate}T00:00:00.000Z`);
  const base = new Date(`${today}T00:00:00.000Z`);
  const days = Math.round((due.getTime() - base.getTime()) / 86_400_000);
  if (days <= 7) return "This week";
  if (days <= 14) return "Next week";
  if (days <= 31) return "This month";
  return "Later";
}

export type MyWorkParityListProps = {
  rows: MyWorkParityRow[];
  /** Organization-calendar "today" as YYYY-MM-DD. Never the browser clock. */
  today: string;
  groupBy?: "due" | "priority";
  selectedId?: string | null;
  /** Rows currently loading; renders a neutral state instead of an empty one. */
  loading?: boolean;
  error?: string;
  onOpenTask: (id: string) => void;
  onPin?: ((id: string, pinned: boolean) => void) | undefined;
  onQuickAction?: ((id: string) => void) | undefined;
};

export function MyWorkParityList({
  rows,
  today,
  groupBy = "due",
  selectedId = null,
  loading = false,
  error,
  onOpenTask,
  onPin,
  onQuickAction,
}: MyWorkParityListProps): React.JSX.Element {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState<Record<string, number>>({});
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  const groups = useMemo<MyWorkParityGroup[]>(() => {
    const pinned = rows.filter(row => row.pinned);
    const rest = rows.filter(row => !row.pinned);
    const buckets = new Map<string, MyWorkParityRow[]>();
    for (const row of rest) {
      const key = groupBy === "priority" ? parityPriorityLabel(row.priority) : dueBucket(row.dueDate, today, row.status === "COMPLETED");
      const list = buckets.get(key) ?? [];
      list.push(row);
      buckets.set(key, list);
    }
    const keys = [...buckets.keys()];
    keys.sort((left, right) => groupBy === "priority"
      ? PRIORITY_ORDER.indexOf(priorityKey(left)) - PRIORITY_ORDER.indexOf(priorityKey(right))
      : DUE_BUCKETS.indexOf(left as DueBucket) - DUE_BUCKETS.indexOf(right as DueBucket));
    const result: MyWorkParityGroup[] = [];
    if (pinned.length) result.push({ key: "Pinned", label: "Pinned", rows: pinned });
    result.push(...keys.map(key => ({ key, label: key, rows: buckets.get(key)! })));
    return result;
  }, [rows, today, groupBy]);

  const move = useCallback((from: string, delta: number) => {
    const order = groups.flatMap(group => group.rows.map(row => row.id));
    const index = order.indexOf(from);
    const next = order[Math.min(order.length - 1, Math.max(0, index + delta))];
    if (next !== undefined) rowRefs.current.get(next)?.focus();
  }, [groups]);

  if (loading) return <p role="status">Loading your work…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (rows.length === 0) {
    return <div className="my-work-empty"><div aria-hidden="true" style={{ fontSize: 30 }}>⌕</div><strong>Nothing assigned in this scope</strong><p>Switch your work scope, or return when more work is assigned.</p></div>;
  }

  return <div className="my-work-parity-groups">
    {groups.map(group => {
      const collapsed = Boolean(expanded[group.key]);
      const visible = shown[group.key] ?? 6;
      const slice = group.rows.slice(0, collapsed ? 0 : visible);
      return <section key={group.key} className="my-work-group" aria-label={group.label}>
        <button type="button" className="my-work-group-head" aria-expanded={!collapsed} onClick={() => setExpanded(current => ({ ...current, [group.key]: !collapsed }))}>
          <span className={`my-work-chev${collapsed ? " is-collapsed" : ""}`} aria-hidden="true">▾</span>
          <span>{group.label}</span>
          <span className="my-work-group-count">{group.rows.length}</span>
        </button>
        {!collapsed && <>
          <div className="my-work-tablehead" aria-hidden="true">
            <span>Task</span><span>People</span><span>Due</span><span>Status</span><span>Priority</span>
          </div>
          {slice.map(row => <ParityRow key={row.id} row={row} today={today} selected={row.id === selectedId} rowRefs={rowRefs} onOpen={onOpenTask} onPin={onPin} onQuickAction={onQuickAction} onMove={move} />)}
          {group.rows.length > visible && <button type="button" className="my-work-showmore" onClick={() => setShown(current => ({ ...current, [group.key]: visible + 6 }))}>Show {Math.min(6, group.rows.length - visible)} more of {group.rows.length} ▾</button>}
        </>}
      </section>;
    })}
  </div>;
}

function priorityKey(label: string): string {
  if (label === "Urgent") return "CRITICAL";
  if (label === "Normal") return "MEDIUM";
  return label.toUpperCase();
}

/**
 * F-002b: avatar initials for the primary-owner label. Reuses the shared
 * `initials` primitive (task-people) for names and emails; the local
 * "You" and empty-label edge cases get readable fallbacks. Pure, so it is
 * unit-testable without the browser.
 */
export function ownerInitials(label: string): string {
  const clean = label.trim();
  if (!clean) return "?";
  if (/^you$/i.test(clean)) return "Me";
  return initials(clean);
}

function ParityRow({ row, today, selected, rowRefs, onOpen, onPin, onQuickAction, onMove }: {
  row: MyWorkParityRow;
  today: string;
  selected: boolean;
  rowRefs: React.RefObject<Map<string, HTMLButtonElement>>;
  onOpen: (id: string) => void;
  onPin?: ((id: string, pinned: boolean) => void) | undefined;
  onQuickAction?: ((id: string) => void) | undefined;
  onMove: (id: string, delta: number) => void;
}): React.JSX.Element {
  const state = parityState(row.status);
  const overdue = row.dueDate !== null && row.dueDate < today && row.status !== "COMPLETED";
  /**
   * The accessible name matches the established `Open task: <title>` convention
   * so assistive tech and existing tests see one consistent name. The status,
   * priority and due date are rendered as visible row content and are also
   * exposed as list-item text, so nothing is lost for screen-reader users.
   */
  const label = `Open task: ${row.title}`;
  /** Default state (the "Open task" label) → quiet chevron; an informational
   *  label → filled labelled button. Both delegate to the same upward action. */
  const isOpenOnly = row.nextAction === DEFAULT_NEXT_ACTION;
  return <div className={`my-work-demo-row state-${state}${selected ? " is-selected" : ""}`} role="listitem">
    <button
      type="button"
      ref={node => { if (node) rowRefs.current.set(row.id, node); else rowRefs.current.delete(row.id); }}
      className="my-work-row-main"
      aria-label={label}
      onClick={() => onOpen(row.id)}
      onKeyDown={event => {
        if (event.key === "ArrowDown") { event.preventDefault(); onMove(row.id, 1); }
        if (event.key === "ArrowUp") { event.preventDefault(); onMove(row.id, -1); }
      }}
    />
    <span className="my-work-row-task">
      {onPin && <button type="button" className="my-work-pin" aria-pressed={Boolean(row.pinned)} aria-label={`${row.pinned ? "Unpin" : "Pin"} ${row.title}`} title={`${row.pinned ? "Unpin" : "Pin"} task`} onClick={() => onPin(row.id, !row.pinned)}>{row.pinned ? "◆" : "◇"}</button>}
      <span className="my-work-status-dot" aria-hidden="true" />
      <span className="my-work-row-text">
        <span className="my-work-titleline"><strong>{row.title}</strong><span className={`my-work-priority ${parityPriorityClass(row.priority)}`} title={`${parityPriorityLabel(row.priority)} priority`}>{parityPriorityLabel(row.priority)}</span></span>
        <small>{row.context || row.project}{row.context ? "" : ` · ${row.stage}`}</small>
        <small>{row.isSubtask ? "Subtask · " : ""}Next: {row.nextAction}</small>
        {row.requiresReassignment && <small className="my-work-row-reassignment">Needs reassignment after employee exit</small>}
        <span className="my-work-mobile-state">
          <span className={`my-work-status my-work-status-${state}`}>{parityStatusLabel(row.status)}</span>
          <span className={`my-work-mobile-due${overdue ? " overdue" : ""}`}>{row.dueDate ?? "No date"}</span>
        </span>
      </span>
    </span>
    <span className="my-work-row-cell my-work-owner-cell"><span className="my-work-owner" title={row.people} aria-label={`Owner: ${row.people}`} role="img"><span className="my-work-owner__initials" aria-hidden="true">{ownerInitials(row.people)}</span><span className="my-work-owner__name">{row.people}</span></span></span>
    <span className={`my-work-row-cell my-work-due${overdue ? " overdue" : ""}`}>{row.dueDate ?? "No date"}</span>
    <span className="my-work-status-cell"><span className={`my-work-status my-work-status-${state}`}>{parityStatusLabel(row.status)}</span></span>
    <span className="my-work-row-cell my-work-priority-cell"><span className={`my-work-priority priority-pill ${parityPriorityClass(row.priority)}`} title={`${parityPriorityLabel(row.priority)} priority`}>{parityPriorityLabel(row.priority)}</span></span>
    <span className="my-work-row-action">
      {isOpenOnly
        ? <span className="my-work-row-open" aria-hidden="true">→</span>
        : <button type="button" onClick={() => (onQuickAction ?? onOpen)(row.id)}>{row.nextAction}</button>}
    </span>
  </div>;
}

/**
 * Status legend. Clicking a status delegates upward; this component applies no
 * filter of its own and never assumes the caller will honor it.
 */
export function MyWorkStatusLegend({ states, activeStatus, onSelect }: {
  states: ReadonlyArray<{ status: string; label: string }>;
  activeStatus: string;
  onSelect: (status: string) => void;
}): React.JSX.Element {
  return <div className="my-work-legend" role="group" aria-label="Filter by status">
    {states.map(item => {
      const state = parityState(item.status);
      const active = activeStatus === item.status;
      return <button key={item.status} type="button" aria-pressed={active} title={active ? "Show all statuses" : `Filter to ${item.label}`} onClick={() => onSelect(active ? "" : item.status)}>
        <i aria-hidden="true" style={{ ["--task-state-rail" as string]: `var(--state-${state})` }} />
        {item.label}
      </button>;
    })}
  </div>;
}

/** Metric focus panel — explains the selected card and offers a clear action. */
export function MyWorkMetricFocusPanel({ label, symbol, description, onClear }: {
  label: string;
  symbol: string;
  description: string;
  onClear: () => void;
}): React.JSX.Element {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  return <div className="my-work-metric-focus-panel" role="status">
    <span className="focus-symbol" aria-hidden="true">{symbol}</span>
    <span className="focus-copy"><b>{label}</b><p>{description}</p></span>
    <button type="button" className="focus-clear" ref={closeRef} onClick={onClear}>Clear</button>
  </div>;
}
