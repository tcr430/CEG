"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ConfirmActionButton } from "../../../../components/confirm-action-button";
import { useActionSubmit } from "../../../../lib/use-action-form";
import {
  removeWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction,
} from "../actions";

const updateRoleSchema = z.object({
  workspaceId: z.string().min(1),
  targetUserId: z.string().min(1),
  role: z.enum(["admin", "member"]),
});

type UpdateRoleValues = z.infer<typeof updateRoleSchema>;

type UpdateMemberRoleFormProps = {
  workspaceId: string;
  targetUserId: string;
  currentRole: "admin" | "member";
  roleOptions: ReadonlyArray<"admin" | "member">;
};

export function UpdateMemberRoleForm({
  workspaceId,
  targetUserId,
  currentRole,
  roleOptions,
}: UpdateMemberRoleFormProps) {
  const form = useForm<UpdateRoleValues>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: { workspaceId, targetUserId, role: currentRole },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: updateWorkspaceMemberRoleAction,
    successMessage: "Workspace role updated.",
  });

  return (
    <form onSubmit={onSubmit} className="inlineActions profileHeaderActions">
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("targetUserId")} />
      <div className="grid gap-2">
        <Label className="sr-only">Role</Label>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role === "admin" ? "Admin" : "Member"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Updating role..." : "Update role"}
      </Button>
    </form>
  );
}

type RemoveMemberFormProps = {
  workspaceId: string;
  targetUserId: string;
};

export function RemoveMemberForm({
  workspaceId,
  targetUserId,
}: RemoveMemberFormProps) {
  return (
    <div className="inlineActions profileHeaderActions">
      <ConfirmActionButton
        action={removeWorkspaceMemberAction}
        payload={{ workspaceId, targetUserId }}
        label="Remove member"
        title="Remove this workspace member?"
        description="They lose access to campaigns, prospect history, and reply context immediately. You can re-invite them later, but their session ends as soon as you confirm."
        confirmLabel="Remove member"
        confirmVariant="destructive"
        pendingLabel="Removing member..."
        successMessage="Workspace member removed."
      />
    </div>
  );
}
