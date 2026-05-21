---
project: 10x-astro-starter
checked_at: 2026-05-21T12:00:00Z
health_status: critical-issues
context_type: brownfield
language_family: js
stack_assessment_available: false
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
audit_findings:
  critical: 0
  high: 1
  moderate: 9
  low: 0
test_runner_detected: false
ci_provider: GitHub Actions
recommended_fixes: 6
---

## Dependency Health

### Lockfile

```
Status: present (package-lock.json)
Package manager: npm
```

### Security Audit

```
Tool: npm audit --json
Summary: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW
Direct vs transitive: 2 direct (@astrojs/check moderate, wrangler moderate); 8 transitive
```

#### HIGH findings

- **devalue** (transitive, via Astro/Svelte toolchain) — [GHSA-77vg-94rm-hx3p](https://github.com/advisories/GHSA-77vg-94rm-hx3p): DoS via sparse array deserialization (CVSS 7.5). Fix: run `npm audit fix` to pull patched transitive versions; if unresolved, track upstream Astro/devalue updates.

#### MODERATE findings (summary)

9 moderate advisories — mostly transitive chains through `@astrojs/check` → `@astrojs/language-server` → yaml tooling, and `wrangler` → `miniflare` → `ws`. One direct moderate on **wrangler** (dev dependency). Fix: `npm audit fix` where available; bump `wrangler` to latest patch (`npm install wrangler@latest -D`).

### Outdated Dependencies

```
Packages with major version gaps: 4
```

Direct dependencies with one major version behind latest:

- **eslint**: 9.39.4 → 10.4.0 (1 major version behind)
- **@eslint/js**: 9.39.4 → 10.0.1 (1 major version behind)
- **lint-staged**: 16.4.0 → 17.0.5 (1 major version behind)
- **typescript**: 5.9.3 → 6.0.3 (1 major version behind)

Minor/patch gaps exist on astro, tailwindcss, supabase, and others — not urgent for agent work.

## Test Suite

```
Test runner: not detected
Tests found: 0 test files (*.test.* / *.spec.*)
Test execution: not attempted
```

```
⚠ No test runner detected. The agent cannot verify its own changes.
Recommended: Add Vitest (fits Astro + React + TypeScript stack):
  npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
  Add to package.json scripts: "test": "vitest run", "test:watch": "vitest"
  Create vitest.config.ts extending Vite config; add a smoke test under src/
```

## CI/CD

```
Provider: GitHub Actions
Configuration: .github/workflows/ci.yml
```

| Stage      | Status | Notes                                      |
|------------|--------|--------------------------------------------|
| Lint       | ✓      | `npm run lint` (ESLint)                    |
| Test       | ✗      | No test step; no local test runner         |
| Build      | ✓      | `npm run build` (Astro) with Supabase env  |
| Type check | ✗      | No explicit `astro check` or `tsc` step    |
| Security   | ✗      | No npm audit, Dependabot, or CodeQL step   |

CI runs on push/PR to `master`: checkout → Node 22 → `npm ci` → `astro sync` → lint → build. Solid lint/build baseline; test and security stages missing until a test runner exists.

## Configuration

### High severity

None — `tsconfig.json` extends `astro/tsconfigs/strict`, `.gitignore` present.

### Medium severity

None — ESLint (`eslint.config.js`) and Prettier (`.prettierrc.json`) configured; `lint` and `format` scripts in `package.json`.

### Low severity

- **.editorconfig** — Consistent indentation across editors; reduces formatting noise in agent diffs. Fix: add a minimal `.editorconfig` (root=true, indent_style=space, indent_size=2, end_of_line=lf).

Present and in good shape: `.gitignore`, `.env.example`, `eslint.config.js`, `.prettierrc.json`, `tsconfig.json` (strict), `CLAUDE.md` (course routing rules).

## Stack Assessment Cross-Reference

```
No stack-assessment.md found. Run /10x-stack-assess for quality-gate analysis.
```

## Recommended Fixes

### Fix before agent work (Category A)

### 1. No test runner

**Impact**: An AI assistant cannot run tests to verify refactors, auth flows, or planning-poker logic — every change is manual QA only.
**Severity**: high
**Effort**: moderate (15–30 min)
**Fix**:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add `"test": "vitest run"` to `package.json`, create `vitest.config.ts`, and add at least one smoke test (e.g. a utility or component render). Re-run `npm test` locally before agent-assisted feature work.

### 2. HIGH security advisory (devalue)

**Impact**: Transitive DoS risk in deserialization path used by the Astro/Svelte toolchain; worth patching before heavy feature development.
**Severity**: high
**Effort**: quick (< 5 min)
**Fix**:

```bash
npm audit fix
npm audit
```

If `devalue` remains, document accepted risk or watch Astro release notes for a bumped dependency.

### 3. Direct moderate advisory (wrangler)

**Impact**: Dev-time Cloudflare tooling carries a known moderate chain (miniflare/ws); low runtime risk but clutters audit signal for agents.
**Severity**: medium
**Effort**: quick (< 5 min)
**Fix**:

```bash
npm install wrangler@latest -D
npm audit
```

### 4. CI pipeline has no test step

**Impact**: Merges to `master` can pass CI without any automated regression check — agents and humans alike lack a gate.
**Severity**: medium
**Effort**: quick (< 5 min) after Vitest is installed
**Fix**: Add to `.github/workflows/ci.yml` after lint:

```yaml
- run: npm test
```

### 5. CI has no explicit type-check step

**Impact**: Build may catch some TS errors, but `astro check` is the idiomatic strict check for Astro projects; agents benefit from a dedicated failing step.
**Severity**: medium
**Effort**: quick (< 5 min)
**Fix**:

```yaml
- run: npx astro check
```

(Add after `astro sync` in the workflow.)

### 6. Missing .editorconfig

**Impact**: Minor — inconsistent editor defaults can create noisy formatting diffs.
**Severity**: low
**Effort**: quick (< 5 min)
**Fix**: Create `.editorconfig` with 2-space indent, LF line endings, UTF-8.

### Addressed in upcoming lessons (Category B)

### AI assistant instruction file (AGENTS.md)

**Lesson**: [Agent Onboarding: Agents.md, AI Rules i feedback loops (M1L4)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l4)
**What you'll do there**: Build `AGENTS.md` (and related rules) with project-specific conventions — `CLAUDE.md` exists for course routing, but agent onboarding adds the operational playbook.

### CI security scanning

**Lesson**: [Sprint Zero z Agentem: infrastruktura, walking skeleton i pierwszy deploy (M1L5)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l5)
**What you'll do there**: Harden CI with dependency audit, Dependabot, or CodeQL — currently lint + build only.

### Deployment and full infrastructure pass

**Lesson**: [Sprint Zero z Agentem: infrastruktura, walking skeleton i pierwszy deploy (M1L5)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l5)
**What you'll do there**: Walking skeleton deploy, secrets, and production pipeline — Cloudflare/Supabase are chosen in `tech-stack.md` but full deploy automation is a lesson step.

## Summary

```
Health status: critical-issues
```

The bootstrapped Astro + React + Supabase stack is in good shape for linting, formatting, strict TypeScript, lockfile reproducibility, and a working GitHub Actions lint/build pipeline. The blocking gap for agent-assisted development is **no test runner and no tests** — without Vitest (or equivalent), neither you nor an AI assistant can automatically verify changes. One **HIGH** transitive advisory (`devalue`) and several **MODERATE** dev-toolchain advisories should be addressed with `npm audit fix` and a wrangler bump before deep MVP work.

**Next step**: Install Vitest and add a smoke test plus CI `npm test` / `astro check` steps (Category A fixes 1, 4, 5), then run `/10x-stack-assess` if you want quality-gate cross-reference, and proceed to [agent onboarding (M1L4)](https://platforma.przeprogramowani.pl/external/10xdevs-3/m1-l4).
