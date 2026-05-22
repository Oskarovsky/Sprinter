# Repository Guidelines

Stack and setup: `@README.md`. Product rules: obey `@context/foundation/prd.md`. Product and stack decisions live in `@context/foundation/`; do not invent domain rules that contradict `@context/foundation/prd.md`.

## Hard rules

- Never commit `.env`, `.dev.vars`, or other secret files — Supabase credentials are server-only via `@astro.config.mjs` env schema.
- Add new protected pages to `PROTECTED_ROUTES` in `@src/middleware.ts` before shipping; unlisted routes stay public.
- Do not write under `context/archive/` — archived foundation docs are immutable (see `@CLAUDE.md` sentinel).
- Run `npm run lint` before pushing; CI on `master` runs `astro sync`, lint, and build with GitHub `SUPABASE_URL` / `SUPABASE_KEY` secrets.
- **Secret Scoping:** Never read raw environment variables via `process.env`. All Supabase and system credentials must strictly leverage the Astro environment schema configuration via `@astro.config.mjs`.
- **Server-Side Supabase Execution:** Execute all sensitive data fetching, mutations, and Supabase writes strictly on the server side (inside Astro frontmatter `---` or under `src/pages/api/*`).
- **PRD Truth Source:** Before writing any business logic or adding database/state fields, you must read and cross-reference `@context/foundation/prd.md`. Do not invent domain behavior that deviates from this file.
- **Immutable Archives:** Never attempt to edit, rewrite, or add any files under `context/archive/`. Treat this directory as completely immutable.

## Coding style

- Pre-commit: Husky runs `lint-staged` per `@package.json` — do not bypass hooks.

## Project structure

- `context/foundation/` — PRD, shape-notes, tech-stack, lessons (append-only via `/10x-lesson`).
- `context/changes/` — change-scoped plans and reviews; not foundation.
- Config entry points: `@astro.config.mjs`, `@wrangler.jsonc`, `@eslint.config.js`, `@tsconfig.json` (`@/*` → `src/*`).

## Commits and pull requests

- Target branch for CI is `master` (`@.github/workflows/ci.yml`). Document Supabase/env setup changes in the PR body when touching auth or deployment.

## Further reading

- Run `npm run test:coverage` before pushing; CI runs it alongside lint and build. Coverage must print Statements/Branches/Functions/Lines % to stdout per `@context/foundation/lessons.md`.
- 10xDevs workflow router: `@CLAUDE.md`
- Cursor course rules: `@.cursor/rules/10x-course.mdc`
