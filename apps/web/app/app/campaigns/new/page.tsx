import Link from "next/link";
import { redirect } from "next/navigation";

import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import { listSenderProfilesForWorkspace } from "../../../../lib/server/sender-profiles";
import { createCampaignAction } from "../actions";
import { CampaignForm } from "../campaign-form";

type NewCampaignPageProps = {
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

export default async function NewCampaignPage({
  searchParams,
}: NewCampaignPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const senderProfiles = await listSenderProfilesForWorkspace(
    context.workspace.workspaceId,
  );

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Campaigns</p>
        <h1>Create a campaign</h1>
        <p className="lede">
          Define the campaign brief first: offer, ICP, industries, tone, and
          framework guidance. Attach a sender profile when you want a
          sender-aware motion, or leave it empty for a basic-mode start.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Link
          href={`/app/campaigns?workspace=${context.workspace.workspaceId}`}
          className="buttonSecondary"
        >
          Back to campaigns
        </Link>
      </div>

      <CampaignForm
        action={createCampaignAction}
        workspaceId={context.workspace.workspaceId}
        senderProfiles={senderProfiles}
        submitLabel="Create campaign"
      />
    </main>
  );
}
