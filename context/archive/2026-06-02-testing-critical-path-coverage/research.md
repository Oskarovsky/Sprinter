---
date: 2026-06-02T12:00:00Z
researcher: Gemini
git_commit: a1d6e10b93ed2cd8bf21939d8b90956945e8e177
branch: master
repository: sprinter
topic: "Ground rollout Phase 1 of context/foundation/test-plan.md"
tags: [research, codebase, vote-calculation, authentication]
status: complete
last_updated: 2026-06-02
last_updated_by: Gemini
---

# Research: Ground rollout Phase 1 of context/foundation/test-plan.md

**Date**: 2026-06-02T12:00:00Z
**Researcher**: Gemini
**Git Commit**: a1d6e10b93ed2cd8bf21939d8b90956945e8e177
**Branch**: master
**Repository**: sprinter

## Research Question

Ground rollout Phase 1 of context/foundation/test-plan.md, focusing on risks #1 (Incorrect vote calculation after reveal) and #2 (Authentication (login/signup) failures).

## Summary

The research confirmed that both risks are valid and represent critical gaps in the current test suite. The vote calculation has some unit test coverage, but lacks integration tests to verify the end-to-end flow. The authentication system has no test coverage at all. For both risks, the cheapest and most effective next step is to add integration tests targeting their respective API endpoints.

## Detailed Findings

### Risk #1: Incorrect vote calculation after reveal

- **Failure Path**: The failure would originate in the `GET /api/session/state.ts` endpoint, specifically in the sequence of calls to `extractHumanStoryPoints`, `computeHumanAverage`, and `formatHumanAverage` when a task's status is "revealed".
- **Code References**:
    - `src/pages/api/session/state.ts:80-84`: Orchestrates the calculation.
    - `src/lib/session/votes.ts:82-84`: `extractHumanStoryPoints` function.
    - `src/lib/session/average.ts:1-8`: `computeHumanAverage` function.
- **Existing Tests**: Unit tests exist in `src/lib/session/average.test.ts` and `src/lib/session/votes.test.ts`. However, they exhibit the anti-pattern 'Copied production calculation' and do not test the integration of these components.
- **Cheapest Next Test**: An integration test for the `GET /api/session/state` endpoint is the cheapest way to get meaningful signal. It would verify the entire backend flow from request to response.
- **Guidance Verification**: The `test-plan.md` guidance is **correct**. The hot-spot evidence `src/components/session/` was **misleading**, as the frontend only displays data and is not involved in the calculation.

### Risk #2: Authentication (login/signup) failures

- **Failure Path**: Failures in login or signup originate in the `POST /api/auth/signin.ts` and `POST /api/auth/signup.ts` endpoints, respectively. These handlers call the Supabase client, and any errors are caught and redirected back to the user with an error message in the URL.
- **Code References**:
    - `src/pages/api/auth/signin.ts`: `supabase.auth.signInWithPassword()` call.
    - `src/pages/api/auth/signup.ts`: `supabase.auth.signUp()` call.
- **Existing Tests**: There are **no existing tests** for the authentication logic. The `middleware.test.ts` file is misleading as it only tests a static array, not the runtime authentication middleware.
- **Cheapest Next Test**: Integration tests against the `/api/auth/signin` and `/api/auth/signup` endpoints are the cheapest and most effective next step. These should ideally be run against a dedicated test Supabase project to avoid the "over-mocking" anti-pattern.
- **Guidance Verification**: The `test-plan.md` guidance is **correct**. The primary risk is environmental configuration error, which would not be caught by mocked tests.

## Architecture Insights

- The application follows a clear frontend/backend separation, with the Astro frontend consuming data from API endpoints.
- Critical business logic (like vote calculation) is correctly placed in the backend API layer.
- The authentication system is a thin wrapper around the Supabase client, making direct integration testing essential.

## Open Questions

- Should a dedicated test Supabase project be created to enable robust authentication integration tests? This would be a prerequisite for the recommended test approach.
