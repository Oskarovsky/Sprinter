import type { OAuthTokenResponse, ParsedGitlabRepo, RepoTreeEntry } from "../tree-types";

export const DEFAULT_GITLAB_BASE_URL = "https://gitlab.com";

export function normalizeGitlabBaseUrl(raw: string | null | undefined): string | null {
  if (raw == null || raw.trim().length === 0) {
    return DEFAULT_GITLAB_BASE_URL;
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    return null;
  }

  return url.origin.replace(/\/$/u, "");
}

export function parseGitlabRepoUrl(rawUrl: string, gitlabBaseUrl: string): ParsedGitlabRepo | null {
  const base = normalizeGitlabBaseUrl(gitlabBaseUrl);
  if (!base) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const baseHost = new URL(base).host;
  if (url.host !== baseHost) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const projectPath = segments.join("/").replace(/\.git$/u, "");
  return {
    projectPath,
    repoFullName: projectPath,
    repoUrl: `${base}/${projectPath}`,
  };
}

function encodeProjectPath(projectPath: string): string {
  return encodeURIComponent(projectPath);
}

async function readGitlabErrorMessage(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as { message?: unknown; error?: unknown; error_description?: unknown };
    const parts = [payload.message, payload.error, payload.error_description]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());
    return parts.length > 0 ? parts.join(" — ") : null;
  } catch {
    return null;
  }
}

export type GitlabTokenAuth = "oauth" | "pat" | "bearer";

function gitlabHeaders(token?: string, auth: GitlabTokenAuth = "oauth"): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    if (auth === "pat") {
      headers["PRIVATE-TOKEN"] = token;
    } else {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return headers;
}

function isObviousTokenPlaceholder(token: string): boolean {
  return token === "glpat-..." || token.endsWith("...") || token.includes("<") || token.includes("TWÓJ");
}

