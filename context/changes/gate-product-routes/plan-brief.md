# F-01 Session Data Schema + Gate Product Routes — Plan Brief

> Full plan: `context/changes/gate-product-routes/plan.md`

## What & Why

Roadmap **F-01** requires a Supabase domain schema so the single shared planning room can persist tasks, blind votes, and reveal state — unblocking north-star slice S-01 and later Realtime sync (F-02). This change also gates `/session` in middleware (change-id intent) so the product route is authenticated before poker UI lands.

## Starting Point

Auth works (Supabase + middleware for `/dashboard` only). There are no `supabase/migrations/`, no task/vote tables, and no session product page. Sensitive Supabase access must stay server-side per `AGENTS.md`.

## Desired End State

Supabase migrations define `planning_sessions`, `profiles`, `tasks`, and `votes` with RLS enforcing blind voting. Server modules under `src/lib/session/` provide typed helpers. `/session` is protected and shows an authenticated stub; dashboard links to it. Lint, coverage, and build pass.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Room model | Single `planning_sessions` row, `slug = 'default'` | Matches PRD single-room MVP (FR-003) | Plan |
| Task lifecycle | `draft` → `voting` → `revealed` | Aligns with create → vote → reveal flow (US-01) | Plan |
| Story points | Fibonacci integers with DB CHECK | PRD standard scale; no custom algorithm | Plan |
| Blind vote enforcement | RLS + `vote_participation` view | Hides peer story points until reveal (FR-010) at persistence layer | Plan |
| Display names | `profiles.display_name` table | Vote UI shows names, not emails (NFR) | Plan |
| Product route | `/session` in `PROTECTED_ROUTES` + stub page | AGENTS.md requires gating before shipping product pages | Plan |
| Scope boundary | Schema + server lib + route gate only | F-01 foundation; UI/API voting deferred to S-01 | Roadmap |

## Scope

**In scope:**

- SQL migration: sessions, profiles, tasks, votes, RLS, blind-vote view, default session seed
- `src/lib/session/*` server repositories + Fibonacci validation tests
- Middleware + `/session` stub + dashboard link

**Out of scope:**

- Realtime sync (F-02), poker UI/API (S-01), AI features, Analyst repo columns, session history UI

## Architecture / Approach

```
Auth user → middleware (/session gated) → stub page (Phase 3)
                ↓
Server Astro/API (later S-01) → src/lib/session/* → Supabase Postgres
                                      ↑
                    RLS + vote_participation view (blind until revealed)
```

Migrations are source of truth. Repositories accept the existing SSR Supabase client from `src/lib/supabase.ts`. No client-side domain queries.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Supabase schema | Tables, RLS, blind-vote view, default room seed | RLS policy mistakes leak story points early |
| 2. Server lib | Typed task/vote/profile helpers + unit tests | Profile bootstrap for existing auth users |
| 3. Gate routes | `/session` protected + stub + dashboard link | Forgetting `PROTECTED_ROUTES` entry breaks AGENTS rule |

**Prerequisites:** Supabase CLI linked project or local Docker; `SUPABASE_URL` / `SUPABASE_KEY` in env for dev.

**Estimated effort:** ~2–3 focused sessions across 3 phases.

## Open Risks & Assumptions

- Local `supabase db reset` requires Docker — CI may not run migrations until deploy pipeline adds them.
- Existing users lack `profiles` rows until `ensureProfile` runs (wire on first session access in S-01 if not in stub).
- Change folder id `gate-product-routes` differs from roadmap Change ID `session-data-schema` — same F-01 scope.

## Success Criteria (Summary)

- Migrations apply; default session exists; blind voting holds at DB layer for two test users.
- `npm run lint`, `npm run test:coverage`, and `npm run build` pass.
- Unauthenticated `/session` redirects; authenticated stub loads.
