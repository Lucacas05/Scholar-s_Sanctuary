import type { APIContext } from "astro";
import { db } from "@/lib/server/db";

const findFriendshipStatement = db.prepare(
  "SELECT id, friend_id, status FROM friendships WHERE id = ?",
);

const deleteFriendshipStatement = db.prepare(
  "DELETE FROM friendships WHERE id = ?",
);

export const prerender = false;

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    friendshipId?: string;
  } | null;
  if (!body?.friendshipId) {
    return Response.json(
      { error: "Friendship ID is required" },
      { status: 400 },
    );
  }

  const friendship = findFriendshipStatement.get(body.friendshipId) as
    | { id: string; friend_id: string; status: string }
    | undefined;

  if (!friendship) {
    return Response.json(
      { error: "Friend request not found" },
      { status: 404 },
    );
  }

  if (friendship.friend_id !== locals.user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (friendship.status !== "pending") {
    return Response.json(
      { error: "Friend request is not pending" },
      { status: 400 },
    );
  }

  deleteFriendshipStatement.run(body.friendshipId);

  return Response.json({ ok: true });
}
