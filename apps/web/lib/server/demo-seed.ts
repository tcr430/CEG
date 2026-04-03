import { randomUUID } from "node:crypto";

import {
  createInMemoryDraftReplyRepository,
  createInMemoryReplyAnalysisRepository,
  createInMemoryResearchSnapshotRepository,
  createInMemorySequenceRepository,
  type DraftReplyRepository,
  type ReplyAnalysisRepository,
  type ResearchSnapshotRepository,
  type SequenceRepository,
} from "@ceg/database";
import {
  replyAnalysisOutputSchema,
  responseStrategyRecommendationOutputSchema,
} from "@ceg/reply-engine";
import { compiledSequenceOutputSchema } from "@ceg/sequence-engine";
import {
  draftReplyOutputSchema,
  draftReplyQualityReportSchema,
  sequenceQualityReportSchema,
} from "@ceg/validation";

import {
  demoCampaigns,
  demoProspects,
  demoReplyThreads,
  demoResearchSnapshots,
  demoSeedSummary,
  demoSeedVersion,
  demoSenderProfiles,
  demoSequences,
} from "../../../../infrastructure/demo-data/fixtures";
import {
  isDemoSeedEnabled,
  readDemoSeedLoadedAt,
  readDemoSeedVersion,
} from "../demo-seed-config";
import { getSharedAuditEventRepository } from "./audit-events";
import { createCampaignForWorkspace, createProspectForCampaign, updateProspectForCampaign } from "./campaigns";
import { createOperationContext } from "./observability";
import {
  appendLatestSequenceMessagesToProspectThread,
  createInboundReplyForProspect,
  getReplyThreadStateForProspect,
} from "./replies";
import { createSenderProfileForWorkspace } from "./sender-profiles";
import { getSharedUsageEventRepository } from "./usage-events";
import { getWorkspaceRecordById, updateWorkspaceSettings } from "./workspaces";

declare global {
  var __cegResearchSnapshotRepository: ResearchSnapshotRepository | undefined;
  var __cegSequenceRepository: SequenceRepository | undefined;
  var __cegReplyAnalysisRepository: ReplyAnalysisRepository | undefined;
  var __cegDraftReplyRepository: DraftReplyRepository | undefined;
}

export type DemoSeedWorkspaceStatus = {
  enabled: boolean;
  version: string | null;
  loadedAt: string | null;
  matchesCurrentVersion: boolean;
};

export type DemoSeedResult = {
  status: "seeded" | "already_seeded";
  version: string;
  loadedAt: string;
  summary: typeof demoSeedSummary;
};

function getResearchSnapshotRepository(): ResearchSnapshotRepository {
  if (globalThis.__cegResearchSnapshotRepository === undefined) {
    globalThis.__cegResearchSnapshotRepository = createInMemoryResearchSnapshotRepository();
  }

  return globalThis.__cegResearchSnapshotRepository;
}

function getSequenceRepository(): SequenceRepository {
  if (globalThis.__cegSequenceRepository === undefined) {
    globalThis.__cegSequenceRepository = createInMemorySequenceRepository();
  }

  return globalThis.__cegSequenceRepository;
}

function getReplyAnalysisRepository(): ReplyAnalysisRepository {
  if (globalThis.__cegReplyAnalysisRepository === undefined) {
    globalThis.__cegReplyAnalysisRepository = createInMemoryReplyAnalysisRepository();
  }

  return globalThis.__cegReplyAnalysisRepository;
}

function getDraftReplyRepository(): DraftReplyRepository {
  if (globalThis.__cegDraftReplyRepository === undefined) {
    globalThis.__cegDraftReplyRepository = createInMemoryDraftReplyRepository();
  }

  return globalThis.__cegDraftReplyRepository;
}

type Mutable<T> =
  T extends readonly (infer U)[]
    ? Mutable<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: Mutable<T[K]> }
      : T;

