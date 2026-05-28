import type { APIRoute } from "astro";
import {
  computeHumanAverage,
  formatHumanAverage,
  getLatestActiveTask,
  getTask,
  listParticipation,
  sortParticipationByPoints,
} from "@/lib/session";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";

export const GET: APIRoute = async (context) => {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  const taskId = context.url.searchParams.get("taskId");
  let taskResult;

  if (taskId) {
    taskResult = await getTask(auth.supabase, taskId);
  } else {
    taskResult = await getLatestActiveTask(auth.supabase);
  }

  if (taskResult.error) {
    return jsonResponse({ error: taskResult.error.message }, 500);
  }

  const task = taskResult.data;
  if (!task) {
    return jsonResponse({ task: null, participation: [], humanAverage: null, humanAverageFormatted: null }, 200);
  }

  const participationResult = await listParticipation(auth.supabase, task.id);
  if (participationResult.error) {
    return jsonResponse({ error: participationResult.error.message }, 500);
  }

  let participation = participationResult.data ?? [];
  let humanAverage: number | null = null;
  let humanAverageFormatted: string | null = null;

  if (task.status === "revealed") {
    participation = sortParticipationByPoints(participation);
    const points = participation.map((row) => row.story_points).filter((value): value is number => value !== null);
    humanAverage = computeHumanAverage(points);
    humanAverageFormatted = humanAverage !== null ? formatHumanAverage(humanAverage) : null;
  }

  return jsonResponse({ task, participation, humanAverage, humanAverageFormatted }, 200);
};
