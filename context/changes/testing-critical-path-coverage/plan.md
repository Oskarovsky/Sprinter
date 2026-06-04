# Critical Path Integration Tests Implementation Plan

## Overview

This plan details the work required to add integration tests for two critical application features: user authentication (signup/login) and session vote calculation. This directly addresses the top two risks identified in `context/foundation/test-plan.md` (Risk #1 and #2) and establishes a pattern for future API-level integration testing.

## Current State Analysis

Based on the research documented in `context/changes/testing-critical-path-coverage/research.md`, the current state is:
- **Vote Calculation**: Has unit test coverage, but these tests are brittle and do not verify the end-to-end API flow.
- **Authentication**: Has zero test coverage. The primary risk of misconfiguration in a live environment is completely untested.

## Desired End State

- A new suite of integration tests provides coverage for the authentication and vote calculation API endpoints.
- The project is configured to run these integration tests against a dedicated test Supabase instance.
- The CI pipeline is configured to run these new integration tests.
- A cookbook pattern for adding new API integration tests is added to `context/foundation/test-plan.md`.

### Key Discoveries:

- **Auth logic**: Lives in `src/pages/api/auth/signin.ts` and `src/pages/api/auth/signup.ts`.
- **Vote logic**: Lives in `src/pages/api/session/state.ts`.
- **Testing Framework**: The project already uses Vitest, which can be used for these integration tests.

## What We're NOT Doing

- We are not adding end-to-end (UI-level) tests in this change.
- We are not refactoring the underlying application logic, only testing it.

## Implementation Approach

We will create new Vitest-based integration tests that make HTTP requests to the running Astro dev server. For authentication tests, we will configure the environment to point to a separate, dedicated Supabase test project to allow for safe data manipulation without affecting production or development environments.

---

## Phase 1: Test Environment Setup

### Overview

This phase prepares the local environment for integration testing against a dedicated test Supabase instance.

### Changes Required:

#### 1. Environment Configuration

**File**: `.env.test` (new file)

**Intent**: Create a new environment file to hold credentials for the test Supabase instance. This file will be loaded by Vitest.

**Contract**:
```
PUBLIC_SUPABASE_URL="<your_test_supabase_url>"
PUBLIC_SUPABASE_ANON_KEY="<your_test_supabase_anon_key>"
```

#### 2. Test Script Configuration

**File**: `package.json`

**Intent**: Add a new `test:integration` script to run the integration tests using the `.env.test` file.

**Contract**:
Update the `"scripts"` section:
```json
"test:integration": "vitest --config ./vitest.config.ts --mode test"
```

### Success Criteria:

#### Automated Verification:

- [ ] 1.1 The `test:integration` script runs without errors (even if there are no tests yet).

#### Manual Verification:

- [ ] 1.2 A team member has created a new Supabase project for testing and populated the `.env.test` file.

---

## Phase 2: Authentication Integration Tests

### Overview

Add integration tests for the `signin` and `signup` API endpoints.

### Changes Required:

#### 1. New Integration Test File

**File**: `src/pages/api/auth/auth.test.ts` (new file)

**Intent**: Create a new test file for authentication-related integration tests. This will contain tests for both successful and failed signup and signin attempts.

**Contract**:
- A `describe` block for `POST /api/auth/signup`.
- A `describe` block for `POST /api/auth/signin`.
- Tests will use a library like `supertest` or native `fetch` to make requests to the API endpoints.
- Tests will assert on the redirect responses and handle the creation and cleanup of test users in the test Supabase database.

### Success Criteria:

#### Automated Verification:

- [ ] 2.1 `npm run test:integration` passes with tests covering:
    - Successful user signup.
    - Attempted signup with an existing email.
    - Successful user signin.
    - Attempted signin with an incorrect password.

---

## Phase 3: Vote Calculation Integration Tests

### Overview

Add an integration test for the `GET /api/session/state` endpoint to verify the vote calculation logic.

### Changes Required:

#### 1. New Integration Test File

**File**: `src/pages/api/session/session.test.ts` (new file)

**Intent**: Create a new test file for session-related integration tests. This will test the vote calculation logic.

**Contract**:
- A `describe` block for `GET /api/session/state`.
- The test will:
    1.  Programmatically insert a test session, task, and participant votes into the test Supabase database.
    2.  Make a `GET` request to the endpoint.
    3.  Assert that the calculated average in the JSON response is correct for various scenarios (happy path, no votes, ties).

### Success Criteria:

#### Automated Verification:

- [ ] 3.1 `npm run test:integration` passes with tests covering:
    - Correct calculation for a standard set of votes.
    - Correct handling when there are no votes.
    - Correct calculation when votes are tied.

---

## Phase 4: Cookbook Update

### Overview

Update the main `test-plan.md` to include a cookbook recipe for adding new API integration tests.

### Changes Required:

#### 1. Update Test Plan

**File**: `context/foundation/test-plan.md`

**Intent**: Add a new section to the cookbook for API integration tests.

**Contract**:
- Add a new `### 6.4 Adding a test for a new API endpoint` section.
- The section should instruct the reader to create a `<endpoint>.test.ts` file alongside the endpoint and use the newly created tests as a reference.

### Success Criteria:

#### Manual Verification:

- [ ] 4.1 The `test-plan.md` file is updated with the new cookbook section.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Test Environment Setup

#### Automated
- [x] 1.1 The `test:integration` script runs without errors (even if there are no tests yet). — bbf3767

#### Manual
- [x] 1.2 A team member has created a new Supabase project for testing and populated the `.env.test` file. — bbf3767

### Phase 2: Authentication Integration Tests

#### Automated
- [x] 2.1 `npm run test:integration` passes with tests covering: — c749e22
    - Successful user signup.
    - Attempted signup with an existing email.
    - Successful user signin.
    - Attempted signin with an incorrect password.

### Phase 3: Vote Calculation Integration Tests

#### Automated
- [x] 3.1 `npm run test:integration` passes with tests covering: — c749e22
    - Correct calculation for a standard set of votes.
    - Correct handling when there are no votes.
    - Correct calculation when votes are tied.

### Phase 4: Cookbook Update

#### Manual
- [x] 4.1 The `test-plan.md` file is updated with the new cookbook section. — c749e22
