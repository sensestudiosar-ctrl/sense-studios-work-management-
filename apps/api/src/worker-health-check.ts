import { checkWorkerHealth } from "./worker-health.js";

try {
  const path = process.env.WORKER_HEALTH_PATH;
  if (!path) throw new Error("Worker health path is not configured");
  await checkWorkerHealth(path);
} catch {
  console.error("Worker readiness failed; inspect protected worker logs.");
  process.exitCode = 1;
}
