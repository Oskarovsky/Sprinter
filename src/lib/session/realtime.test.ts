import { describe, expect, it } from "vitest";
import { channelNameForSession, shouldRefetchOnTaskEvent, shouldRefetchOnVoteEvent } from "./realtime";

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
