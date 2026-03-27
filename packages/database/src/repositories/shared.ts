import { AppError } from "@ceg/core";
import {
  campaignIdSchema,
  createCampaignInputSchema,
  createProspectInputSchema,
  createAuditEventInputSchema,
  createResearchSnapshotInputSchema,
  createSenderProfileInputSchema,
  createUsageEventInputSchema,
  createWorkspaceInputSchema,
  prospectIdSchema,
  senderProfileIdSchema,
  sequenceIdSchema,
  updateCampaignInputSchema,
  updateProspectInputSchema,
  updateSenderProfileInputSchema,
  workspaceIdSchema,
  type Campaign,
  type CreateCampaignInput,
  type CreateProspectInput,
  type CreateAuditEventInput,
  type CreateResearchSnapshotInput,
  type CreateSenderProfileInput,
  type CreateUsageEventInput,
  type CreateWorkspaceInput,
  type Prospect,
  type Sequence,
  type ResearchSnapshot,
  type SenderProfile,
  type UsageEvent,
  type AuditEvent,
  type UpdateCampaignInput,
  type UpdateProspectInput,
  type UpdateSenderProfileInput,
  type Workspace,
  campaignSchema,
  prospectSchema,
  sequenceSchema,
  researchSnapshotSchema,
  senderProfileSchema,
  usageEventSchema,
  auditEventSchema,
  workspaceSchema,
} from "@ceg/validation";

export class RepositoryValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, {
      code: "REPOSITORY_VALIDATION_ERROR",
      cause,
    });
  }
}

export function validateWorkspaceId(workspaceId: string): string {
  return workspaceIdSchema.parse(workspaceId);
}

export function validateCampaignId(campaignId: string): string {
  return campaignIdSchema.parse(campaignId);
}

export function validateSenderProfileId(senderProfileId: string): string {
  return senderProfileIdSchema.parse(senderProfileId);
}

export function validateProspectId(prospectId: string): string {
  return prospectIdSchema.parse(prospectId);
}

export function validateSequenceId(sequenceId: string): string {
  return sequenceIdSchema.parse(sequenceId);
}

export function validateCreateWorkspaceInput(
  input: CreateWorkspaceInput,
): CreateWorkspaceInput {
  return createWorkspaceInputSchema.parse(input);
}

export function validateCreateSenderProfileInput(
  input: CreateSenderProfileInput,
): CreateSenderProfileInput {
  return createSenderProfileInputSchema.parse(input);
}

export function validateUpdateSenderProfileInput(
  input: UpdateSenderProfileInput,
): UpdateSenderProfileInput {
  return updateSenderProfileInputSchema.parse(input);
}

export function validateCreateCampaignInput(
  input: CreateCampaignInput,
): CreateCampaignInput {
  return createCampaignInputSchema.parse(input);
}

export function validateUpdateCampaignInput(
  input: UpdateCampaignInput,
): UpdateCampaignInput {
  return updateCampaignInputSchema.parse(input);
}

export function validateCreateProspectInput(
  input: CreateProspectInput,
): CreateProspectInput {
  return createProspectInputSchema.parse(input);
}

export function validateCreateResearchSnapshotInput(
  input: CreateResearchSnapshotInput,
): CreateResearchSnapshotInput {
  return createResearchSnapshotInputSchema.parse(input);
}

export function validateCreateUsageEventInput(
  input: CreateUsageEventInput,
): CreateUsageEventInput {
  return createUsageEventInputSchema.parse(input);
}

export function validateCreateAuditEventInput(
  input: CreateAuditEventInput,
): CreateAuditEventInput {
  return createAuditEventInputSchema.parse(input);
}

export function validateUpdateProspectInput(
  input: UpdateProspectInput,
): UpdateProspectInput {
  return updateProspectInputSchema.parse(input);
}

type WorkspaceRow = {
  id: string;
  slug: string;
  name: string;
  owner_user_id: string | null;
  status: Workspace["status"];
  settings: Workspace["settings"];
  created_at: Date | string;
  updated_at: Date | string;
};

