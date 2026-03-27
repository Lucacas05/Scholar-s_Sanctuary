import type { APIContext } from "astro";
import { db } from "@/lib/server/db";
import { getGitHubOAuth } from "@/lib/server/oauth";
import {
  clearOAuthStateCookie,
  createSession,
  getOAuthStateFromCookies,
  setSessionCookie,
} from "@/lib/server/session";

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
    return redirect("/");
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = getOAuthStateFromCookies(cookies);

  clearOAuthStateCookie(cookies, request);

  if (!code || !state || !storedState || state !== storedState) {
    return redirect("/");
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
      return redirect("/");
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

    return redirect("/");
  } catch {
    return redirect("/");
  }
}
