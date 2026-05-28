# S-01 Blind Planning-Poker Session — Implementation Plan

## Overview

Implement roadmap **S-01** (`blind-planning-poker`): the north-star vertical slice where authenticated users join the shared planning room, create a task, start voting, cast blind Fibonacci votes, reveal, and see sorted human votes plus the calculated human average. Builds on archived **F-01** (schema + repositories) and **F-02** (Realtime + masked read API + live panel).

**Roadmap refs:** S-01 · **PRD refs:** US-01, FR-001–FR-012 (human poker path; exclude Analyst/Draft/Coach) · **Prerequisites:** F-01, F-02 merged into working branch

**Change folder:** `s-01` (maps to roadmap Change ID `blind-planning-poker`)

## Current State Analysis

- **Branch `s01` today:** Based on pre-F-01 `master` — no `src/lib/session/`, no `/session`, no migrations. **Must merge/rebase onto `origin/m2l2`** (or `master` after F-02 PR merges) before Phase 2.
- **On `origin/m2l2` (target baseline):**
  - Migrations: `planning_sessions`, `profiles`, `tasks`, `votes`, RLS, `vote_participation` view
  - Repositories: `createTask`, `startVoting`, `revealTask`, `castVote`, `listParticipation`, `ensureProfile`, `getLatestActiveTask`
  - GET `/api/session/state` + `/api/session/participation` (masked reads)
  - `SessionLivePanel` — who-voted + Realtime refetch; **no mutation buttons**
  - `startVoting` / `revealTask` enforce `created_by === actorId` at DB update
- **Auth:** Email/password + Google; middleware protects routes via `PROTECTED_ROUTES`
- **Deferred from F-01/F-02:** Task create UI, vote/reveal buttons, mutation API routes, human average display

### Key Discoveries

- F-02 plan: Realtime payload is signal only; UI state from masked GET API (`context/archive/2026-05-27-live-session-sync/plan.md`)
- Fibonacci scale locked in `FIBONACCI_STORY_POINTS` (`src/lib/session/constants.ts` on m2l2)
- PRD NFR: ≤3s sync for who-voted and reveal — satisfied by existing F-02 Realtime + refetch pattern
- PRD FR-008: only task creator reveals — matches repository guards (planning poll "anyone reveal" **not** adopted)

## Desired End State

After this change:

1. User with missing/custom display name sets it via inline gate on `/session` (no emails shown to peers).
2. Any authenticated user can create a task (draft); **task creator** sees "Start voting" and later "Reveal".
3. Participants vote via Fibonacci button grid; may change vote before reveal (upsert).
4. All clients see who voted without peer points pre-reveal; after reveal, sorted votes + **human average (1 decimal)**.
5. Dashboard links to `/session`; logged-out `/session` redirects to sign-in; `/support` stays public.
6. `npm run lint`, `npm run test:coverage`, `npm run build` pass.

**Verify:** Two browsers, two users — full US-01 flow without Studio SQL; reveal average matches manual calculation.

## What We're NOT Doing

- Sprinter Draft, Coach, Analyst (S-02–S-04, F-03)
- Session history browsing UI (FR-011 live-session only)
- Multi-room / task picker beyond latest active task
- Mobile-specific layout
- Repo linking columns or Analyst average exclusion logic (no Analyst votes in S-01)
- Replacing Realtime with polling
- Changing RLS or schema (unless a minimal migration is required — unlikely)

## Implementation Approach

Merge F-01/F-02 foundation into `s01`, then add JSON POST mutation routes that call existing repositories server-side, a pure `computeHumanAverage` helper, extend GET state with average + sorted revealed participation, and replace the stub/`SessionLivePanel`-only UX with a unified **`SessionRoom`** React island that composes live sync (refactor F-02 panel internals into SessionRoom or embed as sub-section).

## Critical Implementation Details

**Creator-only facilitator actions:** `startVoting` and `revealTask` return no row when `actorId !== created_by`. API must map that to **403** with clear message; UI shows controls only when `userId === task.created_by`.

**Display-name gate:** Prompt when profile missing or still default `User ${userId.slice(0,8)}` from `ensureProfile`. Block poker actions until user submits a non-empty custom name via PATCH API.

**Average timing:** Compute server-side in GET state only when `task.status === 'revealed'` using human `story_points` from participation rows (all non-null post-reveal). Client never averages peer data from Realtime payloads.

## Phase 1: Merge foundation prerequisites

### Overview

Align branch `s01` with F-01 + F-02 codebase before writing S-01 features.

### Changes Required:

#### 1. Git integration

**File**: (branch operation — no app code)

**Intent**: Ensure `s01` contains migrations, session lib, F-02 Realtime, archives, and env docs from `origin/m2l2`.

**Contract**: Rebase or merge `origin/m2l2` into `s01` (or merge F-02 PR to `master` then rebase `s01` onto `master`). Resolve conflicts favoring foundation code. Confirm `context/archive/2026-05-27-*` present locally.

#### 2. Local env verification

