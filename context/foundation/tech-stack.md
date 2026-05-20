---
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
---

## Why this stack

10xSprinter is a small-team planning-poker web app with a 3-week after-hours MVP, email/password plus Google SSO, and live-session vote/reveal sync. The recommended `(web-app, js)` starter — Astro + React + TypeScript + Supabase + Cloudflare — ships auth, PostgreSQL, and edge deploy in one opinionated stack that matches FR-001/002/012 without bolting on separate auth and hosting choices. Supabase covers credential and Google OAuth login; Realtime can back the ≤3s who-voted and reveal updates in the NFRs. Cloudflare Pages is the starter default deployment target; CI runs on GitHub Actions with auto-deploy on merge to main. Standard path taken; auth is in scope, payments/realtime/AI/background jobs are out of scope per PRD non-goals.
