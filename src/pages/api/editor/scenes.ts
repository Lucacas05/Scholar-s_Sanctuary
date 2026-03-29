import type { APIContext } from "astro";
import {
  deleteAppConfig,
  readAppConfig,
  writeAppConfig,
} from "@/lib/server/app-config";
import { normalizePublishedSceneMaps } from "@/lib/sanctuary/canvas/sceneMaps";

export const prerender = false;

function getSceneResponse() {
  const stored = readAppConfig("published-scene-maps");
  const scenes = stored ? normalizePublishedSceneMaps(stored.value) : {};

  return Response.json({
    scenes,
    updatedAt: stored?.updatedAt ?? null,
  });
}

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return getSceneResponse();
}

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    scenes?: unknown;
  } | null;
  if (!payload || !("scenes" in payload)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const scenes = normalizePublishedSceneMaps(payload.scenes);
  writeAppConfig("published-scene-maps", scenes);

  return getSceneResponse();
}

export async function DELETE({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  deleteAppConfig("published-scene-maps");
  return getSceneResponse();
}
