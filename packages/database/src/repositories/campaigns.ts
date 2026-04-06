import type {
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapCampaignRow,
  validateCreateCampaignInput,
  validateCampaignId,
  validateUpdateCampaignInput,
  validateWorkspaceId,
} from "./shared.js";

export type CampaignRepository = {
  createCampaign(input: CreateCampaignInput): Promise<Campaign>;
  getCampaignById(campaignId: string): Promise<Campaign | null>;
  listCampaignsByWorkspace(workspaceId: string): Promise<Campaign[]>;
  updateCampaign(input: UpdateCampaignInput): Promise<Campaign>;
  deleteCampaign(workspaceId: string, campaignId: string): Promise<void>;
};

function buildCampaignSettings(
  input: Pick<
    CreateCampaignInput,
    | "settings"
    | "targetIcp"
    | "targetIndustries"
    | "tonePreferences"
    | "frameworkPreferences"
  >,
) {
  return {
    ...input.settings,
    targetIcp: input.targetIcp ?? null,
    targetIndustries: input.targetIndustries,
    tonePreferences: input.tonePreferences,
    frameworkPreferences: input.frameworkPreferences,
  };
}

export function createCampaignRepository(
  client: DatabaseClient,
): CampaignRepository {
  return {
    async createCampaign(input) {
      const values = validateCreateCampaignInput(input);
      const result = await client.query<Parameters<typeof mapCampaignRow>[0]>({
        statement: `
          INSERT INTO campaigns (
            workspace_id,
            sender_profile_id,
            brand_voice_profile_id,
            name,
            description,
            objective,
            offer_summary,
            target_persona,
            status,
            settings,
            created_by_user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING
            id,
            workspace_id,
            sender_profile_id,
            brand_voice_profile_id,
            name,
            description,
            objective,
            offer_summary,
            target_persona,
            status,
            settings,
            created_by_user_id,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.senderProfileId ?? null,
          values.brandVoiceProfileId ?? null,
          values.name,
          values.description ?? null,
          values.objective ?? null,
          values.offerSummary ?? null,
          values.targetIcp ?? values.targetPersona ?? null,
          values.status,
          buildCampaignSettings(values),
          values.createdByUserId ?? null,
        ],
      });

      return mapCampaignRow(getFirstRowOrThrow(result.rows, "campaign"));
    },
    async getCampaignById(campaignId) {
      const validatedCampaignId = validateCampaignId(campaignId);
      const result = await client.query<Parameters<typeof mapCampaignRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            sender_profile_id,
            brand_voice_profile_id,
            name,
            description,
            objective,
            offer_summary,
            target_persona,
            status,
            settings,
            created_by_user_id,
            created_at,
            updated_at
          FROM campaigns
          WHERE id = $1
          LIMIT 1
        `,
        params: [validatedCampaignId],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapCampaignRow(row);
    },
    async listCampaignsByWorkspace(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const result = await client.query<Parameters<typeof mapCampaignRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            sender_profile_id,
            brand_voice_profile_id,
            name,
            description,
            objective,
            offer_summary,
            target_persona,
            status,
            settings,
            created_by_user_id,
            created_at,
            updated_at
          FROM campaigns
          WHERE workspace_id = $1
          ORDER BY created_at DESC
        `,
        params: [validatedWorkspaceId],
      });

      return result.rows.map((row) => mapCampaignRow(row));
    },
    async updateCampaign(input) {
      const values = validateUpdateCampaignInput(input);
      const result = await client.query<Parameters<typeof mapCampaignRow>[0]>({
        statement: `
          UPDATE campaigns
          SET
            sender_profile_id = $3,
            brand_voice_profile_id = $4,
            name = $5,
            description = $6,
            objective = $7,
            offer_summary = $8,
            target_persona = $9,
            status = $10,
            settings = $11,
            updated_at = NOW()
          WHERE id = $1
            AND workspace_id = $2
          RETURNING
            id,
            workspace_id,
            sender_profile_id,
            brand_voice_profile_id,
            name,
            description,
            objective,
            offer_summary,
            target_persona,
            status,
            settings,
            created_by_user_id,
            created_at,
            updated_at
        `,
        params: [
          values.campaignId,
          values.workspaceId,
          values.senderProfileId ?? null,
          values.brandVoiceProfileId ?? null,
          values.name,
          values.description ?? null,
          values.objective ?? null,
          values.offerSummary ?? null,
          values.targetIcp ?? values.targetPersona ?? null,
          values.status,
          buildCampaignSettings(values),
        ],
      });

      return mapCampaignRow(getFirstRowOrThrow(result.rows, "campaign"));
    },
    async deleteCampaign(workspaceId, campaignId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedCampaignId = validateCampaignId(campaignId);
      await client.query({
        statement: `
          DELETE FROM campaigns
          WHERE workspace_id = $1
            AND id = $2
        `,
        params: [validatedWorkspaceId, validatedCampaignId],
      });
    },
  };
}
