import { jest } from "@jest/globals";
import { BrevoEmailAdapter, SafeEmailDeliveryError } from "./brevo-email.js";

const config = { apiKey: "test-secret-must-not-leak", senderEmail: "alerts@example.test", senderName: "Sense Alerts" };

describe("BrevoEmailAdapter", () => {
  it("sends only the verified recipient, safe summary and text link; it never reads a provider body", async () => {
    const sendRequest = jest.fn(async () => ({ ok: true, status: 201 }));
    const adapter = new BrevoEmailAdapter(config, sendRequest);
    await adapter.send("verified@example.test", {
      subject: "Workspace update",
      textContent: "A permitted update is available.\nhttps://workspace.example.test/notifications/item-1",
    });
    expect(sendRequest).toHaveBeenCalledWith("https://api.brevo.com/v3/smtp/email", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "api-key": config.apiKey }),
      body: JSON.stringify({
        sender: { email: config.senderEmail, name: config.senderName },
        to: [{ email: "verified@example.test" }],
        subject: "Workspace update",
        textContent: "A permitted update is available.\nhttps://workspace.example.test/notifications/item-1",
      }),
    }));
  });

  it("returns sanitized failure codes without retaining provider response data", async () => {
    const adapter = new BrevoEmailAdapter(config, async () => ({ ok: false, status: 429 }));
    await expect(adapter.send("verified@example.test", { subject: "Hello", textContent: "Safe summary" }))
      .rejects.toMatchObject({ failureCode: "email_provider_rejected", message: "Email delivery failed" });
    const networkAdapter = new BrevoEmailAdapter(config, async () => { throw new Error("secret provider response body"); });
    await expect(networkAdapter.send("verified@example.test", { subject: "Hello", textContent: "Safe summary" }))
      .rejects.toMatchObject({ failureCode: "email_provider_unavailable", message: "Email delivery failed" });
  });

  it("fails closed for missing deployment configuration and invalid addresses", async () => {
    const missingConfig = new BrevoEmailAdapter({ apiKey: undefined, senderEmail: undefined, senderName: undefined }, jest.fn());
    await expect(missingConfig.send("verified@example.test", { subject: "Hello", textContent: "Safe summary" }))
      .rejects.toBeInstanceOf(SafeEmailDeliveryError);
    const configured = new BrevoEmailAdapter(config, jest.fn(async () => ({ ok: true, status: 201 })));
    await expect(configured.send("unverified", { subject: "Hello", textContent: "Safe summary" }))
      .rejects.toMatchObject({ failureCode: "email_invalid_message" });
  });
});
