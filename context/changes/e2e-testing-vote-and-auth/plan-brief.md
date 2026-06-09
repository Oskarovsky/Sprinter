# E2E Tests for Authentication and Vote Calculation — Plan Brief

> Full plan: `context/changes/e2e-testing-vote-and-auth/plan.md`

## What & Why

We are introducing End-to-End (E2E) tests to the project using Playwright. This will cover two high-risk scenarios identified in the test plan: authentication failures and incorrect vote calculations. The goal is to ensure these critical user flows are stable and working correctly from the user's perspective.

## Starting Point

The project currently has unit and integration tests but no E2E testing framework. This plan will establish the foundation for E2E testing and provide coverage for the most critical user journeys.

## Desired End State

A new E2E test suite will be integrated into the CI/CD pipeline. The tests will validate the full user flow for authentication and voting, running in a real browser against a local dev server and a real database, which will give us high confidence in the stability of the application.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| E2E Framework | Playwright | It's a modern, fast, and reliable framework with great tooling. | Plan |
| Test Directory | `e2e/` | A dedicated top-level directory provides a clear separation of concerns. | Plan |
| Base URL | `http://localhost:4321` | This is the standard port for the Astro dev server. | Plan |
| Test User Strategy | Dynamic user creation | This ensures full test isolation, preventing tests from interfering with each other. | Plan |

## Scope

**In scope:**
- Setting up Playwright for E2E testing.
- E2E tests for email/password login, including invalid password case.
- E2E test for user registration.
- E2E tests for vote calculation, including multi-user, no-voter, and single-voter scenarios.

**Out of scope:**
- E2E tests for any other user flows.
- E2E tests for UI appearance or style.
- E2E tests for external providers like Google OAuth.

## Architecture / Approach

We will install and configure Playwright to automatically start the Astro dev server. A new `e2e/` directory will house all E2E tests. We will create a helper module to programmatically create and delete test users from the Supabase database before and after each test, ensuring a clean and isolated environment.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Playwright Setup & Configuration | A working E2E test setup with a sample test. | Configuration issues. |
| 2. Authentication E2E Tests | Test coverage for login and registration flows. | Flaky tests due to UI changes. |
| 3. Vote Calculation E2E Tests | Test coverage for the core voting feature. | Complexity of multi-user scenarios. |

**Prerequisites:** A running local Supabase instance (or a dev instance) for user creation.
**Estimated effort:** ~3-4 sessions across 3 phases.

## Open Risks & Assumptions

- The E2E tests might be flaky at the beginning and will require fine-tuning.
- Dynamic user creation might be slow, impacting the overall test suite runtime.

## Success Criteria (Summary)

- E2E tests for authentication and vote calculation are running successfully in the CI pipeline.
- The new tests are reliable and provide high confidence in the stability of the covered features.
