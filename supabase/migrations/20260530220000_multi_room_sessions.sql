-- Multi-room planning sessions: relax task insert RLS and allow authenticated room creation.

DROP POLICY IF EXISTS tasks_insert ON public.tasks;

CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY planning_sessions_insert ON public.planning_sessions
  FOR INSERT TO authenticated
  WITH CHECK (char_length(trim(slug)) > 0);

GRANT INSERT ON public.planning_sessions TO authenticated;
