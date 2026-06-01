import type { APIRoute } from "astro";
import { insertAnalystPending, runAnalystForTask } from "@/lib/repo/run-analyst";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { startVoting } from "@/lib/session";
import { validateTaskSessionSlugWhenPresent } from "@/lib/session/resolve-session-slug";
import { createServiceRoleClient } from "@/lib/supabase-service";

export const POST: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const taskId = context.params.taskId;
  if (!taskId) {
    return jsonResponse({ error: "taskId is required" }, 400);
  }

  const sessionValidation = await validateTaskSessionSlugWhenPresent(context, auth.supabase, taskId);
  if ("response" in sessionValidation) {
    return sessionValidation.response;
  }

  const result = await startVoting(auth.supabase, { taskId, actorId: auth.user.id });
  if (result.error) {
    return jsonResponse({ error: result.error.message }, 500);
  }

  if (!result.data) {
    return jsonResponse({ error: "Only the task creator can start voting" }, 403);
  }

  const serviceClient = createServiceRoleClient();
  if (serviceClient) {
    await insertAnalystPending(serviceClient, taskId);
    const analystJob = runAnalystForTask({
      taskId,
      sessionId: result.data.session_id,
      serviceClient,
    });
    const waitUntil = context.locals.cfContext?.waitUntil.bind(context.locals.cfContext);
    if (typeof waitUntil === "function") {
      waitUntil(analystJob);
    } else if (import.meta.env.DEV) {
      await analystJob;
    } else {
      void analystJob;
    }
  }

  return jsonResponse({ task: result.data }, 200);
};
