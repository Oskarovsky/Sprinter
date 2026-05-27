import type { PostgrestError } from "@supabase/supabase-js";
import type { Profile, SessionSupabaseClient } from "./types";

function defaultDisplayName(userId: string): string {
  return `User ${userId.slice(0, 8)}`;
}

export async function ensureProfile(
  supabase: SessionSupabaseClient,
  { userId, displayName }: { userId: string; displayName?: string },
) {
  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        display_name: displayName ?? defaultDisplayName(userId),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  return { data: response.data as Profile | null, error: response.error };
}

export async function getDisplayName(
  supabase: SessionSupabaseClient,
  userId: string,
): Promise<{ data: string | null; error: null } | { data: null; error: PostgrestError }> {
  const response: { data: unknown; error: PostgrestError | null } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (response.error) {
    return { data: null, error: response.error };
  }

  const row = response.data as { display_name: string } | null;
  return { data: row?.display_name ?? null, error: null };
}

export type { Profile };