**File**: `.dev.vars` (developer machine)

**Intent**: Browser Realtime and mutations work in dev.

**Contract**: `SUPABASE_URL`, `SUPABASE_KEY`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` set; `supabase start` + `supabase db reset` succeeds.

### Success Criteria:

#### Automated Verification:

- `supabase db reset` exits 0
- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- `/session` loads when logged in (F-02 live panel visible)
- `GET /api/session/state` returns 401 when logged out

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Mutation API and human average

### Overview

Expose server-side task/vote/profile mutations and extend read API with human average for revealed tasks.

### Changes Required:

#### 1. Human average helper

**File**: `src/lib/session/average.ts`

**Intent**: Pure function for FR-009 team average.

**Contract**: Export `computeHumanAverage(points: number[]): number | null` — arithmetic mean of integers, `null` for empty input; companion `formatHumanAverage(n: number): string` with **1 decimal place** (e.g. `5.5`). Unit tests in `src/lib/session/average.test.ts`.

#### 2. Sort helper for revealed list

**File**: `src/lib/session/participation.ts` (or extend `votes.ts`)

**Intent**: PRD sorted human vote list by points ascending.

**Contract**: Export `sortParticipationByPoints(rows: VoteParticipation[]): VoteParticipation[]` — stable sort on `story_points` ascending; nulls last.

#### 3. Task creation API

**File**: `src/pages/api/session/tasks.ts`

**Intent**: FR-004 create task.

**Contract**: `POST` JSON `{ title: string, description?: string }`; auth required; validate non-empty title; call `createTask`; return `{ task }` 201; 401/400/503 as appropriate.

#### 4. Start voting API

**File**: `src/pages/api/session/tasks/[taskId]/start-voting.ts` (or nested route per Astro conventions)

**Intent**: FR-005 start voting (creator only).

**Contract**: `POST`; auth required; call `startVoting` with `actorId = user.id`; 403 when not creator or no row updated; return `{ task }`.

#### 5. Vote API

**File**: `src/pages/api/session/vote.ts`

**Intent**: FR-006 cast/change vote.

**Contract**: `POST` JSON `{ taskId, storyPoints }`; validate Fibonacci via `isValidStoryPoint`; call `castVote`; 400 on invalid points; return `{ vote }`.

#### 6. Reveal API

**File**: `src/pages/api/session/reveal.ts`

**Intent**: FR-008 reveal (creator only).

**Contract**: `POST` JSON `{ taskId }`; call `revealTask`; 403 when not creator; return `{ task }`.

#### 7. Profile display name API

**File**: `src/pages/api/session/profile.ts`

**Intent**: Support session display-name gate.

**Contract**: `GET` returns `{ displayName }`; `PATCH` JSON `{ displayName }` trims/validates length (e.g. 1–64 chars), upserts profile; 401 unauthenticated.

#### 8. Extend session state GET

**File**: `src/pages/api/session/state.ts`

**Intent**: Bundle average + sorted participation for SessionRoom hydrate/refetch.

**Contract**: When `task.status === 'revealed'`, include `humanAverage: number | null` and `humanAverageFormatted: string`; sort participation by points ascending; pre-reveal participation unchanged (masked via view).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on new/edited files
- `npm run test:coverage` passes with coverage table printed (includes `average.test.ts`)
- `npm run build` passes

#### Manual Verification:

- `curl` POST create/start/vote/reveal with session cookie succeeds for creator flow
- Non-creator POST reveal returns 403
- GET state after reveal includes `humanAverageFormatted` matching manual mean

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: SessionRoom UI

### Overview

Unified planning-poker interface on `/session` with profile gate, task form, voting grid, facilitator controls, and F-02 live sync.

### Changes Required:

#### 1. SessionRoom component

**File**: `src/components/session/SessionRoom.tsx`

**Intent**: Single React island for US-01 UX (replaces standalone `SessionLivePanel` mount or wraps its logic).

**Contract**: Props: `userId`, server-hydrated initial state. Sections:
- **Profile gate** — modal/inline form if display name missing/default; PATCH profile API
- **New task form** — title (required), description (optional); POST create; show "Start voting" when `task.created_by === userId` and status `draft`
- **Fibonacci grid** — buttons for `FIBONACCI_STORY_POINTS`; POST vote; highlight selected value; disabled when not `voting` or no active task
- **Facilitator bar** — "Start voting" / "Reveal" for creator only when status allows
- **Results** — who-voted list pre-reveal (peer points hidden); post-reveal sorted list + prominent human average
- **Live badge** — Realtime subscribe + refetch `/api/session/state` (reuse `subscribeToSessionTask`)
- **Inline error banner** — mutation/refetch failures
- **New task CTA** — when latest task is `revealed`, form to start next cycle
- Accessible labels; no email display

#### 2. Retire or internalize SessionLivePanel

**File**: `src/components/session/SessionLivePanel.tsx`

**Intent**: Avoid duplicate live UI.

**Contract**: Either delete and move logic into SessionRoom, or reduce to private sub-component imported by SessionRoom only.

#### 3. Session page integration

**File**: `src/pages/session.astro`

**Intent**: Server hydrate latest task state + profile check; mount SessionRoom `client:load`.

**Contract**: Frontmatter uses server `createClient` + repos; pass `initialTask`, `initialParticipation`, `initialProfile`, `humanAverage*` when revealed; no client-side Supabase domain queries in Astro beyond island props.

#### 4. Dashboard entry point

**File**: `src/pages/dashboard.astro`

**Intent**: FR-003 join session path.

**Contract**: Add link/button "Join planning session" → `/session`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Logged-in user completes full flow via UI only
- Second browser sees who-voted update ≤3s after vote
- Reveal updates both browsers ≤3s with average and sorted points
- Non-creator does not see Reveal button; API 403 if forced

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Polish, docs, and verification

### Overview

README/route docs, middleware sanity, and full manual protocol.

### Changes Required:

#### 1. README session API table

**File**: `README.md`

**Intent**: Document new mutation routes for contributors.

**Contract**: Add rows for POST task/vote/reveal/profile endpoints under session API section.

#### 2. Protected routes check

**File**: `src/lib/protected-routes.ts` / `src/middleware.ts`

**Intent**: Confirm `/session` remains protected (should exist post F-01 merge).

**Contract**: No regression; `/support` not in `PROTECTED_ROUTES`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` passes

