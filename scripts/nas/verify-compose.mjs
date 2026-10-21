import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { repositoryRoot } from './config.mjs';
import { run } from './operations.mjs';

// Synthetic config only. This command renders Compose; it never starts or pulls services.
const env = { ...process.env, ...parseEnv(await readFile(resolve(repositoryRoot, 'infra/nas.production.env.example'), 'utf8')) };
for (const key of Object.keys(env)) if (key.startsWith('NAS_') && /REPLACE|YOUR_/.test(env[key])) env[key] = 'synthetic-verification-value';
Object.assign(env, { NAS_PROJECT: 'sense-compose-verification', NAS_WEB_ORIGIN: 'https://work.sense-ci.invalid', NAS_API_IMAGE: 'sense-nas-ci-api:verification', NAS_WEB_IMAGE: 'sense-nas-ci-web:verification', NAS_POSTGRES_IMAGE: 'postgres:17.10-alpine3.24', NAS_TUNNEL_IMAGE: 'cloudflare/cloudflared:verification', NAS_BACKUP_IMAGE: 'restic/restic:verification' });
for (const key of ['NAS_DOCUMENTS_DIR', 'NAS_POSTGRES_DIR', 'NAS_BACKUP_DIR', 'NAS_BACKUP_SSH_DIR', 'NAS_ASSETS_DIR']) env[key] = '/synthetic-nas/' + key.toLowerCase();
const prefix = ['compose', '--project-name', 'sense-compose-verification', '--file', resolve(repositoryRoot, 'infra/compose.production.yaml'), '--profile', '*', 'config'];
await run('docker', prefix.concat('--quiet'), { env });
const config = JSON.parse(await run('docker', prefix.concat('--format', 'json'), { env }));
for (const service of Object.values(config.services)) {
  assert.equal(service.ports?.length ?? 0, 0);
  assert.notEqual(service.network_mode, 'host');
  assert.notEqual(service.privileged, true);
  // Compose's JSON encoder may omit an explicit false boolean. A long bind
  // object must still exist and an enabled create_host_path remains forbidden.
  for (const mount of service.volumes ?? []) if (mount.type === 'bind') {
    assert.ok(mount.bind && typeof mount.bind === 'object');
    assert.equal(mount.bind.create_host_path ?? false, false);
  }
}
assert.deepEqual(Object.keys(config.services.db.networks), ['database']);
assert.deepEqual(Object.keys(config.services.tunnel.networks), ['ingress']);
assert.equal(config.networks.database.internal, true);
assert.equal(config.networks.application.internal, true);
assert.equal(config.services.api.environment.NODE_ENV, 'production');
assert.equal(config.services.api.environment.NAS_ROOT, '/data/documents');
assert.equal(config.services.api.environment.TRUST_PROXY_HOPS, '1');
assert.equal(config.services.worker.environment.DATABASE_POOL_MAX, '4');
assert.deepEqual(config.services.migrate.profiles, ['release']);
assert.equal(config.services.api.depends_on.migrate, undefined);
assert.equal(config.services.migrate.environment.DATABASE_URL, undefined);
assert.ok(config.services.api.environment.EXTERNAL_SHARE_SECRET);
assert.ok(config.services.backup.volumes.find((mount) => mount.target === '/data/documents').read_only);
assert.ok(config.services.web.volumes.find((mount) => mount.target === '/srv/sense/static-history/assets').read_only);
console.info(JSON.stringify({ status: 'PASS', boundary: 'Rendered synthetic Compose only; no engine, image startup, real credentials or NAS filesystem access.' }));
