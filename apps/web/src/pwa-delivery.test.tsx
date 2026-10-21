import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PhoneInstall } from "./pwa-delivery.js";

describe("phone installation guidance", () => {
  it("offers both platforms without creating a role or account selector", () => {
    render(<MemoryRouter><PhoneInstall /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Android" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "iPhone" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText(/Pending captures exist only on this device/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Sense Studios" })).toHaveAttribute("href", "/");
  });

  it("does not invent a browser install prompt and handles explicit install cancellation", async () => {
    render(<MemoryRouter><PhoneInstall /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Install Sense Studios" })).not.toBeInTheDocument();
    const prompt = vi.fn(async () => undefined);
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) });
    fireEvent(window, event);
    fireEvent.click(screen.getByRole("button", { name: "Install Sense Studios" }));
    expect(await screen.findByRole("status")).toHaveTextContent("install later");
    expect(prompt).toHaveBeenCalledOnce();
  });
});
