import type {
  Campaign,
  CreateCampaignInput,
  CreateProspectInput,
  Prospect,
  UpdateCampaignInput,
  UpdateProspectInput,
} from "@ceg/validation";

import { getSharedAuditEventRepository } from "./audit-events";
import { getCampaignRepository, getProspectRepository } from "./database";
import { createOperationContext } from "./observability";
import { trackProductAnalyticsEvent } from "./product-analytics";
import { getSenderProfileForWorkspace } from "./sender-profiles";

type CampaignMutationContext = {
  userId?: string;
  requestId?: string;
};

async function assertSenderProfileAccess(
  workspaceId: string,
  senderProfileId?: string | null,
): Promise<void> {
  if (senderProfileId === undefined || senderProfileId === null) {
    return;
  }

  const profile = await getSenderProfileForWorkspace(workspaceId, senderProfileId);

  if (profile === null) {
    throw new Error("Sender profile not found for workspace.");
  }
}

export async function listCampaignsForWorkspace(
  workspaceId: string,
): Promise<Campaign[]> {
  return getCampaignRepository().listCampaignsByWorkspace(workspaceId);
}

export async function getCampaignForWorkspace(
  workspaceId: string,
  campaignId: string,
): Promise<Campaign | null> {
  const campaign = await getCampaignRepository().getCampaignById(campaignId);

  if (campaign === null || campaign.workspaceId !== workspaceId) {
    return null;
  }

  return campaign;
}

export async function createCampaignForWorkspace(
  input: CreateCampaignInput & CampaignMutationContext,
): Promise<Campaign> {
  const operation = createOperationContext({
    operation: "campaign.create",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? input.createdByUserId ?? null,
  });

  await assertSenderProfileAccess(input.workspaceId, input.senderProfileId);
  const created = await getCampaignRepository().createCampaign(input);

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId ?? input.createdByUserId ?? null,
    actorType: input.userId ? "user" : "system",
    action: "campaign.created",
    entityType: "campaign",
    entityId: created.id,
    requestId: operation.requestId,
    changes: {
      status: created.status,
      senderProfileId: created.senderProfileId ?? null,
    },
    metadata: {
      campaignName: created.name,
    },
  });

  operation.logger.info("Campaign created", {
    campaignId: created.id,
    status: created.status,
    senderProfileAttached: created.senderProfileId !== null,
  });

  await trackProductAnalyticsEvent({
    event: "campaign_created",
    workspaceId: input.workspaceId,
    userId: input.userId ?? input.createdByUserId ?? null,
    entityType: "campaign",
    entityId: created.id,
    requestId: operation.requestId,
    metadata: {
      status: created.status,
      senderProfileAttached: created.senderProfileId !== null,
    },
  });

  return created;
}

export async function updateCampaignForWorkspace(
  input: UpdateCampaignInput & CampaignMutationContext,
): Promise<Campaign> {
  const operation = createOperationContext({
    operation: "campaign.update",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId,
  });

  await assertSenderProfileAccess(input.workspaceId, input.senderProfileId);

  const existing = await getCampaignForWorkspace(input.workspaceId, input.campaignId);

  if (existing === null) {
    throw new Error("Campaign not found for workspace.");
  }

  const updated = await getCampaignRepository().updateCampaign(input);

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    actorType: input.userId ? "user" : "system",
    action: "campaign.updated",
    entityType: "campaign",
    entityId: updated.id,
    requestId: operation.requestId,
    changes: {
      previousStatus: existing.status,
      nextStatus: updated.status,
      previousSenderProfileId: existing.senderProfileId ?? null,
      nextSenderProfileId: updated.senderProfileId ?? null,
    },
    metadata: {
      campaignName: updated.name,
    },
  });

  operation.logger.info("Campaign updated", {
    campaignId: updated.id,
    status: updated.status,
    senderProfileAttached: updated.senderProfileId !== null,
  });

  return updated;
}

export async function deleteCampaignForWorkspace(
  workspaceId: string,
  campaignId: string,
): Promise<void> {
  const existing = await getCampaignForWorkspace(workspaceId, campaignId);

  if (existing === null) {
    throw new Error("Campaign not found for workspace.");
  }

  const prospects = await getProspectRepository().listProspectsByCampaign(campaignId);

  await Promise.all(
    prospects.map((prospect) =>
      getProspectRepository().deleteProspect(workspaceId, prospect.id),
    ),
  );
  await getCampaignRepository().deleteCampaign(workspaceId, campaignId);
}

