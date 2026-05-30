# S-04 Sprinter Analyst Reference Vote — Implementation Plan

## Overview

Implement roadmap **S-04** (`sprinter-analyst-vote`): optional repo-linked **Sprinter Analyst** reference story-point vote after reveal, excluded from the human average (US-04, FR-017–FR-023).

Facilitators maintain a **personal repo library** (GitHub or GitLab, public or OAuth private), pick an **active repo** for the planning session, optionally add **affected paths** on tasks, and trigger **sealed async analysis** when voting starts. After reveal, all participants see a separate Analyst reference card.

**Roadmap refs:** S-04 · **PRD refs:** US-04, FR-004, FR-017–FR-023 · **Prerequisites:** S-01, F-01, F-03 (done)

## Current State Analysis

- **Session UX:** `SessionRoom.tsx` handles create task (title + description), voting, reveal, human average — no repo or Analyst UI.
- **Schema:** `tasks` has no `affected_paths`; no repo or analyst tables (`20260527120000_session_data_schema.sql`).
- **Start voting:** `POST /api/session/tasks/[taskId]/start-voting` calls `startVoting()` only — no side effects.
- **Session state:** `GET /api/session/state` returns task, participation, human average — no Analyst payload.
- **AI stack:** F-03 OpenRouter JSON pattern in `src/lib/ai/generate-coach.ts`, `generate-draft.ts`; Coach/Draft POST handlers use `requireSessionAuth`.
- **Auth:** Supabase email/password + Google SSO; no GitHub/GitLab repo OAuth.
- **Env:** `astro.config.mjs` has `SUPABASE_*`, `OPENROUTER_API_KEY` — no GitHub/GitLab OAuth client fields.
- **Deferred intentionally in F-01:** repo linking columns (see `context/archive/2026-05-27-gate-product-routes/plan.md`).

### Key Discoveries

- `src/lib/session/tasks.ts:93-109` — `revealTask()` is the reveal seam; Analyst must **not** block this.
- `src/lib/session/votes.ts` + `vote_participation` view — blind RLS pattern to mirror for `analyst_votes`.
- `src/pages/api/session/tasks/[taskId]/start-voting.ts` — hook point for async Analyst via Cloudflare `waitUntil`.
- `src/lib/ai/config.ts` — extend env pattern for OAuth credentials alongside OpenRouter.
- Single room: `planning_sessions.slug = 'default'` — session active repo is one row keyed by `session_id`.

## Desired End State

1. Facilitator clicks **Link repository** (modal), adds repo to library (public URL verify or OAuth for private), sets active session repo.
2. Create-task form includes optional **Affected paths** (multiline, one path/glob per line).
3. On **Start voting**, server inserts `analyst_votes` row (`status: pending`) and runs background analysis when session has active repo.
4. Analysis uses cached tree metadata + capped file fetch (~50 files / ~1MB), OpenRouter JSON → Fibonacci point + rationale, updates `analyst_votes` to `ready` or `failed`.
5. On **Reveal**, human flow unchanged; `/api/session/state` includes Analyst payload only when `task.status === 'revealed'` and `analyst_votes.status === 'ready'`.
6. UI shows **Sprinter Analyst (reference)** card below human average — never in participation list, never in average.
7. OAuth tokens and Analyst points remain server-side / sealed until reveal.

**Verify:** Link private GitHub repo → create task with path hints → vote → reveal → see human average + Analyst card; second session same repo skips re-OAuth; repo failure still reveals human votes.

## What We're NOT Doing

- Sprinter Coach UI (S-03)
- Local filesystem / monorepo path reads (FR-023)
- PAT-based private repo auth (roadmap rejected)
- Full-repo clone or Supabase Storage blob snapshots
- Analyst vote in human average or participation list
- Analyst output during blind voting
- Deterministic fallback Analyst vote on AI failure (omit instead)
- Session history UI, multi-room, retro
- Popup OAuth / postMessage token flow
- Per-facilitator OAuth app credentials

## Implementation Approach

Add Supabase migrations for repo library, session link, tree cache, and analyst votes. Introduce `src/lib/repo/*` for provider adapters (GitHub REST, GitLab REST with dynamic base URL), OAuth state handling, and tree/file fetch with caps. Introduce `src/lib/ai/generate-analyst.ts` following Coach JSON pattern. Use **service-role** Supabase client (new env field) for token reads and Analyst writes in API/background jobs. Extend session APIs and `SessionRoom` with modal + reference card. Trigger Analyst in `start-voting` using Cloudflare `context.locals.runtime.ctx.waitUntil()` so voting response is not blocked.

