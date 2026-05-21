import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export const GET: APIRoute = async (context) => {
  const code = context.url.searchParams.get("code");
  const next = safeNextPath(context.url.searchParams.get("next"));

  if (!code) {
    const message =
      context.url.searchParams.get("error_description") ??
      context.url.searchParams.get("error") ??
      "Missing authorization code";
    return context.redirect(`/auth/signin?error=${encodeURIComponent(message)}`);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent(error.message)}`);
  }

  return context.redirect(next);
};
