import type { APIRoute } from "astro";
import { createOAuthState } from "@/lib/repo/oauth-state";
import { getGitlabOAuthConfig } from "@/lib/repo/oauth-config";
import {
  buildGitlabAuthorizeUrl,
  DEFAULT_GITLAB_BASE_URL,
  normalizeGitlabBaseUrl,
  parseGitlabRepoUrl,
} from "@/lib/repo/providers/gitlab";
import { repoErrorRedirect, safeReturnPath } from "@/lib/repo/redirects";
import { requireSessionAuth } from "@/lib/session/api-json";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const repoUrl = context.url.searchParams.get("repoUrl")?.trim() ?? "";
  const accessMode = context.url.searchParams.get("accessMode");
  const gitlabBaseUrlRaw = context.url.searchParams.get("gitlabBaseUrl");
  const returnPath = safeReturnPath(context.url.searchParams.get("returnPath"));

  if (accessMode !== "private") {
    return repoErrorRedirect("GitLab OAuth start requires private access mode", returnPath);
  }

  const gitlabBaseUrl = normalizeGitlabBaseUrl(gitlabBaseUrlRaw) ?? DEFAULT_GITLAB_BASE_URL;
  const parsed = parseGitlabRepoUrl(repoUrl, gitlabBaseUrl);
  if (!parsed) {
    return repoErrorRedirect("Invalid GitLab repository URL", returnPath);
  }

  const oauthConfig = getGitlabOAuthConfig(context.request.url);
  if (!oauthConfig) {
    return repoErrorRedirect("GitLab OAuth is not configured", returnPath);
  }

  const state = await createOAuthState({
    userId: auth.user.id,
    connectionId: context.url.searchParams.get("connectionId"),
    provider: "gitlab",
    repoUrl: parsed.repoUrl,
    repoFullName: parsed.repoFullName,
    gitlabBaseUrl: gitlabBaseUrl === DEFAULT_GITLAB_BASE_URL ? null : gitlabBaseUrl,
    returnPath,
  });

  if (!state) {
    return repoErrorRedirect("Could not start GitLab OAuth (missing server secret)", returnPath);
  }

  const authorizeUrl = buildGitlabAuthorizeUrl(gitlabBaseUrl, oauthConfig.clientId, oauthConfig.redirectUri, state);
  return context.redirect(authorizeUrl);
};
