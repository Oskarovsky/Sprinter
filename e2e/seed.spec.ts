import { test as base, expect } from "@playwright/test";

// Override storage state for this file to test unauthenticated user flow.
const test = base.extend({
  storageState: ({}, use) => use({ cookies: [], origins: [] }),
});

/**
 * SEED TEST
 *
 * This test demonstrates the conventions for writing E2E tests in this project.
 * It is used by the /10x-e2e skill as a template for generating new tests.
 *
 * This seed test covers a critical authentication scenario for GUEST users.
 *
 * Conventions demonstrated:
 * - Using `getByRole` for robust, user-facing selectors.
 * - Waiting for state changes (e.g., URL changes) instead of fixed timeouts.
 * - Linking the test name to a business risk from the test plan (`test-plan.md`).
 * - Ensuring tests are isolated and can run independently.
 * - Using web-first assertions like `toBeVisible()` and `toHaveURL()`.
 */
test("[Risk #2] Unauthenticated user is redirected to signin from protected route", async ({
  page,
}) => {
  // 1. ARRANGE
  // The user is unauthenticated by default in a new browser context.
  // The protected route is `/dashboard`.

  // 2. ACT
  // Attempt to navigate to the protected dashboard page.
  await page.goto("/dashboard");

  // 3. ASSERT
  // The user should be redirected to the sign-in page.
  await expect(page).toHaveURL(/.*\/auth\/signin/);

  // The sign-in form/heading should be visible. This confirms the user is on the correct page
  // and that the page has rendered correctly.
  const mainHeading = page.getByRole("heading", {
    name: /Sign In/i,
  });
  await expect(mainHeading).toBeVisible();

  // This test is read-only, so no cleanup is necessary.
  // If it created data (e.g., a user), a cleanup step would be required here
  // to ensure test isolation.
});
