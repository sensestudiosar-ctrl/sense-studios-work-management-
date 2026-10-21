import { spawn } from 'node:child_process';

// Each Linux CI fixture owns a new process group, including package-manager descendants.
export function startFixture(name, program, args, env, options = {}) {
  const grouped = process.platform !== 'win32';
  const child = spawn(program, args, {
    cwd: process.cwd(), env, shell: false, windowsHide: true,
    ...options, detached: grouped, stdio: ['ignore', 'pipe', 'pipe']
  });
  const service = { name, child, grouped, logs: [], startError: null, closed: false };
  service.completion = new Promise(resolve => child.once('close', () => { service.closed = true; resolve(); }));
  child.stdout.on('data', chunk => service.logs.push(chunk));
  child.stderr.on('data', chunk => service.logs.push(chunk));
  child.once('error', error => { service.startError = error; });
  return service;
}

function signalFixture(service, signal) {
  try {
    if (service.grouped) process.kill(-service.child.pid, signal);
    else if (service.child.exitCode === null && service.child.signalCode === null) service.child.kill(signal);
  } catch (error) { if (error.code !== 'ESRCH') throw error; }
}

async function waitForClose(service, timeoutMs) {
  if (service.closed) return true;
  let timer;
  try {
    return await Promise.race([
      service.completion.then(() => true),
      new Promise(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); })
    ]);
  } finally { clearTimeout(timer); }
}

export async function stopFixture(service, graceMs = 5000, forceMs = 5000) {
  if (!service?.child.pid || service.stopped) return;
  // An exited leader can leave live descendants holding its output pipes open.
  signalFixture(service, 'SIGTERM');
  await waitForClose(service, graceMs);
  // Also terminate descendants that closed their pipes but stayed in our owned group.
  signalFixture(service, 'SIGKILL');
  if (!await waitForClose(service, forceMs)) {
    service.child.stdout.destroy();
    service.child.stderr.destroy();
    service.child.unref();
    throw new Error(`${service.name} fixture did not close after bounded process cleanup.`);
  }
  service.stopped = true;
}
