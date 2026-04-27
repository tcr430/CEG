"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { skipOnboardingAction } from "../actions";

const schema = z.object({ workspaceId: z.string().min(1) });

type Values = z.infer<typeof schema>;

type Props = {
  workspaceId: string;
};

export function SkipOnboardingButton({ workspaceId }: Props) {
  const router = useRouter();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { workspaceId },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: skipOnboardingAction,
    successMessage: "Onboarding paused.",
    refresh: false,
    onSuccess: () => {
      router.push(`/app?workspace=${workspaceId}`);
    },
  });

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" {...form.register("workspaceId")} />
      <Button type="submit" variant="ghost" disabled={isPending}>
        {isPending ? "Pausing onboarding..." : "Return later"}
      </Button>
    </form>
  );
}
