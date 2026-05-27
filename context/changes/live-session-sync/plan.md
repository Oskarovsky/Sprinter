# F-02 Live Session Sync — Implementation Plan

## Overview

Implement roadmap **F-02** (`live-session-sync`): propagate **who voted** (without story points) and **reveal outcomes** to all session participants within the PRD ≤3s NFR. Builds on F-01 schema and server repositories; adds Supabase Realtime subscriptions, a masked server read API, and minimal live UI on `/session` to prove sync before S-01 ships full poker.

**Roadmap refs:** F-02 · **PRD refs:** FR-007, FR-008, FR-010 · **Prerequisites:** F-01 complete (`gate-product-routes`)

## Current State Analysis

- **F-01 landed:** Migration with RLS + `vote_participation` view; `src/lib/session/*` repositories; `/session` stub with auth gate (`src/pages/session.astro`).
- **No Realtime wiring:** No client Supabase factory; env schema is server-only (`astro.config.mjs:19-20`). No tables in Realtime publication migration.
- **Infra decision:** Browser → Supabase Realtime WebSocket; Workers stay SSR/API (`context/foundation/infrastructure.md`).
- **Plan review F5:** Realtime `postgres_changes` targets **tables**, not views — subscribe to `votes` and `tasks`; never use peer `votes` payload for story points pre-reveal.

### Key Discoveries

- `src/lib/supabase.ts` — SSR `createServerClient` only; F-02 needs a separate browser client using public anon credentials + user session cookie.
- `vote_participation` view is safe for **server-side** masked reads (`listParticipation`); client refetch should go through API per AGENTS.md server-side rule.
- Local Realtime enabled in `supabase/config.toml`; production requires publication + RLS verification on hosted Supabase.
- PRD NFR: within 3s of a vote, others see voter name without point value (`context/foundation/prd.md`).

## Desired End State

After this change:

1. `votes` and `tasks` are in Supabase Realtime publication (migration).
2. Browser client can subscribe to `postgres_changes` filtered by active `task_id` (authenticated JWT).
3. On vote/task events, clients refetch masked participation via server API — never render peer story points from Realtime payloads.
4. On task reveal (`tasks.status` → `revealed`), all clients refetch and show revealed state (points visible per RLS/view rules).
5. `/session` shows a minimal live panel: who voted, reveal banner when applicable, connection status.
6. Unit tests cover pure Realtime helper logic; lint, coverage, and build pass.

**Verify:** Two browsers, two users — vote in B updates A's who-voted list within ~3s without showing B's points; reveal updates both within ~3s with points visible.

## What We're NOT Doing

- Vote/reveal buttons and full planning-poker UI (S-01)
- Server-side Broadcast channels or custom Workers WebSockets
- HTTP polling as primary sync mechanism
- Subscribing to `vote_participation` view via Realtime
- Task create/start-voting UI flows (S-01); stub may show latest voting task if one exists server-side
- Sprinter Draft/Coach/Analyst
- Multi-room channels

## Implementation Approach

Add a Realtime publication migration for `votes` and `tasks`. Extend Astro env with **public** Supabase URL + anon key for browser Realtime (RLS-bound; not service role). Create `src/lib/supabase-browser.ts` for authenticated browser clients. Add server GET API routes under `src/pages/api/session/` that call existing repositories for masked snapshots. Build `src/lib/session/realtime.ts` with channel setup and event handlers that trigger API refetch — Realtime is the **signal**, API is the **masked data source**. Mount a small React `SessionLivePanel` on `/session` via `client:load` to demonstrate and manually verify NFR. Mutations remain deferred to S-01; manual testing may use existing smoke script or Studio SQL to insert votes during dev.

## Critical Implementation Details

**Signal vs data:** Treat every `votes` INSERT/UPDATE Realtime payload as a wake-up only. UI state for peer participants comes from `GET /api/session/participation` (or bundled state endpoint) that uses `listParticipation` server-side. Own vote row may still use payload for optimistic UX if desired, but peer names/points must not be parsed from raw `votes` events pre-reveal.

**Reveal path:** Subscribe to `tasks` UPDATE where `status` becomes `revealed`. On event, refetch participation/revealed snapshot so all clients converge after facilitator reveal.

**Publication:** Supabase Realtime requires tables in the `supabase_realtime` publication. Add explicit migration; verify with local `supabase db reset`.

## Phase 1: Realtime publication migration

### Overview

Enable Postgres changes replication for domain tables used by F-02 subscriptions.

### Changes Required:

#### 1. Realtime publication migration

**File**: `supabase/migrations/<timestamp>_enable_session_realtime.sql`

**Intent**: Allow authenticated clients to receive `postgres_changes` on vote and task rows relevant to the planning room.

**Contract**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.votes, public.tasks` (idempotent-safe pattern per Supabase docs if table already member — use conditional DO block or document re-run). No schema column changes.

### Success Criteria:

#### Automated Verification:

- Migration file exists under `supabase/migrations/`
- `supabase db reset` exits 0 locally

#### Manual Verification:

- In Supabase Studio → Database → Publications, `votes` and `tasks` appear under `supabase_realtime`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Browser Supabase client and session read API

### Overview

Expose public anon env for browser Realtime and add server routes for masked participation snapshots.

### Changes Required:

#### 1. Public env schema

**File**: `astro.config.mjs`

**Intent**: Allow client-side Realtime with anon key while keeping secrets out of raw `process.env`.

**Contract**: Add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` as `envField.string({ context: "client", access: "public", optional: true })`. Document in README that values mirror server `SUPABASE_URL` / anon key for local dev.

