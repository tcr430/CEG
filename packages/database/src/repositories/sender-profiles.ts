import type {
  CreateSenderProfileInput,
  SenderProfile,
  UpdateSenderProfileInput,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapSenderProfileRow,
  validateCreateSenderProfileInput,
  validateSenderProfileId,
  validateUpdateSenderProfileInput,
  validateWorkspaceId,
} from "./shared.js";

export type SenderProfileRepository = {
  createSenderProfile(input: CreateSenderProfileInput): Promise<SenderProfile>;
  getSenderProfileById(senderProfileId: string): Promise<SenderProfile | null>;
  listSenderProfilesByWorkspace(workspaceId: string): Promise<SenderProfile[]>;
  updateSenderProfile(input: UpdateSenderProfileInput): Promise<SenderProfile>;
};

export function createSenderProfileRepository(
  client: DatabaseClient,
): SenderProfileRepository {
  return {
    async createSenderProfile(input) {
      const values = validateCreateSenderProfileInput(input);
      const result = await client.query<
        Parameters<typeof mapSenderProfileRow>[0]
      >({
        statement: `
          INSERT INTO sender_profiles (
            workspace_id,
            name,
            sender_type,
            company_name,
            company_website,
            product_description,
            target_customer,
            value_proposition,
            differentiation,
            proof_points,
            goals,
            tone_preferences,
            metadata,
            status,
            is_default,
            created_by_user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING
            id,
            workspace_id,
            name,
            sender_type,
            company_name,
            company_website,
            product_description,
            target_customer,
            value_proposition,
            differentiation,
            proof_points,
            goals,
            tone_preferences,
            metadata,
            status,
            is_default,
            created_by_user_id,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.name,
          values.senderType,
          values.companyName ?? null,
          values.companyWebsite ?? null,
          values.productDescription ?? null,
          values.targetCustomer ?? null,
          values.valueProposition ?? null,
          values.differentiation ?? null,
          values.proofPoints,
          values.goals,
          values.tonePreferences,
          values.metadata,
          values.status,
          values.isDefault,
          values.createdByUserId ?? null,
        ],
      });

      return mapSenderProfileRow(
        getFirstRowOrThrow(result.rows, "sender profile"),
      );
    },
    async getSenderProfileById(senderProfileId) {
      const validatedSenderProfileId = validateSenderProfileId(senderProfileId);
      const result = await client.query<
        Parameters<typeof mapSenderProfileRow>[0]
      >({
        statement: `
          SELECT
            id,
            workspace_id,
            name,
            sender_type,
            company_name,
            company_website,
            product_description,
            target_customer,
            value_proposition,
            differentiation,
            proof_points,
            goals,
            tone_preferences,
            metadata,
            status,
            is_default,
            created_by_user_id,
            created_at,
            updated_at
          FROM sender_profiles
          WHERE id = $1
          LIMIT 1
        `,
        params: [validatedSenderProfileId],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapSenderProfileRow(row);
    },
    async listSenderProfilesByWorkspace(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const result = await client.query<
        Parameters<typeof mapSenderProfileRow>[0]
      >({
        statement: `
          SELECT
            id,
            workspace_id,
            name,
            sender_type,
            company_name,
            company_website,
            product_description,
            target_customer,
            value_proposition,
            differentiation,
            proof_points,
            goals,
            tone_preferences,
            metadata,
            status,
            is_default,
            created_by_user_id,
            created_at,
            updated_at
          FROM sender_profiles
          WHERE workspace_id = $1
          ORDER BY is_default DESC, created_at DESC
        `,
        params: [validatedWorkspaceId],
      });

      return result.rows.map((row) => mapSenderProfileRow(row));
    },
    async updateSenderProfile(input) {
      const values = validateUpdateSenderProfileInput(input);
      const result = await client.query<
        Parameters<typeof mapSenderProfileRow>[0]
      >({
        statement: `
          UPDATE sender_profiles
          SET
            name = $1,
            sender_type = $2,
            company_name = $3,
            company_website = $4,
            product_description = $5,
            target_customer = $6,
            value_proposition = $7,
            differentiation = $8,
            proof_points = $9,
            goals = $10,
            tone_preferences = $11,
            metadata = $12,
            status = $13,
            is_default = $14
          WHERE id = $15
            AND workspace_id = $16
          RETURNING
            id,
            workspace_id,
            name,
            sender_type,
            company_name,
            company_website,
            product_description,
            target_customer,
            value_proposition,
            differentiation,
            proof_points,
            goals,
            tone_preferences,
            metadata,
            status,
            is_default,
            created_by_user_id,
            created_at,
            updated_at
        `,
        params: [
          values.name,
          values.senderType,
          values.companyName ?? null,
          values.companyWebsite ?? null,
          values.productDescription ?? null,
          values.targetCustomer ?? null,
          values.valueProposition ?? null,
          values.differentiation ?? null,
          values.proofPoints,
          values.goals,
          values.tonePreferences,
          values.metadata,
          values.status,
          values.isDefault,
          values.senderProfileId,
          values.workspaceId,
        ],
      });

      return mapSenderProfileRow(
        getFirstRowOrThrow(result.rows, "sender profile"),
      );
    },
  };
}
