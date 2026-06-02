import { DEFAULT_OPENROUTER_MODEL, getOpenRouterApiKey, OPENROUTER_API_URL, OPENROUTER_TIMEOUT_MS } from "./config";

interface ChatCompletionResponse {
  choices?: {
    message?: {
      content?: string | null;
    };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface OpenRouterUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CompleteJsonResult<T> {
  data: T;
  model: string;
  usage: OpenRouterUsage | null;
}

function parseUsage(payload: ChatCompletionResponse): OpenRouterUsage | null {
  const usage = payload.usage;
  if (!usage) {
    return null;
  }

  const promptTokens = usage.prompt_tokens;
  const completionTokens = usage.completion_tokens;
  const totalTokens = usage.total_tokens;

  if (typeof promptTokens !== "number" || typeof completionTokens !== "number" || typeof totalTokens !== "number") {
    return null;
  }

  return { promptTokens, completionTokens, totalTokens };
}

async function requestJsonCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<CompleteJsonResult<T> | null> {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    return {
      data: JSON.parse(content) as T,
      model: DEFAULT_OPENROUTER_MODEL,
      usage: parseUsage(payload),
    };
  } catch {
    return null;
  }
}

export async function completeJson<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
  const result = await requestJsonCompletion<T>(systemPrompt, userPrompt);
  return result?.data ?? null;
}

export async function completeJsonWithMeta<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<CompleteJsonResult<T> | null> {
  return requestJsonCompletion<T>(systemPrompt, userPrompt);
}
