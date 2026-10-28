import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./checkpoint.mjs", import.meta.url));
function fixture(t) {
  const testBase = path.resolve(path.dirname(script), "..", "..", ".env.factory-tests");
  fs.mkdirSync(testBase, { recursive: true });
  const root = fs.mkdtempSync(path.join(testBase, "sense-factory-test-"));
  const store = path.join(root, "checkpoints");
  t.after(() => {
    const relative = path.relative(testBase, root);
    assert.ok(relative.startsWith("sense-factory-test-") && !relative.includes(path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const env = (owner) => {
    const value = { ...process.env, FACTORY_CHECKPOINT_STORE: store };
    delete value.FACTORY_WORKER_ID;
    if (owner !== undefined) value.FACTORY_WORKER_ID = owner;
    return value;
  };
  const run = (args, owner = "worker-a", expected = 0) => {
    const result = spawnSync(process.execPath, [script, ...args], { env: env(owner), encoding: "utf8" });
    assert.equal(result.error, undefined);
    assert.equal(result.status, expected, result.stdout + result.stderr);
    return result;
  };
  const concurrent = (args, owner) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { env: env(owner), stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", value => { output += value; });
    child.stderr.on("data", value => { output += value; });
    child.on("error", reject);
    child.on("close", status => resolve({ status, output }));
  });
  const read = (task = "task") => JSON.parse(fs.readFileSync(path.join(store, `${task}.json`), "utf8"));
  const expire = (task = "task") => {
    const rec = read(task);
    rec.lock.acquiredAt = "2000-01-01T00:00:00.000Z";
    fs.writeFileSync(path.join(store, `${task}.json`), JSON.stringify(rec));
  };
  return { run, concurrent, read, expire, store };
}

test("concurrent initializers and distinct-worker starts have exactly one winner", async t => {
  const f = fixture(t);
  const initializers = await Promise.all(Array.from({ length: 6 }, () => f.concurrent(["init", "task"], undefined)));
  assert.equal(initializers.filter(result => result.status === 0).length, 1);
  assert.equal(initializers.filter(result => result.status === 1).length, 5);
  const starts = await Promise.all(Array.from({ length: 8 }, (_, i) => f.concurrent(["start", "task"], `worker-${i}`)));
  assert.equal(starts.filter(result => result.status === 0).length, 1);
  assert.equal(starts.filter(result => result.status === 1).length, 7);
  assert.equal(f.read().state, "RUNNING");
  assert.equal(f.read().history.filter(row => row.to === "RUNNING").length, 1);
});

test("concurrent checkpoints serialize without losing completed operations", async t => {
  const f = fixture(t);
  f.run(["init", "task"]);
  f.run(["start", "task"]);
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => f.concurrent(["checkpoint", "task", "--completed", `op-${i}`], "worker-a")));
  for (const result of results) assert.equal(result.status, 0, result.output);
  assert.deepEqual(f.read().completed.sort(), Array.from({ length: 8 }, (_, i) => `op-${i}`));
  assert.equal(f.read().lock.owner, "worker-a");
});

test("live ownership is required for every task mutation and identity cannot be omitted", t => {
  const f = fixture(t);
  f.run(["init", "task"]);
  f.run(["start", "task"]);
  for (const args of [["start", "task"], ["resume", "task"], ["lock", "task"], ["checkpoint", "task"], ["pause", "task"], ["release", "task"], ["mark", "task", "FAILED"]]) {
    const before = f.read();
    f.run(args, "worker-b", 1);
    // Pass an explicit empty identity rather than inheriting the test default.
    f.run(args, "", 1);
    assert.deepEqual(f.read(), before);
  }
  f.run(["steal", "task", "--justification", "another live worker"], "worker-b", 1);
});

test("same-owner duplicate starts/resumes preserve state, execution and lease identity", t => {
  const f = fixture(t);
  f.run(["init", "task"]);
  f.run(["start", "task"]);
  f.run(["checkpoint", "task", "--completed", "spec, spec ,implement"]);
  const before = f.read();
  f.run(["start", "task"]);
  f.run(["resume", "task"]);
  assert.deepEqual(f.read(), before);
  assert.deepEqual(f.read().completed, ["spec", "implement"]);
  f.run(["lock", "task", "--ttl-min", "12"]);
  assert.equal(f.read().lock.owner, "worker-a");
  assert.equal(f.read().lock.ttlMs, 720000);
  f.run(["checkpoint", "task"]);
  assert.equal(f.read().lock.ttlMs, 720000);
});

test("expired leases require explicit justified takeover and retain the previous owner", t => {
  const f = fixture(t);
  f.run(["init", "task"]);
  f.run(["start", "task"]);
  f.run(["pause", "task", "--reason", "interrupted"]);
  f.expire();
  for (const command of ["start", "resume", "lock", "checkpoint", "pause", "release"]) f.run([command, "task"], "worker-a", 1);
  f.run(["mark", "task", "FAILED"], "worker-a", 1);
  f.run(["steal", "task"], "worker-b", 1);
  f.run(["steal", "task", "--justification", "previous worker died"], "worker-b");
  assert.equal(f.read().lock.owner, "worker-b");
  assert.match(f.read().notes.at(-1).text, /was worker-a.*previous worker died/);
  f.run(["resume", "task"], "worker-b");
  assert.equal(f.read().state, "RUNNING");
  assert.deepEqual(f.read().history.slice(-3).map(row => row.to), ["RECOVERABLE", "RESUMING", "RUNNING"]);
});

test("terminal state and failed re-queue follow the declared transition table", t => {
  const f = fixture(t);
  f.run(["init", "task"]);
  f.run(["start", "task"]);
  f.run(["mark", "task", "VERIFIED"]);
  f.run(["mark", "task", "AWAITING_APPROVAL"]);
  f.run(["mark", "task", "COMPLETED"]);
  const before = f.read();
  for (const args of [["start", "task"], ["resume", "task"], ["lock", "task"], ["mark", "task", "RUNNING"]]) f.run(args, "worker-a", 1);
  assert.deepEqual(f.read(), before);
  assert.equal(before.lock, null);
  f.run(["init", "failed"]);
  f.run(["start", "failed"]);
  f.run(["mark", "failed", "FAILED", "--reason", "fixture failed"]);
  f.run(["mark", "failed", "QUEUED"], "worker-b");
  f.run(["start", "failed"], "worker-b");
  assert.equal(f.read("failed").state, "RUNNING");
});

test("released work must be explicitly acquired before checkpointing", t => {
  const f = fixture(t);
  f.run(["init", "task"]);
  f.run(["start", "task"]);
  f.run(["release", "task"]);
  f.run(["checkpoint", "task"], "worker-a", 1);
  f.run(["lock", "task"], "worker-b");
  f.run(["checkpoint", "task", "--completed", "recovered"], "worker-b");
  assert.deepEqual(f.read().completed, ["recovered"]);
});

test("invalid task paths and lease TTLs leave records unchanged", t => {
  const f = fixture(t);
  f.run(["init", "../escape"], "worker-a", 1);
  f.run(["init", "task"]);
  for (const ttl of ["0", "-1", "NaN", "Infinity"]) f.run(["lock", "task", "--ttl-min", ttl], "worker-a", 1);
  assert.equal(f.read().lock, null);
  f.run(["start", "task"], "", 1);
  assert.equal(f.read().state, "QUEUED");
});

