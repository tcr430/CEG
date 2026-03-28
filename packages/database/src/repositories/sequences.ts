import type { Sequence } from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapSequenceRow,
  validateCampaignId,
  validateProspectId,
  validateSequenceId,
  validateWorkspaceId,
} from "./shared.js";

export type CreateSequenceRecordInput = {
  workspaceId: string;
  campaignId: string;
  prospectId?: string | null;
  senderProfileId?: string | null;
  brandVoiceProfileId?: string | null;
  promptTemplateId?: string | null;
  generationMode: Sequence["generationMode"];
  channel?: Sequence["channel"];
  status?: Sequence["status"];
  content: Sequence["content"];
  qualityChecksJson?: Sequence["qualityChecksJson"];
  modelMetadata: Sequence["modelMetadata"];
  createdByUserId?: string | null;
};

export type SequenceRepository = {
  createSequence(input: CreateSequenceRecordInput): Promise<Sequence>;
  listSequencesByProspect(
    workspaceId: string,
    campaignId: string,
    prospectId: string,
  ): Promise<Sequence[]>;
  getLatestSequenceByProspect(
    workspaceId: string,
    campaignId: string,
    prospectId: string,
  ): Promise<Sequence | null>;
  getSequenceById(sequenceId: string): Promise<Sequence | null>;
};

export function createSequenceRepository(
  client: DatabaseClient,
): SequenceRepository {
  return {
    async createSequence(input) {
      const workspaceId = validateWorkspaceId(input.workspaceId);
      const campaignId = validateCampaignId(input.campaignId);
      const prospectId =
        input.prospectId === undefined || input.prospectId === null
          ? null
          : validateProspectId(input.prospectId);

      const result = await client.query<Parameters<typeof mapSequenceRow>[0]>({
        statement: `
          INSERT INTO sequences (
            workspace_id,
            campaign_id,
            prospect_id,
            sender_profile_id,
            brand_voice_profile_id,
            prompt_template_id,
            generation_mode,
            channel,
            status,
            content,
            quality_checks_json,
            model_metadata,
            created_by_user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            sender_profile_id,
            brand_voice_profile_id,
            prompt_template_id,
            generation_mode,
            channel,
            status,
            content,
            quality_checks_json,
            model_metadata,
            created_by_user_id,
            created_at,
            updated_at
        `,
        params: [
          workspaceId,
          campaignId,
          prospectId,
          input.senderProfileId ?? null,
          input.brandVoiceProfileId ?? null,
          input.promptTemplateId ?? null,
          input.generationMode,
          input.channel ?? "email",
          input.status ?? "draft",
          input.content,
          input.qualityChecksJson ?? null,
          input.modelMetadata,
          input.createdByUserId ?? null,
        ],
      });

      return mapSequenceRow(getFirstRowOrThrow(result.rows, "sequence"));
    },
    async listSequencesByProspect(workspaceId, campaignId, prospectId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedCampaignId = validateCampaignId(campaignId);
      const validatedProspectId = validateProspectId(prospectId);
      const result = await client.query<Parameters<typeof mapSequenceRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            sender_profile_id,
            brand_voice_profile_id,
            prompt_template_id,
            generation_mode,
            channel,
            status,
            content,
            quality_checks_json,
            model_metadata,
            created_by_user_id,
            created_at,
            updated_at
          FROM sequences
          WHERE workspace_id = $1
            AND campaign_id = $2
            AND prospect_id = $3
          ORDER BY created_at DESC
        `,
        params: [validatedWorkspaceId, validatedCampaignId, validatedProspectId],
      });

      return result.rows.map((row) => mapSequenceRow(row));
    },
    async getLatestSequenceByProspect(workspaceId, campaignId, prospectId) {
      const sequences = await this.listSequencesByProspect(
        workspaceId,
        campaignId,
        prospectId,
      );
      return sequences[0] ?? null;
    },
    async getSequenceById(sequenceId) {
      const validatedSequenceId = validateSequenceId(sequenceId);
      const result = await client.query<Parameters<typeof mapSequenceRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            prospect_id,
            sender_profile_id,
            brand_voice_profile_id,
            prompt_template_id,
            generation_mode,
            channel,
            status,
            content,
            quality_checks_json,
            model_metadata,
            created_by_user_id,
            created_at,
            updated_at
          FROM sequences
          WHERE id = $1
          LIMIT 1
        `,
        params: [validatedSequenceId],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapSequenceRow(row);
    },
  };
}
