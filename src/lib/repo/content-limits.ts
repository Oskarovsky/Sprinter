/** Max files sent to Sprinter Analyst per task. */
export const MAX_ANALYST_FILES = 15;

/** Aggregate byte budget for all file snippets in one analyst run. */
export const MAX_ANALYST_BYTES = 256 * 1024;

/** Per-file character cap before counting toward aggregate budget or AI prompt. */
export const MAX_FILE_CONTENT_CHARS = 12_000;

/** Total file-snippet characters included in the OpenRouter user prompt. */
export const MAX_ANALYST_PROMPT_CHARS = 48_000;

/** When inferring paths from title keywords, scan at most this many tree paths. */
export const MAX_KEYWORD_SCAN_PATHS = 300;

export function truncateFileContent(content: string, maxChars = MAX_FILE_CONTENT_CHARS): string {
  if (content.length <= maxChars) {
    return content;
  }

  return `${content.slice(0, maxChars)}\n… [truncated]`;
}
