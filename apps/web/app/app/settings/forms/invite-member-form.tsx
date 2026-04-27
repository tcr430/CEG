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

import { useActionSubmit } from "../../../../lib/use-action-form";
import { inviteWorkspaceMemberAction } from "../actions";

const inviteMemberSchema = z.object({
  workspaceId: z.string().min(1),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email."),
  role: z.enum(["admin", "member"]),
});

type InviteMemberValues = z.infer<typeof inviteMemberSchema>;

type InviteMemberFormProps = {
  workspaceId: string;
  allowedRoles: ReadonlyArray<"admin" | "member">;
};

export function InviteMemberForm({
  workspaceId,
  allowedRoles,
}: InviteMemberFormProps) {
  const defaultRole = allowedRoles[0] ?? "member";

  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      workspaceId,
      email: "",
      role: defaultRole,
    },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: inviteWorkspaceMemberAction,
    successMessage: "Workspace invite saved.",
    onSuccess: () => {
      form.reset({ workspaceId, email: "", role: defaultRole });
    },
  });

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <div className="grid gap-2">
        <Label htmlFor="invite-email">Invite email</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="teammate@company.com"
          {...form.register("email")}
          aria-invalid={errors.email ? true : undefined}
          required
        />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label>Role</Label>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map((role) => (
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
        {isPending ? "Saving invite..." : "Invite member"}
      </Button>
    </form>
  );
}
