# Critical Path Integration Tests — Plan Brief

> Full plan: `context/changes/testing-critical-path-coverage/plan.md`
> Research: `context/changes/testing-critical-path-coverage/research.md`

## What & Why

This plan adds integration tests for user authentication and session vote calculation, addressing the top two critical risks identified in the project's test plan. This will provide a safety net against regressions in these core features.

## Starting Point

Currently, the vote calculation logic has brittle unit tests, and the authentication system has no test coverage at all, posing a significant risk of failure in production environments.

## Desired End State

A new suite of integration tests will run in CI, verifying the correctness of authentication and vote calculation endpoints against a dedicated test database. A clear pattern for writing future API integration tests will be established.

## Key Decisions Made

| Decision                       | Choice            | Why (1 sentence)  | Source           |
| ------------------------------ | ----------------- | ----------------- | ---------------- |
| Test Database                  | Use a dedicated test Supabase project | To isolate tests and prevent data corruption, enabling safe, destructive testing. | Plan |
| Vote Test Scope                | Happy path and common edge cases | Provides robust coverage for the most likely failure scenarios without excessive effort. | Plan |
| Auth Test Scope                | Successful and failed attempts | Ensures proper error handling and feedback to the user, covering more than just the happy path. | Plan |

## Scope

**In scope:**
- Adding integration tests for `signup`, `signin`, and `session/state` API endpoints.
- Configuring a new test environment and CI script.
- Updating the `test-plan.md` with a new cookbook pattern.

**Out of scope:**
- End-to-end (UI-level) tests.
- Refactoring the application logic being tested.

## Architecture / Approach

We will use the existing Vitest framework to create new integration tests that make HTTP requests to the application's API endpoints. These tests will run in a separate `test` mode, configured to use a dedicated test Supabase database for full isolation.

## Phases at a Glance

| Phase     | What it delivers       | Key risk                  |
| --------- | ---------------------- | ------------------------- |
| 1. Test Environment Setup | A configured test environment for Supabase. | Incorrect environment configuration. |
| 2. Auth Integration Tests | Test coverage for login and signup. | Tests are not correctly isolated. |
| 3. Vote Calc Integration Tests | Test coverage for vote calculation. | Test data does not cover edge cases. |
| 4. Cookbook Update | A documented pattern for future tests. | The pattern is unclear or incomplete. |

**Prerequisites:** A new Supabase project must be created for the test environment.
**Estimated effort:** ~1-2 sessions across 4 phases.

## Open Risks & Assumptions

- Assumes a team member can and will provision a new Supabase project for testing.
- Assumes the Astro dev server can be run programmatically or in parallel by the Vitest test runner.

## Success Criteria (Summary)

- The new integration test suite passes in CI.
- The tests cover both happy paths and key failure modes for authentication and vote calculation.
- The project's test plan is updated with a clear recipe for adding more API integration tests.
