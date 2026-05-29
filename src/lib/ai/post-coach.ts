import type { APIContext } from "astro";
import { generateCoachPrompts, isDivergent } from "@/lib/ai";
import { jsonResponse, requireSessionAuth } from "@/lib/session/api-json";

function parseVotes(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const votes: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isFinite(item)) {
      return null;
    }
    votes.push(item);
  }

  return votes;
}

export async function postCoach(context: APIContext): Promise<Response> {
  const auth = await requireSessionAuth(context);
  if ("response" in auth) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const payload = body as {
    taskTitle?: unknown;
    taskDescription?: unknown;
    votes?: unknown;
  };

  const taskTitle = typeof payload.taskTitle === "string" ? payload.taskTitle.trim() : "";
  if (!taskTitle) {
    return jsonResponse({ error: "taskTitle is required" }, 400);
  }

  const votes = parseVotes(payload.votes);
  if (!votes || votes.length < 2) {
    return jsonResponse({ error: "votes must be an array of at least two numbers" }, 400);
  }

  if (!isDivergent(votes)) {
    return jsonResponse({ error: "votes are not divergent enough for Coach prompts" }, 400);
  }

  const taskDescription =
    typeof payload.taskDescription === "string" && payload.taskDescription.trim().length > 0
      ? payload.taskDescription.trim()
      : undefined;

  const result = await generateCoachPrompts({ taskTitle, taskDescription, votes });
  return jsonResponse(result, 200);
}
