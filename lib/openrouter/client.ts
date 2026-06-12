// Server-side OpenRouter wrapper. Never import this from client components.
import type {
  ChatCompletionOptions,
  ChatCompletionResult,
  ModelPurpose,
} from "@/types/ai";

const DEFAULT_MODELS: Record<ModelPurpose, string> = {
  long_analysis: "anthropic/claude-sonnet-4-6",
  fast_draft: "qwen/qwen-2.5-72b-instruct",
  final_writing: "anthropic/claude-sonnet-4-6",
  verifier: "openai/gpt-4o-mini",
};

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export function resolveModel(purpose: ModelPurpose): string {
  const envMap: Record<ModelPurpose, string | undefined> = {
    long_analysis: process.env.DEFAULT_LONG_ANALYSIS_MODEL,
    fast_draft: process.env.DEFAULT_FAST_DRAFT_MODEL,
    final_writing: process.env.DEFAULT_FINAL_WRITING_MODEL,
    verifier: process.env.DEFAULT_VERIFIER_MODEL,
  };
  return envMap[purpose] || DEFAULT_MODELS[purpose];
}

export function getFallbackModel(): string | undefined {
  return process.env.FALLBACK_MODEL;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOnce(
  model: string,
  options: ChatCompletionOptions
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not set. Add it to .env.local (see .env.example)."
    );
  }
  const baseUrl =
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxTokens ?? 4000,
  };
  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "Aegis MarketPulse AI",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new OpenRouterError(
      `OpenRouter request failed (${res.status}): ${text.slice(0, 500)}`,
      res.status
    );
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new OpenRouterError("OpenRouter returned an empty completion.");
  }
  return content;
}

/**
 * Chat completion with retry (429 / 5xx, exponential backoff) and an
 * optional fallback model if the primary model keeps failing.
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const retries = options.retries ?? 2;
  const modelsToTry = [options.model];
  const fallback = options.fallbackModel ?? getFallbackModel();
  if (fallback && fallback !== options.model) modelsToTry.push(fallback);

  let lastError: unknown;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const content = await callOnce(model, options);
        return { content, modelUsed: model };
      } catch (err) {
        lastError = err;
        const status = err instanceof OpenRouterError ? err.status : undefined;
        const retryable =
          status === undefined || status === 429 || status >= 500;
        // Missing API key or 4xx other than 429 — don't waste retries.
        if (!retryable || (status === undefined && attempt > 0)) break;
        if (attempt < retries) await sleep(1000 * 2 ** attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new OpenRouterError("OpenRouter call failed.");
}
