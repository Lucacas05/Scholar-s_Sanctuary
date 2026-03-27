import type { MiddlewareHandler } from "astro";
import {
  cleanupExpiredSessions,
  clearSessionCookie,
  getSession,
  getSessionIdFromCookies,
} from "@/lib/server/session";

export const onRequest: MiddlewareHandler = async ({ cookies, locals, request }, next) => {
  locals.user = null;
  locals.sessionId = null;

  cleanupExpiredSessions();

  const sessionId = getSessionIdFromCookies(cookies);
  if (sessionId) {
    const session = getSession(sessionId);
    if (session) {
      locals.user = session.user;
      locals.sessionId = session.sessionId;
    } else {
      clearSessionCookie(cookies, request);
    }
  }

  return next();
};
