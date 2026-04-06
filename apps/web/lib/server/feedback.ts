import { submitFeedbackInputSchema } from "@ceg/validation";

import { getSharedAuditEventRepository } from "./audit-events";
import { createOperationContext } from "./observability";
import { trackProductAnalyticsEvent } from "./product-analytics";
import { getSharedUsageEventRepository } from "./usage-events";

export async function submitWorkspaceFeedback(input: {
  workspaceId: string;
  pagePath: string;
  category: "bug" | "workflow" | "output_quality" | "billing" | "other";
  message: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  requestId?: string;
}) {
  const parsed = submitFeedbackInputSchema.parse({
    workspaceId: input.workspaceId,
    pagePath: input.pagePath,
    category: input.category,
    message: input.message,
  });
  const operation = createOperationContext({
    operation: "feedback.submit",
    requestId: input.requestId,
    workspaceId: parsed.workspaceId,
    userId: input.userId ?? null,
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: parsed.workspaceId,
    userId: input.userId ?? null,
    actorType: input.userId ? "user" : "system",
    action: "feedback.submitted",
    entityType: "workspace",
    entityId: parsed.workspaceId,
    requestId: operation.requestId,
    changes: {
      category: parsed.category,
      pagePath: parsed.pagePath,
      messageLength: parsed.message.length,
    },
    metadata: {
      category: parsed.category,
      pagePath: parsed.pagePath,
      message: parsed.message,
      submittedByEmail: input.userEmail ?? null,
      submittedByName: input.userName ?? null,
    },
  });

  await getSharedUsageEventRepository().createUsageEvent({
    workspaceId: parsed.workspaceId,
    userId: input.userId ?? null,
    eventName: "feedback_submitted",
    entityType: "workspace",
    entityId: parsed.workspaceId,
    quantity: 1,
    billable: false,
    metadata: {
      category: parsed.category,
      pagePath: parsed.pagePath,
      messageLength: parsed.message.length,
    },
  });

  await trackProductAnalyticsEvent({
    event: "feedback_submitted",
    workspaceId: parsed.workspaceId,
    userId: input.userId ?? null,
    entityType: "workspace",
    entityId: parsed.workspaceId,
    requestId: operation.requestId,
    metadata: {
      category: parsed.category,
      pagePath: parsed.pagePath,
      messageLength: parsed.message.length,
    },
  });

  operation.logger.info("Workspace feedback submitted", {
    category: parsed.category,
    pagePath: parsed.pagePath,
    messageLength: parsed.message.length,
  });
}
