import type {
  DraftReplyGenerationInput,
  RegenerateDraftReplyInput,
  ReplyAnalysisRequest,
  ReplyGenerationModelAdapter,
  ResponseStrategyRecommendationOutput,
} from "@ceg/reply-engine";
import {
  draftReplyGenerationOutputSchema,
  regenerateDraftReplyOutputSchema,
  replyAnalysisOutputSchema,
  responseStrategyRecommendationOutputSchema,
} from "@ceg/reply-engine";

import { callAnthropicJson } from "./anthropic-json";

const DEFAULT_ANTHROPIC_REPLY_MODEL = "claude-3-5-sonnet-latest";
const PROMPT_VERSION = "reply.v1";

function getModelName(): string {
  return process.env.ANTHROPIC_REPLY_MODEL?.trim() || DEFAULT_ANTHROPIC_REPLY_MODEL;
}

function getSenderDirective(input: ReplyAnalysisRequest): string {
  if (input.senderContext.mode === "basic") {
    return `Basic mode fallback. Reason: ${input.senderContext.basicModeReason}`;
  }

  const profile = input.senderContext.senderProfile;
  return [
    `Sender type: ${profile.senderType}`,
    `Sender profile: ${profile.name}`,
    profile.companyName ? `Company: ${profile.companyName}` : null,
    profile.productDescription ? `Offer: ${profile.productDescription}` : null,
    profile.valueProposition ? `Value proposition: ${profile.valueProposition}` : null,
    profile.differentiation ? `Differentiation: ${profile.differentiation}` : null,
    profile.tonePreferences.style ? `Tone style: ${profile.tonePreferences.style}` : null,
    profile.tonePreferences.do.length > 0
      ? `Tone do: ${profile.tonePreferences.do.join(" | ")}`
      : null,
    profile.tonePreferences.avoid.length > 0
      ? `Tone avoid: ${profile.tonePreferences.avoid.join(" | ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function getProspectDirective(input: ReplyAnalysisRequest): string {
  if (!input.prospectCompanyProfile) {
    return "Prospect research context is limited. Use softer language and avoid specific claims.";
  }

  const profile = input.prospectCompanyProfile;
  return [
    `Prospect company: ${profile.companyName ?? profile.domain}`,
    profile.summary ? `Summary: ${profile.summary}` : null,
    profile.likelyTargetCustomer
      ? `Likely target customer: ${profile.likelyTargetCustomer}`
      : null,
    profile.likelyPainPoints.length > 0
      ? `Likely pain points: ${profile.likelyPainPoints.join(" | ")}`
      : null,
    profile.personalizationHooks.length > 0
      ? `Personalization hooks: ${profile.personalizationHooks.join(" | ")}`
      : null,
    `Research confidence: ${profile.confidence.label}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function getThreadDirective(input: ReplyAnalysisRequest): string {
  return [
    `Latest inbound subject: ${input.analysisInput.latestInboundMessage.subject ?? "none"}`,
    `Latest inbound body: ${input.analysisInput.latestInboundMessage.bodyText}`,
    "Thread history:",
    ...input.analysisInput.threadMessages.map(
      (
        message: ReplyAnalysisRequest["analysisInput"]["threadMessages"][number],
        index: number,
      ) =>
        `${index + 1}. ${message.direction.toUpperCase()}: ${message.subject ?? "no subject"} | ${message.bodyText}`,
    ),
  ].join("\n");
}

function getPerformanceHintsDirective(input: ReplyAnalysisRequest): string | null {
  const hints = input.promptContext.performanceHints;

  if (!hints?.available) {
    return null;
  }

  return [
    `Performance hint confidence: ${hints.confidence}`,
    hints.preferredToneStyle
      ? `Preferred tone from better-performing history: ${hints.preferredToneStyle}`
      : null,
    hints.effectivePatterns.length > 0
      ? `Patterns that performed better: ${hints.effectivePatterns.map((pattern) => pattern.guidance).join(" | ")}`
      : null,
    hints.cautionPatterns.length > 0
      ? `Patterns to use cautiously: ${hints.cautionPatterns.map((pattern) => pattern.guidance).join(" | ")}`
      : null,
    hints.notes.length > 0 ? `Hint notes: ${hints.notes.join(" | ")}` : null,
    "Use these only as gentle historical bias. Current reply content, safety rules, and confidence handling take priority.",
  ]
    .filter(Boolean)
    .join("\n");
}
function getSharedSystemPrompt(input: ReplyAnalysisRequest): string {
  return [
    "You analyze inbound prospect replies and generate professional response drafts.",
    "Return valid JSON only. No markdown fences.",
    "Do not invent facts, proof points, pricing, case studies, or customer outcomes.",
    "Do not push after a hard no. Prefer courteous closure when the reply is a clear stop signal.",
    "Do not repeat the entire thread back to the prospect.",
    "When confidence is low, use softer language and avoid over-claiming certainty.",
    getPerformanceHintsDirective(input),
    `Campaign name: ${input.campaign.name}`,
    input.campaign.offerSummary ? `Campaign offer: ${input.campaign.offerSummary}` : null,
    input.campaign.targetIcp ? `Campaign ICP: ${input.campaign.targetIcp}` : null,
    `Requested reply tone: ${input.promptContext.tone.style}`,
    `Tone do: ${input.promptContext.tone.do.join(" | ") || "none"}`,
    `Tone avoid: ${input.promptContext.tone.avoid.join(" | ") || "none"}`,
    `Credibility level: ${input.senderContext.credibilityLevel}`,
    getSenderDirective(input),
    getProspectDirective(input),
    getThreadDirective(input),
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function callReplyJson<TOutput>(input: {
  request: ReplyAnalysisRequest;
  task: string;
  instructions: string;
  validate: (payload: unknown) => TOutput;
}): Promise<TOutput> {
  return callAnthropicJson({
    model: getModelName(),
    promptVersion: PROMPT_VERSION,
    system: getSharedSystemPrompt(input.request),
    user: [`Task: ${input.task}`, input.instructions, "Return JSON only."].join(
      "\n\n",
    ),
    validate: input.validate,
  });
}

export function createAnthropicReplyModelAdapter(): ReplyGenerationModelAdapter {
  return {
    async analyzeReply(input: ReplyAnalysisRequest) {
      return callReplyJson({
        request: input,
        task: "Analyze the latest inbound prospect reply.",
        instructions: [
          "Classify the reply intent using the allowed intent categories.",
          "Set objectionType when applicable.",
          "Recommend the most appropriate next action.",
          "Use low confidence if the reply is ambiguous.",
          '{"analysis":{"intent":"needs_more_info","objectionType":"timing","classification":"needs_more_info","confidence":{"score":0.7,"label":"medium","reasons":["..."]},"recommendedAction":"send_more_info","rationale":"...","keySignals":["..."],"cautionFlags":["..."]},"rationale":"..."}',
        ].join("\n"),
        validate: (payload) => replyAnalysisOutputSchema.parse(payload),
      });
    },
    async recommendResponseStrategy(input: {
      request: ReplyAnalysisRequest;
      analysis: ResponseStrategyRecommendationOutput extends never
        ? never
        : ReplyAnalysisRequest extends never
          ? never
          : Parameters<ReplyGenerationModelAdapter["recommendResponseStrategy"]>[0]["analysis"];
    }) {
      return callReplyJson({
        request: input.request,
        task: "Recommend the response strategy for the analyzed inbound reply.",
        instructions: [
          `Analysis intent: ${input.analysis.intent}`,
          `Recommended action from analysis: ${input.analysis.recommendedAction}`,
          "Separate the tactical drafting strategy from the classification.",
          '{"strategy":{"recommendedAction":"send_more_info","draftingStrategy":"...","guardrails":["..."],"toneGuidance":["..."],"escalationNeeded":false},"rationale":"..."}',
        ].join("\n"),
        validate: (payload) => responseStrategyRecommendationOutputSchema.parse(payload),
      });
    },
    async generateDraftReplies(input: DraftReplyGenerationInput) {
      return callReplyJson({
        request: input.request,
        task: "Generate three draft responses for the analyzed inbound reply.",
        instructions: [
          `Analysis intent: ${input.analysis.intent}`,
          `Recommended action: ${input.strategy.recommendedAction}`,
          `Drafting strategy: ${input.strategy.draftingStrategy}`,
          "Return exactly 3 distinct draft options.",
          "If the reply is a hard no, the drafts must be respectful close-out acknowledgements and must not push for another meeting.",
          '{"output":{"recommendedAction":"send_more_info","draftingStrategy":"...","confidence":{"score":0.7,"label":"medium","reasons":["..."]},"drafts":[{"slotId":"option-1","label":"...","subject":"...","bodyText":"...","strategyNote":"..."}],"guardrails":["..."]},"rationale":"..."}',
        ].join("\n"),
        validate: (payload) => draftReplyGenerationOutputSchema.parse(payload),
      });
    },
    async regenerateDraftReplyOption(input: RegenerateDraftReplyInput) {
      return callReplyJson({
        request: input.baseInput.request,
        task: "Regenerate one draft reply option.",
        instructions: [
          `Target slot id: ${input.targetSlotId}`,
          `Feedback: ${input.feedback}`,
          `Current recommended action: ${input.baseInput.strategy.recommendedAction}`,
          "Only regenerate one option while preserving the current strategy and safety constraints.",
          '{"regeneratedDraft":{"slotId":"option-1","label":"...","subject":"...","bodyText":"...","strategyNote":"..."},"rationale":"..."}',
        ].join("\n"),
        validate: (payload) => regenerateDraftReplyOutputSchema.parse(payload),
      });
    },
  };
}

