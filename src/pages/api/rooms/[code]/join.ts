import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectRoomStatement = db.prepare(
  "SELECT code, privacy FROM rooms WHERE code = ?",
);

const checkMembershipStatement = db.prepare(
  "SELECT 1 FROM room_members WHERE room_code = ? AND user_id = ?",
);

const findPendingInvitationForUserStatement = db.prepare(`
  SELECT id
  FROM room_invitations
  WHERE room_code = ?
    AND invitee_id = ?
    AND status = 'pending'
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > datetime('now'))
  ORDER BY created_at DESC
  LIMIT 1
`);

const findPendingInvitationByCodeStatement = db.prepare(`
  SELECT id
  FROM room_invitations
  WHERE room_code = ?
    AND invite_code = ?
    AND invitee_id = ?
    AND status = 'pending'
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > datetime('now'))
  LIMIT 1
`);

const acceptInvitationStatement = db.prepare(
  "UPDATE room_invitations SET status = 'accepted', accepted_at = datetime('now') WHERE id = ?",
);

const insertMemberStatement = db.prepare(
  "INSERT INTO room_members (room_code, user_id) VALUES (?, ?)",
);

export const prerender = false;

export async function POST({ locals, params, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { inviteCode?: string } | null;
  const inviteCode = payload?.inviteCode?.trim().toUpperCase() ?? "";

  const room = selectRoomStatement.get(params.code) as
    | { code: string; privacy: "public" | "private" }
    | undefined;
  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  const isMember = checkMembershipStatement.get(params.code, locals.user.id);
  if (isMember) {
    return Response.json({ error: "Already a member of this room" }, { status: 409 });
  }

  let invitation =
    (findPendingInvitationForUserStatement.get(params.code, locals.user.id) as { id: string } | undefined) ??
    undefined;

  if (!invitation && inviteCode) {
    invitation = findPendingInvitationByCodeStatement.get(
      params.code,
      inviteCode,
      locals.user.id,
    ) as { id: string } | undefined;
  }

  if (room.privacy === "private" && !invitation) {
    return Response.json({ error: "Private rooms require a valid invitation" }, { status: 403 });
  }

  const joinRoom = db.transaction(() => {
    if (invitation) {
      acceptInvitationStatement.run(invitation.id);
    }

    insertMemberStatement.run(params.code, locals.user!.id);
  });

  joinRoom();

  return Response.json({ ok: true });
}
