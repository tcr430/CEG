import type { AuthenticatedUser, WorkspaceMembership } from "@ceg/auth";

type SupabaseMetadataMembership = {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  role?: unknown;
  is_default?: unknown;
  plan_code?: unknown;
};

export type SupabaseAuthUserLike = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

export function parseSupabaseMetadataMemberships(
  value: unknown,
): WorkspaceMembership[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((membership): WorkspaceMembership | null => {
      if (
        typeof membership !== "object" ||
        membership === null ||
        !('id' in membership) ||
        !('role' in membership)
      ) {
        return null;
      }

      const candidate = membership as SupabaseMetadataMembership;
      const role = candidate.role;
      const workspaceId = candidate.id;

      if (
        typeof workspaceId !== "string" ||
        (role !== "owner" && role !== "admin" && role !== "member")
      ) {
        return null;
      }

      return {
        workspaceId,
        workspaceSlug: typeof candidate.slug === "string" ? candidate.slug : undefined,
        workspaceName: typeof candidate.name === "string" ? candidate.name : undefined,
        role,
        isDefault: candidate.is_default === true,
        billingPlanCode:
          typeof candidate.plan_code === "string" ? candidate.plan_code : undefined,
      };
    })
    .filter((membership): membership is WorkspaceMembership => membership !== null);
}

export function mapSupabaseUserToMetadataAuthUser(
  user: SupabaseAuthUserLike,
): AuthenticatedUser {
  const appMetadata = user.app_metadata ?? {};
  const userMetadata = user.user_metadata ?? {};

  const memberships = parseSupabaseMetadataMemberships(
    appMetadata.workspaces ?? userMetadata.workspaces,
  );
  const defaultWorkspaceId =
    typeof appMetadata.default_workspace_id === "string"
      ? appMetadata.default_workspace_id
      : typeof userMetadata.default_workspace_id === "string"
        ? userMetadata.default_workspace_id
        : undefined;

  return {
    userId: user.id,
    email: user.email,
    memberships: memberships.map((membership) => ({
      ...membership,
      isDefault:
        membership.isDefault === true ||
        membership.workspaceId === defaultWorkspaceId,
    })),
  };
}
