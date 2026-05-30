# Session room lobby and multi-room flow — Implementation Plan

## Overview

Deliver a **room lobby**, **slug-scoped multi-room** planning poker, and a **post-reveal results-first** flow with a **creator-only** path to `/session/[slug]/new` for the next task. Includes **labeled static mock history** on the reveal view until real DB history is wired.

**User direction:** `/session` lists rooms and accepts join/create by name; no auto-drop into `default`; after reveal, button to new-task page; mock history acceptable for now.

**PRD note:** Expands MVP beyond single-room and no-history UI non-goals — intentional per product request; flag in Open Risks.

## Current State Analysis

- **Hard-coded default room:** `getDefaultSessionId()` queries `slug = 'default'` (`src/lib/session/tasks.ts:7-24`); `createTask` and `getLatestActiveTask` always use it (`tasks.ts:40-41`, `72-80`).
- **RLS gate:** `tasks_insert` only permits `session_id` for `default` slug (`supabase/migrations/20260527120000_session_data_schema.sql:72-77`).
- **No room creation:** `planning_sessions` has SELECT grant only; no INSERT policy for authenticated users.
- **Fixed routing:** `src/pages/session.astro` loads default session (`session.astro:35-36`); dashboard links to `/session` (`dashboard.astro:19`).
- **Post-reveal UX:** `showCreateForm = !task || isRevealed` (`SessionRoom.tsx:149`) renders create tabs above results immediately on reveal.
- **History data exists, UI absent:** Revealed tasks remain in DB; UI clears on next `createTask` (`SessionRoom.tsx:304-309`). No list/history API.
- **Repo/analyst:** `connections.ts` uses `getDefaultSessionId` in four places; OAuth defaults `returnPath = "/session"` (`repo-client.ts:82`, `redirects.ts:3`).

### Key Discoveries

- `SessionRoom` already accepts `planningSessionId` for realtime (`SessionRoom.tsx:31`, `224-238`) — room page can pass resolved UUID.
- `GET /api/session/state?taskId=` works per task; without `taskId`, uses `getLatestActiveTask` on default session only (`state.ts:20-27`).
- Slug-scoped realtime channel already uses session UUID (`realtime.ts:12-14`, `53`).
- Tabbed create form from `ui-collisions-tab` can move to `/session/[slug]/new` with minimal rework.

## Desired End State

1. Authenticated user visits **`/session`** → sees room list + join/create form (kebab-case slug) → enters **`/session/[slug]`**.
2. In room: blind voting unchanged; on **reveal** → results panel + **labeled mock history** (2–3 sample rows); **no** inline create form.
3. Task **creator** sees **Start next task** → **`/session/[slug]/new`** with Create task | Sprinter Draft tabs.
4. All session/repo API calls include **`sessionSlug`**; tasks and repo links scoped to that room.
5. **`default`** room remains in DB for backward compatibility but is not auto-entered.

**Verify:** Create room `sprint-42` → vote → reveal → mock history visible → creator opens `/session/sprint-42/new` → creates next task → voting cycle continues.

## What We're NOT Doing

- Real DB-backed task history list (follow-on; use static mock only)
- Cross-session / archived session browser
- Private rooms, membership tables, or invite links
- Replacing `default` seed row (keep for tests/smoke)
- Analyst opt-in, Coach UI, or ui-collisions-tab rework beyond reuse
- Nested REST `/api/session/[slug]/...` routes (query param chosen)
- Cookie-based active room context

## Implementation Approach

Bottom-up: migration + session lib → APIs → Astro routes → SessionRoom mode split → extract/create-task page component shared with `[slug]/new`. Normalize slugs in one pure helper with unit tests. Update dashboard, repo OAuth return paths, and smoke scripts to pass slug-aware paths.

## Critical Implementation Details

**RLS migration order:** Ship relaxed `tasks_insert` and new `planning_sessions_insert` in Phase 1 before any UI creates non-default rooms — otherwise inserts fail silently in prod.

**Do not break blind voting:** `sessionSlug` must flow to `getLatestActiveTask`, `createTask`, and repo link helpers together; partial wiring creates tasks in `default` while UI shows another slug.

