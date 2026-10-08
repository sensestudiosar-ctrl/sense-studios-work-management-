const reservedDatabases = new Set(["postgres", "template0", "template1"]);
const invalidTarget = "Migration datasource must identify an explicit non-administrative PostgreSQL database";

/** Administrative connections are provisioning inputs, never application migration targets. */
export function migrationDatasource(environment: { MIGRATION_DATABASE_URL?: string; DATABASE_URL?: string }): string {
  const target = environment.MIGRATION_DATABASE_URL ?? environment.DATABASE_URL ?? "";
  // Prisma client generation does not require a configured database connection.
  if (target === "") return target;
  try {
    const url = new URL(target);
    if (!["postgresql:", "postgres:"].includes(url.protocol) || !url.hostname) throw new Error(invalidTarget);
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!database || database.includes("/") || database.includes("\0") || reservedDatabases.has(database.toLowerCase()) || url.searchParams.has("database") || url.searchParams.has("dbname")) throw new Error(invalidTarget);
  } catch {
    // Never include the datasource or parser errors, which may contain credentials.
    throw new Error(invalidTarget);
  }
  return target;
}
