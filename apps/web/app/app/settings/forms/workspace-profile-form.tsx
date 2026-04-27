"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { updateWorkspaceProfileAction } from "../actions";

const workspaceProfileSchema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(1, "Workspace name is required.")
    .max(160, "Workspace name is too long."),
  companyName: z.string().optional().or(z.literal("")),
  websiteUrl: z.string().optional().or(z.literal("")),
  supportEmail: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});

type WorkspaceProfileValues = z.infer<typeof workspaceProfileSchema>;

type WorkspaceProfileFormProps = {
  workspaceId: string;
  defaults: {
    name: string;
    companyName: string | null;
    websiteUrl: string | null;
    supportEmail: string | null;
    description: string | null;
  };
  canEdit: boolean;
};

export function WorkspaceProfileForm({
  workspaceId,
  defaults,
  canEdit,
}: WorkspaceProfileFormProps) {
  const form = useForm<WorkspaceProfileValues>({
    resolver: zodResolver(workspaceProfileSchema),
    defaultValues: {
      workspaceId,
      name: defaults.name,
      companyName: defaults.companyName ?? "",
      websiteUrl: defaults.websiteUrl ?? "",
      supportEmail: defaults.supportEmail ?? "",
      description: defaults.description ?? "",
    },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: updateWorkspaceProfileAction,
    successMessage: "Workspace settings updated.",
  });

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <div className="grid gap-2">
        <Label htmlFor="ws-name">Workspace name</Label>
        <Input
          id="ws-name"
          {...form.register("name")}
          disabled={!canEdit}
          aria-invalid={errors.name ? true : undefined}
          required
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ws-company">Company name</Label>
        <Input id="ws-company" {...form.register("companyName")} disabled={!canEdit} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ws-website">Website</Label>
        <Input
          id="ws-website"
          {...form.register("websiteUrl")}
          type="url"
          disabled={!canEdit}
          placeholder="https://example.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ws-support">Support email</Label>
        <Input
          id="ws-support"
          {...form.register("supportEmail")}
          type="email"
          disabled={!canEdit}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ws-description">Description</Label>
        <Textarea
          id="ws-description"
          {...form.register("description")}
          rows={4}
          disabled={!canEdit}
          placeholder="Short operating context for this workspace."
        />
      </div>
      {canEdit ? (
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Saving workspace..." : "Save workspace settings"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only owners and admins can change workspace settings.
        </p>
      )}
    </form>
  );
}
