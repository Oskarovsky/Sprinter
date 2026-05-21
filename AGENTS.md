# Repository Guidelines

Stack and setup: `@README.md`. Product rules: obey `@context/foundation/prd.md`. Product and stack decisions live in `@context/foundation/`; do not invent domain rules that contradict `@context/foundation/prd.md`.

## Hard rules

- Never commit `.env`, `.dev.vars`, or other secret files — Supabase credentials are server-only via `@astro.config.mjs` env schema.
- Add new protected pages to `PROTECTED_ROUTES` in `@src/middleware.ts` before shipping; unlisted routes stay public.
- Do not write under `context/archive/` — archived foundation docs are immutable (see `@CLAUDE.md` sentinel).
- Run `npm run lint` before pushing; CI on `master` runs `astro sync`, lint, and build with GitHub `SUPABASE_URL` / `SUPABASE_KEY` secrets.

## Coding style

- Import via `@/` per `@tsconfig.json` paths — do not add path aliases without updating that file.
- Components: PascalCase `.astro` / `.tsx` under `src/components/` (e.g. `Welcome.astro`, `ui/` shadcn-style pieces).
- Pre-commit: Husky runs `lint-staged` per `@package.json` — do not bypass hooks.

## Project structure

- `context/foundation/` — PRD, shape-notes, tech-stack, lessons (append-only via `/10x-lesson`).
- `context/changes/` — change-scoped plans and reviews; not foundation.
- Config entry points: `@astro.config.mjs`, `@wrangler.jsonc`, `@eslint.config.js`, `@tsconfig.json` (`@/*` → `src/*`).

## Commits and pull requests

- Target branch for CI is `master` (`@.github/workflows/ci.yml`). Document Supabase/env setup changes in the PR body when touching auth or deployment.

## Further reading

- No test runner configured; do not add speculative test commands until `@package.json` defines them.
- 10xDevs workflow router: `@CLAUDE.md`
- Cursor course rules: `@.cursor/rules/10x-course.mdc`
