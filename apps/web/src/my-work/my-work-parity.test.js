import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DUE_BUCKETS, dueBucket, parityPriorityClass, parityPriorityLabel, parityState } from "./my-work-parity.js";
/**
 * These tests pin the prototype's presentation contract. They are deliberately
 * strict: the Owner's complaint is that the app does not *feel* like the demo,
 * so the palette and the row geometry are treated as requirements, not
 * aesthetics. A silent palette change should fail here.
 */
const css = readFileSync(resolve(process.cwd(), "src/my-work/my-work-parity.css"), "utf8");
describe("prototype status colour system", () => {
    it("uses the exact prototype state palette", () => {
        for (const [token, value] of [
            ["--state-todo", "#758496"],
            ["--state-progress", "#2384be"],
            ["--state-review", "#e3a52d"],
            ["--state-waiting", "#7d5cb9"],
            ["--state-correction", "#c84955"],
            ["--state-done", "#2b916a"],
        ]) {
            expect(css).toContain(`${token}: ${value};`);
        }
    });
    it("uses the exact prototype priority palette", () => {
        for (const [token, value] of [
            ["--priority-urgent", "#b72f42"],
            ["--priority-high", "#d17623"],
            ["--priority-normal", "#4a76a9"],
            ["--priority-low", "#647d76"],
        ]) {
            expect(css).toContain(`${token}: ${value};`);
        }
    });
    it("drives both the left rail and the whole-row tint from one state variable", () => {
        for (const state of ["todo", "progress", "review", "waiting", "correction", "done"]) {
            expect(css).toMatch(new RegExp(`\\.state-${state}\\s*\\{[^}]*--state-rail:[^}]*--row-tint:`));
        }
        expect(css).toContain("border-left: var(--my-work-rail) solid var(--state-rail)");
        expect(css).toContain("background: var(--row-tint)");
    });
    it("gives every state chip a solid fill and an accessible label colour", () => {
        expect(css).toMatch(/\.my-work-status-todo\s*\{\s*background: var\(--state-todo\);\s*color: #0b100d;/);
        expect(css).toMatch(/\.my-work-status-progress\s*\{\s*background: var\(--state-progress\);\s*color: #0b100d;/);
        // Review gold is light, so the prototype uses a dark label for contrast.
        expect(css).toMatch(/\.my-work-status-review\s*\{\s*background: var\(--state-review\);\s*color: #2e2517;/);
        expect(css).toMatch(/\.my-work-status-waiting\s*\{\s*background: var\(--state-waiting\);\s*color: #fff;/);
        expect(css).toMatch(/\.my-work-status-correction\s*\{\s*background: var\(--state-correction\);\s*color: #fff;/);
        expect(css).toMatch(/\.my-work-status-done\s*\{\s*background: var\(--state-done\);\s*color: #0b100d;/);
    });
    it("renders four priority pills with the prototype's colours", () => {
        for (const cls of ["pr-Urgent", "pr-High", "pr-Normal", "pr-Low"]) {
            expect(css).toContain(`.my-work-priority.${cls}`);
        }
    });
    it("keeps the prototype's 65px comfortable and 50px compact row heights", () => {
        expect(css).toContain("--my-work-row: 65px;");
        expect(css).toContain("--my-work-row: 50px;");
    });
    it("allocates a desktop track to each of the seven canonical row fields", () => {
        expect(css).toContain("grid-template-columns: minmax(0, 2.35fr) minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, .9fr) minmax(0, 1.15fr) minmax(0, .8fr) minmax(0, 1fr);");
    });
    it("collapses to the prototype's mobile card row", () => {
        expect(css).toMatch(/@media \(max-width: 700px\)[\s\S]*\.my-work-demo-row\[role="listitem"\]\s*\{[^}]*display: flex;/);
        expect(css).toMatch(/@media \(max-width: 700px\)[\s\S]*min-height: 92px;/);
        expect(css).toMatch(/@media \(max-width: 700px\)[\s\S]*\.my-work-mobile-state\s*\{\s*display: flex;/);
    });
    it("hides the project column at tablet width like the prototype", () => {
        expect(css).toMatch(/@media \(max-width: 1100px\)[\s\S]*\.my-work-row-project/);
    });
    it("is scoped to the My Work workspace so the Tasks route is untouched", () => {
        const unscoped = css.split("\n").filter(line => /^\.(my-work|state-)/.test(line));
        expect(unscoped).toEqual([]);
    });
});
describe("parityState", () => {
    it("maps every application status to a prototype state", () => {
        expect(parityState("NOT_STARTED")).toBe("todo");
        expect(parityState("IN_PROGRESS")).toBe("progress");
        expect(parityState("WAITING")).toBe("waiting");
        expect(parityState("SUBMITTED_INTERNAL_REVIEW")).toBe("review");
        expect(parityState("IN_INTERNAL_REVIEW")).toBe("review");
        expect(parityState("SUBMITTED_CLIENT_REVIEW")).toBe("review");
        expect(parityState("IN_CLIENT_REVIEW")).toBe("review");
        expect(parityState("CORRECTIONS_REQUIRED")).toBe("correction");
        expect(parityState("CLIENT_REVISION_REQUIRED")).toBe("correction");
        expect(parityState("STOPPED_DUE_TO_PROJECT_CANCELLATION")).toBe("correction");
        expect(parityState("INTERNAL_APPROVED")).toBe("done");
        expect(parityState("CLIENT_APPROVED")).toBe("done");
        expect(parityState("COMPLETED")).toBe("done");
    });
    it("falls back to todo for an unknown status rather than throwing", () => {
        expect(parityState("SOMETHING_NEW")).toBe("todo");
    });
});
describe("parityPriorityLabel and parityPriorityClass", () => {
    it("uses the prototype's Urgent/Normal wording", () => {
        expect(parityPriorityLabel("CRITICAL")).toBe("Urgent");
        expect(parityPriorityLabel("HIGH")).toBe("HIGH");
        expect(parityPriorityLabel("MEDIUM")).toBe("Normal");
        expect(parityPriorityLabel("LOW")).toBe("LOW");
    });
    it("maps each application priority to its pill class", () => {
        expect(parityPriorityClass("CRITICAL")).toBe("pr-Urgent");
        expect(parityPriorityClass("HIGH")).toBe("pr-High");
        expect(parityPriorityClass("MEDIUM")).toBe("pr-Normal");
        expect(parityPriorityClass("LOW")).toBe("pr-Low");
    });
});
describe("dueBucket", () => {
    const today = "2026-10-14";
    it("puts undated work in Without a date", () => {
        expect(dueBucket(null, today, false)).toBe("Without a date");
    });
    it("marks past incomplete work Overdue", () => {
        expect(dueBucket("2026-10-13", today, false)).toBe("Overdue");
        expect(dueBucket("2026-10-01", today, false)).toBe("Overdue");
    });
    it("does not mark completed past work Overdue", () => {
        expect(dueBucket("2026-10-13", today, true)).toBe("Later");
    });
    it("puts today's work in Today", () => {
        expect(dueBucket(today, today, false)).toBe("Today");
    });
    it("buckets the near future by the prototype's ranges", () => {
        expect(dueBucket("2026-10-18", today, false)).toBe("This week");
        expect(dueBucket("2026-10-21", today, false)).toBe("This week");
        expect(dueBucket("2026-10-25", today, false)).toBe("Next week");
        expect(dueBucket("2026-11-01", today, false)).toBe("This month");
        expect(dueBucket("2026-12-20", today, false)).toBe("Later");
    });
    it("orders buckets exactly as the prototype does", () => {
        expect([...DUE_BUCKETS]).toEqual(["Overdue", "Today", "This week", "Next week", "This month", "Later", "Without a date"]);
    });
});
