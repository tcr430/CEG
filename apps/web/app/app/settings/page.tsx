import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { PricingPlanCard } from "../../../components/pricing-plan-card";
import { SubmitButton } from "../../../components/submit-button";
import {
  canAccessInternalAdminView,
  getInternalAdminAllowedEmails,
  isInternalAdminEnabled,
} from "../../../lib/internal-admin-access";
import {
  isWorkspaceSubscriptionLocked,
  requireActiveWorkspaceAppContext,
} from "../../../lib/server/billing";
import { getWorkspaceInboxState } from "../../../lib/server/inbox/service";
import { getInstitutionalControlsState } from "../../../lib/server/institutional-controls";
import { readWorkspaceDataHandling } from "../../../lib/server/data-handling";
import { getWorkspaceTeamState } from "../../../lib/server/workspace-team";
import {
  getPricingPlanPresentation,
  pricingFeatureRows,
  pricingPlans,
} from "../../../lib/pricing-content";
import { getUpgradePrompt } from "../../../lib/upgrade-prompts";
import { UpgradePromptCard } from "../../../components/upgrade-prompt-card";

import { DeletionRequestForm } from "./forms/deletion-request-form";
import { FeedbackForm } from "./forms/feedback-form";
import { GmailImportForm } from "./forms/gmail-import-form";
import { InstitutionalControlsForm } from "./forms/institutional-controls-form";
import { InviteMemberForm } from "./forms/invite-member-form";
import {
  RemoveMemberForm,
  UpdateMemberRoleForm,
} from "./forms/member-row-actions";
import { WorkspaceProfileForm } from "./forms/workspace-profile-form";

export const metadata: Metadata = {
  title: "Settings",
  description: "Review workspace settings, team access, billing, inbox connections, and upgrades.",
};

type SettingsPageProps = {
  searchParams?: Promise<{
    workspace?: string;
    upgrade?: string;
  }>;
};

