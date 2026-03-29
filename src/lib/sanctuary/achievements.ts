export type AchievementRuleType =
  | "sessions-total"
  | "focus-total"
  | "social-sessions"
  | "streak-days"
  | "archive-days";

export interface AchievementRule {
  type: AchievementRuleType;
  value: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  rule: AchievementRule;
  enabled: boolean;
}

export interface AchievementSessionLike {
  roomKind: string;
  focusSeconds: number;
  completedAt: number | string | Date;
}

export interface AchievementUnlockSnapshot {
  id: string;
  unlockedAt: number;
}

const ACHIEVEMENT_STORAGE_KEY = "lumina:achievement-definitions";
const ACHIEVEMENT_DEFINITIONS_ENDPOINT = "/api/editor/achievements";
export const ACHIEVEMENT_DEFINITIONS_EVENT =
  "lumina:achievement-definitions-changed";
const DAY_MS = 24 * 60 * 60 * 1000;

function createAchievement(
  id: string,
  title: string,
  description: string,
  rule: AchievementRule,
  enabled = true,
): AchievementDefinition {
  return {
    id,
    title,
    description,
    rule,
    enabled,
  };
}

const defaultAchievementDefinitions: AchievementDefinition[] = [
  createAchievement(
    "primera-vigilia",
    "Primera vigilia",
    "Completa tu primera sesión de foco dentro del santuario.",
    { type: "sessions-total", value: 1 },
  ),
  createAchievement(
    "ritmo-de-tres",
    "Ritmo de tres",
    "Cierra tres sesiones de foco sin abandonar el archivo.",
    { type: "sessions-total", value: 3 },
  ),
  createAchievement(
    "archivo-profundo",
    "Archivo profundo",
    "Alcanza diez sesiones completadas dentro del santuario.",
    { type: "sessions-total", value: 10 },
  ),
  createAchievement(
    "hora-consagrada",
    "Hora consagrada",
    "Acumula al menos una hora completa de estudio con el Pomodoro.",
    { type: "focus-total", value: 60 * 60 },
  ),
  createAchievement(
    "maraton-del-archivo",
    "Maratón del archivo",
    "Suma cinco horas de foco registradas en tus crónicas.",
    { type: "focus-total", value: 5 * 60 * 60 },
  ),
  createAchievement(
    "circulo-vivo",
    "Círculo vivo",
    "Completa tres sesiones dentro de espacios compartidos.",
    { type: "social-sessions", value: 3 },
  ),
  createAchievement(
    "llama-constante",
    "Llama constante",
    "Mantén una racha de tres días activos dentro del santuario.",
    { type: "streak-days", value: 3 },
  ),
  createAchievement(
    "semana-devota",
    "Semana devota",
    "Sostén una racha de siete días activos sin romper el ritmo.",
    { type: "streak-days", value: 7 },
  ),
];

function cloneAchievement(achievement: AchievementDefinition) {
  return {
    ...achievement,
    rule: { ...achievement.rule },
  };
}

function dispatchAchievementDefinitionsEvent() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(ACHIEVEMENT_DEFINITIONS_EVENT));
}

export function getDefaultAchievementDefinitions() {
  return defaultAchievementDefinitions.map(cloneAchievement);
}

