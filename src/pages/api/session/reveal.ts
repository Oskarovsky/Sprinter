import type { APIRoute } from "astro";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { revealTask } from "@/lib/session";

export const POST: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const taskId = typeof (body as { taskId?: unknown }).taskId === "string" ? (body as { taskId: string }).taskId : "";
  if (!taskId) {
    return jsonResponse({ error: "taskId is required" }, 400);
  }

  const result = await revealTask(auth.supabase, { taskId, actorId: auth.user.id });
  if (result.error) {
    return jsonResponse({ error: result.error.message }, 500);
  }

  if (!result.data) {
    return jsonResponse({ error: "Only the task creator can reveal votes" }, 403);
  }

  return jsonResponse({ task: result.data }, 200);
};
