const nativeErrorNames = new Set([
  "AbortError", "ConstraintError", "InvalidStateError", "NotAllowedError", "NotSupportedError", "SecurityError", "TypeError", "UnknownError", "Error",
]);

function nativeName(value: unknown): string | undefined {
  if (!(value instanceof Error) && !(typeof DOMException !== "undefined" && value instanceof DOMException)) return undefined;
  return nativeErrorNames.has(value.name) ? value.name : undefined;
}

function safeCode(value: unknown): string | undefined {
  try {
    if (typeof value !== "object" || value === null || !("code" in value)) return undefined;
    const code = (value as { code?: unknown }).code;
    return typeof code === "string" && /^ERROR_[A-Z0-9_]{1,100}$/.test(code) ? code : undefined;
  } catch {
    return undefined;
  }
}

function safeNativeCause(error: unknown): { name: string; message?: string } | undefined {
  if (!(error instanceof Error) || typeof DOMException === "undefined" || !(error.cause instanceof DOMException)) return undefined;
  const name = nativeName(error.cause);
  if (!name) return undefined;
  let printable = "";
  for (let index = 0; index < error.cause.message.length; index += 1) {
    const code = error.cause.message.charCodeAt(index);
    if (code <= 31 || (code >= 127 && code <= 159)) {
      printable += " ";
      continue;
    }
    printable += error.cause.message[index];
  }
  const message = printable.replace(/\s+/g, " ").trim().slice(0, 200);
  return { name, ...(message ? { message } : {}) };
}

export function passkeyRegistrationError(
  error: unknown,
  { diagnostics, browserSupported }: { diagnostics: boolean; browserSupported: boolean },
): string {
  const code = safeCode(error);
  const name = error instanceof Error ? nativeName(error) ?? "UnknownError" : "UnknownError";
  const cause = diagnostics ? safeNativeCause(error) : undefined;
  const detail = diagnostics
    ? ` (browser detail: ${name}${code ? ` / ${code}` : ""}${cause ? `; cause: ${cause.name}${cause.message ? `: ${cause.message}` : ""}` : ""})`
    : "";
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") return `That passkey is already registered. Choose a different passkey method, such as your phone or a security key.${detail}`;
  if (["NotAllowedError", "AbortError"].includes(name)) return `The passkey request was cancelled or declined by the browser. You can try again when ready.${detail}`;
  if (!browserSupported || ["NotSupportedError", "SecurityError"].includes(name)) return `This browser does not support passkeys. Open this page in a supported browser or device.${detail}`;
  return `The browser could not create another passkey with that method. Choose a different device or security key and try again.${detail}`;
}
