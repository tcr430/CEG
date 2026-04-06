import { getRequiredEnv } from "@ceg/security";

import {
  createAiOperationMetadata,
  type ProviderUsage,
} from "./ai-provider-metadata";

type AnthropicMessageResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  usage?: ProviderUsage;
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export async function callAnthropicJson<TOutput>(input: {
  apiKeyEnv?: string;
  model: string;
  system: string;
  user: string;
  promptVersion: string;
  validate: (payload: unknown) => TOutput;
}): Promise<TOutput> {
  const apiKey = getRequiredEnv(input.apiKeyEnv ?? "ANTHROPIC_API_KEY");
  const startedAt = Date.now();
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: 1600,
      temperature: 0.3,
      system: input.system,
      messages: [
        {
          role: "user",
          content: input.user,
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Anthropic request failed: ${response.status} ${details}`,
    );
  }

  const payload = (await response.json()) as AnthropicMessageResponse;
  const content = payload.content?.find((entry) => entry.type === "text")?.text;

  if (!content) {
    throw new Error("Anthropic request returned no text content.");
  }

  const parsed = JSON.parse(content) as Record<string, unknown>;
  const metadata = createAiOperationMetadata({
    provider: "anthropic",
    model: input.model,
    promptVersion: input.promptVersion,
    startedAt,
    usage: payload.usage ?? null,
  });

  if (parsed.analysisMetadata === undefined) {
    parsed.analysisMetadata = metadata;
  }

  if (parsed.generationMetadata === undefined) {
    parsed.generationMetadata = metadata;
  }

  return input.validate(parsed);
}
