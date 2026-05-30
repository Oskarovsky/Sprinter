import type { APIRoute } from "astro";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { createTask } from "@/lib/session";

const MAX_AFFECTED_PATHS_LENGTH = 2000;

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

  const title = typeof (body as { title?: unknown }).title === "string" ? (body as { title: string }).title.trim() : "";
  const descriptionRaw = (body as { description?: unknown }).description;
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim().length > 0 ? descriptionRaw.trim() : undefined;
  const affectedPathsRaw = (body as { affectedPaths?: unknown }).affectedPaths;
  let affectedPaths: string | undefined;
  if (typeof affectedPathsRaw === "string" && affectedPathsRaw.trim().length > 0) {
    if (affectedPathsRaw.length > MAX_AFFECTED_PATHS_LENGTH) {
      return jsonResponse({ error: `affectedPaths must be at most ${MAX_AFFECTED_PATHS_LENGTH} characters` }, 400);
    }
    affectedPaths = affectedPathsRaw;
  }

  if (!title) {
    return jsonResponse({ error: "title is required" }, 400);
  }

  const result = await createTask(auth.supabase, {
    title,
    description,
    affectedPaths,
    createdBy: auth.user.id,
  });

  if (result.error) {
    return jsonResponse({ error: result.error.message }, 500);
  }

  return jsonResponse({ task: result.data }, 201);
};
