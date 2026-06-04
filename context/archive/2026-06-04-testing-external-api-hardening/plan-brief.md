# External API Hardening - Plan Brief

> Full plan: `context/changes/testing-external-api-hardening/plan.md`
> Research: `context/changes/testing-external-api-hardening/research.md`

## What & Why

This plan adds a new test suite to run integration tests against the real OpenRouter API. This will allow for end-to-end testing of the AI features and ensure that the integration is working as expected.

## Starting Point

The project already has a robust testing strategy that uses mocking by default to control costs. However, there is no easy way to run tests against the real OpenRouter API.

## Desired End State

Developers will be able to run a separate test suite that uses a real OpenRouter API key to test the AI features. The process for running these tests will be documented in the `README.md` file.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Test Approach | Separate test suite | Isolates real API tests from mocked tests. | Plan |
| API Key Management| `.env.test.local` | Keeps the API key separate and out of version control. | Plan |
| Documentation | `README.md` | Easy to find for anyone new to the project. | Plan |
| Test Scope | Single feature test | Sufficient to verify the end-to-end integration. | Plan |

## Scope

**In scope:**
- Creating a new test suite for real API tests.
- Adding one test file that calls the real OpenRouter API.
- Documenting the process in the `README.md`.

**Out of scope:**
- Converting all existing tests to use the real API.
- Testing all AI features against the real API.

## Architecture / Approach

The plan is to create a new Vitest test suite that will be configured to run tests tagged with `real-api`. A new script will be added to `package.json` to run this test suite. The tests will use an `OPENROUTER_API_KEY` from a `.env.test.local` file, which will be ignored by git.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Create Real API Test Suite | A new test suite and a test file for real API tests. | The real API key is not configured correctly. |
| 2. Add Documentation | A new section in the `README.md` with instructions. | The documentation is unclear. |

**Prerequisites:**
- A valid OpenRouter API key.

**Estimated effort:**
- ~1 session across 2 phases.

## Open Risks & Assumptions

- Assumes that developers will have a valid OpenRouter API key.

## Success Criteria (Summary)

- A developer can run the new test suite and see the tests pass.
- A developer can follow the instructions in the `README.md` to run the tests.
