<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Session reveal live sync

- **Plan**: context/changes/session-reveal-live-sync/plan.md
- **Scope**: Phase 1–2 of 2 (all completed phases)
- **Date**: 2026-05-29
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | FAIL |

## Findings

### F1 — Repo-wide lint fails despite checked Progress items

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: N/A
- **Detail**: Progress marks 1.1 and 2.1 (`npm run lint` passes) as `[x]`, but `npm run lint` currently exits with 475 errors (e.g. `scripts/sync-roadmap-to-github.mjs` — `process`/`console` not defined, strict TS rules). Changed session files pass targeted `eslint`. `test:coverage` and `build` pass in this review run.
- **Fix**: Either fix lint for `scripts/*.mjs` (add Node globals / separate eslint config) or uncheck Progress lint items until CI-green; do not treat as session-reveal regression without confirming on the implementing commit.
- **Decision**: FIXED — added `scriptsConfig` to `eslint.config.js` (Node globals, disableTypeChecked); `lint:fix` on scripts; prefixed unused `_graphqlRequest`

### F2 — Realtime connect promise lacks error handling

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/session/SessionRoom.tsx:132-149
- **Detail**: `connectSessionRoomRealtime(...).then(...)` has no `.catch()`. If `ensureRealtimeAuth` throws (e.g. rejected `setAuth`) or connect rejects, the badge can stay on "Connecting…" with an unhandled rejection.
- **Fix**: Add `.catch(() => setConnectionStatus("error"))` on the connect promise (optionally set `bannerError`).
- **Decision**: FIXED

### F3 — ensureRealtimeAuth can throw instead of returning false

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/session/realtime-auth.ts:9
- **Detail**: Plan contract says return `boolean`; `await supabase.realtime.setAuth(token)` is uncaught. A rejected promise propagates to callers instead of `false` → error status.
- **Fix**: Wrap `setAuth` in try/catch; return `false` on failure.
- **Decision**: FIXED

### F4 — Missing session does not tear down Realtime channel

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/session/realtime.ts:79-81
- **Detail**: `watchRealtimeAuth` calls `onStatusChange("error")` when session is lost but does not invoke channel cleanup. Stale channel may keep firing refetches with invalid auth.
- **Fix**: Pass combined cleanup into `onMissingSession` or call `stopChannel` inside the auth watcher callback.
- **Decision**: FIXED

### F5 — SECURITY DEFINER vote trigger bypasses tasks RLS

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260528100000_votes_touch_task_for_realtime.sql:4-17
- **Detail**: `touch_task_on_vote_change()` is `SECURITY DEFINER` and updates `tasks.updated_at` without `auth.uid()` checks, bypassing `tasks_update_creator` RLS. Safe while only vote triggers call it; direct `EXECUTE` or reuse would widen blast radius.
- **Fix A ⭐ Recommended**: Document invariant in SQL comment; restrict function `EXECUTE` to service role / revoke `PUBLIC` if applicable.
  - Strength: Preserves Phase 2 Realtime design; minimal code change.
  - Tradeoff: Relies on discipline; does not add runtime auth check inside function.
  - Confidence: HIGH — matches common trigger pattern for cross-row bumps.
  - Blind spot: Haven't audited all roles granted `EXECUTE` in deployed Supabase.
- **Fix B**: Add guard inside function (task exists, status in voting/revealed, caller context)
  - Strength: Defense in depth if function is ever invoked elsewhere.
  - Tradeoff: More SQL complexity; must not break vote INSERT paths.
  - Confidence: MED — need to align with existing RLS and vote flows.
  - Blind spot: Edge cases for DELETE vote on completed task.
- **Decision**: FIXED via Fix A — SQL invariant comment + REVOKE EXECUTE FROM PUBLIC

### F6 — Plan text stale vs session-scoped Realtime implementation

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/lib/session/realtime.ts:64-88
- **Detail**: Phase 1 specifies `connectSessionTaskRealtime`, task-scoped subscribe, and `TOKEN_REFRESHED`-only auth refresh. Implementation uses `connectSessionRoomRealtime`, session channel `planning-session:{id}`, `tasks` UPDATE filter by `session_id`, and `watchRealtimeAuth` on all auth events. Behavior aligns with Phase 2 (votes/new rounds) and commit message; plan "Changes Required" was not updated.
- **Fix**: Update plan Phase 1 addendum (or Phase 2 section) to document session-scoped channel and renamed exports.
- **Decision**: FIXED — plan.md updated (Phase 2 section, connectSessionRoomRealtime, guardrails)

### F7 — Phase 1 guardrail contradicts Phase 2 migration

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Scope Discipline
- **Location**: context/changes/session-reveal-live-sync/plan.md:22-26
- **Detail**: "What We're NOT Doing" lists "DB migration or RLS policy changes". Phase 2 adds `20260528100000_votes_touch_task_for_realtime.sql` (trigger + SECURITY DEFINER function). Progress marks migration done; guardrail text is stale.
- **Fix A ⭐ Recommended**: Amend "What We're NOT Doing" to allow this migration and note RLS unchanged.
  - Strength: Restores single source of truth for reviewers.
  - Tradeoff: Original scope readers may not re-read guardrails.
  - Confidence: HIGH — migration is intentional for vote sync.
  - Blind spot: None significant.
- **Fix B**: Treat migration as out-of-scope follow-up (not recommended — already shipped and manually verified).
  - Strength: Strict scope discipline.
  - Tradeoff: Reverts working Phase 2 behavior.
  - Confidence: LOW — conflicts with completed manual checks 2.5–2.6.
  - Blind spot: Production may already depend on trigger.
- **Decision**: FIXED via Fix A — guardrails amended in plan.md (with F6)

### F8 — Orphaned shouldRefetchOnVoteEvent helper

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/session/realtime.ts:16-18
- **Detail**: Exported and tested, but `subscribeToSessionRoom` only listens to `tasks` UPDATE; vote sync uses migration trigger bumping `tasks.updated_at`.
- **Fix**: Remove helper and tests, or document as intentional legacy for future vote channel.
- **Decision**: SKIPPED

### F9 — connectSessionRoomRealtime path lightly tested

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/session/realtime.ts:25-86
- **Detail**: Coverage report shows `realtime.ts` at 12.5% lines; tests cover pure helpers only, not auth gate, cleanup, or status mapping.
- **Fix**: Add mocked Supabase channel tests for connect/subscribe/cleanup (mirror `realtime-auth.test.ts` style).
- **Decision**: FIXED — connectSessionRoomRealtime tests in realtime.test.ts (88% line coverage on realtime.ts)
