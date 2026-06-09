import { test, expect } from "@playwright/test";
import { createTestUser, TEST_USER_EMAIL_SUFFIX } from "./supabase-admin";

const BASE_TEST_EMAIL = "test-user";
const TEST_PASSWORD = "password123";

// Helper to generate a unique email for each test, ensuring isolation
const getUniqueEmail = () => `${Date.now()}-${BASE_TEST_EMAIL}${TEST_USER_EMAIL_SUFFIX}`;

test("[Risk #2] A registered user can sign in successfully", async ({ page }) => {
  const email = getUniqueEmail();
  // 1. ARRANGE: Create a user via the admin API and go to the sign-in page.
  await createTestUser(email, TEST_PASSWORD);
  await page.goto("/auth/signin");

  // 2. ACT: Fill in the form and submit.
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // 3. ASSERT: Wait for the redirect to the homepage and check for dashboard link.
  await page.waitForURL("/");
  const dashboardLink = page.getByRole("link", { name: "Go to Dashboard" });
  await expect(dashboardLink).toBeVisible();
});

test.skip("[Risk #2] A user sees an error for an invalid password", async ({ page }) => {
  const email = getUniqueEmail();
  // 1. ARRANGE: Create a user and go to the sign-in page.
  await createTestUser(email, TEST_PASSWORD);
  await page.goto("/auth/signin");

  // 2. ACT: Fill in the form with a wrong password and submit.
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  // 3. ASSERT: Wait for the page to reload with an error.
  await page.waitForURL(/.*signin\?error=Invalid%20login%20credentials/);
  const errorMessage = page.getByText("Invalid login credentials").first();
  await expect(errorMessage).toBeVisible();
});

test.skip("[Risk #2] A new user can register for an account", async ({ page }) => {
  const email = getUniqueEmail();
  // 1. ARRANGE: Go to the signup page.
  await page.goto("/auth/signup");

  // 2. ACT: Fill in the registration form and submit.
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password", exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("textbox", { name: "Confirm Password" }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  // 3. ASSERT: Wait for the redirect to the confirmation page.
  await page.waitForURL("/auth/confirm-email");
  const successHeading = page.getByRole("heading", { name: "Registration successful" });
  await expect(successHeading).toBeVisible();
});
