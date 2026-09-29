import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountKind, AccountState, EmployeeState, Prisma } from "./generated/prisma/client.js";
import { z } from "zod";
import { AuthorizationService } from "./authorization.service.js";
import { DatabaseService } from "./database.service.js";
import { recordProjectEvent } from "./project-events.js";
import { DEFAULT_DESIGN_PROJECT_STAGES, DEFAULT_TURNKEY_PROJECT_STAGES } from "./project-template-defaults.js";
import { parseTemplateDefinition, type TemplateDefinition } from "./template-definition.js";
import type { ProjectActor } from "./project.service.js";
import { createHash } from "node:crypto";

type Tx = Prisma.TransactionClient;
type TemplateInput = { name: string; definition: TemplateDefinition; reason: string };
const templateNameSchema = z.string().trim().min(2).max(160);
const reasonSchema = z.string().trim().min(3).max(1000);

@Injectable()
export class ProjectTemplateService {
  constructor(private readonly database: DatabaseService, private readonly authorization: AuthorizationService) {}
  private get db() { return this.database.prisma; }

  private async activeActor(tx: Tx, actor: ProjectActor): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "accounts" WHERE "id" = ${actor.accountId}::uuid AND "state" = 'ACTIVE' FOR SHARE`;
    if (!rows[0]) throw new ForbiddenException("Permission denied");
    const account = await tx.account.findUnique({ where: { id: actor.accountId }, include: { employee: true } });
    if (!account || account.kind !== actor.kind || account.state !== AccountState.ACTIVE) throw new ForbiddenException("Permission denied");
    if (account.kind === AccountKind.STAFF && (!account.employee || account.employee.state !== EmployeeState.ACTIVE || account.employee.organizationId !== actor.organizationId)) {
      throw new ForbiddenException("Permission denied");
    }
    const organizationId = account.employee?.organizationId ?? (await tx.organization.findFirst({ select: { id: true } }))?.id;
    if (!organizationId || organizationId !== actor.organizationId) throw new ForbiddenException("Permission denied");
  }

  private async permission(tx: Tx, actor: ProjectActor, key: "template.view" | "template.manage"): Promise<boolean> {
    try {
      await this.authorization.assertPermission(actor.accountId, key, { kind: "ORGANIZATION", organizationId: actor.organizationId }, tx);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }

  async list(actor: ProjectActor) {
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      const canManage = await this.permission(tx, actor, "template.manage");
      const canView = canManage || await this.permission(tx, actor, "template.view");
      if (!canView) throw new ForbiddenException("Permission denied");
      const templates = await tx.projectTemplate.findMany({
        where: { organizationId: actor.organizationId, active: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        include: { versions: { orderBy: [{ number: "asc" }, { id: "asc" }], select: { id: true, number: true, definition: true, createdAt: true } } }
      });
      return {
        templates: templates.map((template) => ({ ...template, versions: template.versions.map((version) => ({ ...version, definition: parseTemplateDefinition(version.definition) })) })),
        canManage,
        defaults: {
          DESIGN: DEFAULT_DESIGN_PROJECT_STAGES.map(({ key, label }) => ({ key, label })),
          TURNKEY: DEFAULT_TURNKEY_PROJECT_STAGES.map(({ key, label }) => ({ key, label }))
        }
      };
    });
  }

  async create(actor: ProjectActor, input: TemplateInput) {
    input = this.validateInput(input, true) as TemplateInput;
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      await this.authorization.assertPermission(actor.accountId, "template.manage", { kind: "ORGANIZATION", organizationId: actor.organizationId }, tx);
      const template = await tx.projectTemplate.create({ data: {
        organizationId: actor.organizationId,
        name: input.name,
        active: true,
        createdById: actor.accountId,
        versions: { create: { number: 1, definition: input.definition as Prisma.InputJsonValue, createdById: actor.accountId, reason: input.reason } }
      }, include: { versions: { orderBy: { number: "asc" } } } });
      const version = template.versions[0];
      if (!version) throw new Error("Template version was not created");
      await recordProjectEvent(tx, {
        organizationId: actor.organizationId, actorId: actor.accountId, eventName: "template.version_created",
        subjectType: "project_template", subjectId: template.id, reason: input.reason,
        after: { templateId: template.id, versionId: version.id, number: version.number, name: template.name, definitionSha256: createHash("sha256").update(JSON.stringify(input.definition)).digest("hex"), stageCount: input.definition.stages.length, milestoneCount: input.definition.milestones.length, folderCount: input.definition.folders.length }
      });
      return { template: { ...template, versions: template.versions.map((entry) => ({ ...entry, definition: input.definition })) } };
    });
  }

  async version(actor: ProjectActor, id: string, input: Pick<TemplateInput, "definition" | "reason">) {
    input = this.validateInput(input, false) as Pick<TemplateInput, "definition" | "reason">;
    return this.db.$transaction(async (tx) => {
      await this.activeActor(tx, actor);
      await this.authorization.assertPermission(actor.accountId, "template.manage", { kind: "ORGANIZATION", organizationId: actor.organizationId }, tx);
      const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "project_templates" WHERE "id" = ${id}::uuid AND "organizationId" = ${actor.organizationId}::uuid AND "active" = true FOR UPDATE`;
      if (!locked[0]) throw new NotFoundException("Project template not found");
      const template = await tx.projectTemplate.findFirst({ where: { id, organizationId: actor.organizationId, active: true }, include: { versions: { orderBy: [{ number: "desc" }, { id: "desc" }], take: 1 } } });
      const latest = template?.versions[0];
      if (!template || !latest) throw new NotFoundException("Project template not found");
      const original = parseTemplateDefinition(latest.definition);
      if (original.deliveryType !== input.definition.deliveryType) throw new ConflictException("Template delivery type cannot change between versions");
      const created = await tx.projectTemplateVersion.create({ data: {
        organizationId: actor.organizationId, templateId: template.id, number: latest.number + 1,
        definition: input.definition as Prisma.InputJsonValue, createdById: actor.accountId, reason: input.reason
      } });
      await recordProjectEvent(tx, {
        organizationId: actor.organizationId, actorId: actor.accountId, eventName: "template.version_created",
        subjectType: "project_template", subjectId: template.id, reason: input.reason,
        before: { templateId: template.id, versionId: latest.id, number: latest.number },
        after: { templateId: template.id, versionId: created.id, number: created.number, name: template.name, definitionSha256: createHash("sha256").update(JSON.stringify(input.definition)).digest("hex"), stageCount: input.definition.stages.length, milestoneCount: input.definition.milestones.length, folderCount: input.definition.folders.length }
      });
      return { template: { id: template.id, name: template.name, active: template.active }, version: { ...created, definition: input.definition } };
    });
  }

  private validateInput(input: Pick<TemplateInput, "definition" | "reason"> & Partial<Pick<TemplateInput, "name">>, requireName: boolean) {
    return {
      ...(requireName ? { name: templateNameSchema.parse(input.name) } : {}),
      definition: parseTemplateDefinition(input.definition),
      reason: reasonSchema.parse(input.reason)
    };
  }
}
