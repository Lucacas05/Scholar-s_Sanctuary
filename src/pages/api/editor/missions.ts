import type { APIContext } from "astro";
import {
  deleteAppConfig,
  readAppConfig,
  writeAppConfig,
} from "@/lib/server/app-config";
import {
  getDefaultMissionDefinitions,
  normalizeMissionDefinitions,
} from "@/lib/sanctuary/missions";

export const prerender = false;

function getMissionResponse() {
  const stored = readAppConfig("mission-definitions");
  const missions = stored
    ? normalizeMissionDefinitions(stored.value)
    : getDefaultMissionDefinitions();

  return Response.json({
    missions,
    updatedAt: stored?.updatedAt ?? null,
  });
}

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return getMissionResponse();
}

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    missions?: unknown;
  } | null;
  if (!payload || !("missions" in payload)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const missions = normalizeMissionDefinitions(payload.missions);
  writeAppConfig("mission-definitions", missions);

  return getMissionResponse();
}

export async function DELETE({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  deleteAppConfig("mission-definitions");
  return getMissionResponse();
}
