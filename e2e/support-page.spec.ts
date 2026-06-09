import { test, expect } from "@playwright/test";

/**
 * This test is generated to demonstrate the ability to create new, simple E2E tests.
 * It targets a static page that does not require authentication.
 */
test("The support page should display correctly", async ({ page }) => {
  // 1. ARRANGE
  // The test targets the /support page.

  // 2. ACT
  // Navigate to the support page.
  await page.goto("/support");

  // 3. ASSERT
  // The main heading should be visible.
  await expect(
    page.getByRole("heading", { name: "Support", level: 1 })
  ).toBeVisible();

  // The link to GitHub issues should be present and have the correct URL.
  const githubLink = page.getByRole("link", { name: /Open GitHub Issues/ });
  await expect(githubLink).toBeVisible();
  await expect(githubLink).toHaveAttribute("href", /github.com\/.*\/issues/);

  // The link back to the home page should be present.
  await expect(page.getByRole("link", { name: /Back to home/ })).toBeVisible();
});
