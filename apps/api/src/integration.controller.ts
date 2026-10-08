import { BadRequestException, Body, Controller, ForbiddenException, Get, Headers, Inject, NotFoundException, Param, Post, Put, Delete, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import { PublicRoute } from "./auth.guard.js";
import { IdentityService } from "./identity.service.js";
import { IntegrationService } from "./integration.service.js";
import { serializeCalendar } from "./integration-calendar.js";
import { parseWebsiteEnquiry } from "./integration-webhook.js";

const uuid = z.uuid();
const reason = z.string().trim().min(3).max(1000);
const command = z.object({ commandId: uuid, reason }).strict();
const eventCreate = command.extend({ kind: z.enum(["MEETING", "SITE_VISIT"]), projectId: uuid.optional(), startAt: z.iso.datetime({ offset: true }), endAt: z.iso.datetime({ offset: true }) }).strict();
const eventUpdate = command.extend({ expectedVersion: z.number().int().positive(), startAt: z.iso.datetime({ offset: true }), endAt: z.iso.datetime({ offset: true }) }).strict();
const eventCancel = command.extend({ expectedVersion: z.number().int().positive() }).strict();
const connectorCreate = command.extend({ label: z.string().trim().min(1).max(160), branchId: uuid, sourceId: uuid, actorId: uuid }).strict();
const connectorVersion = command.extend({ expectedVersion: z.number().int().positive() }).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException("Invalid request");
  return result.data;
}

@Controller("integrations")
export class IntegrationController {
  constructor(
    private readonly identity: IdentityService,
    private readonly integrations: IntegrationService,
    @Inject(RUNTIME_CONFIG) private readonly config: RuntimeConfig,
  ) {}

  private noStore(response: Response) { response.setHeader("Cache-Control", "no-store"); }

  private cookie(request: Request) {
    const name = this.config.webOrigin.startsWith("https:") ? "__Host-sense_sid" : "sense_sid";
    const pair = request.headers.cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
    return pair?.slice(name.length + 1);
  }

  private async actor(request: Request) {
    const active = await this.identity.session(this.cookie(request));
    const actor = await this.integrations.actor(active.row.accountId, active.row.id);
    if (actor.kind === "OWNER" && !(await this.identity.ownerReady(actor.accountId))) throw new ForbiddenException("Owner identity setup is required");
    return { active, actor };
  }

  private async mutate(request: Request, csrf?: string) {
    if (request.headers.origin !== this.config.webOrigin) throw new ForbiddenException("Request origin is not allowed");
    const result = await this.actor(request);
    this.identity.verifyCsrf(result.active, csrf);
    return result.actor;
  }

  private calendarResponse(response: Response, events: Parameters<typeof serializeCalendar>[0], download: boolean) {
    this.noStore(response);
    response.status(200).setHeader("Content-Type", "text/calendar; charset=utf-8");
    if (download) response.setHeader("Content-Disposition", 'attachment; filename="sense-calendar.ics"');
    return response.send(serializeCalendar(events));
  }

  @Get("setup")
  async setup(@Req() request: Request, @Res() response: Response) {
    this.noStore(response);
    const { actor } = await this.actor(request);
    return response.json(await this.integrations.setup(actor));
  }

  @Get("calendar")
  async calendar(@Req() request: Request, @Res() response: Response) {
    this.noStore(response);
    const { actor } = await this.actor(request);
    return response.json(await this.integrations.calendar(actor));
  }

  @Get("calendar.ics")
  async calendarFile(@Req() request: Request, @Res() response: Response) {
    const { actor } = await this.actor(request);
    const result = await this.integrations.calendar(actor);
    return this.calendarResponse(response, result.events, true);
  }

  @Post("calendar/subscription")
  async createSubscription(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown, @Res() response: Response) {
    this.noStore(response);
    const actor = await this.mutate(request, csrf);
    return response.status(201).json(await this.integrations.subscription(actor, parse(command, body)));
  }

