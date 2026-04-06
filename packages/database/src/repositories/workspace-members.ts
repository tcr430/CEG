import type {
  RemoveWorkspaceMemberInput,
  UpdateWorkspaceMemberRoleInput,
  UpsertWorkspaceMemberInput,
  WorkspaceMember,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  validateRemoveWorkspaceMemberInput,
  validateUpdateWorkspaceMemberRoleInput,
  mapWorkspaceMemberRow,
  validateUpsertWorkspaceMemberInput,
  validateWorkspaceId,
} from "./shared.js";

type WorkspaceMemberRow = Parameters<typeof mapWorkspaceMemberRow>[0];

export type WorkspaceMemberRepository = {
  upsertWorkspaceMember(
    input: UpsertWorkspaceMemberInput,
  ): Promise<WorkspaceMember>;
  getWorkspaceMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null>;
  listWorkspaceMembersByWorkspaceId(
    workspaceId: string,
  ): Promise<WorkspaceMember[]>;
  activateWorkspaceMembershipsByUserId(userId: string): Promise<number>;
  updateWorkspaceMemberRole(
    input: UpdateWorkspaceMemberRoleInput,
  ): Promise<WorkspaceMember>;
  removeWorkspaceMember(input: RemoveWorkspaceMemberInput): Promise<void>;
  listWorkspaceMembershipsByUserId(userId: string): Promise<WorkspaceMember[]>;
};

export function createWorkspaceMemberRepository(
  client: DatabaseClient,
): WorkspaceMemberRepository {
  return {
    async upsertWorkspaceMember(input) {
      const values = validateUpsertWorkspaceMemberInput(input);
      const result = await client.query<WorkspaceMember>({
        statement: `
          INSERT INTO workspace_members (
            workspace_id,
            user_id,
            role,
            status,
            invited_by_user_id,
            joined_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (workspace_id, user_id)
          DO UPDATE SET
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            invited_by_user_id = EXCLUDED.invited_by_user_id,
            joined_at = COALESCE(workspace_members.joined_at, EXCLUDED.joined_at),
            updated_at = NOW()
          RETURNING
            id,
            workspace_id,
            user_id,
            role,
            status,
            invited_by_user_id,
            joined_at,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.userId,
          values.role,
          values.status,
          values.invitedByUserId ?? null,
          values.joinedAt ?? null,
        ],
        mapper: (row) => mapWorkspaceMemberRow(row as WorkspaceMemberRow),
      });

      return getFirstRowOrThrow(result.rows, "workspace member");
    },
    async getWorkspaceMembership(workspaceId, userId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const result = await client.query<WorkspaceMember>({
        statement: `
          SELECT
            id,
            workspace_id,
            user_id,
            role,
            status,
            invited_by_user_id,
            joined_at,
            created_at,
            updated_at
          FROM workspace_members
          WHERE workspace_id = $1
            AND user_id = $2
          LIMIT 1
        `,
        params: [validatedWorkspaceId, userId],
        mapper: (row) => mapWorkspaceMemberRow(row as WorkspaceMemberRow),
      });

      const row = result.rows[0];
      return row ?? null;
    },
    async listWorkspaceMembersByWorkspaceId(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const result = await client.query<WorkspaceMember>({
        statement: `
          SELECT
            id,
            workspace_id,
            user_id,
            role,
            status,
            invited_by_user_id,
            joined_at,
            created_at,
            updated_at
          FROM workspace_members
          WHERE workspace_id = $1
          ORDER BY
            CASE role
              WHEN 'owner' THEN 3
              WHEN 'admin' THEN 2
              ELSE 1
            END DESC,
            created_at ASC
        `,
        params: [validatedWorkspaceId],
        mapper: (row) => mapWorkspaceMemberRow(row as WorkspaceMemberRow),
      });

      return result.rows;
    },
    async activateWorkspaceMembershipsByUserId(userId) {
      const result = await client.query<{ count: string }>({
        statement: `
          WITH updated AS (
            UPDATE workspace_members
            SET status = 'active',
                joined_at = COALESCE(joined_at, NOW()),
                updated_at = NOW()
            WHERE user_id = $1
              AND status = 'invited'
            RETURNING 1
          )
          SELECT COUNT(*)::text AS count FROM updated
        `,
        params: [userId],
      });

      return Number.parseInt(result.rows[0]?.count ?? "0", 10);
    },
    async updateWorkspaceMemberRole(input) {
      const values = validateUpdateWorkspaceMemberRoleInput(input);
      const result = await client.query<WorkspaceMember>({
        statement: `
          UPDATE workspace_members
          SET role = $3,
              updated_at = NOW()
          WHERE workspace_id = $1
            AND user_id = $2
          RETURNING
            id,
            workspace_id,
            user_id,
            role,
            status,
            invited_by_user_id,
            joined_at,
            created_at,
            updated_at
        `,
        params: [values.workspaceId, values.userId, values.role],
        mapper: (row) => mapWorkspaceMemberRow(row as WorkspaceMemberRow),
      });

      return getFirstRowOrThrow(result.rows, "workspace member");
    },
    async removeWorkspaceMember(input) {
      const values = validateRemoveWorkspaceMemberInput(input);
      await client.query({
        statement: `
          DELETE FROM workspace_members
          WHERE workspace_id = $1
            AND user_id = $2
        `,
        params: [values.workspaceId, values.userId],
      });
    },
    async listWorkspaceMembershipsByUserId(userId) {
      const result = await client.query<WorkspaceMember>({
        statement: `
          SELECT
            id,
            workspace_id,
            user_id,
            role,
            status,
            invited_by_user_id,
            joined_at,
            created_at,
            updated_at
          FROM workspace_members
          WHERE user_id = $1
            AND status = 'active'
          ORDER BY created_at ASC
        `,
        params: [userId],
        mapper: (row) => mapWorkspaceMemberRow(row as WorkspaceMemberRow),
      });

      return result.rows;
    },
  };
}
