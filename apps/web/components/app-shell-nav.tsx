import Link from "next/link";

type CampaignQuickLink = {
  href: string;
  label: string;
  status: string;
};

type AppShellNavProps = {
  workspaceId?: string | null;
  workspaceName?: string | null;
  userEmail?: string | null;
  campaignQuickLinks?: CampaignQuickLink[];
};

function withWorkspace(pathname: string, workspaceId?: string | null) {
  if (!workspaceId) {
    return pathname;
  }

  return `${pathname}?workspace=${workspaceId}`;
}

export function AppShellNav({
  workspaceId,
  workspaceName,
  userEmail,
  campaignQuickLinks = [],
}: AppShellNavProps) {
  return (
    <header className="appChromeHeader">
      <div className="appChromeMeta">
        <div className="appChromeBrand">
          <Link href={withWorkspace("/app", workspaceId)} className="appChromeLogo">
            OutFlow
          </Link>
          <p className="appChromeWorkspace">
            {workspaceName ?? "Workspace"}
            {userEmail ? ` - ${userEmail}` : ""}
          </p>
        </div>

        {campaignQuickLinks.length > 0 ? (
          <div className="appChromeQuickSwitch" aria-label="Quick campaign switching">
            <span className="cardLabel">Jump to client campaign</span>
            <div className="inlineActions compactInlineActions">
              {campaignQuickLinks.map((campaign) => (
                <Link key={campaign.href} href={campaign.href} className="buttonSecondary quickSwitchLink">
                  {campaign.label}
                  <small>{campaign.status}</small>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <nav className="appChromeNav" aria-label="Application">
        <Link href={withWorkspace("/app", workspaceId)} className="buttonGhost">
          Dashboard
        </Link>
        <Link
          href={withWorkspace("/app/sender-profiles", workspaceId)}
          className="buttonGhost"
        >
          Sender profiles
        </Link>
        <Link href={withWorkspace("/app/campaigns", workspaceId)} className="buttonGhost">
          Campaigns
        </Link>
        <Link href={withWorkspace("/app/settings", workspaceId)} className="buttonGhost">
          Settings
        </Link>
        <Link href={withWorkspace("/app/billing", workspaceId)} className="buttonGhost">
          Billing
        </Link>
        <Link href="/pricing" className="buttonGhost">
          Pricing
        </Link>
      </nav>
    </header>
  );
}
