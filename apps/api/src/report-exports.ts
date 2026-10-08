import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export type ReportTable = {
  title: string;
  category: string;
  from: string;
  to: string;
  generatedAt: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number | null>>;
  unavailable: string[];
};

export type ReportExport = { bytes: Buffer; mimeType: string; extension: string };
export type ReportFormat = "csv" | "xlsx" | "pdf" | "print";

const moduleRequire = createRequire(import.meta.url);
const pdfkitRequire = createRequire(moduleRequire.resolve("pdfkit"));
type FontFace = { path: string; font: { hasGlyphForCodePoint(codePoint: number): boolean } };
const fontkit = pdfkitRequire("fontkit") as { openSync(path: string): FontFace["font"] };
const fontFace = (name: string) => {
  const path = fileURLToPath(new URL(`../assets/fonts/${name}`, import.meta.url));
  return { path, font: fontkit.openSync(path) };
};
const devanagariFont = fontFace("NotoSansDevanagari-VF.ttf");
const emojiFont = fontFace("NotoEmoji-VF.ttf");
const cjkFont = fontFace("NotoSansSC-VF.ttf");
const fontFaces = [devanagariFont, emojiFont, cjkFont];
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const CSV_MIME = "text/csv; charset=utf-8";
const HTML_MIME = "text/html; charset=utf-8";

function reportValues(table: ReportTable): Array<Array<string | number | null>> {
  return table.rows.map((row) => table.columns.map(({ key }) => row[key] ?? null));
}

function safeSpreadsheetText(value: string): string {
  // Excel and LibreOffice can evaluate formulas after leading whitespace/control characters.
  const firstSignificant = Array.from(value).find((char) => {
    const codePoint = char.codePointAt(0)!;
    return codePoint > 0x20 && codePoint !== 0x7f;
  });
  return firstSignificant && "=+-@".includes(firstSignificant) ? `'${value}` : value;
}

function csvCell(value: string | number | null): string {
  const safe = typeof value === "string" ? safeSpreadsheetText(value) : value === null ? "" : String(value);
  return `"${safe.replaceAll('"', '""')}"`;
}

