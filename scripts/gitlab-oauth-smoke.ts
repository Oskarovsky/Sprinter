/**
 * S-04 Phase 2 — GitLab OAuth smoke test (manual + automated preflight).
 * Not run in CI. Requires `npm run dev` on APP_URL.
 *
 * Setup (self-hosted GitLab, e.g. gitlab.vodeno.net):
 *   1. Admin → Applications → New application
 *   2. Redirect URI: http://127.0.0.1:4321/api/repo/oauth/gitlab/callback
 *   3. Scopes: read_api, read_repository
 *   4. Add to .dev.vars (and restart dev server):
 *        GITLAB_CLIENT_ID=...
 *        GITLAB_CLIENT_SECRET=...
 *        SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Usage:
 *   npx tsx scripts/gitlab-oauth-smoke.ts
 *   npx tsx scripts/gitlab-oauth-smoke.ts --verify
 *
 * Optional env:
 *   APP_URL=http://127.0.0.1:4321
 *   GITLAB_BASE_URL=https://gitlab.vodeno.net
 *   GITLAB_REPO_URL=https://gitlab.vodeno.net/group/project
 *   GITLAB_SMOKE_EMAIL / GITLAB_SMOKE_PASSWORD (default: session-smoke-a@gmail.com)
 *   GITLAB_SMOKE_SESSION_SLUG — room slug for OAuth return + DB link check (default: `default`)
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (for --verify DB checks)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const DEFAULT_APP_URL = "http://127.0.0.1:4321";
const DEFAULT_GITLAB_BASE = "https://gitlab.vodeno.net";
const DEFAULT_REPO_URL = "https://gitlab.vodeno.net/vodeno/payments/blik/blik-api";
const DEFAULT_EMAIL = "session-smoke-a@gmail.com";
const DEFAULT_PASSWORD = "smokepass123";

function loadEnvFiles(): Record<string, string> {
  const merged: Record<string, string> = { ...process.env } as Record<string, string>;
  for (const file of [".dev.vars", ".env"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq);
        const value = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
        if (!(key in merged) || merged[key] === "") {
          merged[key] = value;
        }
      }
    } catch {
      /* optional file */
    }
  }
  return merged;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function collectSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function cookieHeaderFromResponses(responses: Response[]): string {
  const pairs: string[] = [];
  for (const response of responses) {
    for (const raw of collectSetCookies(response)) {
      const pair = raw.split(";")[0]?.trim();
      if (pair) {
        pairs.push(pair);
      }
    }
  }
  return pairs.join("; ");
}

async function ensureAuthUser(email: string, password: string, supabaseUrl: string, anonKey: string) {
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const signUp = await authClient.auth.signUp({ email, password });
  if (signUp.error && !signUp.error.message.toLowerCase().includes("already")) {
    throw new Error(`signUp ${email}: ${signUp.error.message}`);
  }

  const signIn = await authClient.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session) {
    throw new Error(`signIn ${email}: ${signIn.error?.message ?? "no session"}`);
  }

  return signIn.data.session.user.id;
}

async function signInViaApp(appUrl: string, email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ email, password });
  const response = await fetch(`${appUrl}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    redirect: "manual",
  });

  const cookieHeader = cookieHeaderFromResponses([response]);
  if (!cookieHeader) {
    throw new Error(
      `App sign-in did not return session cookies (status ${response.status}). Is \`npm run dev\` running on ${appUrl}?`,
    );
  }

  return cookieHeader;
}

