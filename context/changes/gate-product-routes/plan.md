# F-01 Session Data Schema + Gate Product Routes — Implementation Plan

## Overview

Implement roadmap **F-01** (`session-data-schema`): persist the single shared planning room, tasks, votes, and reveal state in Supabase so downstream slices (F-02 sync, S-01 poker) have a domain foundation. Also gate the future planning-session product route (`/session`) in middleware per `AGENTS.md`, with a minimal authenticated stub page — no voting UI in this change.

**Roadmap refs:** F-01 · **PRD refs:** FR-003, FR-004, FR-010, FR-011 · **Change folder:** `gate-product-routes` (maps to roadmap Change ID `session-data-schema`)

## Current State Analysis

- **Auth present:** Supabase Auth + middleware protect `/dashboard` only (`src/middleware.ts:4-23`). Google SSO and email/password work via `src/pages/api/auth/*`.
- **No domain schema:** `supabase/config.toml` exists; **no** `supabase/migrations/` directory. Roadmap baseline confirms auth-only Supabase usage (`context/foundation/roadmap.md` §Baseline).
- **No session/vote API or pages:** Only auth routes and placeholder dashboard (`src/pages/dashboard.astro`).
- **Server-side Supabase rule:** All sensitive reads/writes must stay in Astro frontmatter or `src/pages/api/*` (`AGENTS.md`).
- **Testing:** Vitest configured (`vitest.config.ts`); coverage must print to stdout per `context/foundation/lessons.md`.

## Desired End State

After this change:

1. Supabase has migrations defining `planning_sessions`, `profiles`, `tasks`, and `votes` with RLS enforcing blind voting semantics at the persistence layer.
2. A seed ensures exactly one default planning session row exists (single-room MVP).
3. Server-side TypeScript modules under `src/lib/session/` expose typed create/read helpers for tasks and votes (no client-side domain queries).
4. `/session` is listed in `PROTECTED_ROUTES`; unauthenticated users redirect to sign-in; authenticated users see a stub planning-session page (not full poker UI).
5. Unit tests cover story-point validation and any pure helpers; lint and coverage pass in CI.

**Verify:** `supabase db reset` applies cleanly locally; `npm run lint && npm run test:coverage && npm run build` pass; manual sign-in → `/session` loads; querying votes for an unrevealed task via anon/authenticated client does not expose other users' story points.

### Key Discoveries

- `src/middleware.ts:4` — only `/dashboard` is protected today; product session route must be added before S-01 ships UI there.
- `src/lib/supabase.ts` — SSR client factory already wired to Astro env schema; repositories should accept the server client, not instantiate credentials in components.
- PRD FR-010 + NFR — blind voting is load-bearing; schema must not leak `story_points` for other users before `tasks.status = 'revealed'`.
- F-02 (live sync) depends on this schema; keep column names stable for Realtime channel subscriptions later.

## What We're NOT Doing

- Live Realtime subscriptions (F-02 / `live-session-sync`)
- Planning-poker UI, vote buttons, reveal button (S-01 / `blind-planning-poker`)
- REST/API routes for tasks and votes (S-01); this change only schema + server lib primitives
- Sprinter Draft, Coach, Analyst tables (future slices)
- Session history browsing UI (PRD non-goal)
- Multi-room support (PRD single-room trade-off)
- GitHub/GitLab repo linking columns (S-04; defer unless trivial nullable columns — **out of scope** for F-01)

## Implementation Approach

Use Supabase SQL migrations as the source of truth. Model the PRD single room as one `planning_sessions` row (`slug = 'default'`). Tasks carry lifecycle status (`draft` → `voting` → `revealed`). Votes are one row per `(task_id, user_id)` with Fibonacci story points. Enforce blind voting via RLS policies plus a `vote_participation` view that omits other users' `story_points` until reveal. Add `profiles.display_name` for vote labels (emails stay out of session UI). Server repositories wrap Supabase calls for use in later API/page work. Gate `/session` in middleware with a stub page so the route contract exists before S-01.

## Critical Implementation Details

**Blind voting RLS ordering:** Apply RLS on `votes` before exposing any client-side Realtime in F-02. Policy pattern: users may always read their own vote row; may read others' `story_points` only when parent task `status = 'revealed'`; `vote_participation` view exposes `(task_id, user_id, display_name, voted_at)` without story points for unrevealed tasks so F-02 can subscribe to "who voted" safely.