function csv(table: ReportTable): Buffer {
  const lines = [
    ["Title", table.title], ["Category", table.category], ["Period", `${table.from} – ${table.to}`], ["Generated", table.generatedAt]
  ].map((line) => line.map(csvCell).join(","));
  if (table.unavailable.length) {
    lines.push(csvCell("Unavailable evidence"));
    for (const item of table.unavailable) lines.push(csvCell(item));
  }
  lines.push(table.columns.map(({ label }) => csvCell(label)).join(","));
  for (const values of reportValues(table)) lines.push(values.map(csvCell).join(","));
  return Buffer.from(`\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
}

async function xlsx(table: ReportTable): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sense Studios";
  workbook.created = new Date(table.generatedAt);
  const sheet = workbook.addWorksheet("Report", { views: [{ state: "frozen", ySplit: 6 }] });
  sheet.addRow([safeSpreadsheetText(table.title)]);
  sheet.addRow(["Category", safeSpreadsheetText(table.category)]);
  sheet.addRow(["Period", `${table.from} – ${table.to}`]);
  sheet.addRow(["Generated", table.generatedAt]);
  sheet.addRow(["Unavailable evidence", safeSpreadsheetText(table.unavailable.join("; ") || "None")]);
  sheet.addRow([]);
  const header = sheet.addRow(table.columns.map(({ label }) => safeSpreadsheetText(label)));
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF243447" } };
  header.alignment = { vertical: "top", wrapText: true };
  for (const values of reportValues(table)) {
    const row = sheet.addRow(values.map((value) => typeof value === "string" ? safeSpreadsheetText(value) : value));
    row.eachCell((cell) => { cell.alignment = { vertical: "top", wrapText: true }; });
  }
  sheet.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7 + table.rows.length, column: Math.max(1, table.columns.length) } };
  for (let i = 0; i < table.columns.length; i++) sheet.getColumn(i + 1).width = Math.min(48, Math.max(14, (table.columns[i]?.label.length ?? 10) + 2));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function printable(table: ReportTable): Buffer {
  const head = table.columns.map(({ label }) => `<th scope="col">${escapeHtml(label)}</th>`).join("");
  const rows = reportValues(table).map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value === null ? "" : String(value))}</td>`).join("")}</tr>`).join("\n");
  const unavailable = table.unavailable.length
    ? `<section class="unavailable"><h2>Unavailable evidence</h2><ul>${table.unavailable.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`
    : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(table.title)}</title><style>@page{size:landscape;margin:14mm}body{font:10pt Arial,sans-serif;color:#18212b}h1{font-size:18pt;margin:0 0 4mm}p{margin:1mm 0}.unavailable{break-inside:avoid}table{width:100%;border-collapse:collapse;margin-top:6mm}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #89939d;padding:2mm;vertical-align:top;overflow-wrap:anywhere}th{background:#e9eef3;text-align:left}@media screen{body{max-width:1600px;margin:2rem auto;padding:0 1rem}}</style></head><body><h1>${escapeHtml(table.title)}</h1><p><strong>Category:</strong> ${escapeHtml(table.category)}</p><p><strong>Period:</strong> ${escapeHtml(table.from)} – ${escapeHtml(table.to)}</p><p><strong>Generated:</strong> ${escapeHtml(table.generatedAt)}</p>${unavailable}<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
  return Buffer.from(html, "utf8");
}

type PdfRun = { text: string; face: FontFace };

function faceForGrapheme(grapheme: string): FontFace {
  const points = Array.from(grapheme).map((char) => char.codePointAt(0)!).filter((point) => point > 0x20 && point !== 0x7f && point !== 0x200c && point !== 0x200d && point !== 0xfe0e && point !== 0xfe0f && !(point >= 0xe0020 && point <= 0xe007f));
  const devanagari = points.some((point) => point >= 0x0900 && point <= 0x097f || point >= 0xa8e0 && point <= 0xa8ff);
  const emoji = /\p{Extended_Pictographic}/u.test(grapheme) || points.some((point) => point >= 0x1f1e6 && point <= 0x1f1ff);
  const candidates = devanagari ? [devanagariFont, cjkFont, emojiFont]
    : emoji ? [emojiFont, cjkFont, devanagariFont]
      : [cjkFont, devanagariFont, emojiFont];
  for (const face of candidates) {
    if (points.every((point) => face.font.hasGlyphForCodePoint(point))) return face;
  }
  const unsupported = points.find((point) => !fontFaces.some((face) => face.font.hasGlyphForCodePoint(point))) ?? points[0]!;
  throw new Error(`PDF font cannot render U+${unsupported.toString(16).toUpperCase().padStart(4, "0")}; report evidence was not exported.`);
}

function pdfRuns(value: string): PdfRun[] {
  const runs: PdfRun[] = [];
  for (const { segment } of graphemeSegmenter.segment(value)) {
    const face = faceForGrapheme(segment);
    const last = runs[runs.length - 1];
    if (last?.face === face) last.text += segment;
    else runs.push({ text: segment, face });
  }
  return runs;
}

function runWidth(doc: PDFKit.PDFDocument, runs: PdfRun[], size: number): number {
  return runs.reduce((total, run) => total + doc.font(run.face.path).fontSize(size).widthOfString(run.text), 0);
}

function wrapPdfText(doc: PDFKit.PDFDocument, value: string, width: number, size: number): PdfRun[][] {
  const lines: PdfRun[][] = [];
  for (const paragraph of value.split("\n")) {
    let line: PdfRun[] = [];
    for (const run of pdfRuns(paragraph)) {
      for (const { segment } of graphemeSegmenter.segment(run.text)) {
        const piece = [{ text: segment, face: run.face }];
        const joined = [...line, ...piece];
        if (line.length && runWidth(doc, joined, size) > width) { lines.push(line); line = piece; }
        else line = joined;
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [[]];
}

function drawPdfRuns(doc: PDFKit.PDFDocument, runs: PdfRun[], x: number, y: number, size: number): void {
  let left = x;
  for (const run of runs) {
    doc.font(run.face.path).fontSize(size).text(run.text, left, y, { lineBreak: false });
    left += doc.widthOfString(run.text);
  }
}

async function pdf(table: ReportTable): Promise<Buffer> {
  const text = [table.title, table.category, table.from, table.to, table.generatedAt, ...table.columns.map(({ label }) => label), ...table.unavailable,
    ...reportValues(table).flatMap((row) => row.map((value) => value === null ? "" : String(value)))].join("\n");
  for (const { segment } of graphemeSegmenter.segment(text)) faceForGrapheme(segment);
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 34, autoFirstPage: true });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columns = table.columns.length ? table.columns : [{ key: "_empty", label: "No columns" }];
  const colWidth = pageWidth / columns.length;
  const bodyBottom = doc.page.height - doc.page.margins.bottom;
  const lineHeight = 10;
  const drawLine = (value: string, x: number, y: number, size: number) => drawPdfRuns(doc, pdfRuns(value), x, y, size);
  const addHead = () => {
    const titleY = doc.y;
    const titleLines = wrapPdfText(doc, table.title, pageWidth, 14);
    titleLines.forEach((line, index) => drawPdfRuns(doc, line, doc.page.margins.left, titleY + index * 16, 14));
    const metadataY = titleY + titleLines.length * 16 + 3;
    const metadataLines = wrapPdfText(doc, `${table.category} | ${table.from} – ${table.to} | Generated ${table.generatedAt}`, pageWidth, 8);
    metadataLines.forEach((line, index) => drawPdfRuns(doc, line, doc.page.margins.left, metadataY + index * lineHeight, 8));
    const headerY = metadataY + metadataLines.length * lineHeight + 2;
    const headerLines = columns.map((column) => wrapPdfText(doc, column.label, colWidth - 8, 8));
    headerLines.forEach((lines, index) => {
      const x = doc.page.margins.left + index * colWidth;
      lines.forEach((line, lineIndex) => drawPdfRuns(doc, line, x, headerY + lineIndex * lineHeight, 8));
    });
    doc.y = headerY + Math.max(1, ...headerLines.map((lines) => lines.length)) * lineHeight + 2;
    doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
    doc.y += 5;
  };
  const addPage = () => { doc.addPage(); doc.x = doc.page.margins.left; doc.y = doc.page.margins.top; addHead(); };
  addHead();
  if (table.unavailable.length) {
    const headingY = doc.y;
    drawLine("Unavailable evidence", doc.page.margins.left, headingY, 9);
    doc.y = headingY + lineHeight;
    for (const item of table.unavailable) {
      const lines = wrapPdfText(doc, `• ${item}`, pageWidth, 8);
      for (const line of lines) {
        if (doc.y + lineHeight > bodyBottom) addPage();
        const y = doc.y;
        drawPdfRuns(doc, line, doc.page.margins.left, y, 8);
        doc.y = y + lineHeight;
      }
    }
    doc.moveDown(0.4);
  }
  for (const values of reportValues(table)) {
    const cells = columns.map((_, index) => wrapPdfText(doc, String(values[index] ?? ""), Math.max(12, colWidth - 8), 7));
    const maxLines = Math.max(1, ...cells.map((lines) => lines.length));
    let offset = 0;
    while (offset < maxLines) {
      if (doc.y + lineHeight * 2 > bodyBottom) addPage();
      const available = Math.max(1, Math.floor((bodyBottom - doc.y - 3) / lineHeight));
      const take = Math.min(maxLines - offset, available);
      const top = doc.y;
      cells.forEach((lines, index) => {
        lines.slice(offset, offset + take).forEach((line, lineIndex) => {
          const x = doc.page.margins.left + index * colWidth + 3;
          drawPdfRuns(doc, line, x, top + lineIndex * lineHeight, 7);
        });
      });
      doc.y = top + take * lineHeight + 5;
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.y += 3;
      offset += take;
      if (offset < maxLines) addPage();
    }
  }
  doc.end();
  return completed;
}

export async function exportReport(table: ReportTable, format: ReportFormat): Promise<ReportExport> {
  switch (format) {
    case "csv": return { bytes: csv(table), mimeType: CSV_MIME, extension: "csv" };
    case "xlsx": return { bytes: await xlsx(table), mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" };
    case "pdf": return { bytes: await pdf(table), mimeType: "application/pdf", extension: "pdf" };
    case "print": return { bytes: printable(table), mimeType: HTML_MIME, extension: "html" };
  }
}
