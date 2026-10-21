import { BadRequestException, Controller, ForbiddenException, Get, Inject, Param, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { IdentityService } from "./identity.service.js";
import { ApprovalService } from "./approval.service.js";

@Controller("approvals")
export class ApprovalsController {
  constructor(private readonly identity: IdentityService, private readonly approvals: ApprovalService, @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig) {}

  private cookie(request: Request): string | undefined {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const pair = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  @Get("actionable")
  async actionable(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("offset") offset?: string, @Query("limit") limit?: string) {
    const active = await this.identity.session(this.cookie(request));
    if (active.row.account.kind === "OWNER" && !(await this.identity.ownerReady(active.row.accountId))) throw new ForbiddenException("Owner identity setup is required");
    const parsed = z.object({ offset: z.coerce.number().int().min(0).max(1000000).default(0), limit: z.coerce.number().int().min(1).max(100).default(25) }).safeParse({ offset, limit });
    if (!parsed.success) throw new BadRequestException("Invalid queue pagination");
    response.setHeader("Cache-Control", "no-store");
    return this.approvals.actionable(active.row.accountId, parsed.data.offset, parsed.data.limit);
  }

  @Get("attention")
  async attention(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    const active = await this.identity.session(this.cookie(request));
    if (active.row.account.kind === "OWNER" && !(await this.identity.ownerReady(active.row.accountId))) throw new ForbiddenException("Owner identity setup is required");
    const parsedLimit = limit === undefined ? { success: true as const, data: 25 } : z.coerce.number().int().min(1).max(100).safeParse(limit);
    if (!parsedLimit.success) throw new BadRequestException("Invalid queue pagination");
    const value = parsedLimit.data;
    if (cursor !== undefined && (cursor.length > 512 || cursor.length < 1)) throw new BadRequestException("Invalid queue cursor");
    response.setHeader("Cache-Control", "no-store");
    return this.approvals.attention(active.row.accountId, value, cursor);
  }

  @Get("attention/:requestId")
  async attentionItem(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("requestId") requestId?: string) {
    const active = await this.identity.session(this.cookie(request));
    if (active.row.account.kind === "OWNER" && !(await this.identity.ownerReady(active.row.accountId))) throw new ForbiddenException("Owner identity setup is required");
    const parsed = z.string().uuid().safeParse(requestId);
    if (!parsed.success) throw new BadRequestException("Invalid approval reference");
    response.setHeader("Cache-Control", "no-store");
    return this.approvals.attentionItem(active.row.accountId, parsed.data);
  }
}
