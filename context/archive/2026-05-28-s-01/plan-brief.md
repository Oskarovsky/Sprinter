# S-01 Blind Planning-Poker Session — Plan Brief

> Full plan: `context/changes/s-01/plan.md`

## What & Why

Deliver the **north star** slice: authenticated users join the shared room, create a task, vote blindly on Fibonacci story points, reveal, and see sorted human votes plus the **human team average**. This proves the core product hypothesis (US-01) on top of F-01 schema and F-02 live sync.

## Starting Point

On `origin/m2l2`: Supabase migrations + RLS, `src/lib/session/*` repositories, masked GET `/api/session/state`, Realtime + `SessionLivePanel` on `/session`. **Mutations and poker UI were explicitly deferred to S-01.** Branch `s01` must merge/rebase onto `m2l2` (or `master` + merged F-02 PR) before implementation.

## Desired End State

A facilitator creates a task, starts voting, participants pick points from a Fibonacci grid (changeable before reveal), everyone sees who voted without peer points until reveal, the creator reveals, and all clients show sorted votes + 1-decimal human average within F-02 Realtime NFR. Display names only — no emails in session UI.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Page structure | Unified `SessionRoom` React island | Single cohesive poker UX; absorbs live sync | Plan |
| Active task | Latest `voting`/`revealed` only | Matches F-02 `getLatestActiveTask`; MVP single-room | Plan |
| Display name | Inline gate on `/session` if missing/default | FR: names not emails; minimal friction | Plan |
| Task lifecycle | Create (draft) → Start voting (separate) | Matches FR-005 + existing `startVoting` repo | Plan |
| Vote UI | Fibonacci button grid | Fast desktop UX; matches scale in schema | Plan |
| Average | Arithmetic mean, 1 decimal | PRD human average; simple MVP | Plan |
| Post-reveal | Stay revealed; "New task" for next cycle | Readable outcome; no history UI | Plan |
| Mutations | JSON REST `/api/session/*` | Consistent with GET state; React fetch | Plan |
| Vote changes | Upsert allowed before reveal | Existing `castVote` upsert | Plan |
| Revealed sort | By `story_points` ascending | PRD sorted list | Plan |
| Reveal permission | **Task creator only** | FR-008 + repo `.eq("created_by")` guard | PRD (overrides planning poll) |
| Errors | Inline banner in SessionRoom | No new toast dependency | Plan |

## Scope

**In scope:** Profile gate, task create/start-voting/vote/reveal APIs, human average helper, unified SessionRoom UI, dashboard → `/session` link, unit tests for average + auth guards, two-browser manual protocol.

**Out of scope:** Sprinter Draft/Coach/Analyst (S-02–S-04), session history UI, multi-room, task list browser, mobile layout polish, Analyst average exclusion (no Analyst in S-01).

## Architecture / Approach

```
Browser SessionRoom (client:load)
  → JSON POST mutations (server repos + RLS)
  → GET /api/session/state (masked participation + average when revealed)
  → Supabase Realtime signal → refetch state (F-02 pattern)
```

Server-only Supabase for mutations; browser never reads peer points from Realtime payloads.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Prerequisites merge | `s01` branch contains F-01+F-02 code | Branch drift if PR #16 not merged |
| 2. Mutation API + average | POST routes + `computeHumanAverage` + extend GET state | Creator-only reveal 403 UX |
| 3. SessionRoom UI | Profile gate, forms, Fibonacci grid, facilitator controls, live sync | Realtime env vars missing locally |
| 4. Polish & verification | Dashboard link, tests, manual two-browser checklist | Scope creep into S-02 |

**Prerequisites:** F-01 + F-02 merged; `PUBLIC_SUPABASE_*` in `.dev.vars`; local Supabase running.  
**Estimated effort:** ~3–4 focused sessions across 4 phases.

## Open Risks & Assumptions

- Planning poll chose "anyone reveal"; **plan follows PRD FR-008 (creator-only)** — repository already enforces `created_by`.
- Default profile names (`User xxxxxxxx`) may need detection heuristic for the display-name gate.
- `s01` branch currently lacks foundation code — Phase 1 is mandatory before coding.

## Success Criteria (Summary)

- US-01 path works end-to-end without SQL/smoke scripts for normal use.
- Blind voting holds: peer points hidden pre-reveal; refresh does not leak.
- Reveal shows sorted votes + human average (1 decimal) on all clients ≤3s via Realtime refetch.
