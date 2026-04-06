import type {
  CreateResearchSnapshotInput,
  ResearchSnapshot,
} from "@ceg/validation";

import type { DatabaseClient } from "../index.js";
import {
  getFirstRowOrThrow,
  mapResearchSnapshotRow,
  validateCreateResearchSnapshotInput,
  validateProspectId,
  validateWorkspaceId,
} from "./shared.js";

export type ResearchSnapshotRepository = {
  createResearchSnapshot(
    input: CreateResearchSnapshotInput,
  ): Promise<ResearchSnapshot>;
  listResearchSnapshotsByProspect(
    workspaceId: string,
    prospectId: string,
  ): Promise<ResearchSnapshot[]>;
  getLatestResearchSnapshotByProspect(
    workspaceId: string,
    prospectId: string,
  ): Promise<ResearchSnapshot | null>;
};

export function createResearchSnapshotRepository(
  client: DatabaseClient,
): ResearchSnapshotRepository {
  return {
    async createResearchSnapshot(input) {
      const values = validateCreateResearchSnapshotInput(input);
      const result = await client.query<Parameters<typeof mapResearchSnapshotRow>[0]>({
        statement: `
          INSERT INTO research_snapshots (
            workspace_id,
            prospect_id,
            source_url,
            source_type,
            fetch_status,
            snapshot_hash,
            evidence,
            structured_data,
            raw_capture
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING
            id,
            workspace_id,
            prospect_id,
            source_url,
            source_type,
            fetch_status,
            snapshot_hash,
            evidence,
            structured_data,
            raw_capture,
            captured_at,
            created_at,
            updated_at
        `,
        params: [
          values.workspaceId,
          values.prospectId,
          values.sourceUrl,
          values.sourceType,
          values.fetchStatus,
          values.snapshotHash ?? null,
          values.evidence,
          values.structuredData,
          values.rawCapture,
        ],
      });

      return mapResearchSnapshotRow(
        getFirstRowOrThrow(result.rows, "research snapshot"),
      );
    },
    async listResearchSnapshotsByProspect(workspaceId, prospectId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedProspectId = validateProspectId(prospectId);
      const result = await client.query<Parameters<typeof mapResearchSnapshotRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            prospect_id,
            source_url,
            source_type,
            fetch_status,
            snapshot_hash,
            evidence,
            structured_data,
            raw_capture,
            captured_at,
            created_at,
            updated_at
          FROM research_snapshots
          WHERE workspace_id = $1
            AND prospect_id = $2
          ORDER BY captured_at DESC
        `,
        params: [validatedWorkspaceId, validatedProspectId],
      });

      return result.rows.map((row) => mapResearchSnapshotRow(row));
    },
    async getLatestResearchSnapshotByProspect(workspaceId, prospectId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedProspectId = validateProspectId(prospectId);
      const result = await client.query<Parameters<typeof mapResearchSnapshotRow>[0]>({
        statement: `
          SELECT
            id,
            workspace_id,
            prospect_id,
            source_url,
            source_type,
            fetch_status,
            snapshot_hash,
            evidence,
            structured_data,
            raw_capture,
            captured_at,
            created_at,
            updated_at
          FROM research_snapshots
          WHERE workspace_id = $1
            AND prospect_id = $2
          ORDER BY captured_at DESC
          LIMIT 1
        `,
        params: [validatedWorkspaceId, validatedProspectId],
      });

      const row = result.rows[0];
      return row === undefined ? null : mapResearchSnapshotRow(row);
    },
  };
}
