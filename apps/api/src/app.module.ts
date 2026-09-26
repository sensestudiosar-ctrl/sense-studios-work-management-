import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { loadRuntimeConfig, RUNTIME_CONFIG } from "./config.js";
import { DATABASE_PROBE, DatabaseService } from "./database.service.js";
import { HealthController } from "./health.controller.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityService } from "./identity.service.js";
import { AuthGuard } from "./auth.guard.js";

@Module({
  controllers: [HealthController, IdentityController],
  providers: [
    { provide: RUNTIME_CONFIG, useFactory: loadRuntimeConfig },
    DatabaseService,
    { provide: DATABASE_PROBE, useExisting: DatabaseService },
    IdentityService,
    { provide: APP_GUARD, useClass: AuthGuard }
  ]
})
export class AppModule {}
