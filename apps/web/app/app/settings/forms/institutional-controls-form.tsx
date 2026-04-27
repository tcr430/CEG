"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <div className="grid gap-2">
        <Label>Data retention preference</Label>
        <Controller
          control={form.control}
          name="dataRetentionPreference"
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard retention</SelectItem>
                <SelectItem value="minimized">Minimized retention</SelectItem>
                <SelectItem value="extended">Extended retention</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ic-notes">Operational note</Label>
        <Textarea
          id="ic-notes"
          {...form.register("dataRetentionNotes")}
          rows={3}
          disabled={!canEdit}
          placeholder="Example: Retain only active evaluation data beyond standard windows."
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ic-contact">Export/delete request contact</Label>
        <Input
          id="ic-contact"
          {...form.register("requestContactChannel")}
          disabled={!canEdit}
          placeholder="support@company.com"
        />
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          {...form.register("exportRequestsVisible")}
          disabled={!canEdit}
        />
        <span className="text-sm">Show export request visibility</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          {...form.register("deleteRequestsVisible")}
          disabled={!canEdit}
        />
        <span className="text-sm">Show delete request visibility</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          {...form.register("auditVisibleToWorkspaceAdmins")}
          disabled={!canEdit}
        />
        <span className="text-sm">Show audit access visibility to owners and admins</span>
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          {...form.register("configurationSummaryVisible")}
          disabled={!canEdit}
        />
        <span className="text-sm">Show provider readiness summaries</span>
      </label>
      {canEdit ? (
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Saving controls..." : "Save institutional controls"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Members can review these controls, but only owners and admins can update them.
        </p>
      )}
    </form>
  );
}
