import "dotenv/config";
export const SUPABASE_URL = "http://127.0.0.1:54321";
export const SUPABASE_KEY = "test-anon-key";
export const PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
export const PUBLIC_SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const OPENROUTER_API_KEY: string | undefined = "test-api-key";

export const GITHUB_CLIENT_ID = "test-github-id";
export const GITHUB_CLIENT_SECRET = "test-github-secret";
export const GITLAB_CLIENT_ID = "test-gitlab-client-id";
export const GITLAB_CLIENT_SECRET = "test-gitlab-secret";
export const GITHUB_OAUTH_REDIRECT_URL = "http://localhost:4321/api/auth/github/callback";
