import { randomUUID } from "node:crypto";

import type { Sequence } from "@ceg/validation";

import type {
  CreateSequenceRecordInput,
  SequenceRepository,
} from "./sequences.js";
import {
  validateCampaignId,
  validateProspectId,
  validateSequenceId,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemorySequenceRepository(
  initialSequences: Sequence[] = [],
): SequenceRepository {
  const records = new Map(
    initialSequences.map((sequence) => [sequence.id, sequence] as const),
  );

  return {
    async createSequence(input: CreateSequenceRecordInput) {
      const workspaceId = validateWorkspaceId(input.workspaceId);
      const campaignId = validateCampaignId(input.campaignId);
      const prospectId =
        input.prospectId === undefined || input.prospectId === null
          ? null
          : validateProspectId(input.prospectId);
      const now = new Date();
      const record: Sequence = {
        id: randomUUID(),
        workspaceId,
        campaignId,
        prospectId,
        senderProfileId: input.senderProfileId ?? null,
        brandVoiceProfileId: input.brandVoiceProfileId ?? null,
        promptTemplateId: input.promptTemplateId ?? null,
        generationMode: input.generationMode,
        channel: input.channel ?? "email",
        status: input.status ?? "draft",
        content: input.content,
        modelMetadata: input.modelMetadata,
        createdByUserId: input.createdByUserId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async listSequencesByProspect(workspaceId, campaignId, prospectId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedCampaignId = validateCampaignId(campaignId);
      const validatedProspectId = validateProspectId(prospectId);

      return [...records.values()]
        .filter(
          (sequence) =>
            sequence.workspaceId === validatedWorkspaceId &&
            sequence.campaignId === validatedCampaignId &&
            sequence.prospectId === validatedProspectId,
        )
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    },
    async getLatestSequenceByProspect(workspaceId, campaignId, prospectId) {
      const sequences = await this.listSequencesByProspect(
        workspaceId,
        campaignId,
        prospectId,
      );

      return sequences[0] ?? null;
    },
    async getSequenceById(sequenceId) {
      const validatedSequenceId = validateSequenceId(sequenceId);
      return records.get(validatedSequenceId) ?? null;
    },
  };
}
