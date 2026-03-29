import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import schema from "./schema.sql?raw";

const dbUrl = new URL("../../../data/sanctuary.db", import.meta.url);
const globalForDb = globalThis as typeof globalThis & {
  __luminaDb?: Database.Database;
};

function getColumnNames(database: Database.Database, tableName: string) {
  return new Set(
    (
      database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
        name: string;
      }>
    ).map((column) => column.name),
  );
}

function ensureColumn(
  database: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
) {
  const columns = getColumnNames(database, tableName);
  if (columns.has(columnName)) {
    return;
  }

  database.exec(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
  );
}

function runMigrations(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      client_session_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      room_code TEXT NOT NULL,
      room_kind TEXT NOT NULL,
      focus_duration_seconds INTEGER NOT NULL,
      break_duration_seconds INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, client_session_id)
    );

    CREATE TABLE IF NOT EXISTS achievement_unlocks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      achievement_id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, achievement_id)
    );
  `);

  ensureColumn(database, "users", "last_seen_at", "TEXT");
  ensureColumn(database, "rooms", "privacy", "TEXT NOT NULL DEFAULT 'private'");
  ensureColumn(database, "room_invitations", "invite_code", "TEXT");
  ensureColumn(database, "room_invitations", "expires_at", "TEXT");
  ensureColumn(database, "room_invitations", "accepted_at", "TEXT");
  ensureColumn(database, "room_invitations", "revoked_at", "TEXT");

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_room_invitations_invite_code
      ON room_invitations(invite_code)
      WHERE invite_code IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_room_members_user
      ON room_members(user_id);

    CREATE INDEX IF NOT EXISTS idx_room_invitations_room_status
      ON room_invitations(room_code, status);

    CREATE INDEX IF NOT EXISTS idx_room_invitations_invitee_status
      ON room_invitations(invitee_id, status);

    CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_completed
      ON pomodoro_sessions(user_id, completed_at DESC);

    CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_room
      ON pomodoro_sessions(room_code, completed_at DESC);

    CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user
      ON achievement_unlocks(user_id, unlocked_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_achievement_unlocks_user_achievement
      ON achievement_unlocks(user_id, achievement_id);
  `);

  const rows = database
    .prepare(
      "SELECT id FROM room_invitations WHERE invite_code IS NULL OR invite_code = ''",
    )
    .all() as { id: string }[];

  const fillCode = database.prepare(
    "UPDATE room_invitations SET invite_code = ? WHERE id = ?",
  );
  for (const row of rows) {
    fillCode.run(crypto.randomUUID().slice(0, 10).toUpperCase(), row.id);
  }
}

function createDatabase() {
  const dbPath = fileURLToPath(dbUrl);
  mkdirSync(dirname(dbPath), { recursive: true });

  const database = new Database(dbPath);
  database.pragma("journal_mode = WAL");
  database.exec(schema);
  runMigrations(database);

  return database;
}

export const db = globalForDb.__luminaDb ?? createDatabase();

if (!globalForDb.__luminaDb) {
  globalForDb.__luminaDb = db;
}
