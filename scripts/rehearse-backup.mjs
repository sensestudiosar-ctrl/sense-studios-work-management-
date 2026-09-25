import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { pipeline } from "node:stream/promises";

const databaseName = process.env.S01_DB_NAME;
const databaseUser = process.env.S01_DB_USER;
const postgresBin = process.env.S01_PG_BIN;
if (!databaseName || !/^sense_s01[a-z0-9_]*_test$/.test(databaseName)) {
  throw new Error("Backup rehearsal requires a dedicated sense_s01*_test database.");
}
if (!databaseUser || !/^[a-z][a-z0-9_]*$/.test(databaseUser)) {
  throw new Error("Backup rehearsal requires a simple test database user.");
}
if (postgresBin && !(process.env.S01_DB_PASSWORD || process.env.PGPASSWORD)) {
  throw new Error("Local PostgreSQL rehearsal requires S01_DB_PASSWORD or PGPASSWORD.");
}

const compose = ["compose", "-f", "infra/compose.yaml", "exec", "-T", "db"];
const localConnection = [
  "-h", process.env.S01_PG_HOST ?? "127.0.0.1",
  "-p", process.env.S01_PG_PORT ?? "55432",
  "-U", databaseUser
];
const token = randomBytes(12).toString("hex");
const fileToken = randomBytes(12).toString("hex");
const restoreDatabase = "sense_s01_restore_" + randomBytes(4).toString("hex") + "_test";
const work = await mkdtemp(join(tmpdir(), "sense-s01-backup-"));
const resolvedTemp = await realpath(tmpdir());
const resolvedWork = await realpath(work);
if (!resolvedWork.startsWith(resolvedTemp + sep)) {
  await rm(resolvedWork, { recursive: true, force: true });
  throw new Error("Rehearsal path is outside the temporary directory.");
}
const sourceFile = join(work, "representative-file.txt");
const backupFile = join(work, "file.backup");
const restoredFile = join(work, "file.restored");
const dumpFile = join(work, "database.dump");

async function postgres(tool, args, inputFile, outputFile) {
  const executable = postgresBin
    ? join(postgresBin, process.platform === "win32" ? tool + ".exe" : tool)
    : "docker";
  const commandArgs = postgresBin
    ? localConnection.concat(args)
    : compose.concat([tool, "-U", databaseUser], args);
  const child = spawn(executable, commandArgs, {
    stdio: ["pipe", "pipe", "pipe"],
    env: postgresBin
      ? { ...process.env, PGPASSWORD: process.env.S01_DB_PASSWORD ?? process.env.PGPASSWORD }
      : process.env
  });
  let stderr = "";
  const stdout = [];
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const outputTask = outputFile
    ? pipeline(child.stdout, createWriteStream(outputFile))
    : new Promise((resolve) => {
        child.stdout.on("data", (chunk) => stdout.push(chunk));
        child.stdout.on("end", resolve);
      });
  const inputTask = inputFile
    ? pipeline(createReadStream(inputFile), child.stdin)
    : (child.stdin.end(), Promise.resolve());
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  await Promise.all([inputTask, outputTask]);
  if (exitCode !== 0) {
    throw new Error("PostgreSQL rehearsal command failed: " + stderr.trim());
  }
  return Buffer.concat(stdout).toString("utf8").trim();
}

let restoreCreated = false;
try {
  await writeFile(sourceFile, "S01 representative test file " + fileToken + "\n", "utf8");
  const fileHash = createHash("sha256").update(await readFile(sourceFile)).digest("hex");
  await postgres("psql", [
    "-d", databaseName, "-v", "ON_ERROR_STOP=1", "-c",
    "CREATE TABLE IF NOT EXISTS s01_rehearsal_probe (token text PRIMARY KEY); " +
    "ALTER TABLE s01_rehearsal_probe ADD COLUMN IF NOT EXISTS file_sha256 text"
  ]);
  await postgres("psql", [
    "-d", databaseName, "-v", "ON_ERROR_STOP=1", "-c",
    "INSERT INTO s01_rehearsal_probe (token, file_sha256) VALUES ('" + token + "', '" + fileHash + "')"
  ]);

  await postgres("pg_dump", ["-d", databaseName, "-Fc"], undefined, dumpFile);
  await copyFile(sourceFile, backupFile);

  await postgres("createdb", [restoreDatabase]);
  restoreCreated = true;
  await postgres("pg_restore", [
    "-d", restoreDatabase, "--no-owner", "--no-privileges"
  ], dumpFile);
  const result = await postgres("psql", [
    "-d", restoreDatabase, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c",
    "SELECT count(*) FROM s01_rehearsal_probe WHERE token = '" + token +
    "' AND file_sha256 = '" + fileHash + "'"
  ]);
  if (result !== "1") {
    throw new Error("Restored PostgreSQL fixture did not reference the backed-up file checksum.");
  }

  await copyFile(backupFile, restoredFile);
  const restoredHash = createHash("sha256").update(await readFile(restoredFile)).digest("hex");
  if (restoredHash !== fileHash) {
    throw new Error("Restored file checksum mismatch.");
  }

  console.info(JSON.stringify({
    result: "PASS",
    database: "test fixture row and stored file checksum restored",
    fileSha256: restoredHash,
    note: "Local rehearsal only; encrypted offsite recovery remains a production gate."
  }));
} finally {
  if (restoreCreated) {
    await postgres("dropdb", [restoreDatabase]).catch((error) => console.error(error));
  }
  await postgres("psql", [
    "-d", databaseName, "-v", "ON_ERROR_STOP=1", "-c",
    "DELETE FROM s01_rehearsal_probe WHERE token = '" + token + "'"
  ]).catch((error) => console.error(error));
  await rm(resolvedWork, { recursive: true, force: true });
}