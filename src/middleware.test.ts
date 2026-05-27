import { describe, expect, it } from "vitest";
import { PROTECTED_ROUTES } from "./lib/protected-routes";

describe("PROTECTED_ROUTES", () => {
  it("includes the planning session product route", () => {
    expect(PROTECTED_ROUTES).toContain("/session");
  });

  it("includes the dashboard", () => {
    expect(PROTECTED_ROUTES).toContain("/dashboard");
  });
});
