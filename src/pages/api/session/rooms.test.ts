import { describe, expect, it } from "vitest";
import { createRoomErrorStatus, formatPlanningSessionRoom } from "@/lib/session/rooms";

describe("formatPlanningSessionRoom", () => {
  it("maps database row to API room shape", () => {
    expect(
      formatPlanningSessionRoom({
        id: "room-1",
        slug: "team-alpha",
        created_at: "2026-05-30T12:00:00.000Z",
      }),
    ).toEqual({
      id: "room-1",
      slug: "team-alpha",
      createdAt: "2026-05-30T12:00:00.000Z",
    });
  });
});

describe("createRoomErrorStatus", () => {
  it("maps validation and duplicate errors to 400 and 409", () => {
    expect(createRoomErrorStatus("VALIDATION")).toBe(400);
    expect(createRoomErrorStatus("DUPLICATE")).toBe(409);
    expect(createRoomErrorStatus("SESSION")).toBe(500);
  });
});
