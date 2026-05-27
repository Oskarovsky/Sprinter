import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "astro:env/client";

export function createBrowserClient() {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  return createSupabaseBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}
