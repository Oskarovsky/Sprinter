import type { APIContext } from "astro";
import { generateDraftFromNotes } from "@/lib/ai";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";

export async function postDraft(context: APIContext): Promise<Response> {
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

  const notes = typeof (body as { notes?: unknown }).notes === "string" ? (body as { notes: string }).notes : "";
  if (!notes.trim()) {
    return jsonResponse({ error: "notes is required" }, 400);
  }

  const result = await generateDraftFromNotes({ notes });
  return jsonResponse(result, 200);
}
