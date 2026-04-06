import "server-only";

import { randomUUID } from "node:crypto";

import type { WorkspaceMembership } from "@ceg/auth";
import type { Workspace, WorkspaceMember, WorkspaceProfileSettings } from "@ceg/validation";

import {
  canEditWorkspaceSettings,
  canInviteRole,
  canRemoveMember,
  canUpdateMemberRole,
  getAllowedInviteRoles,
} from "../workspace-team-policy";
import { getSharedAuditEventRepository } from "./audit-events";
import { getUserRepository, getWorkspaceMemberRepository } from "./database";
import { createOperationContext } from "./observability";
import { getWorkspaceRecordById, updateWorkspaceProfile as persistWorkspaceProfile } from "./workspaces";

export type WorkspaceMemberView = {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: WorkspaceMember["role"];
  status: WorkspaceMember["status"];
  joinedAt: Date | null;
  isCurrentUser: boolean;
  canEditRole: boolean;
  canRemove: boolean;
};

export type WorkspaceTeamState = {
  workspace: Workspace;
  profile: WorkspaceProfileSettings;
  members: WorkspaceMemberView[];
  permissions: {
    canEditWorkspace: boolean;
    canManageTeam: boolean;
    allowedInviteRoles: Array<"admin" | "member">;
  };
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseWorkspaceProfile(settings: Workspace["settings"]): WorkspaceProfileSettings {
  const candidate =
    typeof settings === "object" && settings !== null && "profile" in settings
      ? (settings as { profile?: unknown }).profile
      : null;

  if (typeof candidate !== "object" || candidate === null) {
    return {
      description: null,
      websiteUrl: null,
      companyName: null,
      supportEmail: null,
    };
  }

  const profile = candidate as Record<string, unknown>;

  return {
    description: typeof profile.description === "string" ? profile.description : null,
    websiteUrl: typeof profile.websiteUrl === "string" ? profile.websiteUrl : null,
    companyName: typeof profile.companyName === "string" ? profile.companyName : null,
    supportEmail: typeof profile.supportEmail === "string" ? profile.supportEmail : null,
  };
}

function assertWorkspaceMembershipScope(actorMembership: WorkspaceMembership, workspaceId: string) {
  if (actorMembership.workspaceId !== workspaceId) {
    throw new Error("Workspace access is denied.");
  }
}

async function getWorkspaceOrThrow(workspaceId: string) {
  const workspace = await getWorkspaceRecordById(workspaceId);

  if (workspace === null) {
    throw new Error("Workspace not found.");
  }

  return workspace;
}

async function getWorkspaceMemberOrThrow(workspaceId: string, userId: string) {
  const repository = getWorkspaceMemberRepository();

  if (repository === null) {
    throw new Error("Workspace membership repository is unavailable.");
  }

  const membership = await repository.getWorkspaceMembership(workspaceId, userId);

  if (membership === null) {
    throw new Error("Workspace member not found.");
  }

  return membership;
}

export async function getWorkspaceTeamState(input: {
  workspaceId: string;
  actorUserId: string;
  actorMembership: WorkspaceMembership;
}): Promise<WorkspaceTeamState> {
  assertWorkspaceMembershipScope(input.actorMembership, input.workspaceId);

  const workspace = await getWorkspaceOrThrow(input.workspaceId);
  const memberRepository = getWorkspaceMemberRepository();
  const userRepository = getUserRepository();

  if (memberRepository === null || userRepository === null) {
    throw new Error("Workspace team management is unavailable right now.");
  }

  const memberships = await memberRepository.listWorkspaceMembersByWorkspaceId(input.workspaceId);
  const members = await Promise.all(
    memberships.map(async (membership) => {
      const user = await userRepository.getUserById(membership.userId);
      const isCurrentUser = membership.userId === input.actorUserId;
      const canEditRole = canUpdateMemberRole({
        actorRole: input.actorMembership.role,
        targetRole: membership.role,
        nextRole: membership.role === "owner" ? "member" : membership.role,
      });
      const canRemove = canRemoveMember({
        actorRole: input.actorMembership.role,
        targetRole: membership.role,
        isSelf: isCurrentUser,
      });

      return {
        membershipId: membership.id,
        userId: membership.userId,
        email: user?.email ?? "Unknown email",
        fullName: user?.fullName ?? null,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt ?? null,
        isCurrentUser,
        canEditRole,
        canRemove,
      } satisfies WorkspaceMemberView;
    }),
  );

  return {
    workspace,
    profile: parseWorkspaceProfile(workspace.settings),
    members,
    permissions: {
      canEditWorkspace: canEditWorkspaceSettings(input.actorMembership.role),
      canManageTeam: canEditWorkspaceSettings(input.actorMembership.role),
      allowedInviteRoles: getAllowedInviteRoles(input.actorMembership.role),
    },
  };
}

export async function inviteWorkspaceMember(input: {
  workspaceId: string;
  actorUserId: string;
  actorEmail?: string;
  actorMembership: WorkspaceMembership;
  email: string;
  role: "admin" | "member";
  requestId?: string;
}): Promise<WorkspaceMember> {
  assertWorkspaceMembershipScope(input.actorMembership, input.workspaceId);

  if (!canInviteRole(input.actorMembership.role, input.role)) {
    throw new Error("You do not have permission to invite that role.");
  }

  const normalizedEmail = normalizeEmail(input.email);
  if (input.actorEmail && normalizeEmail(input.actorEmail) === normalizedEmail) {
    throw new Error("You are already a member of this workspace.");
  }

  const memberRepository = getWorkspaceMemberRepository();
  const userRepository = getUserRepository();

  if (memberRepository === null || userRepository === null) {
    throw new Error("Workspace team management is unavailable right now.");
  }

  const operation = createOperationContext({
    operation: "workspace.member.invite",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
  });

  const existingUser = await userRepository.getUserByEmail(normalizedEmail);
  const invitedUser = await userRepository.upsertUser({
    id: existingUser?.id ?? randomUUID(),
    email: normalizedEmail,
    fullName: existingUser?.fullName ?? null,
    avatarUrl: existingUser?.avatarUrl ?? null,
    authProvider: existingUser?.authProvider ?? null,
    authProviderSubject: existingUser?.authProviderSubject ?? null,
    status: existingUser?.status === "active" ? "active" : "invited",
  });

  const existingMembership = await memberRepository.getWorkspaceMembership(
    input.workspaceId,
    invitedUser.id,
  );

  if (existingMembership?.status === "active") {
    throw new Error("That user already has access to this workspace.");
  }

  const membership = await memberRepository.upsertWorkspaceMember({
    workspaceId: input.workspaceId,
    userId: invitedUser.id,
    role: input.role,
    status: existingUser?.status === "active" ? "active" : "invited",
    invitedByUserId: input.actorUserId,
    joinedAt: existingUser?.status === "active" ? new Date() : null,
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    actorType: "user",
    action: existingMembership ? "workspace.member.invite_updated" : "workspace.member.invited",
    entityType: "workspace_member",
    entityId: membership.id,
    requestId: operation.requestId,
    changes: {
      userId: invitedUser.id,
      email: normalizedEmail,
      role: membership.role,
      status: membership.status,
    },
    metadata: {
      invitedUserStatus: invitedUser.status,
    },
  });

  operation.logger.info("Workspace member invited", {
    invitedUserId: invitedUser.id,
    invitedEmail: normalizedEmail,
    invitedRole: membership.role,
    membershipStatus: membership.status,
  });

  return membership;
}

export async function updateWorkspaceMemberRole(input: {
  workspaceId: string;
  actorUserId: string;
  actorMembership: WorkspaceMembership;
  targetUserId: string;
  role: "admin" | "member";
  requestId?: string;
}): Promise<WorkspaceMember> {
  assertWorkspaceMembershipScope(input.actorMembership, input.workspaceId);

  const memberRepository = getWorkspaceMemberRepository();
  if (memberRepository === null) {
    throw new Error("Workspace team management is unavailable right now.");
  }

  const existingMembership = await getWorkspaceMemberOrThrow(
    input.workspaceId,
    input.targetUserId,
  );

  if (
    !canUpdateMemberRole({
      actorRole: input.actorMembership.role,
      targetRole: existingMembership.role,
      nextRole: input.role,
    })
  ) {
    throw new Error("You do not have permission to change that member role.");
  }

  const operation = createOperationContext({
    operation: "workspace.member.role_update",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
  });

  const updatedMembership = await memberRepository.updateWorkspaceMemberRole({
    workspaceId: input.workspaceId,
    userId: input.targetUserId,
    role: input.role,
    updatedByUserId: input.actorUserId,
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    actorType: "user",
    action: "workspace.member.role_updated",
    entityType: "workspace_member",
    entityId: updatedMembership.id,
    requestId: operation.requestId,
    changes: {
      fromRole: existingMembership.role,
      toRole: updatedMembership.role,
      userId: updatedMembership.userId,
    },
    metadata: {},
  });

  return updatedMembership;
}

export async function removeWorkspaceMember(input: {
  workspaceId: string;
  actorUserId: string;
  actorMembership: WorkspaceMembership;
  targetUserId: string;
  requestId?: string;
}): Promise<void> {
  assertWorkspaceMembershipScope(input.actorMembership, input.workspaceId);

  const memberRepository = getWorkspaceMemberRepository();
  if (memberRepository === null) {
    throw new Error("Workspace team management is unavailable right now.");
  }

  const existingMembership = await getWorkspaceMemberOrThrow(
    input.workspaceId,
    input.targetUserId,
  );
  const isSelf = input.targetUserId === input.actorUserId;

  if (
    !canRemoveMember({
      actorRole: input.actorMembership.role,
      targetRole: existingMembership.role,
      isSelf,
    })
  ) {
    throw new Error("You do not have permission to remove that member.");
  }

  const operation = createOperationContext({
    operation: "workspace.member.remove",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
  });

  await memberRepository.removeWorkspaceMember({
    workspaceId: input.workspaceId,
    userId: input.targetUserId,
    removedByUserId: input.actorUserId,
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    actorType: "user",
    action: "workspace.member.removed",
    entityType: "workspace_member",
    entityId: existingMembership.id,
    requestId: operation.requestId,
    changes: {
      userId: existingMembership.userId,
      role: existingMembership.role,
      status: existingMembership.status,
    },
    metadata: {},
  });
}

export async function updateWorkspaceProfileSettings(input: {
  workspaceId: string;
  actorUserId: string;
  actorMembership: WorkspaceMembership;
  name: string;
  profile: WorkspaceProfileSettings;
  requestId?: string;
}): Promise<Workspace> {
  assertWorkspaceMembershipScope(input.actorMembership, input.workspaceId);

  if (!canEditWorkspaceSettings(input.actorMembership.role)) {
    throw new Error("You do not have permission to update workspace settings.");
  }

  const existingWorkspace = await getWorkspaceOrThrow(input.workspaceId);
  const operation = createOperationContext({
    operation: "workspace.profile.update",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
  });

  const workspace = await persistWorkspaceProfile({
    workspaceId: input.workspaceId,
    name: input.name,
    profile: input.profile,
  });

  await getSharedAuditEventRepository().createAuditEvent({
    workspaceId: input.workspaceId,
    userId: input.actorUserId,
    actorType: "user",
    action: "workspace.settings.updated",
    entityType: "workspace",
    entityId: workspace.id,
    requestId: operation.requestId,
    changes: {
      previousName: existingWorkspace.name,
      nextName: workspace.name,
      profile: input.profile,
    },
    metadata: {},
  });

  return workspace;
}



