# E2E Tests for Vote Calculation and Authentication Implementation Plan

## Overview

This plan details the work required to add End-to-End (E2E) tests to the project using Playwright. The goal is to cover two critical user flows: authentication (login/signup) and vote calculation, which were identified as high-risk scenarios in the test plan.

## Current State Analysis

The project currently has unit and integration tests but lacks an E2E testing framework. The `test-plan.md` identifies two high-impact risks that require browser-level testing: "#1 Incorrect vote calculation after reveal" and "#2 Authentication (login/signup) failures". There is no existing E2E test stack.

## Desired End State

A new E2E test suite will be set up using Playwright. This suite will run in the CI/CD pipeline and provide confidence that the critical user flows work correctly from the user's perspective. The tests will run against a real backend and database, with dynamic user creation for test isolation.

### Key Discoveries:

- **E2E Framework**: Playwright is the chosen framework for its speed and features.
- **Test Directory**: E2E tests will be located in a new top-level `e2e/` directory.
- **Base URL**: The tests will run against the local dev server at `http://localhost:4321`.
- **Test Users**: Users will be created dynamically for each test run using the Supabase Admin API to ensure test isolation.

## What We're NOT Doing

- We are not testing every single user flow, only the two highest-risk scenarios identified.
- We are not testing UI appearance or style.
- We are not replacing existing unit or integration tests.

## Implementation Approach

We will introduce Playwright to the project and configure it to work with the Astro dev server. We will create a new `e2e/` directory for the tests and a helper for interacting with the Supabase Admin API to manage test users. The tests will be structured to follow best practices, with clear setup and teardown steps.

---

## Phase 1: Playwright Setup & Configuration

### Overview

This phase prepares the project for E2E testing by installing and configuring Playwright.

### Changes Required:

#### 1. Install Playwright

**File**: `package.json`

**Intent**: Add Playwright as a dev dependency.

**Contract**:
- Run `npm init playwright@latest` to install Playwright and its dependencies.
- This will also create the initial configuration files.

#### 2. Configure Playwright

**File**: `playwright.config.ts` (new file)

**Intent**: Configure Playwright to work with the Astro dev server.

**Contract**:
- Set `testDir` to `./e2e`.
- Configure the `webServer` option to start the Astro dev server (`npm run dev`) before running tests.
- Set the `baseURL` to `http://localhost:4321`.

#### 3. Add `test:e2e` script

**File**: `package.json`

**Intent**: Add a script to easily run the E2E tests.

**Contract**:
- Add `"test:e2e": "playwright test"` to the `scripts` section.

### Success Criteria:

#### Automated Verification:

- A sample Playwright test runs successfully and passes.

#### Manual Verification:

- The `playwright.config.ts` is clean and well-documented.
- The `test:e2e` script works as expected.

---

## Phase 2: Authentication E2E Tests

### Overview

This phase adds E2E tests for the authentication flows (login and registration).

### Changes Required:

#### 1. Supabase Admin Helper

**File**: `e2e/supabase-admin.ts` (new file)

**Intent**: Create a helper to interact with the Supabase Admin API for user management.

**Contract**:
- Export a `supabaseAdmin` client initialized with the service role key from environment variables.
- Export functions to `createTestUser` and `deleteTestUser`.

#### 2. Authentication Test File

**File**: `e2e/auth.spec.ts` (new file)

**Intent**: Create a new test file for authentication-related E2E tests.

**Contract**:
- Use `test.beforeEach` and `test.afterEach` hooks to create and delete a test user for each test.
- A test for successful login with a dynamically created user.
- A test for attempting to log in with an invalid password.
- A test for successful user registration.

### Success Criteria:

#### Automated Verification:

- `npm run test:e2e` passes with tests covering:
    - Successful user registration and login.
    - Correct error handling for invalid login credentials.

#### Manual Verification:

- The tests are easy to understand and cover the specified scenarios.
- The user creation and deletion logic works reliably.

---

## Phase 3: Vote Calculation E2E Tests

### Overview

This phase adds E2E tests for the vote calculation feature.

### Changes Required:

#### 1. Vote Calculation Test File

**File**: `e2e/voting.spec.ts` (new file)

**Intent**: Create a new test file for voting and vote calculation E2E tests.

**Contract**:
- A test where multiple users log in, join a session, vote on a task, and the average is correctly calculated and displayed after reveal.
- An edge case test where no one votes, and a proper message is displayed.
- An edge case test where only one person votes, and their vote is displayed as the average.
- A test to verify that the UI correctly shows who has voted before the reveal.

### Success Criteria:

#### Automated Verification:

- `npm run test:e2e` passes with tests covering:
    - Correct vote calculation for multiple users.
    - Correct handling of the "no votes" edge case.
    - Correct handling of the "single voter" edge case.
    - Correct UI state during voting.

#### Manual Verification:

- The tests are reliable and not flaky.
- The tests accurately reflect the user flow.

## Testing Strategy

### E2E Tests:

- New E2E tests will be added for the authentication and vote calculation user flows.
- These tests will run in a real browser against a local dev server and a real database.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Playwright Setup & Configuration

#### Automated
- [ ] 1.1 A sample Playwright test runs successfully and passes.

#### Manual
- [ ] 1.2 The `playwright.config.ts` is clean and well-documented.
- [ ] 1.3 The `test:e2e` script works as expected.

### Phase 2: Authentication E2E Tests

#### Automated
- [ ] 2.1 `npm run test:e2e` passes with tests covering success and error cases for authentication.

#### Manual
- [ ] 2.2 The tests are easy to understand and cover the specified scenarios.
- [ ] 2.3 The user creation and deletion logic works reliably.

### Phase 3: Vote Calculation E2E Tests

#### Automated
- [ ] 3.1 `npm run test:e2e` passes with tests covering vote calculation scenarios.

#### Manual
- [ ] 3.2 The tests are reliable and not flaky.
- [ ] 3.3 The tests accurately reflect the user flow.
