import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as config from "./config";
import { completeJson, completeJsonWithMeta } from "./openrouter";

describe("completeJson", () => {
  beforeEach(() => {
    vi.spyOn(config, "getOpenRouterApiKey").mockReturnValue("test-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ drafts: [{ title: "Task" }] }) } }],
        }),
        { status: 200 },
      ),
    );

    const result = await completeJson<{ drafts: { title: string }[] }>("system", "user");
    expect(result).toEqual({ drafts: [{ title: "Task" }] });
  });

  it("returns null on non-2xx response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("rate limited", { status: 429 }));

    const result = await completeJson("system", "user");
    expect(result).toBeNull();
  });

  it("returns null on malformed JSON content", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), {
        status: 200,
      }),
    );

    const result = await completeJson("system", "user");
    expect(result).toBeNull();
  });

  it("returns null when fetch rejects", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network"));

    const result = await completeJson("system", "user");
    expect(result).toBeNull();
  });

  it("returns null when API key is missing", async () => {
    vi.mocked(config.getOpenRouterApiKey).mockReturnValue(undefined);

    const result = await completeJson("system", "user");
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns usage metadata from completeJsonWithMeta", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ storyPoints: 5, rationale: "ok" }) } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
        { status: 200 },
      ),
    );

    const result = await completeJsonWithMeta<{ storyPoints: number; rationale: string }>("system", "user");
    expect(result).toEqual({
      data: { storyPoints: 5, rationale: "ok" },
      model: "openai/gpt-4o-mini",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
  });
});
