import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { App } from "./app.js";

function renderApp(): void {
  render(<MemoryRouter><App /></MemoryRouter>);
}

describe("foundation shell", () => {
  it("shows a loading state and an honest empty state", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    renderApp();
    expect(screen.getByText(/Checking the API and database/)).toBeInTheDocument();
    expect(screen.getByText(/No workspace content yet/)).toBeInTheDocument();
  });

  it("shows readiness only when the API reports its database ready", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: "ready", dependencies: { database: "ready" } })
    })));
    renderApp();
    expect(await screen.findByText(/API and database ready/)).toBeInTheDocument();
  });

  it("offers retry after a failed readiness request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network failed"); }));
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent(/service is unavailable/);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
