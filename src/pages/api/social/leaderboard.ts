import type { APIContext } from "astro";
import { getWeeklyLeaderboard } from "@/lib/server/social";

export const prerender = false;

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(getWeeklyLeaderboard(locals.user.id));
}