**Single-room seed:** Migration seed inserts one `planning_sessions` row. Application code treats missing row as fatal misconfiguration (don't auto-create rooms at runtime — avoids multi-room drift).

## Phase 1: Supabase domain schema migration

### Overview

Create initial migration with enums, tables, indexes, RLS policies, blind-vote view, and default session seed.

### Changes Required:

#### 1. Core migration

**File**: `supabase/migrations/<timestamp>_session_data_schema.sql`

**Intent**: Define the persistence model for the single planning room, tasks, human votes, and user display names. Enforce Fibonacci story points and blind voting invariants at the database layer.

**Contract**:

- Enum `task_status`: `draft`, `voting`, `revealed`
- Table `planning_sessions`: `id uuid PK`, `slug text UNIQUE NOT NULL`, `created_at timestamptz`, seed one row `slug = 'default'`
- Table `profiles`: `user_id uuid PK REFERENCES auth.users`, `display_name text NOT NULL`, `created_at`, `updated_at`; RLS: users read all profiles in session context, update own row only
- Table `tasks`: `id uuid PK`, `session_id uuid FK → planning_sessions`, `title text NOT NULL`, `description text`, `created_by uuid FK → auth.users`, `status task_status NOT NULL DEFAULT 'draft'`, `revealed_at timestamptz`, timestamps; index `(session_id, created_at DESC)`
- Table `votes`: `id uuid PK`, `task_id uuid FK → tasks ON DELETE CASCADE`, `user_id uuid FK → auth.users`, `story_points smallint NOT NULL`, `voted_at timestamptz`, `UNIQUE (task_id, user_id)`; CHECK `story_points IN (1,2,3,5,8,13,21)` (Fibonacci MVP scale)
- View `vote_participation`: exposes `task_id`, `user_id`, `display_name`, `voted_at`; includes `story_points` only when `tasks.status = 'revealed'` OR `votes.user_id = auth.uid()`
- RLS enabled on all tables; authenticated users can CRUD own profile; authenticated users can insert tasks and votes in default session; vote SELECT follows blind rules above; task UPDATE for `status`/`revealed_at` allowed for task creator (facilitator pattern)
- Trigger or note in migration README comment: on auth signup, app should upsert profile — stub handled in Phase 2 helper

#### 2. Local verification script note

**File**: `README.md` (only if missing Supabase migration instructions — add a short subsection)

**Intent**: Document how developers apply migrations locally (`supabase db reset` or `supabase migration up`).

**Contract**: One subsection under existing Supabase setup; no secrets committed.

### Success Criteria:

#### Automated Verification:

- Migration file exists under `supabase/migrations/`
- `supabase db reset` exits 0 against local Supabase (when Docker/Supabase CLI available)
- SQL applies without error: enums, tables, RLS, view, seed row present

#### Manual Verification:

- In Supabase Studio / `psql`, confirm `planning_sessions` has exactly one `default` row
- Confirm RLS: two test users — user A cannot SELECT user B's `story_points` on unrevealed task via direct table query
- Confirm `vote_participation` returns names without points for unrevealed peer votes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Server-side domain types and repository modules

### Overview

Add typed server-only helpers for profiles, tasks, and votes consumed by later API routes and pages. Include unit tests for validation helpers.

### Changes Required:

#### 1. Story-point and task status constants

**File**: `src/lib/session/constants.ts`

**Intent**: Centralize Fibonacci allowed values and task status union aligned with DB enum.

**Contract**: Export `FIBONACCI_STORY_POINTS` readonly array and `TaskStatus` type; export `isValidStoryPoint(n: number): boolean`.

#### 2. Profile helper

**File**: `src/lib/session/profile.ts`

**Intent**: Upsert/read display name for authenticated user (supports vote labels without exposing email).

**Contract**: `ensureProfile(supabase, userId, displayName?)` upserts `profiles`; `getDisplayName(supabase, userId)` returns string.

#### 3. Task repository

**File**: `src/lib/session/tasks.ts`

**Intent**: Server-side create/read for tasks in the default session.

**Contract**: `getDefaultSessionId(supabase)`, `createTask(supabase, { title, description?, createdBy })`, `getTask(supabase, taskId)`, `startVoting(supabase, taskId, actorId)` sets status `voting`, `revealTask(supabase, taskId, actorId)` sets status `revealed` + `revealed_at`.

#### 4. Vote repository

**File**: `src/lib/session/votes.ts`

**Intent**: Server-side cast/read votes respecting blind semantics via view/table policies.

**Contract**: `castVote(supabase, { taskId, userId, storyPoints })` validates Fibonacci; `listParticipation(supabase, taskId)` uses `vote_participation` view; `listRevealedVotes(supabase, taskId)` for post-reveal human average input.

#### 5. Barrel export

**File**: `src/lib/session/index.ts`

**Intent**: Single import path for downstream S-01 work.

**Contract**: Re-export public functions from session modules.

#### 6. Unit tests

**File**: `src/lib/session/constants.test.ts` (and tests for pure validators if split)

**Intent**: Lock Fibonacci validation behavior per PRD non-goals.

**Contract**: Tests for valid/invalid story points; `npm run test:coverage` prints coverage table.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with Statements/Branches/Functions/Lines % printed to stdout
- `npm run build` passes (astro sync + build)

#### Manual Verification:

- Quick smoke in `astro dev`: import repositories from a temporary server route or Astro frontmatter REPL-style call against local Supabase — create task, cast two votes, reveal, confirm participation view behavior (optional dev-only script; remove before merge if added)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Gate product routes

### Overview

Register the planning session product route in middleware and ship a minimal authenticated stub page linked from dashboard.

### Changes Required:

#### 1. Middleware protected routes

**File**: `src/middleware.ts`

**Intent**: Require authentication for the planning session product surface before S-01 adds real UI.

**Contract**: Add `"/session"` to `PROTECTED_ROUTES` array (`src/middleware.ts:4`).

#### 2. Session stub page

**File**: `src/pages/session.astro`

**Intent**: Authenticated placeholder for the shared planning room; proves route gating and gives S-01 a mount point.

**Contract**: Uses `Layout`; shows heading "Planning session", copy that poker UI ships in a later slice, link back to dashboard; reads `Astro.locals.user` only — no domain data yet.

#### 3. Dashboard entry link

**File**: `src/pages/dashboard.astro`

**Intent**: Give authenticated users a navigation path to the gated product route.

**Contract**: Add link `href="/session"` with accessible label (e.g. "Join planning session").

#### 4. Middleware test (optional but recommended)

**File**: `src/middleware.test.ts` or extend existing test patterns

**Intent**: Regression guard that `/session` is treated as protected.

**Contract**: Unit test asserting `PROTECTED_ROUTES` includes `"/session"` or middleware redirect behavior mocked — keep minimal.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes
- `npm run build` passes

#### Manual Verification:

- Logged out: visiting `/session` redirects to `/auth/signin`
- Logged in: `/session` renders stub; dashboard link works
- `/support` remains public

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Fibonacci story-point validator (`constants.test.ts`)
- Any pure mapping helpers for task status transitions

### Integration Tests:

- Deferred to S-01 when API routes exist; Phase 1 manual RLS verification covers blind voting at DB layer

### Manual Testing Steps:

1. `supabase db reset` → verify schema + seed
2. Two browser profiles / incognito: auth as two users, verify RLS via Supabase SQL or temporary server script
3. Auth flow: `/session` gated, stub visible when logged in
4. CI parity: `npm run lint && npm run test:coverage && npm run build`

## Performance Considerations

Small-team MVP (~10 users); no special indexing beyond `(session_id, created_at)` and vote uniqueness. Realtime load lands in F-02.

## Migration Notes

- First migration in repo — document in PR that deploy requires `supabase db push` or linked project migration apply before S-01.
- Existing auth users need `profiles` row — `ensureProfile` called on first session visit or auth callback (implement in Phase 2; wire in S-01 if not hooked in this change's stub page frontmatter).

## References

- Roadmap F-01: `context/foundation/roadmap.md` (§Foundations → F-01)
- PRD: `context/foundation/prd.md` (FR-003, FR-004, FR-010, FR-011)
- Middleware: `src/middleware.ts:4-23`
- Supabase client: `src/lib/supabase.ts`
- Lessons: `context/foundation/lessons.md` (coverage stdout)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Supabase domain schema migration

#### Automated

- [x] 1.1 Migration file exists under `supabase/migrations/`
- [x] 1.2 `supabase db reset` exits 0 against local Supabase
- [x] 1.3 SQL applies without error: enums, tables, RLS, view, seed row present

#### Manual

- [x] 1.4 Confirm `planning_sessions` has exactly one `default` row
- [x] 1.5 Confirm RLS blocks cross-user story_points before reveal
- [x] 1.6 Confirm `vote_participation` omits peer story_points before reveal

### Phase 2: Server-side domain types and repository modules

#### Automated

- [x] 2.1 `npm run lint` passes
- [x] 2.2 `npm run test:coverage` passes with coverage table printed to stdout
- [x] 2.3 `npm run build` passes

#### Manual

- [x] 2.4 Optional local smoke: create task, cast votes, reveal via repository helpers against local Supabase

### Phase 3: Gate product routes

#### Automated

- [x] 3.1 `npm run lint` passes
- [x] 3.2 `npm run test:coverage` passes
- [x] 3.3 `npm run build` passes

#### Manual

- [x] 3.4 Logged out visit to `/session` redirects to sign-in
- [x] 3.5 Logged in visit to `/session` renders stub page
- [x] 3.6 Dashboard link to `/session` works; `/support` stays public
