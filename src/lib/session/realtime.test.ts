import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureRealtimeAuth = vi.fn<typeof import("./realtime-auth").ensureRealtimeAuth>();
const watchRealtimeAuth = vi.fn<typeof import("./realtime-auth").watchRealtimeAuth>();

vi.mock("./realtime-auth", () => ({
  ensureRealtimeAuth: (...args: Parameters<typeof ensureRealtimeAuth>) => ensureRealtimeAuth(...args),
  watchRealtimeAuth: (...args: Parameters<typeof watchRealtimeAuth>) => watchRealtimeAuth(...args),
}));

import {
  channelNameForSession,
  connectSessionRoomRealtime,
  shouldRefetchOnTaskEvent,
  shouldRefetchOnVoteEvent,
} from "./realtime";

function createRealtimeSupabaseMock() {
  const removeChannel = vi.fn().mockResolvedValue(undefined);
  let postgresHandler: ((payload: { eventType: string }) => void) | undefined;
  let statusHandler: ((status: string) => void) | undefined;

  const channel = {
    on: vi.fn((_event: string, _filter: unknown, handler: (payload: { eventType: string }) => void) => {
      postgresHandler = handler;
      return channel;
    }),
    subscribe: vi.fn((handler: (status: string) => void) => {
      statusHandler = handler;
      handler("SUBSCRIBED");
      return channel;
    }),
  };

  const supabase = {
    channel: vi.fn(() => channel),
    removeChannel,
  } as unknown as SupabaseClient;

  return {
    supabase,
    channel,
    removeChannel,
    getPostgresHandler: () => postgresHandler,
    getStatusHandler: () => statusHandler,
  };
}

describe("connectSessionRoomRealtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watchRealtimeAuth.mockReturnValue(vi.fn());
  });

  it("returns null and reports error when auth fails", async () => {
    ensureRealtimeAuth.mockResolvedValue(false);
    const onStatusChange = vi.fn();
    const { supabase } = createRealtimeSupabaseMock();

    const cleanup = await connectSessionRoomRealtime(supabase, "session-id", vi.fn(), {
      onStatusChange,
    });

    expect(cleanup).toBeNull();
    expect(onStatusChange).toHaveBeenCalledWith("error");
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it("subscribes and returns cleanup that removes channel", async () => {
    ensureRealtimeAuth.mockResolvedValue(true);
    const stopAuth = vi.fn();
    watchRealtimeAuth.mockReturnValue(stopAuth);
    const onRefetch = vi.fn();
    const onStatusChange = vi.fn();
    const { supabase, removeChannel } = createRealtimeSupabaseMock();

    const cleanup = await connectSessionRoomRealtime(supabase, "0099c166-56b9-46fb-ab95-b4c638254e9a", onRefetch, {
      accessToken: "token",
      onStatusChange,
    });

    expect(ensureRealtimeAuth).toHaveBeenCalledWith(supabase, "token");
    expect(supabase.channel).toHaveBeenCalledWith("planning-session:0099c166-56b9-46fb-ab95-b4c638254e9a");
    expect(onStatusChange).toHaveBeenCalledWith("connected");

    cleanup?.();
    expect(stopAuth).toHaveBeenCalled();
    expect(removeChannel).toHaveBeenCalled();
  });

  it("refetches on task UPDATE events", async () => {
    ensureRealtimeAuth.mockResolvedValue(true);
    const onRefetch = vi.fn();
    const { supabase, getPostgresHandler } = createRealtimeSupabaseMock();

    await connectSessionRoomRealtime(supabase, "session-id", onRefetch);

    getPostgresHandler()?.({ eventType: "UPDATE" });
    expect(onRefetch).toHaveBeenCalledTimes(1);

    onRefetch.mockClear();
    getPostgresHandler()?.({ eventType: "INSERT" });
    expect(onRefetch).not.toHaveBeenCalled();
  });

  it("tears down channel when auth session is lost", async () => {
    ensureRealtimeAuth.mockResolvedValue(true);
    let onMissingSession: (() => void) | undefined;
    watchRealtimeAuth.mockImplementation((_supabase, onMissing) => {
      onMissingSession = onMissing;
      return vi.fn();
    });
    const onStatusChange = vi.fn();
    const { supabase, removeChannel } = createRealtimeSupabaseMock();

    await connectSessionRoomRealtime(supabase, "session-id", vi.fn(), { onStatusChange });

    onMissingSession?.();
    expect(onStatusChange).toHaveBeenCalledWith("error");
    expect(removeChannel).toHaveBeenCalled();
  });
});

describe("channelNameForSession", () => {
  it("returns a stable channel name scoped to the planning session id", () => {
    const sessionId = "0099c166-56b9-46fb-ab95-b4c638254e9a";
    expect(channelNameForSession(sessionId)).toBe(`planning-session:${sessionId}`);
  });
});

describe("shouldRefetchOnVoteEvent", () => {
  it.each(["INSERT", "UPDATE", "DELETE"] as const)("refetches on %s", (eventType) => {
    expect(shouldRefetchOnVoteEvent({ eventType })).toBe(true);
  });

  it("ignores unrelated event types", () => {
    expect(shouldRefetchOnVoteEvent({ eventType: "TRUNCATE" })).toBe(false);
  });
});

describe("shouldRefetchOnTaskEvent", () => {
  it("refetches on task UPDATE", () => {
    expect(
      shouldRefetchOnTaskEvent({
        eventType: "UPDATE",
        new: { status: "voting" },
      }),
    ).toBe(true);
  });

  it("refetches on task reveal update", () => {
    expect(
      shouldRefetchOnTaskEvent({
        eventType: "UPDATE",
        new: { status: "revealed" },
        old: { status: "voting" },
      }),
    ).toBe(true);
  });

  it("ignores insert and delete task events", () => {
    expect(shouldRefetchOnTaskEvent({ eventType: "INSERT" })).toBe(false);
    expect(shouldRefetchOnTaskEvent({ eventType: "DELETE" })).toBe(false);
  });
});
