import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { atomicJson, loadActive, loadSettings, scoped, inventory } from './manifest.mjs';
import { processIdentity, listeners, sameIdentity, ownsListeners, claimSupervisorLock, postgresProcesses, executableProcesses } from './windows.mjs';
import { childFinished, observeChildExit, restartDelay, captureLog } from './process-policy.mjs';

const pause = ms => new Promise(done => setTimeout(done,ms));
const root = path.resolve(process.argv[2] ?? '');
assert.ok(process.argv[2] && process.platform === 'win32' && process.versions.node === '24.19.0','Explicit canonical Windows root and pinned Node required');
const setting = loadSettings(root), stateFile = scoped(root,setting.runtimeState), control = scoped(root,setting.controlRoot);
fs.mkdirSync(control,{recursive:true}); fs.mkdirSync(scoped(root,setting.logRoot),{recursive:true});
const token = randomUUID(), lockFile = path.join(control,'supervisor.lock.json');
let current, children = {}, stopping = false, lockOwned = false, logFailure;
const restarts = {api:[],web:[]};
const initialIdentity = processIdentity(process.pid);
function save(state, detail = {}) {
  atomicJson(stateFile,{ state, token, supervisor:initialIdentity, commit:current?.manifest.commit ?? null, buildId:current?.manifest.buildId ?? null, url:setting.runtime.webOrigin+'/', children:Object.fromEntries(Object.entries(children).map(([label,row]) => [label,{pid:row.child.pid,identity:row.identity}])), updatedAt:new Date().toISOString(), ...detail });
}
function claimLock() {
  claimSupervisorLock(lockFile,initialIdentity,token); lockOwned = true;
}
async function verifyDatabase(active) {
  verifyPostgresListener();
  const { Client } = createRequire(path.join(active.release,'api/package.json'))('pg');
  const db = active.manifest.database;
  const client = new Client({connectionString:`postgresql://${db.user}@${db.host}:${db.port}/${db.name}`,connectionTimeoutMillis:4000,query_timeout:5000,application_name:'sense-staging-readonly-preflight'});
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const actual = (await client.query(`SELECT current_database() AS name,current_user AS "user",host(inet_server_addr()) AS host,inet_server_port() AS port,(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid,(SELECT system_identifier::text FROM pg_control_system()) AS system`)).rows[0];
    assert.deepEqual(actual,db,'Canonical database identity differs');
    const directory=(await client.query("SELECT current_setting('data_directory') AS directory")).rows[0].directory;
    assert.equal(fs.realpathSync(directory).toLowerCase(),scoped(root,setting.postgresData).toLowerCase(),'Live PostgreSQL data directory differs');
    const ledger = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows.filter(row=>!row.rolled_back_at);
    assert.equal(ledger.length,active.manifest.migrations.length,'Canonical schema differs');
    assert.equal(new Set(ledger.map(row=>row.migration_name)).size,ledger.length);
    assert.deepEqual(ledger.map(row=>({name:row.migration_name,checksum:row.checksum})),active.manifest.migrations,'Canonical migration checksums differ');
    assert.ok(ledger.every(row=>row.finished_at),'Unfinished canonical migration');
    await client.query('ROLLBACK');
  } finally { await client.end(); }
}
function verifyPostgresListener() {
  const rows=listeners([setting.runtime.database.port]);assert.equal(rows.length,1,'Expected one canonical database listener');
  assert.equal(rows[0].LocalAddress,'127.0.0.1','Canonical database must be loopback-only');
  const identity=processIdentity(rows[0].OwningProcess);
  assert.equal(identity?.ExecutablePath?.toLowerCase(),path.join(setting.postgresBin,'postgres.exe').replaceAll('/','\\').toLowerCase(),'Database listener is not the expected PostgreSQL executable');
}
async function ensurePostgres() {
  if (listeners([setting.runtime.database.port]).length) return;
  const data = scoped(root,setting.postgresData);
  assert.equal(fs.realpathSync(data).toLowerCase(),data.toLowerCase(),'Canonical PostgreSQL data directory is redirected');
  const controlInfo = execFileSync(path.join(setting.postgresBin,'pg_controldata.exe'),[data],{encoding:'utf8',windowsHide:true});
  const fields=Object.fromEntries(controlInfo.split(/\r?\n/).filter(line=>line.includes(':')).map(line=>{const at=line.indexOf(':');return[line.slice(0,at).trim(),line.slice(at+1).trim()];}));
  assert.equal(fields['Database system identifier'],setting.runtime.database.system,'PostgreSQL on-disk system differs');
  assert.ok(['shut down','in production'].includes(fields['Database cluster state']),'Unexpected PostgreSQL recovery/control state');
  const configuredData=execFileSync(path.join(setting.postgresBin,'postgres.exe'),['-D',data,'-C','data_directory'],{encoding:'utf8',windowsHide:true}).trim();
  assert.equal(fs.realpathSync(configuredData).toLowerCase(),data.toLowerCase(),'PostgreSQL configuration redirects the data directory');
  for(const proc of postgresProcesses()) assert.ok(!proc.CommandLine?.replaceAll('/','\\').toLowerCase().includes(data.toLowerCase()),'Canonical data directory already has a PostgreSQL process');
  const pidFile = path.join(data,'postmaster.pid');
  if(fs.existsSync(pidFile)) {
    const pid = Number(fs.readFileSync(pidFile,'utf8').split(/\r?\n/)[0]);
    assert.ok(Number.isSafeInteger(pid) && pid > 0);
    assert.equal(processIdentity(pid),null,'PostgreSQL PID is still live; refusing another startup');
  }
  const log = path.join(scoped(root,setting.logRoot),`postgres-${Date.now()}.log`);
  execFileSync(path.join(setting.postgresBin,'pg_ctl.exe'),['-D',data,'-l',log,'-o',`-h 127.0.0.1 -p ${setting.runtime.database.port}`,'-w','start'],{encoding:'utf8',windowsHide:true,timeout:60000});
  verifyPostgresListener();
}
async function recoverOrphans(previous) {
  if(!previous?.supervisor || sameIdentity(processIdentity(previous.supervisor.ProcessId),previous.supervisor))return;
  assert.match(previous.commit??'',/^[a-f0-9]{40}$/);assert.match(previous.token??'',/^[a-f0-9-]{36}$/);
  const release=scoped(root,path.join(setting.releaseRoot,previous.commit)),executable=path.join(release,'runtime/node.exe');
  const candidates=executableProcesses(executable);
  for(const label of ['web','api']) {
    const entry=path.join(release,label==='api'?'api/dist/main.js':'runtime/server.mjs');
    const matching=candidates.filter(row=>row.CommandLine?.includes(entry) && row.CommandLine.includes('--sense-staging-owner='+previous.token));
    assert.ok(matching.length<=1,'Ambiguous prior owned children; refusing recovery');
    if(!matching.length)continue;
    const row=matching[0],saved=previous.children?.[label]?.identity;
    if(saved)assert.ok(sameIdentity(row,saved),'Prior child identity changed');
    assert.ok(Date.parse(row.Created)>=Date.parse(previous.supervisor.Created),'Prior child predates its supervisor');
    assert.ok(sameIdentity(processIdentity(row.ProcessId),row),'Prior child changed during recovery');
    process.kill(row.ProcessId,'SIGTERM');
    for(let i=0;i<50 && sameIdentity(processIdentity(row.ProcessId),row);i++)await pause(100);
    assert.ok(!sameIdentity(processIdentity(row.ProcessId),row),'Prior owned child did not stop');
  }
}
function childEnvironment(active) {
  const safe = Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
  const { parse } = createRequire(path.join(active.release,'api/package.json'))('dotenv');
  const secret = parse(fs.readFileSync(scoped(root,setting.runtime.environmentFile)));
  assert.deepEqual(Object.keys(secret),['EXTERNAL_SHARE_SECRET'],'Unexpected staging secret fields');
  assert.ok(secret.EXTERNAL_SHARE_SECRET.length >= 32);
  const db = active.manifest.database;
  const nas=scoped(root,setting.runtime.nasRoot);
  assert.equal(fs.realpathSync(nas).toLowerCase(),nas.toLowerCase(),'Canonical NAS directory is missing or redirected');
  return { ...safe,NODE_ENV:'staging',PORT:String(setting.runtime.apiPort),API_LISTEN_HOST:'127.0.0.1',WEB_ORIGIN:setting.runtime.webOrigin,DATABASE_URL:`postgresql://${db.user}@${db.host}:${db.port}/${db.name}`,NAS_ROOT:scoped(root,setting.runtime.nasRoot),EXTERNAL_SHARE_SECRET:secret.EXTERNAL_SHARE_SECRET,SENSE_RELEASE_FILE:path.join(active.release,'private-manifest.json'),SENSE_RELEASE_ROOT:active.release,OWNER_BOOTSTRAP_EMAIL:'',OWNER_BOOTSTRAP_SECRET:'',BREVO_API_KEY:'',BREVO_SENDER_EMAIL:'',BREVO_SENDER_NAME:'',EMAIL_VERIFICATION_SECRET:'',TIME_ACCOUNTING_RECEIVER_URL:'',TIME_ACCOUNTING_RECEIVER_TOKEN:'' };
}
async function launch(label) {
  const port = label === 'api' ? setting.runtime.apiPort : setting.runtime.webPort;
  assert.equal(listeners([port]).length,0,'Configured port occupied; refusing an unrelated process');
  const entry = label === 'api' ? path.join(current.release,'api/dist/main.js') : path.join(current.release,'runtime/server.mjs');
  const logDir = scoped(root,setting.logRoot), stamp = `${Date.now()}-${label}`;
  save('STARTING',{launching:label});
  const child=spawn(process.execPath,[entry,'--sense-staging-owner='+token],{cwd:label==='api'?path.join(current.release,'api'):path.join(current.release,'web'),env:childEnvironment(current),shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const row={child,identity:null,exited:false,error:null}; children[label]=row;
  child.once('exit',()=>{row.exited=true;});child.once('error',error=>{row.error=error;row.exited=true;});
  captureLog(child.stdout,path.join(logDir,stamp+'.out.log'),error=>{logFailure=error;});
  captureLog(child.stderr,path.join(logDir,stamp+'.err.log'),error=>{logFailure=error;});
  await pause(100); assert.ok(child.pid && !childFinished(row),'Owned child exited during launch');
  row.identity=processIdentity(child.pid);
  assert.ok(children[label].identity,'Owned child identity unavailable');
  save('STARTING',{launching:label});
  const endpoint=label==='api'?`http://127.0.0.1:${port}/api/v1/health/ready`:setting.runtime.webOrigin+'/healthz';
  for(let i=0;i<100;i++) {
    assert.ok(!childFinished(row),'Owned child exited before readiness');
    try { if((await fetch(endpoint,{signal:AbortSignal.timeout(1000),redirect:'error'})).status===200) { ownsListeners(listeners([port]),[[port,child.pid]]);return; } } catch { /* Finite readiness polling; never respawn here. */ }
    await pause(200);
  }
  throw new Error('Owned child readiness timed out');
}
async function stopChild(label) {
  const row=children[label]; if(!row)return;
  if(!childFinished(row) && sameIdentity(processIdentity(row.child.pid),row.identity)) {
    row.child.kill('SIGTERM');
    for(let i=0;i<50 && !childFinished(row);i++)await pause(100);
    assert.ok(childFinished(row),'Owned child did not stop');
  } else if(!childFinished(row)) assert.equal(processIdentity(row.child.pid),null,'Child PID identity differs; refusing stop');
  delete children[label];
}
async function stopChildren(){await stopChild('web');await stopChild('api');}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stopping=true;});
try {
  claimLock(); current=loadActive(root);
  if(fs.existsSync(stateFile)){const previous=JSON.parse(fs.readFileSync(stateFile));fs.copyFileSync(stateFile,stateFile+'.preserved-'+Date.now(),fs.constants.COPYFILE_EXCL);await recoverOrphans(previous);}
  save('STARTING');
  assert.equal(listeners([59442,59443]).length,0,'Canonical app ports occupied');
  await ensurePostgres(); await verifyDatabase(current); await launch('api');await launch('web');save('READY');
  let ticks=0;
  while(!stopping) {
    await pause(2500);
    if(logFailure)throw logFailure;
    const logBytes=fs.readdirSync(scoped(root,setting.logRoot),{withFileTypes:true}).filter(row=>row.isFile()).reduce((sum,row)=>sum+fs.statSync(path.join(scoped(root,setting.logRoot),row.name)).size,0);
    assert.ok(logBytes<2*1024**3,'Staging log budget exhausted; preserve/archive logs before restarting');
    const requestFile=path.join(control,'request.json');
    if(fs.existsSync(requestFile)) { const request=JSON.parse(fs.readFileSync(requestFile));if(request.token===token && request.command==='stop'){fs.renameSync(requestFile,`${requestFile}.processed-${Date.now()}`);stopping=true;break;} }
    const pointer=JSON.parse(fs.readFileSync(scoped(root,setting.activePointer)));
    if(pointer.commit!==current.manifest.commit) { const next=loadActive(root);await verifyDatabase(next);await stopChildren();current=next;await launch('api');await launch('web');save('READY'); }
    else assert.deepEqual(pointer,current.pointer,'Same-commit release approval changed');
    for(const label of ['api','web'])if(childFinished(children[label])){const delay=restartDelay(restarts[label],Date.now());save('RECOVERING',{failedChild:label,retryAfterMs:delay});delete children[label];await pause(delay);await ensurePostgres();await verifyDatabase(current);await launch(label);save('READY');}
    try { ownsListeners(listeners([59442,59443]),[[59442,children.api.child.pid],[59443,children.web.child.pid]]); }
    catch(error) {
      // A synchronous Windows query can observe termination before Node delivers
      // the exit event. Recover a proven absent child on the next loop; a live
      // process with different identity or unexpected listener still fails closed.
      let exited=false;
      for(const label of ['api','web']) if(observeChildExit(children[label],processIdentity(children[label].child.pid))) exited=true;
      if(!exited)throw error;
      continue;
    }
    if(++ticks%12===0) { const checked=loadActive(root);assert.deepEqual(checked.pointer,current.pointer,'Release approval changed');await verifyDatabase(current);assert.deepEqual(inventory(current.release),{files:current.manifest.files,links:current.manifest.links},'Deployed artifact changed');save('READY'); }
  }
  await stopChildren();save('STOPPED');
} catch(error) { try{await stopChildren();}catch(stopError){process.stderr.write(stopError.message+'\n');} if(lockOwned)save('REQUIRES_ACTION',{error:error.message});else process.stderr.write(error.message+'\n');process.exitCode=1; }
finally { if(lockOwned && fs.existsSync(lockFile)){const record=JSON.parse(fs.readFileSync(lockFile));if(record.token===token)fs.renameSync(lockFile,`${lockFile}.closed-${Date.now()}`);} }

export const supervisorSource = fileURLToPath(import.meta.url);
