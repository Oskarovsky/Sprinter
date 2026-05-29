# F-03 AI Provider with Fallback — Plan Brief

> Full plan: `context/changes/ai-provider-fallback/plan.md`

## What & Why

Roadmap **F-03** adds the server-side AI foundation: OpenRouter when configured, deterministic Draft and Coach fallbacks when not — same response shape either way (FR-016). This unblocks Sprinter Draft (S-02) and Coach (S-03) without shipping product UI in the foundation change.

## Starting Point

S-01 poker, F-01 schema, and F-02 Realtime are done. There is no AI code, no `OPENROUTER_API_KEY` in Astro env, and no `/api/ai/*` routes. Infrastructure already specifies OpenRouter server-side via Astro secrets and dedicated API routes on Cloudflare Workers.

## Desired End State

Authenticated clients can `POST /api/ai/draft` (notes → task drafts) and `POST /api/ai/coach` (task + votes → discussion prompts). Responses always succeed with usable content: AI when the key works, heuristic/template fallback otherwise, with `source` and `warning` fields exposing degraded mode. S-02/S-03 wire UI to these endpoints.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| F-03 scope | Lib layer + authenticated API routes | S-02/S-03 can focus on UI while foundation proves HTTP contract | Plan |
| Capabilities | Draft and Coach contracts | FR-016 fully scaffolded for both upcoming slices | Plan |
| HTTP client | Native `fetch` to OpenRouter REST | Zero new deps; Workers-safe per infra pre-mortem | Plan |
| Model selection | Single hardcoded default (`openai/gpt-4o-mini`) | Simplest ops for solo MVP | Plan |
| Draft fallback | Heuristic line/paragraph parsing | Deterministic usable drafts per US-02 AC | Plan |
| Coach fallback | Template questions + vote spread context | Satisfies US-03 “fallback questions still shown” | Plan |
| AI failure handling | Always silent fallback | User never blocked when fallback can serve | Plan |
| Degraded visibility | `source` + human-readable `warning` | Client can surface fallback mode in S-02/S-03 | Plan |
| Route auth | `requireSessionAuth` on both routes | Matches session API pattern; prevents open credit burn | Plan |
| Coach input | Client sends task + votes; server checks divergence | US-03 guardrails enforced server-side | Plan |
| Timeout | 8 seconds then fallback | Predictable latency under Workers constraints | Plan |
| Testing | Unit tests with mocked `fetch` | CI passes without live API key | Plan |

## Scope

**In scope:**

- `OPENROUTER_API_KEY` in Astro env schema + `.env.example`
- `src/lib/ai/*` — types, OpenRouter client, fallbacks, orchestrators
- `POST /api/ai/draft` and `POST /api/ai/coach`
- Config-status entry for OpenRouter
- Vitest unit tests (fallbacks, divergence, mocked provider, routes)

**Out of scope:**

- Draft/Coach UI (S-02, S-03)
- Analyst / repo analysis (S-04)
- DB persistence of notes or prompts
- Streaming, retries, client-side model pick
- Live OpenRouter in CI

## Architecture / Approach

```
Authenticated client (future S-02/S-03 UI)
  ↓ POST /api/ai/draft | /api/ai/coach
API route (requireSessionAuth)
  ↓
generateDraftFromNotes / generateCoachPrompts
  ↓ isAiConfigured?
OpenRouter fetch (8s timeout) ──fail──→ deterministic fallback
  ↓ success
JSON { source, warning?, drafts | summary+questions }
```

OpenRouter key stays in `astro:env/server` only. Coach route rejects non-divergent spreads before generation.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Env & config | Astro schema, `.env.example`, config-status | Forgetting optional flag breaks dev without key |
| 2. AI lib layer | Types, client, fallbacks, orchestrators, unit tests | OpenRouter JSON drift → mitigate with parse fallback |
| 3. API routes | `/api/ai/draft`, `/api/ai/coach`, route tests | Auth bypass if `requireSessionAuth` skipped |

**Prerequisites:** S-01 merged; local dev auth working for manual API smoke.

**Estimated effort:** ~2–3 focused sessions across 3 phases.

## Open Risks & Assumptions

- Hardcoded model must remain available on OpenRouter; change constant if deprecated.
- OpenRouter `json_object` response format support varies by model — parse failures must hit fallback path.
- Warning copy locale should match session UI language (verify against `SessionRoom` during implement).
- Free-tier Workers CPU may still timeout on slow AI; fallback masks this for users.

## Success Criteria (Summary)

- Without API key: authenticated draft/coach calls return usable fallback content with `source: "fallback"`.
- Coach rejects non-divergent votes with 400; accepts divergent spreads.
- `npm run lint`, `npm run test:coverage`, and `npm run build` pass in CI.
