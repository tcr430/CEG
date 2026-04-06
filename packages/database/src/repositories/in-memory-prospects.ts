import { randomUUID } from "node:crypto";

import type {
  CreateProspectInput,
  Prospect,
  UpdateProspectInput,
} from "@ceg/validation";

import type { ProspectRepository } from "./prospects.js";
import {
  validateCampaignId,
  validateCreateProspectInput,
  validateProspectId,
  validateUpdateProspectInput,
  validateWorkspaceId,
} from "./shared.js";

function toProspectRecord(
  id: string,
  now: Date,
  input: CreateProspectInput | UpdateProspectInput,
  createdAt: Date,
): Prospect {
  const contactName = input.contactName ?? input.fullName ?? null;

  return {
    id,
    workspaceId: input.workspaceId,
    campaignId: input.campaignId ?? null,
    contactName,
    fullName: contactName,
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    email: input.email ?? null,
    title: input.title ?? null,
    companyName: input.companyName ?? null,
    companyDomain: input.companyDomain ?? null,
    companyWebsite: input.companyWebsite ?? null,
    linkedinUrl: input.linkedinUrl ?? null,
    location: input.location ?? null,
    source: input.source ?? null,
    status: input.status,
    metadata: input.metadata,
    createdByUserId: "createdByUserId" in input ? input.createdByUserId ?? null : null,
    createdAt,
    updatedAt: now,
  };
}

export function createInMemoryProspectRepository(
  initialProspects: Prospect[] = [],
): ProspectRepository {
  const records = new Map(
    initialProspects.map((prospect) => [prospect.id, prospect] as const),
  );

  return {
    async createProspect(input) {
      const values = validateCreateProspectInput(input);
      const now = new Date();
      const record = toProspectRecord(randomUUID(), now, values, now);
      records.set(record.id, record);
      return record;
    },
    async getProspectById(prospectId) {
      const validatedProspectId = validateProspectId(prospectId);
      return records.get(validatedProspectId) ?? null;
    },
    async getProspectByEmail(workspaceId, email) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return (
        [...records.values()].find(
          (prospect) =>
            prospect.workspaceId === validatedWorkspaceId &&
            typeof prospect.email === "string" &&
            prospect.email.toLowerCase() === email.toLowerCase(),
        ) ?? null
      );
    },
    async listProspectsByCampaign(campaignId) {
      const validatedCampaignId = validateCampaignId(campaignId);
      return [...records.values()]
        .filter((prospect) => prospect.campaignId === validatedCampaignId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    },
    async updateProspect(input) {
      const values = validateUpdateProspectInput(input);
      const current = records.get(values.prospectId);

      if (current === undefined || current.workspaceId !== values.workspaceId) {
        throw new Error("Prospect not found for workspace.");
      }

      const updated = toProspectRecord(
        current.id,
        new Date(),
        values,
        current.createdAt,
      );

      records.set(updated.id, updated);
      return updated;
    },
    async deleteProspect(workspaceId, prospectId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedProspectId = validateProspectId(prospectId);
      const existing = records.get(validatedProspectId);
      if (existing?.workspaceId === validatedWorkspaceId) {
        records.delete(validatedProspectId);
      }
    },
  };
}


