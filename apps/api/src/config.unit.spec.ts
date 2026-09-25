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
});