**Post-reveal state:** Decouple `showResultsPanel` (`task && (voting || revealed)`) from create UI. On reveal, `showCreateForm` becomes false until navigation to `/new`. Creating a task on `/new` redirects back to `/session/[slug]` with the new draft — results of the previous revealed task remain visible until the new task enters `voting` (because `getLatestActiveTask` returns voting/revealed only — document that previous reveal stays visible while draft is client-only until start voting, OR refetch revealed task by id for history section — **implement history mock as static; keep live results tied to current `task` until new task starts voting**).

**Reload behavior:** Draft on `/new` page lost on refresh if a `revealed` task is still latest active — acceptable for MVP; note in manual QA.

## Phase 1: Schema and session lib

### Overview

Enable multi-room data access: RLS, slug resolution, room list/create, parametrize task and repo helpers.

### Changes Required:

#### 1. Migration — multi-room RLS

**File**: `supabase/migrations/20260530220000_multi_room_sessions.sql` (timestamp as next after latest)

**Intent**: Allow authenticated users to create planning rooms and insert tasks into any room.

**Contract**:
- Replace `tasks_insert` policy: remove `slug = 'default'` restriction; require `auth.uid() = created_by` and valid `session_id` FK only.
- Add `planning_sessions_insert` policy: authenticated users may INSERT with non-empty trimmed slug.
- Keep existing seed `default` row.

#### 2. Slug normalization helper

**File**: `src/lib/session/slug.ts`

**Intent**: Single kebab-case normalization for lobby input and API validation.

**Contract**: Export `normalizePlanningSessionSlug(input: string): string | null` — trim, lowercase, replace spaces/underscores with `-`, collapse repeated hyphens, strip leading/trailing hyphens; return `null` if result length < 3 or > 32 or invalid chars remain. Unit tests in `slug.test.ts`.

#### 3. Session resolution and room CRUD

**File**: `src/lib/session/tasks.ts` (and exports via `index.ts`)

**Intent**: Replace default-only helpers with slug-aware variants.

**Contract**:
- Add `getSessionIdBySlug(supabase, slug): Promise<SessionIdResult>`.
- Add `listPlanningSessions(supabase): Promise<{ data: PlanningSessionRow[] | null; error }>` ordered by `created_at DESC`.
- Add `createPlanningSession(supabase, slug): Promise<SessionIdResult>` — insert normalized slug; handle unique violation with friendly error.
- Change `createTask` to accept `sessionId: string` (required) instead of calling `getDefaultSessionId`.
- Change `getLatestActiveTask` to accept `sessionId: string`.
- Deprecate or reimplement `getDefaultSessionId` as `getSessionIdBySlug(supabase, 'default')` for smoke scripts only.

#### 4. Repo connections parametrize session

**File**: `src/lib/repo/connections.ts`

**Intent**: Scope repo link operations to the active room, not hard-coded default.

**Contract**: Replace `getDefaultSessionId` calls with `sessionId` parameter on `setSessionRepoLink`, `disconnectSessionRepoLink`, `getActiveConnectionIdForDefaultSession` (rename to `getActiveConnectionIdForSession`), `getSessionRepoSummary`. Update exports/types as needed.

#### 5. Unit tests

**Files**: `src/lib/session/slug.test.ts`; update any broken tests from signature changes.

**Intent**: Lock slug rules and prevent regressions on room helpers.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- Migration applies on local Supabase (`npx supabase db reset` or equivalent per project README)

#### Manual Verification:

- SQL insert into new `planning_sessions` slug succeeds as authenticated user (via API in Phase 2 or direct SQL smoke)

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: Room and session APIs

### Overview

Expose room list/create endpoints; thread `sessionSlug` through existing session and repo JSON APIs.

### Changes Required:

#### 1. Room list and create API

**File**: `src/pages/api/session/rooms.ts`

**Intent**: Back lobby UI with list + create/join.

