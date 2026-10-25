import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
// jsdom lacks the browser's native dialog lifecycle. Tests exercise the real
// component handlers; native focus trapping/inertness remains a browser gate.
if (typeof HTMLDialogElement.prototype.showModal !== "function")
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
if (typeof HTMLDialogElement.prototype.close !== "function")
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
});
