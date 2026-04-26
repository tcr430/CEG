"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { persistWorkspaceSelection } from "./actions";

type Workspace = {
  workspaceId: string;
  workspaceName: string | null | undefined;
};

type WorkspaceSwitcherProps = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
};

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (workspaces.length === 0) {
    return null;
  }

  if (workspaces.length === 1) {
    const only = workspaces[0];
    if (!only) return null;
    return (
      <span className="text-sm font-medium text-foreground">
        {only.workspaceName ?? "Workspace"}
      </span>
    );
  }

  const handleChange = (workspaceId: string) => {
    startTransition(async () => {
      await persistWorkspaceSelection(workspaceId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("workspace", workspaceId);
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    });
  };

  return (
    <Select
      value={activeWorkspaceId ?? undefined}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-9 w-[220px]" aria-label="Active workspace">
        <SelectValue placeholder="Select workspace" />
      </SelectTrigger>
      <SelectContent>
        {workspaces.map((workspace) => (
          <SelectItem key={workspace.workspaceId} value={workspace.workspaceId}>
            {workspace.workspaceName ?? "Unnamed workspace"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
