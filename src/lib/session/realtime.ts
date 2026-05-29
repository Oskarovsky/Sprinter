import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { ensureRealtimeAuth, watchRealtimeAuth } from "./realtime-auth";

export type SessionRealtimeConnectionStatus = "connecting" | "connected" | "disconnected" | "error" | "unconfigured";

export interface PostgresChangePayload {
  eventType: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}

export function channelNameForSession(sessionId: string): string {
  return `planning-session:${sessionId}`;
}

export function shouldRefetchOnVoteEvent(payload: PostgresChangePayload): boolean {
  return payload.eventType === "INSERT" || payload.eventType === "UPDATE" || payload.eventType === "DELETE";
}

export function shouldRefetchOnTaskEvent(payload: PostgresChangePayload): boolean {
  return payload.eventType === "UPDATE";
}

function mapChannelStatus(status: string): SessionRealtimeConnectionStatus {
  switch (status) {
    case "SUBSCRIBED":
      return "connected";
    case "CHANNEL_ERROR":
      return "error";
    case "TIMED_OUT":
    case "CLOSED":
      return "disconnected";
    default:
      return "connecting";
  }
}

export function subscribeToSessionRoom(
  supabase: SupabaseClient,
  sessionId: string,
  onRefetch: () => void,
  onStatusChange?: (status: SessionRealtimeConnectionStatus) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(channelNameForSession(sessionId))
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "tasks", filter: `session_id=eq.${sessionId}` },
      (payload) => {
        if (shouldRefetchOnTaskEvent({ eventType: payload.eventType })) {
          onRefetch();
        }
      },
    )
    .subscribe((status) => {
      onStatusChange?.(mapChannelStatus(status));
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function connectSessionRoomRealtime(
  supabase: SupabaseClient,
  sessionId: string,
  onRefetch: () => void,
  options?: {
    accessToken?: string | null;
    onStatusChange?: (status: SessionRealtimeConnectionStatus) => void;
  },
): Promise<(() => void) | null> {
  const authed = await ensureRealtimeAuth(supabase, options?.accessToken);
  if (!authed) {
    options?.onStatusChange?.("error");
    return null;
  }

  const stopChannel = subscribeToSessionRoom(supabase, sessionId, onRefetch, options?.onStatusChange);
  const stopAuthWatch = watchRealtimeAuth(supabase, () => {
    options?.onStatusChange?.("error");
    stopChannel();
  });

  return () => {
    stopAuthWatch();
    stopChannel();
  };
}
