import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShellNav } from "../../components/app-shell-nav";
import { getServerAuthContext } from "../../lib/server/auth";
import { listCampaignsForWorkspace } from "../../lib/server/campaigns";
import { buildCampaignOverview } from "../../lib/campaign-overview";

export const metadata: Metadata = {
  title: {
    default: "App",
    template: "%s | OutFlow",
  },
};

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const context = await getServerAuthContext();
  const defaultWorkspace =
    context.user?.memberships.find((membership) => membership.isDefault) ??
    context.user?.memberships[0] ??
    null;

  const campaignQuickLinks = defaultWorkspace
    ? buildCampaignOverview(
        await listCampaignsForWorkspace(defaultWorkspace.workspaceId),
      ).quickSwitchCampaigns.map((item) => ({
        href: `/app/campaigns/${item.campaign.id}?workspace=${defaultWorkspace.workspaceId}`,
        label: item.campaign.name,
        status: item.campaign.status,
      }))
    : [];

  return (
    <div className="appChrome">
      <AppShellNav
        workspaceId={defaultWorkspace?.workspaceId}
        workspaceName={defaultWorkspace?.workspaceName ?? null}
        userEmail={context.user?.email ?? null}
        campaignQuickLinks={campaignQuickLinks}
      />
      {children}
    </div>
  );
}