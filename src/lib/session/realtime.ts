import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export type SessionRealtimeConnectionStatus = "connecting" | "connected" | "disconnected" | "error" | "unconfigured";

export interface PostgresChangePayload {
  eventType: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}

export function channelNameForTask(taskId: string): string {
  return `session-task:${taskId}`;
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

export function subscribeToSessionTask(
  supabase: SupabaseClient,
  taskId: string,
  onRefetch: () => void,
  onStatusChange?: (status: SessionRealtimeConnectionStatus) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(channelNameForTask(taskId))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "votes", filter: `task_id=eq.${taskId}` },
      (payload) => {
        if (shouldRefetchOnVoteEvent({ eventType: payload.eventType })) {
          onRefetch();
        }
      },
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "tasks", filter: `id=eq.${taskId}` },
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