**Contract**:
- `GET`: authenticated; returns `{ rooms: { id, slug, createdAt }[] }` from `listPlanningSessions`.
- `POST`: body `{ slug: string }`; normalize; `createPlanningSession` or return existing if join-or-create semantics **not** used — on unique conflict return 409 with message; on success return `{ room }`.
- Use `requireSessionAuth` + `jsonResponse` pattern.

#### 2. SessionSlug on task create and state

**Files**: `src/pages/api/session/tasks.ts`, `src/pages/api/session/state.ts`

**Intent**: Scope reads/writes to the room from query param.

**Contract**:
- Require `sessionSlug` query param (400 if missing/invalid).
- Resolve to `sessionId` via `getSessionIdBySlug` (404 if room missing).
- `tasks.ts` POST: pass `sessionId` to `createTask`.
- `state.ts` GET: pass `sessionId` to `getLatestActiveTask`; keep optional `taskId` override.

#### 3. SessionSlug on vote, reveal, start-voting, profile

**Files**: `src/pages/api/session/vote.ts`, `reveal.ts`, `tasks/[taskId]/start-voting.ts`, `profile.ts`

**Intent**: Ensure mutations validate task belongs to resolved session when slug provided (defense in depth: load task, compare `session_id`).

**Contract**: Accept optional or required `sessionSlug` on routes that need room context for refetch; at minimum validate task's `session_id` matches resolved session when slug present on vote/reveal/start-voting.

#### 4. SessionSlug on repo APIs

**Files**: `src/pages/api/repo/session.ts`, `link.ts`, `connections.ts`, OAuth start/callback handlers as needed for return paths (Phase 3)

**Intent**: Repo badge and link operations target the active room.

**Contract**: `sessionSlug` query/body param on link/session/connections; pass resolved `sessionId` into `connections.ts` helpers.

#### 5. API tests

**Files**: `src/pages/api/session/rooms.test.ts` (or lib-level tests); update existing API tests if mocked paths change.

**Intent**: Cover slug validation, list shape, create success/duplicate.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout

#### Manual Verification:

- `curl`/browser: GET `/api/session/rooms` returns list including `default`
- POST creates `team-alpha`; second POST same slug returns 409

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Lobby and routing

### Overview

Replace auto-room `/session` with lobby; add dynamic room route; update navigation and OAuth return paths.

### Changes Required:

#### 1. Lobby page at `/session`

**File**: `src/pages/session/index.astro` (move/replace current `session.astro`)

**Intent**: Entry point listing rooms and join/create form.

**Contract**:
- SSR optional: prefetch rooms via `listPlanningSessions` or client-fetch `GET /api/session/rooms`.
- React island `SessionLobby.tsx`: room list (links to `/session/[slug]`), text input + **Join room** / **Create room** button; normalize slug client-side for preview; POST create then navigate.
- Show validation errors inline.

#### 2. Room page `/session/[slug]`

**File**: `src/pages/session/[slug].astro`

**Intent**: Load poker room for slug; 404 if unknown slug.

**Contract**:
- Resolve slug param via `getSessionIdBySlug`; redirect or 404 Astro page if missing.
- Pass `sessionSlug`, `planningSessionId`, and existing SSR task/participation props (same as current `session.astro` logic scoped to session id).
- Render `SessionRoom` with new props: `sessionSlug: string`.

#### 3. Remove old single-room page

**File**: Retire `src/pages/session.astro` in favor of `session/index.astro` + `[slug].astro` (Astro file moves).

**Intent**: Prevent duplicate `/session` route conflict.

#### 4. Navigation and protection

**Files**: `src/pages/dashboard.astro`, `src/lib/protected-routes.ts`, `src/middleware.test.ts`

**Intent**: Dashboard → `/session` lobby; ensure `/session/*` remains protected (`startsWith` already covers).

**Contract**: Update dashboard copy from "Join planning session" to "Planning rooms" or similar; link `/session`.

#### 5. OAuth return paths

**Files**: `src/lib/session/repo-client.ts`, `src/lib/repo/redirects.ts`, `src/components/session/RepoLinkModal.tsx`

**Intent**: OAuth returns to `/session/[slug]` not bare `/session`.

