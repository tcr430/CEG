import "server-only";

import { randomUUID } from "node:crypto";

import type { AuthenticatedUser, WorkspaceMembership } from "@ceg/auth";
import type { WorkspaceMember } from "@ceg/validation";

import { createOperationContext } from "./observability";
import {
  mapSupabaseUserToMetadataAuthUser,
  parseSupabaseMetadataMemberships,
  type SupabaseAuthUserLike,
} from "./auth-metadata";
import {
  getUserRepository,
  getWorkspaceMemberRepository,
  getWorkspaceRepository,
} from "./database";

type SyncResult = {
  user: AuthenticatedUser;
  source: "database" | "metadata";
};

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

function normalizeSelfServeWorkspaceSlug(input: {
  email?: string;
  workspaceId: string;
}): string {
  const emailLocalPart = input.email?.split("@")[0] ?? "workspace";
  const normalized = emailLocalPart
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const prefix = normalized.length > 0 ? normalized : "workspace";

  return `${prefix}-${input.workspaceId.slice(0, 8)}`;
}

function resolveSelfServeWorkspaceName(email?: string): string {
  const emailLocalPart = email?.split("@")[0];

  if (emailLocalPart && emailLocalPart.trim().length > 0) {
    return `${emailLocalPart.trim()}'s workspace`;
  }

  return "New OutFlow workspace";
}

function readFullName(user: SupabaseAuthUserLike): string | null {
  const metadata = user.user_metadata ?? {};
  const fullName = metadata.full_name ?? metadata.name;
  return typeof fullName === "string" && fullName.trim().length > 0
    ? fullName.trim()
    : null;
}

function readAvatarUrl(user: SupabaseAuthUserLike): string | null {
  const metadata = user.user_metadata ?? {};
  const avatarUrl = metadata.avatar_url;
  return typeof avatarUrl === "string" && avatarUrl.trim().length > 0
    ? avatarUrl.trim()
    : null;
}

function mapDatabaseMemberships(input: {
  memberships: WorkspaceMember[];
  workspaceNames: Map<string, { slug: string; name: string }>;
}): WorkspaceMembership[] {
  return input.memberships.map((membership, index) => {
    const workspace = input.workspaceNames.get(membership.workspaceId);
    return {
      workspaceId: membership.workspaceId,
      workspaceSlug: workspace?.slug,
      workspaceName: workspace?.name,
      role: membership.role,
      isDefault: index === 0,
    } satisfies WorkspaceMembership;
  });
}

