import { spawnSync } from "node:child_process";

if (process.env.GITHUB_ACTIONS !== "true" || !process.env.GITHUB_RUN_ID) {
  throw new Error("Disposable CI fixture cleanup is permitted only inside GitHub Actions.");
}
const attempt = process.env.GITHUB_RUN_ATTEMPT ?? "1";
if (!/^\d+$/.test(process.env.GITHUB_RUN_ID) || !/^\d+$/.test(attempt)) throw new Error("Unexpected GitHub run identity.");
for (const role of ["main", "s14"]) {
  const name = `sense-ci-pg-${role}-${process.env.GITHUB_RUN_ID}-${attempt}`;
  const result = spawnSync("docker", ["rm", "--force", name], { stdio: "ignore" });
  if (result.error) throw new Error("Could not stop a disposable PostgreSQL fixture container.");
}
process.stdout.write("Stopped this GitHub run's disposable PostgreSQL fixture containers.\n");
