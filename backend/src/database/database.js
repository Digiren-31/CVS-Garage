import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const defaultDatabasePath = fileURLToPath(
  new URL('../../.data/cvs-garage.sqlite', import.meta.url)
);

export function getDatabasePath() {
  return resolve(process.env.DATABASE_PATH || defaultDatabasePath);
}

export function openDatabase() {
  const databasePath = getDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec('PRAGMA foreign_keys = ON;');
  database.exec('PRAGMA busy_timeout = 5000;');
  database.exec('PRAGMA journal_mode = WAL;');
  return database;
}