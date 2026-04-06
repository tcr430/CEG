import {
  aiOperationMetadataSchema,
  type AiOperationMetadata,
} from "@ceg/validation";

export type ProviderUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

export function createAiOperationMetadata(input: {
  provider: string;
  model: string;
  promptVersion?: string | null;
  startedAt: number;
  finishedAt?: number;
  usage?: ProviderUsage | null;
  costUsd?: number | null;
}): AiOperationMetadata {
  const finishedAt = input.finishedAt ?? Date.now();
  const inputTokens = input.usage?.prompt_tokens ?? input.usage?.input_tokens ?? null;
  const outputTokens =
    input.usage?.completion_tokens ?? input.usage?.output_tokens ?? null;
  const totalTokens =
    input.usage?.total_tokens ??
    (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);

  return aiOperationMetadataSchema.parse({
    provider: input.provider,
    model: input.model,
    promptVersion: input.promptVersion ?? null,
    latencyMs: Math.max(0, finishedAt - input.startedAt),
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd: input.costUsd ?? null,
    generatedAt: new Date(finishedAt),
  });
}

export type OpenAiUsage = ProviderUsage;

