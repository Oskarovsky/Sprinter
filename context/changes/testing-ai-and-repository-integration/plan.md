# AI and Repository Integration Testing Implementation Plan

## Overview

This plan details the work required to add integration tests for the AI-powered features (draft, coach, analyst) and the repository integration ("Sprinter Analyst"). The goal is to ensure these features are robust and that their error handling and fallback mechanisms work as expected, addressing risks #3 and #4 from the test plan.

## Current State Analysis

The codebase has existing AI and repository integration features but lacks integration tests for them. The research in `context/changes/testing-ai-and-repository-integration/research.md` shows that the features are well-structured, with clear separation of concerns and built-in resilience, but this is not verified by any automated tests.

## Desired End State

A new suite of integration tests will cover the AI and repository integration features. These tests will run as part of the CI pipeline and provide confidence that these features work correctly and handle errors gracefully.

### Key Discoveries:

- AI integration is centralized in `src/lib/ai/openrouter.ts`.
- "Sprinter Analyst" is an asynchronous background job.
- Error handling is robust and logs errors to the database.

## What We're NOT Doing

- We are not testing the quality of the AI responses.
- We are not doing end-to-end (UI-level) testing.
- We are not refactoring the existing application logic.

## Implementation Approach

We will create a new `tests/integration` directory for the new tests. We will use `msw` (Mock Service Worker) to mock the APIs of external services like OpenRouter, GitHub, and GitLab. Each test will be responsible for setting up and tearing down its own database state to ensure isolation. Asynchronous tasks will be tested by calling the trigger function and the task function separately.

---

## Phase 1: Test Setup & Utilities

### Overview

This phase prepares the test environment by setting up API mocking and creating database utilities.

### Changes Required:

#### 1. Mock Service Worker Setup

**File**: `src/test/mocks/http.ts` (new file)

**Intent**: Set up `msw` to intercept and mock HTTP requests to external services.

**Contract**:
- Export a `server` instance from `msw/node`.
- Include handlers for OpenRouter, GitHub, and GitLab APIs.

**File**: `vitest.config.ts`

**Intent**: Integrate `msw` with Vitest.

**Contract**:
- Add a setup file that starts and stops the mock server.

#### 2. Database Utilities

**File**: `src/test/utils/db.ts` (new file)

**Intent**: Create utility functions for setting up and tearing down database state for tests.

**Contract**:
- Export functions to create and delete users, sessions, tasks, etc.
- These functions will use the Supabase admin client to interact with the database.

### Success Criteria:

#### Automated Verification:

- A test successfully uses a mocked API endpoint.
- A test successfully uses a database utility to create and delete a record.

#### Manual Verification:

- The `msw` setup is clean and easy to extend.
- The database utilities are well-documented and easy to use.

---

## Phase 2: AI Integration Tests

### Overview

This phase adds integration tests for the AI features (`draft`, `coach`, and `analyst`).

### Changes Required:

#### 1. AI Integration Test File

**File**: `tests/integration/ai.test.ts` (new file)

**Intent**: Create a new test file for all AI-related integration tests.

**Contract**:
- `describe` blocks for `generateDraftFromNotes`, `generateCoachPrompts`, and `generateAnalystVote`.
- Tests for success cases, fallback logic (for draft and coach), and error handling.
- Use `msw` to mock the OpenRouter API responses for different scenarios.

### Success Criteria:

#### Automated Verification:

- `npm run test:integration` passes with tests covering:
    - Successful generation of drafts, coach prompts, and analyst votes.
    - Fallback logic is correctly triggered when the AI is not configured or fails.
    - Errors are correctly handled and logged for the analyst feature.

#### Manual Verification:

- The tests are easy to understand and cover the most important scenarios.

---

## Phase 3: Repository Integration Tests

### Overview

This phase adds integration tests for the repository linking and "Sprinter Analyst" features.

### Changes Required:

#### 1. Repository Integration Test File

**File**: `tests/integration/repo.test.ts` (new file)

**Intent**: Create a new test file for all repository-related integration tests.

**Contract**:
- `describe` block for repository linking (`/api/repo/link`).
- `describe` block for the "Sprinter Analyst" workflow.
- Tests for repository access verification (public and private).
- Tests for the asynchronous "Sprinter Analyst" workflow by testing the trigger and the analysis function separately.
- Use `msw` to mock the GitHub and GitLab API responses.

### Success Criteria:

#### Automated Verification:

- `npm run test:integration` passes with tests covering:
    - Successful linking of public and private repositories.
    - Correct error handling for invalid repository URLs or tokens.
    - The "Sprinter Analyst" background job is correctly triggered.
    - The analysis function works correctly for different scenarios.

#### Manual Verification:

- The tests for the asynchronous workflow are reliable and easy to understand.

## Testing Strategy

### Unit Tests:

- Existing unit tests will be maintained.

### Integration Tests:

- New integration tests will be added for the AI and repository integration features.
- These tests will focus on the integration points and error handling.

### Manual Testing Steps:

- After the tests are implemented, manually run the application and verify that the AI and repository integration features still work as expected.

## References

- Related research: `context/changes/testing-ai-and-repository-integration/research.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Test Setup & Utilities

#### Automated
- [x] 1.1 A test successfully uses a mocked API endpoint. — 05d8779
- [x] 1.2 A test successfully uses a database utility to create and delete a record. — 05d8779

#### Manual
- [x] 1.3 The `msw` setup is clean and easy to extend. — 05d8779
- [x] 1.4 The database utilities are well-documented and easy to use. — 05d8779

### Phase 2: AI Integration Tests

#### Automated
- [x] 2.1 `npm run test:integration` passes with tests covering success, fallback, and error cases for AI features. — 4e83b42

#### Manual
- [x] 2.2 The tests are easy to understand and cover the most important scenarios. — 4e83b42

### Phase 3: Repository Integration Tests

#### Automated
- [x] 3.1 `npm run test:integration` passes with tests covering repository linking and the "Sprinter Analyst" workflow.

#### Manual
- [x] 3.2 The tests for the asynchronous workflow are reliable and easy to understand.
