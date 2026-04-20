import {
  assertFeatureEntitlement,
  assertUsageEntitlement,
  checkFeatureEntitlement,
  checkUsageEntitlement,
  createStripeBillingProvider,
  getBillingPlanDefinition,
  resolveBillingPlanCode,
  summarizeWorkspaceUsage,
  type BillingFeatureKey,
  type BillingMeterKey,
  type BillingPlanCode,
  type NormalizedBillingSubscription,
  type StripeBillingProvider,
} from "@ceg/billing";
import { getOptionalEnv, getRequiredEnv } from "@ceg/security";
import { redirect } from "next/navigation";
import { getRequiredAppOrigin } from "./runtime-origin";
import type { Subscription } from "@ceg/validation";

import { getWorkspaceAppContext } from "./auth";
import { getSharedAuditEventRepository } from "./audit-events";
import { createOperationContext } from "./observability";
import { trackProductAnalyticsEvent } from "./product-analytics";
import { getSharedSubscriptionRepository } from "./subscriptions";
import { getSharedUsageEventRepository } from "./usage-events";

export type WorkspaceBillingState = {
  planCode: BillingPlanCode;
  planLabel: string;
  subscriptionRequired: boolean;
  hasActiveSubscription: boolean;
  usage: ReturnType<typeof summarizeWorkspaceUsage>;
  currentSubscription: Subscription | null;
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

type WorkspaceAppContext = Awaited<ReturnType<typeof getWorkspaceAppContext>>;

export type WorkspaceBillingContext = Omit<
  WorkspaceAppContext,
  "workspace" | "needsWorkspaceSelection"
> & {
  workspace: NonNullable<WorkspaceAppContext["workspace"]>;
  needsWorkspaceSelection: false;
  billing: WorkspaceBillingState;
};

declare global {
  var __cegStripeBillingProvider: StripeBillingProvider | undefined;
}

export function isWorkspaceSubscriptionLocked(billing: WorkspaceBillingState): boolean {
  return billing.subscriptionRequired && !billing.hasActiveSubscription;
}

export function createWorkspaceBillingPath(input?: {
  workspaceId?: string | null;
  notice?: string | null;
  error?: string | null;
  billing?: string | null;
}): string {
  const searchParams = new URLSearchParams();

  if (input?.workspaceId) {
    searchParams.set("workspace", input.workspaceId);
  }

  if (input?.notice) {
    searchParams.set("notice", input.notice);
  }

  if (input?.error) {
    searchParams.set("error", input.error);
  }

  if (input?.billing) {
    searchParams.set("billing", input.billing);
  }

  const query = searchParams.toString();
  return query.length > 0 ? `/app/billing?${query}` : "/app/billing";
}

function isActiveSubscription(subscription: Subscription | null): boolean {
  return subscription?.status === "active" || subscription?.status === "trialing";
}

function resolvePlanCode(input: {
  workspacePlanCode?: string | null;
  currentSubscription?: Subscription | null;
}): BillingPlanCode {
  if (
    input.currentSubscription &&
    input.currentSubscription.status !== "canceled"
  ) {
    return resolveBillingPlanCode(input.currentSubscription.planCode);
  }

  return resolveBillingPlanCode(input.workspacePlanCode);
}

function getStripeBillingProvider(): StripeBillingProvider {
  if (globalThis.__cegStripeBillingProvider === undefined) {
    globalThis.__cegStripeBillingProvider = createStripeBillingProvider({
      secretKey: getRequiredEnv("STRIPE_SECRET_KEY"),
      webhookSecret: getRequiredEnv("STRIPE_WEBHOOK_SECRET"),
      appUrl: getRequiredAppOrigin(),
      monthlyPriceIds: {
        free: getRequiredEnv("STRIPE_PRICE_STARTER_MONTHLY"),
        pro: getRequiredEnv("STRIPE_PRICE_PRO_MONTHLY"),
        agency: getRequiredEnv("STRIPE_PRICE_AGENCY_MONTHLY"),
      },
    });
  }

  return globalThis.__cegStripeBillingProvider;
}

export async function getWorkspaceCurrentSubscription(
  workspaceId: string,
): Promise<Subscription | null> {
  return getSharedSubscriptionRepository().getLatestSubscriptionByWorkspace(workspaceId);
}

export async function getWorkspaceBillingState(input: {
  workspaceId: string;
  workspacePlanCode?: string | null;
}): Promise<WorkspaceBillingState> {
  const [usageEvents, currentSubscription] = await Promise.all([
    getSharedUsageEventRepository().listUsageEventsByWorkspace(input.workspaceId),
    getWorkspaceCurrentSubscription(input.workspaceId),
  ]);
  const usage = summarizeWorkspaceUsage(usageEvents);
  const planCode = resolvePlanCode({
    workspacePlanCode: input.workspacePlanCode,
    currentSubscription,
  });
  const plan = getBillingPlanDefinition(planCode);

  return {
    planCode,
    planLabel: plan.label,
    subscriptionRequired: true,
    hasActiveSubscription: isActiveSubscription(currentSubscription),
    usage,
    currentSubscription,
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

export async function requireWorkspaceBillingContext(
  selectedWorkspaceId?: string,
): Promise<WorkspaceBillingContext> {
  const context = await getWorkspaceAppContext(selectedWorkspaceId);
  const workspace = context.workspace;

  if (workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const billing = await getWorkspaceBillingState({
    workspaceId: workspace.workspaceId,
    workspacePlanCode: workspace.billingPlanCode,
  });

  return {
    ...context,
    workspace,
    needsWorkspaceSelection: false,
    billing,
  };
}

export async function requireActiveWorkspaceAppContext(
  selectedWorkspaceId?: string,
): Promise<WorkspaceBillingContext> {
  const context = await requireWorkspaceBillingContext(selectedWorkspaceId);

  if (isWorkspaceSubscriptionLocked(context.billing)) {
    redirect(
      createWorkspaceBillingPath({
        workspaceId: context.workspace.workspaceId,
        notice:
          "Pick a plan to run campaigns, research, drafts, reply intelligence, and inbox workflows.",
      }),
    );
  }

  return context;
}

export async function assertWorkspaceSubscriptionActive(input: {
  workspaceId: string;
}): Promise<void> {
  const currentSubscription = await getWorkspaceCurrentSubscription(input.workspaceId);

  if (!isActiveSubscription(currentSubscription)) {
    throw new Error("An active subscription is required to use workspace workflows.");
  }
}

export async function assertWorkspaceFeatureAccess(input: {
  workspaceId: string;
  workspacePlanCode?: string | null;
  feature: BillingFeatureKey;
}): Promise<void> {
  const currentSubscription = await getWorkspaceCurrentSubscription(input.workspaceId);
  assertFeatureEntitlement(
    resolvePlanCode({
      workspacePlanCode: input.workspacePlanCode,
      currentSubscription,
    }),
    input.feature,
  );
}

export async function assertWorkspaceUsageAccess(input: {
  workspaceId: string;
  workspacePlanCode?: string | null;
  meterKey: BillingMeterKey;
  quantity?: number;
}): Promise<void> {
  const [usageEvents, currentSubscription] = await Promise.all([
    getSharedUsageEventRepository().listUsageEventsByWorkspace(input.workspaceId),
    getWorkspaceCurrentSubscription(input.workspaceId),
  ]);
  const usage = summarizeWorkspaceUsage(usageEvents);
  const planCode = resolvePlanCode({
    workspacePlanCode: input.workspacePlanCode,
    currentSubscription,
  });

  assertUsageEntitlement({
    planCode,
    usage,
    meterKey: input.meterKey,
    quantity: input.quantity,
  });
}

export async function createCheckoutSessionForWorkspace(input: {
  workspaceId: string;
  planCode: BillingPlanCode;
  userId?: string | null;
  customerEmail?: string | null;
  requestId?: string;
}): Promise<{ url: string; id: string }> {
  const operation = createOperationContext({
    operation: "billing.checkout.create",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
  });
  const currentSubscription = await getWorkspaceCurrentSubscription(input.workspaceId);
  const appUrl = getRequiredAppOrigin();

  const session = await getStripeBillingProvider().createCheckoutSession({
    workspaceId: input.workspaceId,
    userId: input.userId,
    customerEmail: input.customerEmail,
    existingCustomerId: currentSubscription?.providerCustomerId ?? null,
    planCode: input.planCode,
    successUrl: `${appUrl}${createWorkspaceBillingPath({
      workspaceId: input.workspaceId,
      billing: "success",
    })}`,
    cancelUrl: `${appUrl}${createWorkspaceBillingPath({
      workspaceId: input.workspaceId,
      billing: "canceled",
    })}`,
  });

  operation.logger.info("Stripe checkout session created", {
    sessionId: session.id,
    planCode: input.planCode,
  });

  await trackProductAnalyticsEvent({
    event: "billing_upgrade_clicked",
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    entityType: "workspace",
    entityId: input.workspaceId,
    requestId: operation.requestId,
    metadata: {
      planCode: input.planCode,
      checkoutSessionId: session.id,
    },
  });

  return session;
}

export async function createBillingPortalSessionForWorkspace(input: {
  workspaceId: string;
  userId?: string | null;
  requestId?: string;
}): Promise<{ url: string }> {
  const operation = createOperationContext({
    operation: "billing.portal.create",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
  });
  const currentSubscription = await getWorkspaceCurrentSubscription(input.workspaceId);
  if (!currentSubscription?.providerCustomerId) {
    throw new Error("No Stripe customer is synced for this workspace yet.");
  }

  const appUrl = getRequiredAppOrigin();
  const session = await getStripeBillingProvider().createBillingPortalSession({
    customerId: currentSubscription.providerCustomerId,
    returnUrl: `${appUrl}${createWorkspaceBillingPath({
      workspaceId: input.workspaceId,
    })}`,
  });

  operation.logger.info("Stripe billing portal session created", {
    customerId: currentSubscription.providerCustomerId,
  });

  return session;
}

function toSubscriptionInput(subscription: NormalizedBillingSubscription) {
  return {
    workspaceId: subscription.workspaceId,
    provider: subscription.provider,
    providerCustomerId: subscription.providerCustomerId,
    providerSubscriptionId: subscription.providerSubscriptionId,
    planCode: subscription.planCode,
    status: subscription.status,
    seats: subscription.seats,
    billingEmail: subscription.billingEmail,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    metadata: subscription.metadata,
  } as const;
}

export async function syncNormalizedSubscription(input: {
  subscription: NormalizedBillingSubscription;
  requestId?: string;
  actorType?: "user" | "system" | "api";
}): Promise<Subscription> {
  const operation = createOperationContext({
    operation: "billing.subscription.sync",
    requestId: input.requestId,
    workspaceId: input.subscription.workspaceId,
  });
  const previous = await getSharedSubscriptionRepository().getLatestSubscriptionByWorkspace(
    input.subscription.workspaceId,
  );
  const record = await getSharedSubscriptionRepository().upsertSubscription(
    toSubscriptionInput(input.subscription),
  );

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: record.workspaceId,
    userId: null,
    actorType: input.actorType ?? "system",
    action: "subscription.synced",
    entityType: "subscription",
    entityId: record.id,
    requestId: operation.requestId,
    changes: {
      previousPlanCode: previous?.planCode ?? null,
      nextPlanCode: record.planCode,
      previousStatus: previous?.status ?? null,
      nextStatus: record.status,
    },
    metadata: {
      provider: record.provider,
      providerSubscriptionId: record.providerSubscriptionId ?? null,
    },
  });

  operation.logger.info("Subscription synced", {
    subscriptionId: record.providerSubscriptionId ?? null,
    planCode: record.planCode,
    status: record.status,
  });

  return record;
}

export async function handleStripeWebhook(input: {
  payload: string;
  signature: string;
  requestId?: string;
}): Promise<{ eventType: string; synced: boolean }> {
  const operation = createOperationContext({
    operation: "billing.webhook.handle",
    requestId: input.requestId,
  });
  const event = getStripeBillingProvider().verifyWebhook(
    input.payload,
    input.signature,
  );
  operation.logger.info("Stripe webhook verified", {
    eventId: event.id,
    eventType: event.type,
  });

  const normalized = await getStripeBillingProvider().normalizeSubscriptionFromEvent(event);
  if (normalized === null) {
    operation.logger.info("Stripe webhook ignored", {
      eventId: event.id,
      eventType: event.type,
    });
    return { eventType: event.type, synced: false };
  }

  await syncNormalizedSubscription({
    subscription: normalized,
    requestId: operation.requestId,
    actorType: "api",
  });
  return { eventType: event.type, synced: true };
}

export function getOptionalStripePublishableKey(): string | undefined {
  return getOptionalEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}



