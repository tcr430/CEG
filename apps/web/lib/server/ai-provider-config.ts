export type AiProviderName = "openai" | "anthropic";
export type AiProviderCapability = "research" | "sequence" | "reply";

const DEFAULT_AI_PROVIDER: AiProviderName = "openai";
const providerNames = new Set<AiProviderName>(["openai", "anthropic"]);

function parseProviderName(value: string | undefined): AiProviderName | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return providerNames.has(normalized as AiProviderName)
    ? (normalized as AiProviderName)
    : null;
}

export type AiProviderSelection = {
  defaultProvider: AiProviderName;
  providers: Record<AiProviderCapability, AiProviderName>;
};

export function resolveAiProviderSelection(
  env: NodeJS.ProcessEnv = process.env,
): AiProviderSelection {
  const defaultProvider = parseProviderName(env.AI_DEFAULT_PROVIDER) ?? DEFAULT_AI_PROVIDER;

  return {
    defaultProvider,
    providers: {
      research: parseProviderName(env.AI_RESEARCH_PROVIDER) ?? defaultProvider,
      sequence: parseProviderName(env.AI_SEQUENCE_PROVIDER) ?? defaultProvider,
      reply: parseProviderName(env.AI_REPLY_PROVIDER) ?? defaultProvider,
    },
  };
}

export function getAiProviderForCapability(
  capability: AiProviderCapability,
  env: NodeJS.ProcessEnv = process.env,
): AiProviderName {
  return resolveAiProviderSelection(env).providers[capability];
}
