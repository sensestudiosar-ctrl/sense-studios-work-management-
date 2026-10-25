export const WIDGET_INFO = {
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
export const ALL_WIDGET_IDS = Object.keys(WIDGET_INFO);
export const layoutStorageKey = (accountId, mode) => `sense-dashboard-layout-v2:${encodeURIComponent(accountId)}:${mode}`;
export function widgetDefaultsForRole(kind, canSeePerformance, canSeeSite) {
    if (kind === "OWNER" || canSeePerformance)
        return ["time", "decisions", "projects", ...(canSeePerformance ? ["performance"] : [])];
    return canSeeSite ? ["time", "nextAction", "site", "projects", "decisions"] : ["time", "nextAction", "projects", "decisions"];
}
export function defaultLayoutFor(kind, permitted, canSeePerformance, canSeeSite, mode = "desktop") {
    const defaults = widgetDefaultsForRole(kind, canSeePerformance, canSeeSite).filter(id => permitted.includes(id));
    return { version: 1, accountKind: kind, leftOrder: mode === "mobile" ? defaults : defaults.filter((_, i) => i % 2 === 0), rightOrder: mode === "mobile" ? [] : defaults.filter((_, i) => i % 2 === 1), hidden: [] };
}
export function loadLayout(accountId, kind, permitted, canSeePerformance, canSeeSite, mode = "desktop") {
    const fallback = () => defaultLayoutFor(kind, permitted, canSeePerformance, canSeeSite, mode);
    if (!accountId)
        return fallback();
    try {
        const raw = localStorage.getItem(layoutStorageKey(accountId, mode));
        if (!raw)
            return fallback();
        const parsed = JSON.parse(raw);
        if (parsed.version !== 1 || parsed.accountKind !== kind || !Array.isArray(parsed.leftOrder) || !Array.isArray(parsed.rightOrder) || !Array.isArray(parsed.hidden))
            return fallback();
        const seen = new Set();
        const clean = (items) => items.filter((id) => {
            if (typeof id !== "string" || !permitted.includes(id) || seen.has(id))
                return false;
            seen.add(id);
            return true;
        });
        const leftOrder = clean(parsed.leftOrder), rightOrder = clean(parsed.rightOrder), hidden = clean(parsed.hidden);
        return { version: 1, accountKind: kind, leftOrder: mode === "mobile" ? [...leftOrder, ...rightOrder] : leftOrder, rightOrder: mode === "mobile" ? [] : rightOrder, hidden };
    }
    catch {
        return fallback();
    }
}
export function saveLayout(accountId, layout, mode = "desktop") {
    if (!accountId)
        return false;
    try {
        localStorage.setItem(layoutStorageKey(accountId, mode), JSON.stringify(layout));
        return true;
    }
    catch {
        return false;
    }
}
export function resetLayout(accountId, kind, permitted, canSeePerformance, canSeeSite, mode = "desktop") {
    const layout = defaultLayoutFor(kind, permitted, canSeePerformance, canSeeSite, mode);
    saveLayout(accountId, layout, mode);
    return layout;
}