**Contract**: `SessionRoom` / modal pass `returnPath={`/session/${sessionSlug}`}` to OAuth URL builders; redirects use same.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` succeeds

#### Manual Verification:

- `/session` shows lobby; clicking `default` opens `/session/default`
- Creating `my-team` navigates to `/session/my-team`
- Repo link OAuth returns to correct slug path

**Implementation Note**: Pause for manual confirmation before Phase 4.

---

## Phase 4: Post-reveal, mock history, and new-task page

### Overview

Results-first room view; static mock history; creator-only navigation to dedicated new-task page with tabbed form.

### Changes Required:

#### 1. SessionRoom mode split

**File**: `src/components/session/SessionRoom.tsx`

**Intent**: Remove inline post-reveal create form; add mock history and creator CTA.

**Contract**:
- Add prop `sessionSlug: string`.
- Replace `showCreateForm = !task || isRevealed` with:
  - `showResultsPanel = Boolean(task && (isVoting || isRevealed))`
  - `showInlineCreateForm = !task` only (empty room — optional: redirect empty room to `/new` or keep minimal inline create for first task only — **use inline create only when `!task` for first task in empty room, OR link to `/new` — recommend: empty room shows CTA "Create first task" → `/new` for consistency**)
- On `isRevealed && isCreator`: render link/button **Start next task** → `/session/${sessionSlug}/new`.
- Add `TaskHistoryMock` section below results when `isRevealed`: 2–3 labeled sample rows + copy "Sample history — real past tasks coming soon".
- Remove create tabs from reveal state entirely.
- Update all `fetch` calls to append `sessionSlug` query param.

#### 2. TaskHistoryMock component

**File**: `src/components/session/TaskHistoryMock.tsx`

**Intent**: Static placeholder per plan decision.

**Contract**: Presentational only; hardcoded sample tasks with title + average; visible disclaimer banner.

#### 3. New-task page

**Files**: `src/pages/session/[slug]/new.astro`, `src/components/session/CreateTaskView.tsx` (extract tabbed form from SessionRoom)

**Intent**: Dedicated create flow after reveal (and first task).

**Contract**:
- SSR: resolve slug; 404 if missing.
- Render `CreateTaskView` with `sessionSlug`, `userId`; tabs Create task | Sprinter Draft (preserve hidden-mount pattern from ui-collisions-tab).
- On successful create: `window.location.href = `/session/${sessionSlug}`` (or Astro redirect).
- Creator-only guard: if SSR can detect no active revealed task and not creator, still allow first task; for post-reveal path optional query `?from=reveal` — **MVP: allow any authenticated user to create tasks in room (existing API has no creator gate on create); UI shows CTA creator-only on reveal only**.

#### 4. Empty room first task

**Intent**: When `!task` in room, show message + **Create first task** button → `/new` instead of inline form.

**Contract**: Consistent with post-reveal path; no create tabs on main room page.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` succeeds

#### Manual Verification:

- Reveal → results + mock history visible; **no** create form on room page
- Creator sees **Start next task** → `/new` → create → returns to room with draft
- Non-creator does not see Start next task button (or it is hidden)

**Implementation Note**: Pause for manual confirmation before Phase 5.

---

## Phase 5: Integration and verification

### Overview

End-to-end wiring, script updates, README notes, full manual QA matrix.

### Changes Required:

#### 1. Client repo/session fetch helpers

**File**: `src/lib/session/repo-client.ts`

**Intent**: Centralize sessionSlug on fetch wrappers used by SessionRoom and RepoLinkModal.

**Contract**: All functions accept `sessionSlug: string`; append to query string.

#### 2. Smoke and script updates

**Files**: `scripts/session-smoke.ts`, `scripts/gitlab-oauth-smoke.ts`

**Intent**: Use explicit slug (`default` or created room) instead of assuming implicit default route.

#### 3. README

**File**: `README.md` (session routes section if present)

**Intent**: Document lobby, room, and new-task URLs; note PRD scope expansion.

#### 4. Manual QA matrix (execute, document in PR)

**Intent**: Full regression in non-default room.

