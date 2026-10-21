import path from 'node:path';
export const progressPrefix = 'SENSE_BROWSER_PROGRESS ';
export default class BrowserProgress {
  onTestBegin(test) { this.emit('begin', test); }
  onTestEnd(test, result) { this.emit('end', test, result); }
  emit(event, test, result) {
    // Fixed test metadata only: never emit requests, environment or test output.
    process.stdout.write('\n'+progressPrefix+JSON.stringify({event,file:path.basename(test.location.file),line:test.location.line,project:test.parent.project()?.name??'',...(result?{status:result.status,durationMs:result.duration}: {})})+'\n');
  }
}
export function progressLines(write, redact) {
  let pending = '';
  return chunk => {
    pending += chunk.toString('utf8');
    const lines = pending.split('\n'); pending = lines.pop();
    for (const line of lines) if (line.startsWith(progressPrefix) && line.length <= 2048) {
      try {
        const row = JSON.parse(line.slice(progressPrefix.length));
        if (!['begin','end'].includes(row.event) || typeof row.file !== 'string' || row.file.length>120 || !/^[\w.-]+\.spec\.ts$/.test(row.file)) continue;
        if (!Number.isSafeInteger(row.line) || row.line<1 || row.line>10000000 || !['','identity-desktop','desktop-chromium','mobile-chromium'].includes(row.project)) continue;
        if (row.event==='end' && (!['passed','failed','timedOut','skipped','interrupted'].includes(row.status) || !Number.isFinite(row.durationMs) || row.durationMs<0)) continue;
        write(redact(progressPrefix+JSON.stringify({event:row.event,file:row.file,line:row.line,project:row.project,...(row.event==='end'?{status:row.status,durationMs:row.durationMs}:{})}))+'\n');
      } catch { /* A diagnostic line never changes acceptance results. */ }
    }
    if (pending.length > 65536) pending = '';
  };
}
