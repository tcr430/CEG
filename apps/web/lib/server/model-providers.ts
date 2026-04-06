import type { ResearchModelAdapter } from "@ceg/research-engine";
import type { ReplyGenerationModelAdapter } from "@ceg/reply-engine";
import type { SequenceGenerationModelAdapter } from "@ceg/sequence-engine";

import {
  getAiProviderForCapability,
  type AiProviderName,
} from "./ai-provider-config";
import { createAnthropicReplyModelAdapter } from "./anthropic-reply-provider";
import { createAnthropicResearchModelAdapter } from "./anthropic-research-provider";
import { createAnthropicSequenceModelAdapter } from "./anthropic-sequence-provider";
import { createOpenAiReplyModelAdapter } from "./openai-reply-provider";
import { createOpenAiResearchModelAdapter } from "./openai-research-provider";
import { createOpenAiSequenceModelAdapter } from "./openai-sequence-provider";

declare global {
  var __cegSequenceModelAdapters:
    | Partial<Record<AiProviderName, SequenceGenerationModelAdapter>>
    | undefined;
  var __cegReplyModelAdapters:
    | Partial<Record<AiProviderName, ReplyGenerationModelAdapter>>
    | undefined;
  var __cegResearchModelAdapters:
    | Partial<Record<AiProviderName, ResearchModelAdapter>>
    | undefined;
}

function hasOpenAi(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function canUseResearchProvider(provider: AiProviderName): boolean {
  if (provider === "openai") {
    return Boolean(hasOpenAi() && process.env.OPENAI_RESEARCH_MODEL?.trim());
  }

  return Boolean(hasAnthropic() && process.env.ANTHROPIC_RESEARCH_MODEL?.trim());
}

function getSequenceAdapterCache(): Partial<
  Record<AiProviderName, SequenceGenerationModelAdapter>
> {
  globalThis.__cegSequenceModelAdapters ??= {};
  return globalThis.__cegSequenceModelAdapters;
}

function getReplyAdapterCache(): Partial<
  Record<AiProviderName, ReplyGenerationModelAdapter>
> {
  globalThis.__cegReplyModelAdapters ??= {};
  return globalThis.__cegReplyModelAdapters;
}

function getResearchAdapterCache(): Partial<
  Record<AiProviderName, ResearchModelAdapter>
> {
  globalThis.__cegResearchModelAdapters ??= {};
  return globalThis.__cegResearchModelAdapters;
}

function createSequenceAdapter(provider: AiProviderName): SequenceGenerationModelAdapter {
  return provider === "anthropic"
    ? createAnthropicSequenceModelAdapter()
    : createOpenAiSequenceModelAdapter();
}

function createReplyAdapter(provider: AiProviderName): ReplyGenerationModelAdapter {
  return provider === "anthropic"
    ? createAnthropicReplyModelAdapter()
    : createOpenAiReplyModelAdapter();
}

function createResearchAdapter(provider: AiProviderName): ResearchModelAdapter {
  return provider === "anthropic"
    ? createAnthropicResearchModelAdapter()
    : createOpenAiResearchModelAdapter();
}

export function getSequenceModelAdapter(): SequenceGenerationModelAdapter {
  const provider = getAiProviderForCapability("sequence");
  const cache = getSequenceAdapterCache();
  cache[provider] ??= createSequenceAdapter(provider);
  return cache[provider] as SequenceGenerationModelAdapter;
}

export function getReplyModelAdapter(): ReplyGenerationModelAdapter {
  const provider = getAiProviderForCapability("reply");
  const cache = getReplyAdapterCache();
  cache[provider] ??= createReplyAdapter(provider);
  return cache[provider] as ReplyGenerationModelAdapter;
}

export function getResearchModelAdapter(): ResearchModelAdapter | undefined {
  const provider = getAiProviderForCapability("research");

  if (!canUseResearchProvider(provider)) {
    return undefined;
  }

  const cache = getResearchAdapterCache();
  cache[provider] ??= createResearchAdapter(provider);
  return cache[provider];
}