  @Delete("calendar/subscription")
  async revokeSubscription(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown, @Res() response: Response) {
    this.noStore(response);
    const actor = await this.mutate(request, csrf);
    return response.json(await this.integrations.revokeSubscription(actor, parse(command, body)));
  }

  @PublicRoute()
  @Get("calendar/subscriptions/:token.ics")
  async publicCalendar(@Param("token") token: string, @Res() response: Response) {
    this.noStore(response);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new NotFoundException("Calendar subscription not found");
    try {
      const result = await this.integrations.subscriptionCalendar(token);
      return this.calendarResponse(response, result.events, false);
    } catch (error) {
      this.noStore(response);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw new NotFoundException("Calendar subscription not found");
      throw error;
    }
  }

  @Post("calendar/events")
  async createEvent(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown, @Res() response: Response) {
    this.noStore(response);
    const actor = await this.mutate(request, csrf);
    const input = parse(eventCreate, body);
    if (Date.parse(input.endAt) <= Date.parse(input.startAt)) throw new BadRequestException("Calendar event end must follow its start");
    const { projectId, ...fields } = input;
    return response.status(201).json(await this.integrations.createEvent(actor, { ...fields, ...(projectId ? { projectId } : {}) }));
  }

  @Put("calendar/events/:id")
  async updateEvent(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown, @Res() response: Response) {
    this.noStore(response);
    const actor = await this.mutate(request, csrf);
    const eventId = parse(uuid, id);
    const input = parse(eventUpdate, body);
    if (Date.parse(input.endAt) <= Date.parse(input.startAt)) throw new BadRequestException("Calendar event end must follow its start");
    return response.json(await this.integrations.updateEvent(actor, eventId, input));
  }

  @Post("calendar/events/:id/cancel")
  async cancelEvent(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown, @Res() response: Response) {
    this.noStore(response);
    const actor = await this.mutate(request, csrf);
    return response.json(await this.integrations.cancelEvent(actor, parse(uuid, id), parse(eventCancel, body)));
  }

  @Post("website-connectors")
  async createWebsiteConnector(@Req() request: Request, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown, @Res() response: Response) {
    this.noStore(response);
    const actor = await this.mutate(request, csrf);
    return response.status(201).json(await this.integrations.createConnector(actor, parse(connectorCreate, body)));
  }

  @Post("website-connectors/:id/rotate")
  async rotateWebsiteConnector(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown, @Res() response: Response) {
    this.noStore(response);
    const actor = await this.mutate(request, csrf);
    return response.status(201).json(await this.integrations.rotateConnector(actor, parse(uuid, id), parse(connectorVersion, body)));
  }

  @Post("website-connectors/:id/disable")
  async disableWebsiteConnector(@Req() request: Request, @Param("id") id: string, @Headers("x-csrf-token") csrf: string | undefined, @Body() body: unknown, @Res() response: Response) {
    this.noStore(response);
    const actor = await this.mutate(request, csrf);
    return response.json(await this.integrations.disableConnector(actor, parse(uuid, id), parse(connectorVersion, body)));
  }

  @PublicRoute()
  @Post("website-enquiries/:id")
  async websiteEnquiry(
    @Param("id") id: string,
    @Headers("x-sense-timestamp") timestamp: string | undefined,
    @Headers("x-sense-signature") signature: string | undefined,
    @Body() body: unknown,
    @Res() response: Response,
  ) {
    this.noStore(response);
    let connectorId: string;
    try { connectorId = parse(uuid, id); }
    catch { throw new NotFoundException("Website endpoint unavailable"); }
    const enquiry = parseWebsiteEnquiry(body);
    try {
      const result = await this.integrations.ingestEnquiry(connectorId, timestamp ?? "", signature ?? "", enquiry);
      return response.status(201).json(result);
    } catch (error) {
      this.noStore(response);
      if (error instanceof ForbiddenException || error instanceof NotFoundException) throw new NotFoundException("Website endpoint unavailable");
      throw error;
    }
  }
}