function formatPeriodEnd(value: Date | null | undefined) {
  if (!value) {
    return "No active billing period yet.";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatAllowance(value: number | null, label: string) {
  return value === null ? `Unlimited ${label}` : `${value} ${label} remaining this month`;
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatSyncRunStatus(status: string) {
  return status.replaceAll("_", " ");
}

function formatMemberStatus(status: string) {
  return status === "invited" ? "Invite pending" : status.replaceAll("_", " ");
}

function formatRetentionPreference(value: string) {
  switch (value) {
    case "minimized":
      return "Minimized retention";
    case "extended":
      return "Extended retention";
    default:
      return "Standard retention";
  }
}

function getIndicatorCardClass(status: "ready" | "partial" | "not_configured") {
  if (status === "ready") {
    return "p-5 nestedCard successCard";
  }

  if (status === "partial") {
    return "p-5 nestedCard warningCard";
  }

  return "p-5 nestedCard";
}

function getIndicatorLabel(status: "ready" | "partial" | "not_configured") {
  if (status === "ready") {
    return "Ready";
  }

  if (status === "partial") {
    return "Partial";
  }

  return "Not configured";
}

function getRoleOptions(actorRole: "owner" | "admin" | "member") {
  if (actorRole === "owner") {
    return ["admin", "member"] as const;
  }

  if (actorRole === "admin") {
    return ["member"] as const;
  }

  return [] as const;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = (await searchParams) ?? {};
  const context = await requireActiveWorkspaceAppContext(params.workspace);
  const workspace = context.workspace;

  const showInternalAdminLink =
    isInternalAdminEnabled() &&
    canAccessInternalAdminView({
      email: context.user.email ?? "",
      membership: workspace,
      allowedEmails: getInternalAdminAllowedEmails(),
    });
  const [inboxState, teamState] = await Promise.all([
    getWorkspaceInboxState(workspace.workspaceId),
    getWorkspaceTeamState({
      workspaceId: workspace.workspaceId,
      actorUserId: context.user.userId,
      actorMembership: workspace,
    }),
  ]);
  const institutionalControlsState = await getInstitutionalControlsState({
    workspaceId: workspace.workspaceId,
    membership: workspace,
    userEmail: context.user.email ?? "",
    supportEmail: teamState.profile.supportEmail,
  });
  const billing = context.billing;
  const subscriptionLocked = isWorkspaceSubscriptionLocked(billing);
  const currentPlan = getPricingPlanPresentation(billing.planCode);
  const selectedUpgradePlanCode =
    params.upgrade === "pro" || params.upgrade === "agency"
      ? params.upgrade
      : null;
  const roleOptions = getRoleOptions(workspace.role);
  const billingUpgradePrompt = getUpgradePrompt({
    surface: "settings_billing",
    billing,
    performance: null,
  });
  const controls = institutionalControlsState.controls;
  const dataHandling = readWorkspaceDataHandling(teamState.workspace.settings);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Settings</p>
        <h1>Workspace operations, team, billing, and inbox settings</h1>
        <p className="lede">
          Keep workspace details current, control who can operate inside the account, and manage billing, inbox connections, and shared client-workflow settings from one place.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Button asChild variant="secondary">
          <Link href="/app">Back to dashboard</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/pricing">Public pricing page</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/app/onboarding?workspace=${workspace.workspaceId}`}>Onboarding</Link>
        </Button>
        {showInternalAdminLink ? (
          <Button asChild variant="secondary">
            <Link href={`/app/settings/debug?workspace=${workspace.workspaceId}`}>Internal admin</Link>
          </Button>
        ) : null}
      </div>

      <section className="profileDetailGrid settingsGrid">
        <div className="stack">
          <Card className="p-5">
            <p className="cardLabel">Workspace</p>
            <h2>Workspace profile</h2>
            <p>
              Keep the operating context clear for your team. Owners and admins can update the workspace name and the practical details that keep client work organized. This becomes shared workspace context for the rest of the product and helps preserve how the team runs client work over time.
            </p>
            <WorkspaceProfileForm
              workspaceId={workspace.workspaceId}
              defaults={{
                name: teamState.workspace.name,
                companyName: teamState.profile.companyName ?? null,
                websiteUrl: teamState.profile.websiteUrl ?? null,
                supportEmail: teamState.profile.supportEmail ?? null,
                description: teamState.profile.description ?? null,
              }}
              canEdit={teamState.permissions.canEditWorkspace}
            />
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Operational controls</p>
            <h2>Institutional controls</h2>
            <p>
              This section makes the current operational posture visible. It is intentionally honest: useful controls and readiness summaries now, deeper policy automation later. It also makes the stored operational record around requests, access, provider posture, and usage evidence easier to understand.
            </p>
            <div className="pillRow">
              <Badge variant="secondary">{formatRetentionPreference(controls.dataRetention.preference)}</Badge>
              <Badge variant="secondary">{institutionalControlsState.permissions.canViewAuditSummary ? "Audit summary visible" : "Audit summary limited"}</Badge>
            </div>
            <InstitutionalControlsForm
              workspaceId={workspace.workspaceId}
              defaults={{
                dataRetentionPreference: controls.dataRetention.preference,
                dataRetentionNotes: controls.dataRetention.notes ?? null,
                requestContactChannel:
                  controls.requestVisibility.contactChannel ??
                  teamState.profile.supportEmail ??
                  null,
                exportRequestsVisible: controls.requestVisibility.exportRequestsVisible,
                deleteRequestsVisible: controls.requestVisibility.deleteRequestsVisible,
                auditVisibleToWorkspaceAdmins:
                  controls.auditAccess.visibleToWorkspaceAdmins,
                configurationSummaryVisible:
                  controls.providerVisibility.configurationSummaryVisible,
              }}
              canEdit={institutionalControlsState.permissions.canEdit}
            />
            <div className="stack">
              <Card className="p-5 nestedCard">
                <p className="cardLabel">Now</p>
                <ul className="researchList compactResearchList">
                  {institutionalControlsState.summaries.implementedNow.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5 nestedCard">
                <p className="cardLabel">Roadmap</p>
                <ul className="researchList compactResearchList">
                  {institutionalControlsState.summaries.roadmap.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Operational readiness</p>
            <h2>Environment and provider posture</h2>
            <p>
              Readiness is shown without exposing secrets. These indicators reflect whether the current environment can support the corresponding operational path.
            </p>
            <div className="stack">
              {institutionalControlsState.readinessIndicators.map((indicator) => (
                <Card key={indicator.key} className={getIndicatorCardClass(indicator.status)}>
                  <div className="pillRow">
                    <Badge variant="secondary">{indicator.label}</Badge>
                    <Badge variant="secondary">{getIndicatorLabel(indicator.status)}</Badge>
                  </div>
                  <p>{indicator.detail}</p>
                </Card>
              ))}
            </div>
            <div className="stack">
              <Card className="p-5 nestedCard">
                <p className="cardLabel">Request visibility</p>
                <p>{institutionalControlsState.summaries.exportDeleteVisibility}</p>
              </Card>
              <Card className="p-5 nestedCard">
                <p className="cardLabel">Audit visibility</p>
                <p>{institutionalControlsState.summaries.auditAccessVisibility}</p>
              </Card>
              <Card className="p-5 nestedCard">
                <p className="cardLabel">Security posture</p>
                <ul className="researchList compactResearchList">
                  {institutionalControlsState.summaries.securityPosture.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
              <Card className="p-5 nestedCard">
                <p className="cardLabel">Operational summary</p>
                <ul className="researchList compactResearchList">
                  {institutionalControlsState.summaries.operationalConfiguration.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            </div>
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Team</p>
            <h2>Workspace members</h2>
            <p>
              Owners and admins can control who has access. Invitations stay scoped to this workspace so the right operators and reviewers can work inside the same client-facing system.
            </p>
            <div className="pillRow">
              <Badge variant="secondary">Your role: {workspace.role}</Badge>
              <Badge variant="secondary">{teamState.members.length} team members</Badge>
            </div>
            {teamState.permissions.canManageTeam ? (
              <InviteMemberForm
                workspaceId={workspace.workspaceId}
                allowedRoles={teamState.permissions.allowedInviteRoles}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Members can view the workspace roster, but only admins and owners can invite or manage access.</p>
            )}
            <div className="stack">
              {teamState.members.map((member) => (
                <Card key={member.membershipId} className="p-5 nestedCard">
                  <div className="pillRow">
                    <Badge variant="secondary">{member.role}</Badge>
                    <Badge variant="secondary">{formatMemberStatus(member.status)}</Badge>
                    {member.isCurrentUser ? <Badge variant="secondary">You</Badge> : null}
                  </div>
                  <h3>{member.fullName ?? member.email}</h3>
                  <p>{member.email}</p>
                  <p>Joined: {formatDateTime(member.joinedAt)}</p>
                  {member.canEditRole && member.role !== "owner" ? (
                    <UpdateMemberRoleForm
                      workspaceId={workspace.workspaceId}
                      targetUserId={member.userId}
                      currentRole={member.role}
                      roleOptions={roleOptions}
                    />
                  ) : null}
                  {member.canRemove ? (
                    <RemoveMemberForm
                      workspaceId={workspace.workspaceId}
                      targetUserId={member.userId}
                    />
                  ) : null}
                </Card>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Current plan</p>
            <h2>{billing.planLabel}</h2>
            <p>{currentPlan.summary}</p>
            <div className="pillRow">
              <Badge variant="secondary">{billing.planLabel} plan</Badge>
              {billing.currentSubscription ? (
                <Badge variant="secondary">{billing.currentSubscription.status}</Badge>
              ) : null}
              {billing.currentSubscription?.cancelAtPeriodEnd ? (
                <Badge variant="secondary">Cancels at period end</Badge>
              ) : null}
            </div>
            <p>
              {billing.currentSubscription
                ? `Subscription status: ${billing.currentSubscription.status.replaceAll("_", " ")}.`
                : "No active subscription is synced yet. The workspace account exists, but core workflow execution stays locked until checkout completes."}
            </p>
            {subscriptionLocked ? (
              <p className="text-sm text-muted-foreground">
                Account access is active. Choose Growth or Enterprise below to unlock sender profiles, campaigns, prospects, research, generation, reply intelligence, and inbox imports.
              </p>
            ) : null}
            <p>Billing period end: {formatPeriodEnd(billing.currentSubscription?.currentPeriodEnd ?? null)}</p>
          </Card>

          {billingUpgradePrompt ? (
            <UpgradePromptCard
              workspaceId={workspace.workspaceId}
              prompt={billingUpgradePrompt}
            />
          ) : null}

          <Card className="p-5">
            <p className="cardLabel">Inbox</p>
            <h2>Gmail connection</h2>
            <p>
              Connect one Gmail inbox to import recent threads into matched prospect timelines. Tokens stay server-side and encrypted, and generated emails only move into Gmail as reviewable drafts rather than auto-sent messages. Imported thread and message references become part of the stored workspace context.
            </p>
            {!inboxState.gmailConfigured ? (
              <p className="text-sm text-muted-foreground">
                Gmail OAuth is not configured yet. Add the Google client id, secret, redirect URI, and inbox encryption key before connecting an inbox.
              </p>
            ) : (
              <form action="/api/inbox/gmail/connect" method="post" className="inlineActions profileHeaderActions">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <SubmitButton pendingLabel="Redirecting to Google...">
                  Connect Gmail
                </SubmitButton>
              </form>
            )}
            {inboxState.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No inbox is connected yet. Connect Gmail to pull recent replies into the right prospect thread.
              </p>
            ) : (
              <div className="stack">
                {inboxState.accounts.map(({ account, recentSyncRuns }) => {
                  const latestRun = recentSyncRuns[0] ?? null;

                  return (
                    <Card key={account.id} className="p-5 nestedCard">
                      <div className="pillRow">
                        <Badge variant="secondary">{account.provider}</Badge>
                        <Badge variant="secondary">{account.status}</Badge>
                        <Badge variant="secondary">{account.syncState.status}</Badge>
                      </div>
                      <h3>{account.displayName ?? account.emailAddress}</h3>
                      <p>{account.emailAddress}</p>
                      <p>
                        Last successful sync: {formatDateTime(account.syncState.lastSuccessAt ?? account.lastSyncedAt ?? null)}
                      </p>
                      {account.syncState.lastErrorMessage ? (
                        <p className="text-sm text-muted-foreground">
                          Latest sync issue: {account.syncState.lastErrorMessage}
                        </p>
                      ) : null}
                      <GmailImportForm
                        workspaceId={workspace.workspaceId}
                        inboxAccountId={account.id}
                      />
                      {latestRun ? (
                        <p>
                          Latest run: {formatSyncRunStatus(latestRun.status)} on {formatDateTime(latestRun.finishedAt ?? latestRun.startedAt)}. Imported {latestRun.importedThreadCount} threads and {latestRun.importedMessageCount} messages.
                        </p>
                      ) : (
                        <p>No sync run has been recorded yet.</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Current workflow allowances</p>
            <h2>What this plan supports right now</h2>
            <ul className="researchList compactResearchList">
              <li>
                <strong>Sender-aware profiles</strong>
                <p>{billing.features.senderAwareProfiles.allowed ? "Included on this workspace." : "Basic mode only on this workspace."}</p>
              </li>
              <li>
                <strong>Research capacity</strong>
                <p>{formatAllowance(billing.limits.websiteResearch.remaining, "research runs")}</p>
              </li>
              <li>
                <strong>Sequence generation</strong>
                <p>{formatAllowance(billing.limits.sequenceGeneration.remaining, "sequence runs")}</p>
              </li>
              <li>
                <strong>Reply intelligence</strong>
                <p>
                  {formatAllowance(billing.limits.replyAnalysis.remaining, "reply analyses")} and {" "}
                  {formatAllowance(billing.limits.replyDraftGeneration.remaining, "draft sets")}
                </p>
              </li>
              <li>
                <strong>Regeneration support</strong>
                <p>{formatAllowance(billing.limits.regenerations.remaining, "regenerations")}</p>
              </li>
            </ul>
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Data handling</p>
            <h2>Export and deletion requests</h2>
            <p>
              Export produces a structured workspace snapshot for responsible handoff and review, including the operational history the product stores around sender context, campaign briefs, research, drafts, edits, and approvals. Deletion stays explicit and auditable: owners can request it here, but nothing is silently removed.
            </p>
            <div className="stack">
              <Card className="p-5 nestedCard">
                <p className="cardLabel">Workspace export</p>
                <p>
                  Last export: {formatDateTime(dataHandling.lastExportAt ?? null)}
                </p>
                <form action="/api/workspace/export" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  {teamState.permissions.canEditWorkspace ? (
                    <SubmitButton variant="secondary" pendingLabel="Preparing export...">
                      Export workspace data
                    </SubmitButton>
                  ) : (
                    <p className="text-sm text-muted-foreground">Only owners and admins can export workspace data.</p>
                  )}
                </form>
              </Card>
              <Card className="p-5 nestedCard">
                <p className="cardLabel">Deletion request</p>
                <p>
                  {dataHandling.deletionRequest.status === "requested"
                    ? `Requested on ${formatDateTime(dataHandling.deletionRequest.requestedAt ?? null)} by ${dataHandling.deletionRequest.requestedByEmail ?? "an owner"}.`
                    : "No deletion request is currently recorded for this workspace."}
                </p>
                {workspace.role === "owner" ? (
                  <DeletionRequestForm
                    workspaceId={workspace.workspaceId}
                    workspaceNamePlaceholder={teamState.workspace.name}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Only workspace owners can request deletion, and the request must be confirmed explicitly.</p>
                )}
              </Card>
            </div>
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Feedback</p>
            <h2>Report an issue or early-user friction</h2>
            <p>
              Keep it concise. We log the workspace, page, and category automatically so early launch feedback stays easy to review and later recommendation work can stay grounded in real usage signals rather than guesswork.
            </p>
            <FeedbackForm
              workspaceId={workspace.workspaceId}
              pagePath="/app/settings"
            />
          </Card>

          <Card className="p-5">
            <p className="cardLabel">Manage billing</p>
            <h2>Stripe customer settings</h2>
            <p>
              Use the Stripe billing portal to update payment details or manage a synced subscription.
            </p>
            {billing.currentSubscription?.providerCustomerId ? (
              <form action="/api/billing/portal" method="post">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <SubmitButton variant="secondary" pendingLabel="Opening portal...">Manage billing</SubmitButton>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Billing portal becomes available after the first Stripe checkout completes and syncs.
              </p>
            )}
          </Card>
        </div>

        <div id="billing-plans" className="stack pricingSettingsStack">
          {pricingPlans.map((plan) => {
            const active = billing.planCode === plan.code;
            let actions;

            if (active) {
              actions = billing.currentSubscription?.providerCustomerId ? (
                <form action="/api/billing/portal" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <SubmitButton variant="secondary" pendingLabel="Opening portal...">Manage current plan</SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Stripe sync is still catching up. Billing management will appear here once the subscription record is available.</p>
              );
            } else {
              actions = (
                <form action="/api/billing/checkout" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="planCode" value={plan.code} />
                  <SubmitButton
                    variant={plan.featured ? "default" : "secondary"}
                    pendingLabel="Starting checkout..."
                  >
                    {plan.code === "free"
                      ? "Move to Starter"
                      : plan.code === "pro"
                        ? "Move to Growth (Best fit)"
                        : "Move to Enterprise"}
                  </SubmitButton>
                </form>
              );
            }

            return (
              <PricingPlanCard
                key={plan.code}
                plan={plan}
                active={active}
                badge={
                  active
                    ? "Current plan"
                    : selectedUpgradePlanCode === plan.code
                      ? "Selected from signup"
                      : plan.featured
                        ? "Best fit for active teams"
                        : undefined
                }
                actions={actions}
              />
            );
          })}
        </div>
      </section>

      <Card className="p-6 pricingComparisonPanel" aria-labelledby="settings-plan-comparison-title">
        <div>
          <p className="eyebrow">Comparison</p>
          <h2 id="settings-plan-comparison-title">Plan differences at a glance</h2>
          <p>
            Use the same operating model across all tiers, with more sender context and more workflow headroom as the plan expands.
          </p>
        </div>
        <div className="pricingComparisonHeader">
          <span>Capability</span>
          <span>Starter</span>
          <span>Growth</span>
          <span>Enterprise</span>
        </div>
        {pricingFeatureRows.map((row) => (
          <div key={row.feature} className="pricingComparisonRow">
            <strong>{row.feature}</strong>
            <span>{row.free}</span>
            <span>{row.pro}</span>
            <span>{row.agency}</span>
          </div>
        ))}
      </Card>
    </main>
  );
}
