import React, { useCallback, useEffect, useState } from "react";
import {
  buildGithubOAuthStartUrl,
  buildGitlabOAuthStartUrl,
  disconnectRepo,
  fetchRepoConnections,
  linkRepo,
  type PublicRepoConnection,
} from "@/lib/session/repo-client";

const DEFAULT_GITLAB_BASE = "https://gitlab.com";

interface Props {
  open: boolean;
  sessionSlug: string;
  onClose: () => void;
  onLinked: () => void;
}

function providerLabel(provider: PublicRepoConnection["provider"]): string {
  return provider === "github" ? "GitHub" : "GitLab";
}

export default function RepoLinkModal({ open, sessionSlug, onClose, onLinked }: Props) {
  const [connections, setConnections] = useState<PublicRepoConnection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState<"github" | "gitlab">("gitlab");
  const [accessMode, setAccessMode] = useState<"public" | "private">("private");
  const [repoUrl, setRepoUrl] = useState("");
  const [gitlabBaseUrl, setGitlabBaseUrl] = useState(DEFAULT_GITLAB_BASE);
  const [accessToken, setAccessToken] = useState("");
  const [authMethod, setAuthMethod] = useState<"oauth" | "pat">("oauth");

  const loadConnections = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchRepoConnections(sessionSlug);
      setConnections(data.connections);
      setActiveConnectionId(data.activeConnectionId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load repository library");
    }
  }, [sessionSlug]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchRepoConnections(sessionSlug);
        if (cancelled) {
          return;
        }
        setConnections(data.connections);
        setActiveConnectionId(data.activeConnectionId);
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load repository library");
        }
      } finally {
        if (!cancelled) {
          setLibraryReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, sessionSlug]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  async function activateConnection(connection: PublicRepoConnection) {
    setIsLoading(true);
    setError(null);
    try {
      await linkRepo(sessionSlug, {
        provider: connection.provider,
        repoUrl: connection.repoUrl,
        accessMode: connection.accessMode,
        gitlabBaseUrl: connection.gitlabBaseUrl ?? undefined,
      });
      onLinked();
      onClose();
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Could not link repository");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisconnect(connectionId: string, removeFromLibrary: boolean) {
    setIsLoading(true);
    setError(null);
    try {
      await disconnectRepo(sessionSlug, { connectionId, removeFromLibrary });
      await loadConnections();
      onLinked();
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Could not disconnect repository");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedUrl = repoUrl.trim();
    if (!trimmedUrl) {
      setError("Repository URL is required");
      return;
    }

    if (accessMode === "public") {
      setIsLoading(true);
      try {
        await linkRepo(sessionSlug, {
          provider,
          repoUrl: trimmedUrl,
          accessMode: "public",
          gitlabBaseUrl: provider === "gitlab" ? gitlabBaseUrl.trim() || DEFAULT_GITLAB_BASE : undefined,
        });
        onLinked();
        onClose();
      } catch (linkError) {
        setError(linkError instanceof Error ? linkError.message : "Could not link repository");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (provider === "github") {
      window.location.href = buildGithubOAuthStartUrl(trimmedUrl, `/session/${sessionSlug}`);
      return;
    }

    const baseUrl = gitlabBaseUrl.trim() || DEFAULT_GITLAB_BASE;
    if (authMethod === "oauth") {
      window.location.href = buildGitlabOAuthStartUrl(trimmedUrl, baseUrl, `/session/${sessionSlug}`);
      return;
    }

    if (!accessToken.trim()) {
      setError("Personal access token is required for private GitLab linking");
      return;
    }

    setIsLoading(true);
    try {
      await linkRepo(sessionSlug, {
        provider: "gitlab",
        repoUrl: trimmedUrl,
        accessMode: "private",
        gitlabBaseUrl: baseUrl,
        accessToken: accessToken.trim(),
      });
      onLinked();
      onClose();
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Could not link repository");
    } finally {
      setIsLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  const showGitlabBase = provider === "gitlab";
  const showPrivateGitlabPat = provider === "gitlab" && accessMode === "private" && authMethod === "pat";
  const showPrivateGitlabOAuth = provider === "gitlab" && accessMode === "private" && authMethod === "oauth";
  const showPrivateGithubOAuth = provider === "github" && accessMode === "private";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close repository modal backdrop"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="repo-link-modal-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-6 text-left shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="repo-link-modal-title" className="text-lg font-semibold text-white">
              Link repository
            </h2>
            <p className="mt-1 text-sm text-blue-100/70">
              Connect GitHub or GitLab for Sprinter Analyst reference votes after reveal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 px-2 py-1 text-sm text-blue-100 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        {error ? (
          <p
            className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/15 px-3 py-2 text-sm text-rose-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <section className="mt-5 space-y-3">
          <h3 className="text-sm font-medium text-white">Your library</h3>
          {!libraryReady ? <p className="text-sm text-blue-100/60">Loading…</p> : null}
          {libraryReady && connections.length === 0 ? (
            <p className="text-sm text-blue-100/60">No saved repositories yet.</p>
          ) : null}
          <ul className="space-y-2">
            {connections.map((connection) => {
              const isActive = connection.id === activeConnectionId;
              return (
                <li key={connection.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{connection.repoFullName}</span>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-blue-100/80">
                      {providerLabel(connection.provider)}
                    </span>
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-blue-100/80">
                      {connection.accessMode}
                    </span>
                    {isActive ? (
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-100">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!isActive ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          void activateConnection(connection);
                        }}
                        className="rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-50"
                      >
                        Use in session
                      </button>
                    ) : null}
                    {isActive ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => {
                          void handleDisconnect(connection.id, false);
                        }}
                        className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-50 hover:bg-amber-500/25 disabled:opacity-50"
                      >
                        Disconnect session
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        void handleDisconnect(connection.id, true);
                      }}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-blue-100 hover:bg-white/10 disabled:opacity-50"
                    >
                      Remove from library
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3 border-t border-white/10 pt-5">
          <h3 className="text-sm font-medium text-white">Add repository</h3>

          <label className="block text-sm text-blue-100/90">
            Provider
            <select
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value as "github" | "gitlab");
              }}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
            >
              <option value="gitlab">GitLab</option>
              <option value="github">GitHub</option>
            </select>
          </label>

          <label className="block text-sm text-blue-100/90">
            Access mode
            <select
              value={accessMode}
              onChange={(event) => {
                setAccessMode(event.target.value as "public" | "private");
              }}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>

          {showGitlabBase ? (
            <label className="block text-sm text-blue-100/90">
              GitLab base URL
              <input
                type="url"
                value={gitlabBaseUrl}
                onChange={(event) => {
                  setGitlabBaseUrl(event.target.value);
                }}
                placeholder="https://gitlab.com"
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
              />
            </label>
          ) : null}

          <label className="block text-sm text-blue-100/90">
            Repository URL
            <input
              type="url"
              value={repoUrl}
              onChange={(event) => {
                setRepoUrl(event.target.value);
              }}
              required
              placeholder={provider === "github" ? "https://github.com/org/repo" : "https://gitlab.com/group/project"}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
            />
          </label>

          {provider === "gitlab" && accessMode === "private" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm text-blue-100/90">Private GitLab authentication</legend>
              <label className="flex items-center gap-2 text-sm text-blue-100/80">
                <input
                  type="radio"
                  name="gitlabAuth"
                  checked={authMethod === "oauth"}
                  onChange={() => {
                    setAuthMethod("oauth");
                  }}
                />
                OAuth (recommended)
              </label>
              <label className="flex items-center gap-2 text-sm text-blue-100/80">
                <input
                  type="radio"
                  name="gitlabAuth"
                  checked={authMethod === "pat"}
                  onChange={() => {
                    setAuthMethod("pat");
                  }}
                />
                Personal access token
              </label>
            </fieldset>
          ) : null}

          {showPrivateGitlabPat ? (
            <label className="block text-sm text-blue-100/90">
              Personal access token
              <input
                type="password"
                value={accessToken}
                onChange={(event) => {
                  setAccessToken(event.target.value);
                }}
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
              />
            </label>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {accessMode === "public"
              ? "Link public repository"
              : showPrivateGithubOAuth || showPrivateGitlabOAuth
                ? "Continue with OAuth"
                : "Link private repository"}
          </button>
        </form>
      </div>
    </div>
  );
}
