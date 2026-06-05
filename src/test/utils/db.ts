import { createServiceRoleClient } from "@/lib/supabase-service";

export async function createUser(email, password) {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error("Supabase service role client not available");
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }
  // Create a profile for the new user
  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: data.user.id,
    display_name: email.split("@")[0],
  });

  if (profileError) {
    // If profile creation fails, delete the user to clean up
    await supabase.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }

  return data.user;
}

export async function deleteUser(userId) {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    throw new Error("Supabase service role client not available");
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }
}
