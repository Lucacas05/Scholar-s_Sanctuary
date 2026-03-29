import type { APIContext } from "astro";
import {
  deleteAppConfig,
  readAppConfig,
  writeAppConfig,
} from "@/lib/server/app-config";
import {
  getDefaultAchievementDefinitions,
  normalizeAchievementDefinitions,
} from "@/lib/sanctuary/achievements";

export const prerender = false;

function getAchievementResponse() {
  const stored = readAppConfig("achievement-definitions");
  const achievements = stored
    ? normalizeAchievementDefinitions(stored.value)
    : getDefaultAchievementDefinitions();

  return Response.json({
    achievements,
    updatedAt: stored?.updatedAt ?? null,
  });
}

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return getAchievementResponse();
}

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    achievements?: unknown;
  } | null;
  if (!payload || !("achievements" in payload)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const achievements = normalizeAchievementDefinitions(payload.achievements);
  writeAppConfig("achievement-definitions", achievements);

  return getAchievementResponse();
}

export async function DELETE({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  deleteAppConfig("achievement-definitions");
  return getAchievementResponse();
}
