import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedbackBanner } from "../../../../components/feedback-banner";
import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import { getWorkspaceBillingState } from "../../../../lib/server/billing";
import { createSenderProfileAction } from "../actions";
import { SenderProfileForm } from "../sender-profile-form";

type NewSenderProfilePageProps = {
  searchParams?: Promise<{
    workspace?: string;
    error?: string;
  }>;
};

export default async function NewSenderProfilePage({
  searchParams,
}: NewSenderProfilePageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const billing = await getWorkspaceBillingState({
    workspaceId: context.workspace.workspaceId,
    workspacePlanCode: context.workspace.billingPlanCode,
  });

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Sender Profiles</p>
        <h1>Create a sender profile</h1>
        <p className="lede">
          Sender profiles shape message quality. Use a dedicated profile for SDR,
          founder, or agency positioning, or choose the basic mode fallback when
          sender-aware context is not available yet.
        </p>
      </section>

      <FeedbackBanner error={params.error} />

      <div className="inlineActions profileHeaderActions">
        <Link
          href={`/app/sender-profiles?workspace=${context.workspace.workspaceId}`}
          className="buttonSecondary"
        >
          Back to profiles
        </Link>
      </div>

      <SenderProfileForm
        action={createSenderProfileAction}
        workspaceId={context.workspace.workspaceId}
        submitLabel="Create sender profile"
        allowSenderAwareProfiles={billing.features.senderAwareProfiles.allowed}
        planLabel={billing.planLabel}
      />
    </main>
  );
}
