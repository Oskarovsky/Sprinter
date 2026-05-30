import type { APIRoute } from "astro";
import {
  computeHumanAverage,
  extractHumanStoryPoints,
  formatHumanAverage,
  getAnalystStateForTask,
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
    return jsonResponse(
      {
        task: null,
        participation: [],
        humanAverage: null,
        humanAverageFormatted: null,
        analyst: null,
        analystPending: false,
      },
      200,
    );
  }

  const participationResult = await listParticipation(auth.supabase, task.id);
  if (participationResult.error) {
    return jsonResponse({ error: participationResult.error.message }, 500);
  }

  let participation = participationResult.data ?? [];
  let humanAverage: number | null = null;
  let humanAverageFormatted: string | null = null;
  let analyst = null;
  let analystPending = false;

  if (task.status === "revealed") {
    participation = sortParticipationByPoints(participation);
    humanAverage = computeHumanAverage(extractHumanStoryPoints(participation));
    humanAverageFormatted = humanAverage !== null ? formatHumanAverage(humanAverage) : null;
  }

  if (task.status === "voting" || task.status === "revealed") {
    const analystState = await getAnalystStateForTask(auth.supabase, task.id, task.status);
    analyst = analystState.analyst;
    analystPending = analystState.analystPending;
  }

  return jsonResponse({ task, participation, humanAverage, humanAverageFormatted, analyst, analystPending }, 200);
};
