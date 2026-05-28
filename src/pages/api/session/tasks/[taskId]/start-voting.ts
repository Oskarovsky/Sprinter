import type { APIRoute } from "astro";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { startVoting } from "@/lib/session";

export const POST: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const taskId = context.params.taskId;
  if (!taskId) {
    return jsonResponse({ error: "taskId is required" }, 400);
  }

  const result = await startVoting(auth.supabase, { taskId, actorId: auth.user.id });
  if (result.error) {
    return jsonResponse({ error: result.error.message }, 500);
  }

  if (!result.data) {
    return jsonResponse({ error: "Only the task creator can start voting" }, 403);
  }

  return jsonResponse({ task: result.data }, 200);
};
