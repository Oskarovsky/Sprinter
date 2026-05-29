import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { ensureRealtimeAuth, watchRealtimeAuth } from "./realtime-auth";

function createSupabaseMock(sessionToken: string | null) {
  const setAuth = vi.fn().mockResolvedValue(undefined);
  const getSession = vi.fn().mockResolvedValue({
    data: { session: sessionToken ? { access_token: sessionToken } : null },
  });
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe } },
  });

  const supabase = {
    auth: { getSession, onAuthStateChange },
    realtime: { setAuth },
  } as unknown as SupabaseClient;

  return { supabase, setAuth, getSession, onAuthStateChange, unsubscribe };
}

describe("ensureRealtimeAuth", () => {
  it("uses bootstrap token without calling getSession", async () => {
    const { supabase, setAuth, getSession } = createSupabaseMock(null);

    await expect(ensureRealtimeAuth(supabase, "bootstrap-token")).resolves.toBe(true);

    expect(setAuth).toHaveBeenCalledWith("bootstrap-token");
    expect(getSession).not.toHaveBeenCalled();
  });

  it("falls back to getSession when bootstrap token is missing", async () => {
    const { supabase, setAuth } = createSupabaseMock("session-token");

    await expect(ensureRealtimeAuth(supabase)).resolves.toBe(true);

    expect(setAuth).toHaveBeenCalledWith("session-token");
  });

  it("returns false when no session token is available", async () => {
    const { supabase, setAuth } = createSupabaseMock(null);

    await expect(ensureRealtimeAuth(supabase)).resolves.toBe(false);

    expect(setAuth).not.toHaveBeenCalled();
  });

  it("returns false when setAuth rejects", async () => {
    const { supabase, setAuth } = createSupabaseMock("session-token");
    setAuth.mockRejectedValue(new Error("setAuth failed"));

    await expect(ensureRealtimeAuth(supabase)).resolves.toBe(false);
  });
});

describe("watchRealtimeAuth", () => {
  it("refreshes realtime auth on auth state changes", () => {
    const { supabase, setAuth, onAuthStateChange, unsubscribe } = createSupabaseMock(null);
    let listener: ((event: string, session: { access_token: string } | null) => void) | undefined;

    onAuthStateChange.mockImplementation((callback: typeof listener) => {
      listener = callback;
      return { data: { subscription: { unsubscribe } } };
    });

    const stop = watchRealtimeAuth(supabase);
    listener?.("TOKEN_REFRESHED", { access_token: "fresh-token" });

    expect(setAuth).toHaveBeenCalledWith("fresh-token");
    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
