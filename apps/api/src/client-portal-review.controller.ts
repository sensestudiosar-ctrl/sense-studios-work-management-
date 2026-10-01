import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { PublicRoute } from "./auth.guard.js";
import { ClientPortalIdentityService } from "./client-portal-identity.service.js";
import { ClientReviewService } from "./client-review.service.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const comment = z.string().trim().max(2000);
const signature = z.string().trim().min(2).max(160);
const annotation = z.object({ page: z.number().int().positive(), x: z.number().min(0).max(1), y: z.number().min(0).max(1), text: z.string().trim().min(1).max(1000) }).strict();
const begin = z.object({ expectedVersion: z.number().int().positive(), reason }).strict();
const commentBody = z.object({ text: z.string().trim().min(1).max(2000), annotations: z.array(annotation).max(100).optional(), referenceId: uuid.optional(), reason }).strict();
const options = z.object({ expectedVersion: z.number().int().positive(), signatureName: signature, consent: z.literal(true), comment }).strict();
const decision = z.object({
  kind: z.enum(["APPROVED", "REVISION_REQUIRED", "REJECTED"]), expectedVersion: z.number().int().positive(), comment, reason,
  signatureName: signature.optional(), consent: z.literal(true).optional(), ceremonyId: uuid.optional(),
  response: z.object({ id: z.string().min(1).max(2048) }).passthrough().optional()
}).strict();
const finalApproval = options.extend({ reason, ceremonyId: uuid, response: z.object({ id: z.string().min(1).max(2048) }).passthrough() }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("client-portal/reviews")
@PublicRoute()
export class ClientPortalReviewController {
  constructor(
    private readonly identity: ClientPortalIdentityService,
    private readonly reviews: ClientReviewService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig
  ) {}

  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }

  private cookie(request: Request) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_client_sid" : "sense_client_sid";
    const pair = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  private async active(request: Request, csrf?: string, mutate = false) {
    if (mutate && request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const session = await this.identity.session(this.cookie(request));
    if (mutate) this.identity.verifyCsrf(session, csrf);
    return session;
  }

  @Get("projects/:projectId")
  async project(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("projectId") projectId: string) {
    this.noStore(response);
    return this.reviews.portalList(await this.active(request), parse(uuid, projectId));
  }

  @Get("items/:itemId")
  async item(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Param("itemId") itemId: string) {
    this.noStore(response);
    return this.reviews.portalDetail(await this.active(request), parse(uuid, itemId));
  }

  @Post("items/:itemId/comments")
  async comment(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("itemId") itemId: string, @Body() body: unknown) {
    this.noStore(response);
    return this.reviews.comment(await this.active(request, csrf, true), parse(uuid, itemId), parse(commentBody, body));
  }

  @Post("items/:itemId/start")
  async start(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("itemId") itemId: string, @Body() body: unknown) {
    this.noStore(response);
    return this.reviews.beginReview(await this.active(request, csrf, true), parse(uuid, itemId), parse(begin, body));
  }

  @Post("items/:itemId/approval-options")
  async approvalOptions(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("itemId") itemId: string, @Body() body: unknown) {
    this.noStore(response);
    return this.reviews.approvalOptions(await this.active(request, csrf, true), parse(uuid, itemId), parse(options, body));
  }

  @Post("items/:itemId/decision")
  async decide(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("itemId") itemId: string, @Body() body: unknown) {
    this.noStore(response);
    const input = parse(decision, body);
    return this.reviews.decide(await this.active(request, csrf, true), parse(uuid, itemId), input as typeof input & { response?: AuthenticationResponseJSON | undefined }, request.ip, request.headers["user-agent"]);
  }

  @Post("packages/:packageId/approval-options")
  async finalOptions(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("packageId") packageId: string, @Body() body: unknown) {
    this.noStore(response);
    return this.reviews.finalOptions(await this.active(request, csrf, true), parse(uuid, packageId), parse(options, body));
  }

  @Post("packages/:packageId/final-approval")
  async finalApprove(@Req() request: Request, @Res({ passthrough: true }) response: Response, @Headers("x-csrf-token") csrf: string | undefined, @Param("packageId") packageId: string, @Body() body: unknown) {
    this.noStore(response);
    const input = parse(finalApproval, body);
    return this.reviews.finalApprove(await this.active(request, csrf, true), parse(uuid, packageId), input as typeof input & { response: AuthenticationResponseJSON }, request.ip, request.headers["user-agent"]);
  }
}
