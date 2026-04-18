import type { Metadata } from "next";
import Link from "next/link";

import { FeedbackBanner } from "../../../components/feedback-banner";
import { PricingPlanCard } from "../../../components/pricing-plan-card";
import { SubmitButton } from "../../../components/submit-button";
import {
  importRecentGmailThreadsAction,
  inviteWorkspaceMemberAction,
  removeWorkspaceMemberAction,
  requestWorkspaceDeletionAction,
  submitWorkspaceFeedbackAction,
  updateInstitutionalControlsAction,
  updateWorkspaceMemberRoleAction,
  updateWorkspaceProfileAction,
} from "./actions";
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

export const metadata: Metadata = {
  title: "Settings",
  description: "Review workspace settings, team access, billing, inbox connections, and upgrades.",
};

type SettingsPageProps = {
  searchParams?: Promise<{
    workspace?: string;
    billing?: string;
    billingError?: string;
    success?: string;
    error?: string;
    notice?: string;
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
    return "dashboardCard nestedCard successCard";
  }

  if (status === "partial") {
    return "dashboardCard nestedCard warningCard";
  }

  return "dashboardCard nestedCard";
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

      <FeedbackBanner
        success={params.success ?? (params.billing === "success" ? encodeURIComponent("Stripe checkout completed. Subscription state will sync automatically through the webhook.") : undefined)}
        notice={params.notice}
        error={params.error ?? params.billingError}
      />

      <div className="inlineActions profileHeaderActions">
        <Link href="/app" className="buttonSecondary">
          Back to dashboard
        </Link>
        <Link href="/pricing" className="buttonSecondary">
          Public pricing page
        </Link>
        <Link href={`/app/onboarding?workspace=${workspace.workspaceId}`} className="buttonSecondary">
          Onboarding
        </Link>
        {showInternalAdminLink ? (
          <Link href={`/app/settings/debug?workspace=${workspace.workspaceId}`} className="buttonSecondary">
            Internal admin
          </Link>
        ) : null}
      </div>

      <section className="profileDetailGrid settingsGrid">
        <div className="stack">
          <div className="dashboardCard">
            <p className="cardLabel">Workspace</p>
            <h2>Workspace profile</h2>
            <p>
              Keep the operating context clear for your team. Owners and admins can update the workspace name and the practical details that keep client work organized. This becomes shared workspace context for the rest of the product and helps preserve how the team runs client work over time.
            </p>
            <form action={updateWorkspaceProfileAction} className="stack">
              <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
              <label>
                <span>Workspace name</span>
                <input
                  name="name"
                  defaultValue={teamState.workspace.name}
                  disabled={!teamState.permissions.canEditWorkspace}
                  required
                />
              </label>
              <label>
                <span>Company name</span>
                <input
                  name="companyName"
                  defaultValue={teamState.profile.companyName ?? ""}
                  disabled={!teamState.permissions.canEditWorkspace}
                />
              </label>
              <label>
                <span>Website</span>
                <input
                  name="websiteUrl"
                  type="url"
                  defaultValue={teamState.profile.websiteUrl ?? ""}
                  placeholder="https://example.com"
                  disabled={!teamState.permissions.canEditWorkspace}
                />
              </label>
              <label>
                <span>Support email</span>
                <input
                  name="supportEmail"
                  type="email"
                  defaultValue={teamState.profile.supportEmail ?? ""}
                  disabled={!teamState.permissions.canEditWorkspace}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={teamState.profile.description ?? ""}
                  placeholder="Short operating context for this workspace."
                  disabled={!teamState.permissions.canEditWorkspace}
                />
              </label>
              {teamState.permissions.canEditWorkspace ? (
                <SubmitButton className="buttonSecondary" pendingLabel="Saving workspace...">
                  Save workspace settings
                </SubmitButton>
              ) : (
                <p className="statusMessage">Only owners and admins can change workspace settings.</p>
              )}
            </form>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Operational controls</p>
            <h2>Institutional controls</h2>
            <p>
              This section makes the current operational posture visible. It is intentionally honest: useful controls and readiness summaries now, deeper policy automation later. It also makes the stored operational record around requests, access, provider posture, and usage evidence easier to understand.
            </p>
            <div className="pillRow">
              <span className="pill">{formatRetentionPreference(controls.dataRetention.preference)}</span>
              <span className="pill">{institutionalControlsState.permissions.canViewAuditSummary ? "Audit summary visible" : "Audit summary limited"}</span>
            </div>
            <form action={updateInstitutionalControlsAction} className="stack">
              <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
              <label>
                <span>Data retention preference</span>
                <select
                  name="dataRetentionPreference"
                  defaultValue={controls.dataRetention.preference}
                  disabled={!institutionalControlsState.permissions.canEdit}
                >
                  <option value="standard">Standard retention</option>
                  <option value="minimized">Minimized retention</option>
                  <option value="extended">Extended retention</option>
                </select>
              </label>
              <label>
                <span>Operational note</span>
                <textarea
                  name="dataRetentionNotes"
                  rows={3}
                  defaultValue={controls.dataRetention.notes ?? ""}
                  placeholder="Example: Retain only active evaluation data beyond standard windows."
                  disabled={!institutionalControlsState.permissions.canEdit}
                />
              </label>
              <label>
                <span>Export/delete request contact</span>
                <input
                  name="requestContactChannel"
                  defaultValue={controls.requestVisibility.contactChannel ?? teamState.profile.supportEmail ?? ""}
                  placeholder="support@company.com"
                  disabled={!institutionalControlsState.permissions.canEdit}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  name="exportRequestsVisible"
                  defaultChecked={controls.requestVisibility.exportRequestsVisible}
                  disabled={!institutionalControlsState.permissions.canEdit}
                />
                <span>Show export request visibility</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  name="deleteRequestsVisible"
                  defaultChecked={controls.requestVisibility.deleteRequestsVisible}
                  disabled={!institutionalControlsState.permissions.canEdit}
                />
                <span>Show delete request visibility</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  name="auditVisibleToWorkspaceAdmins"
                  defaultChecked={controls.auditAccess.visibleToWorkspaceAdmins}
                  disabled={!institutionalControlsState.permissions.canEdit}
                />
                <span>Show audit access visibility to owners and admins</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  name="configurationSummaryVisible"
                  defaultChecked={controls.providerVisibility.configurationSummaryVisible}
                  disabled={!institutionalControlsState.permissions.canEdit}
                />
                <span>Show provider readiness summaries</span>
              </label>
              {institutionalControlsState.permissions.canEdit ? (
                <SubmitButton className="buttonSecondary" pendingLabel="Saving controls...">
                  Save institutional controls
                </SubmitButton>
              ) : (
                <p className="statusMessage">Members can review these controls, but only owners and admins can update them.</p>
              )}
            </form>
            <div className="stack">
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Now</p>
                <ul className="researchList compactResearchList">
                  {institutionalControlsState.summaries.implementedNow.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Roadmap</p>
                <ul className="researchList compactResearchList">
                  {institutionalControlsState.summaries.roadmap.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Operational readiness</p>
            <h2>Environment and provider posture</h2>
            <p>
              Readiness is shown without exposing secrets. These indicators reflect whether the current environment can support the corresponding operational path.
            </p>
            <div className="stack">
              {institutionalControlsState.readinessIndicators.map((indicator) => (
                <div key={indicator.key} className={getIndicatorCardClass(indicator.status)}>
                  <div className="pillRow">
                    <span className="pill">{indicator.label}</span>
                    <span className="pill">{getIndicatorLabel(indicator.status)}</span>
                  </div>
                  <p>{indicator.detail}</p>
                </div>
              ))}
            </div>
            <div className="stack">
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Request visibility</p>
                <p>{institutionalControlsState.summaries.exportDeleteVisibility}</p>
              </div>
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Audit visibility</p>
                <p>{institutionalControlsState.summaries.auditAccessVisibility}</p>
              </div>
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Security posture</p>
                <ul className="researchList compactResearchList">
                  {institutionalControlsState.summaries.securityPosture.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Operational summary</p>
                <ul className="researchList compactResearchList">
                  {institutionalControlsState.summaries.operationalConfiguration.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Team</p>
            <h2>Workspace members</h2>
            <p>
              Owners and admins can control who has access. Invitations stay scoped to this workspace so the right operators and reviewers can work inside the same client-facing system.
            </p>
            <div className="pillRow">
              <span className="pill">Your role: {workspace.role}</span>
              <span className="pill">{teamState.members.length} team members</span>
            </div>
            {teamState.permissions.canManageTeam ? (
              <form action={inviteWorkspaceMemberAction} className="stack">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <label>
                  <span>Invite email</span>
                  <input name="email" type="email" placeholder="teammate@company.com" required />
                </label>
                <label>
                  <span>Role</span>
                  <select name="role" defaultValue={teamState.permissions.allowedInviteRoles[0] ?? "member"}>
                    {teamState.permissions.allowedInviteRoles.map((role) => (
                      <option key={role} value={role}>
                        {role === "admin" ? "Admin" : "Member"}
                      </option>
                    ))}
                  </select>
                </label>
                <SubmitButton className="buttonSecondary" pendingLabel="Saving invite...">
                  Invite member
                </SubmitButton>
              </form>
            ) : (
              <p className="statusMessage">Members can view the workspace roster, but only admins and owners can invite or manage access.</p>
            )}
            <div className="stack">
              {teamState.members.map((member) => (
                <div key={member.membershipId} className="dashboardCard nestedCard">
                  <div className="pillRow">
                    <span className="pill">{member.role}</span>
                    <span className="pill">{formatMemberStatus(member.status)}</span>
                    {member.isCurrentUser ? <span className="pill">You</span> : null}
                  </div>
                  <h3>{member.fullName ?? member.email}</h3>
                  <p>{member.email}</p>
                  <p>Joined: {formatDateTime(member.joinedAt)}</p>
                  {member.canEditRole ? (
                    <form action={updateWorkspaceMemberRoleAction} className="inlineActions profileHeaderActions">
                      <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                      <input type="hidden" name="targetUserId" value={member.userId} />
                      <select name="role" defaultValue={member.role}>
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role === "admin" ? "Admin" : "Member"}
                          </option>
                        ))}
                      </select>
                      <SubmitButton className="buttonSecondary" pendingLabel="Updating role...">
                        Update role
                      </SubmitButton>
                    </form>
                  ) : null}
                  {member.canRemove ? (
                    <form action={removeWorkspaceMemberAction} className="inlineActions profileHeaderActions">
                      <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                      <input type="hidden" name="targetUserId" value={member.userId} />
                      <SubmitButton className="buttonSecondary" pendingLabel="Removing member...">
                        Remove member
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Current plan</p>
            <h2>{billing.planLabel}</h2>
            <p>{currentPlan.summary}</p>
            <div className="pillRow">
              <span className="pill">{billing.planLabel} plan</span>
              {billing.currentSubscription ? (
                <span className="pill">{billing.currentSubscription.status}</span>
              ) : null}
              {billing.currentSubscription?.cancelAtPeriodEnd ? (
                <span className="pill">Cancels at period end</span>
              ) : null}
            </div>
            <p>
              {billing.currentSubscription
                ? `Subscription status: ${billing.currentSubscription.status.replaceAll("_", " ")}.`
                : "No active subscription is synced yet. The workspace account exists, but core workflow execution stays locked until checkout completes."}
            </p>
            {subscriptionLocked ? (
              <p className="statusMessage">
                Account access is active. Choose Growth or Enterprise below to unlock sender profiles, campaigns, prospects, research, generation, reply intelligence, and inbox imports.
              </p>
            ) : null}
            <p>Billing period end: {formatPeriodEnd(billing.currentSubscription?.currentPeriodEnd ?? null)}</p>
          </div>

          {billingUpgradePrompt ? (
            <UpgradePromptCard
              workspaceId={workspace.workspaceId}
              prompt={billingUpgradePrompt}
            />
          ) : null}

          <div className="dashboardCard">
            <p className="cardLabel">Inbox</p>
            <h2>Gmail connection</h2>
            <p>
              Connect one Gmail inbox to import recent threads into matched prospect timelines. Tokens stay server-side and encrypted, and generated emails only move into Gmail as reviewable drafts rather than auto-sent messages. Imported thread and message references become part of the stored workspace context.
            </p>
            {!inboxState.gmailConfigured ? (
              <p className="statusMessage">
                Gmail OAuth is not configured yet. Add the Google client id, secret, redirect URI, and inbox encryption key before connecting an inbox.
              </p>
            ) : (
              <form action="/api/inbox/gmail/connect" method="post" className="inlineActions profileHeaderActions">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <SubmitButton className="buttonPrimary" pendingLabel="Redirecting to Google...">
                  Connect Gmail
                </SubmitButton>
              </form>
            )}
            {inboxState.accounts.length === 0 ? (
              <p className="statusMessage">
                No inbox is connected yet. Connect Gmail to pull recent replies into the right prospect thread.
              </p>
            ) : (
              <div className="stack">
                {inboxState.accounts.map(({ account, recentSyncRuns }) => {
                  const latestRun = recentSyncRuns[0] ?? null;

                  return (
                    <div key={account.id} className="dashboardCard nestedCard">
                      <div className="pillRow">
                        <span className="pill">{account.provider}</span>
                        <span className="pill">{account.status}</span>
                        <span className="pill">{account.syncState.status}</span>
                      </div>
                      <h3>{account.displayName ?? account.emailAddress}</h3>
                      <p>{account.emailAddress}</p>
                      <p>
                        Last successful sync: {formatDateTime(account.syncState.lastSuccessAt ?? account.lastSyncedAt ?? null)}
                      </p>
                      {account.syncState.lastErrorMessage ? (
                        <p className="statusMessage">
                          Latest sync issue: {account.syncState.lastErrorMessage}
                        </p>
                      ) : null}
                      <form action={importRecentGmailThreadsAction} className="inlineActions profileHeaderActions">
                        <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                        <input type="hidden" name="inboxAccountId" value={account.id} />
                        <input type="hidden" name="maxResults" value="10" />
                        <SubmitButton className="buttonSecondary" pendingLabel="Importing threads...">
                          Import recent threads
                        </SubmitButton>
                      </form>
                      {latestRun ? (
                        <p>
                          Latest run: {formatSyncRunStatus(latestRun.status)} on {formatDateTime(latestRun.finishedAt ?? latestRun.startedAt)}. Imported {latestRun.importedThreadCount} threads and {latestRun.importedMessageCount} messages.
                        </p>
                      ) : (
                        <p>No sync run has been recorded yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dashboardCard">
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
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Data handling</p>
            <h2>Export and deletion requests</h2>
            <p>
              Export produces a structured workspace snapshot for responsible handoff and review, including the operational history the product stores around sender context, campaign briefs, research, drafts, edits, and approvals. Deletion stays explicit and auditable: owners can request it here, but nothing is silently removed.
            </p>
            <div className="stack">
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Workspace export</p>
                <p>
                  Last export: {formatDateTime(dataHandling.lastExportAt ?? null)}
                </p>
                <form action="/api/workspace/export" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  {teamState.permissions.canEditWorkspace ? (
                    <SubmitButton className="buttonSecondary" pendingLabel="Preparing export...">
                      Export workspace data
                    </SubmitButton>
                  ) : (
                    <p className="statusMessage">Only owners and admins can export workspace data.</p>
                  )}
                </form>
              </div>
              <div className="dashboardCard nestedCard">
                <p className="cardLabel">Deletion request</p>
                <p>
                  {dataHandling.deletionRequest.status === "requested"
                    ? `Requested on ${formatDateTime(dataHandling.deletionRequest.requestedAt ?? null)} by ${dataHandling.deletionRequest.requestedByEmail ?? "an owner"}.`
                    : "No deletion request is currently recorded for this workspace."}
                </p>
                {workspace.role === "owner" ? (
                  <form action={requestWorkspaceDeletionAction} className="stack">
                    <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                    <label>
                      <span>Confirm workspace name</span>
                      <input name="confirmationLabel" placeholder={teamState.workspace.name} required />
                    </label>
                    <label>
                      <span>Reason</span>
                      <textarea
                        name="reason"
                        rows={3}
                        maxLength={500}
                        placeholder="Example: Closing a test workspace after export review."
                      />
                    </label>
                    <SubmitButton className="buttonSecondary" pendingLabel="Recording request...">
                      Request workspace deletion
                    </SubmitButton>
                  </form>
                ) : (
                  <p className="statusMessage">Only workspace owners can request deletion, and the request must be confirmed explicitly.</p>
                )}
              </div>
            </div>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Feedback</p>
            <h2>Report an issue or early-user friction</h2>
            <p>
              Keep it concise. We log the workspace, page, and category automatically so early launch feedback stays easy to review and later recommendation work can stay grounded in real usage signals rather than guesswork.
            </p>
            <form action={submitWorkspaceFeedbackAction} className="stack">
              <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
              <input type="hidden" name="pagePath" value="/app/settings" />
              <label>
                <span>Category</span>
                <select name="category" defaultValue="workflow">
                  <option value="bug">Bug</option>
                  <option value="workflow">Workflow friction</option>
                  <option value="output_quality">Output quality</option>
                  <option value="billing">Billing</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                <span>What should we know?</span>
                <textarea
                  name="message"
                  rows={5}
                  maxLength={1200}
                  placeholder="Example: The research result was useful, but I was not sure whether to generate the sequence next or add it to the thread."
                  required
                />
              </label>
              <SubmitButton className="buttonSecondary" pendingLabel="Sending feedback...">
                Send feedback
              </SubmitButton>
            </form>
          </div>

          <div className="dashboardCard">
            <p className="cardLabel">Manage billing</p>
            <h2>Stripe customer settings</h2>
            <p>
              Use the Stripe billing portal to update payment details or manage a synced subscription.
            </p>
            {billing.currentSubscription?.providerCustomerId ? (
              <form action="/api/billing/portal" method="post">
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <SubmitButton className="buttonSecondary" pendingLabel="Opening portal...">Manage billing</SubmitButton>
              </form>
            ) : (
              <p className="statusMessage">
                Billing portal becomes available after the first Stripe checkout completes and syncs.
              </p>
            )}
          </div>
        </div>

        <div id="billing-plans" className="stack pricingSettingsStack">
          {pricingPlans.map((plan) => {
            const active = billing.planCode === plan.code;
            let actions;

            if (active) {
              actions = billing.currentSubscription?.providerCustomerId ? (
                <form action="/api/billing/portal" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <SubmitButton className="buttonSecondary" pendingLabel="Opening portal...">Manage current plan</SubmitButton>
                </form>
              ) : (
                <p className="statusMessage">Stripe sync is still catching up. Billing management will appear here once the subscription record is available.</p>
              );
            } else {
              actions = (
                <form action="/api/billing/checkout" method="post">
                  <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                  <input type="hidden" name="planCode" value={plan.code} />
                  <SubmitButton
                    className={plan.featured ? "buttonPrimary" : "buttonSecondary"}
                    pendingLabel="Starting checkout..."
                  >
                    {plan.code === "free"
                      ? "Switch to Starter"
                      : plan.code === "pro"
                        ? "Upgrade to Growth"
                        : "Upgrade to Enterprise"}
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
                        ? "Recommended"
                        : undefined
                }
                actions={actions}
              />
            );
          })}
        </div>
      </section>

      <section className="panel pricingComparisonPanel" aria-labelledby="settings-plan-comparison-title">
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
      </section>
    </main>
  );
}










