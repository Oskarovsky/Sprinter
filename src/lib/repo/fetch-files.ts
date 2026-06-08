import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedBlobContent, putCachedBlobContent } from "./blob-cache";
import { MAX_ANALYST_BYTES, MAX_FILE_CONTENT_CHARS, truncateFileContent } from "./content-limits";
import type { FacilitatorRepoConnection } from "./types";
import {
  DEFAULT_GITLAB_BASE_URL,
  fetchGitlabBlobContent,
  parseGitlabRepoUrl,
  type GitlabTokenAuth,
} from "./providers/gitlab";
import { fetchGithubBlobContent, parseGithubRepoUrl } from "./providers/github";

export { MAX_ANALYST_BYTES } from "./content-limits";

export interface FetchFileLimits {
  maxFiles?: number;
  maxBytes?: number;
}

export interface FetchFileTokenOptions {
  accessToken?: string | null;
  gitlabPat?: boolean;
}

export interface FetchFileCacheOptions {
  serviceClient: SupabaseClient;
  connectionId: string;
  blobShaByPath: Map<string, string>;
}

export async function fetchFileContents(
  connection: FacilitatorRepoConnection,
  paths: string[],
  limits: FetchFileLimits = {},
  tokenOptions: FetchFileTokenOptions = {},
  cacheOptions?: FetchFileCacheOptions,
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

    const content = await fetchSingleFile(connection, path, ref, tokenOptions, cacheOptions);
    if (content === null) {
      continue;
    }

    const truncated = truncateFileContent(content, MAX_FILE_CONTENT_CHARS);
    const byteLength = new TextEncoder().encode(truncated).byteLength;
    if (totalBytes + byteLength > maxBytes) {
      break;
    }

    totalBytes += byteLength;
    results.push({ path, content: truncated });
  }

  return results;
}

async function fetchSingleFile(
  connection: FacilitatorRepoConnection,
  path: string,
  ref: string,
  tokenOptions: FetchFileTokenOptions,
  cacheOptions?: FetchFileCacheOptions,
): Promise<string | null> {
  try {
    const accessToken = connection.access_mode === "private" ? tokenOptions.accessToken ?? undefined : undefined;

    if (connection.provider === "github") {
      const parsed = parseGithubRepoUrl(connection.repo_url);
      if (!parsed) {
        console.error(`[fetchSingleFile] Could not parse GitHub repo URL: ${connection.repo_url}`);
        return null;
      }
      return await fetchGithubBlobContent(parsed.owner, parsed.repo, path, ref, accessToken);
    }

    const baseUrl = connection.gitlab_base_url ?? DEFAULT_GITLAB_BASE_URL;
    const parsed = parseGitlabRepoUrl(connection.repo_url, baseUrl);
    if (!parsed) {
      console.error(`[fetchSingleFile] Could not parse GitLab repo URL: ${connection.repo_url}`);
      return null;
    }

    const auth: GitlabTokenAuth = tokenOptions.gitlabPat ? "pat" : "oauth";
    return await fetchGitlabBlobContent(baseUrl, parsed.projectPath, path, ref, accessToken, auth);
  } catch (error) {
    console.error(`[fetchSingleFile] Unhandled exception fetching ${path} from ${connection.repo_url}:`, error);
    return null;
  }
}
