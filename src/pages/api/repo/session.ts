import type { APIRoute } from "astro";
import { getSessionRepoSummary } from "@/lib/repo/connections";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { getDefaultSessionId } from "@/lib/session";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const sessionResult = await getDefaultSessionId(auth.supabase);
  if (sessionResult.error) {
    return jsonResponse({ error: sessionResult.error.message }, 500);
  }

  const summaryResult = await getSessionRepoSummary(auth.supabase, sessionResult.data);
  if (summaryResult.error || !summaryResult.data) {
    return jsonResponse({ error: summaryResult.error?.message ?? "Could not load session repo status" }, 500);
  }

  return jsonResponse(summaryResult.data, 200);
};
