import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectInvitationsStatement = db.prepare(`
  SELECT
    ri.id,
    ri.room_code AS roomCode,
    r.name AS roomName,
    r.owner_id AS roomOwnerId,
    r.privacy AS roomPrivacy,
    u.id AS inviterId,
    u.username AS inviterUsername,
    u.display_name AS inviterDisplayName,
    ri.invite_code AS inviteCode,
    ri.created_at AS createdAt,
    ri.expires_at AS expiresAt
  FROM room_invitations ri
  INNER JOIN rooms r ON r.code = ri.room_code
  INNER JOIN users u ON u.id = ri.inviter_id
  WHERE ri.invitee_id = ?
    AND ri.status = 'pending'
    AND ri.revoked_at IS NULL
    AND (ri.expires_at IS NULL OR ri.expires_at > datetime('now'))
  ORDER BY ri.created_at DESC
`);

const findInvitationStatement = db.prepare(`
  SELECT
    ri.id,
    ri.room_code AS roomCode,
    ri.inviter_id AS inviterId,
    ri.invitee_id AS inviteeId,
    ri.invite_code AS inviteCode,
    ri.status,
    ri.expires_at AS expiresAt,
    ri.revoked_at AS revokedAt,
    r.owner_id AS roomOwnerId
  FROM room_invitations ri
  INNER JOIN rooms r ON r.code = ri.room_code
  WHERE ri.id = ?
`);

const updateInvitationAcceptedStatement = db.prepare(`
  UPDATE room_invitations
  SET status = 'accepted', accepted_at = datetime('now')
  WHERE id = ?
`);

const updateInvitationDeclinedStatement = db.prepare(`
  UPDATE room_invitations
  SET status = 'declined'
  WHERE id = ?
`);

const updateInvitationRevokedStatement = db.prepare(`
  UPDATE room_invitations
  SET status = 'revoked', revoked_at = datetime('now')
  WHERE id = ?
`);

const insertMemberStatement = db.prepare(
  "INSERT OR IGNORE INTO room_members (room_code, user_id) VALUES (?, ?)",
);

export const prerender = false;

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = selectInvitationsStatement.all(locals.user.id) as Array<{
    id: string;
    roomCode: string;
    roomName: string;
    roomOwnerId: string;
    roomPrivacy: "public" | "private";
    inviterId: string;
    inviterUsername: string;
    inviterDisplayName: string;
    inviteCode: string | null;
    createdAt: string;
    expiresAt: string | null;
  }>;

  const invitations = rows.map((row) => ({
    id: row.id,
    roomCode: row.roomCode,
    roomName: row.roomName,
    roomPrivacy: row.roomPrivacy,
    inviteCode: row.inviteCode,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    inviter: {
      id: row.inviterId,
      username: row.inviterUsername,
      displayName: row.inviterDisplayName,
    },
  }));

  return Response.json({ invitations });
}

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { invitationId?: string; action?: "accept" | "decline" | "revoke" }
    | null;

  if (!body?.invitationId || !body?.action) {
    return Response.json({ error: "invitationId and action are required" }, { status: 400 });
  }

  if (!["accept", "decline", "revoke"].includes(body.action)) {
    return Response.json({ error: "Unsupported action" }, { status: 400 });
  }

  const invitation = findInvitationStatement.get(body.invitationId) as
    | {
        id: string;
        roomCode: string;
        inviterId: string;
        inviteeId: string;
        inviteCode: string | null;
        status: string;
        expiresAt: string | null;
        revokedAt: string | null;
        roomOwnerId: string;
      }
    | undefined;

  if (!invitation) {
    return Response.json({ error: "Invitation not found" }, { status: 404 });
  }

  const isExpired = Boolean(invitation.expiresAt && Date.parse(invitation.expiresAt) <= Date.now());

  if (body.action === "revoke") {
    if (locals.user.id !== invitation.inviterId && locals.user.id !== invitation.roomOwnerId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (invitation.status !== "pending" || invitation.revokedAt || isExpired) {
      return Response.json({ error: "Invitation can no longer be revoked" }, { status: 400 });
    }

    updateInvitationRevokedStatement.run(body.invitationId);
    return Response.json({ ok: true, status: "revoked" });
  }

  if (invitation.inviteeId !== locals.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (invitation.status !== "pending" || invitation.revokedAt) {
    return Response.json({ error: "Invitation is not pending" }, { status: 400 });
  }

  if (isExpired) {
    updateInvitationRevokedStatement.run(body.invitationId);
    return Response.json({ error: "Invitation expired" }, { status: 410 });
  }

  if (body.action === "accept") {
    const acceptInvitation = db.transaction(() => {
      updateInvitationAcceptedStatement.run(body.invitationId);
      insertMemberStatement.run(invitation.roomCode, locals.user!.id);
    });

    acceptInvitation();
    return Response.json({ ok: true, status: "accepted" });
  }

  updateInvitationDeclinedStatement.run(body.invitationId);
  return Response.json({ ok: true, status: "declined" });
}
