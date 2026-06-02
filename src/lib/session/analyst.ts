import type { AnalystDiagnosticsPublic, AnalystVotePublic, AnalystVoteStatus } from "@/lib/repo/types";
import type { TaskStatus } from "./constants";
import { toAnalystDiagnosticsPublic, type AnalystVoteDiagnosticsRow } from "./analyst-diagnostics";
import type { SessionSupabaseClient } from "./types";

interface AnalystVoteRow extends AnalystVoteDiagnosticsRow {
  story_points: number | null;
  rationale: string | null;
}

export interface AnalystTaskState {
  analyst: AnalystVotePublic | null;
  analystPending: boolean;
  analystDiagnostics: AnalystDiagnosticsPublic | null;
}

const ANALYST_DIAGNOSTICS_SELECT =
  "story_points, rationale, status, error_code, source_files, ai_model, prompt_tokens, completion_tokens, total_tokens";

function toPublicAnalystVote(row: AnalystVoteRow): AnalystVotePublic | null {
  if (row.status !== "ready" || row.story_points === null) {
    return null;
  }

  const rationale = typeof row.rationale === "string" ? row.rationale.trim() : "";
  if (!rationale) {
    return null;
  }

  return {
    storyPoints: row.story_points,
    rationale,
    label: "Sprinter Analyst",
  };
}

function toPublicDiagnostics(row: AnalystVoteRow, taskStatus: TaskStatus): AnalystDiagnosticsPublic | null {
  if (taskStatus !== "revealed") {
    return null;
  }

  if (row.status === "pending") {
    return null;
  }

  return toAnalystDiagnosticsPublic(row);
}

export async function getAnalystStateForTask(
  supabase: SessionSupabaseClient,
  taskId: string,
  taskStatus: TaskStatus,
): Promise<AnalystTaskState> {
  if (taskStatus === "draft") {
    return { analyst: null, analystPending: false, analystDiagnostics: null };
  }

  const response = await supabase
    .from("analyst_votes")
    .select(ANALYST_DIAGNOSTICS_SELECT)
    .eq("task_id", taskId)
    .maybeSingle();

  if (response.error || !response.data) {
    return { analyst: null, analystPending: false, analystDiagnostics: null };
  }

  const row = response.data as AnalystVoteRow;
  if (row.status === "pending") {
    return { analyst: null, analystPending: true, analystDiagnostics: null };
  }

  if (taskStatus !== "revealed") {
    return { analyst: null, analystPending: false, analystDiagnostics: null };
  }

  return {
    analyst: toPublicAnalystVote(row),
    analystPending: false,
    analystDiagnostics: toPublicDiagnostics(row, taskStatus),
  };
}

export async function getAnalystVoteForTask(
  supabase: SessionSupabaseClient,
  taskId: string,
  taskStatus: TaskStatus,
): Promise<AnalystVotePublic | null> {
  const state = await getAnalystStateForTask(supabase, taskId, taskStatus);
  return state.analyst;
}

export type { AnalystVoteStatus };