export async function listProspectsForCampaign(
  workspaceId: string,
  campaignId: string,
): Promise<Prospect[]> {
  const campaign = await getCampaignForWorkspace(workspaceId, campaignId);

  if (campaign === null) {
    throw new Error("Campaign not found for workspace.");
  }

  return getProspectRepository().listProspectsByCampaign(campaignId);
}

export async function getProspectForCampaign(
  workspaceId: string,
  campaignId: string,
  prospectId: string,
): Promise<Prospect | null> {
  const campaign = await getCampaignForWorkspace(workspaceId, campaignId);

  if (campaign === null) {
    return null;
  }

  const prospect = await getProspectRepository().getProspectById(prospectId);

  if (
    prospect === null ||
    prospect.workspaceId !== workspaceId ||
    prospect.campaignId !== campaignId
  ) {
    return null;
  }

  return prospect;
}

export async function createProspectForCampaign(
  input: CreateProspectInput & CampaignMutationContext,
): Promise<Prospect> {
  if (input.campaignId === undefined || input.campaignId === null) {
    throw new Error("Campaign id is required.");
  }

  const operation = createOperationContext({
    operation: "prospect.create",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? input.createdByUserId ?? null,
    campaignId: input.campaignId,
  });

  const campaign = await getCampaignForWorkspace(input.workspaceId, input.campaignId);

  if (campaign === null) {
    throw new Error("Campaign not found for workspace.");
  }

  const created = await getProspectRepository().createProspect(input);

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId ?? input.createdByUserId ?? null,
    actorType: input.userId ? "user" : "system",
    action: "prospect.created",
    entityType: "prospect",
    entityId: created.id,
    requestId: operation.requestId,
    changes: {
      status: created.status,
      campaignId: created.campaignId ?? null,
    },
    metadata: {
      companyName: created.companyName ?? null,
      companyWebsite: created.companyWebsite ?? null,
    },
  });

  operation.logger.info("Prospect created", {
    prospectId: created.id,
    campaignId: created.campaignId ?? null,
    status: created.status,
  });

  await trackProductAnalyticsEvent({
    event: "prospect_created",
    workspaceId: input.workspaceId,
    userId: input.userId ?? input.createdByUserId ?? null,
    campaignId: input.campaignId,
    prospectId: created.id,
    entityType: "prospect",
    entityId: created.id,
    requestId: operation.requestId,
    metadata: {
      status: created.status,
    },
  });

  return created;
}

export async function updateProspectForCampaign(
  input: UpdateProspectInput & CampaignMutationContext,
): Promise<Prospect> {
  if (input.campaignId === undefined || input.campaignId === null) {
    throw new Error("Campaign id is required.");
  }

  const operation = createOperationContext({
    operation: "prospect.update",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
  });

  const campaign = await getCampaignForWorkspace(input.workspaceId, input.campaignId);

  if (campaign === null) {
    throw new Error("Campaign not found for workspace.");
  }

  const existing = await getProspectForCampaign(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (existing === null) {
    throw new Error("Prospect not found for workspace campaign.");
  }

  const updated = await getProspectRepository().updateProspect(input);

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    actorType: input.userId ? "user" : "system",
    action: "prospect.updated",
    entityType: "prospect",
    entityId: updated.id,
    requestId: operation.requestId,
    changes: {
      previousStatus: existing.status,
      nextStatus: updated.status,
      previousWebsite: existing.companyWebsite ?? null,
      nextWebsite: updated.companyWebsite ?? null,
    },
    metadata: {
      companyName: updated.companyName ?? null,
    },
  });

  operation.logger.info("Prospect updated", {
    prospectId: updated.id,
    campaignId: updated.campaignId ?? null,
    status: updated.status,
  });

  return updated;
}

export async function deleteProspectForCampaign(
  workspaceId: string,
  campaignId: string,
  prospectId: string,
): Promise<void> {
  const existing = await getProspectForCampaign(workspaceId, campaignId, prospectId);

  if (existing === null) {
    throw new Error("Prospect not found for workspace campaign.");
  }

  await getProspectRepository().deleteProspect(workspaceId, prospectId);
}



