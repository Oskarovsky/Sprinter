# F-02 Live Session Sync — Plan Brief

> Full plan: `context/changes/live-session-sync/plan.md`

## What & Why

F-02 delivers the real-time foundation for planning poker: when someone votes or the facilitator reveals, every participant sees the update within ~3 seconds — who voted (without points) before reveal, full outcomes after. Without this, F-01 persistence works but the blind voting UX fails PRD acceptance.

## Starting Point

F-01 provides Supabase schema, RLS, `vote_participation`, server repositories, and a gated `/session` stub. No Realtime publication, no browser Supabase client, no live UI. Infrastructure already chose Supabase Realtime from the browser.

## Desired End State

Authenticated users on `/session` see a minimal live panel that updates on peer votes and reveal. Realtime events trigger server API refetch of masked participation — never peer story points from raw payloads. S-01 can reuse the sync module for full poker UI.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| F-02 scope | Sync layer + minimal live UI on `/session` | Proves ≤3s NFR before S-01 ships buttons | Plan |
| Transport | `postgres_changes` on `votes` + `tasks` | Matches infra doc; tables not views | Plan / F5 review |
| Browser access | Public anon client + user JWT | Standard Supabase Realtime; no Worker WebSocket | Plan |
| Leak prevention | Realtime signal → API refetch masked participation | Never trust peer points from Realtime payload | Plan |
| Reveal sync | `tasks` UPDATE subscription + refetch | All clients converge on reveal status | Plan |
| Mutations | Stay server-side until S-01 | AGENTS.md; F-02 is read/sync only | Plan |
| Testing | Unit tests for pure helpers + manual two-browser | Realtime needs live Supabase | Plan |

## Scope

**In scope:**

- Realtime publication migration for `votes`, `tasks`
- Public env + browser Supabase client
- `GET /api/session/participation` (and optional state endpoint)
- `src/lib/session/realtime.ts` + `SessionLivePanel` on `/session`
- Unit tests for Realtime helpers

**Out of scope:**

- Vote/reveal UI and mutation API (S-01)
- Broadcast channels, polling, custom WebSockets
- Realtime on views
- Multi-room

## Architecture / Approach

```
Browser A/B (authenticated)
  ↓ WebSocket postgres_changes (votes, tasks)
Supabase Realtime
  ↓ event = "refetch"
GET /api/session/participation (server, listParticipation)
  ↓ masked JSON
SessionLivePanel UI (names only pre-reveal)
```

Mutations (insert vote, reveal) happen server-side in S-01; F-02 manual tests may use smoke script or Studio until then.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Realtime publication | `votes` + `tasks` in publication | Missing publication = silent no events |
| 2. Browser client + API | Public env, masked read routes | AGENTS server-only vs client Realtime boundary |
| 3. Sync module + UI | Subscribe, refetch, live panel | Peer story-point leak if payload trusted |

**Prerequisites:** F-01 merged/applied; local or hosted Supabase with migration.

**Estimated effort:** ~2–3 focused sessions across 3 phases.

## Open Risks & Assumptions

- Realtime INSERT payload RLS behavior must be verified; plan assumes refetch-over-payload for peers regardless.
- F-02 manual NFR tests need a task in `voting` — may require smoke script or temporary dev mutation until S-01.
- Production needs `PUBLIC_SUPABASE_*` env vars set on Cloudflare alongside server secrets.

## Success Criteria (Summary)

- Who-voted updates propagate to other clients within ~3s without exposing peer points pre-reveal.
- Reveal propagates to all clients within ~3s with points visible post-reveal.
- Lint, coverage, and build pass; `/session` shows live panel when a task is active.
