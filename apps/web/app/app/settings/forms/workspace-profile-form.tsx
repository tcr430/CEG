"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

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
    <form onSubmit={onSubmit} className="stack" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <label>
        <span>Workspace name</span>
        <input
          {...form.register("name")}
          disabled={!canEdit}
          aria-invalid={errors.name ? true : undefined}
          required
        />
        {errors.name ? (
          <small className="text-xs text-destructive">{errors.name.message}</small>
        ) : null}
      </label>
      <label>
        <span>Company name</span>
        <input {...form.register("companyName")} disabled={!canEdit} />
      </label>
      <label>
        <span>Website</span>
        <input
          {...form.register("websiteUrl")}
          type="url"
          disabled={!canEdit}
          placeholder="https://example.com"
        />
      </label>
      <label>
        <span>Support email</span>
        <input
          {...form.register("supportEmail")}
          type="email"
          disabled={!canEdit}
        />
      </label>
      <label>
        <span>Description</span>
        <textarea
          {...form.register("description")}
          rows={4}
          disabled={!canEdit}
          placeholder="Short operating context for this workspace."
        />
      </label>
      {canEdit ? (
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Saving workspace..." : "Save workspace settings"}
        </Button>
      ) : (
        <p className="statusMessage">
          Only owners and admins can change workspace settings.
        </p>
      )}
    </form>
  );
}
