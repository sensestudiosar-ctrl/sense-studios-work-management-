import { readFileSync, realpathSync } from "node:fs";
import { dirname, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const suiteKeys = new Set(["DATABASE_URL", "S12_DATABASE_URL", "S13_DATABASE_URL", "S14_DATABASE_URL", "S15_DATABASE_URL", "S16_DATABASE_URL", "S17_DATABASE_URL", "S18_DATABASE_URL", "S19_DATABASE_URL", "S20_DATABASE_URL", "S21_DATABASE_URL", "S22_DATABASE_URL", "S23_DATABASE_URL", "S24_DATABASE_URL", "S24_SECURITY_DATABASE_URL", "S25_DATABASE_URL", "S25_SECURITY_DATABASE_URL", "S26_DATABASE_URL", "S26_SECURITY_DATABASE_URL", "S27_DATABASE_URL", "S27_SECURITY_DATABASE_URL"]);

/** Test-only alternative to legacy guards; never grants application authority. */
export function isS27DisposableTestTarget(key: string, connectionString: string | undefined, environment: NodeJS.ProcessEnv = process.env): boolean {
  try {
    if (environment.NODE_ENV !== "test" || environment.S27_E2E_ENABLED !== "1" || !suiteKeys.has(key) || !connectionString || environment[key] !== connectionString) return false;
    const manifest = environment.S27_TEST_ENV_FILE;
    if (!manifest) return false;
    const root = realpathSync(resolve(workspace, ".env.s27-tools"));
    const path = realpathSync(resolve(workspace, manifest));
    const inside = relative(root, path);
    if (!inside || inside.startsWith("..") || isAbsolute(inside) || !/^s27-fresh-[0-9]+_[a-f0-9]+\.test$/.test(inside)) return false;
    const entries = new Map<string, string>();
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = /^([^#=\s]+)=(.*)$/.exec(line);
      if (!match) continue;
      if (entries.has(match[1]!)) return false;
      entries.set(match[1]!, match[2]!.trim().replace(/^"|"$/g, ""));
    }
    if (entries.get("NODE_ENV") !== "test" || entries.get("S27_E2E_ENABLED") !== "1" || entries.get(key) !== connectionString) return false;
    const suffix = /^s27-fresh-([0-9]+_[a-f0-9]+)\.test$/.exec(inside)![1]!;
    const url = new URL(connectionString);
    const id = key === "DATABASE_URL" ? "sense_s27_main" : `sense_s${/^S([0-9]+)/.exec(key)![1]}${key.includes("_SECURITY_") ? "_security" : ""}`;
    return ["postgres:", "postgresql:"].includes(url.protocol) && ["127.0.0.1", "localhost"].includes(url.hostname) && url.port === (key === "S14_DATABASE_URL" ? "58441" : "58440") && url.pathname === `/${id}_s27_${suffix}_test`;
  } catch { return false; }
}

/** Call after connecting, alongside the suite's existing migration checks. */
export function matchesS27DisposableServer(connectionString: string, database: string, port: number): boolean {
  const url = new URL(connectionString);
  return database === url.pathname.slice(1) && port === Number(url.port);
}
