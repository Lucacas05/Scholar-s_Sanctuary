import type { APIContext } from "astro";
import { getPomodoroArchive } from "@/lib/server/pomodoro";

export const prerender = false;

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(getPomodoroArchive(locals.user.id));
}
