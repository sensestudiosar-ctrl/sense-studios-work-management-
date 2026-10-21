import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { startFixture, stopFixture } from './fixture-process.mjs';

test('owned fixture closes and releases streams after normal shutdown', async () => {
  const service=startFixture('normal',process.execPath,['-e',"process.stdout.write('ready');setInterval(()=>{},1000)"],process.env);
  await once(service.child.stdout,'data');
  await stopFixture(service,1000,2000);
  assert.equal(service.closed,true);
  assert.equal(service.child.stdout.destroyed,true);
});

test('cleanup force-stops a fixture that ignores graceful shutdown', async () => {
  const service=startFixture('ignores TERM',process.execPath,['-e',"process.on('SIGTERM',()=>{});process.stdout.write('ready');setInterval(()=>{},1000)"],process.env);
  await once(service.child.stdout,'data');
  await stopFixture(service,100,2000);
  assert.equal(service.closed,true);
});

test(process.platform==='win32' ? 'Windows fixtures use direct child ownership; Linux descendant case runs in CI' : 'Linux cleanup kills a descendant even after its leader exits', async () => {
  // Linux CI has process groups; Windows still exercises direct-child cleanup above.
  if(process.platform==='win32') { assert.equal(process.platform,'win32'); return; }
  const descendant="process.on('SIGTERM',()=>{});process.stdout.write('descendant-ready');setInterval(()=>{},1000)";
  const parent=`const {spawn}=require('node:child_process');spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:['ignore',1,2]});process.exit(0);`;
  const service=startFixture('exited leader',process.execPath,['-e',parent],process.env);
  try {
    await once(service.child.stdout,'data');
    if(service.child.exitCode===null)await once(service.child,'exit');
    assert.equal(service.closed,false,'Descendant must retain the leader output pipe before cleanup');
    await stopFixture(service,100,2000);
    assert.equal(service.closed,true);
  } finally { await stopFixture(service,100,2000); }
});
