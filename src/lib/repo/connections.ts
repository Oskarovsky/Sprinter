import type { SupabaseClient } from "@supabase/supabase-js";
import { getDisplayName } from "@/lib/session/profile";
import { getDefaultSessionId } from "@/lib/session/tasks";
import type { FacilitatorRepoConnection, RepoAccessMode, RepoProvider } from "./types";
import type { OAuthTokenResponse } from "./tree-types";

export interface UpsertConnectionInput {
  userId: string;
  provider: RepoProvider;
  repoUrl: string;
  repoFullName: string;
  accessMode: RepoAccessMode;
  gitlabBaseUrl: string | null;
  defaultBranch: string | null;
}

export async function findFacilitatorConnection(
  supabase: SupabaseClient,
  input: Pick<UpsertConnectionInput, "userId" | "provider" | "repoFullName" | "gitlabBaseUrl">,
) {
  let query = supabase
    .from("facilitator_repo_connections")
    .select("*")
    .eq("user_id", input.userId)
    .eq("provider", input.provider)
    .eq("repo_full_name", input.repoFullName);

  if (input.gitlabBaseUrl) {
    query = query.eq("gitlab_base_url", input.gitlabBaseUrl);
  } else {
    query = query.is("gitlab_base_url", null);
  }

  const response = await query.maybeSingle();
  return { data: response.data as FacilitatorRepoConnection | null, error: response.error };
}

export async function upsertFacilitatorConnection(supabase: SupabaseClient, input: UpsertConnectionInput) {
  const existing = await findFacilitatorConnection(supabase, input);
  if (existing.error) {
    return { data: null, error: existing.error };
  }

  const row = {
    user_id: input.userId,
    provider: input.provider,
    repo_url: input.repoUrl,
    repo_full_name: input.repoFullName,
    access_mode: input.accessMode,
    gitlab_base_url: input.gitlabBaseUrl,
    default_branch: input.defaultBranch,
    updated_at: new Date().toISOString(),
  };

  if (existing.data) {
    const response = await supabase
      .from("facilitator_repo_connections")
      .update(row)
      .eq("id", existing.data.id)
      .select()
      .single();
    return { data: response.data as FacilitatorRepoConnection | null, error: response.error };
  }

  const response = await supabase.from("facilitator_repo_connections").insert(row).select().single();
  return { data: response.data as FacilitatorRepoConnection | null, error: response.error };
}

export async function setSessionRepoLink(
  supabase: SupabaseClient,
  {
    connectionId,
    linkedBy,
  }: {
    connectionId: string;
    linkedBy: string;
  },
) {
  const sessionResult = await getDefaultSessionId(supabase);
  if (sessionResult.error) {
    return { data: null, error: sessionResult.error };
  }

  const existing = await supabase
    .from("session_repo_links")
    .select("linked_by")
    .eq("session_id", sessionResult.data)
    .maybeSingle();

  if (existing.error) {
    return { data: null, error: existing.error };
  }

  if (existing.data && existing.data.linked_by !== linkedBy) {
    return {
      data: null,
      error: new Error("Only the facilitator who linked the repo can replace the session link"),
    };
  }

  const linkedAt = new Date().toISOString();

  if (existing.data) {
    const response = await supabase
      .from("session_repo_links")
      .update({
        connection_id: connectionId,
        linked_at: linkedAt,
      })
      .eq("session_id", sessionResult.data)
      .select()
      .single();

    return { data: response.data, error: response.error };
  }

  const response = await supabase
    .from("session_repo_links")
    .insert({
      session_id: sessionResult.data,
      connection_id: connectionId,
      linked_by: linkedBy,
      linked_at: linkedAt,
    })
    .select()
    .single();

  return { data: response.data, error: response.error };
}

export async function storeOAuthTokens(
  serviceClient: SupabaseClient,
  connectionId: string,
  tokens: OAuthTokenResponse,
  options: { gitlabPat?: boolean } = {},
) {
  const response = await serviceClient.from("repo_oauth_tokens").upsert(
    {
      connection_id: connectionId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
      gitlab_pat: options.gitlabPat ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "connection_id" },
  );

  return { error: response.error };
}

export async function storeGitlabPatToken(
  serviceClient: SupabaseClient,
  connectionId: string,
  personalAccessToken: string,
) {
  const response = await serviceClient.from("repo_oauth_tokens").upsert(
    {
      connection_id: connectionId,
      access_token: personalAccessToken,
      refresh_token: null,
      expires_at: null,
      gitlab_pat: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "connection_id" },
  );

  return { error: response.error };
}

