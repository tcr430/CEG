"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { updateInstitutionalControlsAction } from "../actions";

const institutionalControlsSchema = z.object({
  workspaceId: z.string().min(1),
  dataRetentionPreference: z.enum(["standard", "minimized", "extended"]),
  dataRetentionNotes: z.string().optional().or(z.literal("")),
  requestContactChannel: z.string().optional().or(z.literal("")),
  exportRequestsVisible: z.boolean(),
  deleteRequestsVisible: z.boolean(),
  auditVisibleToWorkspaceAdmins: z.boolean(),
  configurationSummaryVisible: z.boolean(),
});

type InstitutionalControlsValues = z.infer<typeof institutionalControlsSchema>;

type InstitutionalControlsFormProps = {
  workspaceId: string;
  defaults: {
    dataRetentionPreference: "standard" | "minimized" | "extended";
    dataRetentionNotes: string | null;
    requestContactChannel: string | null;
    exportRequestsVisible: boolean;
    deleteRequestsVisible: boolean;
    auditVisibleToWorkspaceAdmins: boolean;
    configurationSummaryVisible: boolean;
  };
  canEdit: boolean;
};

export function InstitutionalControlsForm({
  workspaceId,
  defaults,
  canEdit,
}: InstitutionalControlsFormProps) {
  const form = useForm<InstitutionalControlsValues>({
    resolver: zodResolver(institutionalControlsSchema),
    defaultValues: {
      workspaceId,
      dataRetentionPreference: defaults.dataRetentionPreference,
      dataRetentionNotes: defaults.dataRetentionNotes ?? "",
      requestContactChannel: defaults.requestContactChannel ?? "",
      exportRequestsVisible: defaults.exportRequestsVisible,
      deleteRequestsVisible: defaults.deleteRequestsVisible,
      auditVisibleToWorkspaceAdmins: defaults.auditVisibleToWorkspaceAdmins,
      configurationSummaryVisible: defaults.configurationSummaryVisible,
    },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: updateInstitutionalControlsAction,
    successMessage: "Institutional controls updated.",
  });

  return (
    <form onSubmit={onSubmit} className="stack" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <label>
        <span>Data retention preference</span>
        <select
          {...form.register("dataRetentionPreference")}
          disabled={!canEdit}
        >
          <option value="standard">Standard retention</option>
          <option value="minimized">Minimized retention</option>
          <option value="extended">Extended retention</option>
        </select>
      </label>
      <label>
        <span>Operational note</span>
        <textarea
          {...form.register("dataRetentionNotes")}
          rows={3}
          disabled={!canEdit}
          placeholder="Example: Retain only active evaluation data beyond standard windows."
        />
      </label>
      <label>
        <span>Export/delete request contact</span>
        <input
          {...form.register("requestContactChannel")}
          disabled={!canEdit}
          placeholder="support@company.com"
        />
      </label>
      <label>
        <input
          type="checkbox"
          {...form.register("exportRequestsVisible")}
          disabled={!canEdit}
        />
        <span>Show export request visibility</span>
      </label>
      <label>
        <input
          type="checkbox"
          {...form.register("deleteRequestsVisible")}
          disabled={!canEdit}
        />
        <span>Show delete request visibility</span>
      </label>
      <label>
        <input
          type="checkbox"
          {...form.register("auditVisibleToWorkspaceAdmins")}
          disabled={!canEdit}
        />
        <span>Show audit access visibility to owners and admins</span>
      </label>
      <label>
        <input
          type="checkbox"
          {...form.register("configurationSummaryVisible")}
          disabled={!canEdit}
        />
        <span>Show provider readiness summaries</span>
      </label>
      {canEdit ? (
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Saving controls..." : "Save institutional controls"}
        </Button>
      ) : (
        <p className="statusMessage">
          Members can review these controls, but only owners and admins can update them.
        </p>
      )}
    </form>
  );
}
