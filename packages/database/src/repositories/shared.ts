import { AppError } from "@ceg/core";
import {
  campaignIdSchema,
  createCampaignInputSchema,
  createProspectInputSchema,
  createAuditEventInputSchema,
  createResearchSnapshotInputSchema,
  createInboxAccountInputSchema,
  createInboxSyncRunInputSchema,
  createSenderProfileInputSchema,
  createUsageEventInputSchema,
  completeInboxSyncRunInputSchema,
  upsertUserInputSchema,
  upsertImportedMessageRefInputSchema,
  upsertImportedThreadRefInputSchema,
  upsertWorkspaceMemberInputSchema,
  createWorkspaceRecordInputSchema,
  createWorkspaceInputSchema,
  conversationThreadIdSchema,
  importedThreadRefIdSchema,
  importedMessageRefIdSchema,
  inboxAccountIdSchema,
  inboxSyncRunIdSchema,
  prospectIdSchema,
  messageIdSchema,
  senderProfileIdSchema,
  sequenceIdSchema,
  updateInboxAccountSyncStateInputSchema,
  updateCampaignInputSchema,
  updateProspectInputSchema,
  updateSenderProfileInputSchema,
  updateWorkspaceSettingsInputSchema,
  updateWorkspaceProfileInputSchema,
  workspaceIdSchema,
  inviteWorkspaceMemberInputSchema,
  removeWorkspaceMemberInputSchema,
  type Campaign,
  type ConversationThread,
  type CreateCampaignInput,
  type CreateProspectInput,
  type CreateAuditEventInput,
  type CreateResearchSnapshotInput,
  type CreateInboxAccountInput,
  type CreateInboxSyncRunInput,
  type CreateSenderProfileInput,
  type CreateUsageEventInput,
  type CreateWorkspaceRecordInput,
  type CreateWorkspaceInput,
  type DraftReply,
  type ImportedMessageRef,
  type ImportedThreadRef,
  type InboxAccount,
  type InboxSyncRun,
  type Message,
  type Prospect,
  type ReplyAnalysis,
  type Sequence,
  type ResearchSnapshot,
  type SenderProfile,
  type UsageEvent,
  type AuditEvent,
  type User,
  type UpdateCampaignInput,
  type UpdateWorkspaceMemberRoleInput,
  type UpdateInboxAccountSyncStateInput,
  type UpdateProspectInput,
  type InviteWorkspaceMemberInput,
  type RemoveWorkspaceMemberInput,
  type UpdateWorkspaceProfileInput,
  type UpdateSenderProfileInput,
  type UpdateWorkspaceSettingsInput,
  type WorkspaceMember,
  type Workspace,
  type CompleteInboxSyncRunInput,
  campaignSchema,
  workspaceMemberSchema,
  conversationThreadSchema,
  draftReplySchema,
  importedMessageRefSchema,
  importedThreadRefSchema,
  inboxAccountSchema,
  inboxSyncRunSchema,
  messageSchema,
  prospectSchema,
  replyAnalysisSchema,
  sequenceSchema,
  researchSnapshotSchema,
  senderProfileSchema,
  subscriptionSchema,
  userSchema,
  usageEventSchema,
  auditEventSchema,
  workspaceSchema,
  upsertSubscriptionInputSchema,
  type Subscription,
  type UpsertSubscriptionInput,
  type UpsertImportedMessageRefInput,
  type UpsertImportedThreadRefInput,
  type UpsertUserInput,
  type UpsertWorkspaceMemberInput,
  updateWorkspaceMemberRoleInputSchema,
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

export function validateConversationThreadId(threadId: string): string {
  return conversationThreadIdSchema.parse(threadId);
}

export function validateMessageId(messageId: string): string {
  return messageIdSchema.parse(messageId);
}

export function validateSequenceId(sequenceId: string): string {
  return sequenceIdSchema.parse(sequenceId);
}

export function validateInboxAccountId(inboxAccountId: string): string {
  return inboxAccountIdSchema.parse(inboxAccountId);
}

export function validateInboxSyncRunId(inboxSyncRunId: string): string {
  return inboxSyncRunIdSchema.parse(inboxSyncRunId);
}

export function validateImportedThreadRefId(importedThreadRefId: string): string {
  return importedThreadRefIdSchema.parse(importedThreadRefId);
}

export function validateImportedMessageRefId(
  importedMessageRefId: string,
): string {
  return importedMessageRefIdSchema.parse(importedMessageRefId);
}

export function validateCreateWorkspaceInput(
  input: CreateWorkspaceInput,
): CreateWorkspaceInput {
  return createWorkspaceInputSchema.parse(input);
}

export function validateCreateWorkspaceRecordInput(
  input: CreateWorkspaceRecordInput,
): CreateWorkspaceRecordInput {
  return createWorkspaceRecordInputSchema.parse(input);
}

export function validateUpsertUserInput(input: UpsertUserInput): UpsertUserInput {
  return upsertUserInputSchema.parse(input);
}

export function validateUpsertWorkspaceMemberInput(
  input: UpsertWorkspaceMemberInput,
): UpsertWorkspaceMemberInput {
  return upsertWorkspaceMemberInputSchema.parse(input);
}

export function validateUpdateWorkspaceSettingsInput(
  input: UpdateWorkspaceSettingsInput,
): UpdateWorkspaceSettingsInput {
  return updateWorkspaceSettingsInputSchema.parse(input);
}

export function validateUpdateWorkspaceProfileInput(
  input: UpdateWorkspaceProfileInput,
): UpdateWorkspaceProfileInput {
  return updateWorkspaceProfileInputSchema.parse(input);
}

export function validateInviteWorkspaceMemberInput(
  input: InviteWorkspaceMemberInput,
): InviteWorkspaceMemberInput {
  return inviteWorkspaceMemberInputSchema.parse(input);
}

export function validateUpdateWorkspaceMemberRoleInput(
  input: UpdateWorkspaceMemberRoleInput,
): UpdateWorkspaceMemberRoleInput {
  return updateWorkspaceMemberRoleInputSchema.parse(input);
}

export function validateRemoveWorkspaceMemberInput(
  input: RemoveWorkspaceMemberInput,
): RemoveWorkspaceMemberInput {
  return removeWorkspaceMemberInputSchema.parse(input);
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

export function validateCreateInboxAccountInput(
  input: CreateInboxAccountInput,
): CreateInboxAccountInput {
  return createInboxAccountInputSchema.parse(input);
}

export function validateUpdateInboxAccountSyncStateInput(
  input: UpdateInboxAccountSyncStateInput,
): UpdateInboxAccountSyncStateInput {
  return updateInboxAccountSyncStateInputSchema.parse(input);
}

export function validateCreateInboxSyncRunInput(
  input: CreateInboxSyncRunInput,
): CreateInboxSyncRunInput {
  return createInboxSyncRunInputSchema.parse(input);
}

export function validateCompleteInboxSyncRunInput(
  input: CompleteInboxSyncRunInput,
): CompleteInboxSyncRunInput {
  return completeInboxSyncRunInputSchema.parse(input);
}

export function validateUpsertImportedThreadRefInput(
  input: UpsertImportedThreadRefInput,
): UpsertImportedThreadRefInput {
  return upsertImportedThreadRefInputSchema.parse(input);
}

export function validateUpsertImportedMessageRefInput(
  input: UpsertImportedMessageRefInput,
): UpsertImportedMessageRefInput {
  return upsertImportedMessageRefInputSchema.parse(input);
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

export function validateUpsertSubscriptionInput(
  input: UpsertSubscriptionInput,
): UpsertSubscriptionInput {
  return upsertSubscriptionInputSchema.parse(input);
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

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  auth_provider: string | null;
  auth_provider_subject: string | null;
  status: User["status"];
  created_at: Date | string;
  updated_at: Date | string;
};

type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMember["role"];
  status: WorkspaceMember["status"];
  invited_by_user_id: string | null;
  joined_at: Date | string | null;
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
  quality_checks_json: Sequence["qualityChecksJson"];
  model_metadata: Sequence["modelMetadata"];
  created_by_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ConversationThreadRow = {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  prospect_id: string | null;
  status: ConversationThread["status"];
  external_thread_ref: string | null;
  latest_message_at: Date | string | null;
  metadata: ConversationThread["metadata"];
  created_at: Date | string;
  updated_at: Date | string;
};

type MessageRow = {
  id: string;
  workspace_id: string;
  thread_id: string;
  campaign_id: string | null;
  prospect_id: string | null;
  sequence_id: string | null;
  reply_to_message_id: string | null;
  direction: Message["direction"];
  message_kind: Message["messageKind"];
  status: Message["status"];
  provider_message_id: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  metadata: Message["metadata"];
  sent_at: Date | string | null;
  received_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ReplyAnalysisRow = {
  id: string;
  workspace_id: string;
  thread_id: string;
  message_id: string;
  prompt_template_id: string | null;
  classification: ReplyAnalysis["classification"];
  sentiment: ReplyAnalysis["sentiment"];
  urgency: ReplyAnalysis["urgency"];
  intent: string | null;
  confidence: number | null;
  structured_output: ReplyAnalysis["structuredOutput"];
  model_metadata: ReplyAnalysis["modelMetadata"];
  analyzed_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
};

type DraftReplyRow = {
  id: string;
  workspace_id: string;
  thread_id: string;
  message_id: string | null;
  reply_analysis_id: string | null;
  sender_profile_id: string | null;
  prompt_template_id: string | null;
  status: DraftReply["status"];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  structured_output: DraftReply["structuredOutput"];
  quality_checks_json: DraftReply["qualityChecksJson"];
  model_metadata: DraftReply["modelMetadata"];
  created_by_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type SubscriptionRow = {
  id: string;
  workspace_id: string;
  provider: Subscription["provider"];
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  plan_code: Subscription["planCode"];
  status: Subscription["status"];
  seats: number;
  billing_email: string | null;
  current_period_start: Date | string | null;
  current_period_end: Date | string | null;
  cancel_at_period_end: boolean;
  metadata: Subscription["metadata"];
  created_at: Date | string;
  updated_at: Date | string;
};

type InboxAccountRow = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  provider: InboxAccount["provider"];
  email_address: string;
  display_name: string | null;
  provider_account_ref: string;
  status: InboxAccount["status"];
  sync_state: InboxAccount["syncState"];
  metadata: InboxAccount["metadata"];
  last_synced_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type InboxSyncRunRow = {
  id: string;
  workspace_id: string;
  inbox_account_id: string;
  provider: InboxSyncRun["provider"];
  status: InboxSyncRun["status"];
  sync_mode: InboxSyncRun["syncMode"];
  cursor_before: string | null;
  cursor_after: string | null;
  imported_thread_count: number;
  imported_message_count: number;
  started_at: Date | string;
  finished_at: Date | string | null;
  error_summary: string | null;
  metadata: InboxSyncRun["metadata"];
  created_at: Date | string;
  updated_at: Date | string;
};

type ImportedThreadRefRow = {
  id: string;
  workspace_id: string;
  inbox_account_id: string;
  prospect_id: string | null;
  conversation_thread_id: string | null;
  provider: ImportedThreadRef["provider"];
  provider_thread_id: string;
  provider_folder: string | null;
  subject: string | null;
  participants: ImportedThreadRef["participants"];
  snippet: string | null;
  last_message_received_at: Date | string | null;
  sync_state: ImportedThreadRef["syncState"];
  metadata: ImportedThreadRef["metadata"];
  created_at: Date | string;
  updated_at: Date | string;
};

type ImportedMessageRefRow = {
  id: string;
  workspace_id: string;
  inbox_account_id: string;
  imported_thread_ref_id: string;
  message_id: string | null;
  provider: ImportedMessageRef["provider"];
  provider_message_id: string;
  provider_thread_id: string;
  direction: ImportedMessageRef["direction"];
  provider_message_type: ImportedMessageRef["providerMessageType"];
  message_role: ImportedMessageRef["messageRole"];
  reply_to_provider_message_id: string | null;
  subject: string | null;
  from_address: string | null;
  to_addresses: ImportedMessageRef["toAddresses"];
  cc_addresses: ImportedMessageRef["ccAddresses"];
  bcc_addresses: ImportedMessageRef["bccAddresses"];
  raw_body_text: string | null;
  raw_body_html: string | null;
  normalized_body_text: string | null;
  normalized_body_html: string | null;
  sync_state: ImportedMessageRef["syncState"];
  metadata: ImportedMessageRef["metadata"];
  sent_at: Date | string | null;
  received_at: Date | string | null;
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

export function mapUserRow(row: UserRow): User {
  return userSchema.parse({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    authProvider: row.auth_provider,
    authProviderSubject: row.auth_provider_subject,
    status: row.status,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapWorkspaceMemberRow(row: WorkspaceMemberRow): WorkspaceMember {
  return workspaceMemberSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    invitedByUserId: row.invited_by_user_id,
    joinedAt: row.joined_at === null ? null : asDate(row.joined_at),
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
    qualityChecksJson: row.quality_checks_json,
    modelMetadata: row.model_metadata,
    createdByUserId: row.created_by_user_id,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapConversationThreadRow(
  row: ConversationThreadRow,
): ConversationThread {
  return conversationThreadSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id,
    prospectId: row.prospect_id,
    status: row.status,
    externalThreadRef: row.external_thread_ref,
    latestMessageAt:
      row.latest_message_at === null ? null : asDate(row.latest_message_at),
    metadata: row.metadata,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapMessageRow(row: MessageRow): Message {
  return messageSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    threadId: row.thread_id,
    campaignId: row.campaign_id,
    prospectId: row.prospect_id,
    sequenceId: row.sequence_id,
    replyToMessageId: row.reply_to_message_id,
    direction: row.direction,
    messageKind: row.message_kind,
    status: row.status,
    providerMessageId: row.provider_message_id,
    subject: row.subject,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    metadata: row.metadata,
    sentAt: row.sent_at === null ? null : asDate(row.sent_at),
    receivedAt: row.received_at === null ? null : asDate(row.received_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapReplyAnalysisRow(row: ReplyAnalysisRow): ReplyAnalysis {
  return replyAnalysisSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    threadId: row.thread_id,
    messageId: row.message_id,
    promptTemplateId: row.prompt_template_id,
    classification: row.classification,
    sentiment: row.sentiment,
    urgency: row.urgency,
    intent: row.intent,
    confidence: row.confidence,
    structuredOutput: row.structured_output,
    modelMetadata: row.model_metadata,
    analyzedAt: asDate(row.analyzed_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapDraftReplyRow(row: DraftReplyRow): DraftReply {
  return draftReplySchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    threadId: row.thread_id,
    messageId: row.message_id,
    replyAnalysisId: row.reply_analysis_id,
    senderProfileId: row.sender_profile_id,
    promptTemplateId: row.prompt_template_id,
    status: row.status,
    subject: row.subject,
    bodyText: row.body_text,
    bodyHtml: row.body_html,
    structuredOutput: row.structured_output,
    qualityChecksJson: row.quality_checks_json,
    modelMetadata: row.model_metadata,
    createdByUserId: row.created_by_user_id,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapSubscriptionRow(row: SubscriptionRow): Subscription {
  return subscriptionSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    planCode: row.plan_code,
    status: row.status,
    seats: row.seats,
    billingEmail: row.billing_email,
    currentPeriodStart:
      row.current_period_start === null ? null : asDate(row.current_period_start),
    currentPeriodEnd:
      row.current_period_end === null ? null : asDate(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end,
    metadata: row.metadata,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapInboxAccountRow(row: InboxAccountRow): InboxAccount {
  return inboxAccountSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    provider: row.provider,
    emailAddress: row.email_address,
    displayName: row.display_name,
    providerAccountRef: row.provider_account_ref,
    status: row.status,
    syncState: row.sync_state,
    metadata: row.metadata,
    lastSyncedAt:
      row.last_synced_at === null ? null : asDate(row.last_synced_at),
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapInboxSyncRunRow(row: InboxSyncRunRow): InboxSyncRun {
  return inboxSyncRunSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    inboxAccountId: row.inbox_account_id,
    provider: row.provider,
    status: row.status,
    syncMode: row.sync_mode,
    cursorBefore: row.cursor_before,
    cursorAfter: row.cursor_after,
    importedThreadCount: row.imported_thread_count,
    importedMessageCount: row.imported_message_count,
    startedAt: asDate(row.started_at),
    finishedAt: row.finished_at === null ? null : asDate(row.finished_at),
    errorSummary: row.error_summary,
    metadata: row.metadata,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapImportedThreadRefRow(
  row: ImportedThreadRefRow,
): ImportedThreadRef {
  return importedThreadRefSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    inboxAccountId: row.inbox_account_id,
    prospectId: row.prospect_id,
    conversationThreadId: row.conversation_thread_id,
    provider: row.provider,
    providerThreadId: row.provider_thread_id,
    providerFolder: row.provider_folder,
    subject: row.subject,
    participants: row.participants,
    snippet: row.snippet,
    lastMessageReceivedAt:
      row.last_message_received_at === null
        ? null
        : asDate(row.last_message_received_at),
    syncState: row.sync_state,
    metadata: row.metadata,
    createdAt: asDate(row.created_at),
    updatedAt: asDate(row.updated_at),
  });
}

export function mapImportedMessageRefRow(
  row: ImportedMessageRefRow,
): ImportedMessageRef {
  return importedMessageRefSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    inboxAccountId: row.inbox_account_id,
    importedThreadRefId: row.imported_thread_ref_id,
    messageId: row.message_id,
    provider: row.provider,
    providerMessageId: row.provider_message_id,
    providerThreadId: row.provider_thread_id,
    direction: row.direction,
    providerMessageType: row.provider_message_type,
    messageRole: row.message_role,
    replyToProviderMessageId: row.reply_to_provider_message_id,
    subject: row.subject,
    fromAddress: row.from_address,
    toAddresses: row.to_addresses,
    ccAddresses: row.cc_addresses,
    bccAddresses: row.bcc_addresses,
    rawBodyText: row.raw_body_text,
    rawBodyHtml: row.raw_body_html,
    normalizedBodyText: row.normalized_body_text,
    normalizedBodyHtml: row.normalized_body_html,
    syncState: row.sync_state,
    metadata: row.metadata,
    sentAt: row.sent_at === null ? null : asDate(row.sent_at),
    receivedAt: row.received_at === null ? null : asDate(row.received_at),
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
