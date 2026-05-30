import type { APIRoute } from "astro";
import { GITLAB_CLIENT_SECRET } from "astro:env/server";
import { setSessionRepoLink, storeOAuthTokens, upsertFacilitatorConnection } from "@/lib/repo/connections";
import { getGitlabOAuthConfig } from "@/lib/repo/oauth-config";
import { parseOAuthState } from "@/lib/repo/oauth-state";
import { repoErrorRedirect, repoSuccessRedirect, safeReturnPath } from "@/lib/repo/redirects";
import {
  DEFAULT_GITLAB_BASE_URL,
  exchangeGitlabCode,
  fetchGitlabRepoMeta,
  normalizeGitlabBaseUrl,
  parseGitlabRepoUrl,
} from "@/lib/repo/providers/gitlab";
import { requireSessionAuth } from "@/lib/session/api-json";
import { createServiceRoleClient } from "@/lib/supabase-service";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const code = context.url.searchParams.get("code");
  const stateParam = context.url.searchParams.get("state");
  const oauthError = context.url.searchParams.get("error_description") ?? context.url.searchParams.get("error");

  if (oauthError) {
    return repoErrorRedirect(oauthError);
  }

  if (!code || !stateParam) {
    return repoErrorRedirect("Missing OAuth code or state");
  }

  const state = await parseOAuthState(stateParam);
  if (!state || state.provider !== "gitlab") {
    return repoErrorRedirect("Invalid or expired OAuth state");
  }

  if (state.userId !== auth.user.id) {
    return repoErrorRedirect("OAuth session mismatch");
  }

  const gitlabBaseUrl = normalizeGitlabBaseUrl(state.gitlabBaseUrl) ?? DEFAULT_GITLAB_BASE_URL;
  const oauthConfig = getGitlabOAuthConfig(context.request.url);
  if (!oauthConfig || !GITLAB_CLIENT_SECRET) {
    return repoErrorRedirect("GitLab OAuth is not configured", state.returnPath);
  }

  const parsed = parseGitlabRepoUrl(state.repoUrl, gitlabBaseUrl);
  if (!parsed) {
    return repoErrorRedirect("Invalid GitLab repository URL", state.returnPath);
  }

  const tokens = await exchangeGitlabCode(
    code,
    oauthConfig.clientId,
    GITLAB_CLIENT_SECRET,
    oauthConfig.redirectUri,
    gitlabBaseUrl,
  );
  if (!tokens) {
    return repoErrorRedirect("Could not exchange GitLab OAuth code", state.returnPath);
  }

  const meta = await fetchGitlabRepoMeta(gitlabBaseUrl, parsed.projectPath, tokens.accessToken);
  if (!meta) {
    return repoErrorRedirect("Could not access linked GitLab repository", state.returnPath);
  }

  const connectionResult = await upsertFacilitatorConnection(auth.supabase, {
    userId: auth.user.id,
    provider: "gitlab",
    repoUrl: parsed.repoUrl,
    repoFullName: parsed.repoFullName,
    accessMode: "private",
    gitlabBaseUrl: gitlabBaseUrl === DEFAULT_GITLAB_BASE_URL ? null : gitlabBaseUrl,
    defaultBranch: meta.defaultBranch,
  });

  if (connectionResult.error || !connectionResult.data) {
    return repoErrorRedirect("Could not save repository connection", state.returnPath);
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return repoErrorRedirect("Server cannot store repository credentials", state.returnPath);
  }

  const tokenStore = await storeOAuthTokens(serviceClient, connectionResult.data.id, tokens);
  if (tokenStore.error) {
    return repoErrorRedirect("Could not store repository credentials", state.returnPath);
  }

  const linkResult = await setSessionRepoLink(auth.supabase, {
    connectionId: connectionResult.data.id,
    linkedBy: auth.user.id,
  });

  if (linkResult.error) {
    return repoErrorRedirect("Could not link repository to session", state.returnPath);
  }

  return repoSuccessRedirect(safeReturnPath(state.returnPath));
};