#### 2. Browser Supabase factory

**File**: `src/lib/supabase-browser.ts`

**Intent**: Create authenticated browser client for Realtime subscriptions only.

**Contract**: Export `createBrowserClient()` using `@supabase/ssr` `createBrowserClient` with public env vars; returns `null` when unconfigured.

#### 3. Participation snapshot API

**File**: `src/pages/api/session/participation.ts`

**Intent**: Server-only masked read for who-voted list (FR-007, FR-010).

**Contract**: `GET` with query `taskId`; requires authenticated user via `createClient` + cookies; returns JSON from `listParticipation`; 401 if unauthenticated; 400 if missing `taskId`.

#### 4. Optional session state API

**File**: `src/pages/api/session/state.ts`

**Intent**: Bundle active task + participation for initial hydrate and post-reveal refetch.

**Contract**: `GET` optional `taskId`; if omitted, resolve latest task in `voting` or `revealed` for default session server-side; returns `{ task, participation }` with no peer story points before reveal (via repository/view semantics).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on new/edited files
- `npm run build` passes

#### Manual Verification:

- Unauthenticated `GET /api/session/participation?taskId=…` returns 401
- Authenticated request returns JSON without peer story points for unrevealed task

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Realtime subscription module and live UI

### Overview

Wire Realtime channels to API refetch and mount minimal live panel on `/session`.

### Changes Required:

#### 1. Realtime helpers

**File**: `src/lib/session/realtime.ts`

**Intent**: Encapsulate channel names, filters, subscribe/unsubscribe, and event-to-refetch mapping.

**Contract**: Export functions to subscribe to `votes` changes and `tasks` updates for a given `taskId`; callbacks invoke refetch (no direct peer point rendering from payload); export pure helpers testable without WebSocket (e.g. `channelNameForTask`, `shouldRefetchOnVoteEvent`).

#### 2. React live panel

**File**: `src/components/session/SessionLivePanel.tsx`

**Intent**: Minimal UI proving sync: connection status, participant list (display names), revealed indicator, last-updated timestamp.

**Contract**: Props: initial `taskId` (nullable), user id; on mount subscribe via browser client; on events fetch `/api/session/state` or participation endpoint; show "No active task" when null; accessible list semantics.

#### 3. Session page integration

**File**: `src/pages/session.astro`

**Intent**: Server-resolve latest active task id (if any) via repositories; pass to `SessionLivePanel` with `client:load`.

**Contract**: Frontmatter uses server `createClient` + session repos only; no client-side domain queries in Astro file beyond mounting React island.

#### 4. Unit tests

**File**: `src/lib/session/realtime.test.ts`

**Intent**: Lock pure helper behavior for event filtering and channel naming.

**Contract**: Tests run under `npm run test:coverage` with coverage table to stdout.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with Statements/Branches/Functions/Lines % printed to stdout
- `npm run build` passes

#### Manual Verification:

- Two users, two browsers: vote updates who-voted on other client within ~3s without points
- Reveal updates both clients within ~3s with points visible
- `/support` remains public; logged-out `/session` still redirects to sign-in

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Realtime pure helpers (`realtime.test.ts`)
- Existing `constants.test.ts` unchanged

### Integration Tests:

- Deferred: full Realtime flow requires live Supabase; covered by manual two-browser protocol

### Manual Testing Steps:

1. `supabase db reset` → confirm publication
2. Two authenticated users on `/session` with a task in `voting` (create via smoke script or Studio)
3. User B votes → User A sees name appear ≤3s, no point value
4. Facilitator reveals → both see points ≤3s
5. `npm run lint && npm run test:coverage && npm run build`

## Performance Considerations

~10 users, single room, one active task channel per client. One refetch per Realtime event is acceptable at MVP scale; debounce refetch if burst votes occur (optional, only if manual testing shows thrash).

## Migration Notes

- Deploy: apply new migration before enabling client Realtime in production.
- Set `PUBLIC_SUPABASE_*` in Cloudflare Pages/Workers env alongside server secrets (anon key is public by design; RLS enforces access).

## References

- Roadmap F-02: `context/foundation/roadmap.md`
- PRD FR-007, FR-008, FR-010: `context/foundation/prd.md`
- F-01 plan review F5: `context/changes/gate-product-routes/reviews/plan-review.md`
- Infrastructure Realtime: `context/foundation/infrastructure.md`
- Session repositories: `src/lib/session/`
- Lessons: `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Realtime publication migration

#### Automated

- [x] 1.1 Migration file exists under `supabase/migrations/`
- [x] 1.2 `supabase db reset` exits 0 locally

#### Manual

- [x] 1.3 `votes` and `tasks` in `supabase_realtime` publication (Studio)

### Phase 2: Browser Supabase client and session read API

#### Automated

- [ ] 2.1 `npm run lint` passes on new/edited files
- [ ] 2.2 `npm run build` passes

#### Manual

- [ ] 2.3 Unauthenticated participation API returns 401
- [ ] 2.4 Authenticated participation API omits peer story points before reveal

### Phase 3: Realtime subscription module and live UI

#### Automated

- [ ] 3.1 `npm run lint` passes
- [ ] 3.2 `npm run test:coverage` passes with coverage table printed to stdout
- [ ] 3.3 `npm run build` passes

#### Manual

- [ ] 3.4 Two-browser vote sync ≤3s without leaking peer points
- [ ] 3.5 Reveal sync ≤3s with points visible on both clients
- [ ] 3.6 Logged-out `/session` redirect; `/support` public
