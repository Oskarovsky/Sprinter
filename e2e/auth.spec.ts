import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, supabaseAdmin } from "./supabase-admin";
import type { User } from "@supabase/supabase-js";

const BASE_TEST_EMAIL = "test-user@example.com";
const TEST_PASSWORD = "password123";

// Helper to generate a unique email for each test
const getUniqueEmail = () => `${Date.now()}-${BASE_TEST_EMAIL}`;

test("should allow a user to sign in", async ({ page }) => {
  // Add 1-second delay to bypass Supabase auth rate-limiting (max 5/sec)
  await page.waitForTimeout(1000);

  const email = getUniqueEmail();
  let user: User | undefined;
  try {
    // 1. ARRANGE
    user = await createTestUser(email, TEST_PASSWORD);
    await page.goto("/auth/signin");

    // 2. ACT
    await page.locator('input[name="email"]').pressSequentially(email);
    await page.locator('input[name="password"]').pressSequentially(TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // 3. ASSERT
    await page.waitForURL("/");
    const dashboardLink = page.getByRole("link", { name: "Go to Dashboard" });
    await expect(dashboardLink).toBeVisible();
  } finally {
    if (user) {
      await deleteTestUser(user.id);
    }
  }
});

test("should show an error for invalid password", async ({ page }) => {
  // Add 1-second delay to bypass Supabase auth rate-limiting (max 5/sec)
  await page.waitForTimeout(1000);

  const email = getUniqueEmail();
  let user: User | undefined;
  try {
    // 1. ARRANGE
    user = await createTestUser(email, TEST_PASSWORD);
    await page.goto("/auth/signin");

    // 2. ACT
    await page.locator('input[name="email"]').pressSequentially(email);
    await page.locator('input[name="password"]').pressSequentially("wrong-password");
    await page.click('button[type="submit"]');

    // 3. ASSERT
    await expect(async () => {
      const errorMessage = page.getByText("Invalid login credentials").first();
      await expect(errorMessage).toBeVisible();
    }).toPass();
  } finally {
    if (user) {
      await deleteTestUser(user.id);
    }
  }
});

test("should allow a user to register", async ({ page }) => {
  // Add 1-second delay to bypass Supabase auth rate-limiting (max 3/sec)
  await page.waitForTimeout(1000);

  const email = getUniqueEmail();
  let user: User | undefined;
  try {
    // 1. ARRANGE
    await page.goto("/auth/signup");

    // 2. ACT
    await page.locator('input[name="email"]').pressSequentially(email);
    await page.locator('input[name="password"]').pressSequentially(TEST_PASSWORD);
    await page.locator('input[name="confirmPassword"]').pressSequentially(TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // 3. ASSERT
    await page.waitForURL("/auth/confirm-email");
    const successHeading = page.getByRole("heading", { name: "Registration successful" });
    await expect(successHeading).toBeVisible();
  } finally {
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    user = data.users.find((u) => u.email === email);
    if (user) {
      await deleteTestUser(user.id);
    }
  }
});
