import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

export const prerender = false;

const overallStatsStatement = db.prepare(`
  SELECT
    COUNT(*) AS totalSessions,
    COALESCE(SUM(focus_seconds), 0) AS totalFocusSeconds
  FROM pomodoro_sessions
  WHERE user_id = ?
`);

const dailyStatsStatement = db.prepare(`
  SELECT
    DATE(completed_at) AS day,
    COUNT(*) AS sessions,
    SUM(focus_seconds) AS focusSeconds
  FROM pomodoro_sessions
  WHERE user_id = ? AND completed_at >= DATE('now', ?)
  GROUP BY DATE(completed_at)
  ORDER BY day ASC
`);

const streakStatement = db.prepare(`
  SELECT DISTINCT DATE(completed_at) AS day
  FROM pomodoro_sessions
  WHERE user_id = ?
  ORDER BY day DESC
`);

function computeStreak(rows: Array<{ day: string }>): number {
  if (rows.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today.getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  if (rows[0].day !== todayStr && rows[0].day !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < rows.length; i++) {
    const prev = new Date(rows[i - 1].day + "T00:00:00").getTime();
    const curr = new Date(rows[i].day + "T00:00:00").getTime();
    if (prev - curr === 86400000) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export async function GET({ locals, url }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const range =
    url.searchParams.get("range") === "weekly" ? "-6 days" : "-29 days";

  const overall = overallStatsStatement.get(locals.user.id) as {
    totalSessions: number;
    totalFocusSeconds: number;
  };

  const daily = dailyStatsStatement.all(locals.user.id, range) as Array<{
    day: string;
    sessions: number;
    focusSeconds: number;
  }>;

  const streakRows = streakStatement.all(locals.user.id) as Array<{
    day: string;
  }>;
  const streakDays = computeStreak(streakRows);

  const avgFocusSeconds =
    overall.totalSessions > 0
      ? Math.round(overall.totalFocusSeconds / overall.totalSessions)
      : 0;

  return Response.json({
    totalSessions: overall.totalSessions,
    totalFocusSeconds: overall.totalFocusSeconds,
    avgFocusSeconds,
    streakDays,
    daily,
  });
}
