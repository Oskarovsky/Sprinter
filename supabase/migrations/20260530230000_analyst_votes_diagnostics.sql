-- Sprinter Analyst: persist source files and OpenRouter token usage for post-reveal UI

ALTER TABLE public.analyst_votes
  ADD COLUMN source_files text[] NOT NULL DEFAULT '{}',
  ADD COLUMN ai_model text,
  ADD COLUMN prompt_tokens integer CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  ADD COLUMN completion_tokens integer CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  ADD COLUMN total_tokens integer CHECK (total_tokens IS NULL OR total_tokens >= 0);