## Critical Implementation Details

**Background analysis on Workers:** In `start-voting.ts`, after a successful `startVoting()`, schedule `runAnalystForTask(...)` via `context.locals.runtime?.ctx?.waitUntil?.(...)`. If `waitUntil` is unavailable (local dev), await analysis inline only when `import.meta.env.DEV` — document that production relies on background execution.

**Token isolation:** Browser Supabase client must never `SELECT` token columns. Expose facilitator library to UI through API routes returning redacted DTOs. Token reads use `createServiceRoleClient()` with new `SUPABASE_SERVICE_ROLE_KEY` in Astro env schema.

**Analyst visibility:** Do not subscribe Analyst data via Realtime before reveal. Extend `GET /api/session/state` to attach analyst fields only when task is revealed — mirrors existing blind vote enforcement.

## Phase 1: Schema & RLS

### Overview

Persist repo library, session active link, tree cache, analyst votes, and task path hints with policies that preserve blind voting and token secrecy.

### Changes Required:

#### 1. Migration — repo & analyst tables

**File**: `supabase/migrations/20260530100000_sprinter_analyst_schema.sql`

**Intent**: Add domain tables for S-04 with enums, indexes, and RLS.

**Contract**:

- `CREATE TYPE repo_provider AS ENUM ('github', 'gitlab')`
- `CREATE TYPE repo_access_mode AS ENUM ('public', 'private')`
- `CREATE TYPE analyst_vote_status AS ENUM ('pending', 'ready', 'failed', 'skipped')`
- `facilitator_repo_connections`: `id`, `user_id`, `provider`, `repo_url`, `repo_full_name`, `default_branch`, `access_mode`, `gitlab_base_url` (nullable), `created_at`, `updated_at`; unique on `(user_id, provider, repo_full_name, coalesce(gitlab_base_url,''))`
- `repo_oauth_tokens`: `connection_id` PK/FK, `access_token`, `refresh_token`, `expires_at`, `updated_at` — **no GRANT to `authenticated`**
- `session_repo_links`: `session_id` PK/FK `planning_sessions`, `connection_id` FK, `linked_by` FK `auth.users`, `linked_at`
- `repo_tree_cache`: `connection_id` PK/FK, `tree_json jsonb`, `fetched_at`
- `analyst_votes`: `task_id` PK/FK `tasks`, `story_points smallint` (Fibonacci check), `rationale text`, `status analyst_vote_status`, `computed_at`, `error_code text` (server-only); RLS SELECT only when parent task `status = 'revealed'`
- `ALTER TABLE tasks ADD COLUMN affected_paths text`
- RLS: `facilitator_repo_connections` — CRUD where `auth.uid() = user_id`; `session_repo_links` — SELECT authenticated; INSERT/UPDATE/DELETE where `auth.uid() = linked_by`; `repo_tree_cache` — no direct authenticated access (service role only); `analyst_votes` — SELECT when task revealed (join `tasks`)

#### 2. TypeScript domain types

**File**: `src/lib/repo/types.ts`

**Intent**: Typed DTOs for connections, session link, tree cache, analyst vote — **no token fields** in client-safe types.

**Contract**: Export `RepoProvider`, `RepoAccessMode`, `FacilitatorRepoConnection`, `SessionRepoLink`, `AnalystVote`, `AnalystVotePublic` (story_points, rationale, status for revealed tasks only).

**File**: `src/lib/session/types.ts`

**Intent**: Extend `Task` with optional `affected_paths: string | null`.

**Contract**: Add field to `Task` interface; update any task mappers.

#### 3. Service role client

**File**: `src/lib/supabase-service.ts`

**Intent**: Server-only Supabase client for token reads and Analyst background writes.

**Contract**: Export `createServiceRoleClient(): SupabaseClient | null` using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `astro:env/server`. Return `null` when unset (Analyst skips with logged warning).

**File**: `astro.config.mjs`

**Intent**: Register new secrets in Astro env schema.

**Contract**: Add optional server secrets: `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URL` (or derive from request origin in dev — document production absolute URL requirement).

#### 4. Unit tests — path hints parser

**File**: `src/lib/repo/path-hints.test.ts`

**Intent**: Lock parsing for multiline affected paths.

