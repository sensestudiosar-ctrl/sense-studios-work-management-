import { Controller, Get, HttpStatus, Inject, Res } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { LivenessResponse, ReadinessResponse } from "@sense/contracts";
import { DATABASE_PROBE, type DatabaseProbe } from "./database.service.js";
import { PublicRoute } from "./auth.guard.js";

@ApiTags("health")
@PublicRoute()
@Controller("health")
export class HealthController {
  constructor(@Inject(DATABASE_PROBE) private readonly database: DatabaseProbe) {}

  @Get("live")
  @ApiOkResponse({ description: "The API process can serve requests." })
  live(): LivenessResponse {
    return { status: "alive", service: "api", checkedAt: new Date().toISOString() };
  }

  @Get("ready")
  @ApiOkResponse({ description: "The API and PostgreSQL are ready." })
  @ApiServiceUnavailableResponse({ description: "PostgreSQL is unavailable." })
  async ready(@Res() response: Response): Promise<void> {
    const checkedAt = new Date().toISOString();
    try {
      await this.database.check();
      const body: ReadinessResponse = {
        status: "ready",
        service: "api",
        dependencies: { database: "ready" },
        checkedAt
      };
      response.status(HttpStatus.OK).json(body);
    } catch {
      const body: ReadinessResponse = {
        status: "unavailable",
        service: "api",
        dependencies: { database: "unavailable" },
        checkedAt
      };
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json(body);
    }
  }
}
