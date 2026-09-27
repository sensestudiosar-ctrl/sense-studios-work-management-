export interface BrevoConfig {
  apiKey: string | undefined;
  senderEmail: string | undefined;
  senderName: string | undefined;
}

export interface EmailTransportResponse {
  ok: boolean;
  status: number;
}

export type EmailFetch = (url: string, init: RequestInit) => Promise<EmailTransportResponse>;

export interface SafeEmailContent {
  subject: string;
  textContent: string;
}

export class SafeEmailDeliveryError extends Error {
  constructor(readonly failureCode: string) {
    super("Email delivery failed");
  }
}

const fetchEmail: EmailFetch = (url, init) => fetch(url, init);

/** Sends only safe summaries and a caller-provided authenticated internal link; it never reads provider bodies. */
export class BrevoEmailAdapter {
  constructor(private readonly config: BrevoConfig, private readonly sendRequest: EmailFetch = fetchEmail) {}

  async send(verifiedEmail: string, content: SafeEmailContent): Promise<void> {
    if (!this.config.apiKey || !this.config.senderEmail || !this.config.senderName) {
      throw new SafeEmailDeliveryError("email_not_configured");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(verifiedEmail) || content.subject.length > 180 || content.textContent.length > 3000) {
      throw new SafeEmailDeliveryError("email_invalid_message");
    }
    try {
      const response = await this.sendRequest("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.config.apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          sender: { email: this.config.senderEmail, name: this.config.senderName },
          to: [{ email: verifiedEmail }],
          subject: content.subject,
          textContent: content.textContent,
        }),
      });
      if (!response.ok) {
        const family = Math.floor(response.status / 100);
        throw new SafeEmailDeliveryError(family === 4 ? "email_provider_rejected" : "email_provider_unavailable");
      }
    } catch (error) {
      if (error instanceof SafeEmailDeliveryError) throw error;
      throw new SafeEmailDeliveryError("email_provider_unavailable");
    }
  }
}
