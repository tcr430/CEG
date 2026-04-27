"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { confirmWorkspaceOnboardingAction } from "../actions";

const schema = z.object({ workspaceId: z.string().min(1) });

type Values = z.infer<typeof schema>;

type Props = {
  workspaceId: string;
};

export function ConfirmWorkspaceButton({ workspaceId }: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { workspaceId },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: confirmWorkspaceOnboardingAction,
    successMessage: "Workspace confirmed.",
  });

  return (
    <form onSubmit={onSubmit} className="inlineActions">
      <input type="hidden" {...form.register("workspaceId")} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Confirming workspace..." : "Use this workspace for onboarding"}
      </Button>
    </form>
  );
}
