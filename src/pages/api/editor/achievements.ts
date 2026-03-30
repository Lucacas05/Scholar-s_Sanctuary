import type { APIContext } from "astro";
import { requireAdminAccess } from "@/lib/server/admin";
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
  const guard = requireAdminAccess(locals);
  if (guard) {
    return guard;
  }

  return getAchievementResponse();
}

export async function POST({ locals, request }: APIContext) {
  const guard = requireAdminAccess(locals);
  if (guard) {
    return guard;
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
  const guard = requireAdminAccess(locals);
  if (guard) {
    return guard;
  }

  deleteAppConfig("achievement-definitions");
  return getAchievementResponse();
}