**Contract**: Export `parseAffectedPaths(raw: string | null | undefined): string[]` from `src/lib/repo/path-hints.ts` — split on newlines, trim, drop empty, max 20 lines.

### Success Criteria:

#### Automated Verification:

- Migration applies cleanly: `supabase db push` (or CI migration step when present)
- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout

#### Manual Verification:

- Inspect migration SQL: `repo_oauth_tokens` has no policy granting `authenticated` SELECT
- Confirm `analyst_votes` SELECT policy requires parent task `revealed`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: OAuth & repo providers

### Overview

Wire GitHub/GitLab OAuth (gitlab.com + self-hosted base URL), public repo verification, and provider REST adapters.

### Changes Required:

#### 1. OAuth state & URL helpers

**File**: `src/lib/repo/oauth-state.ts`

**Intent**: Signed/time-limited OAuth `state` payload (user id, connection draft id, provider, gitlab base URL, return path).

**Contract**: Export `createOAuthState(...)`, `parseOAuthState(state: string)` using HMAC with server secret (`GITHUB_CLIENT_SECRET` or dedicated `REPO_OAUTH_STATE_SECRET` in env). Reject expired/malformed state.

#### 2. GitHub provider

**File**: `src/lib/repo/providers/github.ts`

**Intent**: GitHub REST helpers: parse repo URL, verify public access, exchange OAuth code, refresh token, list tree (recursive/single level strategy), fetch blob contents.

**Contract**: Export functions accepting optional token; normalize `owner/repo` from HTTPS GitHub URL; tree listing returns `{ path, sha, size, type }[]`.

#### 3. GitLab provider

**File**: `src/lib/repo/providers/gitlab.ts`

**Intent**: GitLab REST with dynamic `baseUrl` (default `https://gitlab.com`).

**Contract**: Validate HTTPS hostname; OAuth authorize/token URLs use `baseUrl`; project id from URL path; tree/list repository files API.

#### 4. OAuth start routes

**File**: `src/pages/api/repo/oauth/github/start.ts`

**File**: `src/pages/api/repo/oauth/gitlab/start.ts`

**Intent**: Authenticated GET redirects to provider authorize URL.

**Contract**: Query params: `connectionId?`, `repoUrl`, `accessMode`, `gitlabBaseUrl?`. Persist draft connection row if needed. Redirect to provider.

#### 5. OAuth callback routes

**File**: `src/pages/api/repo/oauth/github/callback.ts`

**File**: `src/pages/api/repo/oauth/gitlab/callback.ts`

**Intent**: Exchange code, store tokens via service role, verify repo access, upsert `facilitator_repo_connections` + `repo_oauth_tokens`, redirect back to `/session?repoLinked=1`.

**Contract**: Validate `state`; on error redirect with `?repoError=` message. Never return tokens in JSON to browser.

#### 6. Public repo link API

**File**: `src/pages/api/repo/link.ts`

**Intent**: POST to add/update library entry and set session active link without OAuth when `accessMode: public`.

**Contract**: Body: `{ provider, repoUrl, accessMode, gitlabBaseUrl? }`. Verify reachable via provider API without token. Upsert connection; upsert `session_repo_links` for default session; `linked_by = auth.user.id`. DELETE disconnects session link (and optionally library entry per body flag).

#### 7. Provider unit tests

**File**: `src/lib/repo/providers/github.test.ts`

**File**: `src/lib/repo/providers/gitlab.test.ts`

