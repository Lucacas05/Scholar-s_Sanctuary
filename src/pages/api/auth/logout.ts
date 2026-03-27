import type { APIContext } from "astro";
import {
  clearSessionCookie,
  deleteSession,
  getSessionIdFromCookies,
} from "@/lib/server/session";

export const prerender = false;

function logout(context: APIContext) {
  const sessionId = getSessionIdFromCookies(context.cookies);
  if (sessionId) {
    deleteSession(sessionId);
  }

  clearSessionCookie(context.cookies, context.request);
  return context.redirect("/");
}

export async function GET(context: APIContext) {
  return logout(context);
}

export async function POST(context: APIContext) {
  return logout(context);
}
