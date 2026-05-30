import type { OAuthTokenResponse, ParsedGithubRepo, RepoTreeEntry } from "../tree-types";

const GITHUB_API = "https://api.github.com";
const GITHUB_USER_AGENT = "10xSprinter";

export function parseGithubRepoUrl(rawUrl: string): ParsedGithubRepo | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (url.hostname !== "github.com") {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const [owner, repoWithSuffix] = segments;
  const repo = repoWithSuffix.replace(/\.git$/u, "");
  if (!owner || !repo) {
    return null;
  }

  const repoFullName = `${owner}/${repo}`;
  return {
    owner,
    repo,
    repoFullName,
    repoUrl: `https://github.com/${repoFullName}`,
  };
}

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": GITHUB_USER_AGENT,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function verifyPublicGithubRepo(
  owner: string,
  repo: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: authHeaders(),
  });

  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 404) {
    return { ok: false, reason: "Repository not found or not public" };
  }

  if (response.status === 403) {
    return { ok: false, reason: "GitHub API rate limit or access denied — retry shortly or use private OAuth" };
  }

  return { ok: false, reason: "Repository is not publicly accessible" };
}

export async function fetchGithubRepoMeta(
  owner: string,
  repo: string,
  token?: string,
): Promise<{ defaultBranch: string | null } | null> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { default_branch?: string };
  return { defaultBranch: payload.default_branch ?? null };
}

export async function exchangeGithubCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<OAuthTokenResponse | null> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!payload.access_token || payload.error) {
    return null;
  }

  const expiresAt =
    typeof payload.expires_in === "number" ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null;

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt,
  };
}

export async function listGithubTree(
  owner: string,
  repo: string,
  ref: string,
  token?: string,
): Promise<RepoTreeEntry[]> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    {
      headers: authHeaders(token),
    },
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    tree?: { path?: string; sha?: string; size?: number; type?: string }[];
  };

  if (!Array.isArray(payload.tree)) {
    return [];
  }

  return payload.tree
    .filter((entry) => entry.type === "blob" || entry.type === "tree")
    .map((entry) => ({
      path: entry.path ?? "",
      sha: entry.sha ?? "",
      size: typeof entry.size === "number" ? entry.size : null,
      type: entry.type === "tree" ? "tree" : "blob",
    }))
    .filter((entry) => entry.path.length > 0);
}

export async function fetchGithubBlobContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token?: string,
): Promise<string | null> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`,
    { headers: authHeaders(token) },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { content?: string; encoding?: string };
  if (payload.encoding !== "base64" || typeof payload.content !== "string") {
    return null;
  }

  return atob(payload.content.replace(/\n/gu, ""));
}

export function buildGithubAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo",
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}
