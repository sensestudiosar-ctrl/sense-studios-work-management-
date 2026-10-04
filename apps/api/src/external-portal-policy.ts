import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Prisma } from "./generated/prisma/client.js";
import { recordProjectEvent } from "./project-events.js";

export type ExternalActor = { accountId: string; sessionId: string };
export type ExternalTx = Prisma.TransactionClient;
export type ExternalEvidenceTable = "external_portal_grants" | "external_portal_records" | "external_portal_uploads" | "external_cad_shares";

/** Owned PORT evidence boundary; fixed table allowlist, never caller-controlled SQL. */
export async function externalEvidence(tx: ExternalTx, actorId: string, table: ExternalEvidenceTable, id: string, version: number, reason: string) {
  const excluded = table === "external_cad_shares" ? "encryptedSecret" : table === "external_portal_uploads" ? "storageKey" : "";
  const rows = await tx.$queryRaw<Array<{ snapshot: Prisma.JsonObject }>>(Prisma.sql`SELECT to_jsonb(r)-${excluded} AS snapshot FROM ${Prisma.raw(table)} r WHERE id=${id}::uuid`);
  const snapshot = rows[0]!.snapshot;
  const projectId = snapshot.projectId as string, organizationId = snapshot.organizationId as string;
  const serialized = JSON.stringify(snapshot);
  const digest = (await tx.$queryRaw<Array<{ digest: string }>>`SELECT encode(sha256(convert_to(${serialized}::jsonb::text,'UTF8')),'hex') AS digest`)[0]!.digest;
  const eventId = await recordProjectEvent(tx, { organizationId, actorId, eventName: "external.changed", subjectType: table, subjectId: id, reason, after: { projectId, version, snapshotSha256: digest } });
  await tx.externalPortalHistory.create({ data: { organizationId, projectId, subjectType: table, subjectId: id, subjectVersion: version, actorId, reason, snapshot: snapshot as Prisma.InputJsonObject, eventId } });
}

export async function externalGrantUsable(tx: ExternalTx, grantId: string) {
  return (await tx.$queryRaw<Array<{ allowed: boolean }>>`SELECT s21_grant_usable(${grantId}::uuid) AS allowed`)[0]!.allowed;
}

/** Fresh exact recipient authority for DOC issue; no portal cookie substitutes staff authority. */
export async function externalRevisionRecipient(tx: ExternalTx, accountId: string, projectId: string, revisionId: string) {
  await tx.$queryRaw`SELECT id FROM external_portal_grants WHERE "projectId"=${projectId}::uuid AND "accountId"=${accountId}::uuid FOR SHARE`;
  const grants = await tx.externalPortalGrant.findMany({ where: { projectId, accountId, revokedAt: null } });
  for (const grant of grants) if (grant.revisionIds.includes(revisionId) && await externalGrantUsable(tx, grant.id)) {
    if ((await tx.$queryRaw<Array<{ allowed: boolean }>>`SELECT s21_nonconfidential_revision(${revisionId}::uuid) AS allowed`)[0]!.allowed) return grant;
  }
  throw new ForbiddenException("Current exact external recipient permission required");
}

/** Locks serialize against grant revocation, project cancellation and closeout completion. */
export async function authorizeExternal(tx: ExternalTx, actor: ExternalActor, projectId: string, write = false, grantId?: string) {
  await tx.$queryRaw`SELECT id FROM projects WHERE id=${projectId}::uuid FOR SHARE`;
  const project = await tx.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundException("Project not found");
  await tx.$queryRaw`SELECT id FROM accounts WHERE id=${actor.accountId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM external_portal_sessions WHERE id=${actor.sessionId}::uuid FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM external_portal_grants WHERE "projectId"=${projectId}::uuid AND "accountId"=${actor.accountId}::uuid FOR SHARE`;
  const grants = await tx.externalPortalGrant.findMany({ where: { projectId, accountId: actor.accountId, ...(grantId ? { id: grantId } : {}) } });
  for (const g of grants) if (g.closeoutTaskId) {
    await tx.$queryRaw`SELECT id FROM tasks WHERE id=${g.closeoutTaskId}::uuid FOR SHARE`;
    await tx.$queryRaw`SELECT id FROM task_closeout_approvals WHERE "taskId"=${g.closeoutTaskId}::uuid FOR SHARE`;
  }
  const account = await tx.account.findUnique({ where: { id: actor.accountId } });
  const session = await tx.externalPortalSession.findUnique({ where: { id: actor.sessionId } });
  const now = (await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`)[0]!.now;
  if (!account || account.kind !== "EXTERNAL" || account.state !== "ACTIVE" || !session || session.accountId !== account.id || session.revokedAt || session.expiresAt <= now || session.lastUsedAt.getTime() + 30 * 60_000 <= now.getTime()) throw new ForbiddenException("External session ended. Sign in again");
  const usable = [];
  for (const g of grants) if (g.organizationId === project.organizationId && await externalGrantUsable(tx, g.id)) usable.push(g);
  if (!usable.length) throw new ForbiddenException("Project access ended");
  if (write && project.status !== "ACTIVE" && !(project.status === "CANCELLED" && usable.every(g => Boolean(g.closeoutTaskId)))) throw new ConflictException("Delivery submissions require an Active project or approved closeout work");
  return { project, grants: usable, now };
}

export async function externalCancellationBlockers(tx: ExternalTx, projectId: string) {
  const now = (await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`)[0]!.now;
  return tx.externalCadShare.findMany({ where: { projectId, revokedAt: null, expiresAt: { gt: now } }, select: { id: true, nativeLinkId: true, revisionId: true, grantId: true, version: true, expiresAt: true }, orderBy: { issuedAt: "asc" } });
}

