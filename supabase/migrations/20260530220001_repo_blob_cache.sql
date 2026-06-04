-- S-04: Cache fetched blob contents by SHA to avoid re-downloading unchanged files

CREATE TABLE public.repo_blob_cache (
  connection_id uuid NOT NULL REFERENCES public.facilitator_repo_connections (id) ON DELETE CASCADE,
  path text NOT NULL,
  blob_sha text NOT NULL,
  content text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (connection_id, path, blob_sha),
  CHECK (char_length(trim(path)) > 0),
  CHECK (char_length(trim(blob_sha)) > 0)
);

CREATE INDEX repo_blob_cache_connection_path_idx
  ON public.repo_blob_cache (connection_id, path, fetched_at DESC);

ALTER TABLE public.repo_blob_cache ENABLE ROW LEVEL SECURITY;

-- Service role only (same as repo_tree_cache); no authenticated policies.
