import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

type RoomPrivacy = "public" | "private";

const selectRoomsStatement = db.prepare(`
  SELECT
    r.code,
    r.name,
    r.owner_id AS ownerId,
    r.privacy,
    r.created_at AS createdAt,
    (SELECT COUNT(*) FROM room_members rm2 WHERE rm2.room_code = r.code) AS memberCount
  FROM rooms r
  INNER JOIN room_members rm ON rm.room_code = r.code
  WHERE rm.user_id = ?
`);

const insertRoomStatement = db.prepare(
  "INSERT INTO rooms (code, name, owner_id, privacy) VALUES (?, ?, ?, ?)",
);

const insertRoomMemberStatement = db.prepare(
  "INSERT INTO room_members (room_code, user_id) VALUES (?, ?)",
);

export const prerender = false;

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rooms = selectRoomsStatement.all(locals.user.id) as {
    code: string;
    name: string;
    ownerId: string;
    privacy: RoomPrivacy;
    memberCount: number;
    createdAt: string;
  }[];

  return Response.json({ rooms });
}

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: string; privacy?: RoomPrivacy }
    | null;
  if (!body?.name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const privacy: RoomPrivacy = body.privacy === "public" ? "public" : "private";
  const code = crypto.randomUUID().slice(0, 8).toUpperCase();

  const insertRoom = db.transaction(() => {
    insertRoomStatement.run(code, body.name, locals.user!.id, privacy);
    insertRoomMemberStatement.run(code, locals.user!.id);
  });
  insertRoom();

  return Response.json({
    room: {
      code,
      name: body.name,
      ownerId: locals.user.id,
      privacy,
      createdAt: new Date().toISOString(),
    },
  });
}
