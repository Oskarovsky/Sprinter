import type { APIRoute } from "astro";
import {
  disconnectSessionRepoLink,
  setSessionRepoLink,
  storeGitlabPatToken,
  toPublicConnection,
  upsertFacilitatorConnection,
} from "@/lib/repo/connections";
import {
  DEFAULT_GITLAB_BASE_URL,
  fetchGitlabRepoMeta,
  normalizeGitlabBaseUrl,
  parseGitlabRepoUrl,
  verifyPrivateGitlabRepoWithPat,
  verifyPublicGitlabRepo,
} from "@/lib/repo/providers/gitlab";
import { fetchGithubRepoMeta, parseGithubRepoUrl, verifyPublicGithubRepo } from "@/lib/repo/providers/github";
import { parseLinkPostFields } from "@/lib/repo/link-request";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { getDefaultSessionId } from "@/lib/session";
import { createServiceRoleClient } from "@/lib/supabase-service";

function repoLinkErrorStatus(message: string): number {
  return message.includes("facilitator") ? 403 : 500;
}

export const POST: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const sessionResult = await getDefaultSessionId(auth.supabase);
  if (sessionResult.error) {
    return jsonResponse({ error: sessionResult.error.message }, 500);
  }
  const sessionId = sessionResult.data;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const payload = body as {
    gitlabBaseUrl?: unknown;
    accessToken?: unknown;
  };

  const parsedFields = parseLinkPostFields(body);
  if ("error" in parsedFields) {
    return jsonResponse({ error: parsedFields.error }, 400);
  }

  const { provider, accessMode, repoUrl } = parsedFields;

  if (accessMode === "private" && provider === "github") {
    return jsonResponse({ error: "Use OAuth start routes for private GitHub repositories" }, 400);
  }

  if (accessMode === "private" && provider === "gitlab") {
    const accessToken = typeof payload.accessToken === "string" ? payload.accessToken.trim() : "";
    if (!accessToken) {
      return jsonResponse({ error: "accessToken is required for private GitLab repositories" }, 400);
    }

    const baseUrl = normalizeGitlabBaseUrl(typeof payload.gitlabBaseUrl === "string" ? payload.gitlabBaseUrl : null);
    if (!baseUrl) {
      return jsonResponse({ error: "Invalid GitLab base URL" }, 400);
    }

    const parsed = parseGitlabRepoUrl(repoUrl, baseUrl);
    if (!parsed) {
      return jsonResponse({ error: "Invalid GitLab repository URL" }, 400);
    }

    const reachable = await verifyPrivateGitlabRepoWithPat(baseUrl, parsed.projectPath, accessToken);
    if (!reachable.ok) {
      return jsonResponse({ error: reachable.reason }, 400);
    }

    const meta = await fetchGitlabRepoMeta(baseUrl, parsed.projectPath, accessToken, "pat");
    const gitlabBaseUrl = baseUrl === DEFAULT_GITLAB_BASE_URL ? null : baseUrl;

    const connectionResult = await upsertFacilitatorConnection(auth.supabase, {
      userId: auth.user.id,
      provider: "gitlab",
      repoUrl: parsed.repoUrl,
      repoFullName: parsed.repoFullName,
      accessMode: "private",
      gitlabBaseUrl,
      defaultBranch: meta?.defaultBranch ?? null,
    });

    if (connectionResult.error || !connectionResult.data) {
      return jsonResponse({ error: connectionResult.error?.message ?? "Could not save connection" }, 500);
    }

    const serviceClient = createServiceRoleClient();
    if (!serviceClient) {
      return jsonResponse(
        {
          error:
            "Server cannot store repository credentials — set SUPABASE_SERVICE_ROLE_KEY in .dev.vars (Supabase → Project Settings → API → service_role) and restart the dev server",
        },
        503,
      );
    }

    const tokenStore = await storeGitlabPatToken(serviceClient, connectionResult.data.id, accessToken);
    if (tokenStore.error) {
      return jsonResponse({ error: "Could not store repository credentials" }, 500);
    }

    const linkResult = await setSessionRepoLink(auth.supabase, {
      sessionId,
      connectionId: connectionResult.data.id,
      linkedBy: auth.user.id,
    });

    if (linkResult.error) {
      return jsonResponse({ error: linkResult.error.message }, repoLinkErrorStatus(linkResult.error.message));
    }

    return jsonResponse({ connection: toPublicConnection(connectionResult.data) }, 200);
  }

  let repoFullName = "";
  let normalizedRepoUrl = repoUrl;
  let gitlabBaseUrl: string | null = null;
  let defaultBranch: string | null = null;

  if (provider === "github") {
    const parsed = parseGithubRepoUrl(repoUrl);
    if (!parsed) {
      return jsonResponse({ error: "Invalid GitHub repository URL" }, 400);
    }

    const reachable = await verifyPublicGithubRepo(parsed.owner, parsed.repo);
    if (!reachable.ok) {
      return jsonResponse({ error: reachable.reason }, 400);
    }

    const meta = await fetchGithubRepoMeta(parsed.owner, parsed.repo);
    repoFullName = parsed.repoFullName;
    normalizedRepoUrl = parsed.repoUrl;
    defaultBranch = meta?.defaultBranch ?? null;
  } else {
    const baseUrl = normalizeGitlabBaseUrl(typeof payload.gitlabBaseUrl === "string" ? payload.gitlabBaseUrl : null);
    if (!baseUrl) {
      return jsonResponse({ error: "Invalid GitLab base URL" }, 400);
    }

    const parsed = parseGitlabRepoUrl(repoUrl, baseUrl);
    if (!parsed) {
      return jsonResponse({ error: "Invalid GitLab repository URL" }, 400);
    }

    const reachable = await verifyPublicGitlabRepo(baseUrl, parsed.projectPath);
    if (!reachable.ok) {
      return jsonResponse({ error: reachable.reason }, 400);
    }

    const meta = await fetchGitlabRepoMeta(baseUrl, parsed.projectPath);
    repoFullName = parsed.repoFullName;
    normalizedRepoUrl = parsed.repoUrl;
    gitlabBaseUrl = baseUrl === DEFAULT_GITLAB_BASE_URL ? null : baseUrl;
    defaultBranch = meta?.defaultBranch ?? null;
  }

  const connectionResult = await upsertFacilitatorConnection(auth.supabase, {
    userId: auth.user.id,
    provider,
    repoUrl: normalizedRepoUrl,
    repoFullName,
    accessMode: "public",
    gitlabBaseUrl,
    defaultBranch,
  });

  if (connectionResult.error || !connectionResult.data) {
    return jsonResponse({ error: connectionResult.error?.message ?? "Could not save connection" }, 500);
  }

  const linkResult = await setSessionRepoLink(auth.supabase, {
    sessionId,
    connectionId: connectionResult.data.id,
    linkedBy: auth.user.id,
  });

  if (linkResult.error) {
    return jsonResponse({ error: linkResult.error.message }, repoLinkErrorStatus(linkResult.error.message));
  }

  return jsonResponse({ connection: toPublicConnection(connectionResult.data) }, 200);
};

export const DELETE: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const sessionResult = await getDefaultSessionId(auth.supabase);
  if (sessionResult.error) {
    return jsonResponse({ error: sessionResult.error.message }, 500);
  }

  let removeFromLibrary = false;
  let connectionId: string | undefined;

  try {
    const body = (await context.request.json()) as { removeFromLibrary?: unknown; connectionId?: unknown };
    removeFromLibrary = body.removeFromLibrary === true;
    connectionId = typeof body.connectionId === "string" ? body.connectionId : undefined;
  } catch {
    /* empty body is fine */
  }

  const result = await disconnectSessionRepoLink(auth.supabase, {
    sessionId: sessionResult.data,
    linkedBy: auth.user.id,
    removeFromLibrary,
    connectionId,
  });

  if (result.error) {
    const message = result.error.message;
    const status = message.includes("facilitator") ? 403 : 500;
    return jsonResponse({ error: message }, status);
  }

  return jsonResponse({ disconnected: true }, 200);
};
