import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectRoomStatement = db.prepare(
  "SELECT code, name, owner_id AS ownerId, privacy, created_at AS createdAt FROM rooms WHERE code = ?",
);

const checkMembershipStatement = db.prepare(
  "SELECT 1 FROM room_members WHERE room_code = ? AND user_id = ?",
);

const selectMembersStatement = db.prepare(`
  SELECT
    u.id,
    u.username,
    u.display_name AS displayName,
    u.avatar_url AS avatarUrl
  FROM room_members rm
  INNER JOIN users u ON u.id = rm.user_id
  WHERE rm.room_code = ?
`);

export const prerender = false;

export async function GET({ locals, params }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roomCode = params.code?.toUpperCase() ?? "";

  const room = selectRoomStatement.get(roomCode) as
    | {
        code: string;
        name: string;
        ownerId: string;
        privacy: "public" | "private";
        createdAt: string;
      }
    | undefined;

  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  const isMember = checkMembershipStatement.get(roomCode, locals.user.id);
  if (!isMember) {
    return Response.json(
      { error: "Not a member of this room" },
      { status: 403 },
    );
  }

  const members = selectMembersStatement.all(roomCode) as {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }[];

  return Response.json({ room, members });
}
