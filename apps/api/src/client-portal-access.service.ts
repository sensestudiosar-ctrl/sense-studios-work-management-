import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, Prisma, ProjectStatus } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { recordProjectEvent } from "./project-events.js";
import type { ProjectActor } from "./project.service.js";

type Tx = Prisma.TransactionClient;
type Grant = NonNullable<Awaited<ReturnType<Tx["clientPortalGrant"]["findUnique"]>>>;
const snapshot = (grant: Grant) => ({ primary: grant.primary, expiresAt: grant.expiresAt?.toISOString() ?? null, revokedAt: grant.revokedAt?.toISOString() ?? null });

/** Owner setup and revocation. Client item permissions are owned by the later review slice. */
@Injectable()
export class ClientPortalAccessService {
  constructor(private readonly database: DatabaseService) {}

  async list(actor: ProjectActor, projectId: string) {
    return this.database.prisma.$transaction(async (tx) => {
      const project = await this.ownerProject(tx, actor, projectId);
      const grants = await tx.clientPortalGrant.findMany({ where: { projectId, organizationId: actor.organizationId }, orderBy: { createdAt: "asc" } });
      const items = [];
      for (const grant of grants) {
        const account = await tx.account.findUniqueOrThrow({ where: { id: grant.accountId }, select: { normalizedEmail: true } });
        items.push({ ...grant, email: account.normalizedEmail });
      }
      return { projectVersion: project.version, grants: items };
    });
  }

  private async ownerProject(tx: Tx, actor: ProjectActor, projectId: string) {
    if (actor.kind !== AccountKind.OWNER) throw new ForbiddenException("Owner access is required");
    await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id"=${projectId}::uuid AND "organizationId"=${actor.organizationId}::uuid FOR UPDATE`;
    const project = await tx.project.findFirst({ where: { id: projectId, organizationId: actor.organizationId } });
    if (!project) throw new NotFoundException("Project not found");
    await tx.$queryRaw`SELECT "id" FROM "accounts" WHERE "id"=${actor.accountId}::uuid FOR SHARE`;
    const account = await tx.account.findUnique({ where: { id: actor.accountId } });
    if (!account || account.kind !== AccountKind.OWNER || account.state !== AccountState.ACTIVE) throw new ForbiddenException("Owner access is required");
    return project;
  }

  private async evidence(tx: Tx, actor: ProjectActor, grant: Grant, before: Record<string, unknown>, reason: string) {
    const after = snapshot(grant);
    const eventId = await recordProjectEvent(tx, {
      organizationId: actor.organizationId, actorId: actor.accountId, eventName: "client.access_changed",
      subjectType: "client_access", subjectId: grant.id, reason,
      before: { access: before },
      after: { projectId: grant.projectId, accountId: grant.accountId, version: grant.version, access: after }
    });
    const event = await tx.domainEvent.findUniqueOrThrow({ where: { id: eventId } });
    const auditEventId = (event.payload as { auditEventId: string }).auditEventId;
    await tx.clientPortalGrantChange.create({ data: {
      organizationId: actor.organizationId, projectId: grant.projectId, grantId: grant.id,
      grantVersion: grant.version, actorId: actor.accountId, reason, auditEventId,
      before: before as Prisma.InputJsonValue, after
    } });
  }

  async setPrimary(actor: ProjectActor, projectId: string, input: { email: string; expectedProjectVersion: number; expectedPrimaryGrantId: string | null; expectedPrimaryGrantVersion?: number | undefined; reason: string }) {
    return this.database.prisma.$transaction(async (tx) => {
      const project = await this.ownerProject(tx, actor, projectId);
      if (project.version !== input.expectedProjectVersion) throw new ConflictException("Project changed. Refresh and retry");
      if (![ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD].includes(project.status as "DRAFT" | "ACTIVE" | "ON_HOLD")) throw new ConflictException("Closed projects cannot appoint client users");
      const prior = await tx.clientPortalGrant.findFirst({ where: { projectId, primary: true, revokedAt: null } });
      if ((prior?.id ?? null) !== input.expectedPrimaryGrantId || prior && prior.version !== input.expectedPrimaryGrantVersion) throw new ConflictException("Primary Client changed. Refresh and retry");
      const normalizedEmail = input.email.trim().toLowerCase();
      const account = await tx.account.upsert({ where: { normalizedEmail }, create: { normalizedEmail, kind: AccountKind.CLIENT, state: AccountState.ACTIVE }, update: {} });
      if (account.kind !== AccountKind.CLIENT || account.state !== AccountState.ACTIVE) throw new ConflictException("This email cannot be used as a client identity");
      if (prior?.accountId === account.id) throw new ConflictException("This account is already the Primary Client");
      if (prior) {
        const demoted = await tx.clientPortalGrant.update({ where: { id: prior.id }, data: { primary: false, version: { increment: 1 } } });
        await this.evidence(tx, actor, demoted, snapshot(prior), input.reason);
      }
      const existing = await tx.clientPortalGrant.findUnique({ where: { projectId_accountId: { projectId, accountId: account.id } } });
      const grant = existing
        ? await tx.clientPortalGrant.update({ where: { id: existing.id }, data: { primary: true, revokedAt: null, expiresAt: null, version: { increment: 1 } } })
        : await tx.clientPortalGrant.create({ data: { organizationId: actor.organizationId, projectId, accountId: account.id, primary: true, invitedById: actor.accountId, reason: input.reason } });
      await this.evidence(tx, actor, grant, existing ? snapshot(existing) : {}, input.reason);
      return { grant, email: account.normalizedEmail };
    }, { timeout: 30_000 });
  }

  async changeAccess(actor: ProjectActor, grantId: string, input: { expectedVersion: number; reason: string; expiresAt?: string; revoke?: true }) {
    return this.database.prisma.$transaction(async (tx) => {
      const known = await tx.clientPortalGrant.findFirst({ where: { id: grantId, organizationId: actor.organizationId } });
      if (!known) throw new NotFoundException("Client access not found");
      await this.ownerProject(tx, actor, known.projectId);
      const prior = await tx.clientPortalGrant.findUniqueOrThrow({ where: { id: grantId } });
      if (prior.version !== input.expectedVersion || prior.revokedAt) throw new ConflictException("Client access changed. Refresh and retry");
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : prior.expiresAt;
      if (!input.revoke && (!expiresAt || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) throw new ConflictException("A future access end time is required");
      const updated = await tx.clientPortalGrant.update({ where: { id: grantId }, data: { ...(input.revoke ? { revokedAt: new Date() } : { expiresAt }), version: { increment: 1 } } });
      await this.evidence(tx, actor, updated, snapshot(prior), input.reason);
      // Other project grants remain usable; request-time authorization ends this grant immediately.
      if (input.revoke && await tx.clientPortalGrant.count({ where: { accountId: prior.accountId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }) === 0) {
        await tx.clientPortalSession.updateMany({ where: { accountId: prior.accountId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return updated;
    }, { timeout: 30_000 });
  }
}
