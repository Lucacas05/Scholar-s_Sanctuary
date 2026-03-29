import { db } from "@/lib/server/db";

const selectUserStateStatement = db.prepare(
  "SELECT state_json AS stateJson FROM users WHERE id = ?",
);

export interface UserStateSnapshot {
  onboardingCompleted: boolean;
  onboardingGoal: string;
  preferredStartPath: string;
  stateJson: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getUserStateSnapshot(userId: string): UserStateSnapshot {
  const row = selectUserStateStatement.get(userId) as
    | { stateJson: string | null }
    | undefined;
  let parsed: unknown = null;

  if (row?.stateJson) {
    try {
      parsed = JSON.parse(row.stateJson);
    } catch {
      parsed = null;
    }
  }

  const preferredStartPath =
    isRecord(parsed) &&
    typeof parsed.preferredStartPath === "string" &&
    parsed.preferredStartPath.startsWith("/")
      ? parsed.preferredStartPath
      : "/biblioteca-compartida";

  return {
    onboardingCompleted:
      isRecord(parsed) && typeof parsed.onboardingCompleted === "boolean"
        ? parsed.onboardingCompleted
        : false,
    onboardingGoal:
      isRecord(parsed) && typeof parsed.onboardingGoal === "string"
        ? parsed.onboardingGoal
        : "",
    preferredStartPath,
    stateJson: parsed,
  };
}
