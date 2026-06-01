import type { PlanningSessionRow } from "./types";

export interface PlanningSessionRoom {
  id: string;
  slug: string;
  createdAt: string;
}

export function formatPlanningSessionRoom(row: PlanningSessionRow): PlanningSessionRoom {
  return {
    id: row.id,
    slug: row.slug,
    createdAt: row.created_at,
  };
}

export function createRoomErrorStatus(code: string | undefined): number {
  if (code === "VALIDATION") {
    return 400;
  }
  if (code === "DUPLICATE") {
    return 409;
  }
  return 500;
}