export async function syncSupabaseUserToDatabase(input: {
  user: SupabaseAuthUserLike;
  requestId?: string;
}): Promise<SyncResult> {
  const metadataUser = mapSupabaseUserToMetadataAuthUser(input.user);
  const userRepository = getUserRepository();
  const membershipRepository = getWorkspaceMemberRepository();

  if (userRepository === null || membershipRepository === null) {
    return {
      user: metadataUser,
      source: "metadata",
    };
  }

  const operation = createOperationContext({
    operation: "auth.user_sync",
    requestId: input.requestId,
    userId: input.user.id,
  });
  const existingUserByEmail =
    input.user.email === undefined
      ? null
      : await userRepository.getUserByEmail(input.user.email);
  const localUserId = existingUserByEmail?.id ?? input.user.id;

  await userRepository.upsertUser({
    id: localUserId,
    email: input.user.email ?? `${input.user.id}@placeholder.local`,
    fullName: readFullName(input.user),
    avatarUrl: readAvatarUrl(input.user),
    authProvider: "supabase",
    authProviderSubject: input.user.id,
    status: "active",
  });

  const metadataMemberships = parseSupabaseMetadataMemberships(
    input.user.app_metadata?.workspaces ?? input.user.user_metadata?.workspaces,
  );
  const workspaceRepository = getWorkspaceRepository();

  await membershipRepository.activateWorkspaceMembershipsByUserId(localUserId);

  for (const membership of metadataMemberships) {
    await workspaceRepository.createWorkspaceRecord({
      id: membership.workspaceId,
      slug: normalizeWorkspaceSlug(membership),
      name: resolveWorkspaceName(membership),
      ownerUserId: membership.role === "owner" ? localUserId : null,
      status: "active",
      settings: {},
    });

    await membershipRepository.upsertWorkspaceMember({
      workspaceId: membership.workspaceId,
      userId: localUserId,
      role: membership.role,
      status: "active",
      joinedAt: new Date(),
    });
  }

  let memberships = await membershipRepository.listWorkspaceMembershipsByUserId(localUserId);

  if (memberships.length === 0 && metadataMemberships.length === 0) {
    const workspaceId = randomUUID();

    await workspaceRepository.createWorkspaceRecord({
      id: workspaceId,
      slug: normalizeSelfServeWorkspaceSlug({
        email: input.user.email,
        workspaceId,
      }),
      name: resolveSelfServeWorkspaceName(input.user.email),
      ownerUserId: localUserId,
      status: "active",
      settings: {},
    });

    await membershipRepository.upsertWorkspaceMember({
      workspaceId,
      userId: localUserId,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
    });

    memberships = await membershipRepository.listWorkspaceMembershipsByUserId(localUserId);
  }

  if (memberships.length === 0) {
    operation.logger.warn(
      "No workspace memberships found after sync; falling back to metadata",
    );
    return {
      user: metadataUser,
      source: "metadata",
    };
  }

  const workspaceNames = new Map<string, { slug: string; name: string }>();
  await Promise.all(
    memberships.map(async (membership) => {
      const workspace = await workspaceRepository.getWorkspaceById(
        membership.workspaceId,
      );
      if (workspace !== null) {
        workspaceNames.set(membership.workspaceId, {
          slug: workspace.slug,
          name: workspace.name,
        });
      }
    }),
  );

  operation.logger.info("Supabase user synced to database", {
    localUserId,
    membershipCount: memberships.length,
    membershipSource:
      metadataMemberships.length > 0 ? "metadata_bootstrap" : "database_only",
  });

  return {
    user: {
      userId: localUserId,
      email: input.user.email,
      memberships: mapDatabaseMemberships({
        memberships,
        workspaceNames,
      }),
    },
    source: "database",
  };
}

export async function getSupabaseProductAccount(input: {
  user: SupabaseAuthUserLike;
  requestId?: string;
}): Promise<SyncResult | null> {
  const metadataUser = mapSupabaseUserToMetadataAuthUser(input.user);
  const userRepository = getUserRepository();
  const membershipRepository = getWorkspaceMemberRepository();

  if (userRepository === null || membershipRepository === null) {
    return metadataUser.memberships.length > 0
      ? {
          user: metadataUser,
          source: "metadata",
        }
      : null;
  }

  const operation = createOperationContext({
    operation: "auth.product_account_lookup",
    requestId: input.requestId,
    userId: input.user.id,
  });
  const localUser =
    (await userRepository.getUserById(input.user.id)) ??
    (input.user.email ? await userRepository.getUserByEmail(input.user.email) : null);

  if (localUser === null || localUser.status !== "active") {
    operation.logger.warn("No active product account found for authenticated identity");
    return null;
  }

  const workspaceRepository = getWorkspaceRepository();
  const memberships = await membershipRepository.listWorkspaceMembershipsByUserId(localUser.id);

  if (memberships.length === 0) {
    operation.logger.warn("Product account has no active workspace memberships");
    return null;
  }

  const workspaceNames = new Map<string, { slug: string; name: string }>();
  await Promise.all(
    memberships.map(async (membership) => {
      const workspace = await workspaceRepository.getWorkspaceById(
        membership.workspaceId,
      );
      if (workspace !== null) {
        workspaceNames.set(membership.workspaceId, {
          slug: workspace.slug,
          name: workspace.name,
        });
      }
    }),
  );

  return {
    user: {
      userId: localUser.id,
      email: localUser.email,
      memberships: mapDatabaseMemberships({
        memberships,
        workspaceNames,
      }),
    },
    source: "database",
  };
}



