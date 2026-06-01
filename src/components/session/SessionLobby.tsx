import React, { useMemo, useState } from "react";
import { normalizePlanningSessionSlug } from "@/lib/session/slug";
import type { PlanningSessionRoom } from "@/lib/session/rooms";

interface Props {
  initialRooms: PlanningSessionRoom[];
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${response.status})`;
}

export default function SessionLobby({ initialRooms }: Props) {
  const [rooms, setRooms] = useState(initialRooms);
  const [slugInput, setSlugInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedPreview = useMemo(() => normalizePlanningSessionSlug(slugInput), [slugInput]);

  async function refreshRooms() {
    const response = await fetch("/api/session/rooms", { credentials: "include" });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = (await response.json()) as { rooms: PlanningSessionRoom[] };
    setRooms(data.rooms);
  }

  function joinRoom() {
    setError(null);
    if (!normalizedPreview) {
      setError("Enter a valid room name (3–32 characters, letters, numbers, hyphens).");
      return;
    }
    window.location.href = `/session/${normalizedPreview}`;
  }

  async function createRoom() {
    setError(null);
    if (!normalizedPreview) {
      setError("Enter a valid room name (3–32 characters, letters, numbers, hyphens).");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/session/rooms", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slugInput }),
      });

      if (response.status === 409) {
        setError(await readError(response));
        return;
      }

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      window.location.href = `/session/${normalizedPreview}`;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-8 space-y-8 text-left">
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-blue-100/70 uppercase">Your rooms</h2>
        {rooms.length === 0 ? (
          <p className="text-sm text-blue-100/60">No rooms yet. Create one below.</p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((room) => (
              <li key={room.id}>
                <a
                  href={`/session/${room.slug}`}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm transition-colors hover:border-purple-400/40 hover:bg-white/10"
                >
                  <span className="font-medium text-white">{room.slug}</span>
                  <span className="text-blue-100/50">Join →</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => {
            void refreshRooms();
          }}
          className="mt-3 text-xs text-purple-300 hover:underline"
        >
          Refresh list
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-blue-100/70 uppercase">Join or create</h2>
        <label className="block text-sm text-blue-100/80" htmlFor="room-slug">
          Room name
        </label>
        <input
          id="room-slug"
          type="text"
          value={slugInput}
          onChange={(event) => {
            setSlugInput(event.target.value);
            setError(null);
          }}
          placeholder="sprint-42"
          className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-blue-100/40"
          autoComplete="off"
        />
        {slugInput.trim() ? (
          <p className="mt-2 text-xs text-blue-100/50">
            URL slug: <span className="font-mono text-blue-100/80">{normalizedPreview ?? "(invalid)"}</span>
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={joinRoom}
            disabled={isSubmitting}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            Join room
          </button>
          <button
            type="button"
            onClick={() => {
              void createRoom();
            }}
            disabled={isSubmitting}
            className="rounded-lg border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-500/30 disabled:opacity-50"
          >
            Create room
          </button>
        </div>
      </section>
    </div>
  );
}
