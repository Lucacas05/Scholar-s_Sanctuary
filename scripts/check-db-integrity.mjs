import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

function resolveDatabasePath() {
  const configuredPath = process.env.LUMINA_DB_PATH;

  if (configuredPath) {
    return isAbsolute(configuredPath)
      ? configuredPath
      : resolve(process.cwd(), configuredPath);
  }

  return resolve(process.cwd(), "data/sanctuary.db");
}

const dbPath = resolveDatabasePath();

if (!existsSync(dbPath)) {
  console.log(
    `[db:check] Database not found at ${dbPath}. Skipping preflight.`,
  );
  process.exit(0);
}

const database = new Database(dbPath, { readonly: true });

try {
  database.pragma("foreign_keys = ON");

  if (database.pragma("foreign_keys", { simple: true }) !== 1) {
    throw new Error("SQLite foreign_keys pragma is disabled.");
  }

  const integrityResult = database
    .prepare("PRAGMA integrity_check")
    .pluck()
    .get();

  if (integrityResult !== "ok") {
    throw new Error(
      `PRAGMA integrity_check failed: ${String(integrityResult)}`,
    );
  }

  const foreignKeyViolations = database
    .prepare("PRAGMA foreign_key_check")
    .all();

  if (foreignKeyViolations.length > 0) {
    console.error("[db:check] Foreign key violations detected:");
    console.error(JSON.stringify(foreignKeyViolations, null, 2));
    process.exit(1);
  }

  console.log(`[db:check] OK (${dbPath})`);
} finally {
  database.close();
}
