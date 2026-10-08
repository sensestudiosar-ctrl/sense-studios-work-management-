import { config as loadDotEnv } from "dotenv";

loadDotEnv({ quiet: true });
import { defineConfig } from "prisma/config";
import { migrationDatasource } from "./src/migration-target-policy.ts";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Production migrations use a separate, privileged URL. DATABASE_URL remains the API runtime role.
    url: migrationDatasource(process.env)
  }
});
