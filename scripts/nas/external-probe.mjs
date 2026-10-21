import { parseArgs } from 'node:util';
import { isAbsolute, resolve } from 'node:path';
import { realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { recordMonitorState } from './monitor.mjs';

export async function checkExternalApp(origin, fetcher = fetch) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Supply one permanent HTTPS origin');
  try {
    const response = await fetcher(url.origin + '/api/v1/health/ready', { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000) });
    const body = await response.json();
    const ready = response.ok && body.status === 'ready' && body.dependencies?.database === 'ready';
    return { status: ready ? 'HEALTHY' : 'UNAVAILABLE', issues: ready ? [] : ['public-app-not-ready'] };
  } catch { return { status: 'UNAVAILABLE', issues: ['public-app-unreachable'] }; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { origin: { type: 'string' }, state: { type: 'string' } } });
    if (!values.state || !isAbsolute(values.state) || await realpath(resolve(values.state, '..')) !== resolve(values.state, '..')) throw new Error('Choose an absolute protected state file under an existing real directory');
    const state = await checkExternalApp(values.origin);
    if (await recordMonitorState(values.state, state)) console.info(JSON.stringify(state));
    if (state.status !== 'HEALTHY') process.exitCode = 1;
  } catch { console.error('External probe requires a valid HTTPS origin and private absolute state file.'); process.exitCode = 1; }
}
