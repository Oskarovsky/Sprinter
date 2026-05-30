# S-04 Sprinter Analyst Reference Vote — Plan Brief

> Full plan: `context/changes/sprinter-analyst-vote/plan.md`

## What & Why

S-04 delivers **Sprinter Analyst**: the session facilitator links a GitHub or GitLab repo (public or OAuth-authorized private), and after reveal every participant sees a visually distinct **reference-only** story-point vote with rationale — excluded from the human average (US-04, FR-017–FR-023).

## Starting Point

S-01 provides blind voting, reveal, and human average in `SessionRoom`. F-03 provides OpenRouter JSON AI with fallback for Draft/Coach. Schema has `tasks`, `votes`, `planning_sessions` — no repo columns, no Analyst storage. Coach API exists (`POST /api/ai/coach`) but Coach UI is not shipped yet (S-03). Google SSO auth exists; no GitHub/GitLab repo OAuth.

## Desired End State

Facilitator opens a **Link repository** modal, adds a repo to their personal library (public verify or OAuth for private), and sets it as the active repo for the planning session. Task create form gains optional **Affected paths** (multiline). When voting starts, Analyst runs asynchronously and seals a result. On reveal, participants see human votes + average plus a separate **Sprinter Analyst (reference)** card. Failures omit Analyst output without blocking poker.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Repo persistence | Facilitator repo library + session active link | Reuses OAuth tokens and tree cache across sessions on the same repo | Roadmap + Plan |
| Private repo auth | App-level GitHub/GitLab OAuth apps | Best UX for private repos; matches resolved roadmap Q2 | Roadmap + Plan |
| Token storage | Supabase tables; tokens server-only via service role | Keeps tokens off client; fits existing Supabase stack | Plan |
| Repo cache | Tree metadata + on-demand file reads | Balances reuse, freshness, and API cost | Roadmap + Plan |
| Analyst timing | Async on `start-voting`; sealed before reveal | Satisfies FR-020 without blocking reveal UX | Plan |
| Analyst storage | `analyst_votes` table per task | Clean lifecycle; RLS mirrors blind-vote pattern | Plan |
| Path hints | Multiline textarea on task form | Flexible globs/paths; matches FR-004 | Roadmap + Plan |
| GitLab self-hosted | Facilitator-supplied HTTPS base URL | Supports enterprise GitLab per roadmap Q4 | Roadmap + Plan |
| Analysis budget | ~50 files / ~1MB cap | Richer signal while staying within Worker limits | Plan |
| Failure mode | Omit Analyst silently | Graceful degradation per US-04 | Plan |
| Repo UI | Modal from toolbar button | User preference over header panel | Plan |
| Reveal UI | Separate reference card below human average | Clear FR-021/FR-022 separation | Plan |
| OAuth callbacks | Dedicated `/api/repo/*/callback` routes | Isolated from Supabase user auth callback | Plan |
| Link permission | Any authenticated user can link; linker manages | Flat roles + facilitator usage pattern | PRD + Plan |
| AI shape | OpenRouter JSON → Fibonacci point + rationale | Reuses F-03 infrastructure | Plan |
| OAuth secrets | Astro env schema (`GITHUB_*`, `GITLAB_*`) | AGENTS.md secret scoping | Plan |
| MVP scope | In MVP after S-03 | Confirmed 2026-05-30 | Roadmap |

## Scope

**In scope:**

- Migrations: repo connections, session link, tree cache, analyst votes, `tasks.affected_paths`
- GitHub + GitLab OAuth (gitlab.com + self-hosted base URL)
- Repo library + session active repo APIs
- Tree cache + capped file fetch + Analyst OpenRouter pipeline
- `start-voting` async Analyst trigger (`waitUntil`)
- Repo link modal, path hints field, Analyst reference card
- Unit tests for parsers, file selection, Analyst normalizer; integration tests for API validation
- Env/deploy docs for OAuth app registration

**Out of scope:**

- Sprinter Coach UI (S-03)
- Local filesystem paths (FR-023 non-goal)
- Full-repo clone or Supabase Storage snapshots
- Analyst vote in human average
- Analyst output before reveal
- Session history / multi-room
- Per-facilitator OAuth app credentials
- PAT-based auth (rejected in roadmap)

## Architecture / Approach

```
RepoLinkModal → POST /api/repo/link (library + session active link)
              → GET  /api/repo/oauth/github|gitlab/start
              → GET  /api/repo/oauth/*/callback → tokens in repo_oauth_tokens (service role)

Create task (title, description, affectedPaths?)
Start voting → start-voting API → waitUntil(runAnalystForTask)
              → cache tree → select paths → fetch files (≤50 / ≤1MB)
              → OpenRouter JSON → analyst_votes (sealed)

Reveal → session state includes analyst payload when task revealed
       → SessionRoom shows AnalystReferenceCard (not in average)
```

Server reads OAuth tokens only via service-role Supabase client. Browser uses safe views/APIs without token columns.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Schema & RLS | Tables, migrations, types, blind-safe policies | Token table must never leak to browser client |
| 2. OAuth & repo providers | Env schema, authorize/callback, public/private verify | Self-hosted GitLab redirect URL validation |
| 3. Cache & Analyst engine | Tree cache, file selection, OpenRouter analyst, start-voting hook | Worker timeout if analysis not backgrounded |
| 4. Repo & session APIs | Library CRUD, session link, analyst in state API | Service role key required in deploy |
| 5. Session UI & tests | Modal, path hints, reference card, coverage | SessionRoom complexity; modal discoverability |

**Prerequisites:** S-01, F-01, F-03 done; GitHub/GitLab OAuth apps registered; `SUPABASE_SERVICE_ROLE_KEY` added for deploy.

**Estimated effort:** ~4–6 focused after-hours sessions across 5 phases.

## Open Risks & Assumptions

- Fast reveal before Analyst completes → no Analyst card (acceptable per graceful degradation).
- OpenRouter + Git provider API latency may exceed 3s NFR for Analyst *completion*, but reveal still returns human results immediately; Analyst appears on next state refetch when ready (document in manual QA).
- `SUPABASE_SERVICE_ROLE_KEY` is a new server secret — must not reach client bundle.
- Self-hosted GitLab OAuth may require instance-specific app registration; document operator steps.
- F-03 fallback pattern for Analyst: **omit** rather than fake vote (differs from Draft/Coach).

## Success Criteria (Summary)

- Facilitator links public or private GitHub/GitLab repo; team sees reference Analyst vote after reveal, excluded from average.
- Blind voting unchanged; tokens and Analyst points never visible before reveal.
- Human reveal succeeds when repo/AI fails.
- `npm run lint`, `npm run test:coverage`, and `npm run build` pass.