#### Manual Verification:

- US-01 acceptance: blind vote → reveal → average; no peer points pre-reveal
- Logged-out `/session` → sign-in redirect
- `/support` public
- Dashboard link works

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- `average.test.ts` — mean, empty list, single vote, formatting 1 decimal
- `sortParticipationByPoints` if extracted
- Existing `constants.test.ts`, `realtime.test.ts` unchanged

### Integration Tests:

- Deferred: full flow needs Supabase + auth cookies; covered by manual two-browser protocol

### Manual Testing Steps:

1. Merge foundation; `supabase db reset`
2. User A: set display name, create task, start voting
3. User B: set display name, vote; A sees name ≤3s without points
4. A changes vote before reveal
5. A reveals; both see sorted votes + same average (1 decimal)
6. A creates new task for next cycle
7. `npm run lint && npm run test:coverage && npm run build`

## Performance Considerations

Single-room ~10 users; one refetch per Realtime event (F-02 pattern). Fibonacci grid is static buttons — no virtualisation needed.

## Migration Notes

- No new migration expected for S-01
- Deploy: ensure F-01/F-02 migrations applied; `PUBLIC_SUPABASE_*` in Cloudflare env
- **Before implement:** merge `m2l2` into `s01`

## References

- PRD US-01, FR-003–FR-012: `context/foundation/prd.md`
- Roadmap S-01: `context/foundation/roadmap.md`
- F-01 archive: `context/archive/2026-05-27-gate-product-routes/plan.md`
- F-02 archive: `context/archive/2026-05-27-live-session-sync/plan.md`
- Lessons: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Merge foundation prerequisites

#### Automated

- [x] 1.1 `supabase db reset` exits 0
- [x] 1.2 `npm run lint` passes
- [x] 1.3 `npm run build` passes

#### Manual

- [x] 1.4 `/session` loads when logged in with F-02 panel
- [x] 1.5 `GET /api/session/state` returns 401 when logged out

### Phase 2: Mutation API and human average

#### Automated

- [x] 2.1 `npm run lint` passes on new/edited files — d5c95c3
- [x] 2.2 `npm run test:coverage` passes with coverage table printed to stdout — d5c95c3
- [x] 2.3 `npm run build` passes — d5c95c3

#### Manual

- [x] 2.4 Creator mutation flow via curl/cookie succeeds — d5c95c3
- [x] 2.5 Non-creator reveal returns 403 — d5c95c3
- [x] 2.6 GET state after reveal includes correct `humanAverageFormatted` — d5c95c3

### Phase 3: SessionRoom UI

#### Automated

- [x] 3.1 `npm run lint` passes — 2ed322b
- [x] 3.2 `npm run build` passes — 2ed322b

#### Manual

- [x] 3.3 Full US-01 flow via UI without SQL — 2ed322b
- [x] 3.4 Two-browser vote sync ≤3s without peer points — 2ed322b
- [x] 3.5 Two-browser reveal sync ≤3s with average and sorted votes — 2ed322b
- [x] 3.6 Creator-only Reveal enforced in UI and API — 2ed322b

### Phase 4: Polish, docs, and verification

#### Automated

- [x] 4.1 `npm run lint` passes — 5db0bfb
- [x] 4.2 `npm run test:coverage` passes with coverage table printed to stdout — 5db0bfb
- [x] 4.3 `npm run build` passes — 5db0bfb

#### Manual

- [x] 4.4 Logged-out `/session` redirect; `/support` public — 5db0bfb
- [x] 4.5 Dashboard link to `/session` works — 5db0bfb