**Intent**: Mock `fetch` for URL parsing, public verify, tree normalization.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` succeeds (env optional fields allow missing OAuth secrets at build time)

#### Manual Verification:

- Register GitHub OAuth app; complete OAuth flow in dev; connection row created without token in API JSON responses
- Public repo link succeeds without OAuth
- Self-hosted GitLab base URL stored and used in provider client (smoke with mock or staging instance if available)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Cache & Analyst engine

### Overview

Implement tree cache refresh, capped file selection/fetch, OpenRouter Analyst generation, and background trigger on start-voting.

### Changes Required:

#### 1. Tree cache service

**File**: `src/lib/repo/tree-cache.ts`

**Intent**: Get-or-fetch tree metadata per `connection_id`; refresh if older than 24h.

**Contract**: Export `getOrRefreshTreeCache(serviceClient, connectionId): Promise<TreeEntry[]>`. Uses service role + tokens. Store in `repo_tree_cache.tree_json`.

#### 2. File selection & fetch

**File**: `src/lib/repo/select-files.ts`

**Intent**: Choose files for analysis from tree + task title/description + parsed path hints.

**Contract**: Export `selectFilesForTask(tree, task): string[]` — hint paths/globs first, then keyword match on path segments from title tokens; cap count 50.

**File**: `src/lib/repo/fetch-files.ts`

**Intent**: Fetch file contents with aggregate byte cap 1MB.

**Contract**: Export `fetchFileContents(provider, connection, paths, limits): Promise<{ path, content }[]>`; stop when cap reached.

#### 3. Analyst AI generator

**File**: `src/lib/ai/types.ts`

**Intent**: Add Analyst input/result types.

**Contract**: `AnalystInput`, `AnalystResult`, `OpenRouterAnalystResponse` with `storyPoints` + `rationale`; `storyPoints` must be valid Fibonacci enum.

**File**: `src/lib/ai/generate-analyst.ts`

**File**: `src/lib/ai/generate-analyst.test.ts`

**Intent**: OpenRouter JSON prompt over task + file snippets; validate/normalize response; return null on invalid (caller marks failed).

**Contract**: System prompt: reference-only estimate, same Fibonacci scale, JSON only, no revealing human votes. User payload: task fields + truncated file contents.

**File**: `src/lib/ai/index.ts`

**Intent**: Re-export `generateAnalystVote`.

#### 4. Analyst runner

**File**: `src/lib/repo/run-analyst.ts`

**Intent**: Orchestrate full Analyst job for a task.

**Contract**: Export `runAnalystForTask({ taskId, sessionId, serviceClient })`:

1. Load task, session active link, connection, tokens
2. If no link → insert/update `analyst_votes` `skipped`
3. Refresh tree cache
4. Select + fetch files
5. Call `generateAnalystVote`
6. Upsert `analyst_votes` `ready` or `failed` (store `error_code` server-side only)
7. Never throw — log errors

#### 5. Start-voting hook

**File**: `src/pages/api/session/tasks/[taskId]/start-voting.ts`

**Intent**: Schedule Analyst after successful voting start.

**Contract**: After `startVoting` success, call `waitUntil(runAnalystForTask(...))` when runtime ctx available; insert `analyst_votes` pending row synchronously before scheduling.

#### 6. Task create/update — affected paths

**File**: `src/lib/session/tasks.ts`

**File**: `src/pages/api/session/tasks.ts`

**Intent**: Accept optional `affectedPaths` multiline string on create; persist to `tasks.affected_paths`.

**Contract**: Extend `createTask` params + POST body validation (max length e.g. 2000 chars).

### Success Criteria:

#### Automated Verification:

- `npm run test:coverage` passes — includes `select-files`, `path-hints`, `generate-analyst` tests
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Start voting on task with linked repo → `analyst_votes` row moves pending → ready (or failed) in DB without blocking HTTP response
- Task without repo link → `skipped` analyst row
- File cap enforced: large repo + broad hints does not exceed 50 files / 1MB in logs or test fixture

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Repo & session APIs

### Overview

Expose facilitator library + session link status to UI; include Analyst payload in session state after reveal.

### Changes Required:

#### 1. Repo library list API

**File**: `src/pages/api/repo/connections.ts`

**Intent**: GET current user's library + which connection is active on default session.

**Contract**: Response: `{ connections: FacilitatorRepoConnection[], activeConnectionId: string | null }` — redacted, no tokens.

#### 2. Session repo status API

**File**: `src/pages/api/repo/session.ts`

**Intent**: GET active session repo summary for modal header badge.

**Contract**: `{ linked: boolean, connection?: { provider, repoFullName, accessMode, linkedByDisplayName } }`

#### 3. Extend session state

**File**: `src/lib/session/analyst.ts`

**Intent**: Load public Analyst fields for revealed tasks.

**Contract**: Export `getAnalystVoteForTask(supabase, taskId, taskStatus): Promise<AnalystVotePublic | null>` — returns null unless revealed AND status ready.

**File**: `src/pages/api/session/state.ts`

**Intent**: Add `analyst` field to JSON when appropriate.

**Contract**: Response adds `analyst: { storyPoints, rationale, label: 'Sprinter Analyst' } | null` — never include pending/failed details to clients.

#### 4. Human average guard

**File**: `src/lib/session/votes.ts` (or existing average helper)

**Intent**: Ensure average helpers never accept analyst points (regression guard).

**Contract**: Document in code comment; unit test that analyst points are not passed to `computeHumanAverage`.

**File**: `src/lib/session/votes.test.ts` (extend or create)

### Success Criteria:

#### Automated Verification:

- API validation tests for `/api/repo/link`, `/api/session/state` analyst gating
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run lint` passes

