import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export const TEST_USER_EMAIL_SUFFIX = "@test.10x-sprinter.com";

// Throw an error if the required environment variables are not set
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

// Create a Supabase client with service role access
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

/**
 * Creates a test user in the database.
 * @param email - The email for the test user.
 * @param password - The password for the test user.
 * @returns The created user object.
 */
export async function createTestUser(email: string, password: string): Promise<User> {
  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
  if (!data.user) {
    throw new Error("Failed to create test user: no user object returned");
  }

  return data.user;
}

/**
 * Deletes a test user from the database.
 * @param userId - The ID of the user to delete.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    // It's possible the user was already deleted in a previous cleanup, so don't throw an error.
    console.warn(`Could not delete test user ${userId}:`, error.message);
  }
}
