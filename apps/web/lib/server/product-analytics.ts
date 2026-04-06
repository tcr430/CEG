import { productAnalyticsEventSchema, type ProductAnalyticsEvent } from "@ceg/validation";

import { createOperationContext } from "./observability";
import { getSharedUsageEventRepository } from "./usage-events";

export async function trackProductAnalyticsEvent(input: {
  event: ProductAnalyticsEvent;
  workspaceId: string;
  userId?: string | null;
  campaignId?: string | null;
  prospectId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  requestId?: string;
  metadata?: Record<string, unknown>;
}) {
  const event = productAnalyticsEventSchema.parse(input.event);
  const operation = createOperationContext({
    operation: "analytics.product_event",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId ?? null,
    prospectId: input.prospectId ?? null,
  });

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    campaignId: input.campaignId ?? null,
    prospectId: input.prospectId ?? null,
    eventName: `analytics_${event}`,
    entityType: input.entityType ?? "workspace",
    entityId: input.entityId ?? input.workspaceId,
    quantity: 1,
    billable: false,
    metadata: {
      action: event,
      analyticsSurface: "soft_launch",
      ...input.metadata,
    },
  });

  operation.logger.info("Soft-launch analytics event recorded", {
    analyticsEvent: event,
    entityType: input.entityType ?? "workspace",
    entityId: input.entityId ?? input.workspaceId,
  });
}