async function fetchOAuthStartUrl(
  appUrl: string,
  cookieHeader: string,
  gitlabBaseUrl: string,
  repoUrl: string,
  sessionSlug: string,
): Promise<string> {
  const params = new URLSearchParams({
    accessMode: "private",
    gitlabBaseUrl,
    repoUrl,
    returnPath: `/session/${sessionSlug}`,
  });

  const response = await fetch(`${appUrl}/api/repo/oauth/gitlab/start?${params.toString()}`, {
    redirect: "manual",
    headers: { Cookie: cookieHeader },
  });

  if (response.status === 401) {
    throw new Error("OAuth start returned 401 — session cookie missing or expired");
  }

  if (response.status >= 400) {
    const location = response.headers.get("location") ?? "";
    const errorParam = location.includes("repoError=") ? decodeURIComponent(location.split("repoError=")[1] ?? "") : "";
    throw new Error(`OAuth start failed (${response.status})${errorParam ? `: ${errorParam}` : ""}`);
  }

  const location = response.headers.get("location");
  if (!location) {
    throw new Error(`OAuth start did not redirect (status ${response.status})`);
  }

  return location;
}

function validateAuthorizeUrl(authorizeUrl: string, gitlabBaseUrl: string, clientId: string) {
  const url = new URL(authorizeUrl);
  assert(url.origin === gitlabBaseUrl, `Authorize URL targets ${gitlabBaseUrl}`);
  assert(url.pathname.endsWith("/oauth/authorize"), "Authorize URL path is /oauth/authorize");
  assert(url.searchParams.get("client_id") === clientId, "client_id matches GITLAB_CLIENT_ID");
  assert(url.searchParams.get("response_type") === "code", "response_type is code");
  assert(url.searchParams.get("scope")?.includes("read_api") === true, "scope includes read_api");
  assert(url.searchParams.get("scope")?.includes("read_repository") === true, "scope includes read_repository");
  assert((url.searchParams.get("state") ?? "").length > 20, "signed state param present");
  assert(
    url.searchParams.get("redirect_uri")?.includes("/api/repo/oauth/gitlab/callback") === true,
    "redirect_uri points to GitLab OAuth callback route",
  );
}

async function verifyDatabase(
  supabaseUrl: string,
  serviceRoleKey: string,
  gitlabBaseUrl: string,
  repoFullName: string,
  userId: string,
  sessionSlug: string,
) {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const normalizedBase = gitlabBaseUrl === "https://gitlab.com" ? null : gitlabBaseUrl;

  let connectionQuery = admin
    .from("facilitator_repo_connections")
    .select("id, user_id, access_mode, gitlab_base_url, repo_full_name")
    .eq("user_id", userId)
    .eq("provider", "gitlab")
    .eq("repo_full_name", repoFullName);

  connectionQuery =
    normalizedBase === null
      ? connectionQuery.is("gitlab_base_url", null)
      : connectionQuery.eq("gitlab_base_url", normalizedBase);

  const connection = await connectionQuery.maybeSingle();
  assert(!connection.error && connection.data !== null, "facilitator_repo_connections row exists");
  const connectionRow = connection.data;
  if (!connectionRow) {
    throw new Error("connection row missing after assert");
  }
  assert(connectionRow.access_mode === "private", "connection access_mode is private");

  const tokens = await admin
    .from("repo_oauth_tokens")
    .select("connection_id, access_token, gitlab_pat, refresh_token")
    .eq("connection_id", connectionRow.id)
    .maybeSingle();

  assert(!tokens.error && tokens.data !== null, "repo_oauth_tokens row exists");
  const tokenRow = tokens.data;
  if (!tokenRow) {
    throw new Error("token row missing after assert");
  }
  assert(tokenRow.gitlab_pat === false, "OAuth token stored with gitlab_pat=false");
  assert((tokenRow.access_token ?? "").length > 0, "access_token persisted (service role only)");

  const sessions = await admin.from("planning_sessions").select("id").eq("slug", sessionSlug).maybeSingle();
  assert(!sessions.error && sessions.data !== null, `planning session "${sessionSlug}" exists`);
  const sessionRow = sessions.data;
  if (!sessionRow) {
    throw new Error("session row missing after assert");
  }

  const link = await admin
    .from("session_repo_links")
    .select("connection_id, linked_by")
    .eq("session_id", sessionRow.id)
    .maybeSingle();

  assert(!link.error && link.data !== null, "session_repo_links row exists");
  const linkRow = link.data;
  if (!linkRow) {
    throw new Error("link row missing after assert");
  }
  assert(linkRow.connection_id === connectionRow.id, "session active link matches connection");
  assert(linkRow.linked_by === userId, "session link owned by smoke user");
}

