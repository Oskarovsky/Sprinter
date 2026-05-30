import type { APIRoute } from "astro";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { createPlanningSession, listPlanningSessions } from "@/lib/session";
import { createRoomErrorStatus, formatPlanningSessionRoom } from "@/lib/session/rooms";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const result = await listPlanningSessions(auth.supabase);
  if (result.error) {
    return jsonResponse({ error: result.error.message }, 500);
  }

  return jsonResponse({ rooms: (result.data ?? []).map(formatPlanningSessionRoom) }, 200);
};

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

  const slug = typeof (body as { slug?: unknown }).slug === "string" ? (body as { slug: string }).slug : "";
  if (!slug.trim()) {
    return jsonResponse({ error: "slug is required" }, 400);
  }

  const createResult = await createPlanningSession(auth.supabase, slug);
  if (createResult.error || !createResult.data) {
    return jsonResponse(
      { error: createResult.error?.message ?? "Could not create room" },
      createRoomErrorStatus(createResult.error?.code),
    );
  }

  return jsonResponse({ room: formatPlanningSessionRoom(createResult.data) }, 201);
};
