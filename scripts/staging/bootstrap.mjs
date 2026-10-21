import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadActive, fileHash } from './manifest.mjs';
import fs from 'node:fs';
import { restartDelay } from './process-policy.mjs';

assert.ok(process.argv[2],'Explicit canonical root required');
const root=path.resolve(process.argv[2]);
assert.equal(process.versions.node,'24.19.0');
const env=Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
const restarts=[];
try {
  while(true) {
    const active=loadActive(root),executable=path.join(active.release,'runtime/node.exe');
    assert.equal(fileHash(executable),active.manifest.node.sha256,'Release Node executable changed');
    const code=await new Promise((resolve,reject)=>{
      const child=spawn(executable,[path.join(active.release,'runtime/supervisor.mjs'),root],{cwd:active.release,env,windowsHide:true,stdio:'inherit'});
      child.once('error',reject);child.once('exit',(code,signal)=>resolve(code??(signal?1:0)));
    });
    if(code===0)break;
    const state=JSON.parse(fs.readFileSync(path.join(root,active.setting.runtimeState),'utf8'));
    assert.notEqual(state.state,'REQUIRES_ACTION','Supervisor requires operator action; refusing automatic retry');
    await new Promise(done=>setTimeout(done,restartDelay(restarts,Date.now())));
  }
} catch(error) { process.stderr.write(error.message+'\n');process.exitCode=1; }
