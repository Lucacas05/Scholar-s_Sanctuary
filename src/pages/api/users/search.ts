import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const searchUsersStatement = db.prepare(
  "SELECT id, username, display_name AS displayName, avatar_url AS avatarUrl FROM users WHERE username LIKE ? AND id != ? LIMIT 10",
);

export const prerender = false;

export async function GET({ locals, url }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = url.searchParams.get("q");
  if (!query || query.trim().length === 0) {
    return Response.json({ users: [] });
  }

  const rows = searchUsersStatement.all(
    `%${query.trim()}%`,
    locals.user.id,
  ) as {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }[];

  return Response.json({ users: rows });
}
