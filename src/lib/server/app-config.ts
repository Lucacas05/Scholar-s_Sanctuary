import { db } from "@/lib/server/db";

export type AppConfigKey =
  | "published-scene-maps"
  | "wardrobe-config"
  | "mission-definitions"
  | "achievement-definitions";

const selectAppConfigStatement = db.prepare(
  "SELECT value_json AS valueJson, updated_at AS updatedAt FROM app_config WHERE key = ?",
);
const upsertAppConfigStatement = db.prepare(`
  INSERT INTO app_config (key, value_json, updated_at)
  VALUES (?, ?, datetime('now'))
  ON CONFLICT(key) DO UPDATE SET
    value_json = excluded.value_json,
    updated_at = datetime('now')
`);
const deleteAppConfigStatement = db.prepare(
  "DELETE FROM app_config WHERE key = ?",
);

export interface AppConfigRecord {
  value: unknown;
  updatedAt: string | null;
}

export function readAppConfig(key: AppConfigKey): AppConfigRecord | null {
  const row = selectAppConfigStatement.get(key) as
    | { valueJson: string; updatedAt: string | null }
    | undefined;

  if (!row) {
    return null;
  }

  try {
    return {
      value: JSON.parse(row.valueJson),
      updatedAt: row.updatedAt,
    };
  } catch {
    return null;
  }
}

export function writeAppConfig(key: AppConfigKey, value: unknown) {
  upsertAppConfigStatement.run(key, JSON.stringify(value));
  return readAppConfig(key);
}

export function deleteAppConfig(key: AppConfigKey) {
  deleteAppConfigStatement.run(key);
}
