import {
  achievementDefinitions,
  computeAchievementUnlocks,
  getDistinctSessionDays,
  getStreakDays,
} from "@/lib/sanctuary/achievements";
import { db } from "@/lib/server/db";

type RoomKind = "solo" | "public" | "private";

interface PomodoroSessionRow {
  id: string;
  clientSessionId: string;
  userId: string;
  roomCode: string;
  roomKind: RoomKind;
  focusSeconds: number;
  breakSeconds: number;
  startedAt: string;
  completedAt: string;
  status: string;
  roomName: string | null;
  createdAt: string;
}

interface AchievementUnlockRow {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

export interface PersistPomodoroSessionInput {
  clientSessionId: string;
  userId: string;
  roomCode: string;
  roomKind: RoomKind;
  focusSeconds: number;
  breakSeconds: number;
  startedAt: number;
  completedAt: number;
}

export interface PomodoroArchivePayload {
  sessions: Array<{
    clientSessionId: string;
    serverId: string;
    roomCode: string;
    roomKind: RoomKind;
    focusSeconds: number;
    breakSeconds: number;
    startedAt: number;
    completedAt: number;
    persistedAt: number;
  }>;
  chronicleEntries: Array<{
    id: string;
    userId: string;
    title: string;
    description: string;
    timestamp: number;
    tone: "primary" | "secondary" | "tertiary";
    origin: "timer";
  }>;
  achievementUnlocks: Array<{
    id: string;
    userId: string;
    unlockedAt: number;
    persistedAt: number;
  }>;
  summary: {
    sessionsCount: number;
    focusHours: string;
    streakDays: number;
    archiveDays: number;
    achievementsCount: number;
  };
}

const insertPomodoroSessionStatement = db.prepare(`
  INSERT OR IGNORE INTO pomodoro_sessions (
    id,
    client_session_id,
    user_id,
    room_code,
    room_kind,
    focus_duration_seconds,
    break_duration_seconds,
    started_at,
    completed_at,
    status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
`);

const selectPomodoroSessionByClientIdStatement = db.prepare(`
  SELECT
    ps.id,
    ps.client_session_id AS clientSessionId,
    ps.user_id AS userId,
    ps.room_code AS roomCode,
    ps.room_kind AS roomKind,
    ps.focus_duration_seconds AS focusSeconds,
    ps.break_duration_seconds AS breakSeconds,
    ps.started_at AS startedAt,
    ps.completed_at AS completedAt,
    ps.status,
    ps.created_at AS createdAt,
    r.name AS roomName
  FROM pomodoro_sessions ps
  LEFT JOIN rooms r ON r.code = ps.room_code
  WHERE ps.user_id = ? AND ps.client_session_id = ?
  LIMIT 1
`);

const selectPomodoroSessionsStatement = db.prepare(`
  SELECT
    ps.id,
    ps.client_session_id AS clientSessionId,
    ps.user_id AS userId,
    ps.room_code AS roomCode,
    ps.room_kind AS roomKind,
    ps.focus_duration_seconds AS focusSeconds,
    ps.break_duration_seconds AS breakSeconds,
    ps.started_at AS startedAt,
    ps.completed_at AS completedAt,
    ps.status,
    ps.created_at AS createdAt,
    r.name AS roomName
  FROM pomodoro_sessions ps
  LEFT JOIN rooms r ON r.code = ps.room_code
  WHERE ps.user_id = ? AND ps.status = 'completed'
  ORDER BY ps.completed_at DESC
`);

const insertAchievementUnlockStatement = db.prepare(`
  INSERT OR IGNORE INTO achievement_unlocks (id, user_id, achievement_id, unlocked_at)
  VALUES (?, ?, ?, ?)
`);

const selectAchievementUnlocksStatement = db.prepare(`
  SELECT
    id,
    user_id AS userId,
    achievement_id AS achievementId,
    unlocked_at AS unlockedAt
  FROM achievement_unlocks
  WHERE user_id = ?
  ORDER BY unlocked_at DESC
`);

function toIsoString(timestamp: number) {
  return new Date(timestamp).toISOString();
}

function toTimestamp(value: string) {
  return Date.parse(value);
}

function getRoomLabel(roomCode: string, roomKind: RoomKind, roomName: string | null) {
  if (roomKind === "solo" || roomCode === "santuario-silencioso") {
    return "Santuario silencioso";
  }

  return roomName ?? (roomKind === "public" ? "Gran lectorio compartido" : "Sala privada");
}

function toChronicleTone(roomKind: RoomKind) {
  if (roomKind === "solo") {
    return "primary" as const;
  }

  return roomKind === "public" ? ("tertiary" as const) : ("secondary" as const);
}

function buildChronicleEntry(row: PomodoroSessionRow) {
  const label = getRoomLabel(row.roomCode, row.roomKind, row.roomName).toLowerCase();

  return {
    id: row.clientSessionId,
    userId: row.userId,
    title: row.roomKind === "solo" ? "Vigilia en el santuario silencioso" : "Vigilia compartida cerrada",
    description:
      row.roomKind === "solo"
        ? `Has completado una sesión de foco en ${label}.`
        : `Has registrado una sesión de foco dentro de ${label}.`,
    timestamp: toTimestamp(row.completedAt),
    tone: toChronicleTone(row.roomKind),
    origin: "timer" as const,
  };
}

function refreshAchievementUnlocks(userId: string) {
  const sessions = selectPomodoroSessionsStatement.all(userId) as PomodoroSessionRow[];
  const unlocks = computeAchievementUnlocks(
    sessions.map((session) => ({
      roomKind: session.roomKind,
      focusSeconds: session.focusSeconds,
      completedAt: session.completedAt,
    })),
  );

  const transaction = db.transaction(() => {
    unlocks.forEach((unlock) => {
      insertAchievementUnlockStatement.run(
        crypto.randomUUID(),
        userId,
        unlock.id,
        toIsoString(unlock.unlockedAt),
      );
    });
  });

  transaction();
}

export function persistPomodoroSession(input: PersistPomodoroSessionInput) {
  const transaction = db.transaction(() => {
    insertPomodoroSessionStatement.run(
      crypto.randomUUID(),
      input.clientSessionId,
      input.userId,
      input.roomCode,
      input.roomKind,
      input.focusSeconds,
      input.breakSeconds,
      toIsoString(input.startedAt),
      toIsoString(input.completedAt),
    );

    refreshAchievementUnlocks(input.userId);
  });

  transaction();

  return selectPomodoroSessionByClientIdStatement.get(
    input.userId,
    input.clientSessionId,
  ) as PomodoroSessionRow | undefined;
}

export function getPomodoroArchive(userId: string): PomodoroArchivePayload {
  const sessions = selectPomodoroSessionsStatement.all(userId) as PomodoroSessionRow[];
  const achievementUnlocks = selectAchievementUnlocksStatement.all(userId) as AchievementUnlockRow[];

  return {
    sessions: sessions.map((session) => ({
      clientSessionId: session.clientSessionId,
      serverId: session.id,
      roomCode: session.roomCode,
      roomKind: session.roomKind,
      focusSeconds: session.focusSeconds,
      breakSeconds: session.breakSeconds,
      startedAt: toTimestamp(session.startedAt),
      completedAt: toTimestamp(session.completedAt),
      persistedAt: toTimestamp(session.createdAt),
    })),
    chronicleEntries: sessions.slice(0, 12).map(buildChronicleEntry),
    achievementUnlocks: achievementUnlocks.map((unlock) => ({
      id: unlock.achievementId,
      userId: unlock.userId,
      unlockedAt: toTimestamp(unlock.unlockedAt),
      persistedAt: toTimestamp(unlock.unlockedAt),
    })),
    summary: {
      sessionsCount: sessions.length,
      focusHours: (sessions.reduce((total, session) => total + session.focusSeconds, 0) / 3600).toFixed(1),
      streakDays: getStreakDays(
        sessions.map((session) => ({
          roomKind: session.roomKind,
          focusSeconds: session.focusSeconds,
          completedAt: session.completedAt,
        })),
      ),
      archiveDays: getDistinctSessionDays(
        sessions.map((session) => ({
          roomKind: session.roomKind,
          focusSeconds: session.focusSeconds,
          completedAt: session.completedAt,
        })),
      ),
      achievementsCount: achievementUnlocks.filter((unlock) =>
        achievementDefinitions.some((achievement) => achievement.id === unlock.achievementId),
      ).length,
    },
  };
}
