import type { APIContext } from "astro";
import { getFriendActivityFeed } from "@/lib/server/social";

export const prerender = false;

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(getFriendActivityFeed(locals.user.id));
}
