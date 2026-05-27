import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskStatus } from "./constants";

export interface Profile {
  user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  created_by: string;
  status: TaskStatus;
  revealed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  task_id: string;
  user_id: string;
  story_points: number;
  voted_at: string;
}

export interface VoteParticipation {
  task_id: string;
  user_id: string;
  display_name: string;
  voted_at: string;
  story_points: number | null;
}

export type SessionSupabaseClient = SupabaseClient;

export interface PlanningSessionRow {
  id: string;
  slug: string;
  created_at: string;
}

export interface ProfileDisplayNameRow {
  display_name: string;
}