#### Manual Verification:

- `GET /api/session/state` before reveal: no analyst fields
- After reveal with ready analyst: analyst object present
- After reveal with failed analyst: `analyst: null`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Session UI & integration tests

### Overview

Repo link modal, affected paths on create form, Analyst reference card, SessionRoom wiring, README/deploy notes.

### Changes Required:

#### 1. Repo link modal

**File**: `src/components/session/RepoLinkModal.tsx`

**Intent**: Modal UI for library list, add repo (public/private toggle, GitLab base URL field when GitLab), OAuth connect buttons, set active/disconnect.

**Contract**: Props: `open`, `onClose`, `onLinked`. Calls `/api/repo/connections`, `/api/repo/link`, navigates to OAuth start URLs for private. Show facilitator-only management for connections user owns.

#### 2. SessionRoom — link entrypoint

**File**: `src/components/session/SessionRoom.tsx`

**Intent**: **Link repository** button in planning room header opens modal; show small badge when session has active repo (provider + name).

**Contract**: State for modal open; fetch session repo status on mount; do not block poker flows.

#### 3. Affected paths field

**File**: `src/components/session/SessionRoom.tsx`

**Intent**: Optional multiline **Affected paths** on create-task form.

**Contract**: Wire to `createTask` POST `{ affectedPaths }`; helper text: one path or glob per line.

#### 4. Analyst reference card

**File**: `src/components/session/AnalystReferenceCard.tsx`

**Intent**: Distinct card shown when `task.status === 'revealed'` and state includes analyst payload.

**Contract**: Heading **Sprinter Analyst (reference)**; story point + rationale; visual style distinct from human average (e.g. cyan/teal border vs purple average).

**File**: `src/components/session/SessionRoom.tsx`

**Intent**: Render card below human average block; extend `SessionStateResponse` type.

#### 5. Repo client helpers

**File**: `src/lib/session/repo-client.ts`

**File**: `src/lib/session/repo-client.test.ts`

**Intent**: Thin fetch wrappers for repo APIs (mirrors `draft-client.ts` pattern).

#### 6. Documentation

**File**: `README.md` (or deployment doc linked from README)

**Intent**: Document OAuth app setup (GitHub + GitLab), callback URLs, new env vars, `SUPABASE_SERVICE_ROLE_KEY` requirement.

**Contract**: Table of env vars; note self-hosted GitLab OAuth app must be registered on that instance.

#### 7. Protected routes

**File**: `src/lib/protected-routes.ts`

**Intent**: Only if any new **page** routes added — OAuth callbacks are API routes (no change expected). `/session` already protected.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` passes

#### Manual Verification:

- End-to-end: link repo → create task with paths → vote → reveal → Analyst card visible to second browser/user
- Human average unchanged when Analyst present
- Disconnect repo → subsequent tasks skip Analyst
- Modal: public repo without OAuth; private triggers OAuth redirect and return
- No tokens in browser network responses or Supabase client queries

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests

- `parseAffectedPaths` — empty, whitespace, max lines
- GitHub/GitLab URL parsing and normalize
- `selectFilesForTask` — hints priority, cap 50
- `generateAnalystVote` normalizer — valid/invalid Fibonacci, missing rationale
- `computeHumanAverage` — excludes non-human inputs
- Repo client fetch error handling

### Integration Tests

- `/api/repo/link` validation (bad URL, missing provider)
- Session state analyst gating (mock supabase or test doubles as repo patterns allow)
- OAuth state round-trip sign/verify

### Manual Testing Steps

1. Link public GitHub repo → create task → start voting → reveal → Analyst card or graceful absence
2. Link private repo via OAuth → verify token not in browser network tab JSON
3. Re-link same repo in new session → no re-OAuth prompt (library reuse)
4. GitLab self-hosted base URL smoke (if instance available)
5. Start voting + immediate reveal → human votes show; Analyst appears only if job finished (refresh/refetch)
6. Revoke repo access mid-session → next analysis fails; reveal still works

## Performance Considerations

- Tree cache TTL 24h reduces repeated provider API calls for standing teams.
- File fetch caps (50 / 1MB) bound Worker CPU and OpenRouter payload size.
- Analyst runs in `waitUntil` — start-voting response stays fast.
- OpenRouter timeout aligned with F-03 (`OPENROUTER_TIMEOUT_MS` ~8s); failure → `failed` status, omit UI.

## Migration Notes

- Apply `20260530100000_sprinter_analyst_schema.sql` before deploying API/UI changes.
- Add Cloudflare + GitHub Actions secrets: `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`.
- Register OAuth callback URLs: `https://<worker>/api/repo/oauth/github/callback`, `https://<worker>/api/repo/oauth/gitlab/callback`.
- Existing tasks/votes unaffected; `affected_paths` nullable.

