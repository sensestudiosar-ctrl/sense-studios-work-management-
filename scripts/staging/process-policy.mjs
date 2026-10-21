import assert from 'node:assert/strict';
import fs from 'node:fs';

export function childFinished(row) {
  return Boolean(row.exited || row.error || row.child.exitCode !== null || row.child.signalCode !== null);
}
export function restartDelay(attempts, now) {
  while(attempts.length && attempts[0] < now-600000)attempts.shift();
  assert.ok(attempts.length<3,'Owned child restart budget exhausted (3 per 10 minutes)');
  attempts.push(now);
  return Math.min(10000,1000*2**(attempts.length-1));
}
// Keep existing evidence. Exhausting a log budget requires an operator to archive it.
export function captureLog(stream, file, onFailure, maximum=32*1024**2) {
  const descriptor=fs.openSync(file,'wx');let bytes=0,failed=false;
  stream.on('data',chunk=>{
    const data=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    try {
      const remaining=Math.max(0,maximum-bytes);
      if(remaining)fs.writeSync(descriptor,data.subarray(0,remaining));
      bytes+=data.length;
      if(bytes>maximum && !failed){failed=true;onFailure(new Error('Owned child log budget exhausted'));}
    }catch(error){if(!failed){failed=true;onFailure(error);}}
  });
  stream.once('close',()=>fs.closeSync(descriptor));
  stream.on('error',error=>{if(!failed){failed=true;onFailure(error);}});
}
