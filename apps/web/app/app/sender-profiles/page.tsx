import Link from "next/link";
import { redirect } from "next/navigation";

import { getWorkspaceAppContext } from "../../../lib/server/auth";
import { getWorkspaceBillingState } from "../../../lib/server/billing";
import { listSenderProfilesForWorkspace } from "../../../lib/server/sender-profiles";

type SenderProfilesPageProps = {
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

export default async function SenderProfilesPage({
  searchParams,
}: SenderProfilesPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const workspace = context.workspace;
  const billing = await getWorkspaceBillingState({
    workspaceId: workspace.workspaceId,
    workspacePlanCode: workspace.billingPlanCode,
  });
  const profiles = await listSenderProfilesForWorkspace(workspace.workspaceId);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Sender Profiles</p>
        <h1>Sender profile library</h1>
        <p className="lede">
          Create and refine sender-aware profile context for SDRs, founders,
          agencies, or a basic fallback mode. Campaigns will later select from
          these profiles directly.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Link href="/app" className="buttonSecondary">
          Back to dashboard
        </Link>
        <Link
          href={`/app/sender-profiles/new?workspace=${workspace.workspaceId}`}
          className="buttonPrimary"
        >
          New sender profile
        </Link>
        <span className="pill">{billing.planLabel} plan</span>
      </div>

      <section className="panel" aria-labelledby="sender-profiles-title">
        <div>
          <h2 id="sender-profiles-title">Workspace profiles</h2>
          <p>
            Profiles are scoped to the current workspace and can later be linked
            to campaigns for higher-quality personalization.
          </p>
          {!billing.features.senderAwareProfiles.allowed ? (
            <p className="statusMessage">
              Sender-aware SDR, founder, and agency profiles are gated on this plan.
              Basic mode remains available.
            </p>
          ) : null}
        </div>

        <div className="profileList">
          {profiles.length > 0 ? (
            profiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/app/sender-profiles/${profile.id}?workspace=${workspace.workspaceId}`}
                className="profileCard"
              >
                <div className="profileCardHeader">
                  <div>
                    <p className="cardLabel">{profile.senderType.replaceAll("_", " ")}</p>
                    <h2>{profile.name}</h2>
                  </div>
                  {profile.isDefault ? <span className="pill">Default</span> : null}
                </div>

                <p>{profile.companyName ?? "No company name yet"}</p>
                <p>
                  {profile.valueProposition ??
                    "Add a value proposition to improve future sender-aware outputs."}
                </p>
              </Link>
            ))
          ) : (
            <div className="dashboardCard">
              <p className="cardLabel">No sender profiles yet</p>
              <h2>Start with a profile or use basic mode</h2>
              <p>
                Create a sender profile for richer outbound context, or keep
                basic mode as your fallback when sender-aware details are not
                ready yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