export async function disconnectSessionRepoLink(
  supabase: SupabaseClient,
  {
    linkedBy,
    removeFromLibrary,
    connectionId,
  }: {
    linkedBy: string;
    removeFromLibrary: boolean;
    connectionId?: string;
  },
) {
  const sessionResult = await getDefaultSessionId(supabase);
  if (sessionResult.error) {
    return { error: sessionResult.error };
  }

  let targetConnectionId = connectionId;
  if (!targetConnectionId) {
    const linkResponse = await supabase
      .from("session_repo_links")
      .select("connection_id, linked_by")
      .eq("session_id", sessionResult.data)
      .maybeSingle();

    if (linkResponse.error) {
      return { error: linkResponse.error };
    }

    if (!linkResponse.data) {
      return { error: null };
    }

    if (linkResponse.data.linked_by !== linkedBy) {
      return { error: new Error("Only the facilitator who linked the repo can disconnect it") };
    }

    targetConnectionId = linkResponse.data.connection_id as string;
  }

  const deleteLink = await supabase.from("session_repo_links").delete().eq("session_id", sessionResult.data);
  if (deleteLink.error) {
    return { error: deleteLink.error };
  }

  if (removeFromLibrary && targetConnectionId) {
    const deleteConnection = await supabase
      .from("facilitator_repo_connections")
      .delete()
      .eq("id", targetConnectionId)
      .eq("user_id", linkedBy);
    if (deleteConnection.error) {
      return { error: deleteConnection.error };
    }
  }

  return { error: null };
}

export function toPublicConnection(connection: FacilitatorRepoConnection) {
  return {
    id: connection.id,
    provider: connection.provider,
    repoUrl: connection.repo_url,
    repoFullName: connection.repo_full_name,
    accessMode: connection.access_mode,
    gitlabBaseUrl: connection.gitlab_base_url,
    defaultBranch: connection.default_branch,
  };
}

export async function listFacilitatorConnections(supabase: SupabaseClient, userId: string) {
  const response = await supabase
    .from("facilitator_repo_connections")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return {
    data: (response.data ?? []) as FacilitatorRepoConnection[],
    error: response.error,
  };
}

export async function getActiveConnectionIdForDefaultSession(supabase: SupabaseClient) {
  const sessionResult = await getDefaultSessionId(supabase);
  if (sessionResult.error) {
    return { data: null, error: sessionResult.error };
  }

  const linkResponse = await supabase
    .from("session_repo_links")
    .select("connection_id")
    .eq("session_id", sessionResult.data)
    .maybeSingle();

  if (linkResponse.error) {
    return { data: null, error: linkResponse.error };
  }

  return { data: (linkResponse.data?.connection_id as string | undefined) ?? null, error: null };
}

export interface SessionRepoSummary {
  linked: boolean;
  connection?: {
    provider: RepoProvider;
    repoFullName: string;
    accessMode: RepoAccessMode;
    linkedByDisplayName: string;
  };
}

export async function getSessionRepoSummary(supabase: SupabaseClient): Promise<{
  data: SessionRepoSummary | null;
  error: Error | null;
}> {
  const sessionResult = await getDefaultSessionId(supabase);
  if (sessionResult.error) {
    return { data: null, error: sessionResult.error };
  }

  const linkResponse = await supabase
    .from("session_repo_links")
    .select("connection_id, linked_by")
    .eq("session_id", sessionResult.data)
    .maybeSingle();

  if (linkResponse.error) {
    return { data: null, error: linkResponse.error };
  }

  if (!linkResponse.data) {
    return { data: { linked: false }, error: null };
  }

  const connectionResponse = await supabase
    .from("facilitator_repo_connections")
    .select("provider, repo_full_name, access_mode")
    .eq("id", linkResponse.data.connection_id as string)
    .maybeSingle();

  if (connectionResponse.error || !connectionResponse.data) {
    return { data: { linked: false }, error: connectionResponse.error };
  }

  const displayNameResult = await getDisplayName(supabase, linkResponse.data.linked_by as string);
  const linkedByDisplayName =
    displayNameResult.error || !displayNameResult.data
      ? `User ${(linkResponse.data.linked_by as string).slice(0, 8)}`
      : displayNameResult.data;

  const connection = connectionResponse.data as {
    provider: RepoProvider;
    repo_full_name: string;
    access_mode: RepoAccessMode;
  };

  return {
    data: {
      linked: true,
      connection: {
        provider: connection.provider,
        repoFullName: connection.repo_full_name,
        accessMode: connection.access_mode,
        linkedByDisplayName,
      },
    },
    error: null,
  };
}
