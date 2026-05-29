import { describe, expect, it } from "vitest";
import { formatDraftForForm } from "./draft-format";

describe("formatDraftForForm", () => {
  it("returns trimmed title and description only when lists are empty", () => {
    const result = formatDraftForForm({
      title: "  Login flow  ",
      description: " OAuth callback ",
      acceptanceCriteria: [],
      openQuestions: [],
    });

    expect(result).toEqual({
      title: "Login flow",
      description: "OAuth callback",
    });
  });

  it("appends acceptance criteria section", () => {
    const result = formatDraftForForm({
      title: "Task",
      description: "Details",
      acceptanceCriteria: ["User can sign in", "  "],
      openQuestions: [],
    });

    expect(result.description).toBe("Details\n\n## Acceptance criteria\n- User can sign in");
  });

  it("appends open questions section", () => {
    const result = formatDraftForForm({
      title: "Task",
      description: "",
      acceptanceCriteria: [],
      openQuestions: ["Which OAuth provider?"],
    });

    expect(result.description).toBe("## Open questions\n- Which OAuth provider?");
  });

  it("appends both sections in order", () => {
    const result = formatDraftForForm({
      title: "Checkout",
      description: "Stripe integration",
      acceptanceCriteria: ["Payment succeeds"],
      openQuestions: ["Refund policy?"],
    });

    expect(result.description).toBe(
      "Stripe integration\n\n## Acceptance criteria\n- Payment succeeds\n\n## Open questions\n- Refund policy?",
    );
  });
});
