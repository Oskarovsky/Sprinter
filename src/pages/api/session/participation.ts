import type { APIRoute } from "astro";
import { listParticipation } from "@/lib/session";
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
  if (!taskId) {
    return jsonResponse({ error: "taskId is required" }, 400);
  }

  const { data, error } = await listParticipation(supabase, taskId);
  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ participation: data ?? [] }, 200);
};
