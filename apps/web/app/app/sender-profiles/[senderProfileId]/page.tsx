import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import {
  getWorkspaceBillingState,
  requireActiveWorkspaceAppContext,
} from "../../../../lib/server/billing";
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
  const context = await requireActiveWorkspaceAppContext(resolvedSearchParams.workspace);

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
          Keep sender context explicit and editable so future campaign and sequence workflows can reference this stored context directly instead of recreating it each time.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Button asChild variant="secondary">
          <Link href={`/app/sender-profiles?workspace=${context.workspace.workspaceId}`}>
            Back to profiles
          </Link>
        </Button>
      </div>

      <section className="profileDetailGrid">
        <Card className="p-5">
          <p className="cardLabel">Profile summary</p>
          <h2>{profile.senderType.replaceAll("_", " ")}</h2>
          <p>{profile.companyName ?? "No company set yet."}</p>
          <p>
            {profile.targetCustomer ??
              "Add target customer detail so future sender-aware messaging has sharper context."}
          </p>
          <p>
            This record preserves reusable sender voice, proof, positioning, and workflow goals so later campaign briefs and drafts can start from stored context.
          </p>
          <div className="pillRow">
            <Badge variant="secondary">{profile.status}</Badge>
            <Badge variant="secondary">{billing.planLabel} plan</Badge>
            {profile.isDefault ? <Badge variant="secondary">Default</Badge> : null}
          </div>
        </Card>

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
