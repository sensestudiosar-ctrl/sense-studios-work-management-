import assert from 'node:assert/strict';
import test from 'node:test';
import {progressLines,progressPrefix} from './browser-progress.mjs';
test('progress forwards only complete bounded metadata and retains redaction',()=>{
  const output=[],feed=progressLines(value=>output.push(value),value=>value.replaceAll('learning','[REDACTED]'));
  feed(Buffer.from('untrusted stdout test-secret\n'+progressPrefix+'{"event":"begin","file":"learning.spec.ts","project":"desktop-'));
  assert.equal(output.length,0);
  feed(Buffer.from('chromium","line":18,"ignored":"payload"}\n'));
  assert.equal(output.length,1);assert.ok(output[0].includes('[REDACTED]'));assert.ok(!output[0].includes('ignored'));assert.ok(!output[0].includes('payload'));
});
test('malformed, oversized and non-test markers cannot become progress',()=>{
  const output=[],feed=progressLines(value=>output.push(value),value=>value);
  for(const value of ['{oops}',JSON.stringify({event:'begin',file:'../secret.txt'}),JSON.stringify({event:'other',file:'test.spec.ts'}),JSON.stringify({event:'end',file:'test.spec.ts',project:'x'.repeat(3000)})])feed(Buffer.from(progressPrefix+value+'\n'));
  feed(Buffer.from('x'.repeat(70000)));feed(Buffer.from('\n'));
  assert.deepEqual(output,[]);
});
test('forged metadata cannot carry nested output or arbitrary scalar payloads',()=>{
  const output=[],feed=progressLines(value=>output.push(value),value=>value);
  const good={event:'end',file:'learning.spec.ts',project:'desktop-chromium',line:18,status:'passed',durationMs:10};
  for(const delta of[{project:{request:'private'}},{project:'private-payload'},{line:'private-payload'},{line:-1},{status:{request:'private'}},{status:'private-payload'},{durationMs:{request:'private'}},{durationMs:-1}])feed(Buffer.from(progressPrefix+JSON.stringify({...good,...delta})+'\n'));
  assert.deepEqual(output,[]);
  feed(Buffer.from(progressPrefix+JSON.stringify({...good,event:'begin',status:{private:true},durationMs:{private:true}})+'\n'));
  assert.equal(output.length,1);assert.ok(!output[0].includes('private'));assert.ok(!output[0].includes('status'));
});
