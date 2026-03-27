import { z } from "zod";

import {
  campaignSchema,
  companyProfileSchema,
  senderProfileSchema,
  type Campaign,
  type CompanyProfile,
} from "@ceg/validation";

export const sequenceToneFitSchema = z.enum([
  "strict",
  "balanced",
  "flexible",
]);

export const sequencePartSchema = z.enum([
  "subject_line",
  "opener",
  "initial_email",
  "follow_up_step",
]);

export const senderModeSchema = z.enum(["basic", "sender_aware"]);

export const senderContextSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("basic"),
    basicModeReason: z.string().trim().min(1),
  }),
  z.object({
    mode: z.literal("sender_aware"),
    senderProfile: senderProfileSchema,
  }),
]);

export const sequenceConstraintsSchema = z.object({
  maxSubjectLength: z.number().int().positive().max(120).default(72),
  maxOpenerLength: z.number().int().positive().max(320).default(180),
  maxEmailBodyLength: z.number().int().positive().max(2000).default(900),
  maxFollowUpSteps: z.number().int().positive().max(10).default(3),
  requireCta: z.boolean().default(true),
  forbidUnsupportedClaims: z.boolean().default(true),
  forbidGenericFluff: z.boolean().default(true),
  bannedPhrases: z.array(z.string().trim().min(1)).default([]),
  preferredCallToActionStyle: z
    .enum(["soft", "direct", "curiosity", "value_first"])
    .default("soft"),
});

export const sequencePromptContextSchema = z.object({
  framework: z.string().trim().min(1),
  tone: z.object({
    style: z.string().trim().min(1),
    do: z.array(z.string().trim().min(1)).default([]),
    avoid: z.array(z.string().trim().min(1)).default([]),
    fit: sequenceToneFitSchema.default("balanced"),
  }),
  constraints: sequenceConstraintsSchema,
});

export const sequenceGenerationInputSchema = z.object({
  senderContext: senderContextSchema,
  campaign: campaignSchema,
  prospectCompanyProfile: companyProfileSchema,
  promptContext: sequencePromptContextSchema,
  objective: z.string().trim().min(1),
});

export const sequenceGenerationMetadataSchema = z.object({
  provider: z.string().trim().min(1),
  model: z.string().trim().min(1),
  promptVersion: z.string().trim().min(1),
  inputTokens: z.number().int().nonnegative().nullable().optional(),
  outputTokens: z.number().int().nonnegative().nullable().optional(),
  totalTokens: z.number().int().nonnegative().nullable().optional(),
  costUsd: z.number().nonnegative().nullable().optional(),
  generatedAt: z.coerce.date(),
});

export const subjectLineCandidateSchema = z.object({
  text: z.string().trim().min(1).max(120),
  rationale: z.string().trim().min(1),
});

export const openerCandidateSchema = z.object({
  text: z.string().trim().min(1).max(320),
  rationale: z.string().trim().min(1),
  evidenceSupport: z.array(z.string().trim().min(1)).default([]),
});

export const qualityCheckNameSchema = z.enum([
  "no_generic_fluff",
  "cta_presence",
  "max_length_targets",
  "no_unsupported_claims",
  "tone_fit",
]);

export const sequenceQualityCheckSchema = z.object({
  name: qualityCheckNameSchema,
  passed: z.boolean(),
  details: z.string().trim().min(1),
});

export const emailDraftSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  opener: z.string().trim().min(1).max(320),
  body: z.string().trim().min(1).max(2000),
  cta: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(sequenceQualityCheckSchema).default([]),
});

export const sequenceStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  waitDays: z.number().int().nonnegative(),
  subject: z.string().trim().min(1).max(120),
  opener: z.string().trim().min(1).max(320),
  body: z.string().trim().min(1).max(2000),
  cta: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(sequenceQualityCheckSchema).default([]),
});

export const subjectLineGenerationOutputSchema = z.object({
  subjectLines: z.array(subjectLineCandidateSchema).min(1).max(5),
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(sequenceQualityCheckSchema).default([]),
  generationMetadata: sequenceGenerationMetadataSchema,
});

export const openerGenerationOutputSchema = z.object({
  openerOptions: z.array(openerCandidateSchema).min(1).max(5),
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(sequenceQualityCheckSchema).default([]),
  generationMetadata: sequenceGenerationMetadataSchema,
});

export const initialEmailGenerationOutputSchema = z.object({
  email: emailDraftSchema,
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(sequenceQualityCheckSchema).default([]),
  generationMetadata: sequenceGenerationMetadataSchema,
});

