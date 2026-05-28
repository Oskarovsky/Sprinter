<!-- PLAN-REVIEW-REPORT -->
# Plan Review: F-01 Session Data Schema + Gate Product Routes

- **Plan**: `context/changes/gate-product-routes/plan.md`
- **Mode**: Deep
- **Date**: 2026-05-27
- **Verdict**: REVISE
- **Findings**: 0 critical, 5 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING ⚠️ |
| Lean Execution | PASS ✅ |
| Architectural Fitness | WARNING ⚠️ |
| Blind Spots | WARNING ⚠️ |
| Plan Completeness | WARNING ⚠️ |

## Grounding

Grounding: 5/5 existing paths ✓, 2/2 symbols ✓, brief↔plan ✓ (planned new paths `src/lib/session/*`, `src/pages/session.astro` correctly absent pre-implement)

Progress↔Phase consistency: PASS — one `## Progress` block; 3 phases matched; 16/16 success-criteria bullets mirrored as progress steps.

## Findings

### F1 — README actively contradicts migration work

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: End-State Alignment
- **Location**: Phase 1 §2 Local verification script note; `README.md:114`
- **Detail**: Plan says update README "only if missing Supabase migration instructions", but `README.md` already states: "No database tables or migrations are required — this project uses Supabase Auth's built-in `auth.users` table only." Implementer following Phase 1 literally may skip the README edit, leaving onboarding docs wrong after F-01 ships.
- **Fix A ⭐ Recommended**: Make README update mandatory in Phase 1 — replace the auth-only sentence with migration apply steps (`supabase db reset` / `db push`) and note domain tables added by F-01.
  - Strength: Closes promise gap; matches post-F-01 reality; aligns with Migration Notes.
  - Tradeoff: Touches docs outside `context/changes/` (acceptable for deploy/onboarding truth).
  - Confidence: HIGH — line 114 is explicit contradiction.
  - Blind spot: Cloud vs local Supabase paths both need a one-line pointer.
- **Fix B**: Defer README to a separate docs change after implement
  - Strength: Keeps F-01 diff code-focused.
  - Tradeoff: Contributors hit wrong instructions until follow-up lands.
  - Confidence: HIGH.
  - Blind spot: Follow-up may never ship.
- **Decision**: PENDING

### F2 — Profile bootstrap never wired in any phase

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2 `ensureProfile`; Phase 3 stub; Migration Notes
- **Detail**: Plan adds `profiles.display_name` and `vote_participation` joins profiles, but `ensureProfile` is only defined in Phase 2 — not called from auth callback (`src/pages/api/auth/callback.ts`, `signup.ts` have no profile upsert) or `session.astro` stub. Phase 2 manual smoke is optional. First real usage in S-01 may fail FK/join gaps for existing auth users.
- **Fix A ⭐ Recommended**: Add Phase 3 (or Phase 2) contract — call `ensureProfile` in `session.astro` frontmatter on first authenticated visit (derive display_name from user metadata/email local-part).
  - Strength: Minimal wiring; satisfies Migration Notes without expanding S-01.
  - Tradeoff: Profile created on `/session` visit, not at signup — acceptable for MVP.
  - Confidence: HIGH — auth routes currently create no profile rows.
  - Blind spot: Google SSO display name metadata shape varies.
- **Fix B**: Document explicitly that profile bootstrap is S-01 scope only; add nullable display_name fallback in view (`coalesce(display_name, 'Participant')`)
  - Strength: F-01 stays schema-only.
  - Tradeoff: S-01 must remember bootstrap; view still needs coalesce in migration.
  - Confidence: MED.
  - Blind spot: Anonymous-looking voters until S-01.
- **Decision**: PENDING

### F3 — Vote replace semantics unspecified

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 votes table; Phase 2 `castVote`
- **Detail**: `votes` has `UNIQUE (task_id, user_id)` but `castVote` contract doesn't say INSERT vs UPSERT. US-01 implies participants select story points — typically changeable before reveal. Without UPDATE/ON CONFLICT policy, second vote fails or requires delete-first logic undefined in plan.
- **Fix**: Specify `castVote` uses upsert on `(task_id, user_id)` allowed only while parent task `status = 'voting'`; add matching RLS UPDATE policy in Phase 1 migration contract.
- **Decision**: PENDING

### F4 — Middleware test plan references non-exported constant

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 3 §4 Middleware test
- **Detail**: Plan suggests asserting `PROTECTED_ROUTES` includes `"/session"`, but `PROTECTED_ROUTES` is module-private in `src/middleware.ts:4` (not exported). Test either duplicates the array or requires export/refactor not specified.
- **Fix**: Either export `PROTECTED_ROUTES` from `middleware.ts` for test import, or change contract to integration-style test (request to `/session` without auth expects redirect) — pick one explicitly in Phase 3.
- **Decision**: PENDING

### F5 — F-02 Realtime handoff risk on `vote_participation` view

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Architectural Fitness
- **Location**: Critical Implementation Details; Phase 1 view contract
- **Detail**: Plan states F-02 can subscribe to `vote_participation` for "who voted" safely. Supabase Realtime `postgres_changes` targets tables, not views — F-02 may need to subscribe to `votes` inserts and mask story_points in app layer, or use a different channel design. F-01 schema choices should document this constraint so F-02 doesn't inherit a dead end.
- **Fix A ⭐ Recommended**: Add one sentence to Critical Implementation Details: F-02 Realtime listens on `votes` table INSERT events; clients never SELECT raw `votes.story_points` for peers pre-reveal — use server/API masking or participation endpoint.
  - Strength: Matches Supabase Realtime capabilities; RLS on `votes` remains load-bearing.
  - Tradeoff: F-02 cannot rely on view subscriptions — minor plan adjustment downstream.
  - Confidence: HIGH — Realtime filters are table-scoped in Supabase docs.
  - Blind spot: Exact Supabase Realtime RLS behavior on INSERT payloads should be verified in F-02 spike.
- **Fix B**: Replace view with security-definer RPC returning masked rows for both REST and Realtime triggers
  - Strength: Single masking logic.
  - Tradeoff: More SQL complexity in F-01; RPC + Realtime wiring is non-trivial.
  - Confidence: MED.
  - Blind spot: RPC doesn't emit Realtime events by itself.
- **Decision**: PENDING

### F6 — Repository layer untested in CI

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 Success Criteria; Testing Strategy
- **Detail**: Automated verification covers `constants.test.ts` only; `tasks.ts` / `votes.ts` / `profile.ts` have no tests. Acceptable for foundation slice, but Phase 2 end state ("server modules expose typed helpers") is only manually smoke-tested optionally.
- **Fix**: Accept for F-01 or add one lightweight test file mocking Supabase client for `isValidStoryPoint` + task status transition guards if extracted as pure functions.
- **Decision**: PENDING

### F7 — Migrations not verified in CI

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 Automated Verification; plan-brief Open Risks
- **Detail**: CI runs lint/test/build only (`.github/workflows/ci.yml`); `supabase db reset` is manual. First migration could SQL-error in production without automated gate — already noted in brief; no action required for F-01 if accepted.
- **Fix**: Accept risk for MVP or add optional CI job with Supabase CLI + Docker (out of F-01 scope).
- **Decision**: PENDING
