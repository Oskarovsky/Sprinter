-- S-04: Sprinter Analyst — repo library, session link, tree cache, analyst votes

CREATE TYPE public.repo_provider AS ENUM ('github', 'gitlab');

CREATE TYPE public.repo_access_mode AS ENUM ('public', 'private');

CREATE TYPE public.analyst_vote_status AS ENUM ('pending', 'ready', 'failed', 'skipped');

CREATE TABLE public.facilitator_repo_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider public.repo_provider NOT NULL,
  repo_url text NOT NULL,
  repo_full_name text NOT NULL,
  default_branch text,
  access_mode public.repo_access_mode NOT NULL,
  gitlab_base_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(trim(repo_url)) > 0),
  CHECK (char_length(trim(repo_full_name)) > 0)
);

CREATE UNIQUE INDEX facilitator_repo_connections_user_repo_uniq
  ON public.facilitator_repo_connections (user_id, provider, repo_full_name, COALESCE(gitlab_base_url, ''));

CREATE INDEX facilitator_repo_connections_user_id_idx
  ON public.facilitator_repo_connections (user_id, updated_at DESC);

CREATE TABLE public.repo_oauth_tokens (
  connection_id uuid PRIMARY KEY REFERENCES public.facilitator_repo_connections (id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.session_repo_links (
  session_id uuid PRIMARY KEY REFERENCES public.planning_sessions (id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.facilitator_repo_connections (id) ON DELETE CASCADE,
  linked_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_repo_links_connection_id_idx ON public.session_repo_links (connection_id);

CREATE TABLE public.repo_tree_cache (
  connection_id uuid PRIMARY KEY REFERENCES public.facilitator_repo_connections (id) ON DELETE CASCADE,
  tree_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.analyst_votes (
  task_id uuid PRIMARY KEY REFERENCES public.tasks (id) ON DELETE CASCADE,
  story_points smallint CHECK (
    story_points IS NULL
    OR story_points IN (1, 2, 3, 5, 8, 13, 21)
  ),
  rationale text,
  status public.analyst_vote_status NOT NULL DEFAULT 'pending',
  computed_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ADD COLUMN affected_paths text;

ALTER TABLE public.facilitator_repo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repo_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_repo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repo_tree_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyst_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY facilitator_repo_connections_select_own ON public.facilitator_repo_connections
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY facilitator_repo_connections_insert_own ON public.facilitator_repo_connections
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY facilitator_repo_connections_update_own ON public.facilitator_repo_connections
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY facilitator_repo_connections_delete_own ON public.facilitator_repo_connections
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY session_repo_links_select ON public.session_repo_links
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY session_repo_links_insert_linked_by ON public.session_repo_links
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = linked_by);

CREATE POLICY session_repo_links_update_linked_by ON public.session_repo_links
  FOR UPDATE TO authenticated
  USING (auth.uid() = linked_by)
  WITH CHECK (auth.uid() = linked_by);

CREATE POLICY session_repo_links_delete_linked_by ON public.session_repo_links
  FOR DELETE TO authenticated
  USING (auth.uid() = linked_by);

CREATE POLICY analyst_votes_select_revealed ON public.analyst_votes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = analyst_votes.task_id
        AND t.status = 'revealed'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilitator_repo_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_repo_links TO authenticated;
GRANT SELECT ON public.analyst_votes TO authenticated;

-- repo_oauth_tokens and repo_tree_cache: RLS enabled, no authenticated policies (service role only).
