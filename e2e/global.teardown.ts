import { test as teardown } from "@playwright/test";
import { supabaseAdmin, TEST_USER_EMAIL_SUFFIX } from "./supabase-admin";

teardown("clean up database", async () => {
  console.log("Running global teardown to clean up test users...");

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    console.error("Error listing users during teardown:", error.message);
    // We don't want to throw here, as it might hide the original test failure.
    // Just log the error and continue.
  }

  if (data && data.users) {
    const testUsers = data.users.filter(
      (user) => user.email && user.email.endsWith(TEST_USER_EMAIL_SUFFIX),
    );

    if (testUsers.length === 0) {
      console.log("No test users found to clean up.");
      return;
    }

    console.log(`Found ${testUsers.length} test user(s) to delete...`);

    for (const user of testUsers) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Failed to delete user ${user.id} (${user.email}):`, deleteError.message);
      } else {
        console.log(`Successfully deleted user ${user.id} (${user.email}).`);
      }
    }
  }

  console.log("Global teardown complete.");
});
