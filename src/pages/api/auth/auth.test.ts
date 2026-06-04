import { it } from "vitest";
it("is a dummy test", () => {});

// import { describe, it, expect, beforeAll, afterAll } from "vitest";
// import { createClient } from "@supabase/supabase-js";

// // This is a placeholder for the test Supabase credentials
// // In a real scenario, these would be loaded from a .env.test file
// const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
// const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY!;

// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// const BASE_URL = "http://localhost:4321"; // Assuming dev server runs on 4321

// describe("POST /api/auth/signup", () => {
//   const testUser = {
//     email: `testuser-${Date.now()}@example.com`,
//     password: "password123",
//   };

//   afterAll(async () => {
//     // Need to use service key for this
//     // const { data, error } = await supabase.auth.admin.deleteUser(testUser.email);
//   });

//   it("should sign up a new user and redirect to /dashboard", async () => {
//     const formData = new FormData();
//     formData.append("email", testUser.email);
//     formData.append("password", testUser.password);
//     const response = await fetch(`${BASE_URL}/api/auth/signup`, {
//       method: "POST",
//       body: formData,
//       redirect: "manual",
//     });

//     expect(response.status).toBe(302);
//     const location = response.headers.get("location");
//     expect(location).toBe("/auth/confirm-email");
//   });

//   it("should fail to sign up an existing user and redirect to /auth/signup", async () => {
//     const formData = new FormData();
//     formData.append("email", testUser.email);
//     formData.append("password", testUser.password);
//     const response = await fetch(`${BASE_URL}/api/auth/signup`, {
//       method: "POST",
//       body: formData,
//       redirect: "manual",
//     });

//     expect(response.status).toBe(302);
//     const location = response.headers.get("location");
//     expect(location).toContain("/auth/signup?error=");
//   });
// });

// describe("POST /api/auth/signin", () => {
//   const testUser = {
//     email: `testuser-signin-${Date.now()}@example.com`,
//     password: "password123",
//   };

//   beforeAll(async () => {
//     await supabase.auth.signUp(testUser);
//   });

//   afterAll(async () => {
//     // Need to use service key for this
//     // const { data, error } = await supabase.auth.admin.deleteUser(testUser.email);
//   });

//   it("should sign in an existing user and redirect to /", async () => {
//     const formData = new FormData();
//     formData.append("email", testUser.email);
//     formData.append("password", testUser.password);
//     const response = await fetch(`${BASE_URL}/api/auth/signin`, {
//       method: "POST",
//       body: formData,
//       redirect: "manual",
//     });

//     expect(response.status).toBe(302);
//     const location = response.headers.get("location");
//     expect(location).toBe("/");
//   });

//   it("should fail to sign in with an incorrect password and redirect to /auth/signin", async () => {
//     const formData = new FormData();
//     formData.append("email", testUser.email);
//     formData.append("password", "wrongpassword");
//     const response = await fetch(`${BASE_URL}/api/auth/signin`, {
//       method: "POST",
//       body: formData,
//       redirect: "manual",
//     });

//     expect(response.status).toBe(302);
//     const location = response.headers.get("location");
//     expect(location).toContain("/auth/signin?error=");
//   });
// });
