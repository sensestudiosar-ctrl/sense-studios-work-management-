import { startRegistration } from "@simplewebauthn/browser";

type Session = { csrfToken: string };
type Ceremony = { ceremonyId: string; options: Parameters<typeof startRegistration>[0]["optionsJSON"] };

const button = document.querySelector<HTMLButtonElement>("#test")!;
const preferredButton = document.querySelector<HTMLButtonElement>("#preferred")!;
const status = document.querySelector<HTMLElement>("#status")!;
status.textContent = "Ready. Click a test button on this Windows computer, then choose your iPhone in Chrome.";
async function runDiagnostic(preferred: boolean): Promise<void> {
  button.disabled = true;
  preferredButton.disabled = true;
  status.textContent = "Checking your private test-site session…";
  try {
    const sessionResponse = await fetch("/api/v1/auth/session", { credentials: "include" });
    if (!sessionResponse.ok) throw new Error("Sign in to the private HTTPS test site first.");
    const session = await sessionResponse.json() as Session;
    const headers = { "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken };
    const optionsResponse = await fetch("/api/v1/auth/passkey/register/options", { method: "POST", credentials: "include", headers, body: "{}" });
    if (optionsResponse.status === 403) throw new Error("Your sign-in is older than five minutes. Sign out of the private test app, sign in again with your existing passkey, then retry here promptly.");
    if (!optionsResponse.ok) throw new Error(`Registration options failed (${optionsResponse.status}).`);
    const ceremony = await optionsResponse.json() as Ceremony;
    status.textContent = `The app supplied ${ceremony.options.excludeCredentials?.length ?? 0} existing-passkey hint(s). Trying ${preferred ? "WebAuthn.io-style browser settings" : "without that hint"} now. Choose your iPhone.`;
    const response = await startRegistration({ optionsJSON: {
      ...ceremony.options,
      excludeCredentials: [],
      ...(preferred ? { authenticatorSelection: { residentKey: "preferred", requireResidentKey: false, userVerification: "preferred" } } : {})
    } });
    const verifyResponse = await fetch("/api/v1/auth/passkey/register/verify", {
      method: "POST", credentials: "include", headers,
      body: JSON.stringify({ ceremonyId: ceremony.ceremonyId, response })
    });
    if (!verifyResponse.ok) throw new Error(`Phone created a passkey, but the server rejected it (${verifyResponse.status}).`);
    status.textContent = "Success: the iPhone passkey was registered. Return to the app and refresh.";
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = `Failed before registration completed: ${name}: ${message}`;
  } finally {
    button.disabled = false;
    preferredButton.disabled = false;
  }
}
button.addEventListener("click", () => void runDiagnostic(false));
preferredButton.addEventListener("click", () => void runDiagnostic(true));
