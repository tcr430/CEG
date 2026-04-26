"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { CommandPalette } from "./command-palette";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

type Membership = {
  workspaceId: string;
  workspaceName: string | null | undefined;
};

type CampaignEntry = {
  id: string;
  name: string;
  status: string;
};

type AppShellChromeProps = {
  memberships: Membership[];
  defaultWorkspaceId: string | null;
  userEmail: string | null;
  campaigns: CampaignEntry[];
  children: ReactNode;
};

type SidebarLinkConfig = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

const SIDEBAR_LINKS: SidebarLinkConfig[] = [
  {
    href: "/app",
    label: "Dashboard",
    match: (pathname) => pathname === "/app",
  },
  {
    href: "/app/campaigns",
    label: "Campaigns",
    match: (pathname) => pathname.startsWith("/app/campaigns"),
  },
  {
    href: "/app/sender-profiles",
    label: "Sender profiles",
    match: (pathname) => pathname.startsWith("/app/sender-profiles"),
  },
  {
    href: "/app/settings",
    label: "Settings",
    match: (pathname) => pathname.startsWith("/app/settings"),
  },
  {
    href: "/app/billing",
    label: "Billing",
    match: (pathname) => pathname === "/app/billing",
  },
];

export function AppShellChrome({
  memberships,
  defaultWorkspaceId,
  userEmail,
  campaigns,
  children,
}: AppShellChromeProps) {
  const pathname = usePathname() ?? "/app";
  const searchParams = useSearchParams();

  const urlWorkspaceId = searchParams.get("workspace");
  const activeWorkspaceId =
    (urlWorkspaceId &&
      memberships.find((m) => m.workspaceId === urlWorkspaceId)?.workspaceId) ||
    defaultWorkspaceId;

  const workspaceQuery = activeWorkspaceId
    ? `workspace=${encodeURIComponent(activeWorkspaceId)}`
    : "";

  const withWorkspace = (href: string) =>
    workspaceQuery ? `${href}?${workspaceQuery}` : href;

  const navLinks = SIDEBAR_LINKS.map((link) => ({
    href: withWorkspace(link.href),
    label: link.label,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-sm">
        <Link
          href={withWorkspace("/app")}
          className="text-base font-semibold tracking-tight"
        >
          OutFlow
        </Link>
        {memberships.length > 0 ? (
          <div className="ml-2">
            <WorkspaceSwitcher
              workspaces={memberships}
              activeWorkspaceId={activeWorkspaceId}
            />
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <CommandPalette
            campaigns={campaigns}
            navLinks={navLinks}
            workspaceQuery={workspaceQuery}
          />
          <UserMenu
            email={userEmail}
            settingsHref={
              activeWorkspaceId ? withWorkspace("/app/settings") : null
            }
            billingHref={
              activeWorkspaceId ? withWorkspace("/app/billing") : null
            }
            workspacesHref="/app/workspaces"
          />
        </div>
      </header>
      <div className="flex flex-1">
        <aside
          className="hidden w-56 shrink-0 border-r border-border bg-card/60 md:block"
          aria-label="Primary navigation"
        >
          <nav className="flex flex-col gap-1 p-3">
            {SIDEBAR_LINKS.map((link) => {
              const active = link.match(pathname);
              return (
                <Link
                  key={link.href}
                  href={withWorkspace(link.href)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
