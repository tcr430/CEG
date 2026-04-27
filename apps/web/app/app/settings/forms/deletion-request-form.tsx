"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { requestWorkspaceDeletionAction } from "../actions";

const deletionRequestSchema = z.object({
  workspaceId: z.string().min(1),
  confirmationLabel: z
    .string()
    .trim()
    .min(1, "Confirm the workspace name to proceed."),
  reason: z.string().max(500).optional().or(z.literal("")),
});

type DeletionRequestValues = z.infer<typeof deletionRequestSchema>;

type DeletionRequestFormProps = {
  workspaceId: string;
  workspaceNamePlaceholder: string;
};

export function DeletionRequestForm({
  workspaceId,
  workspaceNamePlaceholder,
}: DeletionRequestFormProps) {
  const form = useForm<DeletionRequestValues>({
    resolver: zodResolver(deletionRequestSchema),
    defaultValues: { workspaceId, confirmationLabel: "", reason: "" },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: requestWorkspaceDeletionAction,
    successMessage: "Workspace deletion request recorded.",
    onSuccess: () => {
      form.reset({ workspaceId, confirmationLabel: "", reason: "" });
    },
  });

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <div className="grid gap-2">
        <Label htmlFor="deletion-confirm">Confirm workspace name</Label>
        <Input
          id="deletion-confirm"
          {...form.register("confirmationLabel")}
          placeholder={workspaceNamePlaceholder}
          aria-invalid={errors.confirmationLabel ? true : undefined}
          required
        />
        {errors.confirmationLabel ? (
          <p className="text-xs text-destructive">
            {errors.confirmationLabel.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deletion-reason">Reason</Label>
        <Textarea
          id="deletion-reason"
          {...form.register("reason")}
          rows={3}
          maxLength={500}
          placeholder="Example: Closing a test workspace after export review."
        />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Recording request..." : "Request workspace deletion"}
      </Button>
    </form>
  );
}
