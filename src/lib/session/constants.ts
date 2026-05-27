import type { PostgrestError } from "@supabase/supabase-js";

export const FIBONACCI_STORY_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;

export type TaskStatus = "draft" | "voting" | "revealed";

export function isValidStoryPoint(n: number): boolean {
  return Number.isInteger(n) && (FIBONACCI_STORY_POINTS as readonly number[]).includes(n);
}

export function sessionError(message: string, code = "SESSION"): PostgrestError {
  return Object.assign(new Error(message), {
    details: "",
    hint: "",
    code,
  }) as PostgrestError;
}
