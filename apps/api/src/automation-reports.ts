import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { reportCategories } from "./dashboard-policy.js";
import type { ReportTable } from "./report-exports.js";

const categories = reportCategories;
export function automationRuleReportAllowed(category: unknown): boolean {
  return typeof category === "string" && reportCategories.includes(category as typeof reportCategories[number]) && category !== "skills_training";
}
const date = z.iso.date();
const range = z.object({ from: date, to: date }).strict().refine((value) => value.to >= value.from && Date.parse(value.to) - Date.parse(value.from) <= 366 * 86400000, "Period must be ordered and no longer than one year");

export const reportDefinitionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  category: z.enum(categories),
  from: date,
  to: date,
  columns: z.array(z.string().min(1).max(100)).min(1).max(20),
  filters: z.array(z.object({ column: z.string().min(1).max(100), operator: z.enum(["equals", "contains"]), value: z.string().max(500) }).strict()).max(10),
  groupBy: z.string().min(1).max(100).optional(),
  chart: z.enum(["NONE", "BAR", "PIE"]),
}).strict().refine((value) => range.safeParse({ from: value.from, to: value.to }).success, "Period must be ordered and no longer than one year")
  .refine((value) => new Set(value.columns).size === value.columns.length, "Columns must be unique")
  .refine((value) => value.chart === "NONE" || value.groupBy !== undefined, "Charts require a grouping column");

export type ReportDefinition = z.infer<typeof reportDefinitionSchema>;
export type ReportChartPoint = { label: string; count: number };

function valueText(value: string | number | null): string {
  return value === null ? "" : String(value);
}

export function transformReport(table: ReportTable, definition: ReportDefinition): { table: ReportTable; chart: ReportChartPoint[] } {
  const known = new Set(table.columns.map(({ key }) => key));
  const requested = [...definition.columns, ...definition.filters.map(({ column }) => column), ...(definition.groupBy ? [definition.groupBy] : [])];
  if (requested.some((column) => !known.has(column))) throw new BadRequestException("Report contains an unknown column");

  const filteredRows = table.rows.filter((row) => definition.filters.every(({ column, operator, value }) => {
    const actual = valueText(row[column] ?? null);
    return operator === "equals" ? actual === value : actual.toLocaleLowerCase().includes(value.toLocaleLowerCase());
  }));
  let columns = definition.columns.map((key) => table.columns.find((column) => column.key === key)!);
  let rows = filteredRows.map((row) => Object.fromEntries(columns.map(({ key }) => [key, row[key] ?? null])) as ReportTable["rows"][number]);
  let chart: ReportChartPoint[] = [];

  if (definition.groupBy) {
    const counts = new Map<string, number>();
    for (const row of filteredRows) {
      const label = valueText(row[definition.groupBy] ?? null);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    chart = [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => a.label.localeCompare(b.label));
    rows = chart.map(({ label, count }) => ({ label, count }));
    columns = [{ key: "label", label: table.columns.find(({ key }) => key === definition.groupBy)!.label }, { key: "count", label: "Retained rows" }];
    if (definition.chart === "NONE") chart = [];
  }

  return { table: { ...table, title: definition.title, category: definition.category, from: definition.from, to: definition.to, columns, rows }, chart };
}
