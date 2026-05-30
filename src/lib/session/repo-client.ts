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
}

async function readRepoError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${response.status})`;
}

export async function fetchRepoConnections(): Promise<RepoConnectionsResponse> {
  const response = await fetch("/api/repo/connections", { credentials: "include" });
  if (!response.ok) {
    throw new Error(await readRepoError(response));
  }
  return (await response.json()) as RepoConnectionsResponse;
}

export async function fetchSessionRepoStatus(): Promise<SessionRepoStatus> {
  const response = await fetch("/api/repo/session", { credentials: "include" });
  if (!response.ok) {
    throw new Error(await readRepoError(response));
  }
  return (await response.json()) as SessionRepoStatus;
}

export async function linkRepo(body: LinkRepoRequest): Promise<{ connection: PublicRepoConnection }> {
  const response = await fetch("/api/repo/link", {
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

export async function disconnectRepo(options: { removeFromLibrary?: boolean; connectionId?: string } = {}) {
  const response = await fetch("/api/repo/link", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
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
