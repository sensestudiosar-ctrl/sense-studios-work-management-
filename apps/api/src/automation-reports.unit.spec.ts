import { BadRequestException } from "@nestjs/common";
import { automationRuleReportAllowed, reportDefinitionSchema, transformReport } from "./automation-reports.js";
import type { ReportTable } from "./report-exports.js";

const source: ReportTable = {
  title: "Source report", category: "employee", from: "2026-10-01", to: "2026-10-05", generatedAt: "2026-10-06T00:00:00.000Z",
  columns: [{ key: "branch", label: "Branch" }, { key: "employee", label: "Employee" }, { key: "hours", label: "Hours" }],
  rows: [{ branch: "North", employee: "Asha", hours: 8 }, { branch: "North", employee: "Asha Rao", hours: 6 }, { branch: "South", employee: "Ravi", hours: 7 }], unavailable: [],
};
const definition = {
  title: "Hours by branch", category: "employee", from: source.from, to: source.to,
  columns: ["employee"], filters: [], groupBy: "branch", chart: "BAR",
};

describe("automation report definitions", () => {
  it("accepts bounded strict definitions and rejects invalid periods and duplicate columns", () => {
    expect(reportDefinitionSchema.safeParse(definition).success).toBe(true);
    for (const invalid of [
      { ...definition, from: "2026-10-06" },
      { ...definition, to: "2027-10-03" },
      { ...definition, columns: ["employee", "employee"] },
      { ...definition, filters: Array.from({ length: 11 }, () => ({ column: "employee", operator: "equals", value: "Asha" })) },
      { ...definition, chart: "PIE", groupBy: undefined },
      { ...definition, arbitraryPath: "rows[0]" },
    ]) expect(reportDefinitionSchema.safeParse(invalid).success).toBe(false);
  });

  it("allows factual Learning saved reports while excluding them from event automation", () => {
    const learning = reportDefinitionSchema.safeParse({ ...definition, category: "skills_training" });
    expect(learning.success).toBe(true);
    expect(automationRuleReportAllowed("skills_training")).toBe(false);
    expect(automationRuleReportAllowed("employee")).toBe(true);
    expect(automationRuleReportAllowed("unknown")).toBe(false);
  });

  it("filters before grouping and returns count-only grouped rows and chart points", () => {
    const input = reportDefinitionSchema.parse({ ...definition, filters: [{ column: "employee", operator: "contains", value: "asha" }] });
    const result = transformReport(source, input);
    expect(result.table.columns).toEqual([{ key: "label", label: "Branch" }, { key: "count", label: "Retained rows" }]);
    expect(result.table.rows).toEqual([{ label: "North", count: 2 }]);
    expect(result.chart).toEqual([{ label: "North", count: 2 }]);
    expect(result.table.title).toBe("Hours by branch");
  });

  it("keeps selected source columns for ungrouped results and omits chart data", () => {
    const input = reportDefinitionSchema.parse({ ...definition, columns: ["hours", "employee"], groupBy: undefined, chart: "NONE", filters: [{ column: "hours", operator: "equals", value: "8" }] });
    const result = transformReport(source, input);
    expect(result.table.columns.map(({ key }) => key)).toEqual(["hours", "employee"]);
    expect(result.table.rows).toEqual([{ hours: 8, employee: "Asha" }]);
    expect(result.chart).toEqual([]);
  });

  it("rejects chosen, filtered, or grouping columns outside the source table", () => {
    for (const input of [
      { ...definition, columns: ["../arbitrary"] },
      { ...definition, filters: [{ column: "secret", operator: "equals", value: "x" }] },
      { ...definition, groupBy: "project.owner.email" },
    ]) expect(() => transformReport(source, reportDefinitionSchema.parse(input))).toThrow(BadRequestException);
  });

  it("returns grouped counts without chart points when chart is disabled", () => {
    const input = reportDefinitionSchema.parse({ ...definition, chart: "NONE" });
    const result = transformReport(source, input);
    expect(result.table.rows).toEqual([{ label: "North", count: 2 }, { label: "South", count: 1 }]);
    expect(result.chart).toEqual([]);
  });
});
