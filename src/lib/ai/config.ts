import { OPENROUTER_API_KEY } from "astro:env/server";

export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";
export const OPENROUTER_TIMEOUT_MS = 8000;
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const FALLBACK_WARNING_DRAFT = "AI niedostępne — wyświetlamy podstawowy szkic z wklejonych notatek.";
export const FALLBACK_WARNING_COACH = "AI niedostępne — wyświetlamy gotowe pytania do dyskusji zespołu.";

export function isAiConfigured(): boolean {
  return Boolean(OPENROUTER_API_KEY);
}

export function getOpenRouterApiKey(): string | undefined {
  return OPENROUTER_API_KEY;
}
