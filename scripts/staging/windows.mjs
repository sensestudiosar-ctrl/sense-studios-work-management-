import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const psQuote = value => "'" + String(value).replaceAll("'", "''") + "'";
export function powershell(code) {
  return execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop';"+code],{ encoding:'utf8', windowsHide:true, timeout:30000 }).trim();
}
// Retry only a timed-out, read-only OS query, once. Mutations and the mutex
// claimant use powershell/execFileSync directly and must never be replayed here.
export function inspectWindows(code, run = powershell) {
  try { return run(code); }
  catch (error) {
    if (error.code !== 'ETIMEDOUT' || error.syscall !== 'spawnSync powershell.exe') throw error;
    return run(code);
  }
}
export function processIdentity(pid) {
  assert.ok(Number.isSafeInteger(pid) && pid > 0);
  const text = inspectWindows(`$p=Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; if($null -eq $p){'null'}else{$p | Select-Object ProcessId,ExecutablePath,CommandLine,@{n='Created';e={$_.CreationDate.ToUniversalTime().ToString('o')}} | ConvertTo-Json -Compress}`);
  return JSON.parse(text);
}
export function listeners(ports) {
  assert.ok(ports.every(port => Number.isInteger(port) && port > 0 && port < 65536));
  return JSON.parse(inspectWindows(`$p=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -in ${ports.join(',')}} | Select-Object LocalAddress,LocalPort,OwningProcess);ConvertTo-Json -InputObject $p -Compress`));
}
export function sameIdentity(a,b) { return Boolean(a && b && JSON.stringify(a) === JSON.stringify(b)); }
// The OS releases this mutex if a claimant dies, including during a stale-lock recovery.
export function claimSupervisorLock(file, identity, token) {
  assert.ok(identity?.ProcessId && identity?.ExecutablePath && identity?.Created,'Complete supervisor process identity required');
  const name = 'Global\\SenseStaging-' + createHash('sha256').update(file.toLowerCase()).digest('hex');
  const record = Buffer.from(JSON.stringify({kind:'sense-staging-supervisor',identity,token})).toString('base64');
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./claim-lock.ps1',import.meta.url)),'-LockFile',file,'-Record',record,'-MutexName',name],{encoding:'utf8',windowsHide:true,timeout:30000});
}
export function postgresProcesses() {
  return JSON.parse(inspectWindows("$p=@(Get-CimInstance Win32_Process -Filter \"Name = 'postgres.exe'\" | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine);ConvertTo-Json -InputObject $p -Compress"));
}
export function executableProcesses(executable) {
  return JSON.parse(inspectWindows(`$p=@(Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath -eq ${psQuote(executable)}} | Select-Object ProcessId,ExecutablePath,CommandLine,@{n='Created';e={$_.CreationDate.ToUniversalTime().ToString('o')}});ConvertTo-Json -InputObject $p -Compress`));
}
export function ownsListeners(rows, expected) {
  for (const [port,pid] of expected) {
    const matching = rows.filter(row => row.LocalPort === port);
    assert.equal(matching.length,1,'Listener is absent or duplicated');
    assert.equal(matching[0].LocalAddress,'127.0.0.1','Listener is not loopback-only');
    assert.equal(matching[0].OwningProcess,pid,'Listener belongs to a different process');
  }
}
