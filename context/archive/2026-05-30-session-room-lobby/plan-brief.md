# Session room lobby and multi-room flow — Plan Brief

> Full plan: `context/changes/session-room-lobby/plan.md`

## What & Why

Users today land directly in the hard-coded `default` room with the create form visible immediately after reveal. The product needs a **room lobby** (pick or create a room by name), a **results-first** post-reveal experience, and a **separate new-task page** — plus labeled mock history until real in-session history is built.

## Starting Point

- Single room: `getDefaultSessionId()` hardcodes `slug = 'default'` (`tasks.ts:7-24`); `/session` loads that room automatically (`session.astro:35-36`).
- RLS `tasks_insert` only allows inserts into `default` (`20260527120000_session_data_schema.sql:72-77`).
- After reveal, `showCreateForm = !task || isRevealed` shows create tabs above results (`SessionRoom.tsx:149,476-579`).
- Revealed tasks persist in DB but disappear from UI when the next task is created (`SessionRoom.tsx:304-309`).
- PRD non-goals: single room, no history UI — **this change intentionally expands MVP scope** per user direction.

## Desired End State

1. **`/session`** — lobby: list planning rooms, join/create by kebab-case slug, navigate to `/session/[slug]`.
2. **`/session/[slug]`** — live poker room scoped to that session; after reveal, results + labeled mock history; creator sees **Start next task** → `/session/[slug]/new`.
3. **`/session/[slug]/new`** — tabbed create form (reuse ui-collisions-tab pattern); no results clutter.
4. APIs accept `sessionSlug` query param; repo link and realtime scoped per room.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Multi-room scope | Full multi-room in this change | User wants real room picker, not fake lobby | Plan |
| Lobby route | `/session` = lobby, `/session/[slug]` = room | No auto-drop into default; list + join by name | Plan |
| Room creation | Any authenticated user | Matches flat PRD roles | Plan |
| Slug format | Kebab-case, auto-normalize | URL-safe; consistent with repo conventions | Plan |
| API room context | `sessionSlug` query param | Minimal churn; mirrors existing `taskId` param | Plan |
| Post-reveal create | Separate `/session/[slug]/new` page | User asked for button → another page | Plan |
| New-task access | Creator-only CTA | Aligns with start-voting / reveal permissions | Plan |
| History v1 | Static labeled sample rows on reveal view | Fast mock; real DB history deferred | Plan |

## Scope

**In scope:**

- Migration: relax `tasks_insert` RLS; allow `planning_sessions` insert for authenticated users
- Session lib: slug resolve, list/create rooms, parametrize task/repo helpers
- APIs: room list/create; `sessionSlug` on session + repo routes
- Pages: lobby, `[slug]`, `[slug]/new`
- SessionRoom: results-first on reveal; mock history; remove inline post-reveal create
- Slug normalization tests; room API tests; lint/coverage/build

**Out of scope:**

- Real DB-backed task history UI (follow-on; data exists)
- Cross-session history browser (PRD-deferred)
- Session membership / private rooms
- Analyst opt-in checkbox
- Sprinter Coach UI

## Architecture / Approach

```
/session (lobby)
  → list rooms GET /api/session/rooms
  → join/create POST /api/session/rooms { slug }
  → /session/[slug]

/session/[slug]
  → SSR getSessionIdBySlug(slug)
  → SessionRoom (voting | reveal results | draft controls)
  → reveal → results + mock history + creator CTA
  → /session/[slug]/new

APIs: /api/session/state?sessionSlug=&taskId=
      /api/session/tasks?sessionSlug=
      repo routes with sessionSlug
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Schema & session lib | Multi-room RLS + slug helpers | RLS too permissive or too tight |
| 2. Room & session APIs | List/create rooms + slug on APIs | Missing slug on a client call |
| 3. Lobby & routing | `/session` lobby + `[slug]` page | Broken OAuth return paths |
| 4. Post-reveal & new-task | Results-first + mock history + `/new` | Creator-only gate edge cases |
| 5. Integration & QA | Client wiring, tests, docs | Multi-tab / reload draft loss |

**Prerequisites:** `ui-collisions-tab` merged (tabbed create form).

**Estimated effort:** ~4–6 focused sessions across 5 phases.

## Open Risks & Assumptions

- PRD single-room / no-history non-goals are overridden by explicit user scope — document in PRD append or open question when shipping.
- `getLatestActiveTask` ignores drafts on reload; facilitators may lose in-progress draft if they refresh before starting voting.
- Open room list visible to all authenticated users (current RLS `planning_sessions_select USING (true)`).
- Existing `/session` bookmarks become lobby (intentional).

## Success Criteria (Summary)

- User opens `/session`, sees rooms, joins or creates `team-alpha`, lands in `/session/team-alpha`.
- After reveal, create form is hidden until creator clicks **Start next task** → `/session/team-alpha/new`.
- Mock history section visible and labeled as sample/coming soon.
- Poker flow (vote → reveal → next task) works in a non-default room; lint, coverage, build pass.
