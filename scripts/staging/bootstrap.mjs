import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadActive, fileHash } from './manifest.mjs';

assert.ok(process.argv[2],'Explicit canonical root required');
const root=path.resolve(process.argv[2]),active=loadActive(root);
assert.equal(process.versions.node,'24.19.0');
const executable=path.join(active.release,'runtime/node.exe');
assert.equal(fileHash(executable),active.manifest.node.sha256,'Release Node executable changed');
const env=Object.fromEntries(['PATH','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'].filter(key=>process.env[key]).map(key=>[key,process.env[key]]));
const child=spawn(executable,[path.join(active.release,'runtime/supervisor.mjs'),root],{cwd:active.release,env,windowsHide:true,stdio:'inherit'});
child.once('error',error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
child.once('exit',(code,signal)=>{process.exitCode=code??(signal?1:0);});
