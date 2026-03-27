import type { APIContext } from "astro";
import { arctic, getGitHubOAuth } from "@/lib/server/oauth";
import { setOAuthStateCookie } from "@/lib/server/session";

export const prerender = false;

export async function GET({ cookies, redirect, request }: APIContext) {
  const github = getGitHubOAuth();
  if (!github) {
    return redirect("/");
  }

  const state = arctic.generateState();
  const url = github.createAuthorizationURL(state, ["read:user"]);

  setOAuthStateCookie(cookies, state, request);

  return Response.redirect(url, 302);
}
