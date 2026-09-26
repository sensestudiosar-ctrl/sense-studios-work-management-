import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";

export const DATABASE_PROBE = Symbol("DATABASE_PROBE");

export interface DatabaseProbe {
  check(): Promise<void>;
}

@Injectable()
export class DatabaseService implements DatabaseProbe, OnModuleDestroy {
  private readonly client: PrismaClient;

  get prisma(): PrismaClient {
    return this.client;
  }

  constructor(@Inject(RUNTIME_CONFIG) config: RuntimeConfig) {
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: config.databaseUrl })
    });
  }

  async check(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
