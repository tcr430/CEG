import { AppError } from "@ceg/core";

export const workspaceRoles = ["owner", "admin", "member"] as const;

export type WorkspaceRole = (typeof workspaceRoles)[number];

export type WorkspaceMembership = {
  workspaceId: string;
  workspaceSlug?: string;
  workspaceName?: string;
  role: WorkspaceRole;
  isDefault?: boolean;
  billingPlanCode?: string;
};

export type AuthenticatedUser = {
  userId: string;
  email?: string;
  memberships: WorkspaceMembership[];
};

export type AuthContext = {
  requestId?: string;
  user: AuthenticatedUser | null;
};

export type WorkspaceAccessContext = {
  user: AuthenticatedUser;
  membership: WorkspaceMembership;
};

export class AuthenticationRequiredError extends AppError {
  constructor() {
    super("Authentication is required.", {
      code: "AUTHENTICATION_REQUIRED",
    });
  }
}

export class WorkspaceAccessDeniedError extends AppError {
  constructor(workspaceId: string) {
    super(`Access to workspace ${workspaceId} is denied.`, {
      code: "WORKSPACE_ACCESS_DENIED",
    });
  }
}

const roleRank: Record<WorkspaceRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function requireAuthenticatedUser(
  context: AuthContext,
): AuthenticatedUser {
  if (context.user === null) {
    throw new AuthenticationRequiredError();
  }

  return context.user;
}

export function hasWorkspaceRole(
  membership: WorkspaceMembership,
  minimumRole: WorkspaceRole,
): boolean {
  return roleRank[membership.role] >= roleRank[minimumRole];
}

export function canManageWorkspace(membership: WorkspaceMembership): boolean {
  return hasWorkspaceRole(membership, "admin");
}

export function getDefaultWorkspaceMembership(
  memberships: readonly WorkspaceMembership[],
): WorkspaceMembership | null {
  return (
    memberships.find((membership) => membership.isDefault) ??
    memberships[0] ??
    null
  );
}

export function getWorkspaceMembership(
  user: AuthenticatedUser,
  workspaceId: string,
): WorkspaceMembership | null {
  return (
    user.memberships.find((membership) => membership.workspaceId === workspaceId) ??
    null
  );
}

export function requireWorkspaceAccess(
  context: AuthContext,
  workspaceId: string,
  minimumRole: WorkspaceRole = "member",
): WorkspaceAccessContext {
  const user = requireAuthenticatedUser(context);
  const membership = getWorkspaceMembership(user, workspaceId);

  if (membership === null || !hasWorkspaceRole(membership, minimumRole)) {
    throw new WorkspaceAccessDeniedError(workspaceId);
  }

  return {
    user,
    membership,
  };
}

export function resolveWorkspaceAccess(
  context: AuthContext,
  workspaceId?: string | null,
): WorkspaceAccessContext | null {
  const user = context.user;

  if (user === null) {
    return null;
  }

  const membership =
    workspaceId === undefined || workspaceId === null
      ? getDefaultWorkspaceMembership(user.memberships)
      : getWorkspaceMembership(user, workspaceId);

  if (membership === null) {
    return null;
  }

  return {
    user,
    membership,
  };
}
