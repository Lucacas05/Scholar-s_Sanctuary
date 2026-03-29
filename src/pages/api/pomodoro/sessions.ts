import type { APIContext } from "astro";
import { db } from "@/lib/server/db";
import { persistPomodoroSession } from "@/lib/server/pomodoro";

const VALID_ROOM_KINDS = new Set(["solo", "public", "private"]);
const selectRoomStatement = db.prepare("SELECT code FROM rooms WHERE code = ?");
const checkMembershipStatement = db.prepare(
  "SELECT 1 FROM room_members WHERE room_code = ? AND user_id = ?",
);

export const prerender = false;

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        clientSessionId?: string;
        roomCode?: string;
        roomKind?: string;
        focusSeconds?: number;
        breakSeconds?: number;
        startedAt?: number;
        completedAt?: number;
      }
    | null;

  if (
    !payload?.clientSessionId ||
    !payload.roomCode ||
    !payload.roomKind ||
    !VALID_ROOM_KINDS.has(payload.roomKind) ||
    typeof payload.focusSeconds !== "number" ||
    typeof payload.breakSeconds !== "number" ||
    typeof payload.startedAt !== "number" ||
    typeof payload.completedAt !== "number"
  ) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.focusSeconds <= 0 || payload.completedAt < payload.startedAt) {
    return Response.json({ error: "Invalid session timing" }, { status: 400 });
  }

  if (payload.roomKind !== "solo") {
    const room = selectRoomStatement.get(payload.roomCode) as { code: string } | undefined;
    if (!room) {
      return Response.json({ error: "Room not found" }, { status: 404 });
    }

    const isMember = checkMembershipStatement.get(payload.roomCode, locals.user.id);
    if (!isMember) {
      return Response.json({ error: "Not a member of this room" }, { status: 403 });
    }
  }

  const session = persistPomodoroSession({
    clientSessionId: payload.clientSessionId,
    userId: locals.user.id,
    roomCode: payload.roomCode,
    roomKind: payload.roomKind as "solo" | "public" | "private",
    focusSeconds: Math.round(payload.focusSeconds),
    breakSeconds: Math.max(60, Math.round(payload.breakSeconds)),
    startedAt: Math.round(payload.startedAt),
    completedAt: Math.round(payload.completedAt),
  });

  if (!session) {
    return Response.json({ error: "Could not persist session" }, { status: 500 });
  }

  return Response.json({
    session: {
      serverId: session.id,
      clientSessionId: session.clientSessionId,
      persistedAt: Date.parse(session.createdAt),
    },
  });
}
