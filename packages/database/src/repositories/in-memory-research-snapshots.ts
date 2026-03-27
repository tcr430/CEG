import { createHash, randomUUID } from "node:crypto";

import type {
  CreateResearchSnapshotInput,
  ResearchSnapshot,
} from "@ceg/validation";

import type { ResearchSnapshotRepository } from "./research-snapshots.js";
import {
  validateCreateResearchSnapshotInput,
  validateProspectId,
  validateWorkspaceId,
} from "./shared.js";

function buildSnapshotHash(input: CreateResearchSnapshotInput): string {
  return createHash("sha256")
    .update(JSON.stringify(input.structuredData))
    .digest("hex");
}

export function createInMemoryResearchSnapshotRepository(
  initialSnapshots: ResearchSnapshot[] = [],
): ResearchSnapshotRepository {
  const records = new Map(
    initialSnapshots.map((snapshot) => [snapshot.id, snapshot] as const),
  );

  return {
    async createResearchSnapshot(input) {
      const values = validateCreateResearchSnapshotInput(input);
      const now = new Date();
      const record: ResearchSnapshot = {
        id: randomUUID(),
        workspaceId: values.workspaceId,
        prospectId: values.prospectId,
        sourceUrl: values.sourceUrl,
        sourceType: values.sourceType,
        fetchStatus: values.fetchStatus,
        snapshotHash: values.snapshotHash ?? buildSnapshotHash(values),
        evidence: values.evidence,
        structuredData: values.structuredData,
        rawCapture: values.rawCapture,
        capturedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async listResearchSnapshotsByProspect(prospectId) {
      const validatedProspectId = validateProspectId(prospectId);
      return [...records.values()]
        .filter((snapshot) => snapshot.prospectId === validatedProspectId)
        .sort(
          (left, right) => right.capturedAt.getTime() - left.capturedAt.getTime(),
        );
    },
    async getLatestResearchSnapshotByProspect(workspaceId, prospectId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      const validatedProspectId = validateProspectId(prospectId);
      const snapshots = [...records.values()]
        .filter(
          (snapshot) =>
            snapshot.workspaceId === validatedWorkspaceId &&
            snapshot.prospectId === validatedProspectId,
        )
        .sort(
          (left, right) => right.capturedAt.getTime() - left.capturedAt.getTime(),
        );

      return snapshots[0] ?? null;
    },
  };
}
