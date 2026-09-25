import { config as loadDotEnv } from "dotenv";

loadDotEnv({ quiet: true });
import { z } from "zod";

const environment = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "postgresql:" || protocol === "postgres:";
  }, "must be a PostgreSQL URL"),
  WEB_ORIGIN: z.url().default("http://localhost:5173")
});

export interface RuntimeConfig {
  nodeEnv: "development" | "test" | "staging" | "production";
  port: number;
  databaseUrl: string;
  webOrigin: string;
}

export const RUNTIME_CONFIG = Symbol("RUNTIME_CONFIG");

export function parseRuntimeConfig(input: NodeJS.ProcessEnv): RuntimeConfig {
  const result = environment.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".") || "environment"))];
    throw new Error(`Invalid configuration: ${fields.join(", ")}`);
  }
  return {
    nodeEnv: result.data.NODE_ENV,
    port: result.data.PORT,
    databaseUrl: result.data.DATABASE_URL,
    webOrigin: result.data.WEB_ORIGIN
  };
}

export function loadRuntimeConfig(): RuntimeConfig {
  return parseRuntimeConfig(process.env);
}
