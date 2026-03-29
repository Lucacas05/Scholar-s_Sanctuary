import { getStreakDays } from "@/lib/sanctuary/achievements";
import { db } from "@/lib/server/db";

interface SocialUserRow {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  stateJson: string | null;
}

interface LeaderboardRow extends SocialUserRow {
  focusSeconds: number;
  sessionsCount: number;
}

interface SessionFeedRow extends SocialUserRow {
  sessionId: string;
  roomCode: string;
  roomKind: "solo" | "public" | "private";
  roomName: string | null;
  focusSeconds: number;
  completedAt: string;
}

function getAcceptedFriendIds(userId: string) {
  const rows = db
    .prepare(
      `
        SELECT CASE
          WHEN user_id = ? THEN friend_id
          ELSE user_id
        END AS friendId
        FROM friendships
        WHERE status = 'accepted'
          AND (user_id = ? OR friend_id = ?)
      `,
    )
    .all(userId, userId, userId) as Array<{ friendId: string }>;

  return rows.map((row) => row.friendId);
}

function buildPlaceholders(count: number) {
  return Array.from({ length: count }, () => "?").join(", ");
}

function parsePrivacy(stateJson: string | null) {
  if (!stateJson) {
    return {
      shareActivity: true,
      showOnLeaderboard: true,
    };
  }

  try {
    const parsed = JSON.parse(stateJson) as {
      socialPrivacy?: {
        shareActivity?: boolean;
        showOnLeaderboard?: boolean;
      };
    };

    return {
      shareActivity: parsed.socialPrivacy?.shareActivity ?? true,
      showOnLeaderboard: parsed.socialPrivacy?.showOnLeaderboard ?? true,
    };
  } catch {
    return {
      shareActivity: true,
      showOnLeaderboard: true,
    };
  }
}

function getCurrentWeekWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + delta);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return {
    start,
    end,
  };
}

function getRoomLabel(row: {
  roomCode: string;
  roomKind: string;
  roomName: string | null;
}) {
  if (row.roomKind === "solo" || row.roomCode === "santuario-silencioso") {
    return "Santuario silencioso";
  }

  if (row.roomKind === "public") {
    return row.roomName ?? "Gran lectorio compartido";
  }

  return row.roomName ?? "Sala privada";
}

export function getWeeklyLeaderboard(userId: string) {
  const cohortIds = Array.from(
    new Set([userId, ...getAcceptedFriendIds(userId)]),
  );
  const { start, end } = getCurrentWeekWindow();
  const placeholders = buildPlaceholders(cohortIds.length);
  const statement = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.display_name AS displayName,
      u.avatar_url AS avatarUrl,
      u.state_json AS stateJson,
      COUNT(ps.id) AS sessionsCount,
      COALESCE(SUM(ps.focus_duration_seconds), 0) AS focusSeconds
    FROM users u
    LEFT JOIN pomodoro_sessions ps
      ON ps.user_id = u.id
     AND ps.status = 'completed'
     AND ps.completed_at >= ?
     AND ps.completed_at < ?
    WHERE u.id IN (${placeholders})
    GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.state_json
  `);

  const rows = statement.all(
    start.toISOString(),
    end.toISOString(),
    ...cohortIds,
  ) as LeaderboardRow[];

  const filtered = rows
    .filter(
      (row) =>
        row.id === userId || parsePrivacy(row.stateJson).showOnLeaderboard,
    )
    .filter((row) => row.focusSeconds > 0 || row.id === userId)
    .sort((left, right) => {
      if (right.focusSeconds !== left.focusSeconds) {
        return right.focusSeconds - left.focusSeconds;
      }

      if (right.sessionsCount !== left.sessionsCount) {
        return right.sessionsCount - left.sessionsCount;
      }

      return left.displayName.localeCompare(right.displayName, "es");
    });

  return {
    rangeLabel: `${start.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    })} - ${new Date(end.getTime() - 1).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    })}`,
    leaderboard: filtered.map((row, index) => ({
      rank: index + 1,
      user: {
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
      focusMinutes: Math.round(row.focusSeconds / 60),
      sessionsCount: row.sessionsCount,
      isCurrentUser: row.id === userId,
    })),
  };
}

export function getFriendActivityFeed(userId: string) {
  const cohortIds = Array.from(
    new Set([userId, ...getAcceptedFriendIds(userId)]),
  );
  const placeholders = buildPlaceholders(cohortIds.length);
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const statement = db.prepare(`
    SELECT
      ps.id AS sessionId,
      ps.user_id AS id,
      u.username,
      u.display_name AS displayName,
      u.avatar_url AS avatarUrl,
      u.state_json AS stateJson,
      ps.room_code AS roomCode,
      ps.room_kind AS roomKind,
      r.name AS roomName,
      ps.focus_duration_seconds AS focusSeconds,
      ps.completed_at AS completedAt
    FROM pomodoro_sessions ps
    INNER JOIN users u ON u.id = ps.user_id
    LEFT JOIN rooms r ON r.code = ps.room_code
    WHERE ps.status = 'completed'
      AND ps.user_id IN (${placeholders})
      AND ps.completed_at >= ?
    ORDER BY ps.completed_at DESC
    LIMIT 180
  `);

  const rows = statement.all(...cohortIds, since) as SessionFeedRow[];
  const visibleRows = rows.filter(
    (row) => row.id === userId || parsePrivacy(row.stateJson).shareActivity,
  );
  const feed: Array<{
    id: string;
    type: "session" | "streak";
    actor: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
    message: string;
    happenedAt: string;
  }> = [];

  const seenSessionBuckets = new Set<string>();
  const rowsByUser = new Map<string, SessionFeedRow[]>();

  visibleRows.forEach((row) => {
    const timestamp = Date.parse(row.completedAt);
    const bucket = Math.floor(timestamp / (3 * 60 * 60 * 1000));
    const key = `${row.id}:${bucket}`;

    if (!seenSessionBuckets.has(key)) {
      seenSessionBuckets.add(key);
      feed.push({
        id: `session-${row.sessionId}`,
        type: "session",
        actor: {
          id: row.id,
          username: row.username,
          displayName: row.displayName,
          avatarUrl: row.avatarUrl,
        },
        message: `cerró ${Math.round(row.focusSeconds / 60)} min en ${getRoomLabel(row)}`,
        happenedAt: row.completedAt,
      });
    }

    const current = rowsByUser.get(row.id) ?? [];
    current.push(row);
    rowsByUser.set(row.id, current);
  });

  const streakMilestones = new Set([3, 7, 14, 30]);

  rowsByUser.forEach((userRows, actorId) => {
    const latest = userRows[0];
    const streakDays = getStreakDays(
      userRows.map((row) => ({
        roomKind: row.roomKind,
        focusSeconds: row.focusSeconds,
        completedAt: row.completedAt,
      })),
    );

    if (
      !streakMilestones.has(streakDays) ||
      Date.now() - Date.parse(latest.completedAt) > 3 * 24 * 60 * 60 * 1000
    ) {
      return;
    }

    feed.push({
      id: `streak-${actorId}-${streakDays}`,
      type: "streak",
      actor: {
        id: latest.id,
        username: latest.username,
        displayName: latest.displayName,
        avatarUrl: latest.avatarUrl,
      },
      message: `alcanzó una racha de ${streakDays} días`,
      happenedAt: latest.completedAt,
    });
  });

  return {
    feed: feed
      .sort(
        (left, right) =>
          Date.parse(right.happenedAt) - Date.parse(left.happenedAt),
      )
      .slice(0, 20),
  };
}
