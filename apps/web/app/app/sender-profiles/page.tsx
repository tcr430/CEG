import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { ActionEmptyState } from "../../../components/action-empty-state";
import {
  getWorkspaceBillingState,
  requireActiveWorkspaceAppContext,
} from "../../../lib/server/billing";
import { getSenderProfilesEmptyState } from "../../../lib/empty-state-guidance";
import { getWorkspaceOnboardingSummary } from "../../../lib/server/onboarding";
import { listSenderProfilesForWorkspace } from "../../../lib/server/sender-profiles";

export const metadata: Metadata = {
  title: "Sender profiles",
  description: "Manage sender-aware profiles and basic-mode context.",
};

type SenderProfilesPageProps = {
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

export default async function SenderProfilesPage({
  searchParams,
}: SenderProfilesPageProps) {
  const params = (await searchParams) ?? {};
  const context = await requireActiveWorkspaceAppContext(params.workspace);

  const workspace = context.workspace;
  const billing = await getWorkspaceBillingState({
    workspaceId: workspace.workspaceId,
    workspacePlanCode: workspace.billingPlanCode,
  });
  const [profiles, onboarding] = await Promise.all([
    listSenderProfilesForWorkspace(workspace.workspaceId),
    getWorkspaceOnboardingSummary({
      membership: workspace,
      userId: context.user.userId,
    }),
  ]);
  const emptyState = getSenderProfilesEmptyState(onboarding.selectedUserType);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Sender Profiles</p>
        <h1>Sender and client context library</h1>
        <p className="lede">
          Create and refine reusable sender-aware context for SDRs, founders, agencies, or a basic fallback mode. This is one of the clearest forms of stored operational context in the product today, and later campaign workflows can select from these profiles directly.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Button asChild variant="secondary">
          <Link href="/app">Back to dashboard</Link>
        </Button>
        <Button asChild>
          <Link href={`/app/sender-profiles/new?workspace=${workspace.workspaceId}`}>
            New sender profile
          </Link>
        </Button>
        <Badge variant="secondary">{billing.planLabel} plan</Badge>
        <Button asChild variant="secondary">
          <Link href={`/app/settings?workspace=${workspace.workspaceId}`}>
            View plan settings
          </Link>
        </Button>
      </div>

      <Card className="p-6 grid gap-6" aria-labelledby="sender-profiles-title">
        <div>
          <h2 id="sender-profiles-title">Reusable sender profiles</h2>
          <p>
            Profiles are scoped to the current workspace and can later be linked to campaigns for more consistent personalization, review, and reuse across client work. They preserve sender voice, proof points, positioning, and workflow goals so teams do not need to restate them every time.
          </p>
          {!billing.features.senderAwareProfiles.allowed ? (
            <div className="stack compactStack">
              <p className="text-sm text-muted-foreground">
                Sender-aware SDR, founder, and agency profiles are gated on this plan. Basic mode remains available until the workspace is ready for richer reusable context.
              </p>
              <div className="inlineActions">
                <Button asChild variant="secondary">
                  <Link href={`/app/settings?workspace=${workspace.workspaceId}`}>
                    Review upgrade options
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          {profiles.length > 0 ? (
            profiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/app/sender-profiles/${profile.id}?workspace=${workspace.workspaceId}`}
                className="block"
              >
                <Card className="p-5 cursor-pointer transition-shadow hover:shadow-md">
                  <div className="profileCardHeader">
                    <div>
                      <p className="cardLabel">{profile.senderType.replaceAll("_", " ")}</p>
                      <h2>{profile.name}</h2>
                    </div>
                    {profile.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                  </div>

                  <p>{profile.companyName ?? "No company name yet"}</p>
                  <p>
                    {profile.valueProposition ??
                      "Add a value proposition to improve future sender-aware outputs."}
                  </p>
                  <p>Stored here: sender voice, proof points, positioning, and workflow goals that later campaigns can reuse.</p>
                </Card>
              </Link>
            ))
          ) : (
            <ActionEmptyState
              label="No sender profiles yet"
              title={emptyState.title}
              description={emptyState.description}
              nextAction={emptyState.nextAction}
              actions={
                <>
                  <Button asChild>
                    <Link href={`/app/sender-profiles/new?workspace=${workspace.workspaceId}`}>
                      Create sender profile
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/app/campaigns?workspace=${workspace.workspaceId}`}>
                      Continue in basic mode
                    </Link>
                  </Button>
                </>
              }
            />
          )}
        </div>
      </Card>
    </main>
  );
}
