import type { FacilitatorRepoConnection } from "./types";
import {
  DEFAULT_GITLAB_BASE_URL,
  fetchGitlabBlobContent,
  parseGitlabRepoUrl,
  type GitlabTokenAuth,
} from "./providers/gitlab";
import { fetchGithubBlobContent, parseGithubRepoUrl } from "./providers/github";

export const MAX_ANALYST_BYTES = 1024 * 1024;

export interface FetchFileLimits {
  maxFiles?: number;
  maxBytes?: number;
}

export interface FetchFileTokenOptions {
  accessToken?: string | null;
  gitlabPat?: boolean;
}

export async function fetchFileContents(
  connection: FacilitatorRepoConnection,
  paths: string[],
  limits: FetchFileLimits = {},
  tokenOptions: FetchFileTokenOptions = {},
): Promise<{ path: string; content: string }[]> {
  const maxFiles = limits.maxFiles ?? paths.length;
  const maxBytes = limits.maxBytes ?? MAX_ANALYST_BYTES;
  const ref = connection.default_branch ?? "main";
  const results: { path: string; content: string }[] = [];
  let totalBytes = 0;

  for (const path of paths.slice(0, maxFiles)) {
    if (totalBytes >= maxBytes) {
      break;
    }

    const content = await fetchSingleFile(connection, path, ref, tokenOptions);
    if (content === null) {
      continue;
    }

    const byteLength = new TextEncoder().encode(content).byteLength;
    if (totalBytes + byteLength > maxBytes) {
      break;
    }

    totalBytes += byteLength;
    results.push({ path, content });
  }

  return results;
}

async function fetchSingleFile(
  connection: FacilitatorRepoConnection,
  path: string,
  ref: string,
  tokenOptions: FetchFileTokenOptions,
): Promise<string | null> {
  const accessToken = connection.access_mode === "private" ? (tokenOptions.accessToken ?? undefined) : undefined;

  if (connection.provider === "github") {
    const parsed = parseGithubRepoUrl(connection.repo_url);
    if (!parsed) {
      return null;
    }
    return fetchGithubBlobContent(parsed.owner, parsed.repo, path, ref, accessToken);
  }

  const baseUrl = connection.gitlab_base_url ?? DEFAULT_GITLAB_BASE_URL;
  const parsed = parseGitlabRepoUrl(connection.repo_url, baseUrl);
  if (!parsed) {
    return null;
  }

  const auth: GitlabTokenAuth = tokenOptions.gitlabPat ? "pat" : "oauth";
  return fetchGitlabBlobContent(baseUrl, parsed.projectPath, path, ref, accessToken, auth);
}
