import { afterEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReleaseStatus } from "./release-status.js";
const build = { commit: "a".repeat(40), buildId: "approved-a", builtAt: "2026-10-21T00:00:00.000Z" };
afterEach(() => vi.unstubAllGlobals());
it("shows a mismatch without discarding or automatically reloading the user's work", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ...build, commit: "b".repeat(40) }))));
  render(<ReleaseStatus build={build} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Save your work");
  expect(screen.getByText(/API: bbbbbbbb/)).toBeInTheDocument();
});
it("does not present an unavailable API as a matched release", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
  render(<ReleaseStatus build={build} />);
  expect(await screen.findByRole("status")).toHaveTextContent("cannot verify");
});
