import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DatabaseService } from "./database.service.js";
import { TimeService } from "./time.service.js";
/** Durable rows remain the recovery source; a restart resumes queued/expired work. */
@Injectable()
export class TimeWorker implements OnModuleInit, OnModuleDestroy {
 private timer?: ReturnType<typeof setInterval>;
 private running = false;
 constructor(private readonly database: DatabaseService, private readonly time: TimeService) {}
 onModuleInit() { if (process.env.NODE_ENV !== "test" && process.env.TIME_ACCOUNTING_RECEIVER_URL) { this.timer = setInterval(() => { void this.tick(); }, 30_000); this.timer.unref(); } }
 onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
 async tick() {
  if (this.running || !process.env.TIME_ACCOUNTING_RECEIVER_URL) return;
  this.running = true;
  try {
   const rows = await this.database.prisma.timeAccountingDelivery.findMany({ where: { state: { in: ["PENDING", "FAILED", "SENDING"] }, attempts: { lt: 10 }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }] }, orderBy: [{ entryId: "asc" }, { revision: "asc" }], take: 20 });
   for (const row of rows) { try { await this.time.dispatch({ accountId: row.requestedById, organizationId: row.organizationId, kind: "OWNER" }, row.id); } catch { /* Persisted failure/lease remains visible for authorized operational retry. */ } }
  } finally { this.running = false; }
 }
}
