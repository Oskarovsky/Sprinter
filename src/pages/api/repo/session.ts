import type { APIRoute } from "astro";
import { getSessionRepoSummary } from "@/lib/repo/connections";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { requireSessionSlugFromRequest } from "@/lib/session/resolve-session-slug";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const sessionResolved = await requireSessionSlugFromRequest(context, auth.supabase);
  if ("response" in sessionResolved) {
    return sessionResolved.response;
  }

  const summaryResult = await getSessionRepoSummary(auth.supabase, sessionResolved.sessionId);
  if (summaryResult.error || !summaryResult.data) {
    return jsonResponse({ error: summaryResult.error?.message ?? "Could not load session repo status" }, 500);
  }

  return jsonResponse(summaryResult.data, 200);
};
