"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export type ProspectDetailTab = {
  id: "research" | "sequence" | "replies" | "settings";
  label: string;
  content: ReactNode;
};

type ProspectDetailTabsProps = {
  defaultTab: ProspectDetailTab["id"];
  tabs: ProspectDetailTab[];
};

/**
 * Phase 5: tabs for the prospect detail page.
 *
 * The page renders all four tab contents on the server (so the data
 * costs the same regardless of the active tab — the user already paid
 * for the page load). This client wrapper handles URL sync: changing
 * the active tab writes `?tab=...` via `router.replace` so a refresh
 * stays on the same view, and the URL drops the param when the
 * computed default tab is selected.
 */
export function ProspectDetailTabs({ defaultTab, tabs }: ProspectDetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onValueChange(value: string) {
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    if (value === defaultTab) {
      next.delete("tab");
    } else {
      next.set("tab", value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Tabs defaultValue={defaultTab} onValueChange={onValueChange} className="w-full">
      <TabsList className="flex flex-wrap h-auto justify-start">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="stack mt-6">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
