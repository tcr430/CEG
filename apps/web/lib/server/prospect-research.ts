import { createInMemoryResearchSnapshotRepository, type ResearchSnapshotRepository } from "@ceg/database";
import {
  createResearchEngineService,
  type ResearchEngineService,
} from "@ceg/research-engine";
import { assertSafeUrl } from "@ceg/security";
import type { Prospect, ResearchSnapshot } from "@ceg/validation";

import { getSharedAuditEventRepository } from "./audit-events";
import {
  assertWorkspaceFeatureAccess,
  assertWorkspaceUsageAccess,
} from "./billing";
import {
  getProspectForCampaign,
  updateProspectForCampaign,
} from "./campaigns";
import { createOperationContext } from "./observability";
import { getSharedUsageEventRepository } from "./usage-events";

declare global {
  var __cegResearchSnapshotRepository: ResearchSnapshotRepository | undefined;
  var __cegResearchEngineService: ResearchEngineService | undefined;
}

function getResearchSnapshotRepository(): ResearchSnapshotRepository {
  if (globalThis.__cegResearchSnapshotRepository === undefined) {
    globalThis.__cegResearchSnapshotRepository =
      createInMemoryResearchSnapshotRepository();
  }

  return globalThis.__cegResearchSnapshotRepository;
}

function getResearchEngine(): ResearchEngineService {
  if (globalThis.__cegResearchEngineService === undefined) {
    globalThis.__cegResearchEngineService = createResearchEngineService();
  }

  return globalThis.__cegResearchEngineService;
}

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
  requestId?: string;
}): Promise<ResearchSnapshot> {
  const operation = createOperationContext({
    operation: "prospect_research.run",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId,
    prospectId: input.prospectId,
  });

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

  operation.logger.info("Prospect research started", {
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
      userId: input.userId,
      requestId: operation.requestId,
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

    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "prospect.research.completed",
      entityType: "prospect",
      entityId: prospect.id,
      requestId: operation.requestId,
      changes: {
        snapshotId: snapshot.id,
        sourceUrl: snapshot.sourceUrl,
        prospectStatus: "researched",
      },
      metadata: {
        confidence: snapshot.structuredData.quality.overall.label,
      },
    });

    operation.logger.info("Prospect research completed", {
      snapshotId: snapshot.id,
      confidence: snapshot.structuredData.quality.overall.label,
    });

    return snapshot;
  } catch (error) {
    await getSharedAuditEventRepository().createAuditEvent({
      workspaceId: input.workspaceId,
      userId: input.userId,
      actorType: input.userId ? "user" : "system",
      action: "prospect.research.failed",
      entityType: "prospect",
      entityId: input.prospectId,
      requestId: operation.requestId,
      changes: {},
      metadata: {
        websiteUrl: normalizedUrl,
        error: error instanceof Error ? error.message : "Unknown research error",
      },
    });

    operation.logger.error("Prospect research failed", {
      websiteUrl: normalizedUrl,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}
