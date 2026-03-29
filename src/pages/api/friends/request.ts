import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const findUserByUsernameStatement = db.prepare(
  "SELECT id FROM users WHERE username = ?",
);

const findExistingFriendshipStatement = db.prepare(
  "SELECT id, user_id, friend_id, status FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
);

const insertFriendshipStatement = db.prepare(
  "INSERT INTO friendships (id, user_id, friend_id, status) VALUES (?, ?, ?, ?)",
);

const updateFriendshipStatusStatement = db.prepare(
  "UPDATE friendships SET status = ? WHERE id = ?",
);

export const prerender = false;

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    username?: string;
  } | null;
  if (!body?.username) {
    return Response.json({ error: "Username is required" }, { status: 400 });
  }

  const targetUser = findUserByUsernameStatement.get(body.username) as
    | { id: string }
    | undefined;
  if (!targetUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.id === locals.user.id) {
    return Response.json(
      { error: "Cannot send friend request to yourself" },
      { status: 400 },
    );
  }

  const existing = findExistingFriendshipStatement.get(
    locals.user.id,
    targetUser.id,
    targetUser.id,
    locals.user.id,
  ) as
    | { id: string; user_id: string; friend_id: string; status: string }
    | undefined;

  if (existing) {
    if (existing.status === "accepted") {
      return Response.json({ error: "Already friends" }, { status: 409 });
    }

    // The other person already sent us a request — auto-accept
    if (
      existing.user_id === targetUser.id &&
      existing.friend_id === locals.user.id
    ) {
      updateFriendshipStatusStatement.run("accepted", existing.id);
      return Response.json({ id: existing.id, status: "accepted" });
    }

    // We already sent a request to them
    return Response.json(
      { error: "Friend request already sent" },
      { status: 409 },
    );
  }

  const id = crypto.randomUUID();
  insertFriendshipStatement.run(id, locals.user.id, targetUser.id, "pending");

  return Response.json({ id, status: "pending" });
}
