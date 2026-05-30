import type { SupabaseClient } from "@supabase/supabase-js";
import { generateAnalystVote } from "@/lib/ai/generate-analyst";
import { parseAffectedPaths } from "./path-hints";
import { fetchFileContents, MAX_ANALYST_BYTES } from "./fetch-files";
import { selectFilesForTask, MAX_ANALYST_FILES } from "./select-files";
import { getOrRefreshTreeCache } from "./tree-cache";
import type { FacilitatorRepoConnection } from "./types";
import type { Task } from "@/lib/session/types";

interface RepoOAuthTokenRow {
  access_token: string;
  gitlab_pat: boolean;
}

export interface RunAnalystParams {
  taskId: string;
  sessionId: string;
  serviceClient: SupabaseClient;
}

async function upsertAnalystVote(
  serviceClient: SupabaseClient,
  taskId: string,
  payload: {
    status: "pending" | "ready" | "failed" | "skipped";
    storyPoints?: number | null;
    rationale?: string | null;
    errorCode?: string | null;
  },
) {
  const now = new Date().toISOString();
  await serviceClient.from("analyst_votes").upsert(
    {
      task_id: taskId,
      status: payload.status,
      story_points: payload.storyPoints ?? null,
      rationale: payload.rationale ?? null,
      error_code: payload.errorCode ?? null,
      computed_at: payload.status === "ready" || payload.status === "failed" ? now : null,
      updated_at: now,
    },
    { onConflict: "task_id" },
  );
}

export async function insertAnalystPending(serviceClient: SupabaseClient, taskId: string) {
  await upsertAnalystVote(serviceClient, taskId, { status: "pending" });
}

async function loadTask(serviceClient: SupabaseClient, taskId: string): Promise<Task | null> {
  const response = await serviceClient.from("tasks").select("*").eq("id", taskId).maybeSingle();
  return response.data as Task | null;
}

async function loadSessionLink(serviceClient: SupabaseClient, sessionId: string) {
  const response = await serviceClient
    .from("session_repo_links")
    .select("connection_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  return response.data as { connection_id: string } | null;
}

async function loadConnection(serviceClient: SupabaseClient, connectionId: string) {
  const response = await serviceClient
    .from("facilitator_repo_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();

  return response.data as FacilitatorRepoConnection | null;
}

async function loadToken(serviceClient: SupabaseClient, connectionId: string) {
  const response = await serviceClient
    .from("repo_oauth_tokens")
    .select("access_token, gitlab_pat")
    .eq("connection_id", connectionId)
    .maybeSingle();

  return response.data as RepoOAuthTokenRow | null;
}

export async function runAnalystForTask({ taskId, sessionId, serviceClient }: RunAnalystParams): Promise<void> {
  try {
    const task = await loadTask(serviceClient, taskId);
    if (!task) {
      await upsertAnalystVote(serviceClient, taskId, { status: "failed", errorCode: "task_not_found" });
      return;
    }

    const link = await loadSessionLink(serviceClient, sessionId);
    if (!link) {
      await upsertAnalystVote(serviceClient, taskId, { status: "skipped", errorCode: "no_repo_link" });
      return;
    }

    const connection = await loadConnection(serviceClient, link.connection_id);
    if (!connection) {
      await upsertAnalystVote(serviceClient, taskId, { status: "failed", errorCode: "connection_not_found" });
      return;
    }

    const token = connection.access_mode === "private" ? await loadToken(serviceClient, connection.id) : null;
    if (connection.access_mode === "private" && !token?.access_token) {
      await upsertAnalystVote(serviceClient, taskId, { status: "failed", errorCode: "missing_token" });
      return;
    }

    const tree = await getOrRefreshTreeCache(serviceClient, connection.id);
    if (tree.length === 0) {
      await upsertAnalystVote(serviceClient, taskId, { status: "failed", errorCode: "tree_fetch_failed" });
      return;
    }

    const selectedPaths = selectFilesForTask(tree, task);
    const files = await fetchFileContents(
      connection,
      selectedPaths,
      { maxFiles: MAX_ANALYST_FILES, maxBytes: MAX_ANALYST_BYTES },
      { accessToken: token?.access_token ?? null, gitlabPat: token?.gitlab_pat ?? false },
    );

    const analystResult = await generateAnalystVote({
      taskTitle: task.title,
      taskDescription: task.description ?? undefined,
      affectedPaths: parseAffectedPaths(task.affected_paths),
      files,
    });

    if (!analystResult) {
      await upsertAnalystVote(serviceClient, taskId, {
        status: "failed",
        errorCode: files.length === 0 ? "no_files" : "ai_failed",
      });
      return;
    }

    await upsertAnalystVote(serviceClient, taskId, {
      status: "ready",
      storyPoints: analystResult.storyPoints,
      rationale: analystResult.rationale,
    });
  } catch (error) {
    console.error("[runAnalystForTask]", taskId, error);
    try {
      await upsertAnalystVote(serviceClient, taskId, { status: "failed", errorCode: "unexpected_error" });
    } catch (writeError) {
      console.error("[runAnalystForTask] could not persist failure", taskId, writeError);
    }
  }
}
