import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDatabase } from './database/database.js';
import { seedDemo } from './database/seed-demo.js';

const demo = process.env.DEMO_MODE === 'true';
const host = process.env.HOST || '127.0.0.1';
if (demo && (!['127.0.0.1', 'localhost', '::1'].includes(host) || process.env.NODE_ENV === 'production')) {
  throw new Error('Demo mode must run locally and cannot be used in production.');
}
const database = openDatabase();
if (demo) seedDemo(database);
const app = createApp(database, { demo });
const dist = fileURLToPath(new URL('../../apps/portal/dist/', import.meta.url));
if (existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(`${dist}/index.html`); });
}
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, host, () => console.log(`CVS Garage API: http://${host}:${port}${demo ? ' (synthetic local demo)' : ''}`));
function shutdown() { server.close(() => { database.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;

