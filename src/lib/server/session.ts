import type { APIContext } from "astro";
import { db } from "./db";

export interface SessionUser {
  id: string;
  githubId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface SessionRow {
  sessionId: string;
  expiresAt: string;
  id: string;
  githubId: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

type CookieJar = Pick<APIContext["cookies"], "get" | "set" | "delete">;

const SESSION_COOKIE_NAME = "sanctuary_session";
const OAUTH_STATE_COOKIE_NAME = "oauth_state";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_TTL_SECONDS = 60 * 5;

const createSessionStatement = db.prepare(
  "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
);
const deleteSessionStatement = db.prepare("DELETE FROM sessions WHERE id = ?");
const deleteExpiredSessionsStatement = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");
const selectSessionStatement = db.prepare(`
  SELECT
    sessions.id AS sessionId,
    sessions.expires_at AS expiresAt,
    users.id AS id,
    users.github_id AS githubId,
    users.username AS username,
    users.display_name AS displayName,
    users.avatar_url AS avatarUrl
  FROM sessions
  INNER JOIN users ON users.id = sessions.user_id
  WHERE sessions.id = ?
`);

function isSecureCookie(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return true;
  }

  return new URL(request.url).protocol === "https:";
}

function deleteCookie(cookies: CookieJar, name: string, request: Request) {
  cookies.delete(name, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(request),
  });
}

export function cleanupExpiredSessions() {
  deleteExpiredSessionsStatement.run(new Date().toISOString());
}

export function createSession(userId: string) {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  createSessionStatement.run(id, userId, expiresAt);
  return { id, expiresAt };
}

export function getSession(sessionId: string) {
  cleanupExpiredSessions();

  const row = selectSessionStatement.get(sessionId) as SessionRow | undefined;
  if (!row) {
    return null;
  }

  if (Date.parse(row.expiresAt) <= Date.now()) {
    deleteSession(sessionId);
    return null;
  }

  return {
    sessionId: row.sessionId,
    expiresAt: row.expiresAt,
    user: {
      id: row.id,
      githubId: row.githubId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
    } satisfies SessionUser,
  };
}

export function deleteSession(sessionId: string) {
  deleteSessionStatement.run(sessionId);
}

export function getSessionIdFromCookies(cookies: CookieJar) {
  return cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function setSessionCookie(cookies: CookieJar, sessionId: string, request: Request) {
  cookies.set(SESSION_COOKIE_NAME, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(request),
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(cookies: CookieJar, request: Request) {
  deleteCookie(cookies, SESSION_COOKIE_NAME, request);
}

export function getOAuthStateFromCookies(cookies: CookieJar) {
  return cookies.get(OAUTH_STATE_COOKIE_NAME)?.value ?? null;
}

export function setOAuthStateCookie(cookies: CookieJar, state: string, request: Request) {
  cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(request),
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
}

export function clearOAuthStateCookie(cookies: CookieJar, request: Request) {
  deleteCookie(cookies, OAUTH_STATE_COOKIE_NAME, request);
}
