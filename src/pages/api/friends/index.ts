import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const selectFriendsStatement = db.prepare(`
  SELECT
    f.id,
    u.id AS friendId,
    u.username,
    u.display_name AS displayName,
    u.avatar_url AS avatarUrl,
    u.last_seen_at AS lastSeenAt
  FROM friendships f
  INNER JOIN users u ON u.id = CASE
    WHEN f.user_id = ? THEN f.friend_id
    ELSE f.user_id
  END
  WHERE f.status = 'accepted'
    AND (f.user_id = ? OR f.friend_id = ?)
`);

export const prerender = false;

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = selectFriendsStatement.all(
    locals.user.id,
    locals.user.id,
    locals.user.id,
  ) as {
    id: string;
    friendId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    lastSeenAt: string | null;
  }[];

  const friends = rows.map((row) => ({
    friendshipId: row.id,
    friend: {
      id: row.friendId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      lastSeenAt: row.lastSeenAt,
    },
  }));

  return Response.json({ friends });
}
