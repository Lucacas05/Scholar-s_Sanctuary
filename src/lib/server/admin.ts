import type { SessionUser } from "@/lib/server/session";

function parseAdminUsernames() {
  return (process.env.ADMIN_GITHUB_USERS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(
  user: Pick<SessionUser, "username"> | null | undefined,
) {
  if (!user) {
    return false;
  }

  return parseAdminUsernames().includes(user.username.trim().toLowerCase());
}

export function hasAdminAccess(locals: Pick<App.Locals, "user" | "isAdmin">) {
  return Boolean(locals.user && (locals.isAdmin || isAdminUser(locals.user)));
}

export function requireAdminAccess(
  locals: Pick<App.Locals, "user" | "isAdmin">,
) {
  if (!locals.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAdminAccess(locals)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
