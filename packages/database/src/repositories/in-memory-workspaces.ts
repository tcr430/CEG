import { randomUUID } from "node:crypto";

import type { CreateWorkspaceInput, Workspace } from "@ceg/validation";

import type { WorkspaceRepository } from "./workspaces.js";
import { validateCreateWorkspaceInput, validateWorkspaceId } from "./shared.js";

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
    async getWorkspaceById(workspaceId: string) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return records.get(validatedWorkspaceId) ?? null;
    },
  };
}
