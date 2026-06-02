import type { AnalystDiagnosticsPublic, AnalystVoteStatus } from "@/lib/repo/types";

export interface AnalystVoteDiagnosticsRow {
  status: AnalystVoteStatus;
  error_code: string | null;
  source_files: string[] | null;
  ai_model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  no_repo_link: "Brak podlinkowanego repozytorium — Analyst został pominięty.",
  connection_not_found: "Połączenie z repozytorium nie istnieje.",
  missing_token: "Brak tokenu dostępu do prywatnego repozytorium.",
  tree_fetch_failed: "Nie udało się pobrać drzewa plików repozytorium.",
  no_files:
    "Nie pobrano plików z repozytorium — Analyst nie estymuje sam z opisu zadania. Dodaj ścieżki w polu „Affected paths” lub dopasuj słowa z tytułu do nazw plików w repo.",
  ai_failed: "OpenRouter nie zwrócił poprawnej odpowiedzi.",
  not_configured: "Zmienna środowiskowa OPENROUTER_API_KEY nie jest ustawiona — Analyst nie został wywołany.",
  task_not_found: "Zadanie nie zostało znalezione podczas analizy.",
  unexpected_error: "Nieoczekiwany błąd podczas analizy repozytorium.",
};

export function formatAnalystErrorCode(errorCode: string | null | undefined): string | null {
  if (!errorCode) {
    return null;
  }
  return ERROR_MESSAGES[errorCode] ?? `Analyst zakończył się błędem (${errorCode}).`;
}

export function toAnalystDiagnosticsPublic(row: AnalystVoteDiagnosticsRow): AnalystDiagnosticsPublic {
  const sourceFiles = Array.isArray(row.source_files)
    ? row.source_files.filter((path): path is string => typeof path === "string" && path.trim().length > 0)
    : [];

  const promptTokens = typeof row.prompt_tokens === "number" ? row.prompt_tokens : null;
  const completionTokens = typeof row.completion_tokens === "number" ? row.completion_tokens : null;
  const totalTokens = typeof row.total_tokens === "number" ? row.total_tokens : null;
  const aiModel = typeof row.ai_model === "string" && row.ai_model.trim().length > 0 ? row.ai_model.trim() : null;
  const aiCalled = row.status === "ready" || row.error_code === "ai_failed";

  return {
    status: row.status,
    errorCode: row.error_code,
    errorMessage: formatAnalystErrorCode(row.error_code),
    sourceFiles,
    ai: {
      called: aiCalled,
      model: aiModel,
      promptTokens,
      completionTokens,
      totalTokens,
    },
  };
}
