import Link from "next/link";
import { redirect } from "next/navigation";

import { getWorkspaceAppContext } from "../../../../lib/server/auth";
import { getSharedAuditEventRepository } from "../../../../lib/server/audit-events";
import { listRecentOperationLogs } from "../../../../lib/server/observability";

type DebugPageProps = {
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

export default async function BillingDebugPage({ searchParams }: DebugPageProps) {
  const params = (await searchParams) ?? {};
  const context = await getWorkspaceAppContext(params.workspace);

  if (context.workspace === null || context.needsWorkspaceSelection) {
    redirect("/app/workspaces");
  }

  const workspaceId = context.workspace.workspaceId;
  const [auditEvents, operationLogs] = await Promise.all([
    getSharedAuditEventRepository().listRecentAuditEventsByWorkspace({
      workspaceId,
      limit: 20,
    }),
    Promise.resolve(listRecentOperationLogs({ workspaceId, limit: 20 })),
  ]);

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Developer Debug</p>
        <h1>Recent audit events and operation logs</h1>
        <p className="lede">
          Lightweight internal visibility for recent workspace-scoped activity while observability stays in-process.
        </p>
      </section>

      <div className="inlineActions profileHeaderActions">
        <Link href={
          "/app/settings?workspace=" + workspaceId
        } className="buttonSecondary">
          Back to settings
        </Link>
      </div>

      <section className="profileDetailGrid settingsGrid">
        <div className="dashboardCard">
          <p className="cardLabel">Audit events</p>
          <h2>{auditEvents.length} recent events</h2>
          <div className="statusList">
            {auditEvents.length > 0 ? auditEvents.map((event) => (
              <div key={event.id} className="statusListItem">
                <strong>{event.action}</strong>
                <span>{formatDate(event.createdAt)}</span>
                <p>
                  {event.entityType} {event.entityId ?? "n/a"}
                </p>
              </div>
            )) : <p className="statusMessage">No audit events recorded yet.</p>}
          </div>
        </div>

        <div className="dashboardCard">
          <p className="cardLabel">Operation logs</p>
          <h2>{operationLogs.length} recent entries</h2>
          <div className="statusList">
            {operationLogs.length > 0 ? operationLogs.map((entry, index) => (
              <div key={entry.timestamp + "-" + index} className="statusListItem">
                <strong>{entry.message}</strong>
                <span>{formatDate(entry.timestamp)}</span>
                <p>
                  {String(entry.context.operation ?? "operation")} ? {entry.level}
                </p>
              </div>
            )) : <p className="statusMessage">No operation logs buffered yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
