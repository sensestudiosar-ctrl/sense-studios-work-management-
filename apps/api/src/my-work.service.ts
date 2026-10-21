import { ForbiddenException, HttpException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { MyWorkAttentionQuery, MyWorkAttentionResponse, MyWorkRow, MyWorkSource } from "@sense/contracts";
import { Prisma } from "./generated/prisma/client.js";
import { DatabaseService } from "./database.service.js";
import { TaskService } from "./task.service.js";
import { ReviewService } from "./review.service.js";
import { ApprovalService } from "./approval.service.js";
import type { ProjectActor } from "./project.service.js";
import { withAuthorizationReadTime } from "./authorization-read-context.js";

export function attentionSource(query: MyWorkAttentionQuery): "all" | MyWorkSource {
  return [query.priorities?.length || undefined, query.collaboratorEmployeeIds?.length || undefined, query.status, query.phase, query.type, query.ownerEmployeeId, query.planItemId, query.dateBasis, query.dateFrom, query.dateTo].some(value => value !== undefined) ? "task" : query.source ?? "all";
}
export function deadlineDay(row: MyWorkRow, timezone: string): string {
  if (!row.deadline) return "9999-12-31";
  if (row.deadlineKind !== "decision_expiry") return row.deadline.slice(0, 10);
  const fields = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(row.deadline));
  return ["year", "month", "day"].map(key => fields.find(field => field.type === key)!.value).join("-");
}
export function orderAttention(rows: MyWorkRow[], timezone: string): MyWorkRow[] {
  const rank = (priority?: string) => ["CRITICAL", "HIGH", "MEDIUM", "LOW"].indexOf(priority ?? "") < 0 ? 4 : ["CRITICAL", "HIGH", "MEDIUM", "LOW"].indexOf(priority!);
  return rows.sort((a, b) => deadlineDay(a, timezone).localeCompare(deadlineDay(b, timezone)) || rank(a.priority) - rank(b.priority) || a.source.localeCompare(b.source) || a.sourceId.localeCompare(b.sourceId));
}
@Injectable()
export class MyWorkService {
  constructor(private readonly db: DatabaseService, private readonly tasks: TaskService, private readonly reviews: ReviewService, private readonly approvals: ApprovalService) {}
  async attention(actor: ProjectActor, query: MyWorkAttentionQuery): Promise<MyWorkAttentionResponse> {
    try {
      return await this.db.prisma.$transaction(async tx => {
        // Canonical actor/reviewer/approval reads take FOR SHARE locks. Keep the
        // common snapshot and those guards; PostgreSQL READ ONLY would reject
        // the locks before any source could be projected. No domain write occurs.
        const account = await tx.account.findFirst({ where: { id: actor.accountId, state: "ACTIVE", kind: actor.kind } });
        if (!account) throw new ForbiddenException("Active account required");
        const organization = await tx.organization.findUnique({ where: { id: actor.organizationId }, select: { timezone: true } });
        if (!organization) throw new NotFoundException("Organization unavailable");
        const readAt = new Date(), timezone = organization.timezone, source = attentionSource(query);
        return withAuthorizationReadTime(tx, readAt, async () => {
        const rows: MyWorkRow[] = [];
        const included = (name: MyWorkSource) => source === "all" || source === name;
        const common = (row: MyWorkRow, search = true) => (!query.projectId || row.project?.id === query.projectId) && (!search || !query.q || [row.title, row.project?.title ?? "", row.sourceId].some(value => value.toLocaleLowerCase("en-US").includes(query.q!.toLocaleLowerCase("en-US"))));
        if (included("task")) {
          const result = await this.tasks.actionableInTransaction(tx, actor, readAt, timezone, undefined, { ...(query.priorities ? { priorities: query.priorities } : {}), ...(query.collaboratorEmployeeIds ? { collaboratorEmployeeIds: query.collaboratorEmployeeIds } : {}), ...(query.q ? { q: query.q } : {}) });
          for (const item of result.items) {
            const date = (query.dateBasis === "committed" ? item.committedDueDate : item.deadline)?.toISOString().slice(0, 10);
            if (query.phase === "waiting" && item.status !== "WAITING" || query.phase === "completed" || query.phase === "review" && item.type !== "CORRECTION" && !["SUBMITTED_INTERNAL_REVIEW", "IN_INTERNAL_REVIEW", "CORRECTIONS_REQUIRED", "INTERNAL_APPROVED", "SUBMITTED_CLIENT_REVIEW", "IN_CLIENT_REVIEW", "CLIENT_REVISION_REQUIRED", "CLIENT_APPROVED"].includes(item.status) || query.status && item.status !== query.status || query.type && item.type !== query.type || query.ownerEmployeeId && item.ownerEmployeeId !== query.ownerEmployeeId || query.planItemId && item.planItemId !== query.planItemId || query.dateFrom && (!date || date < query.dateFrom) || query.dateTo && (!date || date > query.dateTo)) continue;
            const row: MyWorkRow = { source: "task", sourceId: item.sourceId, taskId: item.taskId, title: item.title, project: item.project, responsibility: item.responsibility, reason: item.reason, reasons: item.reasons, deadline: item.deadline.toISOString(), deadlineKind: "target_date", priority: item.priority, status: item.status, destination: item.destination, ...(item.isSubtask ? { isSubtask: true } : {}) };
            if (common(row, false)) rows.push(row);
          }
        }
        if (included("review")) {
          const result = await this.reviews.actionableInTransaction(tx, actor, readAt, timezone);
          for (const item of result.items) {
            const row: MyWorkRow = { source: "review", sourceId: item.sourceId, roundId: item.roundId, taskId: item.taskId, title: item.title, project: item.project, responsibility: item.responsibility, reason: item.reason, deadline: item.deadline.toISOString(), deadlineKind: "review_date", destination: item.destination };
            if (common(row)) rows.push(row);
          }
        }
        if (included("approval")) {
          const result = await this.approvals.actionableInTransaction(tx, actor, readAt);
          for (const item of result.items) {
            const row: MyWorkRow = { source: "approval", sourceId: item.sourceId, requestId: item.requestId, title: item.title, responsibility: item.responsibility, reason: item.reason, deadline: item.deadline?.toISOString() ?? null, deadlineKind: "decision_expiry", destination: item.destination };
            if (common(row)) rows.push(row);
          }
        }
        const unique = [...new Map(rows.map(row => [`${row.source}:${row.sourceId}`, row])).values()];
        orderAttention(unique, timezone);
        const counts = (name: MyWorkSource) => included(name) ? { status: "ready" as const, total: unique.filter(row => row.source === name).length } : { status: "excluded" as const };
        return { status: "ready", source, sourceCounts: { task: counts("task"), review: counts("review"), approval: counts("approval") }, items: unique.slice(query.offset, query.offset + query.limit), offset: query.offset, limit: query.limit, totalItems: unique.length, hasMore: query.offset + query.limit < unique.length, readAt: readAt.toISOString(), timezone };
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30_000 });
    } catch (error) {
      if (error instanceof HttpException && [401, 403, 404].includes(error.getStatus())) throw error;
      throw new ServiceUnavailableException("My Work sources are unavailable; no complete page or count was published");
    }
  }
}
