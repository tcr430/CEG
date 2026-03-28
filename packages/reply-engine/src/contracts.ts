import { z } from "zod";

import {
  campaignSchema,
  companyProfileSchema,
  draftReplyOutputSchema,
  replyAnalysisInputSchema,
  replyClassificationOutputSchema,
  replyIntentSchema,
  responseStrategyRecommendationSchema,
  senderProfileSchema,
  type Campaign,
  type CompanyProfile,
  type ReplyAnalysisInput,
  type ReplyClassificationOutput,
  type ResponseStrategyRecommendation,
} from "@ceg/validation";

export const replySenderModeSchema = z.enum(["basic", "sender_aware"]);

export const replySenderContextSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("basic"),
    basicModeReason: z.string().trim().min(1),
    credibilityLevel: z.enum(["cautious", "balanced", "confident"]).default("cautious"),
  }),
  z.object({
    mode: z.literal("sender_aware"),
    senderProfile: senderProfileSchema,
    credibilityLevel: z.enum(["cautious", "balanced", "confident"]).default("balanced"),
  }),
]);

export const replyConstraintsSchema = z.object({
  forbidPushAfterHardNo: z.boolean().default(true),
  forbidInventedFacts: z.boolean().default(true),
  avoidRepeatingWholeThread: z.boolean().default(true),
  preserveToneAndCredibility: z.boolean().default(true),
  softerLanguageWhenLowConfidence: z.boolean().default(true),
  maxDraftReplyLength: z.number().int().positive().max(4000).default(900),
  maxDraftOptions: z.number().int().positive().max(5).default(3),
});

export const replyPromptContextSchema = z.object({
  tone: z.object({
    style: z.string().trim().min(1),
    do: z.array(z.string().trim().min(1)).default([]),
    avoid: z.array(z.string().trim().min(1)).default([]),
  }),
  productCredibility: z.enum(["low_context", "grounded", "high_conviction"]).default("grounded"),
  constraints: replyConstraintsSchema,
});

export const replyAnalysisRequestSchema = z.object({
  senderContext: replySenderContextSchema,
  campaign: campaignSchema,
  prospectCompanyProfile: companyProfileSchema.nullable().optional(),
  analysisInput: replyAnalysisInputSchema,
  promptContext: replyPromptContextSchema,
});

export const replyOperationMetadataSchema = z.object({
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  promptVersion: z.string().trim().min(1),
  inputTokens: z.number().int().nonnegative().nullable().optional(),
  outputTokens: z.number().int().nonnegative().nullable().optional(),
  totalTokens: z.number().int().nonnegative().nullable().optional(),
  costUsd: z.number().nonnegative().nullable().optional(),
  generatedAt: z.coerce.date(),
});

export const replyQualityCheckNameSchema = z.enum([
  "respect_hard_no",
  "no_invented_facts",
  "no_thread_repetition",
  "tone_fit",
  "confidence_language_fit",
]);

export const replyQualityCheckSchema = z.object({
  name: replyQualityCheckNameSchema,
  passed: z.boolean(),
  details: z.string().trim().min(1),
});

export const replyAnalysisOutputSchema = z.object({
  analysis: replyClassificationOutputSchema,
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(replyQualityCheckSchema).default([]),
  analysisMetadata: replyOperationMetadataSchema,
});

export const responseStrategyRecommendationOutputSchema = z.object({
  strategy: responseStrategyRecommendationSchema,
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(replyQualityCheckSchema).default([]),
  analysisMetadata: replyOperationMetadataSchema,
});

export const draftReplyGenerationInputSchema = z.object({
  request: replyAnalysisRequestSchema,
  analysis: replyClassificationOutputSchema,
  strategy: responseStrategyRecommendationSchema,
});

export const draftReplyGenerationOutputSchema = z.object({
  output: draftReplyOutputSchema,
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(replyQualityCheckSchema).default([]),
  generationMetadata: replyOperationMetadataSchema,
});

export const regenerateDraftReplyInputSchema = z.object({
  baseInput: draftReplyGenerationInputSchema,
  targetSlotId: z.string().trim().min(1),
  currentOutput: draftReplyOutputSchema,
  feedback: z.string().trim().min(1),
});

export const regenerateDraftReplyOutputSchema = z.object({
  regeneratedDraft: draftReplyOutputSchema.shape.drafts.element,
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(replyQualityCheckSchema).default([]),
  generationMetadata: replyOperationMetadataSchema,
});

export type ReplySenderContext = z.infer<typeof replySenderContextSchema>;
export type ReplyAnalysisRequest = z.infer<typeof replyAnalysisRequestSchema>;
export type ReplyOperationMetadata = z.infer<typeof replyOperationMetadataSchema>;
export type ReplyQualityCheck = z.infer<typeof replyQualityCheckSchema>;
export type ReplyAnalysisOutput = z.infer<typeof replyAnalysisOutputSchema>;
export type ResponseStrategyRecommendationOutput = z.infer<
  typeof responseStrategyRecommendationOutputSchema
>;
export type DraftReplyGenerationInput = z.infer<
  typeof draftReplyGenerationInputSchema
>;
export type DraftReplyGenerationOutput = z.infer<
  typeof draftReplyGenerationOutputSchema
>;
export type RegenerateDraftReplyInput = z.infer<
  typeof regenerateDraftReplyInputSchema
>;
export type RegenerateDraftReplyOutput = z.infer<
  typeof regenerateDraftReplyOutputSchema
>;

export type ReplyGenerationModelAdapter = {
  analyzeReply(input: ReplyAnalysisRequest): Promise<ReplyAnalysisOutput>;
  recommendResponseStrategy(
    input: {
      request: ReplyAnalysisRequest;
      analysis: ReplyClassificationOutput;
    },
  ): Promise<ResponseStrategyRecommendationOutput>;
  generateDraftReplies(
    input: DraftReplyGenerationInput,
  ): Promise<DraftReplyGenerationOutput>;
  regenerateDraftReplyOption(
    input: RegenerateDraftReplyInput,
  ): Promise<RegenerateDraftReplyOutput>;
};

export type ReplyEngineService = {
  analyzeReply(input: ReplyAnalysisRequest): Promise<ReplyAnalysisOutput>;
  recommendResponseStrategy(
    input: {
      request: ReplyAnalysisRequest;
      analysis: ReplyClassificationOutput;
    },
  ): Promise<ResponseStrategyRecommendationOutput>;
  generateDraftReplies(
    input: DraftReplyGenerationInput,
  ): Promise<DraftReplyGenerationOutput>;
  regenerateDraftReplyOption(
    input: RegenerateDraftReplyInput,
  ): Promise<RegenerateDraftReplyOutput>;
};

export type ReplyValidationContext = {
  senderContext: ReplySenderContext;
  campaign: Campaign;
  prospectCompanyProfile?: CompanyProfile | null;
  analysisInput: ReplyAnalysisInput;
  promptContext: z.infer<typeof replyPromptContextSchema>;
  analysis: ReplyClassificationOutput;
  strategy?: ResponseStrategyRecommendation;
};

export const replyAllowedRegenerateIntents = new Set(replyIntentSchema.options);
