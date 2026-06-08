import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { listParticipation, computeHumanAverage, extractHumanStoryPoints, formatHumanAverage } from "./";

// --- Test Setup ---
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Test environment variables are not set. Please check your .env.test file.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

describe("Session Business Logic", () => {
  // --- Unit Tests for pure functions ---
  describe("Average Calculation", () => {
    it("computeHumanAverage should return the raw average", () => {
      expect(computeHumanAverage([3, 5, 8])).toBeCloseTo(5.333);
      expect(computeHumanAverage([8, 8, 13])).toBeCloseTo(9.666);
    });

    it("computeHumanAverage should return null for an empty array", () => {
      expect(computeHumanAverage([])).toBeNull();
    });

    it("formatHumanAverage should format the average to one decimal place", () => {
      expect(formatHumanAverage(5.33333)).toBe("5.3");
      expect(formatHumanAverage(10)).toBe("10.0");
    });

    it("extractHumanStoryPoints should extract non-null story points", () => {
      const participation = [{ story_points: 5 }, { story_points: 8 }, { story_points: null }];
      expect(extractHumanStoryPoints(participation as any)).toEqual([5, 8]);
    });
  });

  // --- Integration Test for database functions ---
  describe("listParticipation", () => {
    let testUserId: string;
    let testSessionId: string;
    let testTaskId: string;

    beforeAll(async () => {
      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.admin.createUser({
        email: `list-part-user-${Date.now()}@example.com`,
        email_confirm: true,
      });
      if (userError) throw userError;
      testUserId = user.id;

      // Create a profile for the user, which is required for the JOIN in the view
      await supabaseAdmin.from("profiles").insert({ user_id: testUserId, display_name: "Test User" });

      const { data: session, error: sessionError } = await supabaseAdmin
        .from("planning_sessions")
        .insert({ slug: `test-list-part-${Date.now()}` })
        .select()
        .single();
      if (sessionError) throw sessionError;
      testSessionId = session.id;

      const { data: task, error: taskError } = await supabaseAdmin
        .from("tasks")
        .insert({ session_id: testSessionId, title: "Test Task", created_by: testUserId })
        .select()
        .single();
      if (taskError) throw taskError;
      testTaskId = task.id;
    });

    afterAll(async () => {
      await supabaseAdmin.from("votes").delete().eq("task_id", testTaskId);
      await supabaseAdmin.from("tasks").delete().eq("id", testTaskId);
      await supabaseAdmin.from("profiles").delete().eq("user_id", testUserId);
      await supabaseAdmin.from("planning_sessions").delete().eq("id", testSessionId);
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
    });

    it("should fetch participation for a given task", async () => {
      await supabaseAdmin.from("votes").insert({ task_id: testTaskId, user_id: testUserId, story_points: 8 });

      // Calling with the admin client bypasses RLS
      const { data, error } = await listParticipation(supabaseAdmin, testTaskId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);

      // The story_points might be null due to the CASE in the view if the task is not 'revealed'
      // and we are not calling as the user. Let's update the task to be revealed.
      await supabaseAdmin.from("tasks").update({ status: "revealed" }).eq("id", testTaskId);

      const { data: revealedData, error: revealedError } = await listParticipation(supabaseAdmin, testTaskId);

      expect(revealedError).toBeNull();
      expect(revealedData).toHaveLength(1);
      expect(revealedData![0].story_points).toBe(8);
      expect(revealedData![0].display_name).toBe("Test User");

      // Cleanup
      await supabaseAdmin.from("votes").delete().eq("task_id", testTaskId);
    });
  });
});
