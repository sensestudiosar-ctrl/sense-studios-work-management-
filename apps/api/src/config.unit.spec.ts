import { parseRuntimeConfig } from "./config.js";

const valid = {
  DATABASE_URL: "postgresql://local:secret@localhost:5432/s01_test"
};

describe("runtime configuration", () => {
  it("requires a PostgreSQL URL without echoing credentials", () => {
    expect(() => parseRuntimeConfig({})).toThrow("Invalid configuration: DATABASE_URL");
    expect(() => parseRuntimeConfig({ DATABASE_URL: "https://secret.example/db" })).toThrow(
      "Invalid configuration: DATABASE_URL"
    );
  });

  it("uses bounded defaults and accepts explicit staging settings", () => {
    expect(parseRuntimeConfig(valid)).toMatchObject({
      nodeEnv: "development",
      port: 4000,
      webOrigin: "http://localhost:5173"
    });
    expect(parseRuntimeConfig({ ...valid, NODE_ENV: "staging", PORT: "4400" }).port).toBe(4400);
    expect(() => parseRuntimeConfig({ ...valid, PORT: "70000" })).toThrow("Invalid configuration: PORT");
  });

  it("requires HTTPS in production and a complete one-time Owner bootstrap configuration", () => {
    expect(() => parseRuntimeConfig({ ...valid, NODE_ENV: "production", WEB_ORIGIN: "http://example.test" })).toThrow("Invalid configuration: WEB_ORIGIN");
    expect(() => parseRuntimeConfig({ ...valid, OWNER_BOOTSTRAP_EMAIL: "owner@example.test" })).toThrow("Invalid configuration: OWNER_BOOTSTRAP_EMAIL");
    expect(parseRuntimeConfig({ ...valid, WEB_ORIGIN: "https://example.test/", OWNER_BOOTSTRAP_EMAIL: "Owner@Example.test", OWNER_BOOTSTRAP_SECRET: "x".repeat(32) })).toMatchObject({
      webOrigin: "https://example.test",
      ownerBootstrapEmail: "owner@example.test"
    });
  });

  it("accepts no email provider settings or one complete Brevo configuration", () => {
    expect(parseRuntimeConfig(valid).brevoApiKey).toBeUndefined();
    expect(() => parseRuntimeConfig({ ...valid, BREVO_API_KEY: "secret" })).toThrow("Invalid configuration: BREVO_API_KEY");
    expect(parseRuntimeConfig({
      ...valid,
      BREVO_API_KEY: "private-provider-key",
      BREVO_SENDER_EMAIL: "notifications@example.test",
      BREVO_SENDER_NAME: "Sense Studios",
      EMAIL_VERIFICATION_SECRET: "verification-hmac-secret-0123456789abcdef"
    })).toMatchObject({ brevoSenderEmail: "notifications@example.test", brevoSenderName: "Sense Studios" });
    expect(() => parseRuntimeConfig({ ...valid, BREVO_API_KEY: "x", BREVO_SENDER_EMAIL: "notifications@example.test", BREVO_SENDER_NAME: "Sense Studios" }))
      .toThrow("Invalid configuration: EMAIL_VERIFICATION_SECRET");
  });
});
