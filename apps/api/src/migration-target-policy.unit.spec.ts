import { migrationDatasource } from "./migration-target-policy.js";

describe("application migration datasource boundary", () => {
  it("uses the privileged named target without restricting production names", () => {
    const target = "postgresql://migrator:private-password@db.internal:5432/sense_production?schema=public&sslmode=require";
    expect(migrationDatasource({ MIGRATION_DATABASE_URL: target, DATABASE_URL: "postgresql://runtime@db.internal/postgres" })).toBe(target);
  });
  it("uses the named runtime fallback and permits absent configuration for generation", () => {
    const target = "postgres://runtime@localhost/sense_test";
    expect(migrationDatasource({ DATABASE_URL: target })).toBe(target);
    expect(migrationDatasource({})).toBe("");
    expect(migrationDatasource({ MIGRATION_DATABASE_URL: "", DATABASE_URL: target })).toBe("");
  });
  it.each(["postgres", "template0", "template1", "%70ostgres", "POSTGRES", "template%31"])("rejects administrative database %s before connection", (name) => {
    expect(() => migrationDatasource({ DATABASE_URL: `postgresql://admin:private-password@localhost:1/${name}` })).toThrow("explicit non-administrative PostgreSQL database");
  });
  it("does not fall back when the privileged target is unsafe", () => {
    expect(() => migrationDatasource({ MIGRATION_DATABASE_URL: "postgresql://admin@localhost/postgres", DATABASE_URL: "postgresql://runtime@localhost/sense_test" })).toThrow();
  });
  it.each(["not-a-url", "postgresql://admin@localhost", "postgresql://admin@localhost/", "postgresql://admin@localhost/%ZZ", "https://localhost/sense", "postgresql://admin@localhost/sense?database=postgres", "postgresql://admin@localhost/sense?dbname=template1", "postgresql://admin@localhost/business/extra", "postgresql://admin@localhost/business%2Fextra", "postgresql://admin@localhost/business%00extra"])("rejects an ambiguous/invalid target without exposing credentials", (target) => {
    try { migrationDatasource({ DATABASE_URL: target }); throw new Error("Target unexpectedly accepted"); }
    catch (error) { expect((error as Error).message).toBe("Migration datasource must identify an explicit non-administrative PostgreSQL database"); }
  });
  it("keeps credential-bearing parser input out of the diagnostic", () => {
    const credential = "unique-private-password";
    expect(() => migrationDatasource({ DATABASE_URL: `postgresql://admin:${credential}@localhost/postgres` })).toThrow(/^Migration datasource must identify an explicit non-administrative PostgreSQL database$/);
  });
});
