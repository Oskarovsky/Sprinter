import type { APIContext } from "astro";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type SessionAuthResult =
  | { supabase: NonNullable<ReturnType<typeof createClient>>; user: User }
  | { response: Response };

export async function requireSessionAuth(context: APIContext): Promise<SessionAuthResult> {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return { response: jsonResponse({ error: "Supabase is not configured" }, 503) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  return { supabase, user };
}
