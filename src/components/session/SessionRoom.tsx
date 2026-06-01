import React, { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { FIBONACCI_STORY_POINTS } from "@/lib/session/constants";
import { connectSessionRoomRealtime, type SessionRealtimeConnectionStatus } from "@/lib/session/realtime";
import { fetchSessionRepoStatus, type AnalystVotePublic, type SessionRepoStatus } from "@/lib/session/repo-client";
import type { Task, VoteParticipation } from "@/lib/session/types";
import AnalystPendingIndicator from "@/components/session/AnalystPendingIndicator";
import AnalystReferenceCard from "@/components/session/AnalystReferenceCard";
import RepoLinkModal from "@/components/session/RepoLinkModal";
import TaskHistoryMock from "@/components/session/TaskHistoryMock";

interface SessionStateResponse {
  task: Task | null;
  participation: VoteParticipation[];
  humanAverage: number | null;
  humanAverageFormatted: string | null;
  analyst: AnalystVotePublic | null;
  analystPending: boolean;
}

interface Props {
  userId: string;
  initialDisplayName: string | null;
  needsDisplayName: boolean;
  initialTask: Task | null;
  initialParticipation: VoteParticipation[];
  initialHumanAverageFormatted: string | null;
  initialAnalyst: AnalystVotePublic | null;
  initialAnalystPending: boolean;
  realtimeAccessToken: string | null;
  planningSessionId: string | null;
  sessionSlug: string;
}

function withSessionSlug(path: string, sessionSlug: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ sessionSlug, ...extra });
  return `${path}?${params.toString()}`;
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

function readInitialRepoQuery(): { repoError: string | null; repoLinked: boolean } {
  if (typeof window === "undefined") {
    return { repoError: null, repoLinked: false };
  }
  const params = new URLSearchParams(window.location.search);
  const repoLinked = params.get("repoLinked") === "1";
  const repoErrorParam = params.get("repoError");
  if (repoLinked || repoErrorParam) {
    window.history.replaceState({}, "", window.location.pathname);
  }
  return {
    repoError: repoErrorParam ? decodeURIComponent(repoErrorParam) : null,
    repoLinked,
  };
}

