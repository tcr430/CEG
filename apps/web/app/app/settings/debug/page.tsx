import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { SubmitButton } from "../../../../components/submit-button";
import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import { getWorkspaceDemoSeedStatus } from "../../../../lib/server/demo-seed";
import { getInternalAdminOverview } from "../../../../lib/server/internal-admin";
import {
  canAccessInternalAdminView,
  getInternalAdminAllowedEmails,
  isInternalAdminEnabled,
} from "../../../../lib/internal-admin-access";
import { seedDemoWorkspaceAction } from "./actions";

type InternalAdminPageProps = {
  searchParams?: Promise<{
    workspace?: string;
  }>;
};

function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${Math.round(value * 100)}%`;
}

export default async function InternalAdminPage({ searchParams }: InternalAdminPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const allowedEmails = getInternalAdminAllowedEmails();
  const canAccess =
    isInternalAdminEnabled() &&
    canAccessInternalAdminView({
      email: context.user.email,
      membership: context.workspace,
      allowedEmails,
    });

  if (!canAccess) {
    notFound();
  }

  const [overview, demoSeedStatus] = await Promise.all([
    getInternalAdminOverview({
      workspaceId: context.workspace.workspaceId,
      user: context.user,
    }),
    getWorkspaceDemoSeedStatus(context.workspace.workspaceId),
  ]);

  const seedSummaryItems = [
    "3 sender-aware profiles plus one basic-mode campaign path",
    "4 sample prospects across SDR, founder, agency, and basic workflows",
    "3 research snapshots, 2 sequences, and 2 reply-thread examples",
  ];

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Internal Admin</p>
        <h1>Operational visibility for trusted workspace admins</h1>
        <p className="lede">
          Review recent workspace activity, inspect key record streams, and load safe demo data for development without exposing secrets or raw provider payloads.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Button asChild variant="secondary">
          <Link href={`/app/settings?workspace=${context.workspace.workspaceId}`}>Back to settings</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/app?workspace=${context.workspace.workspaceId}`}>Dashboard</Link>
        </Button>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 w-full max-w-[1080px] items-start">
        <Card className="p-5">
          <p className="cardLabel">Demo data</p>
          <h2>
            {demoSeedStatus.version
              ? `Loaded version ${demoSeedStatus.version}`
              : demoSeedStatus.enabled
                ? "Ready to load"
                : "Disabled"}
          </h2>
          <p>
            {demoSeedStatus.enabled
              ? demoSeedStatus.version
                ? `This workspace already has demo data loaded${demoSeedStatus.loadedAt ? ` on ${formatDate(demoSeedStatus.loadedAt)}` : ""}.`
                : "Load realistic sample records for sender-aware, basic-mode, research, sequence, and reply workflows."
              : "Set DEMO_SEED_ENABLED=true locally to unlock development-only demo seeding."}
          </p>
          <ul className="researchList compactResearchList">
            {seedSummaryItems.map((item) => (
              <li key={item}>
                <p>{item}</p>
              </li>
            ))}
          </ul>
          {demoSeedStatus.enabled ? (
            <form action={seedDemoWorkspaceAction}>
              <input type="hidden" name="workspaceId" value={context.workspace.workspaceId} />
              <SubmitButton
                variant="secondary"
                pendingLabel="Loading demo data..."
                disabled={demoSeedStatus.version !== null}
              >
                {demoSeedStatus.version ? "Demo data already loaded" : "Load demo data"}
              </SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Demo seeding stays disabled in production and remains opt-in during local development.
            </p>
          )}
        </Card>

        <Card className="p-5">
          <p className="cardLabel">Dataset export</p>
          <h2>Internal training and eval bundle</h2>
          <p>
            Export a structured JSON bundle for supervised tuning, preference learning, and regression evaluation work. This stays restricted to trusted internal admins.
          </p>
          <form method="post" action="/api/internal/dataset-export" className="grid gap-4">
            <input type="hidden" name="workspaceId" value={context.workspace.workspaceId} />
            <div className="grid gap-2">
              <Label htmlFor="dataset-date-from">From date</Label>
              <Input id="dataset-date-from" name="dateFrom" type="date" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataset-date-to">To date</Label>
              <Input id="dataset-date-to" name="dateTo" type="date" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataset-artifact-type">Artifact focus</Label>
              <select id="dataset-artifact-type" name="artifactType" className="defaultSelect">
                <option value="">All supported artifacts</option>
                <option value="research_snapshot">Research snapshots</option>
                <option value="reply_analysis">Reply analyses</option>
                <option value="sequence_bundle">Sequence bundles</option>
                <option value="sequence_initial_email">Initial emails</option>
                <option value="sequence_follow_up_step">Follow-up steps</option>
                <option value="draft_reply_bundle">Reply draft bundles</option>
                <option value="draft_reply_option">Reply draft options</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataset-signal-mode">Signal focus</Label>
              <select id="dataset-signal-mode" name="signalMode" className="defaultSelect" defaultValue="all">
                <option value="all">All matching records</option>
                <option value="accepted_or_edited">Accepted or edited only</option>
                <option value="edited_only">Edited only</option>
              </select>
            </div>
            <Button type="submit" variant="secondary">Export dataset JSON</Button>
          </form>
        </Card>

        <Card className="p-5">
          <p className="cardLabel">Accessible workspaces</p>
          <h2>{overview.workspaces.length} recent workspaces</h2>
          <div className="statusList">
            {overview.workspaces.length > 0 ? overview.workspaces.map((workspace) => (
              <div key={workspace.id} className="statusListItem">
                <strong>{workspace.name}</strong>
                <span>{formatDate(workspace.updatedAt)}</span>
                <p>{workspace.slug} | {workspace.role} | {workspace.status}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No managed workspaces are available yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <p className="cardLabel">Campaigns</p>
          <h2>{overview.campaigns.length} recent campaigns</h2>
          <div className="statusList">
            {overview.campaigns.length > 0 ? overview.campaigns.map((campaign) => (
              <div key={campaign.id} className="statusListItem">
                <strong>{campaign.name}</strong>
                <span>{formatDate(campaign.updatedAt)}</span>
                <p>{campaign.status} | {campaign.prospectCount} prospect(s) | {campaign.senderProfileAttached ? "sender-aware" : "basic mode"}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No campaigns recorded for this workspace yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <p className="cardLabel">Prospects</p>
          <h2>{overview.prospects.length} recent prospects</h2>
          <div className="statusList">
            {overview.prospects.length > 0 ? overview.prospects.map((prospect) => (
              <div key={prospect.id} className="statusListItem">
                <strong>{prospect.companyName ?? "Unnamed prospect"}</strong>
                <span>{formatDate(prospect.updatedAt)}</span>
                <p>{prospect.campaignName} | {prospect.status}{prospect.contactName ? ` | ${prospect.contactName}` : ""}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No prospects are available for this workspace yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <p className="cardLabel">Research runs</p>
          <h2>{overview.researchRuns.length} recent snapshots</h2>
          <div className="statusList">
            {overview.researchRuns.length > 0 ? overview.researchRuns.map((snapshot) => (
              <div key={snapshot.id} className="statusListItem">
                <strong>{snapshot.companyName ?? "Unknown company"}</strong>
                <span>{formatDate(snapshot.capturedAt)}</span>
                <p>{snapshot.sourceHost} | {snapshot.fetchStatus} | {snapshot.confidenceLabel}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No research runs have been captured yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <p className="cardLabel">Sequence generations</p>
          <h2>{overview.sequenceGenerations.length} recent sequences</h2>
          <div className="statusList">
            {overview.sequenceGenerations.length > 0 ? overview.sequenceGenerations.map((sequence) => (
              <div key={sequence.id} className="statusListItem">
                <strong>{sequence.companyName ?? "Unknown company"}</strong>
                <span>{formatDate(sequence.createdAt)}</span>
                <p>{sequence.campaignName} | {sequence.generationMode} | {sequence.status}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No sequence generations are available yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <p className="cardLabel">Reply analyses</p>
          <h2>{overview.replyAnalyses.length} recent analyses</h2>
          <div className="statusList">
            {overview.replyAnalyses.length > 0 ? overview.replyAnalyses.map((analysis) => (
              <div key={analysis.id} className="statusListItem">
                <strong>{analysis.companyName ?? "Prospect thread"}</strong>
                <span>{formatDate(analysis.analyzedAt)}</span>
                <p>{analysis.intent ?? "unknown"} | {analysis.recommendedAction ?? "n/a"} | confidence {formatPercent(analysis.confidence)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No reply analyses are stored yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <p className="cardLabel">Audit events</p>
          <h2>{overview.auditEvents.length} recent events</h2>
          <div className="statusList">
            {overview.auditEvents.length > 0 ? overview.auditEvents.map((event) => (
              <div key={event.id} className="statusListItem">
                <strong>{event.action}</strong>
                <span>{formatDate(event.createdAt)}</span>
                <p>{event.entityType} {event.entityId ?? "n/a"}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <p className="cardLabel">Usage events</p>
          <h2>{overview.usageEvents.length} recent usage events</h2>
          <div className="statusList">
            {overview.usageEvents.length > 0 ? overview.usageEvents.map((event) => (
              <div key={event.id} className="statusListItem">
                <strong>{event.eventName}</strong>
                <span>{formatDate(event.occurredAt)}</span>
                <p>{event.entityType ?? "event"} | qty {event.quantity}{event.billable ? " | billable" : ""}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No usage events recorded yet.</p>}
          </div>
        </Card>
      </section>

      <Card className="p-5">
        <p className="cardLabel">Operation logs</p>
        <h2>{overview.operationLogs.length} buffered log entries</h2>
        <div className="statusList">
          {overview.operationLogs.length > 0 ? overview.operationLogs.map((entry, index) => (
            <div key={entry.timestamp + "-" + index} className="statusListItem">
              <strong>{entry.message}</strong>
              <span>{formatDate(entry.timestamp)}</span>
              <p>{String(entry.context.operation ?? "operation")} | {entry.level}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">No structured operation logs are buffered yet.</p>}
        </div>
      </Card>
    </main>
  );
}
