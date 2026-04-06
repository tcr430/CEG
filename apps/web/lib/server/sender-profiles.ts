import type {
  CreateSenderProfileInput,
  SenderProfile,
  UpdateSenderProfileInput,
} from "@ceg/validation";

import { getSharedAuditEventRepository } from "./audit-events";
import { assertWorkspaceFeatureAccess } from "./billing";
import { getSenderProfileRepository } from "./database";
import { createOperationContext } from "./observability";
import { trackProductAnalyticsEvent } from "./product-analytics";

export async function listSenderProfilesForWorkspace(
  workspaceId: string,
): Promise<SenderProfile[]> {
  return getSenderProfileRepository().listSenderProfilesByWorkspace(workspaceId);
}

export async function getSenderProfileForWorkspace(
  workspaceId: string,
  senderProfileId: string,
): Promise<SenderProfile | null> {
  const profile = await getSenderProfileRepository().getSenderProfileById(
    senderProfileId,
  );

  if (profile === null || profile.workspaceId !== workspaceId) {
    return null;
  }

  return profile;
}

export async function createSenderProfileForWorkspace(
  input: CreateSenderProfileInput & {
    workspacePlanCode?: string | null;
    userId?: string;
    requestId?: string;
  },
): Promise<SenderProfile> {
  const operation = createOperationContext({
    operation: "sender_profile.create",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? input.createdByUserId ?? null,
  });

  if (input.senderType !== "basic") {
    await assertWorkspaceFeatureAccess({
      workspaceId: input.workspaceId,
      workspacePlanCode: input.workspacePlanCode,
      feature: "sender_aware_profiles",
    });
  }

  const created = await getSenderProfileRepository().createSenderProfile(input);

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId ?? input.createdByUserId ?? null,
    actorType: input.userId ? "user" : "system",
    action: "sender_profile.created",
    entityType: "sender_profile",
    entityId: created.id,
    requestId: operation.requestId,
    changes: {
      senderType: created.senderType,
      status: created.status,
      isDefault: created.isDefault,
    },
    metadata: {
      profileName: created.name,
    },
  });

  operation.logger.info("Sender profile created", {
    senderProfileId: created.id,
    senderType: created.senderType,
    isDefault: created.isDefault,
  });

  await trackProductAnalyticsEvent({
    event: "sender_profile_created",
    workspaceId: input.workspaceId,
    userId: input.userId ?? input.createdByUserId ?? null,
    entityType: "sender_profile",
    entityId: created.id,
    requestId: operation.requestId,
    metadata: {
      senderType: created.senderType,
      isDefault: created.isDefault,
    },
  });

  return created;
}

export async function updateSenderProfileForWorkspace(
  input: UpdateSenderProfileInput & {
    workspacePlanCode?: string | null;
    userId?: string;
    requestId?: string;
  },
): Promise<SenderProfile> {
  const operation = createOperationContext({
    operation: "sender_profile.update",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
  });

  if (input.senderType !== "basic") {
    await assertWorkspaceFeatureAccess({
      workspaceId: input.workspaceId,
      workspacePlanCode: input.workspacePlanCode,
      feature: "sender_aware_profiles",
    });
  }

  const updated = await getSenderProfileRepository().updateSenderProfile(input);

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.userId ?? null,
    actorType: input.userId ? "user" : "system",
    action: "sender_profile.updated",
    entityType: "sender_profile",
    entityId: updated.id,
    requestId: operation.requestId,
    changes: {
      senderType: updated.senderType,
      status: updated.status,
      isDefault: updated.isDefault,
    },
    metadata: {
      profileName: updated.name,
    },
  });

  operation.logger.info("Sender profile updated", {
    senderProfileId: updated.id,
    senderType: updated.senderType,
    isDefault: updated.isDefault,
  });

  return updated;
}



