import type { APIContext } from "astro";
import { db } from "@/lib/server/db";
import { isGitHubOAuthConfigured } from "@/lib/server/oauth";

const selectUserStateStatement = db.prepare("SELECT state_json FROM users WHERE id = ?");
const updateUserStateStatement = db.prepare(
  "UPDATE users SET state_json = ?, updated_at = datetime('now') WHERE id = ?",
);

export const prerender = false;

export async function GET({ locals }: APIContext) {
  if (!locals.user) {
    return Response.json({
      oauthAvailable: isGitHubOAuthConfigured(),
      stateJson: null,
      user: null,
    });
  }

  const row = selectUserStateStatement.get(locals.user.id) as { state_json: string | null } | undefined;
  let stateJson: unknown = null;

  if (row?.state_json) {
    try {
      stateJson = JSON.parse(row.state_json);
    } catch {
      stateJson = null;
    }
  }

  return Response.json({
    oauthAvailable: isGitHubOAuthConfigured(),
    stateJson,
    user: locals.user,
  });
}

export async function POST({ locals, request }: APIContext) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { state?: unknown } | null;
  if (!payload || !("state" in payload)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  updateUserStateStatement.run(JSON.stringify(payload.state), locals.user.id);

  return Response.json({ ok: true });
}
