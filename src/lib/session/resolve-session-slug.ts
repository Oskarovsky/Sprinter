import type { APIContext } from "astro";
import { jsonResponse } from "./api-json";
import { getSessionIdBySlug, getTask } from "./tasks";
import type { SessionSupabaseClient } from "./types";

function sessionSlugErrorStatus(code: string | undefined): number {
  if (code === "VALIDATION") {
    return 400;
  }
  if (code === "NOT_FOUND") {
    return 404;
  }
  return 500;
}

export function readSessionSlugFromRequest(context: APIContext, body?: Record<string, unknown> | null): string | null {
  const fromQuery = context.url.searchParams.get("sessionSlug")?.trim();
  if (fromQuery) {
    return fromQuery;
  }

  const fromBody = body?.sessionSlug;
  if (typeof fromBody === "string" && fromBody.trim().length > 0) {
    return fromBody.trim();
  }

  return null;
}

export async function requireSessionSlugFromRequest(
  context: APIContext,
  supabase: SessionSupabaseClient,
  body?: Record<string, unknown> | null,
): Promise<{ sessionId: string } | { response: Response }> {
  const raw = readSessionSlugFromRequest(context, body);
  if (!raw) {
    return { response: jsonResponse({ error: "sessionSlug is required" }, 400) };
  }

  const result = await getSessionIdBySlug(supabase, raw);
  if (result.error) {
    return { response: jsonResponse({ error: result.error.message }, sessionSlugErrorStatus(result.error.code)) };
  }

  return { sessionId: result.data };
}

export async function validateTaskBelongsToSession(
  supabase: SessionSupabaseClient,
  taskId: string,
  sessionId: string,
): Promise<{ ok: true } | { response: Response }> {
  const taskResult = await getTask(supabase, taskId);
  if (taskResult.error) {
    return { response: jsonResponse({ error: taskResult.error.message }, 500) };
  }

  if (!taskResult.data) {
    return { response: jsonResponse({ error: "Task not found" }, 404) };
  }

  if (taskResult.data.session_id !== sessionId) {
    return { response: jsonResponse({ error: "Task does not belong to this session" }, 403) };
  }

  return { ok: true };
}

export async function validateTaskSessionSlugWhenPresent(
  context: APIContext,
  supabase: SessionSupabaseClient,
  taskId: string,
  body?: Record<string, unknown> | null,
): Promise<{ ok: true } | { response: Response }> {
  const raw = readSessionSlugFromRequest(context, body);
  if (!raw) {
    return { ok: true };
  }

  const sessionResult = await getSessionIdBySlug(supabase, raw);
  if (sessionResult.error) {
    return {
      response: jsonResponse({ error: sessionResult.error.message }, sessionSlugErrorStatus(sessionResult.error.code)),
    };
  }

  return validateTaskBelongsToSession(supabase, taskId, sessionResult.data);
}
