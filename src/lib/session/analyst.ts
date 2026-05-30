import type { AnalystVotePublic, AnalystVoteStatus } from "@/lib/repo/types";
import type { TaskStatus } from "./constants";
import type { SessionSupabaseClient } from "./types";

interface AnalystVoteRow {
  story_points: number | null;
  rationale: string | null;
  status: AnalystVoteStatus;
}

export interface AnalystTaskState {
  analyst: AnalystVotePublic | null;
  analystPending: boolean;
}

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

export async function getAnalystStateForTask(
  supabase: SessionSupabaseClient,
  taskId: string,
  taskStatus: TaskStatus,
): Promise<AnalystTaskState> {
  if (taskStatus === "draft") {
    return { analyst: null, analystPending: false };
  }

  const response = await supabase
    .from("analyst_votes")
    .select("story_points, rationale, status")
    .eq("task_id", taskId)
    .maybeSingle();

  if (response.error || !response.data) {
    return { analyst: null, analystPending: false };
  }

  const row = response.data as AnalystVoteRow;
  if (row.status === "pending") {
    return { analyst: null, analystPending: true };
  }

  if (taskStatus !== "revealed") {
    return { analyst: null, analystPending: false };
  }

  return {
    analyst: toPublicAnalystVote(row),
    analystPending: false,
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
