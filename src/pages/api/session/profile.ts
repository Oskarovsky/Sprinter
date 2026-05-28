import type { APIRoute } from "astro";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { ensureProfile, getDisplayName } from "@/lib/session";

const MAX_DISPLAY_NAME_LENGTH = 64;

function validateDisplayName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return null;
  }
  return trimmed;
}

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const result = await getDisplayName(auth.supabase, auth.user.id);
  if (result.error) {
    return jsonResponse({ error: result.error.message }, 500);
  }

  return jsonResponse({ displayName: result.data }, 200);
};

export const PATCH: APIRoute = async (context) => {
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

  const displayName = validateDisplayName((body as { displayName?: unknown }).displayName);
  if (!displayName) {
    return jsonResponse({ error: "displayName must be 1–64 characters" }, 400);
  }

  const result = await ensureProfile(auth.supabase, {
    userId: auth.user.id,
    displayName,
  });

  if (result.error) {
    return jsonResponse({ error: result.error.message }, 500);
  }

  return jsonResponse({ displayName: result.data?.display_name ?? displayName }, 200);
};
