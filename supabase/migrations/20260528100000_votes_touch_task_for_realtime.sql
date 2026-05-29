-- Bump tasks.updated_at on vote changes so all peers receive Realtime tasks UPDATE
-- (votes RLS hides peer rows pre-reveal; tasks SELECT is open to authenticated users)
--
-- INVARIANT: touch_task_on_vote_change is trigger-only. It intentionally bypasses
-- tasks_update_creator RLS to bump updated_at only. Do not grant EXECUTE broadly or
-- call from application code.

CREATE OR REPLACE FUNCTION public.touch_task_on_vote_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_task_id uuid;
BEGIN
  target_task_id := COALESCE(NEW.task_id, OLD.task_id);
  UPDATE public.tasks
  SET updated_at = now()
  WHERE id = target_task_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS votes_touch_task_updated_at ON public.votes;

CREATE TRIGGER votes_touch_task_updated_at
AFTER INSERT OR UPDATE OR DELETE ON public.votes
FOR EACH ROW
EXECUTE FUNCTION public.touch_task_on_vote_change();

COMMENT ON FUNCTION public.touch_task_on_vote_change() IS
  'Trigger-only: bumps tasks.updated_at on vote changes for Realtime. Not for direct calls.';

REVOKE ALL ON FUNCTION public.touch_task_on_vote_change() FROM PUBLIC;
