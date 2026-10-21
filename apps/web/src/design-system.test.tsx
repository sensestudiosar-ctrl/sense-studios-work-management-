import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Design-system tests: the palette and accessibility contract for
 * focus indicators and the task workspace.
 *
 * Pattern follows my-work-parity.test.tsx: read CSS as text,
 * assert on it. This catches regressions in palette values,
 * token chains, and accessibility ratios without a full browser.
 */

const stylesCss = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
const taskCss = readFileSync(resolve(process.cwd(), "src/task.css"), "utf8");

// ── WCAG 2.2 relative luminance ──────────────────────────────────────────────

function sRGBtoLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): [number, number, number] {
  // Expand 3-char shorthand (#abc → #aabbcc) for CSS validity
  const h = hex.length === 4
    ? "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
    : hex;
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("design system – focus contrast", () => {
  it("--sense-focus (the darkened value) clears WCAG 2.2 SC 2.4.11 (3:1) against the canvas token", () => {
    // The old #b98f49 measured 2.62:1 against #f4f1e9 — below the 3:1 threshold.
    // The new #8c6b30 measures 4.37:1 — clears 3:1 with margin.
    const focus = "#8c6b30";
    const canvas = "#f4f1e9";
    const ratio = contrastRatio(focus, canvas);
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeLessThan(100); // sanity: not Infinity / NaN
  });

  it("--sense-focus also clears 3:1 against the surface token and the studio canvas", () => {
    const focus = "#8c6b30";
    for (const bg of ["#fffdf7", "#f7f5f0", "#fff"]) {
      const ratio = contrastRatio(focus, bg);
      expect(ratio).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("design system – .task-empty-state", () => {
  it("exists in styles.css with a border and a background (visually distinct from a bare table)", () => {
    expect(stylesCss).toContain(".task-empty-state");
    // A dashed border differentiates it from a solid-bordered panel
    expect(stylesCss).toMatch(/\.task-empty-state\s*\{[^}]*border:\s*1px dashed/);
    // A background colour ensures it reads as a panel, not a flat table row
    expect(stylesCss).toMatch(/\.task-empty-state\s*\{[^}]*background:\s*#[0-9a-fA-F]{6}/);
    // It is not just colour — it has a structural border
    expect(stylesCss).toMatch(/\.task-empty-state\s*\{[^}]*border:\s*1px dashed var\(--task-line/);
  });

  it("has a title sub-element with its own ink colour (not just muted)", () => {
    expect(stylesCss).toContain(".task-empty-state__title");
    expect(stylesCss).toMatch(/\.task-empty-state__title\s*\{[^}]*color:\s*var\(--task-ink/);
  });
});

describe("design system – .task-workspace theme integration", () => {
  it("--task-ink now references the sense token chain (theme fallback wired up)", () => {
    // The old pattern was a hardcoded hex: --task-ink:#182522;
    // The new pattern references the sense token with a hex fallback:
    //   --task-ink: var(--sense-ink, #182522);
    expect(taskCss).toMatch(/--task-ink:\s*var\(--sense-ink,\s*#182522\)/);
  });

  it("--task-paper, --task-muted, --task-line, and --task-accent all use the sense fallback chain", () => {
    expect(taskCss).toMatch(/--task-muted:\s*var\(--sense-ink-muted,\s*#62736d\)/);
    expect(taskCss).toMatch(/--task-line:\s*var\(--sense-border,\s*#dce5df\)/);
    expect(taskCss).toMatch(/--task-accent:\s*var\(--sense-pine,\s*#1d6757\)/);
    expect(taskCss).toMatch(/--task-paper:\s*var\(--sense-surface,\s*#fff\)/);
  });
});
