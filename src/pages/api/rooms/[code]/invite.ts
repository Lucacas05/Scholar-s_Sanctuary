import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectRoomStatement = db.prepare(
  "SELECT code, owner_id AS ownerId, privacy FROM rooms WHERE code = ?",
);

const checkMembershipStatement = db.prepare(
  "SELECT 1 FROM room_members WHERE room_code = ? AND user_id = ?",
);

const findUserStatement = db.prepare("SELECT id FROM users WHERE id = ?");

const findInvitationStatement = db.prepare(
  `SELECT id, status
   FROM room_invitations
   WHERE room_code = ?
     AND invitee_id = ?
   LIMIT 1`,
);

const insertInvitationStatement = db.prepare(
  `INSERT INTO room_invitations (
     id,
     room_code,
     inviter_id,
     invitee_id,
     invite_code,
     status,
     expires_at
   ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
);

const resetInvitationStatement = db.prepare(`
  UPDATE room_invitations
  SET inviter_id = ?,
      invite_code = ?,
      status = 'pending',
      expires_at = ?,
      accepted_at = NULL,
      revoked_at = NULL
  WHERE id = ?
`);

export const prerender = false;

export async function POST({ locals, params, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { userId?: string; expiresInHours?: number }
    | null;
  if (!body?.userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  const room = selectRoomStatement.get(params.code) as
    | { code: string; ownerId: string; privacy: "public" | "private" }
    | undefined;
  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  const isMember = checkMembershipStatement.get(params.code, locals.user.id);
  if (!isMember) {
    return Response.json({ error: "Not a member of this room" }, { status: 403 });
  }

  if (room.ownerId !== locals.user.id) {
    return Response.json({ error: "Only the room owner can issue invitations" }, { status: 403 });
  }

  const targetUser = findUserStatement.get(body.userId) as { id: string } | undefined;
  if (!targetUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const isTargetMember = checkMembershipStatement.get(params.code, body.userId);
  if (isTargetMember) {
    return Response.json({ error: "User is already a member" }, { status: 409 });
  }

  const existingInvitation = findInvitationStatement.get(params.code, body.userId) as
    | { id: string; status: string }
    | undefined;
  if (existingInvitation?.status === "pending") {
    return Response.json({ error: "Invitation already pending" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  const expiresInHours =
    typeof body.expiresInHours === "number" && Number.isFinite(body.expiresInHours)
      ? Math.min(24 * 14, Math.max(1, Math.round(body.expiresInHours)))
      : 24 * 7;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  if (existingInvitation) {
    resetInvitationStatement.run(locals.user.id, inviteCode, expiresAt, existingInvitation.id);
  } else {
    insertInvitationStatement.run(id, params.code, locals.user.id, body.userId, inviteCode, expiresAt);
  }

  return Response.json({
    invitation: {
      id: existingInvitation?.id ?? id,
      roomCode: params.code,
      inviterId: locals.user.id,
      inviteeId: body.userId,
      inviteCode,
      expiresAt,
      privacy: room.privacy,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  });
}
