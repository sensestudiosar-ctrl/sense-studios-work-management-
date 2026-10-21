import type { Prisma } from "./generated/prisma/client.js";

// Only a composed read binds a clock. Command transactions keep their current
// execution time, and nested domain policies inherit the exact transaction.
const readTimes = new WeakMap<Prisma.TransactionClient, number>();

export function authorizationTime(tx?: Prisma.TransactionClient): Date {
  const readTime = tx ? readTimes.get(tx) : undefined;
  return readTime === undefined ? new Date() : new Date(readTime);
}

export async function withAuthorizationReadTime<T>(tx: Prisma.TransactionClient, readAt: Date, work: () => Promise<T>): Promise<T> {
  const timestamp = readAt.getTime();
  if (!Number.isFinite(timestamp)) throw new RangeError("A valid authorization read time is required");
  const existing = readTimes.get(tx);
  if (existing !== undefined) {
    if (existing !== timestamp) throw new Error("A transaction cannot use conflicting authorization read times");
    return work();
  }
  readTimes.set(tx, timestamp);
  try { return await work(); }
  finally { readTimes.delete(tx); }
}
