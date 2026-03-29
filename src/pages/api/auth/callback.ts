import type { APIContext } from "astro";
import { db } from "@/lib/server/db";
import { getGitHubOAuth } from "@/lib/server/oauth";
import {
  clearOAuthNextCookie,
  clearOAuthStateCookie,
  createSession,
  getOAuthNextFromCookies,
  getOAuthStateFromCookies,
  setSessionCookie,
} from "@/lib/server/session";
import { getUserStateSnapshot } from "@/lib/server/user-state";

interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

const upsertUserStatement = db.prepare(`
  INSERT INTO users (id, github_id, username, display_name, avatar_url)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(github_id) DO UPDATE SET
    username = excluded.username,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = datetime('now')
`);

export const prerender = false;

export async function GET({ cookies, redirect, request, url }: APIContext) {
  const github = getGitHubOAuth();
  if (!github) {
    return redirect("/?auth=error");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = getOAuthStateFromCookies(cookies);
  const nextPath = getOAuthNextFromCookies(cookies);

  clearOAuthStateCookie(cookies, request);
  clearOAuthNextCookie(cookies, request);

  if (!code || !state || !storedState || state !== storedState) {
    return redirect("/?auth=error");
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokens.accessToken()}`,
        "User-Agent": "Lumina",
      },
    });

    if (!response.ok) {
      return redirect("/?auth=error");
    }

    const githubUser = (await response.json()) as GitHubUserResponse;
    const userId = `github-${githubUser.id}`;

    upsertUserStatement.run(
      userId,
      githubUser.id,
      githubUser.login,
      githubUser.name?.trim() || githubUser.login,
      githubUser.avatar_url,
    );

    const session = createSession(userId);
    setSessionCookie(cookies, session.id, request);

    const userState = getUserStateSnapshot(userId);
    const targetPath =
      nextPath ??
      (userState.onboardingCompleted
        ? userState.preferredStartPath
        : "/bienvenida");

    return redirect(
      `${targetPath}${targetPath.includes("?") ? "&" : "?"}auth=success`,
    );
  } catch {
    return redirect("/?auth=error");
  }
}
