export interface RepoTreeEntry {
  path: string;
  sha: string;
  size: number | null;
  type: "blob" | "tree";
}

export interface ParsedGithubRepo {
  owner: string;
  repo: string;
  repoFullName: string;
  repoUrl: string;
}

export interface ParsedGitlabRepo {
  projectPath: string;
  repoFullName: string;
  repoUrl: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}
