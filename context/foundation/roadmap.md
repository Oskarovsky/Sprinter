---
project: "10xSprinter"
version: 1
status: draft
created: 2026-05-26
updated: 2026-05-30
prd_version: 3
main_goal: speed
top_blocker: capacity
---

# Roadmap: 10xSprinter

> Derived from `context/foundation/prd.md` (v3) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

During Scrum work in a company dev team, there is no web tool that unifies popular Scrum ceremonies in one place. MVP focuses on planning poker in a single shared room: authenticated participants create tasks, vote blindly on story points, and reveal human averages — with optional AI aids (task drafting, divergence coaching) and an optional **Sprinter Analyst** reference vote from a linked GitHub or GitLab repo after reveal. Retro, session history browsing, mobile apps, and multi-room support are explicitly deferred.

## North star

**S-01: blind planning-poker session end-to-end** — Delivers the primary Success Criteria path (login → join session → create task → blind vote → reveal → human average) and proves the core product hypothesis before AI differentiation work.

> **North star** here means the smallest end-to-end slice whose successful delivery would prove the core product hypothesis — placed as early as prerequisites allow because everything else only matters if this works.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | session-data-schema | (foundation) persist sessions, tasks, and votes for the live room | — | FR-003, FR-004, FR-011 | done |
| F-02 | live-session-sync | (foundation) broadcast who-voted and reveal updates within NFR latency | F-01 | FR-007, FR-008, FR-010 | done |
| F-03 | ai-provider-fallback | (foundation) call server-side AI when configured; deterministic fallback otherwise | — | FR-016 | done |
| S-01 | blind-planning-poker | run a full blind planning-poker vote and see the human average after reveal | F-01, F-02 | US-01, FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012 | done |
| S-02 | sprinter-draft-tasks | paste raw notes and apply AI-generated task drafts to the creation form | S-01, F-03 | US-02, FR-013, FR-014, FR-016 | done |
| S-03 | sprinter-coach-prompts | request discussion prompts after reveal when votes diverge | S-01, F-03 | US-03, FR-015, FR-016 | proposed |
| S-04 | sprinter-analyst-vote | link a repo and see a reference-only Analyst story-point vote after reveal | S-01, F-01 | US-04, FR-017, FR-018, FR-019, FR-020, FR-021, FR-022, FR-023 | done |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Core poker & sync | `F-01` → `F-02` → `S-01` | Speed-first path to north star; nothing user-visible until `S-01`. |
| B | AI scaffold | `F-03` → `S-02` | `F-03` can run parallel with `F-02` once `F-01` lands; Draft ships after core poker. |
| C | Coach loop | `S-03` | Joins Stream A at `S-01`; needs revealed votes before Coach is meaningful. |
| D | Analyst & repo | `S-04` | Joins Stream A at `S-01`; ships in MVP after `S-03`; ready for `/10x-plan`. |

## Baseline

What's already in place in the codebase as of `2026-05-26` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — Astro 6 + React 19 + Tailwind 4; shadcn-style Button only (`src/components/ui/button.tsx`, `astro.config.mjs`)
- **Backend / API:** partial — Auth API routes only (`src/pages/api/auth/*`); no session/voting domain routes
- **Data:** partial — Supabase client for auth only; no migrations/schema/seed (`supabase/config.toml`, no `supabase/migrations/`)
- **Auth:** present — Supabase Auth + middleware with email/password and Google OAuth (`src/lib/supabase.ts`, `src/middleware.ts`, `src/pages/api/auth/*`)
- **Deploy / infra:** present — Cloudflare Workers/Pages + GitHub Actions CI/deploy (`wrangler.jsonc`, `.github/workflows/`)
- **Observability:** partial — Cloudflare platform observability only (`wrangler.jsonc`); no app-level logging or error tracking

## Foundations

### F-01: Session data schema

- **Outcome:** (foundation) sessions, tasks, votes, and reveal state persist in Supabase for the single shared room.
- **Change ID:** session-data-schema
- **PRD refs:** FR-003, FR-004, FR-010, FR-011
- **Unlocks:** S-01, S-02, S-04
- **Prerequisites:** —
- **Parallel with:** F-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced first because baseline has no domain schema; every vertical slice depends on persisted session state.
- **Status:** done

