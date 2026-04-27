import Link from "next/link";

import { Button } from "@/components/ui/button";

import {
  getWorkspaceBillingState,
  requireActiveWorkspaceAppContext,
} from "../../../../lib/server/billing";
import { createSenderProfileAction } from "../actions";
import { SenderProfileForm } from "../sender-profile-form";

type NewSenderProfilePageProps = {
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

export default async function NewSenderProfilePage({
  searchParams,
}: NewSenderProfilePageProps) {
  const params = (await searchParams) ?? {};
  const context = await requireActiveWorkspaceAppContext(params.workspace);

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

      <div className="inlineActions profileHeaderActions">
        <Button asChild variant="secondary">
          <Link href={`/app/sender-profiles?workspace=${context.workspace.workspaceId}`}>
            Back to profiles
          </Link>
        </Button>
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
