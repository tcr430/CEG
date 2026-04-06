import { randomUUID } from "node:crypto";

import type {
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@ceg/validation";

import type { CampaignRepository } from "./campaigns.js";
import {
  validateCampaignId,
  validateCreateCampaignInput,
  validateUpdateCampaignInput,
  validateWorkspaceId,
} from "./shared.js";

function toCampaignRecord(
  id: string,
  now: Date,
  input: CreateCampaignInput | UpdateCampaignInput,
  createdAt: Date,
): Campaign {
  return {
    id,
    workspaceId: input.workspaceId,
    senderProfileId: input.senderProfileId ?? null,
    brandVoiceProfileId: input.brandVoiceProfileId ?? null,
    name: input.name,
    description: input.description ?? null,
    objective: input.objective ?? null,
    offerSummary: input.offerSummary ?? null,
    targetIcp: input.targetIcp ?? input.targetPersona ?? null,
    targetPersona: input.targetIcp ?? input.targetPersona ?? null,
    targetIndustries: input.targetIndustries,
    tonePreferences: input.tonePreferences,
    frameworkPreferences: input.frameworkPreferences,
    status: input.status,
    settings: {
      ...input.settings,
      targetIcp: input.targetIcp ?? input.targetPersona ?? null,
      targetIndustries: input.targetIndustries,
      tonePreferences: input.tonePreferences,
      frameworkPreferences: input.frameworkPreferences,
    },
    createdByUserId: "createdByUserId" in input ? input.createdByUserId ?? null : null,
    createdAt,
    updatedAt: now,
  };
}

export function createInMemoryCampaignRepository(
  initialCampaigns: Campaign[] = [],
): CampaignRepository {
  const records = new Map(
    initialCampaigns.map((campaign) => [campaign.id, campaign] as const),
  );

  return {
    async createCampaign(input) {
      const values = validateCreateCampaignInput(input);
      const now = new Date();
      const record = toCampaignRecord(randomUUID(), now, values, now);
      records.set(record.id, record);
      return record;
    },
    async getCampaignById(campaignId) {
      const validatedCampaignId = validateCampaignId(campaignId);
      return records.get(validatedCampaignId) ?? null;
    },
    async listCampaignsByWorkspace(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return [...records.values()]
        .filter((campaign) => campaign.workspaceId === validatedWorkspaceId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    },
    async updateCampaign(input) {
      const values = validateUpdateCampaignInput(input);
      const current = records.get(values.campaignId);

      if (current === undefined || current.workspaceId !== values.workspaceId) {
        throw new Error("Campaign not found for workspace.");
      }

      const updated = toCampaignRecord(
        current.id,
        new Date(),
        values,
        current.createdAt,
      );

      records.set(updated.id, updated);
      return updated;
    },
    async deleteCampaign(workspaceId, campaignId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedCampaignId = validateCampaignId(campaignId);
      const existing = records.get(validatedCampaignId);
      if (existing?.workspaceId === validatedWorkspaceId) {
        records.delete(validatedCampaignId);
      }
    },
  };
}
