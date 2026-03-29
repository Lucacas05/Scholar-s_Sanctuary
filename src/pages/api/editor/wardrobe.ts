import type { APIContext } from "astro";
import {
  deleteAppConfig,
  readAppConfig,
  writeAppConfig,
} from "@/lib/server/app-config";
import {
  getDefaultWardrobeConfig,
  normalizeWardrobeConfig,
} from "@/lib/sanctuary/wardrobe";

export const prerender = false;

function getWardrobeConfigResponse() {
  const stored = readAppConfig("wardrobe-config");
  const config = stored
    ? normalizeWardrobeConfig(stored.value)
    : getDefaultWardrobeConfig();

  return Response.json({
    config,
    updatedAt: stored?.updatedAt ?? null,
  });
}

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return getWardrobeConfigResponse();
}

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    config?: unknown;
  } | null;
  if (!payload || !("config" in payload)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const config = normalizeWardrobeConfig(payload.config);
  writeAppConfig("wardrobe-config", config);

  return getWardrobeConfigResponse();
}

export async function DELETE({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  deleteAppConfig("wardrobe-config");
  return getWardrobeConfigResponse();
}
