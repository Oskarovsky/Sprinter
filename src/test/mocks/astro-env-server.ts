<<<<<<< HEAD
import "dotenv/config";
export const SUPABASE_URL = "http://127.0.0.1:54321";
export const SUPABASE_KEY = "test-anon-key";
export const PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
export const PUBLIC_SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
=======
export const SUPABASE_URL = "http://localhost:54321";
export const SUPABASE_KEY = "test-anon-key";
export const PUBLIC_SUPABASE_URL = "http://localhost:54321";
export const PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
export const SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
>>>>>>> 0724f46f8394d1cd00dfb003f22d539b384b71bd

export const OPENROUTER_API_KEY: string | undefined = "test-api-key";

export const GITHUB_CLIENT_ID = "test-github-id";
export const GITHUB_CLIENT_SECRET = "test-github-secret";
export const GITLAB_CLIENT_ID = "test-gitlab-client-id";
export const GITLAB_CLIENT_SECRET = "test-gitlab-secret";
export const GITHUB_OAUTH_REDIRECT_URL = "http://localhost:4321/api/auth/github/callback";
