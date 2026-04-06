import type {
  CreateProspectInput,
  Prospect,
  UpdateProspectInput,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapProspectRow,
  validateCampaignId,
  validateCreateProspectInput,
  validateProspectId,
  validateUpdateProspectInput,
  validateWorkspaceId,
} from "./shared.js";

export type ProspectRepository = {
  createProspect(input: CreateProspectInput): Promise<Prospect>;
  getProspectById(prospectId: string): Promise<Prospect | null>;
  getProspectByEmail(
    workspaceId: string,
    email: string,
  ): Promise<Prospect | null>;
  listProspectsByCampaign(campaignId: string): Promise<Prospect[]>;
  updateProspect(input: UpdateProspectInput): Promise<Prospect>;
  deleteProspect(workspaceId: string, prospectId: string): Promise<void>;
};

export function createProspectRepository(
  client: DatabaseClient,
): ProspectRepository {
  return {
    async createProspect(input) {
      const values = validateCreateProspectInput(input);
      const result = await client.query<Parameters<typeof mapProspectRow>[0]>({
        statement: `
          INSERT INTO prospects (
            workspace_id,
            campaign_id,
            full_name,
            first_name,
            last_name,
            email,
            title,
            company_name,
            company_domain,
            company_website,
            linkedin_url,
            location,
            source,
            status,
            metadata,
            created_by_user_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING
            id,
            workspace_id,
            campaign_id,
            full_name,
            first_name,
            last_name,
            email,
            title,
            company_name,
            company_domain,
            company_website,
            linkedin_url,
            location,
            source,
            status,
            metadata,
            created_by_user_id,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.campaignId ?? null,
          values.contactName ?? values.fullName ?? null,
          values.firstName ?? null,
          values.lastName ?? null,
          values.email ?? null,
          values.title ?? null,
          values.companyName ?? null,
          values.companyDomain ?? null,
          values.companyWebsite ?? null,
          values.linkedinUrl ?? null,
          values.location ?? null,
          values.source ?? null,
          values.status,
          values.metadata,
          values.createdByUserId ?? null,
        ],
      });

      return mapProspectRow(getFirstRowOrThrow(result.rows, "prospect"));
    },
    async getProspectById(prospectId) {
      const validatedProspectId = validateProspectId(prospectId);
      const result = await client.query<Parameters<typeof mapProspectRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            full_name,
            first_name,
            last_name,
            email,
            title,
            company_name,
            company_domain,
            company_website,
            linkedin_url,
            location,
            source,
            status,
            metadata,
            created_by_user_id,
            created_at,
            updated_at
          FROM prospects
          WHERE id = $1
          LIMIT 1
        `,
        params: [validatedProspectId],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapProspectRow(row);
    },
    async getProspectByEmail(workspaceId, email) {
      const result = await client.query<Parameters<typeof mapProspectRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            full_name,
            first_name,
            last_name,
            email,
            title,
            company_name,
            company_domain,
            company_website,
            linkedin_url,
            location,
            source,
            status,
            metadata,
            created_by_user_id,
            created_at,
            updated_at
          FROM prospects
          WHERE workspace_id = $1
            AND LOWER(email) = LOWER($2)
          LIMIT 1
        `,
        params: [workspaceId, email],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapProspectRow(row);
    },
    async listProspectsByCampaign(campaignId) {
      const validatedCampaignId = validateCampaignId(campaignId);
      const result = await client.query<Parameters<typeof mapProspectRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            campaign_id,
            full_name,
            first_name,
            last_name,
            email,
            title,
            company_name,
            company_domain,
            company_website,
            linkedin_url,
            location,
            source,
            status,
            metadata,
            created_by_user_id,
            created_at,
            updated_at
          FROM prospects
          WHERE campaign_id = $1
          ORDER BY created_at DESC
        `,
        params: [validatedCampaignId],
      });

      return result.rows.map((row) => mapProspectRow(row));
    },
    async updateProspect(input) {
      const values = validateUpdateProspectInput(input);
      const result = await client.query<Parameters<typeof mapProspectRow>[0]>({
        statement: `
          UPDATE prospects
          SET
            campaign_id = $3,
            full_name = $4,
            first_name = $5,
            last_name = $6,
            email = $7,
            title = $8,
            company_name = $9,
            company_domain = $10,
            company_website = $11,
            linkedin_url = $12,
            location = $13,
            source = $14,
            status = $15,
            metadata = $16,
            updated_at = NOW()
          WHERE id = $1
            AND workspace_id = $2
          RETURNING
            id,
            workspace_id,
            campaign_id,
            full_name,
            first_name,
            last_name,
            email,
            title,
            company_name,
            company_domain,
            company_website,
            linkedin_url,
            location,
            source,
            status,
            metadata,
            created_by_user_id,
            created_at,
            updated_at
        `,
        params: [
          values.prospectId,
          values.workspaceId,
          values.campaignId ?? null,
          values.contactName ?? values.fullName ?? null,
          values.firstName ?? null,
          values.lastName ?? null,
          values.email ?? null,
          values.title ?? null,
          values.companyName ?? null,
          values.companyDomain ?? null,
          values.companyWebsite ?? null,
          values.linkedinUrl ?? null,
          values.location ?? null,
          values.source ?? null,
          values.status,
          values.metadata,
        ],
      });

      return mapProspectRow(getFirstRowOrThrow(result.rows, "prospect"));
    },
    async deleteProspect(workspaceId, prospectId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedProspectId = validateProspectId(prospectId);
      await client.query({
        statement: `
          DELETE FROM prospects
          WHERE workspace_id = $1
            AND id = $2
        `,
        params: [validatedWorkspaceId, validatedProspectId],
      });
    },
  };
}
