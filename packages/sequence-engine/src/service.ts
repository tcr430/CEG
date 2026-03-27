import {
  regenerateSequencePartInputSchema,
  sequenceGenerationInputSchema,
  type InitialEmailGenerationOutput,
  type OpenerGenerationOutput,
  type RegenerateSequencePartInput,
  type RegenerateSequencePartOutput,
  type SequenceEngineService,
  type SequenceGenerationInput,
  type SequenceGenerationModelAdapter,
  type SubjectLineGenerationOutput,
  type FollowUpSequenceGenerationOutput,
} from "./contracts.js";
import {
  validateFollowUpSequenceOutput,
  validateInitialEmailOutput,
  validateOpenerOutput,
  validateRegeneratedSequencePartOutput,
  validateSubjectLineOutput,
} from "./validators.js";

export function createSequenceEngineService(
  adapter: SequenceGenerationModelAdapter,
): SequenceEngineService {
  return {
    async generateSubjectLines(
      input: SequenceGenerationInput,
    ): Promise<SubjectLineGenerationOutput> {
      const parsed = sequenceGenerationInputSchema.parse(input);
      const output = await adapter.generateSubjectLines(parsed);
      return validateSubjectLineOutput(output, parsed);
    },
    async generateOpeners(
      input: SequenceGenerationInput,
    ): Promise<OpenerGenerationOutput> {
      const parsed = sequenceGenerationInputSchema.parse(input);
      const output = await adapter.generateOpeners(parsed);
      return validateOpenerOutput(output, parsed);
    },
    async generateInitialEmail(
      input: SequenceGenerationInput,
    ): Promise<InitialEmailGenerationOutput> {
      const parsed = sequenceGenerationInputSchema.parse(input);
      const output = await adapter.generateInitialEmail(parsed);
      return validateInitialEmailOutput(output, parsed);
    },
    async generateFollowUpSequence(
      input: SequenceGenerationInput,
    ): Promise<FollowUpSequenceGenerationOutput> {
      const parsed = sequenceGenerationInputSchema.parse(input);
      const output = await adapter.generateFollowUpSequence(parsed);
      return validateFollowUpSequenceOutput(output, parsed);
    },
    async regenerateSequencePart(
      input: RegenerateSequencePartInput,
    ): Promise<RegenerateSequencePartOutput> {
      const parsed = regenerateSequencePartInputSchema.parse(input);
      const output = await adapter.regenerateSequencePart(parsed);
      return validateRegeneratedSequencePartOutput(output, parsed.baseInput);
    },
  };
}
