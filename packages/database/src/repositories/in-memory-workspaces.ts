import { randomUUID } from "node:crypto";

import type {
  CreateWorkspaceInput,
  CreateWorkspaceRecordInput,
  UpdateWorkspaceSettingsInput,
  Workspace,
} from "@ceg/validation";

import type { WorkspaceRepository } from "./workspaces.js";
import {
  validateCreateWorkspaceInput,
  validateCreateWorkspaceRecordInput,
  validateUpdateWorkspaceSettingsInput,
  validateWorkspaceId,
} from "./shared.js";

export function createInMemoryWorkspaceRepository(
  initialWorkspaces: Workspace[] = [],
): WorkspaceRepository {
  const records = new Map(
    initialWorkspaces.map((workspace) => [workspace.id, workspace] as const),
  );

  return {
    async createWorkspace(input: CreateWorkspaceInput) {
      const values = validateCreateWorkspaceInput(input);
      const now = new Date();
      const record: Workspace = {
        id: randomUUID(),
        slug: values.slug,
        name: values.name,
        ownerUserId: values.ownerUserId ?? null,
        status: values.status,
        settings: values.settings,
        createdAt: now,
        updatedAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async createWorkspaceRecord(input: CreateWorkspaceRecordInput) {
      const values = validateCreateWorkspaceRecordInput(input);
      const now = new Date();
      const existing = records.get(values.id);

      if (existing !== undefined) {
        return existing;
      }

      const record: Workspace = {
        id: values.id,
        slug: values.slug,
        name: values.name,
        ownerUserId: values.ownerUserId ?? null,
        status: values.status,
        settings: values.settings,
        createdAt: now,
        updatedAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async getWorkspaceById(workspaceId: string) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return records.get(validatedWorkspaceId) ?? null;
    },
    async updateWorkspaceSettings(input: UpdateWorkspaceSettingsInput) {
      const values = validateUpdateWorkspaceSettingsInput(input);
      const existing = records.get(values.workspaceId);

      if (existing === undefined) {
        throw new Error("Workspace not found.");
      }

      const updated: Workspace = {
        ...existing,
        settings: values.settings,
        updatedAt: new Date(),
      };

      records.set(updated.id, updated);
      return updated;
    },
  };
}
