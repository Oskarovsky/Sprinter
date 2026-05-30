import { describe, expect, it, vi } from "vitest";
import { getCachedBlobContent, putCachedBlobContent } from "./blob-cache";
import type { SupabaseClient } from "@supabase/supabase-js";

function mockBlobCacheClient(row: { content: string } | null, error: Error | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error });
  const eqChain = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle,
  };
  eqChain.eq.mockReturnValue(eqChain);

  const upsert = vi.fn().mockResolvedValue({ error: null });

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table !== "repo_blob_cache") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
          select: vi.fn().mockReturnValue(eqChain),
          upsert,
        };
      }),
    } as unknown as SupabaseClient,
    upsert,
    maybeSingle,
  };
}

describe("blob-cache", () => {
  it("returns cached content when row exists", async () => {
    const { client } = mockBlobCacheClient({ content: "cached body" });

    await expect(getCachedBlobContent(client, "conn-1", "src/a.ts", "abc123")).resolves.toBe("cached body");
  });

  it("stores fetched content keyed by path and sha", async () => {
    const { client, upsert } = mockBlobCacheClient(null);

    await putCachedBlobContent(client, "conn-1", "src/a.ts", "abc123", "fresh body");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        connection_id: "conn-1",
        path: "src/a.ts",
        blob_sha: "abc123",
        content: "fresh body",
      }),
      { onConflict: "connection_id,path,blob_sha" },
    );
  });
});
