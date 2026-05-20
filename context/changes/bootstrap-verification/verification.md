---
bootstrapped_at: 2026-05-20T20:14:21Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: 10x-sprinter
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: 10x-sprinter
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

10xSprinter is a small-team planning-poker web app with a 3-week after-hours MVP, email/password plus Google SSO, and live-session vote/reveal sync. The recommended `(web-app, js)` starter — Astro + React + TypeScript + Supabase + Cloudflare — ships auth, PostgreSQL, and edge deploy in one opinionated stack that matches FR-001/002/012 without bolting on separate auth and hosting choices. Supabase covers credential and Google OAuth login; Realtime can back the ≤3s who-voted and reveal updates in the NFRs. Cloudflare Pages is the starter default deployment target; CI runs on GitHub Actions with auto-deploy on merge to main. Standard path taken; auth is in scope, payments/realtime/AI/background jobs are out of scope per PRD non-goals.

## Pre-scaffold verification

| Signal             | Value                                              | Severity | Notes                                      |
| ------------------ | -------------------------------------------------- | -------- | ------------------------------------------ |
| npm package        | not run                                            | n/a      | git-clone starter; no create-* CLI         |
| GitHub repo        | przeprogramowani/10x-astro-starter pushed 2026-05-17 | fresh    | via GitHub API (gh CLI unavailable)        |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`

**Strategy**: git-clone

**Exit code**: 0

**Files moved**: 31441 (includes node_modules tree)

**Conflicts (.scaffold siblings)**: CLAUDE.md.scaffold

**.gitignore handling**: moved silently

**.bootstrap-scaffold cleanup**: deleted (including removed upstream `.git/` before merge)

## Post-scaffold audit

**Tool**: npm audit --json

**Summary**: 0 CRITICAL, 1 HIGH, 10 MODERATE, 0 LOW

**Direct vs transitive**: 0 direct HIGH of total 1 HIGH (devalue is transitive via Astro/Svelte toolchain)

#### HIGH findings

- **devalue** — Svelte devalue: DoS via sparse array deserialization ([GHSA-77vg-94rm-hx3p](https://github.com/advisories/GHSA-77vg-94rm-hx3p)). Transitive dependency; not a direct project dependency.

#### MODERATE findings

10 moderate advisories across `@astrojs/check`, `@astrojs/cloudflare`, `@astrojs/language-server`, and related toolchain packages. See `/tmp/npm-audit.json` or run `npm audit` locally for the full list.

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                       | Value                              |
| -------------------------- | ---------------------------------- |
| bootstrapper_confidence    | first-class                        |
| quality_override           | false                              |
| path_taken                 | standard                           |
| self_check_answers         | null                               |
| team_size                  | solo                               |
| deployment_target          | cloudflare-pages                   |
| ci_provider                | github-actions                     |
| ci_default_flow            | auto-deploy-on-merge               |
| has_auth                   | true                               |
| has_payments               | false                              |
| has_realtime               | false                              |
| has_ai                     | false                              |
| has_background_jobs        | false                              |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
