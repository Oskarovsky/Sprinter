# F-03 AI Provider with Fallback — Implementation Plan

## Overview

Implement roadmap **F-03** (`ai-provider-fallback`): a server-side OpenRouter integration with deterministic Draft and Coach fallbacks, shared response types, and authenticated API routes. Unblocks **S-02** (Sprinter Draft UI) and **S-03** (Sprinter Coach UI) without shipping product UI in this change.

**Roadmap refs:** F-03 · **PRD refs:** FR-016 (foundation); shapes contracts for US-02/US-03 · **Prerequisites:** S-01 complete (auth + session APIs exist)

## Current State Analysis

- **No AI code:** No `src/lib/ai/`, no OpenRouter client, no `@ai-sdk/*` or `openai` dependency (`package.json`).
- **No AI env:** `astro.config.mjs` defines Supabase secrets only; `OPENROUTER_API_KEY` is deferred in `context/deployment/deploy-plan.md`.
- **Established patterns:** Session APIs use `requireSessionAuth` + `jsonResponse` (`src/lib/session/api-json.ts`); config gaps surface via `src/lib/config-status.ts`; server-only secrets via Astro env schema per `AGENTS.md`.
- **Infra constraints:** Cloudflare Workers (`workerd`) — prefer native `fetch`, dedicated API routes for OpenRouter calls, 8s timeout to avoid hung isolates; keep keys server-side (`context/foundation/infrastructure.md`).

### Key Discoveries

- `src/pages/api/session/tasks.ts` — canonical POST JSON route pattern to follow for `/api/ai/*`.
- `src/lib/config-status.ts` — extend with OpenRouter entry (informational; fallback works without key).
- Middleware protects pages via `PROTECTED_ROUTES` only — API routes are **not** auto-protected; each AI route must call `requireSessionAuth` and return 401 JSON.
- Roadmap F-03 is parallel-safe with F-01/F-02; S-01 is **done** — foundation can land independently of Draft/Coach UI.

## Desired End State

After this change:

1. `OPENROUTER_API_KEY` is declared in Astro env schema (server secret, optional) and documented in `.env.example`.
2. `src/lib/ai/` exposes typed Draft and Coach generators that call OpenRouter when configured, otherwise deterministic fallbacks.
3. Every response includes `source: "ai" | "fallback"`; fallback responses include a human-readable `warning` string.
4. AI failures (timeout, HTTP error, malformed JSON) silently fall back — never block the caller with 503 when fallback can serve.
5. `POST /api/ai/draft` and `POST /api/ai/coach` require authentication, validate input, and return the shared response shapes.
6. Coach route rejects non-divergent vote spreads with 400 before calling AI/fallback.
7. Unit tests cover fallbacks, divergence logic, OpenRouter client (mocked fetch), and route handlers; CI passes lint, coverage, and build without a live API key.

**Verify:** With no key set, authenticated POST to draft returns heuristic drafts + `source: "fallback"`. With key set, same route returns AI drafts (manual). Coach returns template questions when key absent; returns 400 when votes are not divergent.

## What We're NOT Doing

- Sprinter Draft UI (paste notes panel, “Use this task” flow) — **S-02**
- Sprinter Coach UI (post-reveal panel, divergence UX) — **S-03**
- Sprinter Analyst / repo analysis — **S-04**
- Streaming responses, prompt tuning UI, or model selection from client
- Database schema changes or persistence of notes/prompts
- Adding AI routes to `PROTECTED_ROUTES` (JSON 401 via `requireSessionAuth`, not redirect)
- Live OpenRouter calls in CI
- Retry logic beyond single attempt + fallback

## Implementation Approach

Add optional `OPENROUTER_API_KEY` to Astro env schema. Create `src/lib/ai/` with: shared types, config helper, OpenRouter `fetch` client (hardcoded default model, 8s `AbortSignal` timeout), heuristic Draft fallback, template Coach fallback, and divergence helper. Implement `generateDraftFromNotes` and `generateCoachPrompts` orchestrators that try AI when configured and always degrade to fallback on any failure. Expose two authenticated POST API routes under `src/pages/api/ai/`. Cover pure logic and routes with Vitest mocks — no new npm dependencies.

## Critical Implementation Details

**Workers-safe HTTP only:** Implement OpenRouter via native `fetch` to `https://openrouter.ai/api/v1/chat/completions`. Do not add SDKs that pull in unsupported Node APIs. Verify with `npm run build` after any new import.

