import type { APIRoute } from "astro";
import { GITHUB_CLIENT_SECRET } from "astro:env/server";
import { setSessionRepoLink, storeOAuthTokens, upsertFacilitatorConnection } from "@/lib/repo/connections";
import { getGithubOAuthConfig } from "@/lib/repo/oauth-config";
import { parseOAuthState } from "@/lib/repo/oauth-state";
import { repoErrorRedirect, repoSuccessRedirect, safeReturnPath } from "@/lib/repo/redirects";
import { exchangeGithubCode, fetchGithubRepoMeta, parseGithubRepoUrl } from "@/lib/repo/providers/github";
import { requireSessionAuth } from "@/lib/session/api-json";
import { getDefaultSessionId } from "@/lib/session";
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
  if (!state || state.provider !== "github") {
    return repoErrorRedirect("Invalid or expired OAuth state");
  }

  if (state.userId !== auth.user.id) {
    return repoErrorRedirect("OAuth session mismatch");
  }

  const oauthConfig = getGithubOAuthConfig(context.request.url);
  if (!oauthConfig || !GITHUB_CLIENT_SECRET) {
    return repoErrorRedirect("GitHub OAuth is not configured", state.returnPath);
  }

  const parsed = parseGithubRepoUrl(state.repoUrl);
  if (!parsed) {
    return repoErrorRedirect("Invalid GitHub repository URL", state.returnPath);
  }

  const tokens = await exchangeGithubCode(code, oauthConfig.clientId, GITHUB_CLIENT_SECRET, oauthConfig.redirectUri);
  if (!tokens) {
    return repoErrorRedirect("Could not exchange GitHub OAuth code", state.returnPath);
  }

  const meta = await fetchGithubRepoMeta(parsed.owner, parsed.repo, tokens.accessToken);
  if (!meta) {
    return repoErrorRedirect("Could not access linked GitHub repository", state.returnPath);
  }

  const connectionResult = await upsertFacilitatorConnection(auth.supabase, {
    userId: auth.user.id,
    provider: "github",
    repoUrl: parsed.repoUrl,
    repoFullName: parsed.repoFullName,
    accessMode: "private",
    gitlabBaseUrl: null,
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

  const sessionResult = await getDefaultSessionId(auth.supabase);
  if (sessionResult.error) {
    return repoErrorRedirect("Default planning session not configured", state.returnPath);
  }

  const linkResult = await setSessionRepoLink(auth.supabase, {
    sessionId: sessionResult.data,
    connectionId: connectionResult.data.id,
    linkedBy: auth.user.id,
  });

  if (linkResult.error) {
    return repoErrorRedirect("Could not link repository to session", state.returnPath);
  }

  return repoSuccessRedirect(safeReturnPath(state.returnPath));
};
