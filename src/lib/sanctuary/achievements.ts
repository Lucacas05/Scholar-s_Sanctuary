export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
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

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: "primera-vigilia",
    title: "Primera vigilia",
    description: "Completa tu primera sesión de foco dentro del santuario.",
  },
  {
    id: "ritmo-de-tres",
    title: "Ritmo de tres",
    description: "Cierra tres sesiones de foco sin abandonar el archivo.",
  },
  {
    id: "archivo-profundo",
    title: "Archivo profundo",
    description: "Alcanza diez sesiones completadas dentro del santuario.",
  },
  {
    id: "hora-consagrada",
    title: "Hora consagrada",
    description: "Acumula al menos una hora completa de estudio con el Pomodoro.",
  },
  {
    id: "maraton-del-archivo",
    title: "Maratón del archivo",
    description: "Suma cinco horas de foco registradas en tus crónicas.",
  },
  {
    id: "circulo-vivo",
    title: "Círculo vivo",
    description: "Completa tres sesiones dentro de espacios compartidos.",
  },
  {
    id: "llama-constante",
    title: "Llama constante",
    description: "Mantén una racha de tres días activos dentro del santuario.",
  },
  {
    id: "semana-devota",
    title: "Semana devota",
    description: "Sostén una racha de siete días activos sin romper el ritmo.",
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

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
  return new Set(sessions.map((session) => toUtcDayKey(toTimestamp(session.completedAt)))).size;
}

export function getStreakDays(sessions: AchievementSessionLike[]) {
  if (sessions.length === 0) {
    return 0;
  }

  const sortedDayKeys = Array.from(
    new Set(sessions.map((session) => toUtcDayKey(toTimestamp(session.completedAt)))),
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

export function computeAchievementUnlocks(
  sessions: AchievementSessionLike[],
): AchievementUnlockSnapshot[] {
  const orderedSessions = [...sessions].sort(
    (left, right) => toTimestamp(left.completedAt) - toTimestamp(right.completedAt),
  );

  const unlocks = new Map<string, number>();
  let totalFocusSeconds = 0;
  let socialSessions = 0;

  orderedSessions.forEach((session, index) => {
    const completedAt = toTimestamp(session.completedAt);
    totalFocusSeconds += session.focusSeconds;

    if (session.roomKind !== "solo") {
      socialSessions += 1;
    }

    if (index === 0) {
      unlocks.set("primera-vigilia", completedAt);
    }

    if (index === 2 && !unlocks.has("ritmo-de-tres")) {
      unlocks.set("ritmo-de-tres", completedAt);
    }

    if (index === 9 && !unlocks.has("archivo-profundo")) {
      unlocks.set("archivo-profundo", completedAt);
    }

    if (totalFocusSeconds >= 60 * 60 && !unlocks.has("hora-consagrada")) {
      unlocks.set("hora-consagrada", completedAt);
    }

    if (totalFocusSeconds >= 5 * 60 * 60 && !unlocks.has("maraton-del-archivo")) {
      unlocks.set("maraton-del-archivo", completedAt);
    }

    if (socialSessions >= 3 && !unlocks.has("circulo-vivo")) {
      unlocks.set("circulo-vivo", completedAt);
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

  const orderedDays = [...daySnapshots.entries()].sort((left, right) => left[0] - right[0]);
  let streak = 0;
  let previousDayKey: number | null = null;

  orderedDays.forEach(([dayKey, unlockedAt]) => {
    if (previousDayKey !== null && dayKey === previousDayKey + DAY_MS) {
      streak += 1;
    } else {
      streak = 1;
    }

    if (streak >= 3 && !unlocks.has("llama-constante")) {
      unlocks.set("llama-constante", unlockedAt);
    }

    if (streak >= 7 && !unlocks.has("semana-devota")) {
      unlocks.set("semana-devota", unlockedAt);
    }

    previousDayKey = dayKey;
  });

  return achievementDefinitions
    .filter((achievement) => unlocks.has(achievement.id))
    .map((achievement) => ({
      id: achievement.id,
      unlockedAt: unlocks.get(achievement.id)!,
    }));
}
