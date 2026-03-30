import type { MiddlewareHandler } from "astro";
import { isAdminUser } from "@/lib/server/admin";
import { getUserStateSnapshot } from "@/lib/server/user-state";
import {
  cleanupExpiredSessions,
  clearSessionCookie,
  getSession,
  getSessionIdFromCookies,
} from "@/lib/server/session";

const ACCOUNT_ONLY_PATHS = [
  "/estudio",
  "/biblioteca-compartida",
  "/jardin",
  "/refinar",
  "/armario",
  "/editor-armario",
  "/editor-misiones",
  "/editor-escenas",
  "/cronicas",
  "/social",
  "/ajustes",
] as const;
const ADMIN_ONLY_PATHS = [
  "/editor-armario",
  "/editor-misiones",
  "/editor-escenas",
] as const;
const ONBOARDING_PATH = "/bienvenida";

function isAccountOnlyPath(pathname: string) {
  return ACCOUNT_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isAdminOnlyPath(pathname: string) {
  return ADMIN_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function getPublicOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const protocol = new URL(request.url).protocol;

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (forwardedProto && host) {
    return `${forwardedProto}://${host}`;
  }

  if (host) {
    return `${protocol}//${host}`;
  }

  if (import.meta.env.SITE_URL) {
    return import.meta.env.SITE_URL.replace(/\/+$/, "");
  }

  return new URL(request.url).origin;
}

function buildRedirectURL(
  request: Request,
  pathname: string,
  nextPath?: string,
) {
  const url = new URL(pathname, getPublicOrigin(request));
  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }
  return url;
}

export const onRequest: MiddlewareHandler = async (
  { cookies, locals, request },
  next,
) => {
  locals.user = null;
  locals.sessionId = null;
  locals.userState = null;
  locals.onboardingCompleted = false;
  locals.isAdmin = false;

  cleanupExpiredSessions();

  const sessionId = getSessionIdFromCookies(cookies);
  if (sessionId) {
    const session = getSession(sessionId);
    if (session) {
      locals.user = session.user;
      locals.sessionId = session.sessionId;
      locals.userState = getUserStateSnapshot(session.user.id);
      locals.onboardingCompleted = locals.userState.onboardingCompleted;
      locals.isAdmin = isAdminUser(session.user);
    } else {
      clearSessionCookie(cookies, request);
    }
  }

  const currentURL = new URL(request.url);
  const pathname = currentURL.pathname;
  const nextPath = `${pathname}${currentURL.search}`;
  const isReplayOnboarding = currentURL.searchParams.get("repetir") === "1";

  if (pathname === ONBOARDING_PATH) {
    if (!locals.user) {
      return Response.redirect(
        buildRedirectURL(request, "/api/auth/login", nextPath),
        302,
      );
    }

    if (locals.onboardingCompleted && !isReplayOnboarding) {
      return Response.redirect(
        buildRedirectURL(
          request,
          locals.userState?.preferredStartPath || "/biblioteca-compartida",
        ),
        302,
      );
    }
  }

  if (isAccountOnlyPath(pathname)) {
    if (!locals.user) {
      return Response.redirect(
        buildRedirectURL(request, "/api/auth/login", nextPath),
        302,
      );
    }

    if (!locals.onboardingCompleted) {
      return Response.redirect(
        buildRedirectURL(request, ONBOARDING_PATH, nextPath),
        302,
      );
    }
  }

  if (isAdminOnlyPath(pathname) && !locals.isAdmin) {
    return Response.redirect(buildRedirectURL(request, "/ajustes"), 302);
  }

  return next();
};
