import type { APIRoute } from "astro";
import {
  getActiveConnectionIdForDefaultSession,
  listFacilitatorConnections,
  toPublicConnection,
} from "@/lib/repo/connections";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const connectionsResult = await listFacilitatorConnections(auth.supabase, auth.user.id);
  if (connectionsResult.error) {
    return jsonResponse({ error: connectionsResult.error.message }, 500);
  }

  const activeResult = await getActiveConnectionIdForDefaultSession(auth.supabase);
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