/** Called by TSK only under its existing Owner-authorized project lock. */
export async function cancelExternalGrants(tx: ExternalTx, actorId: string, projectId: string, reason: string) {
  const blockers = await externalCancellationBlockers(tx, projectId);
  if (blockers.length) throw new ConflictException({ message: "Confirm native CAD link cancellation before finalizing project cancellation", nativeLinkBlockers: blockers });
  for (const grant of await tx.externalPortalGrant.findMany({ where: { projectId, closeoutTaskId: null, revokedAt: null }, orderBy: { id: "asc" } })) {
    const changed = await tx.externalPortalGrant.update({ where: { id: grant.id, version: grant.version }, data: { revokedAt: new Date(), version: { increment: 1 } } });
    await externalEvidence(tx, actorId, "external_portal_grants", changed.id, changed.version, reason);
  }
}

/** A persistent mandatory Owner notice; native API control is never inferred. */
export async function externalRevocationNotices(tx: ExternalTx, projectId?: string) {
  const now = (await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`)[0]!.now;
  let created = 0;
  for (const share of await tx.externalCadShare.findMany({ where: { ...(projectId ? { projectId } : {}), revokedAt: null, expiresAt: { gt: now } } })) {
    const grant = await tx.externalPortalGrant.findUniqueOrThrow({ where: { id: share.grantId } });
    const confidential = !(await tx.$queryRaw<Array<{ allowed: boolean }>>`SELECT s21_nonconfidential_revision(${share.revisionId}::uuid) AS allowed`)[0]!.allowed;
    if (await externalGrantUsable(tx, grant.id) && grant.revisionIds.includes(share.revisionId) && !confidential) continue;
    const history = await tx.externalPortalHistory.findUnique({ where: { subjectId_subjectVersion: { subjectId: share.id, subjectVersion: 1 } } });
    if (!history) continue;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'external.native_revocation:' + share.id}))`;
    const owners = [];
    for (const owner of await tx.account.findMany({ where: { kind: "OWNER", state: "ACTIVE" }, select: { id: true } })) {
      const prior = await tx.notification.findFirst({ where: { recipientAccountId: owner.id, category: "external.native_revocation", deliveryState: { in: ["PENDING", "DELIVERED"] }, event: { eventName: "external.changed", subjectType: "external_native_revocation", subjectId: share.id } } });
      if (!prior) owners.push(owner);
    }
    if (!owners.length) continue;
    const eventId = await recordProjectEvent(tx, { organizationId: share.organizationId, actorId: share.issuedById, eventName: "external.changed", subjectType: "external_native_revocation", subjectId: share.id, reason: "Automatic native access-loss safety notice under the retained issuance authority", after: { projectId: share.projectId, shareId: share.id, issuanceEventId: history.eventId, cause: "AUTOMATIC_NATIVE_ACCESS_LOSS" } });
    for (const owner of owners) {
      const result = await tx.notification.createMany({ data: [{ eventId, recipientAccountId: owner.id, channel: "IN_APP", category: "external.native_revocation", title: "Native CAD link requires cancellation", body: "External access ended. Cancel the active native link in MinisCloud and record Owner confirmation.", internalRoute: `/external-access?projectId=${share.projectId}&share=${share.id}`, critical: true, mandatory: true }], skipDuplicates: true });
      created += result.count;
    }
  }
  return created;
}
