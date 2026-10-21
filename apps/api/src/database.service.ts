import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { assertReleaseDatabase, assertReleaseMigrations, type ReleaseIdentity } from "./release-info.js";

export const DATABASE_PROBE = Symbol("DATABASE_PROBE");

export interface DatabaseProbe {
  check(): Promise<void>;
  checkRelease?(release: ReleaseIdentity): Promise<void>;
}

@Injectable()
export class DatabaseService implements DatabaseProbe, OnModuleDestroy {
  private readonly client: PrismaClient;

  get prisma(): PrismaClient {
    return this.client;
  }

  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    this.client = new PrismaClient({
      // The adapter serializes DateTime without an offset and normalizes returned
      // timestamptz values as UTC. Set every connection's timezone explicitly.
      adapter: new PrismaPg({ connectionString: config.databaseUrl, options: "-c timezone=UTC", max: config.databasePoolMax ?? 10, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000 })
    });
  }

  async check(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }

  async checkRelease(release: ReleaseIdentity): Promise<void> {
    const [identity] = await this.client.$queryRaw<Array<ReleaseIdentity["database"]>>`SELECT current_database() AS name, current_user AS "user", host(inet_server_addr()) AS host, inet_server_port() AS port,
      (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid, (SELECT system_identifier::text FROM pg_control_system()) AS system`;
    assertReleaseDatabase(release, identity);
    const rows = await this.client.$queryRaw<Array<{ name: string; checksum: string; finishedAt: Date | null; rolledBackAt: Date | null }>>`
      SELECT migration_name AS name, checksum, finished_at AS "finishedAt", rolled_back_at AS "rolledBackAt" FROM _prisma_migrations`;
    assertReleaseMigrations(release, rows);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