export const followUpSequenceGenerationOutputSchema = z.object({
  sequenceSteps: z.array(sequenceStepSchema).min(1).max(10),
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(sequenceQualityCheckSchema).default([]),
  generationMetadata: sequenceGenerationMetadataSchema,
});

export const regenerateSequencePartInputSchema = z.object({
  baseInput: sequenceGenerationInputSchema,
  targetPart: sequencePartSchema,
  targetStepNumber: z.number().int().positive().optional(),
  currentSequenceSteps: z.array(sequenceStepSchema).default([]),
  currentEmail: emailDraftSchema.optional(),
  feedback: z.string().trim().min(1),
});

export const regenerateSequencePartOutputSchema = z.object({
  regeneratedPart: z.object({
    part: sequencePartSchema,
    subjectLines: z.array(subjectLineCandidateSchema).optional(),
    openerOptions: z.array(openerCandidateSchema).optional(),
    email: emailDraftSchema.optional(),
    sequenceStep: sequenceStepSchema.optional(),
  }),
  rationale: z.string().trim().min(1),
  qualityChecks: z.array(sequenceQualityCheckSchema).default([]),
  generationMetadata: sequenceGenerationMetadataSchema,
});

export const compiledSequenceOutputSchema = z.object({
  subjectLineSet: subjectLineGenerationOutputSchema,
  openerSet: openerGenerationOutputSchema,
  initialEmail: initialEmailGenerationOutputSchema,
  followUpSequence: followUpSequenceGenerationOutputSchema,
  sequenceVersion: z.number().int().positive(),
  generatedForMode: senderModeSchema,
});

export type SequenceGenerationInput = z.infer<typeof sequenceGenerationInputSchema>;
export type SubjectLineGenerationOutput = z.infer<
  typeof subjectLineGenerationOutputSchema
>;
export type OpenerGenerationOutput = z.infer<
  typeof openerGenerationOutputSchema
>;
export type InitialEmailGenerationOutput = z.infer<
  typeof initialEmailGenerationOutputSchema
>;
export type FollowUpSequenceGenerationOutput = z.infer<
  typeof followUpSequenceGenerationOutputSchema
>;
export type RegenerateSequencePartInput = z.infer<
  typeof regenerateSequencePartInputSchema
>;
export type RegenerateSequencePartOutput = z.infer<
  typeof regenerateSequencePartOutputSchema
>;
export type SequenceQualityCheck = z.infer<typeof sequenceQualityCheckSchema>;
export type SequenceStep = z.infer<typeof sequenceStepSchema>;
export type EmailDraft = z.infer<typeof emailDraftSchema>;
export type SenderContext = z.infer<typeof senderContextSchema>;
export type SequenceGenerationMetadata = z.infer<
  typeof sequenceGenerationMetadataSchema
>;
export type CompiledSequenceOutput = z.infer<
  typeof compiledSequenceOutputSchema
>;

export type SequenceGenerationModelAdapter = {
  generateSubjectLines(
    input: SequenceGenerationInput,
  ): Promise<SubjectLineGenerationOutput>;
  generateOpeners(
    input: SequenceGenerationInput,
  ): Promise<OpenerGenerationOutput>;
  generateInitialEmail(
    input: SequenceGenerationInput,
  ): Promise<InitialEmailGenerationOutput>;
  generateFollowUpSequence(
    input: SequenceGenerationInput,
  ): Promise<FollowUpSequenceGenerationOutput>;
  regenerateSequencePart(
    input: RegenerateSequencePartInput,
  ): Promise<RegenerateSequencePartOutput>;
};

export type SequenceEngineService = {
  generateSubjectLines(
    input: SequenceGenerationInput,
  ): Promise<SubjectLineGenerationOutput>;
  generateOpeners(
    input: SequenceGenerationInput,
  ): Promise<OpenerGenerationOutput>;
  generateInitialEmail(
    input: SequenceGenerationInput,
  ): Promise<InitialEmailGenerationOutput>;
  generateFollowUpSequence(
    input: SequenceGenerationInput,
  ): Promise<FollowUpSequenceGenerationOutput>;
  regenerateSequencePart(
    input: RegenerateSequencePartInput,
  ): Promise<RegenerateSequencePartOutput>;
};

export type SequenceValidationContext = {
  senderContext: SenderContext;
  campaign: Campaign;
  prospectCompanyProfile: CompanyProfile;
  promptContext: z.infer<typeof sequencePromptContextSchema>;
};

