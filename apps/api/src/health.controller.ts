import { Controller, Get, HttpStatus, Inject, Res } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { LivenessResponse, ReadinessResponse } from "@sense/contracts";
import { DATABASE_PROBE, type DatabaseProbe } from "./database.service.js";
import { PublicRoute } from "./auth.guard.js";
import { publicReleaseIdentity, readReleaseIdentity } from "./release-info.js";

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

  @Get("release")
  @ApiOkResponse({ description: "Non-secret identity of the running API artifact." })
  release(): Record<string, unknown> {
    return publicReleaseIdentity(readReleaseIdentity());
  }

  @Get("ready")
  @ApiOkResponse({ description: "The API and PostgreSQL are ready." })
  @ApiServiceUnavailableResponse({ description: "PostgreSQL is unavailable." })
  async ready(@Res() response: Response): Promise<void> {
    const checkedAt = new Date().toISOString();
    try {
      await this.database.check();
      const release = readReleaseIdentity();
      if (release) {
        if (!this.database.checkRelease) throw new Error("Release migration verification is unavailable");
        await this.database.checkRelease(release);
      }
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
