import { describe, expect, it } from "vitest";
import { isMyWorkSnapshot, loadMyWorkSavedViews, saveMyWorkSavedViews } from "./my-work-saved-views.js";
import type { MyWorkSavedView, MyWorkSnapshot, ViewStorage } from "./my-work-saved-views.js";
const account = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const snapshot: MyWorkSnapshot = { filters: { q: "test", projectId: "", planItemId: "", ownerEmployeeId: "", status: "WAITING", phase: "active", dateBasis: "target", dateFrom: "2026-10-01", dateTo: "2026-10-20", sort: "target_asc" }, view: "list", compact: false, temporaryPhase: "waiting" };
const view: MyWorkSavedView = { id: account, name: "__proto__", snapshot };
function memory(): { storage: ViewStorage; data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, storage: { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } } };
}
describe("account-scoped browser My Work saved views", () => {
  it("round trips allowlisted preferences, permits property-like names, and isolates accounts", () => {
    const { storage, data } = memory();
    expect(saveMyWorkSavedViews(account, [view], storage)).toEqual({ status: "ready", views: [view] });
    expect(loadMyWorkSavedViews(account, storage)).toEqual({ status: "ready", views: [view] });
    expect(loadMyWorkSavedViews(other, storage)).toEqual({ status: "ready", views: [] });
    expect([...data.keys()][0]).toContain(account);
    expect(saveMyWorkSavedViews("", [view], storage).status).toBe("unavailable");
    expect(data.size).toBe(1);
  });
  it.each(["{", '{"version":2,"views":[]}', '{"version":1,"views":[],"role":"OWNER"}'])("reports corrupt/newer/unallowlisted storage without overwriting: %s", raw => {
    const { storage, data } = memory();
    saveMyWorkSavedViews(account, [], storage);
    const key = [...data.keys()][0]!;
    data.set(key, raw);
    expect(loadMyWorkSavedViews(account, storage).status).toBe("invalid");
    expect(saveMyWorkSavedViews(account, [view], storage).status).toBe("invalid");
    expect(data.get(key)).toBe(raw);
  });
  it("rejects authority, pagination, invalid states, dates and unsupported sort", () => {
    expect(isMyWorkSnapshot({ ...snapshot, role: "OWNER" })).toBe(false);
    expect(isMyWorkSnapshot({ ...snapshot, view: "organization" })).toBe(false);
    expect(isMyWorkSnapshot({ ...snapshot, temporaryPhase: "blocked" })).toBe(false);
    for (const filters of [{ ...snapshot.filters, taskId: account }, { ...snapshot.filters, offset: "50" }, { ...snapshot.filters, status: "done" }, { ...snapshot.filters, dateFrom: "2026-02-30" }, { ...snapshot.filters, dateTo: "2026-09-01" }, { ...snapshot.filters, dateBasis: "" }, { ...snapshot.filters, sort: "priority" }]) expect(isMyWorkSnapshot({ ...snapshot, filters })).toBe(false);
  });
  it("rejects duplicate ids, long names and more than twenty views", () => {
    const { storage } = memory();
    expect(saveMyWorkSavedViews(account, [view, view], storage).status).toBe("invalid");
    expect(saveMyWorkSavedViews(account, [{ ...view, name: "a".repeat(41) }], storage).status).toBe("invalid");
    expect(saveMyWorkSavedViews(account, Array.from({ length: 21 }, () => view), storage).status).toBe("invalid");
  });
  it("keeps legacy views unchanged and round trips supported task refinements alongside them", () => {
    const { storage, data } = memory(); saveMyWorkSavedViews(account, [view], storage);
    const key = [...data.keys()][0]!, before = data.get(key);
    expect(loadMyWorkSavedViews(account, storage)).toEqual({ status: "ready", views: [view] }); expect(data.get(key)).toBe(before);
    const refined: MyWorkSavedView = { id: other, name: "Critical collaboration", snapshot: { ...snapshot, filters: { ...snapshot.filters, priorities: "CRITICAL,HIGH", collaboratorEmployeeIds: other, sort: "priority_desc" } } };
    expect(saveMyWorkSavedViews(account, [view, refined], storage)).toEqual({ status: "ready", views: [view, refined] });
    expect(loadMyWorkSavedViews(account, storage)).toEqual({ status: "ready", views: [view, refined] });
    for (const filters of [{ ...snapshot.filters, priorities: "URGENT" }, { ...snapshot.filters, priorities: "HIGH,HIGH" }, { ...snapshot.filters, collaboratorEmployeeIds: "unknown-person" }]) expect(isMyWorkSnapshot({ ...snapshot, filters })).toBe(false);
  });
  it("does not report saved success when storage throws or silently discards writes", () => {
    const denied: ViewStorage = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
    expect(loadMyWorkSavedViews(account, denied).status).toBe("unavailable");
    expect(saveMyWorkSavedViews(account, [view], denied).status).toBe("unavailable");
    expect(saveMyWorkSavedViews(account, [view], { getItem: () => null, setItem: () => { throw new Error("quota"); } }).status).toBe("unavailable");
    expect(saveMyWorkSavedViews(account, [view], { getItem: () => null, setItem: () => undefined }).status).toBe("unavailable");
  });
});
