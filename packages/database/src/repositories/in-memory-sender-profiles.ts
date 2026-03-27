import { randomUUID } from "node:crypto";

import type {
  CreateSenderProfileInput,
  SenderProfile,
  UpdateSenderProfileInput,
} from "@ceg/validation";

import type { SenderProfileRepository } from "./sender-profiles.js";
import {
  validateCreateSenderProfileInput,
  validateSenderProfileId,
  validateUpdateSenderProfileInput,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemorySenderProfileRepository(
  initialProfiles: SenderProfile[] = [],
): SenderProfileRepository {
  const records = new Map(
    initialProfiles.map((profile) => [profile.id, profile] as const),
  );

  return {
    async createSenderProfile(input: CreateSenderProfileInput) {
      const values = validateCreateSenderProfileInput(input);
      const now = new Date();
      const record: SenderProfile = {
        id: randomUUID(),
        workspaceId: values.workspaceId,
        name: values.name,
        senderType: values.senderType,
        companyName: values.companyName ?? null,
        companyWebsite: values.companyWebsite ?? null,
        productDescription: values.productDescription ?? null,
        targetCustomer: values.targetCustomer ?? null,
        valueProposition: values.valueProposition ?? null,
        differentiation: values.differentiation ?? null,
        proofPoints: values.proofPoints,
        goals: values.goals,
        tonePreferences: values.tonePreferences,
        metadata: values.metadata,
        status: values.status,
        isDefault: values.isDefault,
        createdByUserId: values.createdByUserId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      if (record.isDefault) {
        for (const existing of records.values()) {
          if (existing.workspaceId === record.workspaceId && existing.isDefault) {
            records.set(existing.id, {
              ...existing,
              isDefault: false,
              updatedAt: now,
            });
          }
        }
      }

      records.set(record.id, record);
      return record;
    },
    async getSenderProfileById(senderProfileId: string) {
      const validatedSenderProfileId = validateSenderProfileId(senderProfileId);
      return records.get(validatedSenderProfileId) ?? null;
    },
    async listSenderProfilesByWorkspace(workspaceId: string) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return [...records.values()]
        .filter((profile) => profile.workspaceId === validatedWorkspaceId)
        .sort((left, right) => {
          if (left.isDefault !== right.isDefault) {
            return left.isDefault ? -1 : 1;
          }

          return right.createdAt.getTime() - left.createdAt.getTime();
        });
    },
    async updateSenderProfile(input: UpdateSenderProfileInput) {
      const values = validateUpdateSenderProfileInput(input);
      const current = records.get(values.senderProfileId);

      if (current === undefined || current.workspaceId !== values.workspaceId) {
        throw new Error("Sender profile not found for workspace.");
      }

      const now = new Date();

      if (values.isDefault) {
        for (const existing of records.values()) {
          if (
            existing.workspaceId === values.workspaceId &&
            existing.id !== values.senderProfileId &&
            existing.isDefault
          ) {
            records.set(existing.id, {
              ...existing,
              isDefault: false,
              updatedAt: now,
            });
          }
        }
      }

      const updated: SenderProfile = {
        ...current,
        name: values.name,
        senderType: values.senderType,
        companyName: values.companyName ?? null,
        companyWebsite: values.companyWebsite ?? null,
        productDescription: values.productDescription ?? null,
        targetCustomer: values.targetCustomer ?? null,
        valueProposition: values.valueProposition ?? null,
        differentiation: values.differentiation ?? null,
        proofPoints: values.proofPoints,
        goals: values.goals,
        tonePreferences: values.tonePreferences,
        metadata: values.metadata,
        status: values.status,
        isDefault: values.isDefault,
        updatedAt: now,
      };

      records.set(updated.id, updated);
      return updated;
    },
  };
}
