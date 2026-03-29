import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectRoomStatement = db.prepare(
  "SELECT code, owner_id AS ownerId, privacy FROM rooms WHERE code = ?",
);

const checkMembershipStatement = db.prepare(
  "SELECT 1 FROM room_members WHERE room_code = ? AND user_id = ?",
);

const findUserStatement = db.prepare("SELECT id FROM users WHERE id = ?");

const findPendingInvitationStatement = db.prepare(
  "SELECT id FROM room_invitations WHERE room_code = ? AND invitee_id = ? AND status = 'pending' AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))",
);

const insertInvitationStatement = db.prepare(
  "INSERT INTO room_invitations (id, room_code, inviter_id, invitee_id, invite_code, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
);

const selectActiveInvitationsStatement = db.prepare(`
  SELECT
    ri.id,
    ri.invitee_id AS inviteeId,
    ri.invite_code AS inviteCode,
    ri.created_at AS createdAt,
    ri.expires_at AS expiresAt,
    u.username,
    u.display_name AS displayName
  FROM room_invitations ri
  INNER JOIN users u ON u.id = ri.invitee_id
  WHERE ri.room_code = ?
    AND ri.status = 'pending'
    AND ri.revoked_at IS NULL
    AND (ri.expires_at IS NULL OR ri.expires_at > datetime('now'))
  ORDER BY ri.created_at DESC
`);

const revokeInvitationStatement = db.prepare(
  "UPDATE room_invitations SET revoked_at = datetime('now'), status = 'revoked' WHERE id = ? AND room_code = ?",
);

export const prerender = false;

function inviteLink(roomCode: string, inviteCode: string) {
  return `/social?codigo=${encodeURIComponent(roomCode)}&invite=${encodeURIComponent(inviteCode)}`;
}

export async function GET({ locals, params }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const room = selectRoomStatement.get(params.code) as
    | { code: string; ownerId: string; privacy: "public" | "private" }
    | undefined;

  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.ownerId !== locals.user.id) {
    return Response.json({ error: "Only owner can manage invitations" }, { status: 403 });
  }

  const invitations = (selectActiveInvitationsStatement.all(params.code) as {
    id: string;
    inviteeId: string;
    inviteCode: string;
    createdAt: string;
    expiresAt: string | null;
    username: string;
    displayName: string;
  }[]).map((row) => ({
    id: row.id,
    inviteeId: row.inviteeId,
    inviteCode: row.inviteCode,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    invitee: {
      id: row.inviteeId,
      username: row.username,
      displayName: row.displayName,
    },
    inviteLink: inviteLink(params.code!, row.inviteCode),
  }));

  return Response.json({ invitations });
}

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

  if (room.ownerId !== locals.user.id) {
    return Response.json({ error: "Only owner can invite to this room" }, { status: 403 });
  }

  const isMember = checkMembershipStatement.get(params.code, locals.user.id);
  if (!isMember) {
    return Response.json({ error: "Not a member of this room" }, { status: 403 });
  }

  const targetUser = findUserStatement.get(body.userId) as { id: string } | undefined;
  if (!targetUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const isTargetMember = checkMembershipStatement.get(params.code, body.userId);
  if (isTargetMember) {
    return Response.json({ error: "User is already a member" }, { status: 409 });
  }

  const existingInvitation = findPendingInvitationStatement.get(params.code, body.userId) as
    | { id: string }
    | undefined;
  if (existingInvitation) {
    return Response.json({ error: "Invitation already pending" }, { status: 409 });
  }

  const expiresInHours = Number.isFinite(body.expiresInHours) && (body.expiresInHours ?? 0) > 0
    ? Math.min(168, Math.max(1, Math.round(body.expiresInHours!)))
    : 72;

  const id = crypto.randomUUID();
  const inviteCode = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
  insertInvitationStatement.run(id, params.code, locals.user.id, body.userId, inviteCode, expiresAt);

  return Response.json({
    invitation: {
      id,
      roomCode: params.code,
      inviterId: locals.user.id,
      inviteeId: body.userId,
      inviteCode,
      inviteLink: inviteLink(params.code!, inviteCode),
      expiresAt,
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  });
}

export async function DELETE({ locals, params, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const room = selectRoomStatement.get(params.code) as
    | { code: string; ownerId: string }
    | undefined;
  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.ownerId !== locals.user.id) {
    return Response.json({ error: "Only owner can revoke invitations" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { invitationId?: string } | null;
  if (!body?.invitationId) {
    return Response.json({ error: "invitationId is required" }, { status: 400 });
  }

  const result = revokeInvitationStatement.run(body.invitationId, params.code);
  if (result.changes === 0) {
    return Response.json({ error: "Invitation not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