### F-02: Live session sync

- **Outcome:** (foundation) who-voted indicators and reveal outcomes propagate to all session participants within NFR latency.
- **Change ID:** live-session-sync
- **PRD refs:** FR-007, FR-008, FR-010
- **Unlocks:** S-01 (NFR verification path for blind voting and ≤3s updates)
- **Prerequisites:** F-01
- **Parallel with:** F-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Real-time sync is load-bearing for US-01 acceptance; without it, blind voting UX fails even if CRUD works.
- **Status:** done

### F-03: AI provider with fallback

- **Outcome:** (foundation) server-side AI calls succeed when configured; deterministic fallback returns the same response shape when AI is unavailable.
- **Change ID:** ai-provider-fallback
- **PRD refs:** FR-016
- **Unlocks:** S-02, S-03
- **Prerequisites:** —
- **Parallel with:** F-01, F-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced before Draft/Coach slices so AI availability does not block core poker; fallback keeps speed path unblocked.
- **Status:** done

## Slices

### S-01: Blind planning-poker session

- **Outcome:** user can register or log in, join the shared session, create a task, vote blindly, reveal votes, and see each participant's human vote plus the calculated human average.
- **Change ID:** blind-planning-poker
- **PRD refs:** US-01, FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012
- **Prerequisites:** F-01, F-02, authenticated user (baseline auth)
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** North star slice — placed immediately after its foundations; deferring it would delay all product validation signal.
- **Status:** done

### S-02: Sprinter Draft task generation

- **Outcome:** user can paste raw notes on the planning session page, receive proposed planning-poker-ready tasks, and apply a chosen draft to the task creation form without auto-submitting.
- **Change ID:** sprinter-draft-tasks
- **PRD refs:** US-02, FR-013, FR-014, FR-016
- **Prerequisites:** S-01, F-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced after north star per speed goal; Draft is prep aid, not core hypothesis proof.
- **Status:** done

### S-03: Sprinter Coach discussion prompts

- **Outcome:** user can request AI-generated discussion questions after reveal when vote spread indicates divergence, without receiving a recommended story-point value.
- **Change ID:** sprinter-coach-prompts
- **PRD refs:** US-03, FR-015, FR-016
- **Prerequisites:** S-01, F-03
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Depends on reveal flow from S-01; Coach before reveal would violate blind-voting guardrails.
- **Status:** proposed

### S-04: Sprinter Analyst reference vote

- **Outcome:** session facilitator can link one GitHub or GitLab repository (public or private); after reveal, all participants see a visually distinct reference-only Analyst story-point vote and rationale excluded from the human average.
- **Change ID:** sprinter-analyst-vote
- **PRD refs:** US-04, FR-017, FR-018, FR-019, FR-020, FR-021, FR-022, FR-023
- **Prerequisites:** S-01, F-01
- **Parallel with:** S-03 (sequenced after S-03 in MVP delivery order)
- **Blockers:** —
- **Decisions (2026-05-30):**
  - **Repository auth:** GitHub and GitLab OAuth apps for private repos; public repos need no token. When linking a repo to the session, the facilitator chooses public vs private access mode. Persist linked-repo credentials and a server-side repo snapshot/index per facilitator so repeat sessions on the same repo reuse cached context instead of re-fetching the full tree each time.
  - **Task-to-code scope:** Title/description inference plus an optional **affected paths/modules** field on the task form; hints narrow analysis when provided.
  - **GitLab scope:** `gitlab.com` and self-managed instances — facilitator supplies the instance base URL (e.g. `gitlab.mycompany.com`).
  - **MVP timeline:** Sprinter Analyst stays in the 3-week after-hours MVP; ship after S-03 (Coach).
