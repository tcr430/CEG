import {
  getDefaultWorkspaceMembership,
  requireAuthenticatedUser,
} from "@ceg/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";

import { requireServerAuthContext } from "../../../lib/server/auth";

export default async function WorkspaceSelectionPage() {
  const context = await requireServerAuthContext();
  const user = requireAuthenticatedUser(context);
  const defaultMembership = getDefaultWorkspaceMembership(user.memberships);

  if (user.memberships.length === 1 && defaultMembership !== null) {
    redirect(`/app?workspace=${defaultMembership.workspaceId}`);
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Workspace Access</p>
        <h1>Select a workspace</h1>
        <p className="lede">
          Choose a workspace membership to enter the protected dashboard shell.
        </p>
      </section>

      <Card aria-labelledby="workspace-list-title">
        <CardContent className="p-6 flex flex-col gap-4">
          <div>
            <h2 id="workspace-list-title">Available workspaces</h2>
            <p>
              Default workspace handling prefers the explicitly marked membership,
              then falls back to the first available option.
            </p>
          </div>

          <div className="workspaceList">
            {user.memberships.length > 0 ? (
              user.memberships.map((membership) => (
                <Link
                  key={membership.workspaceId}
                  href={`/app?workspace=${membership.workspaceId}`}
                  className="workspaceOption"
                >
                  <span>
                    {membership.workspaceName ??
                      membership.workspaceSlug ??
                      membership.workspaceId}
                  </span>
                  <strong>{membership.role}</strong>
                </Link>
              ))
            ) : (
              <Card className="p-5">
                <p className="cardLabel">No memberships yet</p>
                <h2>Workspace setup pending</h2>
                <p>
                  Your account is authenticated, but no workspace memberships are
                  attached yet. This placeholder will later link into onboarding.
                </p>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
