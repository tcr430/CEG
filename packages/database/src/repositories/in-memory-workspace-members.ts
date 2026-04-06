import { randomUUID } from "node:crypto";

import type {
  RemoveWorkspaceMemberInput,
  UpdateWorkspaceMemberRoleInput,
  UpsertWorkspaceMemberInput,
  WorkspaceMember,
} from "@ceg/validation";

import type { WorkspaceMemberRepository } from "./workspace-members.js";
import {
  validateRemoveWorkspaceMemberInput,
  validateUpdateWorkspaceMemberRoleInput,
  validateUpsertWorkspaceMemberInput,
  validateWorkspaceId,
} from "./shared.js";

function roleRank(role: WorkspaceMember["role"]) {
  switch (role) {
    case "owner":
      return 3;
    case "admin":
      return 2;
    default:
      return 1;
  }
}

export function createInMemoryWorkspaceMemberRepository(
  initialMembers: WorkspaceMember[] = [],
): WorkspaceMemberRepository {
  const records = new Map(
    initialMembers.map((membership) => [membership.id, membership] as const),
  );

  return {
    async upsertWorkspaceMember(input: UpsertWorkspaceMemberInput) {
      const values = validateUpsertWorkspaceMemberInput(input);
      const existing =
        [...records.values()].find(
          (membership) =>
            membership.workspaceId === values.workspaceId &&
            membership.userId === values.userId,
        ) ?? null;
      const now = new Date();
      const record: WorkspaceMember = {
        id: existing?.id ?? randomUUID(),
        workspaceId: values.workspaceId,
        userId: values.userId,
        role: values.role,
        status: values.status,
        invitedByUserId: values.invitedByUserId ?? null,
        joinedAt: values.joinedAt ?? existing?.joinedAt ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      records.set(record.id, record);
      return record;
    },
    async getWorkspaceMembership(workspaceId, userId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return (
        [...records.values()].find(
          (membership) =>
            membership.workspaceId === validatedWorkspaceId &&
            membership.userId === userId,
        ) ?? null
      );
    },
    async listWorkspaceMembersByWorkspaceId(workspaceId) {
      const validatedWorkspaceId = validateWorkspaceId(workspaceId);
      return [...records.values()]
        .filter((membership) => membership.workspaceId === validatedWorkspaceId)
        .sort((left, right) => {
          const rank = roleRank(right.role) - roleRank(left.role);
          if (rank !== 0) {
            return rank;
          }

          return left.createdAt.getTime() - right.createdAt.getTime();
        });
    },
    async activateWorkspaceMembershipsByUserId(userId) {
      let activated = 0;
      for (const [id, membership] of records.entries()) {
        if (membership.userId === userId && membership.status === "invited") {
          records.set(id, {
            ...membership,
            status: "active",
            joinedAt: membership.joinedAt ?? new Date(),
            updatedAt: new Date(),
          });
          activated += 1;
        }
      }

      return activated;
    },
    async updateWorkspaceMemberRole(input: UpdateWorkspaceMemberRoleInput) {
      const values = validateUpdateWorkspaceMemberRoleInput(input);
      const existing =
        [...records.values()].find(
          (membership) =>
            membership.workspaceId === values.workspaceId &&
            membership.userId === values.userId,
        ) ?? null;

      if (existing === null) {
        throw new Error("Workspace member not found.");
      }

      const updated: WorkspaceMember = {
        ...existing,
        role: values.role,
        updatedAt: new Date(),
      };
      records.set(updated.id, updated);
      return updated;
    },
    async removeWorkspaceMember(input: RemoveWorkspaceMemberInput) {
      const values = validateRemoveWorkspaceMemberInput(input);
      const existing =
        [...records.entries()].find(
          ([, membership]) =>
            membership.workspaceId === values.workspaceId &&
            membership.userId === values.userId,
        ) ?? null;

      if (existing !== null) {
        records.delete(existing[0]);
      }
    },
    async listWorkspaceMembershipsByUserId(userId) {
      return [...records.values()]
        .filter(
          (membership) =>
            membership.userId === userId && membership.status === "active",
        )
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    },
  };
}