**JSON contract:** Prompt OpenRouter for JSON matching the TypeScript types; parse response content with `JSON.parse` inside try/catch. Any parse failure or schema mismatch triggers fallback — same path as missing key.

**Dedicated routes:** Keep OpenRouter calls in `/api/ai/*` handlers only — not in Astro page frontmatter SSR chains — per infra CPU-limit guidance.

## Phase 1: Environment and configuration

### Overview

Wire optional OpenRouter secret through Astro env schema and developer-facing config docs.

### Changes Required:

#### 1. Astro env schema

**File**: `astro.config.mjs`

**Intent**: Allow server routes to read `OPENROUTER_API_KEY` via `astro:env/server` without `process.env`.

**Contract**: Add `OPENROUTER_API_KEY: envField.string({ context: "server", access: "secret", optional: true })`.

#### 2. Environment example

**File**: `.env.example`

**Intent**: Document optional OpenRouter key for local AI testing.

**Contract**: Add commented `# OPENROUTER_API_KEY=` line with brief note that app works without it (fallback mode).

#### 3. Config status entry

**File**: `src/lib/config-status.ts`

**Intent**: Surface AI availability alongside Supabase in support/dashboard contexts.

**Contract**: Import `OPENROUTER_API_KEY` from `astro:env/server`; append entry `{ name: "OpenRouter", configured: Boolean(OPENROUTER_API_KEY), message: "…" }` — informational only; missing key is not an error state.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- App starts with `npm run dev` when `OPENROUTER_API_KEY` is unset
- `configStatuses` shows OpenRouter as unconfigured when key absent

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: AI library layer

### Overview

Implement types, OpenRouter client, fallback generators, divergence helper, and orchestrator functions consumed by API routes.

### Changes Required:

#### 1. Shared types

**File**: `src/lib/ai/types.ts`

**Intent**: Define stable contracts for S-02/S-03 and API responses.

**Contract**: Export `AiSource = "ai" | "fallback"`; `DraftTaskDraft` `{ title: string; description: string; acceptanceCriteria: string[]; openQuestions: string[] }`; `DraftResult` `{ source: AiSource; warning?: string; drafts: DraftTaskDraft[] }`; `CoachResult` `{ source: AiSource; warning?: string; summary: string; questions: string[] }`; input types `DraftInput { notes: string }` and `CoachInput { taskTitle: string; taskDescription?: string; votes: number[] }`.

#### 2. Config and model defaults

**File**: `src/lib/ai/config.ts`

**Intent**: Centralize AI availability check, default model, timeout, and fallback warning copy.

**Contract**: Export `isAiConfigured(): boolean`; `DEFAULT_OPENROUTER_MODEL` (hardcoded, e.g. `openai/gpt-4o-mini`); `OPENROUTER_TIMEOUT_MS = 8000`; `FALLBACK_WARNING_DRAFT` and `FALLBACK_WARNING_COACH` Polish or English strings consistent with existing UI locale (match `config-status.ts` Polish or use English if session UI is English — follow `SessionRoom` locale).

#### 3. Divergence helper

**File**: `src/lib/ai/divergence.ts`

**Intent**: Enforce US-03 guardrail server-side before Coach generation.

**Contract**: Export `isDivergent(votes: number[]): boolean` — true when `votes.length >= 2` AND (`max - min >= 3` OR (`min > 0` AND `max >= 2 * min`)). Pure function, unit-tested.

#### 4. OpenRouter client

**File**: `src/lib/ai/openrouter.ts`

**Intent**: Call OpenRouter chat completions via `fetch` with timeout and structured error handling.

**Contract**: Export async `completeJson<T>(systemPrompt: string, userPrompt: string): Promise<T | null>`. POST to OpenRouter API with `Authorization: Bearer`, `response_format: { type: "json_object" }` if supported, model from config. Use `AbortSignal.timeout(OPENROUTER_TIMEOUT_MS)`. Return `null` on any failure (network, non-2xx, empty content, JSON parse error). Never throw to callers.

#### 5. Draft fallback

**File**: `src/lib/ai/fallback/draft.ts`

**Intent**: Deterministic Draft output when AI unavailable (FR-016, US-02 AC).

