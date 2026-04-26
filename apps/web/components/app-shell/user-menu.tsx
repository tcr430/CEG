"use client";

import { CreditCard, LogOut, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMenuProps = {
  email: string | null;
  settingsHref: string | null;
  billingHref: string | null;
  workspacesHref: string;
};

export function UserMenu({
  email,
  settingsHref,
  billingHref,
  workspacesHref,
}: UserMenuProps) {
  const formRef = useRef<HTMLFormElement>(null);

  if (!email) {
    return null;
  }

  const initials = (email[0] ?? "?").toUpperCase();

  return (
    <>
      <form ref={formRef} method="post" action="/auth/sign-out" className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            aria-label="Account menu"
          >
            <span className="text-sm font-semibold">{initials}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
            {email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {settingsHref ? (
            <DropdownMenuItem asChild>
              <Link href={settingsHref}>
                <Settings />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
          ) : null}
          {billingHref ? (
            <DropdownMenuItem asChild>
              <Link href={billingHref}>
                <CreditCard />
                <span>Billing</span>
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <Link href={workspacesHref}>
              <Users />
              <span>Workspaces</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }}
          >
            <LogOut />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
