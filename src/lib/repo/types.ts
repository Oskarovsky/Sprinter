export type RepoProvider = "github" | "gitlab";

export type RepoAccessMode = "public" | "private";

export type AnalystVoteStatus = "pending" | "ready" | "failed" | "skipped";

export interface FacilitatorRepoConnection {
  id: string;
  user_id: string;
  provider: RepoProvider;
  repo_url: string;
  repo_full_name: string;
  default_branch: string | null;
  access_mode: RepoAccessMode;
  gitlab_base_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRepoLink {
  session_id: string;
  connection_id: string;
  linked_by: string;
  linked_at: string;
}

export interface RepoTreeCacheRow {
  connection_id: string;
  tree_json: unknown;
  fetched_at: string;
}

export interface AnalystVote {
  task_id: string;
  story_points: number | null;
  rationale: string | null;
  status: AnalystVoteStatus;
  computed_at: string | null;
  error_code: string | null;
  source_files: string[];
  ai_model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnalystAiDiagnosticsPublic {
  called: boolean;
  model: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface AnalystDiagnosticsPublic {
  status: AnalystVoteStatus;
  errorCode: string | null;
  errorMessage: string | null;
  sourceFiles: string[];
  ai: AnalystAiDiagnosticsPublic;
}

export interface AnalystVotePublic {
  storyPoints: number;
  rationale: string;
  label: "Sprinter Analyst";
}
