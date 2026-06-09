import { test, expect } from "@playwright/test";

/**
 * This is a seed test. It's a template for writing all other E2E tests in this project.
 *
 * It demonstrates the following conventions:
 * 1.  **Test Isolation**: The test is fully self-contained. It performs its own setup and teardown
 *     and does not depend on the state of any other test.
 * 2.  **State-based Waiting**: It uses `page.waitForURL()` to wait for a specific application
 *     state (a redirect) rather than waiting for an arbitrary amount of time.
 * 3.  **User-facing Selectors**: It uses `page.getByRole()` to find elements, which is how a user
 *     would find them. It avoids brittle CSS selectors or XPath.
 * 4.  **Risk-based Naming**: The test name clearly links to a business/user risk documented in
 *     the project's test plan, explaining *why* the test exists.
 *
 * When the agent is asked to generate new E2E tests, it will use this file as a reference
 * for conventions, style, and structure.
 */
test("[Risk #2] Unauthenticated user is redirected from protected route", async ({
  page,
}) => {
  // 1. ARRANGE: Go to a protected route that requires authentication.
  // This test is read-only and doesn't require data setup, so ARRANGE is simple.
  await page.goto("/dashboard");

  // 2. ACT: No action is needed. The application should automatically redirect.

  // 3. ASSERT: Verify the user is redirected to the sign-in page.
  // First, wait for the URL to change to the sign-in page.
  await page.waitForURL(/.*\/auth\/signin/);

  // Second, verify the content of the sign-in page is correct.
  const mainHeading = page.getByRole("heading", { name: /Sign in/i });
  await expect(mainHeading).toBeVisible();

  // This test is read-only, so no cleanup is necessary.
  // If it created data (e.g., a user), a cleanup step would be required here
  // to ensure test isolation.
});