- **Unknowns:** —
- **Risk:** OAuth app registration, self-hosted GitLab URL validation, and repo snapshot caching add integration surface; plan should scope a minimal cache (metadata + targeted file reads) before full-tree indexing.
- **Status:** done

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | session-data-schema | Add session/task/vote schema for live planning room | yes | Unblocks north star `S-01` |
| F-02 | live-session-sync | Wire live who-voted and reveal sync | no | Depends on F-01 |
| F-03 | ai-provider-fallback | Server-side AI provider with deterministic fallback | yes | Can plan in parallel with F-01/F-02 |
| S-01 | blind-planning-poker | End-to-end blind planning-poker session | no | Depends on F-01, F-02 |
| S-02 | sprinter-draft-tasks | Sprinter Draft — generate tasks from pasted notes | no | Depends on S-01, F-03 |
| S-03 | sprinter-coach-prompts | Sprinter Coach — divergence discussion prompts | no | Depends on S-01, F-03 |
| S-04 | sprinter-analyst-vote | Sprinter Analyst — repo-linked reference vote | yes | OAuth + public/private choice; path hints; self-hosted GitLab; after S-03 |

## Open Roadmap Questions

1. **target_scale ballparks** — Input specifies `users: small` (~10 users on one dev team). `qps` and `data_volume` ballparks were not captured. Owner: user. Block: roadmap-wide (informing capacity assumptions, not blocking delivery).

## Resolved Roadmap Questions

2. **Repository auth mechanism** — **Resolved 2026-05-30:** GitHub/GitLab OAuth for private repos; public repos without token; facilitator picks public vs private when linking. Reuse persisted repo credentials and server-side snapshot/index across sessions on the same repo to avoid full re-fetch each time.
3. **Task-to-code scope** — **Resolved 2026-05-30:** Title/description inference plus optional affected-path hints on the task form.
4. **GitLab self-hosted** — **Resolved 2026-05-30:** `gitlab.com` and self-managed instances; facilitator supplies instance base URL.
5. **MVP timeline impact** — **Resolved 2026-05-30:** Analyst stays in MVP; deliver after S-03 within the 3-week after-hours budget.

## Parked

- **Session history UI** — Why parked: PRD §Non-Goals; storage serves the live session only in MVP.
- **Retro ceremonies** — Why parked: PRD §Non-Goals; planning poker only for MVP.
- **Native mobile apps** — Why parked: PRD §Non-Goals; desktop browser only.
- **Custom story-point algorithm** — Why parked: PRD §Non-Goals; standard Fibonacci-style scale with human average only.
- **Local project paths for Analyst** — Why parked: PRD §Non-Goals; external GitHub/GitLab URLs only (FR-023 enforced in S-04 when unblocked).
- **Multi-room / multi-team support** — Why parked: PRD §Non-Goals and FR-003 single-room trade-off.

## Done

- **S-04: session facilitator can link one GitHub or GitLab repository (public or private); after reveal, all participants see a visually distinct reference-only Analyst story-point vote and rationale excluded from the human average.** — Archived 2026-05-30 → `context/archive/2026-05-30-sprinter-analyst-vote/`. Lesson: —.
- **S-02: user can paste raw notes on the planning session page, receive proposed planning-poker-ready tasks, and apply a chosen draft to the task creation form without auto-submitting.** — Archived 2026-05-29 → `context/archive/2026-05-29-sprinter-draft-tasks/`. Lesson: —.
- **F-03: (foundation) server-side AI calls succeed when configured; deterministic fallback returns the same response shape when AI is unavailable.** — Archived 2026-05-29 → `context/archive/2026-05-29-ai-provider-fallback/`. Lesson: —.
- **S-01: user can register or log in, join the shared session, create a task, vote blindly, reveal votes, and see each participant's human vote plus the calculated human average.** — Archived 2026-05-28 → `context/archive/2026-05-28-s-01/`. Lesson: —.
- **F-02: (foundation) who-voted indicators and reveal outcomes propagate to all session participants within NFR latency.** — Archived 2026-05-27 → `context/archive/2026-05-27-live-session-sync/`. Lesson: —.
- **F-01: (foundation) sessions, tasks, votes, and reveal state persist in Supabase for the single shared room.** — Archived 2026-05-27 → `context/archive/2026-05-27-gate-product-routes/`. Lesson: —.
