import type { Prisma } from "./generated/prisma/client.js";
import { recordProjectEvent } from "./project-events.js";
export async function pauseTimeTimers(tx: Prisma.TransactionClient, input: { organizationId: string; actorId: string; projectId?: string; employeeId?: string; taskId?: string; reason: string }) {
 const rows = await tx.timeTimer.findMany({ where: { organizationId: input.organizationId, state: "RUNNING", ...(input.projectId ? { projectId: input.projectId } : {}), ...(input.employeeId ? { employeeId: input.employeeId } : {}), ...(input.taskId ? { taskId: input.taskId } : {}) }, orderBy: { id: "asc" } });
 for (const candidate of rows) {
  await tx.$queryRaw`SELECT id FROM time_timers WHERE id=${candidate.id}::uuid FOR UPDATE`;
  const row = await tx.timeTimer.findUniqueOrThrow({ where: { id: candidate.id } }); if (row.state !== "RUNNING") continue;
  const now = new Date(); const elapsedMs = row.elapsedMs + BigInt(row.runningSince ? Math.max(0, now.getTime() - row.runningSince.getTime()) : 0);
  const updated = await tx.timeTimer.update({ where: { id: row.id }, data: { state: "PAUSED", runningSince: null, elapsedMs, version: { increment: 1 } } });
  const eventId = await recordProjectEvent(tx, { organizationId: input.organizationId, actorId: input.actorId, eventName: "time.timer_changed", subjectType: "time_timer", subjectId: row.id, reason: input.reason, before: { state: row.state, version: row.version }, after: { state: "PAUSED", version: updated.version, elapsedMs: Number(elapsedMs), interruption: true } });
  await tx.timeTransition.create({ data: { organizationId: input.organizationId, timerId: row.id, version: updated.version, fromState: "RUNNING", toState: "PAUSED", elapsedMs, actorId: input.actorId, reason: input.reason, occurredAt: now, eventId } });
 }
}
