import React, { useEffect, useRef, useState } from "react";
import SprinterDraftPanel from "@/components/session/SprinterDraftPanel";

interface Props {
  sessionSlug: string;
  heading?: string;
}

type CreateTaskTab = "manual" | "draft";

const CREATE_TASK_TAB_MANUAL_ID = "create-task-tab-manual";
const CREATE_TASK_TAB_DRAFT_ID = "create-task-tab-draft";

function withSessionSlug(path: string, sessionSlug: string): string {
  const params = new URLSearchParams({ sessionSlug });
  return `${path}?${params.toString()}`;
}

function createTaskTabClassName(active: boolean): string {
  return active
    ? "border-purple-300 bg-purple-500/30 text-white"
    : "border-white/20 bg-white/10 text-blue-100 hover:bg-white/20";
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Request failed (${response.status})`;
}

export default function CreateTaskView({ sessionSlug, heading = "Create a task" }: Props) {
  const [createTaskTab, setCreateTaskTab] = useState<CreateTaskTab>("manual");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAffectedPaths, setNewAffectedPaths] = useState("");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function createTask(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setBannerError(null);
    try {
      const response = await fetch(withSessionSlug("/api/session/tasks", sessionSlug), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || undefined,
          affectedPaths: newAffectedPaths.trim() || undefined,
        }),
      });
      if (!response.ok) {
        if (mountedRef.current) {
          setBannerError(await readError(response));
        }
        return;
      }

      const payload = (await response.json().catch(() => null)) as { task?: { id?: string } } | null;
      const taskId = payload?.task?.id;
      window.location.href = taskId
        ? `/session/${sessionSlug}?taskId=${encodeURIComponent(taskId)}`
        : `/session/${sessionSlug}`;
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <section aria-labelledby="create-task-heading" className="mt-8 space-y-4 text-left">
      <h2 id="create-task-heading" className="text-lg font-semibold text-white">
        {heading}
      </h2>

      {bannerError ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100" role="alert">
          {bannerError}
        </p>
      ) : null}

      <div className="space-y-3">
        <div role="tablist" aria-label="Task creation mode" className="flex flex-wrap gap-2">
          <button
            type="button"
            role="tab"
            id={CREATE_TASK_TAB_MANUAL_ID}
            aria-selected={createTaskTab === "manual"}
            aria-controls="create-task-panel-manual"
            onClick={() => {
              setCreateTaskTab("manual");
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${createTaskTabClassName(createTaskTab === "manual")}`}
          >
            Create task
          </button>
          <button
            type="button"
            role="tab"
            id={CREATE_TASK_TAB_DRAFT_ID}
            aria-selected={createTaskTab === "draft"}
            aria-controls="create-task-panel-draft"
            onClick={() => {
              setCreateTaskTab("draft");
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${createTaskTabClassName(createTaskTab === "draft")}`}
          >
            Sprinter Draft
          </button>
        </div>

        <div
          role="tabpanel"
          id="create-task-panel-manual"
          aria-labelledby={CREATE_TASK_TAB_MANUAL_ID}
          hidden={createTaskTab !== "manual"}
        >
          <form onSubmit={createTask} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-6">
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
            <label className="block text-sm text-blue-100/90">
              Affected paths (optional)
              <textarea
                value={newAffectedPaths}
                onChange={(e) => {
                  setNewAffectedPaths(e.target.value);
                }}
                rows={3}
                placeholder={"src/lib/session/\nsrc/pages/api/session/"}
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-mono text-sm text-white"
              />
              <span className="mt-1 block text-xs text-blue-100/50">
                One path or glob per line — guides Sprinter Analyst.
              </span>
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg border border-purple-400/40 bg-purple-500/20 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500/30 disabled:opacity-50"
            >
              Create task
            </button>
          </form>
        </div>

        <div
          role="tabpanel"
          id="create-task-panel-draft"
          aria-labelledby={CREATE_TASK_TAB_DRAFT_ID}
          hidden={createTaskTab !== "draft"}
        >
          <SprinterDraftPanel
            onApplyDraft={({ title, description }) => {
              setNewTitle(title);
              setNewDescription(description);
              setBannerError(null);
              setCreateTaskTab("manual");
            }}
          />
        </div>
      </div>
    </section>
  );
}
