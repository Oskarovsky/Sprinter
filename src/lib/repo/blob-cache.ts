import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCachedBlobContent(
  serviceClient: SupabaseClient,
  connectionId: string,
  path: string,
  blobSha: string,
): Promise<string | null> {
  if (!blobSha) {
    return null;
  }

  const response = await serviceClient
    .from("repo_blob_cache")
    .select("content")
    .eq("connection_id", connectionId)
    .eq("path", path)
    .eq("blob_sha", blobSha)
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  const content = response.data.content;
  return typeof content === "string" ? content : null;
}

export async function putCachedBlobContent(
  serviceClient: SupabaseClient,
  connectionId: string,
  path: string,
  blobSha: string,
  content: string,
): Promise<void> {
  if (!blobSha || content.length === 0) {
    return;
  }

  await serviceClient.from("repo_blob_cache").upsert(
    {
      connection_id: connectionId,
      path,
      blob_sha: blobSha,
      content,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: "connection_id,path,blob_sha" },
  );
}
