# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-02

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|---|---|---|---|
| 1 | Incorrect vote calculation after reveal | High | High | interview Q1, hot-spot dir `src/components/session/` |
| 2 | Authentication (login/signup) failures | High | Medium | interview Q1, PRD §Access Control |
| 3 | Incorrect or corrupt AI responses for estimations | High | High | interview Q2, interview Q3, hot-spot dir `src/lib/ai/` |
| 4 | Failures in reading files from linked repositories | High | Medium | interview Q2, PRD §US-04 |
| 5 | External API (OpenRouter) failures for AI features | Medium | High | interview Q4, `tech-stack.md` |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|---|---|---|---|---|---|
| #1 | Vote average is correct for all users after reveal. | Assuming happy-path voting only. | Session state management, vote aggregation logic. | integration | Copied production calculation. |
| #2 | Users can reliably log in and sign up. | Assuming only happy-path authentication. | Auth flows for email/pass and Google SSO. | integration | Over-mocking external providers. |
| #3 | AI provides accurate estimations without corruption. | Assuming AI will always return a valid response. | AI provider integration, response parsing logic. | integration | Happy-path-only testing. |
| #4 | The system can reliably read files from linked repos. | Assuming repository access is always available. | Repo fetching and file parsing logic. | integration | Brittle order assumption. |
| #5 | The system is resilient to OpenRouter API failures. | Assuming the external API is always available and fast. | Error handling and fallback mechanisms for OpenRouter. | integration | No-op catch blocks. |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Critical-path coverage | Defend against core logic and auth failures. | #1, #2 | integration | change opened | context/changes/testing-critical-path-coverage |
| 2 | AI and Repository Integration | Ensure AI estimations and repo file reading are robust. | #3, #4 | integration | not started | — |
| 3 | External API Hardening | Harden the integration with the OpenRouter API. | #5 | integration | not started | — |

## 4. Stack

The classic test base for this project.

| Layer | Tool | Version | Notes |
|---|---|---|---|
| unit + integration | Vitest | v1.6.0 | Used for unit and integration tests. |
| API mocking | none yet — see Phase 3 | | |
| e2e | none yet | | |
| accessibility | none yet | | |

**Stack grounding tools (current session):**
- Docs: none
- Search: none
- Runtime/browser: none
- Provider/platform: none

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.

| Gate | Where | Required? | Catches |
|---|---|---|---|
| lint + typecheck | local + CI | required | syntactic / type drift |
| unit + integration | local + CI | required after §3 Phase 1 | logic regressions |
| e2e on critical flows | CI on PR | required after §3 Phase 1 | broken critical user paths |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase <N>."

### 6.1 Adding a unit test

- **Location**: next to the unit under test, e.g., `src/lib/session/`.
- **Naming**: `<module>.test.ts`, e.g. `average.test.ts` if testing `average.ts`.
- **Reference test**: See the "Average Calculation" tests in `src/lib/session/calculation.test.ts`.
- **Run locally**: `npm test -- src/lib/session/calculation.test.ts`.

### 6.2 Adding an integration test

An integration test verifies a piece of logic against a real dependency, like a database.

- **Location**: In a test file for the feature, e.g. `src/lib/session/calculation.test.ts` for session logic.
- **Setup**: Use `beforeAll` to create necessary test data (e.g., users, sessions, tasks) in the local test database. Use `afterAll` to clean up all created data.
- **Database Client**: Use the `supabaseAdmin` client, which has service role privileges to bypass RLS for test setup.
- **Reference test**: See the "listParticipation" test in `src/lib/session/calculation.test.ts`.
- **Run locally**: `npm run test:integration -- src/lib/session/calculation.test.ts`.

### 6.3 Adding a test for a new API endpoint

Testing API endpoints directly can be brittle, especially when they involve complex authentication or orchestration logic. The preferred approach is to test the underlying business logic functions directly with a combination of unit and integration tests (see above).

However, for simple, self-contained API endpoints (like authentication), you can test the handler directly by mocking its context.

- **Location**: `src/pages/api/.../endpoint.test.ts`.
- **Strategy**: Mock the `APIContext` object and the Supabase client (`@/lib/supabase`). Call the exported handler function directly and assert on the mocked calls.
- **Reference test**: `src/pages/api/auth/auth.test.ts`.
- **Run locally**: `npm run test:integration -- src/pages/api/auth/auth.test.ts`.

### 6.4 Adding an e2e test

- TBD — see §3 Phase 1.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5).

- **UI appearance/style** — Does not justify the cost. Re-evaluate if the product becomes heavily design-focused. (Source:
  Phase 2 interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-02
- Stack versions last verified: 2026-06-02
- AI-native tool references last verified: 2026-06-02

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
