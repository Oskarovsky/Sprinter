import type { APIRoute } from "astro";
import {
  getActiveConnectionIdForSession,
  listFacilitatorConnections,
  toPublicConnection,
} from "@/lib/repo/connections";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";
import { getDefaultSessionId } from "@/lib/session";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const connectionsResult = await listFacilitatorConnections(auth.supabase, auth.user.id);
  if (connectionsResult.error) {
    return jsonResponse({ error: connectionsResult.error.message }, 500);
  }

  const sessionResult = await getDefaultSessionId(auth.supabase);
  if (sessionResult.error) {
    return jsonResponse({ error: sessionResult.error.message }, 500);
  }

  const activeResult = await getActiveConnectionIdForSession(auth.supabase, sessionResult.data);
  if (activeResult.error) {
    return jsonResponse({ error: activeResult.error.message }, 500);
  }

  return jsonResponse(
    {
      connections: connectionsResult.data.map(toPublicConnection),
      activeConnectionId: activeResult.data,
    },
    200,
  );
};
