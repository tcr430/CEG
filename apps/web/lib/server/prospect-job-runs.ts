import "server-only";

import {
  beginAsyncOperationRun,
  buildProspectAsyncOperationsMetadata,
  completeAsyncOperationRun,
  failAsyncOperationRun,
  getAsyncOperationState,
  readProspectAsyncOperations,
  type AsyncOperationKind,
  type ProspectAsyncOperations,
} from "@ceg/jobs";
import type { Prospect } from "@ceg/validation";

import { getProspectForCampaign } from "./campaigns";
import { getProspectRepository } from "./database";

function toUpdateProspectInput(prospect: Prospect, metadata: Prospect["metadata"]) {
  return {
    prospectId: prospect.id,
    workspaceId: prospect.workspaceId,
    campaignId: prospect.campaignId ?? null,
    contactName: prospect.contactName ?? undefined,
    fullName: prospect.fullName ?? undefined,
    firstName: prospect.firstName ?? undefined,
    lastName: prospect.lastName ?? undefined,
    email: prospect.email ?? undefined,
    title: prospect.title ?? undefined,
    companyName: prospect.companyName ?? undefined,
    companyDomain: prospect.companyDomain ?? undefined,
    companyWebsite: prospect.companyWebsite ?? undefined,
    linkedinUrl: prospect.linkedinUrl ?? undefined,
    location: prospect.location ?? undefined,
    source: prospect.source ?? undefined,
    status: prospect.status,
    metadata,
  };
}

async function persistProspectAsyncOperations(input: {
  prospect: Prospect;
  operations: ProspectAsyncOperations;
}): Promise<Prospect> {
  const metadata = buildProspectAsyncOperationsMetadata({
    metadata: input.prospect.metadata,
    operations: input.operations,
  });

  return getProspectRepository().updateProspect(
    toUpdateProspectInput(input.prospect, metadata),
  );
}

export function listProspectAsyncOperations(prospect: Prospect) {
  const operations = readProspectAsyncOperations(prospect.metadata);

  return [
    getAsyncOperationState(operations, "prospect_research"),
    getAsyncOperationState(operations, "sequence_generation"),
    getAsyncOperationState(operations, "reply_analysis"),
    getAsyncOperationState(operations, "reply_drafting"),
  ];
}

export function readProspectAsyncOperation(
  prospect: Prospect,
  kind: AsyncOperationKind,
) {
  return getAsyncOperationState(readProspectAsyncOperations(prospect.metadata), kind);
}

export async function beginProspectAsyncOperation(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  kind: AsyncOperationKind;
  idempotencyKey: string;
  requestId?: string;
}): Promise<
  | { status: "started"; prospect: Prospect }
  | { status: "already_running"; prospect: Prospect }
> {
  const prospect = await getProspectForCampaign(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (prospect === null) {
    throw new Error("Prospect not found for workspace campaign.");
  }

  const beginResult = beginAsyncOperationRun({
    operations: readProspectAsyncOperations(prospect.metadata),
    kind: input.kind,
    requestId: input.requestId,
    idempotencyKey: input.idempotencyKey,
  });

  if (!beginResult.accepted) {
    return {
      status: "already_running",
      prospect,
    };
  }

  const updated = await persistProspectAsyncOperations({
    prospect,
    operations: beginResult.nextOperations,
  });

  return {
    status: "started",
    prospect: updated,
  };
}

export async function completeProspectAsyncOperation(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  kind: AsyncOperationKind;
  requestId?: string;
  resultSummary?: Record<string, unknown>;
}): Promise<Prospect> {
  const prospect = await getProspectForCampaign(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (prospect === null) {
    throw new Error("Prospect not found for workspace campaign.");
  }

  return persistProspectAsyncOperations({
    prospect,
    operations: completeAsyncOperationRun({
      operations: readProspectAsyncOperations(prospect.metadata),
      kind: input.kind,
      requestId: input.requestId,
      resultSummary: input.resultSummary,
    }),
  });
}

export async function failProspectAsyncOperation(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  kind: AsyncOperationKind;
  requestId?: string;
  errorSummary: string;
  resultSummary?: Record<string, unknown>;
}): Promise<Prospect> {
  const prospect = await getProspectForCampaign(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (prospect === null) {
    throw new Error("Prospect not found for workspace campaign.");
  }

  return persistProspectAsyncOperations({
    prospect,
    operations: failAsyncOperationRun({
      operations: readProspectAsyncOperations(prospect.metadata),
      kind: input.kind,
      requestId: input.requestId,
      errorSummary: input.errorSummary,
      resultSummary: input.resultSummary,
    }),
  });
}
