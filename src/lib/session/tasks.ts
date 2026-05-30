import type { PostgrestError } from "@supabase/supabase-js";
import { sessionError } from "./constants";
import { normalizePlanningSessionSlug } from "./slug";
import type { PlanningSessionRow, SessionSupabaseClient, Task } from "./types";

type SessionIdResult = { data: string; error: null } | { data: null; error: PostgrestError };

export async function getSessionIdBySlug(supabase: SessionSupabaseClient, slug: string): Promise<SessionIdResult> {
  const normalizedSlug = normalizePlanningSessionSlug(slug);
  if (!normalizedSlug) {
    return { data: null, error: sessionError("Invalid room slug", "VALIDATION") };
  }

  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("planning_sessions")
    .select("id")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (response.error) {
    return { data: null, error: response.error };
  }

  const row = response.data as Pick<PlanningSessionRow, "id"> | null;
  if (!row) {
    return { data: null, error: sessionError("Planning session not found", "NOT_FOUND") };
  }

  return { data: row.id, error: null };
}

export async function getDefaultSessionId(supabase: SessionSupabaseClient): Promise<SessionIdResult> {
  return getSessionIdBySlug(supabase, "default");
}

export async function listPlanningSessions(supabase: SessionSupabaseClient): Promise<{
  data: PlanningSessionRow[] | null;
  error: PostgrestError | null;
}> {
  const response = await supabase
    .from("planning_sessions")
    .select("id, slug, created_at")
    .order("created_at", { ascending: false });

  return {
    data: (response.data ?? null) as PlanningSessionRow[] | null,
    error: response.error,
  };
}

export async function createPlanningSession(
  supabase: SessionSupabaseClient,
  rawSlug: string,
): Promise<{ data: PlanningSessionRow | null; error: PostgrestError | null }> {
  const slug = normalizePlanningSessionSlug(rawSlug);
  if (!slug) {
    return { data: null, error: sessionError("Invalid room slug", "VALIDATION") };
  }

  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("planning_sessions")
    .insert({ slug })
    .select("id, slug, created_at")
    .single();

  if (response.error) {
    if (response.error.code === "23505") {
      return { data: null, error: sessionError("Room slug already exists", "DUPLICATE") };
    }
    return { data: null, error: response.error };
  }

  return { data: response.data as PlanningSessionRow, error: null };
}

export async function createTask(
  supabase: SessionSupabaseClient,
  {
    sessionId,
    title,
    description,
    affectedPaths,
    createdBy,
  }: {
    sessionId: string;
    title: string;
    description?: string;
    affectedPaths?: string;
    createdBy: string;
  },
) {
  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("tasks")
    .insert({
      session_id: sessionId,
      title,
      description: description ?? null,
      affected_paths: affectedPaths ?? null,
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

export async function getLatestActiveTask(supabase: SessionSupabaseClient, sessionId: string) {
  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("tasks")
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["voting", "revealed"])
    .order("updated_at", { ascending: false })
    .limit(1)
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
