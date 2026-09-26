import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = resolve(root, 'backend');
const env = { ...process.env, DEMO_MODE: 'true', HOST: '127.0.0.1', PORT: '4000', DATABASE_PATH: resolve(backend, '.data/campus-demo.sqlite') };
const migration = spawnSync(process.execPath, ['src/database/migrate.js'], { cwd: backend, env, stdio: 'inherit' });
if (migration.status !== 0) process.exit(migration.status ?? 1);
const api = spawn(process.execPath, ['src/server.js'], { cwd: backend, env, stdio: 'inherit' });
const portal = await createServer({ root: resolve(root, 'apps/portal'), configFile: resolve(root, 'apps/portal/vite.config.ts') });
await portal.listen();
portal.printUrls();
console.log('Local demo only. All profiles and content are synthetic. Ctrl+C stops both servers.');
let closing = false;
async function close(code = 0) {
  if (closing) return;
  closing = true;
  api.kill(); await portal.close(); process.exit(code);
}
api.on('exit', (code) => { if (!closing) void close(code ?? 1); });
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
