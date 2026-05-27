import type { APIRoute } from "astro";
import { getLatestActiveTask, getTask, listParticipation } from "@/lib/session";
import { createClient } from "@/lib/supabase";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return jsonResponse({ error: "Supabase is not configured" }, 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const taskId = context.url.searchParams.get("taskId");
  let taskResult;

  if (taskId) {
    taskResult = await getTask(supabase, taskId);
  } else {
    taskResult = await getLatestActiveTask(supabase);
  }

  if (taskResult.error) {
    return jsonResponse({ error: taskResult.error.message }, 500);
  }

  const task = taskResult.data;
  if (!task) {
    return jsonResponse({ task: null, participation: [] }, 200);
  }

  const participationResult = await listParticipation(supabase, task.id);
  if (participationResult.error) {
    return jsonResponse({ error: participationResult.error.message }, 500);
  }

  return jsonResponse({ task, participation: participationResult.data ?? [] }, 200);
};
