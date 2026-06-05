import { describe, it, expect, beforeAll, vi, type MockedFunction } from "vitest";
import { POST as signUpHandler } from "./signup";
import { POST as signInHandler } from "./signin";
import type { APIContext } from "astro";
import { createClient } from "@/lib/supabase";

// --- Vitest Mocks ---
// Mock the createClient function from our supabase lib
vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(),
}));

// --- Test Setup ---

// Function to create a mock Astro APIContext
function createMockContext(formData: FormData): APIContext {
  const cookies = new Map<string, string>();
  return {
    request: {
      formData: async () => formData,
      headers: new Headers(),
    } as any,
    cookies: {
      get: (key: string) => ({ value: cookies.get(key) }),
      set: (key: string, value: string) => cookies.set(key, value),
    } as any,
    redirect: vi.fn(),
    locals: {},
  };
}

describe("Authentication API Handlers", () => {
  const mockSupabaseClient = {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  };

  beforeAll(() => {
    // Before all tests, make our mocked createClient return our mock client
    (createClient as MockedFunction<typeof createClient>).mockReturnValue(mockSupabaseClient as any);
  });
<<<<<<< HEAD

=======
  
>>>>>>> 0724f46f8394d1cd00dfb003f22d539b384b71bd
  // --- Signup Tests ---
  describe("POST /api/auth/signup", () => {
    const testUser = {
      email: `test-signup-${Date.now()}@example.com`,
      password: "password123",
    };
<<<<<<< HEAD

=======
    
>>>>>>> 0724f46f8394d1cd00dfb003f22d539b384b71bd
    it("should call Supabase signUp and redirect on success", async () => {
      const formData = new FormData();
      formData.append("email", testUser.email);
      formData.append("password", testUser.password);
<<<<<<< HEAD

=======
      
>>>>>>> 0724f46f8394d1cd00dfb003f22d539b384b71bd
      const context = createMockContext(formData);
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({ error: null });

      await signUpHandler(context);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: testUser.email,
        password: testUser.password,
      });
      expect(context.redirect).toHaveBeenCalledWith("/auth/confirm-email");
    });

    it("should redirect with an error if signup fails", async () => {
      const formData = new FormData();
      formData.append("email", testUser.email);
      formData.append("password", testUser.password);

      const context = createMockContext(formData);
      const mockError = { message: "User already registered" };
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({ error: mockError });

      await signUpHandler(context);
<<<<<<< HEAD

=======
      
>>>>>>> 0724f46f8394d1cd00dfb003f22d539b384b71bd
      expect(context.redirect).toHaveBeenCalledWith(`/auth/signup?error=${encodeURIComponent(mockError.message)}`);
    });
  });

  // --- Signin Tests ---
  describe("POST /api/auth/signin", () => {
    const testUser = {
      email: `test-signin-${Date.now()}@example.com`,
      password: "password123",
    };

    it("should call Supabase signIn and redirect on success", async () => {
      const formData = new FormData();
      formData.append("email", testUser.email);
      formData.append("password", testUser.password);
<<<<<<< HEAD

=======
      
>>>>>>> 0724f46f8394d1cd00dfb003f22d539b384b71bd
      const context = createMockContext(formData);
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({ error: null });

      await signInHandler(context);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: testUser.email,
        password: testUser.password,
      });
      expect(context.redirect).toHaveBeenCalledWith("/");
    });

    it("should redirect with an error if signin fails", async () => {
      const formData = new FormData();
      formData.append("email", testUser.email);
      formData.append("password", "wrong-password");

      const context = createMockContext(formData);
      const mockError = { message: "Invalid login credentials" };
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({ error: mockError });

      await signInHandler(context);

      expect(context.redirect).toHaveBeenCalledWith(`/auth/signin?error=${encodeURIComponent(mockError.message)}`);
    });
  });
});
