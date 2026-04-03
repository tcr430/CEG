import {
  createInMemoryWorkspaceRepository,
  type WorkspaceRepository,
} from "@ceg/database";
import type { WorkspaceMembership } from "@ceg/auth";
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

function normalizeWorkspaceSlug(membership: WorkspaceMembership): string {
  const source =
    membership.workspaceSlug ??
    membership.workspaceName ??
    membership.workspaceId.slice(0, 8);

  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return normalized.length > 0
    ? normalized
    : `workspace-${membership.workspaceId.slice(0, 8)}`;
}

function resolveWorkspaceName(membership: WorkspaceMembership): string {
  return (
    membership.workspaceName ??
    membership.workspaceSlug ??
    `Workspace ${membership.workspaceId.slice(0, 8)}`
  );
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

export async function getWorkspaceRecordById(
  workspaceId: string,
): Promise<Workspace | null> {
  return getWorkspaceRepository().getWorkspaceById(workspaceId);
}

export async function ensureWorkspaceRecordForMembership(input: {
  membership: WorkspaceMembership;
  userId?: string | null;
}): Promise<Workspace> {
  const existing = await getWorkspaceRepository().getWorkspaceById(
    input.membership.workspaceId,
  );

  if (existing !== null) {
    return existing;
  }

  const operation = createOperationContext({
    operation: "workspace.ensure_record",
    workspaceId: input.membership.workspaceId,
    userId: input.userId ?? null,
  });

  const created = await getWorkspaceRepository().createWorkspaceRecord({
    id: input.membership.workspaceId,
    slug: normalizeWorkspaceSlug(input.membership),
    name: resolveWorkspaceName(input.membership),
    ownerUserId: input.membership.role === "owner" ? input.userId ?? null : null,
    status: "active",
    settings: {},
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: created.id,
    userId: input.userId ?? null,
    actorType: input.userId ? "user" : "system",
    action: "workspace.created",
    entityType: "workspace",
    entityId: created.id,
    requestId: operation.requestId,
    changes: {
      status: created.status,
      slug: created.slug,
      seededFromMembership: true,
    },
    metadata: {
      workspaceName: created.name,
    },
  });

  operation.logger.info("Workspace record ensured from membership", {
    workspaceSlug: created.slug,
  });

  return created;
}

export async function updateWorkspaceSettings(input: {
  workspaceId: string;
  settings: Workspace["settings"];
}): Promise<Workspace> {
  return getWorkspaceRepository().updateWorkspaceSettings({
    workspaceId: input.workspaceId,
    settings: input.settings,
  });
}
