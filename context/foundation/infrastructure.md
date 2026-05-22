---
project: "10xSprinter"
researched_at: 2026-05-22
recommended_platform: Cloudflare Workers
runner_up: Fly.io
context_type: mvp
tech_stack:
  language: JavaScript / TypeScript
  framework: Astro 6 + React 19
  runtime: Cloudflare Workers (workerd) via @astrojs/cloudflare v13
---

## Recommendation

**Deploy on Cloudflare Workers.**

The project is already wired for this platform: `@astrojs/cloudflare` v13, `wrangler.jsonc`, and `wrangler` v4 in devDependencies. The developer interview confirmed real-time requirements (Q1: Yes), Cloudflare familiarity (Q3), single-region serving (Q4), and external Supabase + OpenRouter (Q5). Real-time sync for planning poker is best handled via **Supabase Realtime** (browser → Supabase WebSocket) while Workers serve SSR, auth, and API routes — avoiding the need for always-on server processes on the host. Cloudflare scores Pass on all five agent-friendly criteria, stays at $0–5/mo for MVP traffic, and requires no adapter migration. The user accepted the anti-bias risks after cross-check.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| **Cloudflare Workers** | Pass | Pass | Pass | Pass | Pass | **5 Pass** |
| Fly.io | Pass | Pass | Partial | Pass | Partial | 4P + 1Part |
| Railway | Pass | Pass | Partial | Pass | Pass | 4P + 1Part |
| Render | Partial | Pass | Pass | Partial | Partial | 2P + 3Part |
| Vercel | — | — | — | — | — | **Filtered (Q1)** |
| Netlify | — | — | — | — | — | **Filtered (Q1)** |

**Cloudflare Workers** — Pass across all criteria. `wrangler deploy`, `wrangler rollback`, and `wrangler tail` cover the full agent ops loop. Docs ship as `/llms.txt` and `/llms-full.txt`. Multiple official MCP servers (API, docs, observability). Already the project's configured adapter; external Supabase and OpenRouter fit the documented third-party integration pattern.

**Fly.io** — Strong runner-up for full Node SSR and native WebSockets on always-on Machines (~$5–8/mo). Would require swapping `@astrojs/cloudflare` for `@astrojs/node` and adding a Dockerfile. Docs are GitHub MDX without `llms.txt`. MCP server is experimental (`fly mcp server`).

**Railway** — Third. Excellent DX, hosted MCP at `mcp.railway.com`, and agent skills for Cursor. Requires `@astrojs/node` adapter change. $5/mo Hobby minimum. Custom WebSocket connections capped at 15 minutes (irrelevant if using Supabase Realtime).

**Render** — Partial on CLI (MCP cannot trigger deploys) and deploy API. Free tier spins down after 15 min idle. Good docs with `llms.txt` but weaker agent deploy loop.

**Vercel / Netlify** — Dropped by hard filter: Q1 requires real-time connectivity; neither platform supports server-side WebSocket servers on serverless functions. Supabase Realtime from the client would work, but the interview answer prioritizes platforms that can host persistent connections natively if the architecture shifts.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Wins on zero migration cost (adapter already in place), developer familiarity, free-tier economics at 10k–100k req/mo, and perfect agent-friendly scores. Supabase Realtime handles live vote/reveal sync without Durable Objects for MVP. `wrangler` v4 + `@astrojs/cloudflare` v13 target Workers directly (not legacy Pages CLI).

#### 2. Fly.io

Best alternative if the team later needs full Node.js runtime fidelity or custom WebSocket rooms on the host. Requires adapter swap and container ops. Higher baseline cost than Cloudflare free tier but predictable for always-on SSR.

#### 3. Railway

Best PaaS DX and MCP story among container hosts. Same adapter migration cost as Fly.io. $5/mo floor and no edge CDN by default — acceptable for single-region MVP but weaker than Cloudflare on cost and global edge (though Q4 de-prioritizes global reach).

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **`workerd` is not Node.js** — `@astrojs/cloudflare` v13 runs on V8 isolates. npm packages using unsupported Node APIs (`node:fs`, native bindings) fail at runtime despite passing local `astro dev`.
2. **Free-tier CPU limit (10ms/invocation)** — SSR routes that chain Supabase fetch + OpenRouter calls may hit Error 1027; Paid plan ($5/mo) provides 30M CPU-ms/mo.
3. **No native persistent state** — if Supabase Realtime is replaced with custom WebSockets, Durable Objects are required; deploys restart DO instances and disconnect active WebSocket clients.
4. **Preview deploy ergonomics** — Workers Custom Branch Aliases remain **preview** (checked 2026-05-22); PR preview URLs need explicit setup vs. Vercel/Netlify defaults.
5. **Secrets sprawl** — production requires coordinated secrets in Cloudflare (`wrangler secret put`), GitHub Actions, Supabase dashboard, and (future) OpenRouter key rotation.

### Pre-Mortem — How This Could Fail

The team deployed Astro SSR on Cloudflare Workers assuming full Node.js compatibility. After one week, Supabase SSR middleware and an AI library used `node:crypto` in ways unsupported by `workerd` — builds passed locally but production returned 500. Real-time sync used polling instead of Supabase Realtime because nobody configured Realtime channels, missing the PRD's ≤3s requirement. An OpenRouter key leaked into a client bundle through a misconfigured env schema. After three weeks, the team rewrote the adapter for Fly.io, losing a week to `workerd` edge-case debugging that could have been caught with `wrangler dev` and Supabase Realtime from day one.

