import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShellChrome } from "../../components/app-shell/app-shell-chrome";
import { buildCampaignOverview } from "../../lib/campaign-overview";
import { getServerAuthContext } from "../../lib/server/auth";
import { listCampaignsForWorkspace } from "../../lib/server/campaigns";
import { getPersistedWorkspaceId } from "../../lib/server/workspace-cookie";

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
  const [context, persistedWorkspaceId] = await Promise.all([
    getServerAuthContext(),
    getPersistedWorkspaceId(),
  ]);

  const memberships = context.user?.memberships ?? [];
  const persistedMembership = persistedWorkspaceId
    ? (memberships.find(
        (membership) => membership.workspaceId === persistedWorkspaceId,
      ) ?? null)
    : null;
  const defaultMembership =
    persistedMembership ??
    memberships.find((membership) => membership.isDefault) ??
    memberships[0] ??
    null;

  const paletteCampaigns = defaultMembership
    ? buildCampaignOverview(
        await listCampaignsForWorkspace(defaultMembership.workspaceId),
      ).quickSwitchCampaigns.map((item) => ({
        id: item.campaign.id,
        name: item.campaign.name,
        status: item.campaign.status,
      }))
    : [];

  const switcherWorkspaces = memberships.map((membership) => ({
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspaceName,
  }));

  return (
    <AppShellChrome
      memberships={switcherWorkspaces}
      defaultWorkspaceId={defaultMembership?.workspaceId ?? null}
      userEmail={context.user?.email ?? null}
      campaigns={paletteCampaigns}
    >
      {children}
    </AppShellChrome>
  );
}