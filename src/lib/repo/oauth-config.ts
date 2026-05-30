import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_OAUTH_REDIRECT_URL,
  GITLAB_CLIENT_ID,
  GITLAB_CLIENT_SECRET,
} from "astro:env/server";

export function getOAuthStateSecret(): string | null {
  return GITHUB_CLIENT_SECRET ?? GITLAB_CLIENT_SECRET ?? null;
}

export function getGithubOAuthConfig(requestUrl: string): { clientId: string; redirectUri: string } | null {
  if (!GITHUB_CLIENT_ID) {
    return null;
  }

  const redirectUri = GITHUB_OAUTH_REDIRECT_URL ?? `${new URL(requestUrl).origin}/api/repo/oauth/github/callback`;
  return { clientId: GITHUB_CLIENT_ID, redirectUri };
}

export function getGitlabOAuthConfig(requestUrl: string): { clientId: string; redirectUri: string } | null {
  if (!GITLAB_CLIENT_ID) {
    return null;
  }

  const redirectUri = `${new URL(requestUrl).origin}/api/repo/oauth/gitlab/callback`;
  return { clientId: GITLAB_CLIENT_ID, redirectUri };
}
