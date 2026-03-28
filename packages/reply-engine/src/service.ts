import {
  draftReplyGenerationInputSchema,
  regenerateDraftReplyInputSchema,
  replyAnalysisRequestSchema,
  type DraftReplyGenerationInput,
  type DraftReplyGenerationOutput,
  type RegenerateDraftReplyInput,
  type RegenerateDraftReplyOutput,
  type ReplyAnalysisOutput,
  type ReplyAnalysisRequest,
  type ReplyEngineService,
  type ReplyGenerationModelAdapter,
  type ResponseStrategyRecommendationOutput,
} from "./contracts.js";
import {
  validateDraftReplyGenerationOutput,
  validateRegeneratedDraftReplyOutput,
  validateReplyAnalysisOutput,
  validateResponseStrategyRecommendationOutput,
} from "./validators.js";

export function createReplyEngineService(
  adapter: ReplyGenerationModelAdapter,
): ReplyEngineService {
  return {
    async analyzeReply(input: ReplyAnalysisRequest): Promise<ReplyAnalysisOutput> {
      const parsed = replyAnalysisRequestSchema.parse(input);
      const output = await adapter.analyzeReply(parsed);
      return validateReplyAnalysisOutput(output, parsed);
    },
    async recommendResponseStrategy(input): Promise<ResponseStrategyRecommendationOutput> {
      const parsedRequest = replyAnalysisRequestSchema.parse(input.request);
      const output = await adapter.recommendResponseStrategy({
        request: parsedRequest,
        analysis: input.analysis,
      });
      return validateResponseStrategyRecommendationOutput(output, {
        request: parsedRequest,
        analysis: input.analysis,
      });
    },
    async generateDraftReplies(
      input: DraftReplyGenerationInput,
    ): Promise<DraftReplyGenerationOutput> {
      const parsed = draftReplyGenerationInputSchema.parse(input);
      const output = await adapter.generateDraftReplies(parsed);
      return validateDraftReplyGenerationOutput(output, parsed);
    },
    async regenerateDraftReplyOption(
      input: RegenerateDraftReplyInput,
    ): Promise<RegenerateDraftReplyOutput> {
      const parsed = regenerateDraftReplyInputSchema.parse(input);
      const output = await adapter.regenerateDraftReplyOption(parsed);
      return validateRegeneratedDraftReplyOutput(output, parsed.baseInput);
    },
  };
}
