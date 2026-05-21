import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const origin = new URL(context.request.url).origin;
  const next = context.url.searchParams.get("next") ?? "/";
  const redirectTo = `${origin}/api/auth/callback?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });

  if (error || !data.url) {
    return context.redirect(
      `/auth/signin?error=${encodeURIComponent(error?.message ?? "Could not start Google sign-in")}`,
    );
  }

  return context.redirect(data.url);
};
