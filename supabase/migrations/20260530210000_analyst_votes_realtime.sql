-- S-04: Refetch session UI when Sprinter Analyst finishes after reveal

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'analyst_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.analyst_votes;
  END IF;
END $$;
