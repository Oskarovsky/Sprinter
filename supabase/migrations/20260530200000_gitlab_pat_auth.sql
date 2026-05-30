-- GitLab PAT: distinguish PRIVATE-TOKEN header from OAuth Bearer on repo_oauth_tokens

ALTER TABLE public.repo_oauth_tokens
  ADD COLUMN gitlab_pat boolean NOT NULL DEFAULT false;