**Contract**: Export `fallbackDraftFromNotes(notes: string): DraftTaskDraft[]`. Split notes on blank lines into blocks; per block: first non-empty line → `title`, remaining lines → `description`; `acceptanceCriteria` and `openQuestions` default to `[]`. If no blocks, one draft with title from first 80 chars of trimmed notes. Trim all strings; omit empty titles (merge into description if needed).

#### 6. Coach fallback

**File**: `src/lib/ai/fallback/coach.ts`

**Intent**: Deterministic Coach output when AI unavailable (US-03 AC).

**Contract**: Export `fallbackCoachPrompts(input: CoachInput): CoachResult`. Build `summary` referencing task title and vote min/max/spread. Return exactly 4–5 fixed template questions (scope, assumptions, edge cases, dependencies, acceptance) with vote context interpolated. Set `source: "fallback"` and `warning`.

#### 7. Draft orchestrator

**File**: `src/lib/ai/generate-draft.ts`

**Intent**: Try AI then fallback for note-to-drafts generation.

**Contract**: Export `generateDraftFromNotes(input: DraftInput): Promise<DraftResult>`. If `!isAiConfigured()`, return fallback immediately with warning. Else call `completeJson` with prompts that request `{ drafts: DraftTaskDraft[] }`; validate at least one draft with non-empty title; on failure return fallback. AI success sets `source: "ai"`, no warning.

#### 8. Coach orchestrator

**File**: `src/lib/ai/generate-coach.ts`

**Intent**: Try AI then fallback for discussion prompts.

**Contract**: Export `generateCoachPrompts(input: CoachInput): Promise<CoachResult>`. Caller must pre-check divergence (route layer). AI prompt must instruct: no recommended story-point value; reference title/description and vote distribution; return `{ summary, questions }` with 3–5 questions. Fallback path uses `fallbackCoachPrompts`.

#### 9. Barrel export

**File**: `src/lib/ai/index.ts`

**Intent**: Single import path for routes and future S-02/S-03 server usage.

**Contract**: Re-export public types and `generateDraftFromNotes`, `generateCoachPrompts`, `isDivergent`, `isAiConfigured`.

#### 10. Unit tests — lib

**Files**: `src/lib/ai/divergence.test.ts`, `src/lib/ai/fallback/draft.test.ts`, `src/lib/ai/fallback/coach.test.ts`, `src/lib/ai/openrouter.test.ts`, `src/lib/ai/generate-draft.test.ts`, `src/lib/ai/generate-coach.test.ts`

**Intent**: Lock fallback behavior and mocked AI paths without live API key.

**Contract**: Cover divergence edge cases (aligned votes, 2× spread, min zero); heuristic draft splitting; coach template count; `completeJson` returns null on timeout/500/malformed JSON; orchestrators return `source: "fallback"` when unconfigured or client returns null.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes on new files
- `npm run test:coverage` passes with Statements/Branches/Functions/Lines printed to stdout
- `npm run build` passes

#### Manual Verification:

- Import `generateDraftFromNotes` in a temporary dev script or REPL-less smoke: unconfigured env returns fallback drafts from sample notes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Authenticated API routes

### Overview

Expose Draft and Coach generation over HTTP for S-02/S-03 and manual verification.

### Changes Required:

#### 1. Draft route

**File**: `src/pages/api/ai/draft.ts`

**Intent**: Authenticated endpoint for Sprinter Draft generation (FR-016 scaffold).

**Contract**: `POST` only. `requireSessionAuth` → 401/503 JSON. Body `{ notes: string }`; reject missing/empty notes with 400. Call `generateDraftFromNotes`; return 200 JSON `DraftResult`.

#### 2. Coach route

**File**: `src/pages/api/ai/coach.ts`

**Intent**: Authenticated endpoint for Sprinter Coach prompts (FR-016 scaffold).

**Contract**: `POST` only. Body `{ taskTitle: string; taskDescription?: string; votes: number[] }`. Validate `taskTitle` non-empty, `votes` array of numbers length ≥ 2. If `!isDivergent(votes)` return 400 `{ error: "…" }`. Call `generateCoachPrompts`; return 200 JSON `CoachResult`.

#### 3. Route tests

**Files**: `src/pages/api/ai/draft.test.ts`, `src/pages/api/ai/coach.test.ts` (or co-located under `src/lib/ai/` if importing handlers — prefer testing handler logic via extracted functions if Astro route testing is awkward)

**Intent**: Verify auth gate, validation, and response shape with mocks.

