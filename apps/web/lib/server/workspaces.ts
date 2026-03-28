import {
  createInMemoryWorkspaceRepository,
  type WorkspaceRepository,
} from "@ceg/database";
import type { CreateWorkspaceInput, Workspace } from "@ceg/validation";

import { getSharedAuditEventRepository } from "./audit-events";
import { createOperationContext } from "./observability";

declare global {
  var __cegWorkspaceRepository: WorkspaceRepository | undefined;
}

function getWorkspaceRepository(): WorkspaceRepository {
  if (globalThis.__cegWorkspaceRepository === undefined) {
    globalThis.__cegWorkspaceRepository = createInMemoryWorkspaceRepository();
  }

  return globalThis.__cegWorkspaceRepository;
}

export async function createWorkspaceWithAudit(
  input: CreateWorkspaceInput & { userId?: string; requestId?: string },
): Promise<Workspace> {
  const operation = createOperationContext({
    operation: "workspace.create",
    requestId: input.requestId,
    userId: input.userId ?? input.ownerUserId ?? null,
  });
  const workspace = await getWorkspaceRepository().createWorkspace(input);

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: workspace.id,
    userId: input.userId ?? input.ownerUserId ?? null,
    actorType: input.userId ? "user" : "system",
    action: "workspace.created",
    entityType: "workspace",
    entityId: workspace.id,
    requestId: operation.requestId,
    changes: {
      status: workspace.status,
      slug: workspace.slug,
    },
    metadata: {
      workspaceName: workspace.name,
    },
  });

  operation.logger.info("Workspace created", {
    workspaceSlug: workspace.slug,
    workspaceStatus: workspace.status,
  });

  return workspace;
}
