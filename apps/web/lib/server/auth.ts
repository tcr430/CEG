import {
  getDefaultWorkspaceMembership,
  requireAuthenticatedUser,
  resolveWorkspaceAccess,
  type AuthContext,
} from "@ceg/auth";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "./supabase";
import { syncSupabaseUserToDatabase } from "./user-sync";

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

  if (user === null) {
    return {
      user: null,
    };
  }

  const synced = await syncSupabaseUserToDatabase({
    user,
  });

  return {
    user: synced.user,
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
