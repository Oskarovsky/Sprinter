# External API Hardening Implementation Plan

## Overview

This plan will add a new test suite to run tests against the real OpenRouter API and document the process for running these tests. This will allow for end-to-end testing of the AI features and ensure that the integration is working as expected.

## Current State Analysis

The project already has a robust testing strategy that uses mocking by default to control costs. However, there is no easy way to run tests against the real OpenRouter API. The research document `context/changes/testing-external-api-hardening/research.md` provides a detailed analysis of the current state.

## Desired End State

Developers will be able to run a separate test suite that uses a real OpenRouter API key to test the AI features. The process for running these tests will be documented in the `README.md` file.

## What We're NOT Doing

- Converting all existing tests to use the real API.
- Testing all AI features against the real API.

## Implementation Approach

The plan is to create a new Vitest test suite that will be configured to run tests tagged with `real-api`. A new script will be added to `package.json` to run this test suite. The tests will use an `OPENROUTER_API_KEY` from a `.env.test.local` file, which will be ignored by git.

## Phase 1: Create Real API Test Suite

### Overview

This phase will create a new test suite and a test file that runs a single AI feature against the real OpenRouter API.

### Changes Required:

#### 1. Configure Vitest for Real API Tests

**File**: `vitest.config.ts`

**Intent**: Add a new test suite for real API tests.

**Contract**:
- Add a new `real-api` suite to the Vitest config.
- This suite will look for files with `.real-api.` in their name.
- It will exclude these tests from the default test run.

#### 2. Create Real API Test File

**File**: `tests/integration/ai.real-api.test.ts`

**Intent**: Create a new test file for real API tests.

**Contract**:
- This file will contain a test that calls the `generateAnalystVote` function.
- The test will not use `msw` to mock the OpenRouter API.
- The test will assert that the `generateAnalystVote` function returns a valid response.

#### 3. Add Script to `package.json`

**File**: `package.json`

**Intent**: Add a new script to run the real API tests.

**Contract**:
- Add a new script `test:real-api` that runs the `real-api` test suite.

#### 4. Update `.gitignore`

**File**: `.gitignore`

**Intent**: Ignore the `.env.test.local` file.

**Contract**:
- Add `.env.test.local` to the `.gitignore` file.

### Success Criteria:

#### Automated Verification:

- The new `test:real-api` script runs the real API tests.
- The default `test` script does not run the real API tests.

#### Manual Verification:

- Create a `.env.test.local` file with a valid `OPENROUTER_API_KEY`.
- Run the `test:real-api` script and see the tests pass.

---

## Phase 2: Add Documentation

### Overview

This phase will add a new section to the `README.md` file explaining how to run the real API tests.

### Changes Required:

#### 1. Update `README.md`

**File**: `README.md`

**Intent**: Add documentation for running real API tests.

**Contract**:
- Add a new section "Running Real API Tests".
- This section will explain how to create the `.env.test.local` file and run the `test:real-api` script.

### Success Criteria:

#### Manual Verification:

- A developer can follow the instructions in the `README.md` to run the real API tests successfully.

---

## Testing Strategy

### Integration Tests:

- A new integration test will be added that calls the real OpenRouter API.

### Manual Testing Steps:

1. Create a `.env.test.local` file with a valid `OPENROUTER_API_KEY`.
2. Run `npm run test:real-api`.
3. Verify that the tests pass.
4. Read the new section in the `README.md` and verify that the instructions are clear.

## References

- Related research: `context/changes/testing-external-api-hardening/research.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Create Real API Test Suite

#### Automated

- [x] 1.1 The new `test:real-api` script runs the real API tests.
- [x] 1.2 The default `test` script does not run the real API tests.

#### Manual

- [x] 1.3 Create a `.env.test.local` file with a valid `OPENROUTER_API_KEY`.
- [x] 1.4 Run the `test:real-api` script and see the tests pass.

### Phase 2: Add Documentation

#### Manual

- [ ] 2.1 A developer can follow the instructions in the `README.md` to run the real API tests successfully.
