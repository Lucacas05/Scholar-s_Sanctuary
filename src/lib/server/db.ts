import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import schema from "./schema.sql?raw";

const dbUrl = new URL("../../../data/sanctuary.db", import.meta.url);
const globalForDb = globalThis as typeof globalThis & {
  __luminaDb?: Database.Database;
};

function createDatabase() {
  const dbPath = fileURLToPath(dbUrl);
  mkdirSync(dirname(dbPath), { recursive: true });

  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.exec(schema);

  return database;
}

export const db = globalForDb.__luminaDb ?? createDatabase();

if (!globalForDb.__luminaDb) {
  globalForDb.__luminaDb = db;
}
