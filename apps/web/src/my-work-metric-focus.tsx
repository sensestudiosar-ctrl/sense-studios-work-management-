type Props = {
  metric: string;
  total?: number | undefined;
  loading: boolean;
  stale: boolean;
  denied: boolean;
  error?: string | undefined;
  refreshedAt?: number | undefined;
  overdueBefore?: string | undefined;
  dateRangePaused?: boolean | undefined;
  onClear: () => void;
};

const LABELS: Record<string, string> = {
  overdue: "Overdue",
  waiting: "Waiting / blocked",
  review: "Review phase",
  reviews: "Reviews",
  active: "Active",
  completed: "Completed"
};

function validCount(total: number | undefined): total is number {
  return total !== undefined && Number.isInteger(total) && total >= 0;
}

function countText(total: number): string {
  return `${total} ${total === 1 ? "task" : "tasks"}`;
}

function refreshedLabel(refreshedAt: number | undefined): string | undefined {
  if (refreshedAt === undefined || !Number.isFinite(refreshedAt)) return undefined;
  const date = new Date(refreshedAt);
  return Number.isNaN(date.getTime()) ? undefined : `Last refreshed ${date.toISOString()}.`;
}

export function MyWorkMetricFocus({ metric, total, loading, stale, denied, error, refreshedAt, overdueBefore, dateRangePaused, onClear }: Props): React.JSX.Element | null {
  if (!Object.hasOwn(LABELS, metric)) return null;
  const label = LABELS[metric]!;
  const hasCount = validCount(total);

  let title: string;
  const refreshed = stale && !loading && !denied ? refreshedLabel(refreshedAt) : undefined;
  if (denied) title = `${label} results aren’t available with your current access.`;
  else if (loading) title = `Loading ${label.toLowerCase()} results…`;
  else if (error && stale) title = hasCount ? `Showing last refreshed count: ${countText(total)} · ${label}. Latest refresh failed.` : `${label} results may be out of date. Latest refresh failed.`;
  else if (error) title = `${label} results couldn’t be loaded.`;
  else if (stale) title = hasCount ? `Showing last refreshed count: ${countText(total)} · ${label}` : `${label} results may be out of date.`;
  else if (hasCount) title = `${countText(total)} · ${label}`;
  else title = `${label} results are not available yet.`;

  return <div className="my-work-metric-focus" role="status" aria-label="Work card results">
    <div className="my-work-metric-focus-copy">
      <strong>{title}</strong>
      {refreshed && <span>{refreshed}</span>}
      {metric === "overdue" && overdueBefore && <span>Organization day cutoff: {overdueBefore}</span>}
      {metric === "overdue" && dateRangePaused && <span>Applied date range paused while this card filter is active.</span>}
    </div>
    <button type="button" aria-label="Clear work card selection" onClick={onClear}>× Clear widget filter</button>
  </div>;
}
