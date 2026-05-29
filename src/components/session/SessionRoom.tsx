import React, { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { FIBONACCI_STORY_POINTS } from "@/lib/session/constants";
import { connectSessionRoomRealtime, type SessionRealtimeConnectionStatus } from "@/lib/session/realtime";
import type { Task, VoteParticipation } from "@/lib/session/types";
import SprinterDraftPanel from "@/components/session/SprinterDraftPanel";

interface SessionStateResponse {
  task: Task | null;
  participation: VoteParticipation[];
  humanAverage: number | null;
  humanAverageFormatted: string | null;
}

interface Props {
  userId: string;
  initialDisplayName: string | null;
  needsDisplayName: boolean;
  initialTask: Task | null;
  initialParticipation: VoteParticipation[];
  initialHumanAverageFormatted: string | null;
  realtimeAccessToken: string | null;
  planningSessionId: string | null;
}

function formatStoryPoints(points: number | null, isRevealed: boolean): string {
  if (points !== null) {
    return String(points);
  }
  return isRevealed ? "—" : "Hidden";
}

function connectionLabel(status: SessionRealtimeConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Live";
    case "connecting":
      return "Connecting…";
    case "disconnected":
      return "Disconnected";
    case "error":
      return "Connection error";
    case "unconfigured":
      return "Realtime unavailable";
  }
}

function connectionClassName(status: SessionRealtimeConnectionStatus): string {
  switch (status) {
    case "connected":
      return "border-emerald-400/40 bg-emerald-500/20 text-emerald-100";
    case "connecting":
      return "border-amber-400/40 bg-amber-500/20 text-amber-100";
    case "error":
    case "disconnected":
      return "border-rose-400/40 bg-rose-500/20 text-rose-100";
    case "unconfigured":
      return "border-white/20 bg-white/10 text-blue-100/70";
  }
}

