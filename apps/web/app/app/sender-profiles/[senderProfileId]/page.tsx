import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import { getWorkspaceBillingState } from "../../../../lib/server/billing";
import { getSenderProfileForWorkspace } from "../../../../lib/server/sender-profiles";
import { updateSenderProfileAction } from "../actions";
import { SenderProfileForm } from "../sender-profile-form";

type SenderProfileDetailPageProps = {
  params: Promise<{
    senderProfileId: string;
  }>;
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

export default async function SenderProfileDetailPage({
  params,
  searchParams,
}: SenderProfileDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(resolvedSearchParams.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const billing = await getWorkspaceBillingState({
    workspaceId: context.workspace.workspaceId,
    workspacePlanCode: context.workspace.billingPlanCode,
  });

  const profile = await getSenderProfileForWorkspace(
    context.workspace.workspaceId,
    resolvedParams.senderProfileId,
  );

  if (profile === null) {
    notFound();
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Sender Profiles</p>
        <h1>{profile.name}</h1>
        <p className="lede">
          Keep sender context explicit and editable so future campaign and
          sequence workflows can reference this profile directly.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Link
          href={`/app/sender-profiles?workspace=${context.workspace.workspaceId}`}
          className="buttonSecondary"
        >
          Back to profiles
        </Link>
      </div>

      <section className="profileDetailGrid">
        <div className="dashboardCard">
          <p className="cardLabel">Profile summary</p>
          <h2>{profile.senderType.replaceAll("_", " ")}</h2>
          <p>{profile.companyName ?? "No company set yet."}</p>
          <p>
            {profile.targetCustomer ??
              "Add target customer detail so future sender-aware messaging has sharper context."}
          </p>
          <div className="pillRow">
            <span className="pill">{profile.status}</span>
            <span className="pill">{billing.planLabel} plan</span>
            {profile.isDefault ? <span className="pill">Default</span> : null}
          </div>
        </div>

        <SenderProfileForm
          action={updateSenderProfileAction}
          workspaceId={context.workspace.workspaceId}
          submitLabel="Save changes"
          profile={profile}
          allowSenderAwareProfiles={billing.features.senderAwareProfiles.allowed}
          planLabel={billing.planLabel}
        />
      </section>
    </main>
  );
}
