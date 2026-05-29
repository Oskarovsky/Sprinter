import { describe, expect, it } from "vitest";
import { fallbackDraftFromNotes } from "./draft";

describe("fallbackDraftFromNotes", () => {
  it("returns empty array for blank notes", () => {
    expect(fallbackDraftFromNotes("   ")).toEqual([]);
  });

  it("splits notes on blank lines into multiple drafts", () => {
    const drafts = fallbackDraftFromNotes("First task\nDetails here\n\nSecond task\nMore details");

    expect(drafts).toHaveLength(2);
    expect(drafts[0]?.title).toBe("First task");
    expect(drafts[0]?.description).toBe("Details here");
    expect(drafts[1]?.title).toBe("Second task");
    expect(drafts[1]?.description).toBe("More details");
  });

  it("uses the full single line as title when no blank-line separators exist", () => {
    const notes = "A".repeat(120);
    const drafts = fallbackDraftFromNotes(notes);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.title).toBe(notes);
  });

  it("returns empty acceptance criteria and open questions", () => {
    const drafts = fallbackDraftFromNotes("Only title");

    expect(drafts[0]?.acceptanceCriteria).toEqual([]);
    expect(drafts[0]?.openQuestions).toEqual([]);
  });
});
