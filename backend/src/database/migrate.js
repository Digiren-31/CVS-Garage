import { readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabasePath, openDatabase } from './database.js';

const migrationsDirectory = fileURLToPath(
  new URL('../../database/migrations', import.meta.url)
);
const migrationPattern = /^(\d+)_.*\.sqlite\.sql$/;
const database = openDatabase();

function hasMigrationTable() {
  const row = database.prepare(
    "SELECT 1 AS found FROM sqlite_schema WHERE type = 'table' AND name = 'schema_migrations'"
  ).get();
  return row?.found === 1;
}

function appliedVersions() {
  if (!hasMigrationTable()) {
    return new Set();
  }

  return new Set(
    database.prepare('SELECT version FROM schema_migrations').all().map((row) => row.version)
  );
}

try {
  const applied = appliedVersions();
  const migrations = readdirSync(migrationsDirectory)
    .filter((fileName) => migrationPattern.test(fileName))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));

  for (const fileName of migrations) {
    const version = Number(fileName.match(migrationPattern)[1]);
    if (applied.has(version)) {
      continue;
    }

    database.exec(readFileSync(resolve(migrationsDirectory, fileName), 'utf8'));

    const registered = database.prepare(
      'SELECT 1 AS found FROM schema_migrations WHERE version = ?'
    ).get(version);
    if (registered?.found !== 1) {
      throw new Error(`${fileName} did not register schema migration ${version}`);
    }

    console.log(`Applied ${basename(fileName)}`);
  }

  console.log(`Database ready: ${getDatabasePath()}`);
} finally {
  database.close();
}