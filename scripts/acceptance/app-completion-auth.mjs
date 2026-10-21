import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { existsSync,readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { sourceFingerprint, authAdapterFingerprint } from './app-completion-policy.mjs';
import { validateAuthAuthorization } from './app-completion-authorization.mjs';
const stage=process.argv[2];
if(stage==='--check'){await import('../../.env.checkpoint-tools/app-completion-acceptance/readiness.mjs');process.exit(0);}
assert.ok(['setup','tasks','cleanup'].includes(stage),'Use --check, setup, tasks, or cleanup');
const authorizationPath=resolve('.env.checkpoint-tools/app-completion-acceptance/approved-execution.json');
assert.ok(existsSync(authorizationPath),'Execution requires recorded explicit Owner approval; no operation performed');
const approval=JSON.parse(readFileSync(authorizationPath,'utf8'));
if(stage!=='setup')assert.ok(process.argv[3], 'Pass the exact run manifest');
const manifest=stage==='setup'?undefined:JSON.parse(readFileSync(resolve(process.argv[3]),'utf8'));
validateAuthAuthorization(approval,stage,{sourceHash:sourceFingerprint().hash,adapterHash:authAdapterFingerprint()},manifest);
if(stage==='cleanup'||stage==='tasks'){assert.ok(process.argv[3]);process.argv[2]=process.argv[3];}
if(stage==='tasks'){process.argv[3]='--stage';process.argv[4]='tasks';}
if(stage==='setup') {
  const pwsh='C:/Users/HI/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe';
  assert.ok(existsSync(pwsh),'Pinned PowerShell unavailable; STOP');
  const preflight=spawnSync(pwsh,['-NoProfile','-File',resolve('.env.checkpoint-tools/app-completion-acceptance/preflight.ps1'),'-Live'],{windowsHide:true,shell:false,stdio:'inherit'});
  assert.equal(preflight.status,0,'Read-only live preflight failed; no setup');
}
await import(`../../.env.checkpoint-tools/app-completion-acceptance/${stage==='tasks'?'run-task-integration':stage}.mjs`);
