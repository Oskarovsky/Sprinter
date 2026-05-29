import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureRealtimeAuth(supabase: SupabaseClient, accessToken?: string | null): Promise<boolean> {
  const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) {
    return false;
  }

  try {
    await supabase.realtime.setAuth(token);
    return true;
  } catch {
    return false;
  }
}

export function watchRealtimeAuth(supabase: SupabaseClient, onMissingSession?: () => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    const token = session?.access_token;
    if (!token) {
      onMissingSession?.();
      return;
    }

    void supabase.realtime.setAuth(token);
  });

  return () => {
    subscription.unsubscribe();
  };
}
