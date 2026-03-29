import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectInvitationsStatement = db.prepare(`
  SELECT
    ri.id,
    ri.room_code AS roomCode,
    ri.invite_code AS inviteCode,
    ri.expires_at AS expiresAt,
    r.name AS roomName,
    u.id AS inviterId,
    u.username AS inviterUsername,
    u.display_name AS inviterDisplayName,
    ri.created_at AS createdAt
  FROM room_invitations ri
  INNER JOIN rooms r ON r.code = ri.room_code
  INNER JOIN users u ON u.id = ri.inviter_id
  WHERE ri.invitee_id = ?
    AND ri.status = 'pending'
    AND ri.revoked_at IS NULL
    AND (ri.expires_at IS NULL OR ri.expires_at > datetime('now'))
`);

const findInvitationStatement = db.prepare(
  "SELECT id, room_code AS roomCode, invitee_id AS inviteeId, invite_code AS inviteCode, expires_at AS expiresAt, revoked_at AS revokedAt, status FROM room_invitations WHERE id = ?",
);

const updateInvitationStatusStatement = db.prepare(
  "UPDATE room_invitations SET status = ? WHERE id = ?",
);

const insertMemberStatement = db.prepare(
  "INSERT INTO room_members (room_code, user_id) VALUES (?, ?)",
);

const checkMembershipStatement = db.prepare(
  "SELECT 1 FROM room_members WHERE room_code = ? AND user_id = ?",
);

export const prerender = false;

function inviteLink(roomCode: string, inviteCode: string) {
  return `/social?codigo=${encodeURIComponent(roomCode)}&invite=${encodeURIComponent(inviteCode)}`;
}

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = selectInvitationsStatement.all(locals.user.id) as {
    id: string;
    roomCode: string;
    inviteCode: string | null;
    expiresAt: string | null;
    roomName: string;
    inviterId: string;
    inviterUsername: string;
    inviterDisplayName: string;
    createdAt: string;
  }[];

  const invitations = rows.map((row) => ({
    id: row.id,
    roomCode: row.roomCode,
    roomName: row.roomName,
    inviteCode: row.inviteCode,
    inviteLink: row.inviteCode ? inviteLink(row.roomCode, row.inviteCode) : null,
    expiresAt: row.expiresAt,
    inviter: {
      id: row.inviterId,
      username: row.inviterUsername,
      displayName: row.inviterDisplayName,
    },
    createdAt: row.createdAt,
  }));

  return Response.json({ invitations });
}

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { invitationId?: string; action?: string }
    | null;

  if (!body?.invitationId || !body?.action) {
    return Response.json({ error: "invitationId and action are required" }, { status: 400 });
  }

  if (body.action !== "accept" && body.action !== "decline") {
    return Response.json({ error: "Action must be 'accept' or 'decline'" }, { status: 400 });
  }

  const invitation = findInvitationStatement.get(body.invitationId) as
    | {
        id: string;
        roomCode: string;
        inviteeId: string;
        inviteCode: string | null;
        expiresAt: string | null;
        revokedAt: string | null;
        status: string;
      }
    | undefined;

  if (!invitation) {
    return Response.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.inviteeId !== locals.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (invitation.status !== "pending") {
    return Response.json({ error: "Invitation is not pending" }, { status: 400 });
  }

  if (invitation.revokedAt) {
    return Response.json({ error: "Invitation has been revoked" }, { status: 400 });
  }

  if (invitation.expiresAt && Date.parse(invitation.expiresAt) <= Date.now()) {
    updateInvitationStatusStatement.run("expired", body.invitationId);
    return Response.json({ error: "Invitation has expired" }, { status: 400 });
  }

  if (body.action === "accept") {
    const acceptInvitation = db.transaction(() => {
      updateInvitationStatusStatement.run("accepted", body.invitationId);
      const alreadyMember = checkMembershipStatement.get(invitation.roomCode, locals.user!.id);
      if (!alreadyMember) {
        insertMemberStatement.run(invitation.roomCode, locals.user!.id);
      }
    });
    acceptInvitation();
  } else {
    updateInvitationStatusStatement.run("declined", body.invitationId);
  }

  return Response.json({ ok: true });
}
