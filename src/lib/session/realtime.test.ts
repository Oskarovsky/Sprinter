import { describe, expect, it } from "vitest";
import { channelNameForTask, shouldRefetchOnTaskEvent, shouldRefetchOnVoteEvent } from "./realtime";

describe("channelNameForTask", () => {
  it("returns a stable channel name scoped to the task id", () => {
    const taskId = "0099c166-56b9-46fb-ab95-b4c638254e9a";
    expect(channelNameForTask(taskId)).toBe(`session-task:${taskId}`);
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
        new: { status: "revealed" },
        old: { status: "voting" },
      }),
    ).toBe(true);
  });

  it("ignores non-update task events", () => {
    expect(shouldRefetchOnTaskEvent({ eventType: "INSERT" })).toBe(false);
  });
});
