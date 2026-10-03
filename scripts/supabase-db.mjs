import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const operation = process.argv[2];
if (!['push', 'lint'].includes(operation)) {
  console.error('Usage: node scripts/supabase-db.mjs <push|lint> [--dry-run]');
  process.exit(1);
}

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('SUPABASE_DB_PASSWORD is required.');
  process.exit(1);
}

const encodedPassword = encodeURIComponent(password);
const databaseUrl =
  `postgresql://postgres.ycnghdqpzzhrrifcylnw:${encodedPassword}` +
  '@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require';
const cliPath = fileURLToPath(
  new URL('../node_modules/supabase/dist/supabase.js', import.meta.url)
);
const args =
  operation === 'push'
    ? [
        cliPath,
        'db',
        'push',
        '--db-url',
        databaseUrl,
        '--yes',
        ...(process.argv.includes('--dry-run') ? ['--dry-run'] : [])
      ]
    : [
        cliPath,
        'db',
        'lint',
        '--db-url',
        databaseUrl,
        '--schema',
        'public',
        '--level',
        'warning',
        '--fail-on',
        'error'
      ];

const result = spawnSync(process.execPath, args, {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  encoding: 'utf8',
  env: process.env
});

function scrub(value = '') {
  return value
    .replaceAll(databaseUrl, '[redacted database URL]')
    .replaceAll(password, '[redacted]')
    .replaceAll(encodedPassword, '[redacted]');
}

process.stdout.write(scrub(result.stdout));
process.stderr.write(scrub(result.stderr));
process.exit(result.status ?? 1);
