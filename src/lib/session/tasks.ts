import type { PostgrestError } from "@supabase/supabase-js";
import { sessionError } from "./constants";
import type { PlanningSessionRow, SessionSupabaseClient, Task } from "./types";

type SessionIdResult = { data: string; error: null } | { data: null; error: PostgrestError };

export async function getDefaultSessionId(supabase: SessionSupabaseClient): Promise<SessionIdResult> {
  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("planning_sessions")
    .select("id")
    .eq("slug", "default")
    .maybeSingle();

  if (response.error) {
    return { data: null, error: response.error };
  }

  const row = response.data as Pick<PlanningSessionRow, "id"> | null;
  if (!row) {
    return { data: null, error: sessionError("Default planning session not configured") };
  }

  return { data: row.id, error: null };
}

export async function createTask(
  supabase: SessionSupabaseClient,
  { title, description, createdBy }: { title: string; description?: string; createdBy: string },
) {
  const sessionResult = await getDefaultSessionId(supabase);
  if (sessionResult.error) {
    return { data: null, error: sessionResult.error };
  }

  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("tasks")
    .insert({
      session_id: sessionResult.data,
      title,
      description: description ?? null,
      created_by: createdBy,
      status: "draft",
    })
    .select()
    .single();

  return { data: response.data as Task | null, error: response.error };
}

export async function getTask(supabase: SessionSupabaseClient, taskId: string) {
  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  return { data: response.data as Task | null, error: response.error };
}

export async function startVoting(
  supabase: SessionSupabaseClient,
  { taskId, actorId }: { taskId: string; actorId: string },
) {
  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("tasks")
    .update({ status: "voting", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("created_by", actorId)
    .select()
    .maybeSingle();

  return { data: response.data as Task | null, error: response.error };
}

export async function revealTask(
  supabase: SessionSupabaseClient,
  { taskId, actorId }: { taskId: string; actorId: string },
) {
  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("tasks")
    .update({
      status: "revealed",
      revealed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("created_by", actorId)
    .select()
    .maybeSingle();

  return { data: response.data as Task | null, error: response.error };
}

export type { Task };
