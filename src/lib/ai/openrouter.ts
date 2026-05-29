import { DEFAULT_OPENROUTER_MODEL, getOpenRouterApiKey, OPENROUTER_API_URL, OPENROUTER_TIMEOUT_MS } from "./config";

interface ChatCompletionResponse {
  choices?: {
    message?: {
      content?: string | null;
    };
  }[];
}

export async function completeJson<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
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

    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
