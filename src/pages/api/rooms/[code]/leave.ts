import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectRoomStatement = db.prepare(
  "SELECT code, owner_id AS ownerId FROM rooms WHERE code = ?",
);

const checkMembershipStatement = db.prepare(
  "SELECT 1 FROM room_members WHERE room_code = ? AND user_id = ?",
);

const deleteMemberStatement = db.prepare(
  "DELETE FROM room_members WHERE room_code = ? AND user_id = ?",
);

const countMembersStatement = db.prepare(
  "SELECT COUNT(*) AS count FROM room_members WHERE room_code = ?",
);

const selectNextMemberStatement = db.prepare(
  "SELECT user_id AS userId FROM room_members WHERE room_code = ? LIMIT 1",
);

const transferOwnershipStatement = db.prepare(
  "UPDATE rooms SET owner_id = ? WHERE code = ?",
);

const deleteRoomInvitationsStatement = db.prepare(
  "DELETE FROM room_invitations WHERE room_code = ?",
);

const deleteRoomMembersStatement = db.prepare(
  "DELETE FROM room_members WHERE room_code = ?",
);

const deleteRoomStatement = db.prepare("DELETE FROM rooms WHERE code = ?");

export const prerender = false;

export async function POST({ locals, params }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const room = selectRoomStatement.get(params.code) as
    | { code: string; ownerId: string }
    | undefined;

  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  const isMember = checkMembershipStatement.get(params.code, locals.user.id);
  if (!isMember) {
    return Response.json(
      { error: "Not a member of this room" },
      { status: 403 },
    );
  }

  const leaveRoom = db.transaction(() => {
    deleteMemberStatement.run(params.code, locals.user!.id);

    const { count } = countMembersStatement.get(params.code) as {
      count: number;
    };

    if (count === 0) {
      deleteRoomInvitationsStatement.run(params.code);
      deleteRoomMembersStatement.run(params.code);
      deleteRoomStatement.run(params.code);
      return;
    }

    if (room.ownerId === locals.user!.id) {
      const nextMember = selectNextMemberStatement.get(params.code) as {
        userId: string;
      };
      transferOwnershipStatement.run(nextMember.userId, params.code);
    }
  });
  leaveRoom();

  return Response.json({ ok: true });
}
