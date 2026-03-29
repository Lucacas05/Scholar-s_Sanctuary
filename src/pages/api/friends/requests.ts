import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectIncomingRequestsStatement = db.prepare(`
  SELECT
    f.id,
    u.id AS userId,
    u.username,
    u.display_name AS displayName,
    u.avatar_url AS avatarUrl
  FROM friendships f
  INNER JOIN users u ON u.id = f.user_id
  WHERE f.status = 'pending' AND f.friend_id = ?
`);

const selectOutgoingRequestsStatement = db.prepare(`
  SELECT
    f.id,
    u.id AS userId,
    u.username,
    u.display_name AS displayName,
    u.avatar_url AS avatarUrl
  FROM friendships f
  INNER JOIN users u ON u.id = f.friend_id
  WHERE f.status = 'pending' AND f.user_id = ?
`);

export const prerender = false;

interface RequestRow {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

function mapRequestRow(row: RequestRow) {
  return {
    id: row.id,
    user: {
      id: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    },
  };
}

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const incoming = (
    selectIncomingRequestsStatement.all(locals.user.id) as RequestRow[]
  ).map(mapRequestRow);
  const outgoing = (
    selectOutgoingRequestsStatement.all(locals.user.id) as RequestRow[]
  ).map(mapRequestRow);

  return Response.json({ incoming, outgoing });
}
