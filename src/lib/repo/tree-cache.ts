import type { SupabaseClient } from "@supabase/supabase-js";
import { listGithubTree, parseGithubRepoUrl } from "./providers/github";
import { DEFAULT_GITLAB_BASE_URL, listGitlabTree, parseGitlabRepoUrl, type GitlabTokenAuth } from "./providers/gitlab";
import type { FacilitatorRepoConnection } from "./types";
import type { RepoTreeEntry } from "./tree-types";

const TREE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface RepoOAuthTokenRow {
  access_token: string;
  gitlab_pat: boolean;
}

async function loadConnection(serviceClient: SupabaseClient, connectionId: string) {
  const response = await serviceClient
    .from("facilitator_repo_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();

  return response.data as FacilitatorRepoConnection | null;
}

async function loadToken(serviceClient: SupabaseClient, connectionId: string) {
  const response = await serviceClient
    .from("repo_oauth_tokens")
    .select("access_token, gitlab_pat")
    .eq("connection_id", connectionId)
    .maybeSingle();

  return response.data as RepoOAuthTokenRow | null;
}

function parseCachedTree(value: unknown): RepoTreeEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const row = entry as { path?: unknown; sha?: unknown; size?: unknown; type?: unknown };
      if (typeof row.path !== "string" || row.path.length === 0) {
        return null;
      }
      return {
        path: row.path,
        sha: typeof row.sha === "string" ? row.sha : "",
        size: typeof row.size === "number" ? row.size : null,
        type: row.type === "tree" ? ("tree" as const) : ("blob" as const),
      };
    })
    .filter((entry): entry is RepoTreeEntry => entry !== null);
}

async function fetchProviderTree(
  connection: FacilitatorRepoConnection,
  token: RepoOAuthTokenRow | null,
): Promise<RepoTreeEntry[]> {
  const ref = connection.default_branch ?? "main";

  if (connection.provider === "github") {
    const parsed = parseGithubRepoUrl(connection.repo_url);
    if (!parsed) {
      return [];
    }
    const accessToken = connection.access_mode === "private" ? token?.access_token : undefined;
    return listGithubTree(parsed.owner, parsed.repo, ref, accessToken);
  }

  const baseUrl = connection.gitlab_base_url ?? DEFAULT_GITLAB_BASE_URL;
  const parsed = parseGitlabRepoUrl(connection.repo_url, baseUrl);
  if (!parsed) {
    return [];
  }

  const accessToken = connection.access_mode === "private" ? token?.access_token : undefined;
  const auth: GitlabTokenAuth = token?.gitlab_pat ? "pat" : "oauth";
  return listGitlabTree(baseUrl, parsed.projectPath, ref, accessToken, auth);
}

export async function getOrRefreshTreeCache(
  serviceClient: SupabaseClient,
  connectionId: string,
): Promise<RepoTreeEntry[]> {
  const cached = await serviceClient
    .from("repo_tree_cache")
    .select("tree_json, fetched_at")
    .eq("connection_id", connectionId)
    .maybeSingle();

  if (!cached.error && cached.data?.fetched_at) {
    const ageMs = Date.now() - new Date(cached.data.fetched_at as string).getTime();
    if (ageMs < TREE_CACHE_TTL_MS) {
      const cachedTree = parseCachedTree(cached.data.tree_json);
      if (cachedTree.length > 0) {
        return cachedTree;
      }
    }
  }

  const connection = await loadConnection(serviceClient, connectionId);
  if (!connection) {
    return [];
  }

  const token = connection.access_mode === "private" ? await loadToken(serviceClient, connectionId) : null;
  if (connection.access_mode === "private" && !token?.access_token) {
    return [];
  }

  const tree = await fetchProviderTree(connection, token);
  if (tree.length > 0) {
    await serviceClient.from("repo_tree_cache").upsert(
      {
        connection_id: connectionId,
        tree_json: tree,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "connection_id" },
    );
  }

  return tree;
}
