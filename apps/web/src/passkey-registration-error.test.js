import { describe, expect, it } from "vitest";
import { WebAuthnError } from "@simplewebauthn/browser";
import { passkeyRegistrationError } from "./passkey-registration-error.js";
describe("passkeyRegistrationError", () => {
    const production = { diagnostics: false, browserSupported: true };
    const development = { diagnostics: true, browserSupported: true };
    it("formats a WebAuthn wrapper with its native NotAllowedError cause in development", () => {
        const error = new WebAuthnError({
            message: "wrapper text",
            code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
            cause: new DOMException("User cancelled\nrequest", "NotAllowedError"),
        });
        expect(passkeyRegistrationError(error, development)).toBe("The passkey request was cancelled or declined by the browser. You can try again when ready. (browser detail: NotAllowedError / ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY; cause: NotAllowedError: User cancelled request)");
    });
    it("keeps production wording free of native cause details", () => {
        const error = new WebAuthnError({
            message: "wrapper text",
            code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY",
            cause: new DOMException("private device details", "NotAllowedError"),
        });
        expect(passkeyRegistrationError(error, production)).toBe("The passkey request was cancelled or declined by the browser. You can try again when ready.");
    });
    it("preserves the registered-passkey message and only accepts recognized string codes", () => {
        expect(passkeyRegistrationError({ code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" }, production)).toBe("That passkey is already registered. Choose a different passkey method, such as your phone or a security key.");
        expect(passkeyRegistrationError({ code: { value: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED", secret: "do not show" } }, development)).toBe("The browser could not create another passkey with that method. Choose a different device or security key and try again. (browser detail: UnknownError)");
    });
    it("omits arbitrary cause objects and sanitizes and bounds native cause messages", () => {
        const arbitrary = new Error("wrapper", { cause: { name: "NotAllowedError", message: "sensitive payload" } });
        arbitrary.name = "WebAuthnError";
        expect(passkeyRegistrationError(arbitrary, development)).not.toContain("sensitive payload");
        const longMessage = `${"a\t\n".repeat(150)}tail`;
        const bounded = new Error("wrapper", { cause: new DOMException(longMessage, "NotAllowedError") });
        bounded.name = "WebAuthnError";
        const result = passkeyRegistrationError(bounded, development);
        const causeMessage = result.split("; cause: NotAllowedError: ")[1]?.slice(0, -1);
        expect(causeMessage).toBe("a ".repeat(100));
        expect(causeMessage?.split("").every(character => {
            const code = character.charCodeAt(0);
            return code > 31 && (code < 127 || code > 159);
        })).toBe(true);
        expect(causeMessage).toHaveLength(200);
    });
    it("uses existing cancellation, unsupported-browser, and fallback wording", () => {
        const cancellation = new Error("cancelled");
        cancellation.name = "AbortError";
        const unsupported = new Error("unsupported");
        unsupported.name = "NotSupportedError";
        expect(passkeyRegistrationError(cancellation, production)).toBe("The passkey request was cancelled or declined by the browser. You can try again when ready.");
        expect(passkeyRegistrationError(unsupported, production)).toBe("This browser does not support passkeys. Open this page in a supported browser or device.");
        expect(passkeyRegistrationError(new Error("other"), { diagnostics: false, browserSupported: false })).toBe("This browser does not support passkeys. Open this page in a supported browser or device.");
        expect(passkeyRegistrationError(new Error("other"), production)).toBe("The browser could not create another passkey with that method. Choose a different device or security key and try again.");
    });
});