function repoFullNameFromUrl(repoUrl: string, gitlabBaseUrl: string): string {
  const baseHost = new URL(gitlabBaseUrl).host;
  const url = new URL(repoUrl);
  if (url.host !== baseHost) {
    throw new Error("GITLAB_REPO_URL host must match GITLAB_BASE_URL");
  }
  return url.pathname
    .split("/")
    .filter(Boolean)
    .join("/")
    .replace(/\.git$/u, "");
}

async function runPreflight(env: Record<string, string>, verifyOnly: boolean) {
  const appUrl = env.APP_URL ?? DEFAULT_APP_URL;
  const gitlabBaseUrl = env.GITLAB_BASE_URL ?? DEFAULT_GITLAB_BASE;
  const repoUrl = env.GITLAB_REPO_URL ?? DEFAULT_REPO_URL;
  const email = env.GITLAB_SMOKE_EMAIL ?? DEFAULT_EMAIL;
  const password = env.GITLAB_SMOKE_PASSWORD ?? DEFAULT_PASSWORD;
  const supabaseUrl = env.SUPABASE_URL ?? LOCAL_SUPABASE_URL;
  const anonKey = env.SUPABASE_KEY ?? LOCAL_ANON_KEY;
  const clientId = env.GITLAB_CLIENT_ID ?? "";
  const clientSecret = env.GITLAB_CLIENT_SECRET ?? "";
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const sessionSlug = env.GITLAB_SMOKE_SESSION_SLUG ?? "default";

  console.log("\nGitLab OAuth smoke test (S-04 Phase 2)");
  console.log(`  App:     ${appUrl}`);
  console.log(`  GitLab:  ${gitlabBaseUrl}`);
  console.log(`  Repo:    ${repoUrl}`);
  console.log(`  Room:    ${sessionSlug}\n`);

  console.log("1. Environment");
  assert(clientId.length > 0, "GITLAB_CLIENT_ID is set");
  assert(clientSecret.length > 0, "GITLAB_CLIENT_SECRET is set");
  assert(serviceRoleKey.length > 0, "SUPABASE_SERVICE_ROLE_KEY is set (callback token storage)");

  if (verifyOnly) {
    console.log("\n2. Verify database (post-OAuth)");
    const userId = await ensureAuthUser(email, password, supabaseUrl, anonKey);
    await verifyDatabase(
      supabaseUrl,
      serviceRoleKey,
      gitlabBaseUrl,
      repoFullNameFromUrl(repoUrl, gitlabBaseUrl),
      userId,
      sessionSlug,
    );
    console.log("\n✅ GitLab OAuth verify passed\n");
    return;
  }

  console.log("\n2. Authenticate smoke user");
  const userId = await ensureAuthUser(email, password, supabaseUrl, anonKey);
  assert(userId.length > 0, `Signed in as ${email}`);

  console.log("\n3. OAuth start route (requires dev server)");
  const cookieHeader = await signInViaApp(appUrl, email, password);
  const authorizeUrl = await fetchOAuthStartUrl(appUrl, cookieHeader, gitlabBaseUrl, repoUrl, sessionSlug);
  validateAuthorizeUrl(authorizeUrl, gitlabBaseUrl, clientId);

  console.log("\n4. Manual step — complete OAuth in browser");
  console.log("   Open this URL while logged into GitLab with access to the repo:\n");
  console.log(`   ${authorizeUrl}\n`);
  console.log(`   Expected: redirect to /session/${sessionSlug}?repoLinked=1`);
  console.log("   Then run:  npx tsx scripts/gitlab-oauth-smoke.ts --verify\n");
  console.log("✅ GitLab OAuth preflight passed\n");
}

const verifyOnly = process.argv.includes("--verify");
runPreflight(loadEnvFiles(), verifyOnly).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n❌ GitLab OAuth smoke failed: ${message}\n`);
  process.exit(1);
});
