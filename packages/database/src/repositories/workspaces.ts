import type {
  CreateWorkspaceInput,
  CreateWorkspaceRecordInput,
  UpdateWorkspaceProfileInput,
  UpdateWorkspaceSettingsInput,
  Workspace,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapWorkspaceRow,
  validateCreateWorkspaceInput,
  validateCreateWorkspaceRecordInput,
  validateUpdateWorkspaceProfileInput,
  validateUpdateWorkspaceSettingsInput,
  validateWorkspaceId,
} from "./shared.js";

export type WorkspaceRepository = {
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>;
  createWorkspaceRecord(input: CreateWorkspaceRecordInput): Promise<Workspace>;
  getWorkspaceById(workspaceId: string): Promise<Workspace | null>;
  updateWorkspaceSettings(input: UpdateWorkspaceSettingsInput): Promise<Workspace>;
  updateWorkspaceProfile(input: UpdateWorkspaceProfileInput): Promise<Workspace>;
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
    async createWorkspaceRecord(input) {
      const values = validateCreateWorkspaceRecordInput(input);
      const result = await client.query<Parameters<typeof mapWorkspaceRow>[0]>({
        statement: `
          INSERT INTO workspaces (
            id,
            slug,
            name,
            owner_user_id,
            status,
            settings
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id)
          DO UPDATE SET
            slug = EXCLUDED.slug,
            name = EXCLUDED.name,
            owner_user_id = COALESCE(workspaces.owner_user_id, EXCLUDED.owner_user_id),
            status = EXCLUDED.status,
            settings = COALESCE(workspaces.settings, EXCLUDED.settings),
            updated_at = NOW()
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
          values.id,
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
    async updateWorkspaceSettings(input) {
      const values = validateUpdateWorkspaceSettingsInput(input);
      const result = await client.query<Parameters<typeof mapWorkspaceRow>[0]>({
        statement: `
          UPDATE workspaces
          SET settings = $2,
              updated_at = NOW()
          WHERE id = $1
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
        params: [values.workspaceId, values.settings],
      });

      return mapWorkspaceRow(getFirstRowOrThrow(result.rows, "workspace"));
    },
    async updateWorkspaceProfile(input) {
      const values = validateUpdateWorkspaceProfileInput(input);
      const current = await client.query<Parameters<typeof mapWorkspaceRow>[0]>({
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
        params: [values.workspaceId],
      });
      const existing = getFirstRowOrThrow(current.rows, "workspace");
      const existingWorkspace = mapWorkspaceRow(existing);
      const result = await client.query<Parameters<typeof mapWorkspaceRow>[0]>({
        statement: `
          UPDATE workspaces
          SET name = $2,
              settings = $3,
              updated_at = NOW()
          WHERE id = $1
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
          values.workspaceId,
          values.name,
          {
            ...existingWorkspace.settings,
            profile: values.profile,
          },
        ],
      });

      return mapWorkspaceRow(getFirstRowOrThrow(result.rows, "workspace"));
    },
  };
}