export function createAchievementId() {
  return `hito-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isValidRuleType(value: unknown): value is AchievementRuleType {
  return (
    value === "sessions-total" ||
    value === "focus-total" ||
    value === "social-sessions" ||
    value === "streak-days" ||
    value === "archive-days"
  );
}

function normalizePositiveInteger(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.round(value));
}

function normalizeRule(
  value: unknown,
  fallback: AchievementRule,
): AchievementRule {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }

  const record = value as Record<string, unknown>;
  const type = isValidRuleType(record.type) ? record.type : fallback.type;
  const normalizedValue = normalizePositiveInteger(
    record.value,
    fallback.value,
  );

  return {
    type,
    value:
      type === "focus-total"
        ? Math.max(15 * 60, normalizedValue)
        : normalizedValue,
  };
}

function normalizeAchievement(
  value: unknown,
  fallback?: AchievementDefinition,
): AchievementDefinition {
  const base =
    fallback ??
    createAchievement(
      createAchievementId(),
      "Nuevo hito",
      "",
      { type: "sessions-total", value: 1 },
      true,
    );

  if (!value || typeof value !== "object") {
    return cloneAchievement(base);
  }

  const record = value as Record<string, unknown>;
  return {
    id:
      typeof record.id === "string" && record.id.trim().length > 0
        ? record.id.trim()
        : base.id,
    title:
      typeof record.title === "string" && record.title.trim().length > 0
        ? record.title.trim()
        : base.title,
    description:
      typeof record.description === "string"
        ? record.description.trim()
        : base.description,
    rule: normalizeRule(record.rule, base.rule),
    enabled:
      typeof record.enabled === "boolean" ? record.enabled : base.enabled,
  };
}

export function normalizeAchievementDefinitions(value: unknown) {
  if (!Array.isArray(value)) {
    return getDefaultAchievementDefinitions();
  }

  return value.map((entry, index) =>
    normalizeAchievement(entry, defaultAchievementDefinitions[index]),
  );
}

export function loadAchievementDefinitions() {
  if (typeof window === "undefined") {
    return getDefaultAchievementDefinitions();
  }

  const raw = window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
  if (!raw) {
    return getDefaultAchievementDefinitions();
  }

  try {
    return normalizeAchievementDefinitions(JSON.parse(raw));
  } catch {
    return getDefaultAchievementDefinitions();
  }
}

export function getAchievementDefinitions() {
  return loadAchievementDefinitions();
}

export function saveAchievementDefinitions(
  definitions: AchievementDefinition[],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ACHIEVEMENT_STORAGE_KEY,
    JSON.stringify(normalizeAchievementDefinitions(definitions)),
  );
  dispatchAchievementDefinitionsEvent();
}

export function resetAchievementDefinitions() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACHIEVEMENT_STORAGE_KEY);
  dispatchAchievementDefinitionsEvent();
}

async function parseAchievementDefinitionsResponse(response: Response) {
  if (!response.ok) {
    throw new Error("No se pudieron sincronizar los hitos.");
  }

  const payload = (await response.json()) as { achievements?: unknown };
  const normalized = normalizeAchievementDefinitions(payload.achievements);
  saveAchievementDefinitions(normalized);
  return normalized;
}

export async function syncAchievementDefinitionsFromServer() {
  if (typeof window === "undefined") {
    return getDefaultAchievementDefinitions();
  }

  const response = await fetch(ACHIEVEMENT_DEFINITIONS_ENDPOINT, {
    credentials: "same-origin",
  });
  return parseAchievementDefinitionsResponse(response);
}

export async function saveAchievementDefinitionsToServer(
  definitions: AchievementDefinition[],
) {
  if (typeof window === "undefined") {
    return normalizeAchievementDefinitions(definitions);
  }

  const response = await fetch(ACHIEVEMENT_DEFINITIONS_ENDPOINT, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      achievements: definitions,
    }),
  });
  return parseAchievementDefinitionsResponse(response);
}

export async function resetAchievementDefinitionsOnServer() {
  if (typeof window === "undefined") {
    return getDefaultAchievementDefinitions();
  }

  const response = await fetch(ACHIEVEMENT_DEFINITIONS_ENDPOINT, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return parseAchievementDefinitionsResponse(response);
}

function toTimestamp(value: number | string | Date) {
  if (typeof value === "number") {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function toUtcDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getDistinctSessionDays(sessions: AchievementSessionLike[]) {
  return new Set(
    sessions.map((session) => toUtcDayKey(toTimestamp(session.completedAt))),
  ).size;
}

export function getStreakDays(sessions: AchievementSessionLike[]) {
  if (sessions.length === 0) {
    return 0;
  }

  const sortedDayKeys = Array.from(
    new Set(
      sessions.map((session) => toUtcDayKey(toTimestamp(session.completedAt))),
    ),
  ).sort((left, right) => right - left);

  let streak = 0;
  let cursor = sortedDayKeys[0];

  for (const dayKey of sortedDayKeys) {
    if (dayKey !== cursor) {
      break;
    }

    streak += 1;
    cursor -= DAY_MS;
  }

  return streak;
}

function isRuleSatisfied(
  definition: AchievementDefinition,
  progress: {
    sessionsTotal: number;
    totalFocusSeconds: number;
    socialSessions: number;
    archiveDays: number;
    streakDays: number;
  },
) {
  switch (definition.rule.type) {
    case "sessions-total":
      return progress.sessionsTotal >= definition.rule.value;
    case "focus-total":
      return progress.totalFocusSeconds >= definition.rule.value;
    case "social-sessions":
      return progress.socialSessions >= definition.rule.value;
    case "archive-days":
      return progress.archiveDays >= definition.rule.value;
    case "streak-days":
      return progress.streakDays >= definition.rule.value;
  }
}

export function computeAchievementUnlocks(
  sessions: AchievementSessionLike[],
  definitions = getDefaultAchievementDefinitions(),
): AchievementUnlockSnapshot[] {
  const orderedDefinitions = definitions.filter(
    (definition) => definition.enabled,
  );
  const orderedSessions = [...sessions].sort(
    (left, right) =>
      toTimestamp(left.completedAt) - toTimestamp(right.completedAt),
  );
  const unlocks = new Map<string, number>();
  const enabledDefinitionIds = new Set(
    orderedDefinitions.map((definition) => definition.id),
  );

  let totalFocusSeconds = 0;
  let socialSessions = 0;
  let sessionsTotal = 0;
  let archiveDays = 0;
  const seenDayKeys = new Set<number>();

  orderedSessions.forEach((session) => {
    const completedAt = toTimestamp(session.completedAt);
    const dayKey = toUtcDayKey(completedAt);

    sessionsTotal += 1;
    totalFocusSeconds += session.focusSeconds;
    if (session.roomKind !== "solo") {
      socialSessions += 1;
    }

    if (!seenDayKeys.has(dayKey)) {
      seenDayKeys.add(dayKey);
      archiveDays += 1;
    }

    for (const definition of orderedDefinitions) {
      if (unlocks.has(definition.id)) {
        continue;
      }

      if (
        isRuleSatisfied(definition, {
          sessionsTotal,
          totalFocusSeconds,
          socialSessions,
          archiveDays,
          streakDays: 0,
        })
      ) {
        unlocks.set(definition.id, completedAt);
      }
    }
  });

  const daySnapshots = new Map<number, number>();

  orderedSessions.forEach((session) => {
    const completedAt = toTimestamp(session.completedAt);
    const dayKey = toUtcDayKey(completedAt);

    if (!daySnapshots.has(dayKey)) {
      daySnapshots.set(dayKey, completedAt);
    }
  });

  const orderedDays = [...daySnapshots.entries()].sort(
    (left, right) => left[0] - right[0],
  );
  let streak = 0;
  let previousDayKey: number | null = null;

  orderedDays.forEach(([dayKey, unlockedAt], index) => {
    if (previousDayKey !== null && dayKey === previousDayKey + DAY_MS) {
      streak += 1;
    } else {
      streak = 1;
    }

    const archiveDayCount = index + 1;

    for (const definition of orderedDefinitions) {
      if (unlocks.has(definition.id)) {
        continue;
      }

      if (
        isRuleSatisfied(definition, {
          sessionsTotal: orderedSessions.length,
          totalFocusSeconds,
          socialSessions,
          archiveDays: archiveDayCount,
          streakDays: streak,
        })
      ) {
        unlocks.set(definition.id, unlockedAt);
      }
    }

    previousDayKey = dayKey;
  });

  return orderedDefinitions
    .filter((achievement) => enabledDefinitionIds.has(achievement.id))
    .filter((achievement) => unlocks.has(achievement.id))
    .map((achievement) => ({
      id: achievement.id,
      unlockedAt: unlocks.get(achievement.id)!,
    }));
}
