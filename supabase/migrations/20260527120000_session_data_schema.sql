-- F-01: Session data schema for single-room planning poker (gate-product-routes)

CREATE TYPE public.task_status AS ENUM ('draft', 'voting', 'revealed');

CREATE TABLE public.planning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.planning_sessions (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status public.task_status NOT NULL DEFAULT 'draft',
  revealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_session_id_created_at_idx ON public.tasks (session_id, created_at DESC);

CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  story_points smallint NOT NULL CHECK (story_points IN (1, 2, 3, 5, 8, 13, 21)),
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX votes_task_id_idx ON public.votes (task_id);

INSERT INTO public.planning_sessions (slug)
VALUES ('default');

ALTER TABLE public.planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY planning_sessions_select ON public.planning_sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND session_id IN (SELECT id FROM public.planning_sessions WHERE slug = 'default')
  );

CREATE POLICY tasks_update_creator ON public.tasks
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY votes_select_blind ON public.votes
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = votes.task_id
        AND t.status = 'revealed'
    )
  );

CREATE POLICY votes_insert_own ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = votes.task_id
        AND t.status = 'voting'
    )
  );

CREATE POLICY votes_update_own ON public.votes
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = votes.task_id
        AND t.status = 'voting'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = votes.task_id
        AND t.status = 'voting'
    )
  );

CREATE OR REPLACE VIEW public.vote_participation
WITH (security_invoker = false) AS
SELECT
  v.task_id,
  v.user_id,
  p.display_name,
  v.voted_at,
  CASE
    WHEN t.status = 'revealed' OR v.user_id = auth.uid() THEN v.story_points
    ELSE NULL::smallint
  END AS story_points
FROM public.votes v
JOIN public.tasks t ON t.id = v.task_id
JOIN public.profiles p ON p.user_id = v.user_id;

GRANT SELECT ON public.vote_participation TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.votes TO authenticated;
GRANT SELECT ON public.planning_sessions TO authenticated;
