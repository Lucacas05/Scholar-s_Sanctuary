import type { APIContext } from "astro";
import { requireAdminAccess } from "@/lib/server/admin";
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
  const guard = requireAdminAccess(locals);
  if (guard) {
    return guard;
  }

  return getWardrobeConfigResponse();
}

export async function POST({ locals, request }: APIContext) {
  const guard = requireAdminAccess(locals);
  if (guard) {
    return guard;
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
  const guard = requireAdminAccess(locals);
  if (guard) {
    return guard;
  }

  deleteAppConfig("wardrobe-config");
  return getWardrobeConfigResponse();
}
