import {
  assertFeatureEntitlement,
  assertUsageEntitlement,
  checkFeatureEntitlement,
  checkUsageEntitlement,
  getBillingPlanDefinition,
  resolveBillingPlanCode,
  summarizeWorkspaceUsage,
  type BillingFeatureKey,
  type BillingMeterKey,
  type BillingPlanCode,
} from "@ceg/billing";

import { getSharedUsageEventRepository } from "./usage-events";

export type WorkspaceBillingState = {
  planCode: BillingPlanCode;
  planLabel: string;
  usage: ReturnType<typeof summarizeWorkspaceUsage>;
  features: {
    senderAwareProfiles: ReturnType<typeof checkFeatureEntitlement>;
    websiteResearch: ReturnType<typeof checkFeatureEntitlement>;
    sequenceGeneration: ReturnType<typeof checkFeatureEntitlement>;
    replyIntelligence: ReturnType<typeof checkFeatureEntitlement>;
    sequenceRegeneration: ReturnType<typeof checkFeatureEntitlement>;
    replyRegeneration: ReturnType<typeof checkFeatureEntitlement>;
  };
  limits: {
    websiteResearch: ReturnType<typeof checkUsageEntitlement>;
    sequenceGeneration: ReturnType<typeof checkUsageEntitlement>;
    replyAnalysis: ReturnType<typeof checkUsageEntitlement>;
    replyDraftGeneration: ReturnType<typeof checkUsageEntitlement>;
    regenerations: ReturnType<typeof checkUsageEntitlement>;
  };
};

function resolvePlanCode(workspacePlanCode?: string | null): BillingPlanCode {
  return resolveBillingPlanCode(workspacePlanCode);
}

export async function getWorkspaceBillingState(input: {
  workspaceId: string;
  workspacePlanCode?: string | null;
}): Promise<WorkspaceBillingState> {
  const planCode = resolvePlanCode(input.workspacePlanCode);
  const usageEvents = await getSharedUsageEventRepository().listUsageEventsByWorkspace(
    input.workspaceId,
  );
  const usage = summarizeWorkspaceUsage(usageEvents);
  const plan = getBillingPlanDefinition(planCode);

  return {
    planCode,
    planLabel: plan.label,
    usage,
    features: {
      senderAwareProfiles: checkFeatureEntitlement(planCode, "sender_aware_profiles"),
      websiteResearch: checkFeatureEntitlement(planCode, "website_research"),
      sequenceGeneration: checkFeatureEntitlement(planCode, "sequence_generation"),
      replyIntelligence: checkFeatureEntitlement(planCode, "reply_intelligence"),
      sequenceRegeneration: checkFeatureEntitlement(planCode, "sequence_regeneration"),
      replyRegeneration: checkFeatureEntitlement(planCode, "reply_regeneration"),
    },
    limits: {
      websiteResearch: checkUsageEntitlement({
        planCode,
        usage,
        meterKey: "websiteResearchRuns",
      }),
      sequenceGeneration: checkUsageEntitlement({
        planCode,
        usage,
        meterKey: "sequenceGenerations",
      }),
      replyAnalysis: checkUsageEntitlement({
        planCode,
        usage,
        meterKey: "replyAnalyses",
      }),
      replyDraftGeneration: checkUsageEntitlement({
        planCode,
        usage,
        meterKey: "replyDraftGenerations",
      }),
      regenerations: checkUsageEntitlement({
        planCode,
        usage,
        meterKey: "regenerations",
      }),
    },
  };
}

export async function assertWorkspaceFeatureAccess(input: {
  workspaceId: string;
  workspacePlanCode?: string | null;
  feature: BillingFeatureKey;
}): Promise<void> {
  void input.workspaceId;
  assertFeatureEntitlement(resolvePlanCode(input.workspacePlanCode), input.feature);
}

export async function assertWorkspaceUsageAccess(input: {
  workspaceId: string;
  workspacePlanCode?: string | null;
  meterKey: BillingMeterKey;
  quantity?: number;
}): Promise<void> {
  const planCode = resolvePlanCode(input.workspacePlanCode);
  const usageEvents = await getSharedUsageEventRepository().listUsageEventsByWorkspace(
    input.workspaceId,
  );
  const usage = summarizeWorkspaceUsage(usageEvents);

  assertUsageEntitlement({
    planCode,
    usage,
    meterKey: input.meterKey,
    quantity: input.quantity,
  });
}
