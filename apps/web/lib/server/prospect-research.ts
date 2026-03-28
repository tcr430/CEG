import {
  createInMemoryAuditEventRepository,
  createInMemoryResearchSnapshotRepository,
  type AuditEventRepository,
  type ResearchSnapshotRepository,
} from "@ceg/database";
import { createConsoleLogger } from "@ceg/observability";
import {
  createResearchEngineService,
  type ResearchEngineService,
} from "@ceg/research-engine";
import { assertSafeUrl } from "@ceg/security";

import {
  assertWorkspaceFeatureAccess,
  assertWorkspaceUsageAccess,
} from "./billing";
import type { Prospect, ResearchSnapshot } from "@ceg/validation";

import {
  getProspectForCampaign,
  updateProspectForCampaign,
} from "./campaigns";
import { getSharedUsageEventRepository } from "./usage-events";

declare global {
  var __cegResearchSnapshotRepository: ResearchSnapshotRepository | undefined;
  var __cegAuditEventRepository: AuditEventRepository | undefined;
  var __cegResearchEngineService: ResearchEngineService | undefined;
}

function getResearchSnapshotRepository(): ResearchSnapshotRepository {
  if (globalThis.__cegResearchSnapshotRepository === undefined) {
    globalThis.__cegResearchSnapshotRepository =
      createInMemoryResearchSnapshotRepository();
  }

  return globalThis.__cegResearchSnapshotRepository;
}

function getAuditEventRepository(): AuditEventRepository {
  if (globalThis.__cegAuditEventRepository === undefined) {
    globalThis.__cegAuditEventRepository = createInMemoryAuditEventRepository();
  }

  return globalThis.__cegAuditEventRepository;
}

function getResearchEngine(): ResearchEngineService {
  if (globalThis.__cegResearchEngineService === undefined) {
    globalThis.__cegResearchEngineService = createResearchEngineService();
  }

  return globalThis.__cegResearchEngineService;
}

const logger = createConsoleLogger({ area: "prospect_research" });

function mergeProspectMetadata(
  prospect: Prospect,
  snapshot: ResearchSnapshot,
): Prospect["metadata"] {
  return {
    ...prospect.metadata,
    latestResearchSnapshotId: snapshot.id,
    latestResearchAt: snapshot.capturedAt.toISOString(),
    latestResearchSourceUrl: snapshot.sourceUrl,
    latestResearchConfidence: snapshot.structuredData.quality.overall.label,
  };
}

export async function getLatestResearchSnapshotForProspect(
  workspaceId: string,
  campaignId: string,
  prospectId: string,
): Promise<ResearchSnapshot | null> {
  const prospect = await getProspectForCampaign(workspaceId, campaignId, prospectId);

  if (prospect === null) {
    return null;
  }

  return getResearchSnapshotRepository().getLatestResearchSnapshotByProspect(
    workspaceId,
    prospectId,
  );
}

export async function runProspectResearchForCampaign(input: {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
  websiteUrl: string;
  userId?: string;
  workspacePlanCode?: string | null;
}): Promise<ResearchSnapshot> {
  const prospect = await getProspectForCampaign(
    input.workspaceId,
    input.campaignId,
    input.prospectId,
  );

  if (prospect === null) {
    throw new Error("Prospect not found for workspace campaign.");
  }

  const normalizedUrl = assertSafeUrl(input.websiteUrl);

  await assertWorkspaceFeatureAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    feature: "website_research",
  });
  await assertWorkspaceUsageAccess({
    workspaceId: input.workspaceId,
    workspacePlanCode: input.workspacePlanCode,
    meterKey: "websiteResearchRuns",
  });
  const runLogger = logger.child({
    workspaceId: input.workspaceId,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
  });

  runLogger.info("Prospect research started", {
    websiteUrl: normalizedUrl,
  });

  try {
    const result = await getResearchEngine().researchWebsite({
      workspaceId: input.workspaceId,
      prospectId: input.prospectId,
      websiteUrl: normalizedUrl,
      captureHtml: true,
      captureText: true,
      mode: "company_profile",
    });

    const companyProfile = {
      ...result.companyProfile,
      likelyPainPoints: result.companyProfile.likelyPainPoints ?? [],
      personalizationHooks: result.companyProfile.personalizationHooks ?? [],
    };

    const snapshot = await getResearchSnapshotRepository().createResearchSnapshot({
      workspaceId: input.workspaceId,
      prospectId: input.prospectId,
      sourceUrl: result.fetch.finalUrl,
      sourceType: "website",
      fetchStatus: result.fetch.statusCode >= 400 ? "failed" : "captured",
      evidence: result.evidence,
      structuredData: {
        companyProfile,
        quality: result.quality,
        trainingRecord: result.trainingRecord.metadata,
      },
      rawCapture: {
        fetch: {
          requestedUrl: result.fetch.requestedUrl,
          finalUrl: result.fetch.finalUrl,
          statusCode: result.fetch.statusCode,
          contentType: result.fetch.contentType,
          fetchedAt: result.fetch.fetchedAt.toISOString(),
        },
        cleaned: {
          title: result.cleaned.title,
          textSample: result.cleaned.cleanText.slice(0, 4000),
        },
        extracted: result.extracted,
        trainingRecord: result.trainingRecord,
      },
    });

    await updateProspectForCampaign({
      prospectId: prospect.id,
      workspaceId: prospect.workspaceId,
      campaignId: input.campaignId,
      contactName: prospect.contactName ?? undefined,
      fullName: prospect.fullName ?? undefined,
      firstName: prospect.firstName ?? undefined,
      lastName: prospect.lastName ?? undefined,
      email: prospect.email ?? undefined,
      title: prospect.title ?? undefined,
      companyName: prospect.companyName ?? undefined,
      companyDomain: companyProfile.domain,
      companyWebsite: normalizedUrl,
      linkedinUrl: prospect.linkedinUrl ?? undefined,
      location: prospect.location ?? undefined,
      source: prospect.source ?? "website",
      status: "researched",
      metadata: mergeProspectMetadata(prospect, snapshot),
    });

    await getSharedUsageEventRepository().createUsageEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      campaignId: input.campaignId,
      prospectId: input.prospectId,
      eventName: "prospect_research_completed",
      entityType: "research_snapshot",
      entityId: snapshot.id,
      quantity: 1,
      billable: false,
      metadata: {
        sourceUrl: snapshot.sourceUrl,
        confidence: snapshot.structuredData.quality.overall.label,
        confidenceScore: snapshot.structuredData.quality.overall.score,
        meterKey: "websiteResearchRuns",
        workspacePlanCode: input.workspacePlanCode ?? "free",
      },
    });

    await getAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "prospect.research.completed",
      entityType: "prospect",
      entityId: prospect.id,
      changes: {
        snapshotId: snapshot.id,
        sourceUrl: snapshot.sourceUrl,
        prospectStatus: "researched",
      },
      metadata: {
        confidence: snapshot.structuredData.quality.overall.label,
      },
    });

    runLogger.info("Prospect research completed", {
      snapshotId: snapshot.id,
      confidence: snapshot.structuredData.quality.overall.label,
    });

    return snapshot;
  } catch (error) {
    await getAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "prospect.research.failed",
      entityType: "prospect",
      entityId: input.prospectId,
      changes: {},
      metadata: {
        websiteUrl: normalizedUrl,
        error: error instanceof Error ? error.message : "Unknown research error",
      },
    });

    runLogger.error("Prospect research failed", {
      websiteUrl: normalizedUrl,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}
