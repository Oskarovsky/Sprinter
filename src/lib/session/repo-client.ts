import type { AnalystVotePublic } from "@/lib/repo/types";

export interface PublicRepoConnection {
  id: string;
  provider: "github" | "gitlab";
  repoUrl: string;
  repoFullName: string;
  accessMode: "public" | "private";
  gitlabBaseUrl: string | null;
  defaultBranch: string | null;
}

export interface RepoConnectionsResponse {
  connections: PublicRepoConnection[];
  activeConnectionId: string | null;
}

export interface SessionRepoStatus {
  linked: boolean;
  connection?: {
    provider: "github" | "gitlab";
    repoFullName: string;
    accessMode: "public" | "private";
    linkedByDisplayName: string;
  };
}

export interface LinkRepoRequest {
  provider: "github" | "gitlab";
  repoUrl: string;
  accessMode: "public" | "private";
  gitlabBaseUrl?: string;
  accessToken?: string;
  sessionSlug?: string;
}

function withSessionSlug(path: string, sessionSlug: string): string {
  const params = new URLSearchParams({ sessionSlug });
  return `${path}?${params.toString()}`;
}

async function readRepoError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${response.status})`;
}

export async function fetchRepoConnections(sessionSlug: string): Promise<RepoConnectionsResponse> {
  const response = await fetch(withSessionSlug("/api/repo/connections", sessionSlug), { credentials: "include" });
  if (!response.ok) {
    throw new Error(await readRepoError(response));
  }
  return (await response.json()) as RepoConnectionsResponse;
}

export async function fetchSessionRepoStatus(sessionSlug: string): Promise<SessionRepoStatus> {
  const response = await fetch(withSessionSlug("/api/repo/session", sessionSlug), { credentials: "include" });
  if (!response.ok) {
    throw new Error(await readRepoError(response));
  }
  return (await response.json()) as SessionRepoStatus;
}

export async function linkRepo(
  sessionSlug: string,
  body: LinkRepoRequest,
): Promise<{ connection: PublicRepoConnection }> {
  const response = await fetch(withSessionSlug("/api/repo/link", sessionSlug), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(await readRepoError(response));
  }
  return (await response.json()) as { connection: PublicRepoConnection };
}

export async function disconnectRepo(
  sessionSlug: string,
  options: { removeFromLibrary?: boolean; connectionId?: string } = {},
) {
  const response = await fetch(withSessionSlug("/api/repo/link", sessionSlug), {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...options, sessionSlug }),
  });
  if (!response.ok) {
    throw new Error(await readRepoError(response));
  }
}

export function buildGithubOAuthStartUrl(repoUrl: string, returnPath = "/session"): string {
  const params = new URLSearchParams({
    repoUrl,
    accessMode: "private",
    returnPath,
  });
  return `/api/repo/oauth/github/start?${params.toString()}`;
}

export function buildGitlabOAuthStartUrl(repoUrl: string, gitlabBaseUrl: string, returnPath = "/session"): string {
  const params = new URLSearchParams({
    repoUrl,
    accessMode: "private",
    gitlabBaseUrl,
    returnPath,
  });
  return `/api/repo/oauth/gitlab/start?${params.toString()}`;
}

export type { AnalystVotePublic };
