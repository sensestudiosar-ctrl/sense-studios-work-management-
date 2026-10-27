#!/usr/bin/env node
/** Local durable factory checkpoints. No scheduler, application DB or network access.
 * Set one stable FACTORY_WORKER_ID for the worker's separate CLI invocations.
 * Commands: init/start/checkpoint/pause/resume/mark/lock/release/steal/status/list.
 * `steal` requires an expired lease and --justification; `self-test` uses scratch stores.
 * FACTORY_CHECKPOINT_STORE optionally selects a local JSON store (for isolated tests).
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(SCRIPT), "..", "..");
const STORE = path.resolve(process.env.FACTORY_CHECKPOINT_STORE || path.join(REPO, "docs", "ai-factory", "checkpoints"));
// Resolve existing ancestors so case/symlink aliases share the same mutex, even
// when the checkpoint directory has not been created yet.
function storeIdentity(directory) {
  let ancestor = directory;
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) fail("no accessible store ancestor");
    ancestor = parent;
  }
  const canonical = path.resolve(fs.realpathSync.native(ancestor), path.relative(ancestor, directory));
  return process.platform === "win32" ? canonical.toLowerCase() : canonical;
}
const LOCKS = path.join(os.tmpdir(), "sense-factory-locks", crypto.createHash("sha256").update(storeIdentity(STORE)).digest("hex"));
const DEFAULT_TTL_MIN = 30;
const VALID_TRANSITIONS = {
  QUEUED: ["RUNNING", "BLOCKED"],
  RUNNING: ["CHECKPOINTED", "VERIFIED", "PAUSED", "BLOCKED", "FAILED"],
  CHECKPOINTED: ["RUNNING", "VERIFIED", "PAUSED", "BLOCKED", "FAILED"],
  PAUSED: ["RECOVERABLE", "BLOCKED", "FAILED"],
  RECOVERABLE: ["RESUMING", "BLOCKED", "FAILED"],
  RESUMING: ["RUNNING", "CHECKPOINTED", "BLOCKED", "FAILED"],
  VERIFIED: ["AWAITING_APPROVAL", "BLOCKED", "FAILED"],
  AWAITING_APPROVAL: ["COMPLETED", "RUNNING"],
  BLOCKED: ["RUNNING", "FAILED", "COMPLETED"],
  FAILED: ["QUEUED"],
  COMPLETED: [],
};
const MUTATIONS = new Set(["init", "start", "resume", "checkpoint", "pause", "mark", "lock", "release", "steal"]);
const now = () => new Date().toISOString();
function fail(message) { throw new Error(message); }
function storePath(task) {
  if (typeof task !== "string" || !/^[\w.-]+$/.test(task) || task === "." || task === "..") fail(`bad task id: ${task}`);
  return path.join(STORE, `${task}.json`);
}
function worker() {
  const id = process.env.FACTORY_WORKER_ID?.trim();
  if (!id) fail("set a stable FACTORY_WORKER_ID before changing a lease or running a task");
  return id;
}
function load(task) {
  const file = storePath(task);
  if (!fs.existsSync(file)) fail(`no checkpoint for task "${task}" (init it first)`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
// SQLite is only a local OS-backed mutex. Its lock is released if a CLI process
// dies; no application data is stored in it. Every read/change/write is serialized.
function serialized(task, fn) {
  storePath(task);
  fs.mkdirSync(LOCKS, { recursive: true });
  const db = new DatabaseSync(path.join(LOCKS, `${task}.sqlite`));
  try {
    db.exec("PRAGMA busy_timeout = 10000; BEGIN IMMEDIATE");
    try { const result = fn(); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  } finally { db.close(); }
}
function save(rec) {
  fs.mkdirSync(STORE, { recursive: true });
  rec.updatedAt = now();
  const target = storePath(rec.taskId);
  const temporary = `${target}.${process.pid}-${crypto.randomBytes(6).toString("hex")}.tmp`;
  try {
    const fd = fs.openSync(temporary, "wx");
    try { fs.writeFileSync(fd, JSON.stringify(rec, null, 2) + "\n"); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temporary, target);
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function leaseStale(rec) {
  if (!rec.lock) return true;
  const acquired = Date.parse(rec.lock.acquiredAt);
  if (!Number.isFinite(acquired) || !Number.isFinite(rec.lock.ttlMs) || rec.lock.ttlMs <= 0) fail("invalid recorded lease; inspect the checkpoint before recovery");
  return Date.now() - acquired >= rec.lock.ttlMs;
}
function assertOwner(rec, allowUnowned = false) {
  const id = worker();
  if (!rec.lock && allowUnowned) return id;
  if (!rec.lock) fail("no owned lease; acquire a lease first");
  if (leaseStale(rec)) fail("lease expired; use steal with a justification before continuing");
  if (rec.lock.owner !== id) fail(`active lease held by ${rec.lock.owner}`);
  return id;
}
function ttlMinutes(value) {
  const minutes = value === undefined ? DEFAULT_TTL_MIN : Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(minutes * 60000)) fail("ttl-min must be a positive finite number");
  return minutes;
}
function acquire(rec, ttl) {
  rec.lock = { owner: worker(), acquiredAt: now(), ttlMs: ttl === undefined && rec.lock ? rec.lock.ttlMs : ttlMinutes(ttl) * 60000, renewOn: "checkpoint" };
}
function transition(rec, to, reason) {
  if (!VALID_TRANSITIONS[rec.state]?.includes(to)) fail(`illegal transition ${rec.state} -> ${to} for ${rec.taskId}`);
  const from = rec.state;
  rec.state = to;
  rec.history.push({ at: now(), from, to, reason: reason ?? null, executionId: rec.currentExecutionId });
}
function note(rec, text) { (rec.notes ??= []).push({ at: now(), text }); }
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) fail(`missing value for ${argv[i]}`);
      out[argv[i].slice(2)] = argv[++i];
    } else (out._pos ??= []).push(argv[i]);
  }
  return out;
}
function mutate(command, task, args) {
  if (command === "init") {
    if (fs.existsSync(storePath(task))) fail(`task "${task}" already exists`);
    save({ version: 1, taskId: task, title: args.title ?? task, issue: args.issue ?? null,
      scope: args.scope ?? null, branch: args.branch ?? null, sourceRev: args["source-rev"] ?? null,
      state: "QUEUED", createdAt: now(), lock: null, currentExecutionId: null,
      completed: [], remaining: args.remaining ? args.remaining.split(",") : ["not started"],
      lastStage: null, lastSafeCommit: args["source-rev"] ?? null, testResults: {}, pendingReviews: [],
      failureReason: null, lastRecoveryAttempt: null, recoveryEligible: true,
      history: [{ at: now(), from: null, to: "QUEUED", reason: "init", executionId: null }] });
    return console.log(`created ${task} @ QUEUED`);
  }
  const rec = load(task);
  if (command === "start" || command === "resume") {
    assertOwner(rec, true);
    if (["RUNNING", "CHECKPOINTED"].includes(rec.state)) {
      // A duplicate trigger is a no-op only for the current live owner.
      assertOwner(rec);
      return console.log(`${task} already ${rec.state} (execution ${rec.currentExecutionId})`);
    }
    if (command === "resume") {
      if (!["PAUSED", "RECOVERABLE", "RESUMING"].includes(rec.state)) fail(`resume requires PAUSED/RECOVERABLE/RESUMING, got ${rec.state}`);
      if (rec.state === "PAUSED") transition(rec, "RECOVERABLE", "resume: mark recoverable");
      if (rec.state === "RECOVERABLE") transition(rec, "RESUMING", "resume");
    } else if (!["QUEUED", "BLOCKED", "AWAITING_APPROVAL"].includes(rec.state)) fail(`start is unavailable in ${rec.state}; paused work requires resume`);
    rec.currentExecutionId ??= `run-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    acquire(rec);
    transition(rec, "RUNNING", command === "resume" ? "resumed" : "started");
  } else if (command === "lock") {
    if (rec.state === "COMPLETED") fail("COMPLETED is terminal");
    assertOwner(rec, true);
    acquire(rec, args["ttl-min"]);
  } else if (command === "steal") {
    worker();
    if (rec.state === "COMPLETED") fail("COMPLETED is terminal");
    if (!rec.lock || !leaseStale(rec)) fail("steal requires an expired recorded lease");
    const justification = args.justification?.trim();
    if (!justification) fail("steal requires --justification");
    const previousOwner = rec.lock.owner;
    acquire(rec, args["ttl-min"]);
    note(rec, `lease stolen (was ${previousOwner}): ${justification}`);
  } else if (command === "mark") {
    const target = args._pos?.[0] ?? args.state;
    if (!(target in VALID_TRANSITIONS)) fail(`unknown state ${target}`);
    // Queued initialization and re-queuing failed work have no running worker.
    assertOwner(rec, ["QUEUED", "FAILED"].includes(rec.state));
    transition(rec, target, args.reason);
    if (target === "FAILED") rec.failureReason = args.reason ?? "failed";
    if (["COMPLETED", "FAILED", "BLOCKED"].includes(target)) rec.lock = null;
  } else {
    assertOwner(rec);
    if (command === "checkpoint") {
      if (!["RUNNING", "RESUMING", "CHECKPOINTED"].includes(rec.state)) fail(`checkpoint unavailable in ${rec.state}`);
      if (args.stage) rec.lastStage = args.stage;
      if (args.completed) for (const op of args.completed.split(",").map(value => value.trim()).filter(Boolean)) if (!rec.completed.includes(op)) rec.completed.push(op);
      if (args.remaining) rec.remaining = args.remaining.split(",").map(value => value.trim());
      if (args.rev) rec.lastSafeCommit = args.rev;
      if (args.note) note(rec, args.note);
      acquire(rec);
      if (rec.state !== "CHECKPOINTED") transition(rec, "CHECKPOINTED", args.stage ?? "checkpoint");
    } else if (command === "pause") transition(rec, "PAUSED", args.reason ?? "paused");
    else if (command === "release") rec.lock = null;
  }
  save(rec);
  console.log(`${task} ${command} -> ${rec.state}${rec.lock ? ` (owner ${rec.lock.owner})` : ""}`);
}
function main() {
  const [, , command, task, ...rest] = process.argv;
  if (command === "self-test") {
    const result = spawnSync(process.execPath, ["--test", path.join(path.dirname(SCRIPT), "checkpoint.test.mjs")], { stdio: "inherit", env: process.env });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
    return;
  }
  if (command === "list") {
    if (!fs.existsSync(STORE)) return console.log("(no checkpoints)");
    for (const file of fs.readdirSync(STORE).filter(value => value.endsWith(".json"))) {
      const id = file.slice(0, -5);
      serialized(id, () => { const rec = load(id); console.log(`${rec.taskId}\t${rec.state}\towner=${rec.lock?.owner ?? "none"}\tstale=${leaseStale(rec)}`); });
    }
    return;
  }
  const args = parseArgs(rest);
  if (command === "status" || command === "show") return serialized(task, () => console.log(JSON.stringify(load(task), null, 2)));
  if (!MUTATIONS.has(command)) fail("usage: checkpoint.mjs <init|start|checkpoint|pause|resume|mark|lock|release|steal|status|list|self-test> [task] [flags]");
  serialized(task, () => mutate(command, task, args));
}
try { main(); } catch (error) { console.error(`[checkpoint] ${error.message}`); process.exitCode = 1; }

