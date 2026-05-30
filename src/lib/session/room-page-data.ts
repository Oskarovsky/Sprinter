import type { AnalystVotePublic } from "@/lib/repo/types";
import {
  computeHumanAverage,
  formatHumanAverage,
  getAnalystStateForTask,
  getDisplayName,
  getLatestActiveTask,
  getSessionIdBySlug,
  isDefaultDisplayName,
  listParticipation,
  sortParticipationByPoints,
} from "@/lib/session";
import type { SessionSupabaseClient, Task, VoteParticipation } from "./types";

export interface SessionRoomPageData {
  sessionSlug: string;
  planningSessionId: string | null;
  realtimeAccessToken: string | null;
  initialDisplayName: string | null;
  needsDisplayName: boolean;
  initialTask: Task | null;
  initialParticipation: VoteParticipation[];
  initialHumanAverageFormatted: string | null;
  initialAnalyst: AnalystVotePublic | null;
  initialAnalystPending: boolean;
  notFound: boolean;
}

export async function loadSessionRoomPageData(
  supabase: SessionSupabaseClient,
  userId: string,
  sessionSlug: string,
  realtimeAccessToken: string | null,
): Promise<SessionRoomPageData> {
  const empty: SessionRoomPageData = {
    sessionSlug,
    planningSessionId: null,
    realtimeAccessToken,
    initialDisplayName: null,
    needsDisplayName: true,
    initialTask: null,
    initialParticipation: [],
    initialHumanAverageFormatted: null,
    initialAnalyst: null,
    initialAnalystPending: false,
    notFound: false,
  };

  const sessionResult = await getSessionIdBySlug(supabase, sessionSlug);
  if (sessionResult.error) {
    if (sessionResult.error.code === "NOT_FOUND" || sessionResult.error.code === "VALIDATION") {
      return { ...empty, notFound: true };
    }
    return empty;
  }

  const data: SessionRoomPageData = {
    ...empty,
    planningSessionId: sessionResult.data,
    notFound: false,
  };

  const profileResult = await getDisplayName(supabase, userId);
  if (!profileResult.error) {
    data.initialDisplayName = profileResult.data;
    data.needsDisplayName = isDefaultDisplayName(userId, profileResult.data);
  }

  const taskResult = await getLatestActiveTask(supabase, sessionResult.data);
  if (taskResult.error || !taskResult.data) {
    return data;
  }

  data.initialTask = taskResult.data;

  const participationResult = await listParticipation(supabase, taskResult.data.id);
  if (participationResult.error || !participationResult.data) {
    return data;
  }

  data.initialParticipation =
    taskResult.data.status === "revealed"
      ? sortParticipationByPoints(participationResult.data)
      : participationResult.data;

  if (taskResult.data.status === "revealed") {
    const points = data.initialParticipation
      .map((row) => row.story_points)
      .filter((value): value is number => value !== null);
    const average = computeHumanAverage(points);
    data.initialHumanAverageFormatted = average !== null ? formatHumanAverage(average) : null;
  }

  if (taskResult.data.status === "voting" || taskResult.data.status === "revealed") {
    const analystState = await getAnalystStateForTask(supabase, taskResult.data.id, taskResult.data.status);
    data.initialAnalyst = analystState.analyst;
    data.initialAnalystPending = analystState.analystPending;
  }

  return data;
}
