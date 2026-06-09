# AI and Repository Integration Testing - Plan Brief

> Full plan: `context/changes/testing-ai-and-repository-integration/plan.md`
> Research: `context/changes/testing-ai-and-repository-integration/research.md`

## What & Why

We are adding integration tests for the AI-powered features (draft, coach, analyst) and the repository integration ("Sprinter Analyst"). This will ensure these features are robust and that their error handling and fallback mechanisms work as expected, addressing risks #3 and #4 from the test plan.

## Starting Point

The codebase has existing AI and repository integration features but lacks integration tests for them. The current tests are primarily unit tests.

## Desired End State

A new suite of integration tests will cover the AI and repository integration features. These tests will run in CI and provide confidence that these features work correctly and handle errors gracefully.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| AI Test Scope | Focus on integration and error handling | To create robust and maintainable tests without validating the AI's output quality. | Plan |
| External Services | Mock external service APIs | To have full control over test scenarios for services like OpenRouter, GitHub, and GitLab. | Plan |
| Async Testing | Mock the asynchronous task | To create faster, more reliable, and deterministic tests for the "Sprinter Analyst" feature. | Plan |
| Database State | Create and clean up data for each test | To ensure tests are isolated and reliable. | Plan |
| Test Structure | Group tests by domain | To keep related tests together in a logical structure. | Plan |
| File Location | Use a central 'tests/integration' directory | To keep all new integration tests in a single, dedicated location. | Plan |

## Scope

**In scope:**
- Adding integration tests for AI features (`draft`, `coach`, `analyst`).
- Adding integration tests for repository linking and the "Sprinter Analyst" feature.
- Setting up API mocking for external services.
- Creating test utilities for database setup and teardown.

**Out of scope:**
- Testing the quality of AI responses.
- End-to-end (UI-level) testing.
- Refactoring the existing application logic.

## Architecture / Approach

We will create a new `tests/integration` directory to house the new tests. A mock service worker (`msw`) will be used to intercept HTTP requests to external services and provide controlled responses. Each test will be responsible for setting up and tearing down its own database state to ensure isolation.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Test Setup & Utilities | A configured test environment with API mocking and database utilities. | Incorrectly mocked services leading to flaky tests. |
| 2. AI Integration Tests | Integration tests for the AI features, covering success, fallback, and error cases. | Incomplete test coverage for all failure modes. |
| 3. Repository Integration Tests | Integration tests for repository linking and the "Sprinter Analyst" feature. | Difficulty in testing the asynchronous workflow. |

**Prerequisites:** None.
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- The asynchronous nature of the "Sprinter Analyst" feature might still pose challenges during testing, even with mocking.

## Success Criteria (Summary)

- The new integration tests run successfully in the CI pipeline.
- The tests provide good coverage of the success and failure modes of the AI and repository integration features.
