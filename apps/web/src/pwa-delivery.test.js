import { jsx as _jsx } from "react/jsx-runtime";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PhoneInstall, PwaUpdateNotice } from "./pwa-delivery.js";
it("removes a waiting-update notice after activation without reloading or changing drafts", async () => {
    vi.stubEnv("PROD", true);
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
    const worker = Object.assign(new EventTarget(), { postMessage: vi.fn() });
    const registration = Object.assign(new EventTarget(), { waiting: worker, installing: worker, update: vi.fn(async () => undefined) });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: vi.fn(async () => registration) } });
    localStorage.setItem("sense-recovery-update-draft", "retained");
    try {
        render(_jsx(PwaUpdateNotice, {}));
        expect(await screen.findByRole("complementary", { name: "App update" })).toBeInTheDocument();
        registration.waiting = null;
        act(() => worker.dispatchEvent(new Event("statechange")));
        await waitFor(() => expect(screen.queryByRole("complementary", { name: "App update" })).not.toBeInTheDocument());
        expect(worker.postMessage).not.toHaveBeenCalled();
        expect(localStorage.getItem("sense-recovery-update-draft")).toBe("retained");
    }
    finally {
        localStorage.removeItem("sense-recovery-update-draft");
        if (descriptor)
            Object.defineProperty(navigator, "serviceWorker", descriptor);
        else
            Reflect.deleteProperty(navigator, "serviceWorker");
        vi.unstubAllEnvs();
    }
});
describe("phone installation guidance", () => {
    it("offers both platforms without creating a role or account selector", () => {
        render(_jsx(MemoryRouter, { children: _jsx(PhoneInstall, {}) }));
        expect(screen.getByRole("heading", { name: "Android" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "iPhone" })).toBeInTheDocument();
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
        expect(screen.getByText(/Pending captures exist only on this device/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Open Sense Studios" })).toHaveAttribute("href", "/");
    });
    it("does not invent a browser install prompt and handles explicit install cancellation", async () => {
        render(_jsx(MemoryRouter, { children: _jsx(PhoneInstall, {}) }));
        expect(screen.queryByRole("button", { name: "Install Sense Studios" })).not.toBeInTheDocument();
        const prompt = vi.fn(async () => undefined);
        const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) });
        fireEvent(window, event);
        fireEvent.click(screen.getByRole("button", { name: "Install Sense Studios" }));
        expect(await screen.findByRole("status")).toHaveTextContent("install later");
        expect(prompt).toHaveBeenCalledOnce();
    });
});
