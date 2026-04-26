"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type CampaignEntry = {
  id: string;
  name: string;
  status: string;
};

type NavLink = {
  href: string;
  label: string;
};

type CommandPaletteProps = {
  campaigns: CampaignEntry[];
  navLinks: NavLink[];
  workspaceQuery: string;
};

export function CommandPalette({
  campaigns,
  navLinks,
  workspaceQuery,
}: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const select = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2 px-3 text-muted-foreground"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span className="hidden text-sm sm:inline">Search</span>
        <kbd className="pointer-events-none ml-2 hidden items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          <span className="text-xs">{"⌘"}</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search campaigns and navigate..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navLinks.map((item) => (
              <CommandItem
                key={item.href}
                value={`nav ${item.label}`}
                onSelect={() => select(item.href)}
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {campaigns.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Campaigns">
                {campaigns.map((campaign) => {
                  const href = workspaceQuery
                    ? `/app/campaigns/${campaign.id}?${workspaceQuery}`
                    : `/app/campaigns/${campaign.id}`;
                  return (
                    <CommandItem
                      key={campaign.id}
                      value={`campaign ${campaign.name} ${campaign.status}`}
                      onSelect={() => select(href)}
                    >
                      <span className="truncate">{campaign.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">
                        {campaign.status}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
