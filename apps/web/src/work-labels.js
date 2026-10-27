/** Operational date-only values must not shift with the viewer's timezone. */
export function workDate(value) {
    const day = /^\d{4}-\d{2}-\d{2}(?:$|T)/.exec(value)?.[0].replace(/T$/, "");
    if (!day)
        return "Date unavailable";
    const date = new Date(day + "T00:00:00Z");
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day)
        return "Date unavailable";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
export function workState(value) {
    return value.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());
}
