import { getDatabasePath, openDatabase } from './database.js';

const database = openDatabase();

try {
  const integrity = database.prepare('PRAGMA integrity_check').all();
  const foreignKeyFailures = database.prepare('PRAGMA foreign_key_check').all();
  const migration = database.prepare(
    'SELECT version, name, applied_at FROM schema_migrations ORDER BY version DESC LIMIT 1'
  ).get();

  if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
    throw new Error(`Integrity check failed: ${JSON.stringify(integrity)}`);
  }
  if (foreignKeyFailures.length > 0) {
    throw new Error(`Foreign-key check failed: ${JSON.stringify(foreignKeyFailures)}`);
  }

  console.log(`Database valid: ${getDatabasePath()}`);
  console.log(`Latest migration: ${migration.version} (${migration.name})`);
} finally {
  database.close();
}