function initialConnectionStatus(planningSessionId: string | null): SessionRealtimeConnectionStatus {
  if (!planningSessionId) {
    return "unconfigured";
  }
  return createBrowserClient() ? "connecting" : "unconfigured";
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${response.status})`;
}

export default function SessionRoom({
  userId,
  initialDisplayName,
  needsDisplayName: initialNeedsDisplayName,
  initialTask,
  initialParticipation,
  initialHumanAverageFormatted,
  realtimeAccessToken,
  planningSessionId,
}: Props) {
  const [needsDisplayName, setNeedsDisplayName] = useState(initialNeedsDisplayName);
  const [displayNameInput, setDisplayNameInput] = useState(initialDisplayName ?? "");
  const [task, setTask] = useState<Task | null>(initialTask);
  const [participation, setParticipation] = useState<VoteParticipation[]>(initialParticipation);
  const [humanAverageFormatted, setHumanAverageFormatted] = useState<string | null>(initialHumanAverageFormatted);
  const [connectionStatus, setConnectionStatus] = useState<SessionRealtimeConnectionStatus>(() =>
    initialConnectionStatus(planningSessionId),
  );
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const isCreator = task?.created_by === userId;
  const isRevealed = task?.status === "revealed";
  const isVoting = task?.status === "voting";
  const isDraft = task?.status === "draft";
  const ownVote = participation.find((row) => row.user_id === userId)?.story_points ?? null;
  const showLiveBadge = Boolean(planningSessionId);

  const refetchState = useCallback(async (taskId?: string) => {
    const query = taskId ? `?taskId=${encodeURIComponent(taskId)}` : "";
    const response = await fetch(`/api/session/state${query}`);
    if (!response.ok) {
      setBannerError(await readError(response));
      return;
    }

    const data = (await response.json()) as SessionStateResponse;
    setTask(data.task);
    setParticipation(data.participation);
    setHumanAverageFormatted(data.humanAverageFormatted);
    setBannerError(null);
  }, []);

  useEffect(() => {
    if (!planningSessionId || needsDisplayName) {
      return;
    }

    const supabase = createBrowserClient();
    if (!supabase) {
      return;
    }

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void connectSessionRoomRealtime(
      supabase,
      planningSessionId,
      () => {
        void refetchState();
      },
      {
        accessToken: realtimeAccessToken,
        onStatusChange: setConnectionStatus,
      },
    )
      .then((disconnect) => {
        if (cancelled) {
          disconnect?.();
          return;
        }

        cleanup = disconnect ?? undefined;
      })
      .catch(() => {
        setConnectionStatus("error");
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [planningSessionId, needsDisplayName, realtimeAccessToken, refetchState]);

  async function saveDisplayName(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setBannerError(null);
    try {
      const response = await fetch("/api/session/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayNameInput }),
      });
      if (!response.ok) {
        setBannerError(await readError(response));
        return;
      }
      setNeedsDisplayName(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createTask(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setBannerError(null);
    try {
      const response = await fetch("/api/session/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDescription || undefined }),
      });
      if (!response.ok) {
        setBannerError(await readError(response));
        return;
      }
      const data = (await response.json()) as { task: Task };
      setTask(data.task);
      setParticipation([]);
      setHumanAverageFormatted(null);
      setNewTitle("");
      setNewDescription("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startVoting() {
    if (!task) {
      return;
    }
    setIsSubmitting(true);
    setBannerError(null);
    try {
      const response = await fetch(`/api/session/tasks/${task.id}/start-voting`, { method: "POST" });
      if (!response.ok) {
        setBannerError(await readError(response));
        return;
      }
      const data = (await response.json()) as { task: Task };
      setTask(data.task);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function castVote(storyPoints: number) {
    if (!task) {
      return;
    }
    setIsSubmitting(true);
    setBannerError(null);
    try {
      const response = await fetch("/api/session/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, storyPoints }),
      });
      if (!response.ok) {
        setBannerError(await readError(response));
        return;
      }
      await refetchState(task.id);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function revealVotes() {
    if (!task) {
      return;
    }
    setIsSubmitting(true);
    setBannerError(null);
    try {
      const response = await fetch("/api/session/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      if (!response.ok) {
        setBannerError(await readError(response));
        return;
      }
      const data = (await response.json()) as { task: Task };
      setTask(data.task);
      await refetchState(task.id);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (needsDisplayName) {
    return (
      <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-left">
        <h2 className="text-lg font-semibold text-white">Choose your display name</h2>
        <p className="mt-2 text-sm text-blue-100/70">Other participants see this name — not your email.</p>
        {bannerError ? (
          <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100">
            {bannerError}
          </p>
        ) : null}
        <form onSubmit={saveDisplayName} className="mt-4 space-y-3">
          <label className="block text-sm text-blue-100/90">
            Display name
            <input
              type="text"
              value={displayNameInput}
              onChange={(e) => {
                setDisplayNameInput(e.target.value);
              }}
              maxLength={64}
              required
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500/30 disabled:opacity-50"
          >
            Continue to session
          </button>
        </form>
      </section>
    );
  }

  const showCreateForm = !task || isRevealed;

  return (
    <section aria-labelledby="session-room-heading" className="mt-8 space-y-6 text-left">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-6">
        <div>
          <h2 id="session-room-heading" className="text-lg font-semibold text-white">
            Planning room
          </h2>
          {task ? <p className="mt-1 text-sm text-blue-100/80">{task.title}</p> : null}
        </div>
        {showLiveBadge ? (
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${connectionClassName(connectionStatus)}`}
            role="status"
            aria-live="polite"
          >
            {connectionLabel(connectionStatus)}
          </span>
        ) : null}
      </div>

      {bannerError ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100" role="alert">
          {bannerError}
        </p>
      ) : null}

      {showCreateForm ? (
        <>
          <SprinterDraftPanel
            onApplyDraft={({ title, description }) => {
              setNewTitle(title);
              setNewDescription(description);
              setBannerError(null);
            }}
          />
          <form onSubmit={createTask} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-sm font-medium text-white">{isRevealed ? "Start next task" : "Create a task"}</h3>
            <label className="block text-sm text-blue-100/90">
              Title
              <input
                type="text"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                }}
                required
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-blue-100/90">
              Description (optional)
              <textarea
                value={newDescription}
                onChange={(e) => {
                  setNewDescription(e.target.value);
                }}
                rows={2}
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500/30 disabled:opacity-50"
            >
              Create task
            </button>
          </form>
        </>
      ) : null}

      {task && isDraft && isCreator ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-blue-100/70">Task is ready. Start voting when the team is set.</p>
          <button
            type="button"
            onClick={() => {
              void startVoting();
            }}
            disabled={isSubmitting}
            className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500/30 disabled:opacity-50"
          >
            Start voting
          </button>
        </div>
      ) : null}

      {task && isVoting ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-sm font-medium text-white">Your vote</h3>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Story point values">
            {FIBONACCI_STORY_POINTS.map((points) => (
              <button
                key={points}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  void castVote(points);
                }}
                className={`min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  ownVote === points
                    ? "border-purple-300 bg-purple-500/30 text-white"
                    : "border-white/20 bg-white/10 text-blue-100 hover:bg-white/20"
                }`}
              >
                {points}
              </button>
            ))}
          </div>
          {isCreator ? (
            <button
              type="button"
              onClick={() => {
                void revealVotes();
              }}
              disabled={isSubmitting}
              className="mt-4 rounded-lg border border-amber-400/40 bg-amber-500/20 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500/30 disabled:opacity-50"
            >
              Reveal votes
            </button>
          ) : null}
        </div>
      ) : null}

      {task && (isVoting || isRevealed) ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-sm font-medium text-blue-100/90">Who voted</h3>
          {isRevealed && humanAverageFormatted ? (
            <p className="mt-3 rounded-lg border border-purple-400/30 bg-purple-500/15 px-3 py-2 text-lg font-semibold text-purple-100">
              Team average: {humanAverageFormatted}
            </p>
          ) : (
            <p className="mt-2 text-sm text-blue-100/60">Peer story points stay hidden until reveal.</p>
          )}
          {participation.length === 0 ? (
            <p className="mt-2 text-sm text-blue-100/60">No votes yet.</p>
          ) : (
            <ul className="mt-3 space-y-2" aria-label="Participants who voted">
              {participation.map((row) => {
                const isSelf = row.user_id === userId;
                return (
                  <li
                    key={row.user_id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    <span className="text-white">
                      {row.display_name}
                      {isSelf ? <span className="ml-2 text-xs text-blue-100/60">(you)</span> : null}
                    </span>
                    <span className="text-blue-100/80">{formatStoryPoints(row.story_points, isRevealed)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
