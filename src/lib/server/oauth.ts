import * as arctic from "arctic";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function isGitHubOAuthConfigured() {
  return Boolean(
    import.meta.env.GITHUB_CLIENT_ID &&
    import.meta.env.GITHUB_CLIENT_SECRET &&
    import.meta.env.SITE_URL,
  );
}

export function getGitHubOAuth() {
  if (!isGitHubOAuthConfigured()) {
    return null;
  }

  return new arctic.GitHub(
    import.meta.env.GITHUB_CLIENT_ID!,
    import.meta.env.GITHUB_CLIENT_SECRET!,
    `${trimTrailingSlash(import.meta.env.SITE_URL!)}/api/auth/callback`,
  );
}

export { arctic };