## References

- PRD US-04, FR-004, FR-017–FR-023: `context/foundation/prd.md`
- Roadmap S-04 decisions: `context/foundation/roadmap.md`
- F-01 schema deferral: `context/archive/2026-05-27-gate-product-routes/plan.md`
- F-03 AI pattern: `src/lib/ai/generate-coach.ts`, `context/archive/2026-05-29-ai-provider-fallback/plan-brief.md`
- Draft UI pattern: `context/archive/2026-05-29-sprinter-draft-tasks/plan-brief.md`
- Session room: `src/components/session/SessionRoom.tsx`
- Start voting hook: `src/pages/api/session/tasks/[taskId]/start-voting.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Schema & RLS

#### Automated

- [x] 1.1 Migration applies cleanly: `supabase db push` (or CI migration step when present) — dfaab3b
- [x] 1.2 `npm run lint` passes — dfaab3b
- [x] 1.3 `npm run test:coverage` passes with coverage table printed to stdout — dfaab3b

#### Manual

- [x] 1.4 Inspect migration SQL: `repo_oauth_tokens` has no policy granting `authenticated` SELECT — dfaab3b
- [x] 1.5 Confirm `analyst_votes` SELECT policy requires parent task `revealed` — dfaab3b

### Phase 2: OAuth & repo providers

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npm run test:coverage` passes with coverage table printed to stdout
- [x] 2.3 `npm run build` succeeds

#### Manual

- [x] 2.4 Register GitHub OAuth app; complete OAuth flow in dev; connection row created without token in API JSON responses — manual 2026-05-30
- [x] 2.5 Public repo link succeeds without OAuth — manual 2026-05-30
- [x] 2.6 Self-hosted GitLab base URL stored and used in provider client — manual 2026-05-30
- [x] 2.7 Private self-hosted GitLab link via PAT (`accessToken` in POST body); token stored server-side only (`gitlab_pat = true`), not returned in API JSON — manual 2026-05-30

### Phase 3: Cache & Analyst engine

#### Automated

- [x] 3.1 `npm run test:coverage` passes — includes select-files, path-hints, generate-analyst tests
- [x] 3.2 `npm run lint` passes
- [x] 3.3 `npm run build` passes

#### Manual

- [x] 3.4 Start voting with linked repo → `analyst_votes` pending → ready/failed without blocking HTTP response — manual 2026-05-30
- [x] 3.5 Task without repo link → `analyst_votes` skipped — manual 2026-05-30
- [x] 3.6 File cap enforced (~50 files / ~1MB) — manual 2026-05-30

### Phase 4: Repo & session APIs

#### Automated

- [x] 4.1 API validation tests for `/api/repo/link` and session state analyst gating
- [x] 4.2 `npm run test:coverage` passes with coverage table printed to stdout
- [x] 4.3 `npm run lint` passes

#### Manual

- [x] 4.4 `GET /api/session/state` before reveal: no analyst fields — manual 2026-05-30
- [x] 4.5 After reveal with ready analyst: analyst object present — manual 2026-05-30
- [x] 4.6 After reveal with failed analyst: `analyst: null` — manual 2026-05-30

### Phase 5: Session UI & integration tests

#### Automated

- [x] 5.1 `npm run lint` passes
- [x] 5.2 `npm run test:coverage` passes with coverage table printed to stdout
- [x] 5.3 `npm run build` passes

#### Manual

- [x] 5.4 E2E: link repo → task with paths → vote → reveal → Analyst card for all participants — manual 2026-05-30
- [x] 5.5 Human average excludes Analyst; blind voting unchanged — manual 2026-05-30
- [x] 5.6 Modal public + private OAuth flows; no tokens in browser responses — manual 2026-05-30
