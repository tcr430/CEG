import type { WorkspaceRole } from "@ceg/auth";

export function canInviteRole(
  actorRole: WorkspaceRole,
  targetRole: Exclude<WorkspaceRole, "owner">,
): boolean {
  if (actorRole === "owner") {
    return true;
  }

  return actorRole === "admin" && targetRole === "member";
}

export function canUpdateMemberRole(input: {
  actorRole: WorkspaceRole;
  targetRole: WorkspaceRole;
  nextRole: Exclude<WorkspaceRole, "owner">;
}): boolean {
  if (input.targetRole === "owner") {
    return false;
  }

  if (input.actorRole === "owner") {
    return true;
  }

  return (
    input.actorRole === "admin" &&
    input.targetRole === "member" &&
    input.nextRole === "member"
  );
}

export function canRemoveMember(input: {
  actorRole: WorkspaceRole;
  targetRole: WorkspaceRole;
  isSelf: boolean;
}): boolean {
  if (input.isSelf || input.targetRole === "owner") {
    return false;
  }

  if (input.actorRole === "owner") {
    return true;
  }

  return input.actorRole === "admin" && input.targetRole === "member";
}

export function canEditWorkspaceSettings(actorRole: WorkspaceRole): boolean {
  return actorRole === "owner" || actorRole === "admin";
}

export function getAllowedInviteRoles(
  actorRole: WorkspaceRole,
): Array<Exclude<WorkspaceRole, "owner">> {
  return (["admin", "member"] as const).filter((role) =>
    canInviteRole(actorRole, role),
  );
}