**Contract**: Mock `requireSessionAuth` and generators; assert 401 without auth, 400 on bad input, 200 with expected JSON keys.

#### 4. README route table (optional minimal)

**File**: `README.md`

**Intent**: Document new API surface for agents and developers.

**Contract**: Add rows for `POST /api/ai/draft` and `POST /api/ai/coach` under API routes section if one exists; skip if no table present.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:coverage` passes with coverage table printed to stdout
- `npm run build` passes

#### Manual Verification:

- Authenticated curl/HTTP client: `POST /api/ai/draft` with notes returns fallback drafts when key unset
- Authenticated `POST /api/ai/coach` with divergent votes returns 3–5 questions; aligned votes return 400
- With valid `OPENROUTER_API_KEY`, draft route returns `source: "ai"` for sample notes (manual only)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests

- `isDivergent`: aligned pair, spread ≥ 3, 2× rule, single vote, empty array
- `fallbackDraftFromNotes`: multi-paragraph notes, single line, whitespace-only edge
- `fallbackCoachPrompts`: question count 4–5, summary mentions spread
- `completeJson`: mock `fetch` — success JSON, 429, abort/timeout, invalid JSON body
- `generateDraftFromNotes` / `generateCoachPrompts`: configured vs unconfigured env (mock `astro:env/server` or inject config helper)
- Route validation: empty notes, non-divergent coach payload

### Integration Tests

- None in CI (no live OpenRouter). Manual smoke with real key optional locally.

### Manual Testing Steps

1. Sign in locally; POST draft with multi-line notes without `OPENROUTER_API_KEY` — expect multiple drafts, `source: "fallback"`, `warning` present.
2. POST coach with votes `[1, 8]` — expect 200 and questions; with `[3, 3]` — expect 400.
3. Set `OPENROUTER_API_KEY`; repeat draft — expect `source: "ai"` (if API healthy).
4. Temporarily break key or block network — expect silent fallback, not 503.

## Performance Considerations

- 8s abort timeout on OpenRouter calls; fallback path is synchronous string ops only (sub-ms).
- Keep routes thin — no Supabase reads in F-03 Coach path (client sends payload).
- No caching of AI responses in F-03.

## Migration Notes

- No database migrations.
- Production: add `OPENROUTER_API_KEY` via `npx wrangler secret put OPENROUTER_API_KEY` when ready for live AI; app functions without it.
- Update `context/deployment/deploy-plan.md` deferred secrets list when implementing deploy docs (optional follow-up, not blocking F-03).

## References

- Roadmap F-03: `context/foundation/roadmap.md`
- PRD FR-016, US-02, US-03: `context/foundation/prd.md`
- Infrastructure OpenRouter guidance: `context/foundation/infrastructure.md`
- Session API pattern: `src/lib/session/api-json.ts`, `src/pages/api/session/tasks.ts`
- API route rules: `.cursor/rules/api.mdc`
- Lessons (coverage in CI): `context/foundation/lessons.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Environment and configuration

#### Automated

- [x] 1.1 `npm run lint` passes — 20bba91
- [x] 1.2 `npm run build` passes — 20bba91

#### Manual

- [x] 1.3 App starts with `npm run dev` when `OPENROUTER_API_KEY` is unset — 20bba91
- [x] 1.4 `configStatuses` shows OpenRouter as unconfigured when key absent — 20bba91

### Phase 2: AI library layer

#### Automated

- [x] 2.1 `npm run lint` passes on new files — 4d96fca
- [x] 2.2 `npm run test:coverage` passes with coverage table printed to stdout — 4d96fca
- [x] 2.3 `npm run build` passes — 4d96fca

#### Manual

- [x] 2.4 Unconfigured `generateDraftFromNotes` returns fallback drafts from sample notes — 4d96fca

### Phase 3: Authenticated API routes

#### Automated

- [x] 3.1 `npm run lint` passes — f0f78ea
- [x] 3.2 `npm run test:coverage` passes with coverage table printed to stdout — f0f78ea
- [x] 3.3 `npm run build` passes — f0f78ea

#### Manual

- [x] 3.4 Authenticated draft POST returns fallback when key unset — f0f78ea
- [x] 3.5 Coach POST returns 400 for non-divergent votes; 200 with questions when divergent — f0f78ea
- [x] 3.6 With valid OpenRouter key, draft POST returns `source: "ai"` (manual) — f0f78ea