async function fetchGitlabWithAccessToken(
  baseUrl: string,
  apiPath: string,
  token: string,
  auth: GitlabTokenAuth = "oauth",
): Promise<Response> {
  const url = `${baseUrl}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
  if (auth !== "pat") {
    return fetch(url, { headers: gitlabHeaders(token, auth) });
  }

  const privateTokenResponse = await fetch(url, { headers: gitlabHeaders(token, "pat") });
  if (privateTokenResponse.ok || privateTokenResponse.status !== 401) {
    return privateTokenResponse;
  }

  return fetch(url, { headers: gitlabHeaders(token, "bearer") });
}

async function fetchGitlabProject(baseUrl: string, projectPath: string, token: string): Promise<Response> {
  return fetchGitlabWithAccessToken(baseUrl, `/api/v4/projects/${encodeProjectPath(projectPath)}`, token, "pat");
}

export async function verifyPublicGitlabRepo(
  baseUrl: string,
  projectPath: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const response = await fetch(`${baseUrl}/api/v4/projects/${encodeProjectPath(projectPath)}`, {
    headers: gitlabHeaders(),
  });

  if (response.ok) {
    return { ok: true };
  }

  if (response.status === 404) {
    return { ok: false, reason: "Repository not found or not public" };
  }

  if (response.status === 403) {
    return { ok: false, reason: "GitLab API access denied — check instance URL or retry later" };
  }

  return { ok: false, reason: "Repository is not publicly accessible" };
}

export async function verifyPrivateGitlabRepoWithPat(
  baseUrl: string,
  projectPath: string,
  personalAccessToken: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const trimmedToken = personalAccessToken.trim();
  if (trimmedToken.length === 0) {
    return { ok: false, reason: "accessToken is required for private GitLab repositories" };
  }
  if (isObviousTokenPlaceholder(trimmedToken)) {
    return { ok: false, reason: "Replace the placeholder with your full GitLab access token" };
  }

  const response = await fetchGitlabProject(baseUrl, projectPath, trimmedToken);

  if (response.ok) {
    return { ok: true };
  }

  const gitlabMessage = await readGitlabErrorMessage(response);

  if (response.status === 401) {
    return {
      ok: false,
      reason: gitlabMessage
        ? `GitLab rejected the token (401): ${gitlabMessage}`
        : "GitLab rejected the token (401) — check that the token is complete, not expired, and copied without extra spaces",
    };
  }

  if (response.status === 403) {
    return {
      ok: false,
      reason: gitlabMessage
        ? `GitLab denied access (403): ${gitlabMessage}. Ensure the token has read_api or read_repository and your account can access this project`
        : "GitLab denied access (403) — token may be valid but lacks project access or required scopes (read_api / read_repository)",
    };
  }

  if (response.status === 404) {
    return { ok: false, reason: "Repository not found or token cannot access this project" };
  }

  return {
    ok: false,
    reason: gitlabMessage
      ? `Could not verify GitLab repository (${response.status}): ${gitlabMessage}`
      : "Could not verify GitLab repository with the supplied token",
  };
}

export async function fetchGitlabRepoMeta(
  baseUrl: string,
  projectPath: string,
  token?: string,
  auth: GitlabTokenAuth = "oauth",
): Promise<{ defaultBranch: string | null } | null> {
  const response =
    token && auth === "pat"
      ? await fetchGitlabWithAccessToken(baseUrl, `/api/v4/projects/${encodeProjectPath(projectPath)}`, token, "pat")
      : await fetch(`${baseUrl}/api/v4/projects/${encodeProjectPath(projectPath)}`, {
          headers: gitlabHeaders(token, auth),
        });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { default_branch?: string };
  return { defaultBranch: payload.default_branch ?? null };
}

export async function exchangeGitlabCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  baseUrl: string,
): Promise<OAuthTokenResponse | null> {
  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
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

export async function listGitlabTree(
  baseUrl: string,
  projectPath: string,
  ref: string,
  token?: string,
  auth: GitlabTokenAuth = "oauth",
): Promise<RepoTreeEntry[]> {
  const projectId = encodeProjectPath(projectPath);
  const perPage = 100;
  const maxPages = 50;
  const entries: RepoTreeEntry[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const apiPath = `/api/v4/projects/${projectId}/repository/tree?recursive=true&ref=${encodeURIComponent(ref)}&per_page=${perPage}&page=${page}`;
    const response =
      token && auth === "pat"
        ? await fetchGitlabWithAccessToken(baseUrl, apiPath, token, "pat")
        : await fetch(`${baseUrl}${apiPath}`, { headers: gitlabHeaders(token, auth) });

    if (!response.ok) {
      break;
    }

    const payload = (await response.json()) as { path?: string; id?: string; type?: string }[];
    if (!Array.isArray(payload) || payload.length === 0) {
      break;
    }

    entries.push(
      ...payload
        .map((entry) => ({
          path: entry.path ?? "",
          sha: entry.id ?? "",
          size: null,
          type: entry.type === "tree" ? ("tree" as const) : ("blob" as const),
        }))
        .filter((entry) => entry.path.length > 0),
    );

    if (payload.length < perPage) {
      break;
    }
  }

  return entries;
}

export async function fetchGitlabBlobContent(
  baseUrl: string,
  projectPath: string,
  filePath: string,
  ref: string,
  token?: string,
  auth: GitlabTokenAuth = "oauth",
): Promise<string | null> {
  const encodedFilePath = filePath.split("/").map(encodeURIComponent).join("/");
  const apiPath = `/api/v4/projects/${encodeProjectPath(
    projectPath,
  )}/repository/files/${encodedFilePath}/raw?ref=${encodeURIComponent(ref)}`;
  const response =
    token && auth === "pat"
      ? await fetchGitlabWithAccessToken(baseUrl, apiPath, token, "pat")
      : await fetch(`${baseUrl}${apiPath}`, { headers: gitlabHeaders(token, auth) });

  if (!response.ok) {
    const message = await readGitlabErrorMessage(response);
    console.error(
      `[gitlab] Failed to fetch blob ${filePath} from ${projectPath}: ${response.status} ${response.statusText}`,
      message,
    );
    return null;
  }

  return response.text();
}

export function buildGitlabAuthorizeUrl(baseUrl: string, clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "read_api read_repository",
    state,
  });
  return `${baseUrl}/oauth/authorize?${params.toString()}`;
}
