import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackBanner } from "../../../components/feedback-banner";
import { getWorkspaceAppContext } from "../../../lib/server/auth";
import { listCampaignsForWorkspace } from "../../../lib/server/campaigns";

type CampaignsPageProps = {
  searchParams?: Promise<{
    workspace?: string;
    error?: string;
    success?: string;
  }>;
};

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const workspace = context.workspace;
  const campaigns = await listCampaignsForWorkspace(workspace.workspaceId);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Campaigns</p>
        <h1>Campaign planning surface</h1>
        <p className="lede">
          Create workspace-scoped campaigns, optionally attach a sender profile,
          and keep the target ICP, industry, tone, and framework guidance ready
          for future research and generation flows.
        </p>
      </section>

      <FeedbackBanner error={params.error} success={params.success} />

      <div className="inlineActions profileHeaderActions">
        <Link href="/app" className="buttonSecondary">
          Back to dashboard
        </Link>
        <Link
          href={`/app/campaigns/new?workspace=${workspace.workspaceId}`}
          className="buttonPrimary"
        >
          New campaign
        </Link>
      </div>

      <section className="panel" aria-labelledby="campaigns-title">
        <div>
          <h2 id="campaigns-title">Workspace campaigns</h2>
          <p>
            Campaigns stay scoped to the current workspace and can operate in
            basic mode or point at a dedicated sender profile.
          </p>
        </div>

        <div className="profileList">
          {campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/app/campaigns/${campaign.id}?workspace=${workspace.workspaceId}`}
                className="profileCard"
              >
                <div className="profileCardHeader">
                  <div>
                    <p className="cardLabel">{campaign.status}</p>
                    <h2>{campaign.name}</h2>
                  </div>
                  <span className="pill">
                    {campaign.senderProfileId ? "Sender-aware" : "Basic mode"}
                  </span>
                </div>

                <p>{campaign.offerSummary ?? "No offer summary yet."}</p>
                <p>
                  {campaign.targetIcp ??
                    "Add an ICP so future research and sequencing can stay focused."}
                </p>
              </Link>
            ))
          ) : (
            <div className="dashboardCard">
              <p className="cardLabel">No campaigns yet</p>
              <h2>Create the first outbound motion</h2>
              <p>
                Start with the campaign brief. You can leave sender profile
                selection empty and run in basic mode until richer sender
                context is ready.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
