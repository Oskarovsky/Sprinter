import type { APIRoute } from "astro";
import { createOAuthState } from "@/lib/repo/oauth-state";
import { getGithubOAuthConfig } from "@/lib/repo/oauth-config";
import { buildGithubAuthorizeUrl, parseGithubRepoUrl } from "@/lib/repo/providers/github";
import { repoErrorRedirect, safeReturnPath } from "@/lib/repo/redirects";
import { requireSessionAuth } from "@/lib/session/api-json";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const repoUrl = context.url.searchParams.get("repoUrl")?.trim() ?? "";
  const accessMode = context.url.searchParams.get("accessMode");
  const returnPath = safeReturnPath(context.url.searchParams.get("returnPath"));

  if (accessMode !== "private") {
    return repoErrorRedirect("GitHub OAuth start requires private access mode", returnPath);
  }

  const parsed = parseGithubRepoUrl(repoUrl);
  if (!parsed) {
    return repoErrorRedirect("Invalid GitHub repository URL", returnPath);
  }

  const oauthConfig = getGithubOAuthConfig(context.request.url);
  if (!oauthConfig) {
    return repoErrorRedirect("GitHub OAuth is not configured", returnPath);
  }

  const state = await createOAuthState({
    userId: auth.user.id,
    connectionId: context.url.searchParams.get("connectionId"),
    provider: "github",
    repoUrl: parsed.repoUrl,
    repoFullName: parsed.repoFullName,
    gitlabBaseUrl: null,
    returnPath,
  });

  if (!state) {
    return repoErrorRedirect("Could not start GitHub OAuth (missing server secret)", returnPath);
  }

  const authorizeUrl = buildGithubAuthorizeUrl(oauthConfig.clientId, oauthConfig.redirectUri, state);
  return context.redirect(authorizeUrl);
};
