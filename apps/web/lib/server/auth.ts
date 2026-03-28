import {
  getDefaultWorkspaceMembership,
  requireAuthenticatedUser,
  resolveWorkspaceAccess,
  type AuthContext,
  type AuthenticatedUser,
  type WorkspaceMembership,
} from "@ceg/auth";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "./supabase";

type SupabaseMetadataMembership = {
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  role?: unknown;
  is_default?: unknown;
  plan_code?: unknown;
};

function parseMemberships(value: unknown): WorkspaceMembership[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((membership): WorkspaceMembership | null => {
      if (
        typeof membership !== "object" ||
        membership === null ||
        !("id" in membership) ||
        !("role" in membership)
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

function mapSupabaseUserToAuthenticatedUser(user: {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}): AuthenticatedUser {
  const appMetadata = user.app_metadata ?? {};
  const userMetadata = user.user_metadata ?? {};

  const memberships = parseMemberships(
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

export async function getServerAuthContext(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();

  if (supabase === null) {
    return {
      user: null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    user: user === null ? null : mapSupabaseUserToAuthenticatedUser(user),
  };
}

export async function requireServerAuthContext(): Promise<AuthContext> {
  const context = await getServerAuthContext();

  if (context.user === null) {
    redirect("/sign-in");
  }

  return context;
}

export async function getWorkspaceAppContext(selectedWorkspaceId?: string) {
  const context = await requireServerAuthContext();
  const user = requireAuthenticatedUser(context);
  const explicitDefault = user.memberships.some(
    (membership) => membership.isDefault === true,
  );
  const access = resolveWorkspaceAccess(context, selectedWorkspaceId);

  if (access !== null) {
    return {
      auth: context,
      user,
      workspace: access.membership,
      needsWorkspaceSelection: false,
    };
  }

  const defaultMembership = getDefaultWorkspaceMembership(user.memberships);

  return {
    auth: context,
    user,
    workspace: defaultMembership,
    needsWorkspaceSelection:
      user.memberships.length > 1 && explicitDefault === false,
  };
}
