import Link from "next/link";
import { redirect } from "next/navigation";

import { getWorkspaceAppContext } from "../../lib/server/auth";
import { listCampaignsForWorkspace } from "../../lib/server/campaigns";
import { listSenderProfilesForWorkspace } from "../../lib/server/sender-profiles";

type DashboardPageProps = {
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null) {
    redirect("/app/workspaces");
  }

  if (context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const [senderProfiles, campaigns] = await Promise.all([
    listSenderProfilesForWorkspace(context.workspace.workspaceId),
    listCampaignsForWorkspace(context.workspace.workspaceId),
  ]);

  return (
    <main className="appShell">
      <aside className="sidebar">
        <p className="eyebrow">Protected App</p>
        <h1 className="appTitle">Dashboard shell</h1>
        <p className="sidebarText">
          This area is only available to authenticated users and resolves a
          workspace membership before loading product modules.
        </p>

        <div className="workspaceBadge">
          <span>{context.workspace.workspaceName ?? "Unnamed workspace"}</span>
          <strong>{context.workspace.role}</strong>
        </div>

        <div className="inlineActions">
          <Link href="/app/workspaces" className="buttonSecondary">
            Switch workspace
          </Link>
          <Link
            href={`/app/sender-profiles?workspace=${context.workspace.workspaceId}`}
            className="buttonSecondary"
          >
            Sender profiles
          </Link>
          <Link
            href={`/app/campaigns?workspace=${context.workspace.workspaceId}`}
            className="buttonSecondary"
          >
            Campaigns
          </Link>
          <Link
            href={`/app/settings?workspace=${context.workspace.workspaceId}`}
            className="buttonSecondary"
          >
            Billing
          </Link>
          <form action="/auth/sign-out" method="post">
            <button type="submit" className="buttonGhost">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <section className="dashboardPanel">
        <div className="dashboardCard">
          <p className="cardLabel">Authenticated user</p>
          <h2>{context.user.email ?? "Signed-in user"}</h2>
          <p>
            Workspace context is loaded on the server using auth metadata and
            role-aware helpers from <code>@ceg/auth</code>.
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Current workspace</p>
          <h2>{context.workspace.workspaceSlug ?? context.workspace.workspaceId}</h2>
          <p>
            Sender profiles and campaign records are now first-class concepts,
            ready for future research, sequencing, and sender-aware outbound
            quality improvements.
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Sender profile coverage</p>
          <h2>{senderProfiles.length} profile(s)</h2>
          <p>
            {senderProfiles.length > 0
              ? "Review or update sender context before wiring campaigns to specific profiles."
              : "Create your first sender profile, or fall back to basic mode when sender-specific context is not ready yet."}
          </p>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Campaign coverage</p>
          <h2>{campaigns.length} campaign(s)</h2>
          <p>
            {campaigns.length > 0
              ? "Refine campaign briefs and add prospects before wiring in research or generation."
              : "Create a campaign to capture offer, ICP, tone, and optional sender-profile selection in one workspace-scoped record."}
          </p>
        </div>
      </section>
    </main>
  );
}