function cloneForSeed<T>(value: T): Mutable<T> {
  return structuredClone(value) as Mutable<T>;
}

function assertDemoSeedEnabled() {
  if (!isDemoSeedEnabled({})) {
    throw new Error("Demo seeding is disabled. Set DEMO_SEED_ENABLED=true in local development.");
  }
}

export async function getWorkspaceDemoSeedStatus(workspaceId: string): Promise<DemoSeedWorkspaceStatus> {
  const workspace = await getWorkspaceRecordById(workspaceId);
  const version = workspace ? readDemoSeedVersion(workspace.settings) : null;
  const loadedAt = workspace ? readDemoSeedLoadedAt(workspace.settings) : null;

  return {
    enabled: isDemoSeedEnabled({}),
    version,
    loadedAt,
    matchesCurrentVersion: version === demoSeedVersion,
  };
}
export async function seedWorkspaceDemoData(input: {
  workspaceId: string;
  userId?: string | null;
  workspacePlanCode?: string | null;
  requestId?: string;
}): Promise<DemoSeedResult> {
  assertDemoSeedEnabled();

  const workspace = await getWorkspaceRecordById(input.workspaceId);

  if (workspace === null) {
    throw new Error("Workspace not found.");
  }

  const existingVersion = readDemoSeedVersion(workspace.settings);
  const existingLoadedAt = readDemoSeedLoadedAt(workspace.settings);

  if (existingVersion !== null) {
    return {
      status: "already_seeded",
      version: existingVersion,
      loadedAt: existingLoadedAt ?? new Date().toISOString(),
      summary: demoSeedSummary,
    };
  }

  const operation = createOperationContext({
    operation: "demo_seed.load",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
  });
  const planCode = input.workspacePlanCode ?? "agency";
  const senderProfileIds = new Map<string, string>();
  const campaignIds = new Map<string, string>();
  const prospectsByKey = new Map<string, Awaited<ReturnType<typeof createProspectForCampaign>>>();

  for (const senderProfile of demoSenderProfiles) {
    const created = await createSenderProfileForWorkspace({
      workspaceId: input.workspaceId,
      name: senderProfile.name,
      senderType: senderProfile.senderType,
      companyName: senderProfile.companyName,
      companyWebsite: senderProfile.companyWebsite,
      productDescription: senderProfile.productDescription,
      targetCustomer: senderProfile.targetCustomer,
      valueProposition: senderProfile.valueProposition,
      differentiation: senderProfile.differentiation,
      proofPoints: [...senderProfile.proofPoints],
      goals: [...senderProfile.goals],
      tonePreferences: cloneForSeed(senderProfile.tonePreferences),
      metadata: {
        source: "demo-seed",
        demoSeedVersion,
        seedKey: senderProfile.key,
      },
      status: "active",
      isDefault: senderProfile.isDefault,
      createdByUserId: input.userId ?? null,
      workspacePlanCode: planCode,
      userId: input.userId ?? undefined,
      requestId: operation.requestId,
    });
    senderProfileIds.set(senderProfile.key, created.id);
  }

  for (const campaign of demoCampaigns) {
    const created = await createCampaignForWorkspace({
      workspaceId: input.workspaceId,
      senderProfileId: campaign.senderProfileKey ? senderProfileIds.get(campaign.senderProfileKey) ?? null : null,
      name: campaign.name,
      description: campaign.name,
      objective: campaign.objective,
      offerSummary: campaign.offerSummary,
      targetIcp: campaign.targetIcp,
      targetPersona: campaign.targetPersona,
      targetIndustries: [...campaign.targetIndustries],
      tonePreferences: cloneForSeed(campaign.tonePreferences),
      frameworkPreferences: [...campaign.frameworkPreferences],
      settings: {
        source: "demo-seed",
        demoSeedVersion,
        seedKey: campaign.key,
      },
      status: "active",
      createdByUserId: input.userId ?? null,
      userId: input.userId ?? undefined,
      requestId: operation.requestId,
    });
    campaignIds.set(campaign.key, created.id);
  }

  for (const prospect of demoProspects) {
    const campaignId = campaignIds.get(prospect.campaignKey);
    if (!campaignId) {
      throw new Error(`Missing campaign for demo prospect ${prospect.key}.`);
    }

    const created = await createProspectForCampaign({
      workspaceId: input.workspaceId,
      campaignId,
      contactName: prospect.contactName,
      fullName: prospect.contactName,
      firstName: prospect.contactName.split(" ")[0] ?? null,
      lastName: prospect.contactName.split(" ").slice(1).join(" ") || null,
      email: prospect.contactEmail,
      title: prospect.title,
      companyName: prospect.companyName,
      companyDomain: prospect.companyDomain,
      companyWebsite: prospect.companyWebsite,
      linkedinUrl: undefined,
      location: undefined,
      source: "demo-seed",
      status: prospect.status,
      metadata: {
        source: "demo-seed",
        demoSeedVersion,
        notes: prospect.notes,
        seedKey: prospect.key,
      },
      createdByUserId: input.userId ?? null,
      userId: input.userId ?? undefined,
      requestId: operation.requestId,
    });
    prospectsByKey.set(prospect.key, created);
  }

  for (const snapshot of demoResearchSnapshots) {
    const prospect = prospectsByKey.get(snapshot.prospectKey);
    if (!prospect) {
      throw new Error(`Missing prospect for research snapshot ${snapshot.prospectKey}.`);
    }

    const created = await getResearchSnapshotRepository().createResearchSnapshot({
      workspaceId: input.workspaceId,
      prospectId: prospect.id,
      sourceUrl: snapshot.sourceUrl,
      sourceType: snapshot.sourceType,
      fetchStatus: snapshot.fetchStatus,
      evidence: cloneForSeed(snapshot.evidence),
      structuredData: {
        ...cloneForSeed(snapshot.structuredData),
        trainingRecord: {
          source: "demo-seed",
          demoSeedVersion,
        },
      },
      rawCapture: cloneForSeed(snapshot.rawCapture),
    });

    await updateProspectForCampaign({
      workspaceId: input.workspaceId,
      campaignId: prospect.campaignId ?? campaignIds.get(demoProspects.find((item) => item.key === snapshot.prospectKey)?.campaignKey ?? "") ?? "",
      prospectId: prospect.id,
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
      source: prospect.source ?? "demo-seed",
      status: prospect.status,
      metadata: {
        ...prospect.metadata,
        latestResearchSnapshotId: created.id,
        latestResearchAt: created.capturedAt.toISOString(),
        latestResearchSourceUrl: created.sourceUrl,
        latestResearchConfidence: created.structuredData.quality.overall.label,
      },
      userId: input.userId ?? undefined,
      requestId: operation.requestId,
    });

    await getSharedUsageEventRepository().createUsageEvent({
      workspaceId: input.workspaceId,
      userId: input.userId ?? undefined,
      campaignId: prospect.campaignId,
      prospectId: prospect.id,
      eventName: "prospect_research_completed",
      entityType: "research_snapshot",
      entityId: created.id,
      quantity: 1,
      billable: false,
      metadata: {
        source: "demo-seed",
        demoSeedVersion,
        confidence: created.structuredData.quality.overall.label,
        meterKey: "websiteResearchRuns",
      },
    });
  }

  for (const sequence of demoSequences) {
    const prospect = prospectsByKey.get(sequence.prospectKey);
    if (!prospect || !prospect.campaignId) {
      throw new Error(`Missing prospect for sequence ${sequence.key}.`);
    }

    const campaign = demoCampaigns.find((item) => item.key === demoProspects.find((prospectItem) => prospectItem.key === sequence.prospectKey)?.campaignKey);
    const created = await getSequenceRepository().createSequence({
      workspaceId: input.workspaceId,
      campaignId: prospect.campaignId,
      prospectId: prospect.id,
      senderProfileId: campaign?.senderProfileKey ? senderProfileIds.get(campaign.senderProfileKey) ?? null : null,
      generationMode: sequence.generationMode,
      channel: "email",
      status: sequence.status,
      content: compiledSequenceOutputSchema.parse(sequence.content),
      qualityChecksJson: sequenceQualityReportSchema.parse(sequence.qualityChecksJson),
      modelMetadata: {
        source: "demo-seed",
        demoSeedVersion,
        fixtureKey: sequence.key,
      },
      createdByUserId: input.userId ?? null,
    });

    await getSharedUsageEventRepository().createUsageEvent({
      workspaceId: input.workspaceId,
      userId: input.userId ?? undefined,
      campaignId: prospect.campaignId,
      prospectId: prospect.id,
      eventName: "sequence_generated",
      entityType: "sequence",
      entityId: created.id,
      quantity: 1,
      billable: false,
      metadata: {
        source: "demo-seed",
        demoSeedVersion,
        meterKey: "sequenceGenerations",
      },
    });

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId ?? undefined,
      actorType: input.userId ? "user" : "system",
      action: "sequence.generated",
      entityType: "sequence",
      entityId: created.id,
      requestId: operation.requestId,
      changes: {
        generationMode: created.generationMode,
        seed: true,
      },
      metadata: {
        source: "demo-seed",
        demoSeedVersion,
      },
    });

    await appendLatestSequenceMessagesToProspectThread({
      workspaceId: input.workspaceId,
      campaignId: prospect.campaignId,
      prospectId: prospect.id,
      userId: input.userId ?? undefined,
    });
  }

  for (const threadFixture of demoReplyThreads) {
    const prospect = prospectsByKey.get(threadFixture.prospectKey);
    if (!prospect || !prospect.campaignId) {
      throw new Error(`Missing prospect for reply thread ${threadFixture.prospectKey}.`);
    }

    for (const inbound of threadFixture.messages) {
      await createInboundReplyForProspect({
        workspaceId: input.workspaceId,
        campaignId: prospect.campaignId,
        prospectId: prospect.id,
        subject: inbound.subject,
        bodyText: inbound.bodyText,
        userId: input.userId ?? undefined,
      });
    }

    const state = await getReplyThreadStateForProspect(input.workspaceId, prospect.campaignId, prospect.id);
    if (state.thread === null || state.latestInboundMessage === null) {
      throw new Error(`Reply thread state could not be resolved for ${threadFixture.prospectKey}.`);
    }

    const analysisOutput = replyAnalysisOutputSchema.parse(threadFixture.analysis.analysisOutput);
    const strategyOutput = responseStrategyRecommendationOutputSchema.parse(
      threadFixture.analysis.strategyOutput,
    );
    const storedAnalysis = await getReplyAnalysisRepository().upsertReplyAnalysis({
      workspaceId: input.workspaceId,
      threadId: state.thread.id,
      messageId: state.latestInboundMessage.id,
      promptTemplateId: null,
      classification: threadFixture.analysis.classification,
      sentiment: threadFixture.analysis.sentiment,
      urgency: threadFixture.analysis.urgency,
      intent: threadFixture.analysis.intent,
      confidence: threadFixture.analysis.confidence,
      structuredOutput: {
        analysisVersion: 1,
        prospectId: prospect.id,
        analysisOutput,
        strategyOutput,
      },
      modelMetadata: {
        source: "demo-seed",
        demoSeedVersion,
      },
    });

    await getSharedUsageEventRepository().createUsageEvent({
      workspaceId: input.workspaceId,
      userId: input.userId ?? undefined,
      campaignId: prospect.campaignId,
      prospectId: prospect.id,
      eventName: "reply_analysis_completed",
      entityType: "reply_analysis",
      entityId: storedAnalysis.id,
      quantity: 1,
      billable: false,
      metadata: {
        source: "demo-seed",
        demoSeedVersion,
        meterKey: "replyAnalyses",
      },
    });

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId ?? undefined,
      actorType: input.userId ? "user" : "system",
      action: "reply.analysis.completed",
      entityType: "message",
      entityId: state.latestInboundMessage.id,
      requestId: operation.requestId,
      changes: {
        analysisVersion: 1,
        intent: threadFixture.analysis.intent,
        seed: true,
      },
      metadata: {
        source: "demo-seed",
        demoSeedVersion,
      },
    });

    const bundleId = randomUUID();
    const draftOutput = draftReplyOutputSchema.parse(threadFixture.draftBundle.output);
    await Promise.all(
      draftOutput.drafts.map((draft) =>
        getDraftReplyRepository().createDraftReply({
          workspaceId: input.workspaceId,
          threadId: state.thread!.id,
          messageId: state.latestInboundMessage!.id,
          replyAnalysisId: storedAnalysis.id,
          senderProfileId: null,
          promptTemplateId: null,
          subject: draft.subject ?? null,
          bodyText: draft.bodyText,
          structuredOutput: {
            draftVersion: threadFixture.draftBundle.version,
            bundleId,
            bundleOutput: draftOutput,
          },
          qualityChecksJson: draftReplyQualityReportSchema.parse({
            generatedAt: new Date("2026-04-03T10:05:00.000Z"),
            summary: { score: 0.86, label: "strong", blocked: false, needsReview: false },
            dimensions: [
              { name: "relevance", score: 0.88, label: "strong", details: "The draft responds directly to the inbound reply." },
              { name: "objection_handling_fit", score: 0.9, label: "strong", details: "The recommendation fits the identified intent." },
              { name: "tone_fit", score: 0.84, label: "strong", details: "The tone remains professional." },
              { name: "pushiness_risk", score: 0.08, label: "low_risk", details: "No unnecessary pressure appears." },
              { name: "unsupported_claim_risk", score: 0.03, label: "low_risk", details: "The draft avoids unsupported proof points." },
            ],
            checks: [],
            notes: ["Demo reply draft quality report."],
          }),
          modelMetadata: {
            source: "demo-seed",
            demoSeedVersion,
          },
          createdByUserId: input.userId ?? null,
        }),
      ),
    );

    await getSharedUsageEventRepository().createUsageEvent({
      workspaceId: input.workspaceId,
      userId: input.userId ?? undefined,
      campaignId: prospect.campaignId,
      prospectId: prospect.id,
      eventName: "reply_drafts_generated",
      entityType: "draft_reply",
      entityId: state.latestInboundMessage.id,
      quantity: draftOutput.drafts.length,
      billable: false,
      metadata: {
        source: "demo-seed",
        demoSeedVersion,
        meterKey: "replyDraftGenerations",
      },
    });

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId ?? undefined,
      actorType: input.userId ? "user" : "system",
      action: "reply.drafts.generated",
      entityType: "message",
      entityId: state.latestInboundMessage.id,
      requestId: operation.requestId,
      changes: {
        draftVersion: threadFixture.draftBundle.version,
        optionCount: draftOutput.drafts.length,
        seed: true,
      },
      metadata: {
        source: "demo-seed",
        demoSeedVersion,
      },
    });
  }

  const loadedAt = new Date().toISOString();
  await updateWorkspaceSettings({
    workspaceId: input.workspaceId,
    settings: {
      ...workspace.settings,
      demoSeed: {
        version: demoSeedVersion,
        loadedAt,
        summary: demoSeedSummary,
      },
    },
  });

  operation.logger.info("Demo workspace data seeded", {
    demoSeedVersion,
    senderProfiles: demoSeedSummary.senderProfileCount,
    campaigns: demoSeedSummary.campaignCount,
    prospects: demoSeedSummary.prospectCount,
  });

  return {
    status: "seeded",
    version: demoSeedVersion,
    loadedAt,
    summary: demoSeedSummary,
  };
}