type SenderProfileRow = {
  id: string;
  workspace_id: string;
  name: string;
  sender_type: SenderProfile["senderType"];
  company_name: string | null;
  company_website: string | null;
  product_description: string | null;
  target_customer: string | null;
  value_proposition: string | null;
  differentiation: string | null;
  proof_points: SenderProfile["proofPoints"];
  goals: SenderProfile["goals"];
  tone_preferences: SenderProfile["tonePreferences"];
  metadata: SenderProfile["metadata"];
  status: SenderProfile["status"];
  is_default: boolean;
  created_by_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type CampaignRow = {
  id: string;
  workspace_id: string;
  sender_profile_id: string | null;
  brand_voice_profile_id: string | null;
  name: string;
  description: string | null;
  objective: string | null;
  offer_summary: string | null;
  target_persona: string | null;
  status: Campaign["status"];
  settings: Campaign["settings"];
  created_by_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ProspectRow = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  company_name: string | null;
  company_domain: string | null;
  company_website: string | null;
  linkedin_url: string | null;
  location: string | null;
  source: string | null;
  status: Prospect["status"];
  metadata: Prospect["metadata"];
  created_by_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ResearchSnapshotRow = {
  id: string;
  workspace_id: string;
  prospect_id: string;
  source_url: string;
  source_type: "website" | "linkedin" | "manual";
  fetch_status: "captured" | "failed" | "stale";
  snapshot_hash: string | null;
  evidence: ResearchSnapshot["evidence"];
  structured_data: ResearchSnapshot["structuredData"];
  raw_capture: ResearchSnapshot["rawCapture"];
  captured_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
};

type SequenceRow = {
  id: string;
  workspace_id: string;
  campaign_id: string;
  prospect_id: string | null;
  sender_profile_id: string | null;
  brand_voice_profile_id: string | null;
  prompt_template_id: string | null;
  generation_mode: Sequence["generationMode"];
  channel: Sequence["channel"];
  status: Sequence["status"];
  content: Sequence["content"];
  model_metadata: Sequence["modelMetadata"];
  created_by_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type UsageEventRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  campaign_id: string | null;
  prospect_id: string | null;
  event_name: string;
  entity_type: string | null;
  entity_id: string | null;
  quantity: number;
  billable: boolean;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  metadata: UsageEvent["metadata"];
  occurred_at: Date | string;
  created_at: Date | string;
};

type AuditEventRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  actor_type: "user" | "system" | "api";
  action: string;
  entity_type: string;
  entity_id: string | null;
  request_id: string | null;
  changes: AuditEvent["changes"];
  metadata: AuditEvent["metadata"];
  created_at: Date | string;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function mapWorkspaceRow(row: WorkspaceRow): Workspace {
  return workspaceSchema.parse({
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerUserId: row.owner_user_id,
    status: row.status,
    settings: row.settings,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapSenderProfileRow(row: SenderProfileRow): SenderProfile {
  return senderProfileSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    senderType: row.sender_type,
    companyName: row.company_name,
    companyWebsite: row.company_website,
    productDescription: row.product_description,
    targetCustomer: row.target_customer,
    valueProposition: row.value_proposition,
    differentiation: row.differentiation,
    proofPoints: row.proof_points,
    goals: row.goals,
    tonePreferences: row.tone_preferences,
    metadata: row.metadata,
    status: row.status,
    isDefault: row.is_default,
    createdByUserId: row.created_by_user_id,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapCampaignRow(row: CampaignRow): Campaign {
  const settings = row.settings ?? {};
  const campaignPreferences: Record<string, unknown> =
    typeof settings === "object" && settings !== null
      ? (settings as Record<string, unknown>)
      : {};

  return campaignSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    senderProfileId: row.sender_profile_id,
    brandVoiceProfileId: row.brand_voice_profile_id,
    name: row.name,
    description: row.description,
    objective: row.objective,
    offerSummary: row.offer_summary,
    targetIcp:
      "targetIcp" in campaignPreferences
        ? campaignPreferences.targetIcp
        : row.target_persona,
    targetPersona: row.target_persona,
    targetIndustries:
      "targetIndustries" in campaignPreferences
        ? campaignPreferences.targetIndustries
        : [],
    tonePreferences:
      "tonePreferences" in campaignPreferences
        ? campaignPreferences.tonePreferences
        : {
            do: [],
            avoid: [],
          },
    frameworkPreferences:
      "frameworkPreferences" in campaignPreferences
        ? campaignPreferences.frameworkPreferences
        : [],
    status: row.status,
    settings,
    createdByUserId: row.created_by_user_id,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapProspectRow(row: ProspectRow): Prospect {
  return prospectSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id,
    contactName: row.full_name,
    fullName: row.full_name,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    title: row.title,
    companyName: row.company_name,
    companyDomain: row.company_domain,
    companyWebsite: row.company_website,
    linkedinUrl: row.linkedin_url,
    location: row.location,
    source: row.source,
    status: row.status,
    metadata: row.metadata,
    createdByUserId: row.created_by_user_id,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapResearchSnapshotRow(row: ResearchSnapshotRow): ResearchSnapshot {
  return researchSnapshotSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    prospectId: row.prospect_id,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    fetchStatus: row.fetch_status,
    snapshotHash: row.snapshot_hash,
    evidence: row.evidence,
    structuredData: row.structured_data,
    rawCapture: row.raw_capture,
    capturedAt: asDate(row.captured_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapSequenceRow(row: SequenceRow): Sequence {
  return sequenceSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id,
    prospectId: row.prospect_id,
    senderProfileId: row.sender_profile_id,
    brandVoiceProfileId: row.brand_voice_profile_id,
    promptTemplateId: row.prompt_template_id,
    generationMode: row.generation_mode,
    channel: row.channel,
    status: row.status,
    content: row.content,
    modelMetadata: row.model_metadata,
    createdByUserId: row.created_by_user_id,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapUsageEventRow(row: UsageEventRow): UsageEvent {
  return usageEventSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    campaignId: row.campaign_id,
    prospectId: row.prospect_id,
    eventName: row.event_name,
    entityType: row.entity_type,
    entityId: row.entity_id,
    quantity: row.quantity,
    billable: row.billable,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    costUsd: row.cost_usd,
    metadata: row.metadata,
    occurredAt: asDate(row.occurred_at),
    createdAt: asDate(row.created_at),
  });
}

export function mapAuditEventRow(row: AuditEventRow): AuditEvent {
  return auditEventSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    actorType: row.actor_type,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    requestId: row.request_id,
    changes: row.changes,
    metadata: row.metadata,
    createdAt: asDate(row.created_at),
  });
}

export function getFirstRowOrThrow<TRow>(
  rows: readonly TRow[],
  entityName: string,
): TRow {
  const row = rows[0];

  if (row === undefined) {
    throw new RepositoryValidationError(
      `Expected ${entityName} query to return a row.`,
    );
  }

  return row;
}
