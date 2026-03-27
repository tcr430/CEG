import {
  createInMemoryCampaignRepository,
  createInMemoryProspectRepository,
  type CampaignRepository,
  type ProspectRepository,
} from "@ceg/database";
import type {
  Campaign,
  CreateCampaignInput,
  CreateProspectInput,
  Prospect,
  UpdateCampaignInput,
  UpdateProspectInput,
} from "@ceg/validation";

import { getSenderProfileForWorkspace } from "./sender-profiles";

declare global {
  var __cegCampaignRepository: CampaignRepository | undefined;
  var __cegProspectRepository: ProspectRepository | undefined;
}

function getCampaignRepository(): CampaignRepository {
  if (globalThis.__cegCampaignRepository === undefined) {
    globalThis.__cegCampaignRepository = createInMemoryCampaignRepository();
  }

  return globalThis.__cegCampaignRepository;
}

function getProspectRepository(): ProspectRepository {
  if (globalThis.__cegProspectRepository === undefined) {
    globalThis.__cegProspectRepository = createInMemoryProspectRepository();
  }

  return globalThis.__cegProspectRepository;
}

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
  input: CreateCampaignInput,
): Promise<Campaign> {
  await assertSenderProfileAccess(input.workspaceId, input.senderProfileId);
  return getCampaignRepository().createCampaign(input);
}

export async function updateCampaignForWorkspace(
  input: UpdateCampaignInput,
): Promise<Campaign> {
  await assertSenderProfileAccess(input.workspaceId, input.senderProfileId);

  const existing = await getCampaignForWorkspace(input.workspaceId, input.campaignId);

  if (existing === null) {
    throw new Error("Campaign not found for workspace.");
  }

  return getCampaignRepository().updateCampaign(input);
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

  await Promise.all(prospects.map((prospect) => getProspectRepository().deleteProspect(prospect.id)));
  await getCampaignRepository().deleteCampaign(campaignId);
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
  input: CreateProspectInput,
): Promise<Prospect> {
  if (input.campaignId === undefined || input.campaignId === null) {
    throw new Error("Campaign id is required.");
  }

  const campaign = await getCampaignForWorkspace(input.workspaceId, input.campaignId);

  if (campaign === null) {
    throw new Error("Campaign not found for workspace.");
  }

  return getProspectRepository().createProspect(input);
}

export async function updateProspectForCampaign(
  input: UpdateProspectInput,
): Promise<Prospect> {
  if (input.campaignId === undefined || input.campaignId === null) {
    throw new Error("Campaign id is required.");
  }

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

  return getProspectRepository().updateProspect(input);
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

  await getProspectRepository().deleteProspect(prospectId);
}
