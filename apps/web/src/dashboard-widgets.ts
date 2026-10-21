export type WidgetId = "time" | "decisions" | "projects" | "performance" | "nextAction" | "site" | "workload" | "training" | "health" | "signals" | "shortcuts";
export const WIDGET_INFO: Record<WidgetId, { label: string; desc: string }> = {
  time: { label: "Time tracking", desc: "Start work and record time" },
  decisions: { label: "Decisions & assigned reviews", desc: "Approval requests and independent review rounds are separate" },
  projects: { label: "Projects at a glance", desc: "Authorized project snapshots and recorded signals" },
  performance: { label: "Performance", desc: "Authorized employee scores and comparable team evidence" },
  nextAction: { label: "Next action", desc: "Your current authorized task preview" },
  site: { label: "Site delivery", desc: "Assigned snags and verification" },
  workload: { label: "Workload", desc: "Factual assigned work and leave" },
  training: { label: "Training", desc: "Permitted training assignments" },
  health: { label: "Project risk breakdown", desc: "Persisted project health and its supplied scale" },
  signals: { label: "Task signal breakdown", desc: "Independent task sections; counts overlap" },
  shortcuts: { label: "Workspace shortcuts", desc: "Open the owning workspaces" },
};
export const ALL_WIDGET_IDS = Object.keys(WIDGET_INFO) as WidgetId[];
export type LayoutMode = "desktop" | "mobile";
export type DashboardLayout = { version: 1; accountKind: "OWNER" | "STAFF"; leftOrder: WidgetId[]; rightOrder: WidgetId[]; hidden: WidgetId[] };
export const layoutStorageKey = (accountId: string, mode: LayoutMode) => `sense-dashboard-layout-v2:${encodeURIComponent(accountId)}:${mode}`;
export function widgetDefaultsForRole(kind: "OWNER" | "STAFF", canSeePerformance: boolean, canSeeSite: boolean): WidgetId[] {
  if (kind === "OWNER" || canSeePerformance) return ["time", "decisions", "projects", ...(canSeePerformance ? ["performance" as const] : [])];
  return canSeeSite ? ["time", "nextAction", "site", "projects", "decisions"] : ["time", "nextAction", "projects", "decisions"];
}
export function defaultLayoutFor(kind: "OWNER" | "STAFF", permitted: WidgetId[], canSeePerformance: boolean, canSeeSite: boolean, mode: LayoutMode = "desktop"): DashboardLayout {
  const defaults = widgetDefaultsForRole(kind, canSeePerformance, canSeeSite).filter(id => permitted.includes(id));
  return { version: 1, accountKind: kind, leftOrder: mode === "mobile" ? defaults : defaults.filter((_, i) => i % 2 === 0), rightOrder: mode === "mobile" ? [] : defaults.filter((_, i) => i % 2 === 1), hidden: [] };
}
export function loadLayout(accountId: string, kind: "OWNER" | "STAFF", permitted: WidgetId[], canSeePerformance: boolean, canSeeSite: boolean, mode: LayoutMode = "desktop"): DashboardLayout {
  const fallback = () => defaultLayoutFor(kind, permitted, canSeePerformance, canSeeSite, mode);
  if (!accountId) return fallback();
  try {
    const raw = localStorage.getItem(layoutStorageKey(accountId, mode));
    if (!raw) return fallback();
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    if (parsed.version !== 1 || parsed.accountKind !== kind || !Array.isArray(parsed.leftOrder) || !Array.isArray(parsed.rightOrder) || !Array.isArray(parsed.hidden)) return fallback();
    const seen = new Set<WidgetId>();
    const clean = (items: unknown[]): WidgetId[] => items.filter((id): id is WidgetId => {
      if (typeof id !== "string" || !permitted.includes(id as WidgetId) || seen.has(id as WidgetId)) return false;
      seen.add(id as WidgetId); return true;
    });
    const leftOrder = clean(parsed.leftOrder), rightOrder = clean(parsed.rightOrder), hidden = clean(parsed.hidden);
    return { version: 1, accountKind: kind, leftOrder: mode === "mobile" ? [...leftOrder, ...rightOrder] : leftOrder, rightOrder: mode === "mobile" ? [] : rightOrder, hidden };
  } catch { return fallback(); }
}
export function saveLayout(accountId: string, layout: DashboardLayout, mode: LayoutMode = "desktop"): boolean {
  if (!accountId) return false;
  try { localStorage.setItem(layoutStorageKey(accountId, mode), JSON.stringify(layout)); return true; } catch { return false; }
}
export function resetLayout(accountId: string, kind: "OWNER" | "STAFF", permitted: WidgetId[], canSeePerformance: boolean, canSeeSite: boolean, mode: LayoutMode = "desktop"): DashboardLayout {
  const layout = defaultLayoutFor(kind, permitted, canSeePerformance, canSeeSite, mode); saveLayout(accountId, layout, mode); return layout;
}
