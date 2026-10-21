import { actionableTaskReasons } from "./actionable-work-policy.js";
const task = { status: "IN_PROGRESS", type: "PROJECT", targetDate: new Date("2026-10-13T00:00:00Z"), requiresReassignment: false };
const capabilities = { edit: true, transition: true, resume: false, reassign: false };
const now = new Date("2026-10-12T20:00:00Z");
describe("Actionable task reasons", () => {
  it("compares date-only Target with organization local today", () => {
    expect(actionableTaskReasons(task, capabilities, true, now, "Asia/Kolkata")).toEqual(["due_today"]);
    expect(actionableTaskReasons(task, capabilities, true, now, "UTC")).toEqual([]);
    expect(actionableTaskReasons({ ...task, targetDate: new Date("2026-10-12") }, capabilities, true, now, "Asia/Kolkata")).toEqual(["overdue"]);
  });
  it("does not turn collaborator membership or review-phase visibility into work", () => {
    expect(actionableTaskReasons(task, capabilities, false, now, "Asia/Kolkata")).toEqual([]);
    expect(actionableTaskReasons({ ...task, status: "IN_INTERNAL_REVIEW" }, { ...capabilities, edit: false }, true, now, "Asia/Kolkata")).toEqual([]);
  });
  it("requires actual resume or reassign authority and never infers free-text responsibility", () => {
    expect(actionableTaskReasons({ ...task, status: "WAITING" }, capabilities, true, now, "UTC")).toEqual([]);
    expect(actionableTaskReasons({ ...task, status: "WAITING" }, { ...capabilities, resume: true }, true, now, "UTC")).toEqual(["resume_waiting"]);
    expect(actionableTaskReasons({ ...task, requiresReassignment: true }, capabilities, true, now, "UTC")).toEqual([]);
    expect(actionableTaskReasons({ ...task, requiresReassignment: true }, { ...capabilities, reassign: true }, false, now, "UTC")).toEqual(["reassignment_required"]);
  });
  it("deduplicates one task with several reasons and admits future correction work", () => {
    expect(actionableTaskReasons({ ...task, type: "CORRECTION" }, capabilities, true, now, "Asia/Kolkata")).toEqual(["correction_required", "due_today"]);
    expect(actionableTaskReasons({ ...task, type: "CORRECTION", targetDate: new Date("2027-01-01") }, capabilities, true, now, "UTC")).toEqual(["correction_required"]);
  });
});
