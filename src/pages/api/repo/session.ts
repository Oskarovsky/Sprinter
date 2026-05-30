import type { APIRoute } from "astro";
import { getSessionRepoSummary } from "@/lib/repo/connections";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const summaryResult = await getSessionRepoSummary(auth.supabase);
  if (summaryResult.error || !summaryResult.data) {
    return jsonResponse({ error: summaryResult.error?.message ?? "Could not load session repo status" }, 500);
  }

  return jsonResponse(summaryResult.data, 200);
};
