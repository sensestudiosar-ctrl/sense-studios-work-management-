import { resolve } from "node:path";
import { validateAgent1BrowserTarget } from "./v1-agent1-browser-target.js";
const root = resolve(process.cwd(), "../..");
const data = resolve(root, ".artifacts/v1/20261016-agent1-browser/postgres/data");
const url = `postgresql://agent1_browser_20261016:${"a".repeat(64)}@127.0.0.1:59751/sense_v1_agent1_browser_20261016_test`;
function manifest() {
  const systemId = "123456789", marker = "v1-agent1-browser:11111111-1111-4111-8111-111111111111";
  return { approval: "2026-10-16:agent1-fresh-browser-119", phase: "ready", database: "sense_v1_agent1_browser_20261016_test", port: 59751, data, systemId, marker, apiPort: 59752, webPort: 59753, storage: resolve(root, ".artifacts/v1/20261016-agent1-browser/files"),
    identity: { database: "sense_v1_agent1_browser_20261016_test", address: "127.0.0.1", port: 59751, directory: data, version: 180006, systemId, oid: "12345", owner: "agent1_browser_20261016", marker },
    source: { hash: "b".repeat(64), files: Array.from({length: 500}, (_,i) => ({path: `apps/api/src/fixture${i}.ts`,hash:"c".repeat(64)})), migrations: Array.from({length:119}, (_,i) => ({name:i===118?"20261015000000_task_creation_receipts":String(i),checksum:"d".repeat(64)})) } };
}
describe("Agent1 browser acceptance target boundary", () => {
  it("accepts the exact proposed shape without opening a database", () => { expect(validateAgent1BrowserTarget(manifest(), url, root).port).toBe(59751); });
  it.each([undefined, "postgresql://staff:secret@127.0.0.1:45434/sense_latest_retained_20261014_test", url.replace("59751","58440"), url.replace("59751","59749").replace("agent1_browser_20261016", "agent1_v1_20261016").replace("sense_v1_agent1_browser_20261016_test", "sense_v1_agent1_20261016_test"), url.replace("_20261016_test","_test"), url.replace("127.0.0.1","localhost"), `${url}?database=postgres`])("rejects another datasource without exposing it", candidate => {
    expect(() => validateAgent1BrowserTarget(manifest(), candidate, root)).toThrow("Exact approved Agent1 browser target/source required");
  });
  it.each(["approval","phase","directory","systemId","marker","source","escape","duplicate","apiPort","webPort","storage"])("rejects invalid %s before a connection", field => {
    const m=manifest();
    if(field==="approval")m.approval="pending";
    if(field==="phase")m.phase="stopped";
    if(field==="directory")m.identity.directory=resolve(root,".env.checkpoint-tools/retained");
    if(field==="systemId")m.identity.systemId="999";
    if(field==="marker")m.identity.marker="different";
    if(field==="source")m.source.migrations.pop();
    if(field==="escape")m.source.files[0]!.path="../../private";
    if(field==="duplicate")m.source.files[1]!.path=m.source.files[0]!.path;
    if(field==="apiPort")m.apiPort=4000;
    if(field==="webPort")m.webPort=5173;
    if(field==="storage")m.storage=resolve(root,".env.local-runtime/files");
    expect(() => validateAgent1BrowserTarget(m,url,root)).toThrow("Exact approved Agent1 browser target/source required");
  });
});
