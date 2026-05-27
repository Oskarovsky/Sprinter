import React, { useCallback, useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { subscribeToSessionTask, type SessionRealtimeConnectionStatus } from "@/lib/session/realtime";
import type { Task, VoteParticipation } from "@/lib/session/types";

interface SessionStateResponse {
  task: Task | null;
  participation: VoteParticipation[];
}

interface Props {
  initialTaskId: string | null;
  userId: string;
  initialTask?: Task | null;
  initialParticipation?: VoteParticipation[];
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

function initialConnectionStatus(taskId: string | null): SessionRealtimeConnectionStatus {
  if (!taskId) {
    return "unconfigured";
  }
  return createBrowserClient() ? "connecting" : "unconfigured";
}

export default function SessionLivePanel({
  initialTaskId,
  userId,
  initialTask = null,
  initialParticipation = [],
}: Props) {
  const [taskId] = useState(initialTaskId);
  const [task, setTask] = useState<Task | null>(initialTask);
  const [participation, setParticipation] = useState<VoteParticipation[]>(initialParticipation);
  const [connectionStatus, setConnectionStatus] = useState<SessionRealtimeConnectionStatus>(() =>
    initialConnectionStatus(taskId),
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialTask ? new Date() : null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refetchState = useCallback(async () => {
    if (!taskId) {
      return;
    }

    const query = `?taskId=${encodeURIComponent(taskId)}`;
    const response = await fetch(`/api/session/state${query}`);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setFetchError(body?.error ?? `Request failed (${response.status})`);
      return;
    }

    const data = (await response.json()) as SessionStateResponse;
    setTask(data.task);
    setParticipation(data.participation);
    setLastUpdated(new Date());
    setFetchError(null);
  }, [taskId]);

  useEffect(() => {
    if (!taskId) {
      return;
    }

    const supabase = createBrowserClient();
    if (!supabase) {
      return;
    }

    return subscribeToSessionTask(
      supabase,
      taskId,
      () => {
        void refetchState();
      },
      setConnectionStatus,
    );
  }, [refetchState, taskId]);

  if (!taskId) {
    return (
      <section
        aria-labelledby="session-live-heading"
        className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-left"
      >
        <h2 id="session-live-heading" className="text-lg font-semibold text-white">
          Live session
        </h2>
        <p className="mt-2 text-sm text-blue-100/70">No active task in voting or revealed state.</p>
      </section>
    );
  }

  const isRevealed = task?.status === "revealed";

  return (
    <section
      aria-labelledby="session-live-heading"
      className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-left"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="session-live-heading" className="text-lg font-semibold text-white">
            Live session
          </h2>
          {task ? (
            <p className="mt-1 text-sm text-blue-100/80">{task.title}</p>
          ) : (
            <p className="mt-1 text-sm text-blue-100/60">Loading task…</p>
          )}
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${connectionClassName(connectionStatus)}`}
          role="status"
          aria-live="polite"
        >
          {connectionLabel(connectionStatus)}
        </span>
      </div>

      {isRevealed ? (
        <p
          className="mt-4 rounded-lg border border-purple-400/30 bg-purple-500/15 px-3 py-2 text-sm text-purple-100"
          role="status"
        >
          Votes revealed — story points are visible to everyone.
        </p>
      ) : (
        <p className="mt-4 text-sm text-blue-100/60">Peer story points stay hidden until reveal.</p>
      )}

      {fetchError ? <p className="mt-4 text-sm text-rose-200">{fetchError}</p> : null}

      <div className="mt-4">
        <h3 className="text-sm font-medium text-blue-100/90">Who voted</h3>
        {participation.length === 0 ? (
          <p className="mt-2 text-sm text-blue-100/60">No votes yet.</p>
        ) : (
          <ul className="mt-2 space-y-2" aria-label="Participants who voted">
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

      {lastUpdated ? (
        <p className="mt-4 text-xs text-blue-100/50">Last updated {lastUpdated.toLocaleTimeString()}</p>
      ) : null}
    </section>
  );
}