**Contract**: Two-browser blind vote; repo link + analyst in named room; lobby create/join; reveal → mock history → new page flow.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` succeeds

#### Manual Verification:

- Full cycle in room `qa-room`: lobby → join → task → vote → reveal → mock history → new task → vote → reveal
- `default` room still works via lobby link
- Dashboard → lobby → room path works

**Implementation Note**: Final phase — mark change implemented after confirmation.

---

## Testing Strategy

### Unit Tests:

- `normalizePlanningSessionSlug` edge cases (spaces, uppercase, too short, invalid chars)
- Room create duplicate handling at lib layer if testable with mocks
- Update `repo-client.test.ts` for slug query params

### Integration Tests:

- `GET/POST /api/session/rooms` auth + validation
- `POST /api/session/tasks?sessionSlug=` creates task in correct session (mock supabase)

### Manual Testing Steps:

1. Lobby lists rooms; create `team-a`; join existing `default`.
2. First task via `/session/team-a/new`; voting cycle.
3. Reveal — no inline form; mock history visible.
4. Creator `/new` for second task; non-creator lacks button.
5. Repo link in named room; analyst after reveal if repo linked.
6. OAuth return lands on `/session/team-a`.

## Performance Considerations

- Room list is small (team-scale MVP); no pagination required.
- `sessionSlug` resolution adds one lookup per API call — acceptable; cache slug→id in SessionRoom state for client refetch burst.

## Migration Notes

- Apply `20260530220000_multi_room_sessions.sql` before deploy.
- Existing tasks remain under `default`; users reach it via lobby.
- No data backfill required.

## References

- User feedback (2026-05-30 conversation): post-reveal button, mock history, room lobby
- Prior work: `context/changes/ui-collisions-tab/plan.md`
- `src/lib/session/tasks.ts`, `SessionRoom.tsx`, `supabase/migrations/20260527120000_session_data_schema.sql`
- PRD non-goals: `context/foundation/prd.md` (single room, history UI)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Schema and session lib

#### Automated

- [x] 1.1 `npm run lint` passes — 2fad79d
- [x] 1.2 `npm run test:coverage` passes with coverage table printed to stdout — 2fad79d
- [x] 1.3 Migration applies on local Supabase — 2fad79d

#### Manual

- [x] 1.4 Authenticated insert into new planning_sessions slug succeeds — 2fad79d

### Phase 2: Room and session APIs

#### Automated

- [x] 2.1 `npm run lint` passes — a7a6aef
- [x] 2.2 `npm run test:coverage` passes with coverage table printed to stdout — a7a6aef

#### Manual

- [ ] 2.3 GET `/api/session/rooms` lists rooms including `default`
- [ ] 2.4 POST creates room; duplicate slug returns 409

### Phase 3: Lobby and routing

#### Automated

- [x] 3.1 `npm run lint` passes — e068547
- [x] 3.2 `npm run test:coverage` passes with coverage table printed to stdout — e068547
- [x] 3.3 `npm run build` succeeds — e068547

#### Manual

- [ ] 3.4 `/session` lobby lists rooms and navigates to `/session/[slug]`
- [ ] 3.5 Repo OAuth return path includes room slug

### Phase 4: Post-reveal, mock history, and new-task page

#### Automated

- [x] 4.1 `npm run lint` passes — bc1eb88
- [x] 4.2 `npm run test:coverage` passes with coverage table printed to stdout — bc1eb88
- [x] 4.3 `npm run build` succeeds — bc1eb88

#### Manual

- [ ] 4.4 Reveal shows results + labeled mock history; no inline create form
- [ ] 4.5 Creator Start next task opens `/session/[slug]/new` and create returns to room

### Phase 5: Integration and verification

#### Automated

- [x] 5.1 `npm run lint` passes
- [x] 5.2 `npm run test:coverage` passes with coverage table printed to stdout
- [x] 5.3 `npm run build` succeeds

#### Manual

- [ ] 5.4 Full poker cycle in non-default room (two-browser optional)
- [ ] 5.5 Dashboard → lobby → room path works; `default` room accessible
