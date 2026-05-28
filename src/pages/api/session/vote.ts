import type { APIRoute } from "astro";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { castVote, isValidStoryPoint } from "@/lib/session";

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
  const storyPoints = (body as { storyPoints?: unknown }).storyPoints;

  if (!taskId) {
    return jsonResponse({ error: "taskId is required" }, 400);
  }

  if (typeof storyPoints !== "number" || !isValidStoryPoint(storyPoints)) {
    return jsonResponse({ error: "Invalid story point value" }, 400);
  }

  const result = await castVote(auth.supabase, {
    taskId,
    userId: auth.user.id,
    storyPoints,
  });

  if (result.error) {
    return jsonResponse({ error: result.error.message }, 500);
  }

  return jsonResponse({ vote: result.data }, 200);
};
