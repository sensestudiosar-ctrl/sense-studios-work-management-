import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { jest } from "@jest/globals";
import { exportReport, type ReportTable } from "./report-exports.js";

const fixture: ReportTable = {
  title: "Résumé <March> – 月次",
  category: "Operations & quality",
  from: "2026-09-01",
  to: "2026-09-30",
  generatedAt: "2026-10-05T10:30:00.000Z",
  columns: [{ key: "name", label: "Name" }, { key: "count", label: "Count" }, { key: "note", label: "Evidence" }],
  rows: [{ name: 'Mira, "Lead"\n東京', count: 12, note: "=HYPERLINK(\"https://bad.invalid\",\"click\")" }],
  unavailable: ["Field notes: not collected <yet> & pending review"]
};

function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/u, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\r" && text[i + 1] === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

describe("exportReport", () => {
  it("quotes CSV fields, preserves Unicode/newlines, includes metadata and neutralizes formula-like strings", async () => {
    const result = await exportReport(fixture, "csv");
    const parsed = parseCsv(result.bytes.toString("utf8"));
    expect(result).toMatchObject({ mimeType: "text/csv; charset=utf-8", extension: "csv" });
    expect(result.bytes.toString("utf8").startsWith("\uFEFF")).toBe(true);
    expect(parsed).toContainEqual(["Mira, \"Lead\"\n東京", "12", "'=HYPERLINK(\"https://bad.invalid\",\"click\")"]);
    expect(parsed).toContainEqual(["Unavailable evidence"]);
    expect(parsed.flat().join(" ")).toContain("2026-09-01 – 2026-09-30");
  });

  it("writes an actual XLSX workbook with typed numeric cells and safe literal formula text", async () => {
    const result = await exportReport(fixture, "xlsx");
    expect(result.bytes.subarray(0, 4).toString("hex")).toBe("504b0304");
    expect(result).toMatchObject({ mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.bytes);
    const sheet = workbook.getWorksheet("Report")!;
    expect(sheet.getCell("A1").value).toBe(fixture.title);
    expect(sheet.getCell("A7").value).toBe("Name");
    expect(sheet.getCell("B8").value).toBe(12);
    expect(sheet.getCell("B8").type).toBe(ExcelJS.ValueType.Number);
    expect(sheet.getCell("C8").value).toBe("'=HYPERLINK(\"https://bad.invalid\",\"click\")");
    expect(sheet.getCell("C8").type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell("B5").value).toContain("Field notes");
    expect(sheet.autoFilter).toBeDefined();
  });

  it("renders escaped, complete print HTML with repeated table headings and print margins", async () => {
    const result = await exportReport(fixture, "print");
    const html = result.bytes.toString("utf8");
    expect(result).toMatchObject({ mimeType: "text/html; charset=utf-8", extension: "html" });
    expect(html).toContain("@page{size:landscape;margin:14mm}");
    expect(html).toContain("thead{display:table-header-group}");
    expect(html).toContain("Résumé &lt;March&gt; – 月次");
    expect(html).toContain("Mira, &quot;Lead&quot;\n東京");
    expect(html).toContain("Unavailable evidence");
    expect(html).toContain("Field notes: not collected &lt;yet&gt; &amp; pending review");
    expect(html).not.toContain("<March>");
  });

  it("emits a valid multi-page PDF retaining long Unicode report values", async () => {
    const longEvidence = `${"測定結果 हिंदी कर्मचारी 😀 👍 नमस्ते and retained evidence; ".repeat(80)}終端証跡 🥳`;
    const longReport: ReportTable = {
      ...fixture,
      title: "品質確認 — हिंदी सारांश 😀 — 品質確認",
      rows: Array.from({ length: 85 }, (_, i) => ({ name: `担当者 ${i + 1}`, count: i + 1, note: longEvidence })),
      unavailable: ["確認待ち — source data unavailable"]
    };
    const result = await exportReport(longReport, "pdf");
    const raw = result.bytes.toString("latin1");
    expect(result).toMatchObject({ mimeType: "application/pdf", extension: "pdf" });
    expect(result.bytes.subarray(0, 8).toString("latin1")).toBe("%PDF-1.3");
    expect((raw.match(/\/Type \/Page\b/gu) ?? []).length).toBeGreaterThan(1);
    expect(raw).toContain("/FontFile2");
    expect(raw).toContain("/ToUnicode");
    expect(result.bytes.length).toBeGreaterThan(20_000);
  });

  it("places wrapped mixed-script cell lines on distinct measured baselines", async () => {
    const spy = jest.spyOn(PDFDocument.prototype, "text");
    try {
      await exportReport({
        ...fixture,
        rows: [{ name: "担当者", count: 1, note: `${"測定結果 हिंदी कर्मचारी 😀 👍 नमस्ते and retained evidence; ".repeat(16)}終端証跡` }]
      }, "pdf");
      const evidenceBaselines = new Set<number>();
      for (const call of spy.mock.calls) {
        const x = call[1];
        const y = call[2];
        if (typeof x === "number" && x > 500 && x < 620 && typeof y === "number") evidenceBaselines.add(y);
      }
      expect(evidenceBaselines.size).toBeGreaterThan(10);
    } finally {
      spy.mockRestore();
    }
  });

  it("reports unsupported PDF glyphs instead of silently replacing evidence", async () => {
    const unsupported: ReportTable = { ...fixture, rows: [{ name: "ગુજરાતી", count: 1, note: "retained" }] };
    await expect(exportReport(unsupported, "pdf")).rejects.toThrow("U+0A97");
  });
});
