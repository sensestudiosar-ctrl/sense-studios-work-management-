import { startRegistration } from "@simplewebauthn/browser";

const button = document.querySelector<HTMLButtonElement>("#test")!;
const status = document.querySelector<HTMLElement>("#status")!;

function randomBase64url(bytes: number): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const value of raw) binary += String.fromCharCode(value);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

status.textContent = `Ready on ${location.hostname}. Tap the button to test Apple Passwords directly.`;
button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "Waiting for Apple Passwords…";
  try {
    const response = await startRegistration({ optionsJSON: {
      challenge: randomBase64url(32),
      rp: { id: location.hostname, name: "Sense Studios phone check" },
      user: { id: randomBase64url(16), name: "Phone diagnostic only", displayName: "Phone diagnostic only" },
      pubKeyCredParams: [{ type: "public-key", alg: -8 }, { type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
      excludeCredentials: []
    } });
    status.textContent = `Success: this iPhone created a passkey for ${location.hostname}. It was not added to your app account. Delete the “Phone diagnostic only” passkey in Apple Passwords. Credential ID starts ${response.id.slice(0, 8)}.`;
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = `Failed on iPhone: ${name}: ${message}`;
  } finally {
    button.disabled = false;
  }
});