export default function SessionRoom({
  userId,
  initialDisplayName,
  needsDisplayName: initialNeedsDisplayName,
  initialTask,
  initialParticipation,
  initialHumanAverageFormatted,
  initialAnalyst,
  initialAnalystPending,
  realtimeAccessToken,
  planningSessionId,
  sessionSlug,
}: Props) {
  const [needsDisplayName, setNeedsDisplayName] = useState(initialNeedsDisplayName);
  const [displayNameInput, setDisplayNameInput] = useState(initialDisplayName ?? "");
  const [task, setTask] = useState<Task | null>(initialTask);
  const [participation, setParticipation] = useState<VoteParticipation[]>(initialParticipation);
  const [humanAverageFormatted, setHumanAverageFormatted] = useState<string | null>(initialHumanAverageFormatted);
  const [connectionStatus, setConnectionStatus] = useState<SessionRealtimeConnectionStatus>(() =>
    initialConnectionStatus(planningSessionId),
  );
  const [initialRepoQuery] = useState(readInitialRepoQuery);
  const [bannerError, setBannerError] = useState<string | null>(initialRepoQuery.repoError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyst, setAnalyst] = useState<AnalystVotePublic | null>(initialAnalyst);
  const [analystPending, setAnalystPending] = useState(initialAnalystPending);
  const [repoStatus, setRepoStatus] = useState<SessionRepoStatus | null>(null);
  const [repoModalOpen, setRepoModalOpen] = useState(false);

  const isCreator = task?.created_by === userId;
  const isRevealed = task?.status === "revealed";
  const isVoting = task?.status === "voting";
  const isDraft = task?.status === "draft";
  const ownVote = participation.find((row) => row.user_id === userId)?.story_points ?? null;
  const showLiveBadge = Boolean(planningSessionId);
  const showResultsPanel = Boolean(task && (isVoting || isRevealed));
  const newTaskPath = `/session/${sessionSlug}/new`;

  const refreshRepoStatus = useCallback(async () => {
    try {
      const status = await fetchSessionRepoStatus(sessionSlug);
      setRepoStatus(status);
    } catch {
      /* repo badge is optional — do not block poker flows */
    }
  }, [sessionSlug]);

  const refetchState = useCallback(
    async (taskId?: string) => {
      const extra = taskId ? { taskId } : undefined;
      const response = await fetch(withSessionSlug("/api/session/state", sessionSlug, extra));
      if (!response.ok) {
        setBannerError(await readError(response));
        return;
      }

      const data = (await response.json()) as SessionStateResponse;
      setTask(data.task);
      setParticipation(data.participation);
      setHumanAverageFormatted(data.humanAverageFormatted);
      setAnalyst(data.analyst);
      setAnalystPending(data.analystPending);
      setBannerError(null);
    },
    [sessionSlug],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const status = await fetchSessionRepoStatus(sessionSlug);
        if (!cancelled) {
          setRepoStatus(status);
        }
      } catch {
        /* repo badge is optional — do not block poker flows */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionSlug]);

  useEffect(() => {
    const taskId = task?.id;
    const taskStatus = task?.status;
    if (!taskId || taskStatus !== "revealed" || analyst || !analystPending) {
      return;
    }

    const interval = window.setInterval(() => {
      void refetchState(taskId);
    }, 3000);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
    }, 120_000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [task?.id, task?.status, analyst, analystPending, refetchState]);

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
        void refetchState(task?.id);
      },
      {
        accessToken: realtimeAccessToken,
        onStatusChange: setConnectionStatus,
        taskId: task?.id ?? null,
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
  }, [planningSessionId, needsDisplayName, realtimeAccessToken, refetchState, task?.id]);

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

  async function startVoting() {
    if (!task) {
      return;
    }
    setIsSubmitting(true);
    setBannerError(null);
    try {
      const response = await fetch(withSessionSlug(`/api/session/tasks/${task.id}/start-voting`, sessionSlug), {
        method: "POST",
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

  async function castVote(storyPoints: number) {
    if (!task) {
      return;
    }
    setIsSubmitting(true);
    setBannerError(null);
    try {
      const response = await fetch(withSessionSlug("/api/session/vote", sessionSlug), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, storyPoints, sessionSlug }),
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
      const response = await fetch(withSessionSlug("/api/session/reveal", sessionSlug), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, sessionSlug }),
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

  return (
    <section aria-labelledby="session-room-heading" className="mt-8 space-y-6 text-left">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-6">
        <div>
          <h2 id="session-room-heading" className="text-lg font-semibold text-white">
            Planning room
          </h2>
          {task ? <p className="mt-1 text-sm text-blue-100/80">{task.title}</p> : null}
          {repoStatus?.linked && repoStatus.connection ? (
            <p className="mt-2 inline-flex flex-wrap items-center gap-2 text-xs text-cyan-100/80">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5">
                {repoStatus.connection.provider} · {repoStatus.connection.repoFullName}
              </span>
              <span className="text-blue-100/50">linked by {repoStatus.connection.linkedByDisplayName}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRepoModalOpen(true);
            }}
            className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-50 hover:bg-cyan-500/25"
          >
            Link repository
          </button>
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
      </div>

      <RepoLinkModal
        key={repoModalOpen ? "repo-modal-open" : "repo-modal-closed"}
        open={repoModalOpen}
        sessionSlug={sessionSlug}
        onClose={() => {
          setRepoModalOpen(false);
        }}
        onLinked={() => {
          void refreshRepoStatus();
        }}
      />

      {bannerError ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100" role="alert">
          {bannerError}
        </p>
      ) : null}

      {!task ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-blue-100/70">No active task in this room yet.</p>
          <a
            href={newTaskPath}
            className="mt-4 inline-block rounded-lg border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500/30"
          >
            Create first task
          </a>
        </div>
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

      {showResultsPanel ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-sm font-medium text-blue-100/90">Who voted</h3>
          {isRevealed && humanAverageFormatted ? (
            <p className="mt-3 rounded-lg border border-purple-400/30 bg-purple-500/15 px-3 py-2 text-lg font-semibold text-purple-100">
              Team average: {humanAverageFormatted}
            </p>
          ) : (
            <p className="mt-2 text-sm text-blue-100/60">Peer story points stay hidden until reveal.</p>
          )}
          {isRevealed && analyst ? (
            <AnalystReferenceCard storyPoints={analyst.storyPoints} rationale={analyst.rationale} />
          ) : null}
          {analystPending && !analyst ? <AnalystPendingIndicator /> : null}
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

      {isRevealed ? <TaskHistoryMock /> : null}

      {isRevealed && isCreator ? (
        <div className="text-center">
          <a
            href={newTaskPath}
            className="inline-block rounded-lg border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500/30"
          >
            Start next task
          </a>
        </div>
      ) : null}
    </section>
  );
}
