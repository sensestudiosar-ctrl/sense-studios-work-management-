import { Module } from "@nestjs/common";
import { loadRuntimeConfig, RUNTIME_CONFIG } from "./config.js";
import { DATABASE_PROBE, DatabaseService } from "./database.service.js";
import { HealthController } from "./health.controller.js";

@Module({
  controllers: [HealthController],
  providers: [
    { provide: RUNTIME_CONFIG, useFactory: loadRuntimeConfig },
    DatabaseService,
    { provide: DATABASE_PROBE, useExisting: DatabaseService }
  ]
})
export class AppModule {}
