import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectRoomStatement = db.prepare("SELECT code, privacy FROM rooms WHERE code = ?");

const checkMembershipStatement = db.prepare(
  "SELECT 1 FROM room_members WHERE room_code = ? AND user_id = ?",
);

const findPendingInvitationStatement = db.prepare(
  "SELECT id FROM room_invitations WHERE room_code = ? AND invitee_id = ? AND status = 'pending' AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))",
);

const findInvitationByCodeStatement = db.prepare(
  "SELECT id, invitee_id AS inviteeId FROM room_invitations WHERE room_code = ? AND invite_code = ? AND status = 'pending' AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))",
);

const acceptInvitationStatement = db.prepare(
  "UPDATE room_invitations SET status = 'accepted' WHERE id = ?",
);

const insertMemberStatement = db.prepare(
  "INSERT INTO room_members (room_code, user_id) VALUES (?, ?)",
);

export const prerender = false;

export async function POST({ locals, params, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const body = (await request.json().catch(() => null)) as { inviteCode?: string } | null;
  const inviteCode = body?.inviteCode?.trim().toUpperCase();

  let invitationId: string | null = null;

  if (room.privacy === "private") {
    const directInvitation = findPendingInvitationStatement.get(params.code, locals.user.id) as
      | { id: string }
      | undefined;

    if (directInvitation) {
      invitationId = directInvitation.id;
    } else if (inviteCode) {
      const inviteByCode = findInvitationByCodeStatement.get(params.code, inviteCode) as
        | { id: string; inviteeId: string }
        | undefined;

      if (!inviteByCode || inviteByCode.inviteeId !== locals.user.id) {
        return Response.json({ error: "Invalid or expired invite code" }, { status: 403 });
      }

      invitationId = inviteByCode.id;
    } else {
      return Response.json({ error: "Private room requires a valid invitation" }, { status: 403 });
    }
  }

  const joinRoom = db.transaction(() => {
    if (invitationId) {
      acceptInvitationStatement.run(invitationId);
    }
    insertMemberStatement.run(params.code, locals.user!.id);
  });
  joinRoom();

  return Response.json({ ok: true });
}
