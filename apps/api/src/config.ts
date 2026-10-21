import { config as loadDotEnv } from "dotenv";

loadDotEnv({ quiet: true });
import { z } from "zod";
import { isAbsolute } from "node:path";

const environment = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_LISTEN_HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("0.0.0.0"),
  DATABASE_URL: z.url().refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "postgresql:" || protocol === "postgres:";
  }, "must be a PostgreSQL URL"),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(1).default(0),
  WORKER_HEALTH_PATH: z.preprocess((value) => value === "" ? undefined : value, z.string().refine(isAbsolute, "must be absolute").optional()),
  OWNER_BOOTSTRAP_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.email().optional()),
  OWNER_BOOTSTRAP_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).optional()),
  BREVO_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).max(512).optional()),
  BREVO_SENDER_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.email().max(320).optional()),
  BREVO_SENDER_NAME: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).max(100).optional()),
  EMAIL_VERIFICATION_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).max(512).optional()),
  EXTERNAL_SHARE_SECRET: z.preprocess((value) => value === "" ? undefined : value, z.string().min(32).max(512).optional()),
  NAS_ROOT: z.preprocess((value) => value === "" ? undefined : value, z.string().max(1000).refine(isAbsolute, "must be an absolute path").optional()),
  DOCUMENT_MAX_FILE_BYTES: z.coerce.number().int().min(1).max(1_099_511_627_776).default(20 * 1024 * 1024 * 1024)
}).superRefine((value, context) => {
  if (Boolean(value.OWNER_BOOTSTRAP_EMAIL) !== Boolean(value.OWNER_BOOTSTRAP_SECRET)) {
    context.addIssue({ code: "custom", path: ["OWNER_BOOTSTRAP_EMAIL"], message: "bootstrap email and secret must be configured together" });
  }
  const brevoFields = [value.BREVO_API_KEY, value.BREVO_SENDER_EMAIL, value.BREVO_SENDER_NAME];
  if (brevoFields.some(Boolean) && !brevoFields.every(Boolean)) {
    context.addIssue({ code: "custom", path: ["BREVO_API_KEY"], message: "email sender configuration must be complete" });
  }
  if (brevoFields.some(Boolean) && !value.EMAIL_VERIFICATION_SECRET) {
    context.addIssue({ code: "custom", path: ["EMAIL_VERIFICATION_SECRET"], message: "email verification secret is required when email delivery is configured" });
  }
  if (value.NODE_ENV === "production" && !value.WEB_ORIGIN.startsWith("https://")) {
    context.addIssue({ code: "custom", path: ["WEB_ORIGIN"], message: "production origin must use HTTPS" });
  }
  if (value.NODE_ENV === "production") {
    const origin = URL.canParse(value.WEB_ORIGIN) ? new URL(value.WEB_ORIGIN) : undefined;
    if (origin && (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash)) {
      context.addIssue({ code: "custom", path: ["WEB_ORIGIN"], message: "must be an HTTPS origin without credentials, path or query" });
    }
    if (!value.NAS_ROOT) context.addIssue({ code: "custom", path: ["NAS_ROOT"], message: "production storage must be configured" });
    if (!value.EXTERNAL_SHARE_SECRET) context.addIssue({ code: "custom", path: ["EXTERNAL_SHARE_SECRET"], message: "production share encryption must be configured" });
  }
});

export interface RuntimeConfig {
  nodeEnv: "development" | "test" | "staging" | "production";
  port: number;
  apiListenHost?: "127.0.0.1" | "0.0.0.0";
  databaseUrl: string;
  webOrigin: string;
  ownerBootstrapEmail: string | undefined;
  ownerBootstrapSecret: string | undefined;
  brevoApiKey?: string | undefined;
  brevoSenderEmail?: string | undefined;
  brevoSenderName?: string | undefined;
  emailVerificationSecret?: string | undefined;
  externalShareSecret?: string | undefined;
  nasRoot?: string | undefined;
  documentMaxFileBytes?: number | undefined;
  databasePoolMax?: number | undefined;
  trustProxyHops?: number | undefined;
  workerHealthPath?: string | undefined;
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
    apiListenHost: result.data.API_LISTEN_HOST,
    databaseUrl: result.data.DATABASE_URL,
    webOrigin: new URL(result.data.WEB_ORIGIN).origin,
    ownerBootstrapEmail: result.data.OWNER_BOOTSTRAP_EMAIL?.trim().toLowerCase(),
    ownerBootstrapSecret: result.data.OWNER_BOOTSTRAP_SECRET,
    brevoApiKey: result.data.BREVO_API_KEY,
    brevoSenderEmail: result.data.BREVO_SENDER_EMAIL?.trim().toLowerCase(),
    brevoSenderName: result.data.BREVO_SENDER_NAME?.trim(),
    emailVerificationSecret: result.data.EMAIL_VERIFICATION_SECRET,
    externalShareSecret: result.data.EXTERNAL_SHARE_SECRET,
    nasRoot: result.data.NAS_ROOT,
    documentMaxFileBytes: result.data.DOCUMENT_MAX_FILE_BYTES,
    databasePoolMax: result.data.DATABASE_POOL_MAX,
    trustProxyHops: result.data.TRUST_PROXY_HOPS,
    workerHealthPath: result.data.WORKER_HEALTH_PATH
  };
}

export function loadRuntimeConfig(): RuntimeConfig {
  return parseRuntimeConfig(process.env);
}
