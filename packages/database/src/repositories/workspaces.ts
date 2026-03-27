import type { Workspace, CreateWorkspaceInput } from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapWorkspaceRow,
  validateCreateWorkspaceInput,
  validateWorkspaceId,
} from "./shared.js";

export type WorkspaceRepository = {
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>;
  getWorkspaceById(workspaceId: string): Promise<Workspace | null>;
};

export function createWorkspaceRepository(
  client: DatabaseClient,
): WorkspaceRepository {
  return {
    async createWorkspace(input) {
      const values = validateCreateWorkspaceInput(input);
      const result = await client.query<Parameters<typeof mapWorkspaceRow>[0]>({
        statement: `
          INSERT INTO workspaces (
            slug,
            name,
            owner_user_id,
            status,
            settings
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            id,
            slug,
            name,
            owner_user_id,
            status,
            settings,
            created_at,
            updated_at
        `,
        params: [
          values.slug,
          values.name,
          values.ownerUserId ?? null,
          values.status,
          values.settings,
        ],
      });

      return mapWorkspaceRow(getFirstRowOrThrow(result.rows, "workspace"));
    },
    async getWorkspaceById(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const result = await client.query<Parameters<typeof mapWorkspaceRow>[0]>({
        statement: `
          SELECT
            id,
            slug,
            name,
            owner_user_id,
            status,
            settings,
            created_at,
            updated_at
          FROM workspaces
          WHERE id = $1
          LIMIT 1
        `,
        params: [validatedWorkspaceId],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapWorkspaceRow(row);
    },
  };
}