### Unknown Unknowns

- **`nodejs_compat` is a subset** — the flag in `wrangler.jsonc` does not replicate full Node; verify each dependency against the [Workers Node compat matrix](https://developers.cloudflare.com/workers/runtime-apis/nodejs/) (checked 2026-05-22).
- **`wrangler deploy` ≠ `pages deploy`** — this project uses Workers with Static Assets (`wrangler.jsonc`); the Pages CLI is a different deploy path and must not be mixed.
- **Supabase Realtime requires RLS** — hosting choice is irrelevant, but Realtime channels won't deliver events without correct Row Level Security policies on vote/task tables.
- **Gradual deployments (GA, Sep 2024)** — rollback via `wrangler rollback` works, but versions involving Durable Objects or in-flight WebSockets have caveats during revert.
- **OpenRouter must stay server-side** — use Astro `env` schema secrets (`astro:env/server`); optional Cloudflare AI Gateway (GA, Apr 2024) adds observability but is not required.

## Operational Story

- **Preview deploys**: Use GitHub Actions + `wrangler deploy` on PR branches with a `--name` or environment-specific Worker name, or Cloudflare's Workers Builds (GA) connected to the repo. Custom Branch Aliases for automatic PR URLs are still **preview** on Workers (2026-05-22) — protect preview Workers with Cloudflare Access if auth routes are live. Fork PRs from external contributors need explicit secret scoping (no production secrets on untrusted builds).
- **Secrets**: Runtime secrets live in Cloudflare via `npx wrangler secret put SUPABASE_URL` and `SUPABASE_KEY`; future `OPENROUTER_API_KEY` the same way. CI build secrets in GitHub repository secrets (`SUPABASE_URL`, `SUPABASE_KEY`). Supabase service-role and OpenRouter keys never go to the client — only server-side Astro routes and middleware read them. Rotation: update in Cloudflare dashboard or CLI, then redeploy; update GitHub secrets separately for CI.
- **Rollback**: `npx wrangler rollback [VERSION_ID]` reverts to a prior Worker version; typical revert is under 30 seconds. Static assets roll back with the Worker version. Database migrations on Supabase do **not** roll back automatically — plan migrations as forward-only or maintain down scripts separately.
- **Approval**: Human required for: first production deploy, `wrangler secret put` / secret rotation, deleting Workers or DNS records, and Supabase RLS policy changes affecting production data. Agent may unattended: `npm run build`, `npx wrangler deploy` to a preview Worker, `npx wrangler tail` (read-only logs), and updating non-production branch configs.
- **Logs**: Runtime logs via `npx wrangler tail` (live stream) or Cloudflare dashboard → Workers → Logs. CI pipeline logs via `gh run view` or GitHub Actions UI. MCP option: Cloudflare observability MCP server for structured log queries. OpenRouter usage tracked in OpenRouter dashboard separately.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Node-incompatible dependency breaks production SSR | Devil's advocate | M | H | Test with `npx wrangler dev` before every deploy; pin and audit deps against Workers Node compat matrix |
| Free-tier CPU timeout on SSR + AI routes | Devil's advocate | M | M | Upgrade to Workers Paid ($5/mo); keep OpenRouter calls in dedicated API routes with minimal middleware chain |
| Real-time sync misses ≤3s PRD target | Pre-mortem | M | H | Use Supabase Realtime channels for vote/reveal events; do not rely on HTTP polling |
| OpenRouter key exposed to client | Pre-mortem | L | H | Enforce Astro env schema (`access: "secret"`, `context: "server"`); never import AI keys in client components |
| Preview deploy leaks production secrets | Unknown unknowns | L | H | Separate Worker names and secret sets for preview vs production; use GitHub environment protection rules |
| `wrangler deploy` vs Pages CLI confusion | Unknown unknowns | M | M | Always use `npx wrangler deploy` per `wrangler.jsonc`; document in deploy plan |
| Supabase Realtime blocked by missing RLS | Unknown unknowns | M | H | Define RLS policies before enabling Realtime subscriptions on session/vote tables |
| Deploy disconnects custom WebSocket clients | Devil's advocate | L | M | Use Supabase Realtime for MVP; defer custom WS to Durable Objects only if needed |

## Getting Started

1. **Authenticate Wrangler** (if not already): `npx wrangler login`
2. **Set production secrets**:
   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_KEY
   ```
   Add `OPENROUTER_API_KEY` when Sprinter Draft/Coach ships (FR-013–016).
3. **Build and deploy**:
   ```bash
   npm run build
   npx wrangler deploy
   ```
4. **Verify locally against Workers runtime** (not just `astro dev`):
   ```bash
   npx wrangler dev
   ```
5. **Wire Supabase Auth redirect URLs**: add production Worker URL + `/api/auth/callback` in Supabase dashboard → Authentication → URL Configuration. Enable Google OAuth provider if not already done.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup (GitHub Actions deploy job — deferred to Plan Mode deploy)
- Production-scale architecture (multi-region, HA, DR)
