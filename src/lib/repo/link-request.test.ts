import { describe, expect, it } from "vitest";
import { parseLinkAccessMode, parseLinkPostFields, parseLinkProvider } from "./link-request";

describe("parseLinkProvider", () => {
  it("accepts github and gitlab", () => {
    expect(parseLinkProvider("github")).toBe("github");
    expect(parseLinkProvider("gitlab")).toBe("gitlab");
  });

  it("rejects unknown providers", () => {
    expect(parseLinkProvider("bitbucket")).toBeNull();
    expect(parseLinkProvider(null)).toBeNull();
  });
});

describe("parseLinkAccessMode", () => {
  it("accepts public and private", () => {
    expect(parseLinkAccessMode("public")).toBe("public");
    expect(parseLinkAccessMode("private")).toBe("private");
  });

  it("rejects unknown access modes", () => {
    expect(parseLinkAccessMode("internal")).toBeNull();
  });
});

describe("parseLinkPostFields", () => {
  it("returns parsed fields for valid body", () => {
    expect(
      parseLinkPostFields({
        provider: "gitlab",
        accessMode: "private",
        repoUrl: "https://gitlab.com/acme/widget",
      }),
    ).toEqual({
      provider: "gitlab",
      accessMode: "private",
      repoUrl: "https://gitlab.com/acme/widget",
    });
  });

  it("returns validation error when required fields are missing", () => {
    expect(parseLinkPostFields({ provider: "github" })).toEqual({
      error: "provider, repoUrl, and accessMode are required",
    });
  });

  it("trims repoUrl", () => {
    const parsed = parseLinkPostFields({
      provider: "github",
      accessMode: "public",
      repoUrl: "  https://github.com/acme/widget  ",
    });
    expect(parsed).toEqual({
      provider: "github",
      accessMode: "public",
      repoUrl: "https://github.com/acme/widget",
    });
  });
});
