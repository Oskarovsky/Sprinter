import type { PostgrestError } from "@supabase/supabase-js";
import { isValidStoryPoint, sessionError } from "./constants";
import { getTask } from "./tasks";
import type { SessionSupabaseClient, Vote, VoteParticipation } from "./types";

export async function castVote(
  supabase: SessionSupabaseClient,
  { taskId, userId, storyPoints }: { taskId: string; userId: string; storyPoints: number },
) {
  if (!isValidStoryPoint(storyPoints)) {
    return { data: null, error: sessionError("Invalid story point value", "VALIDATION") };
  }

  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("votes")
    .upsert(
      {
        task_id: taskId,
        user_id: userId,
        story_points: storyPoints,
        voted_at: new Date().toISOString(),
      },
      { onConflict: "task_id,user_id" },
    )
    .select()
    .single();

  return { data: response.data as Vote | null, error: response.error };
}

export async function listParticipation(supabase: SessionSupabaseClient, taskId: string) {
  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("vote_participation")
    .select("*")
    .eq("task_id", taskId);

  return { data: response.data as VoteParticipation[] | null, error: response.error };
}

export async function listRevealedVotes(supabase: SessionSupabaseClient, taskId: string) {
  const taskResult = await getTask(supabase, taskId);
  if (taskResult.error) {
    return { data: null, error: taskResult.error };
  }

  if (!taskResult.data) {
    return { data: null, error: sessionError("Task not found") };
  }

  if (taskResult.data.status !== "revealed") {
    return { data: null, error: sessionError("Task is not revealed") };
  }

  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("vote_participation")
    .select("*")
    .eq("task_id", taskId)
    .not("story_points", "is", null);

  return { data: response.data as VoteParticipation[] | null, error: response.error };
}

export type { Vote, VoteParticipation };
