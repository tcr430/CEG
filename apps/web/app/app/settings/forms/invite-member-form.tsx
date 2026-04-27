"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

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
    <form onSubmit={onSubmit} className="stack" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <label>
        <span>Invite email</span>
        <input
          type="email"
          placeholder="teammate@company.com"
          {...form.register("email")}
          aria-invalid={errors.email ? true : undefined}
          required
        />
        {errors.email ? (
          <small className="text-xs text-destructive">{errors.email.message}</small>
        ) : null}
      </label>
      <label>
        <span>Role</span>
        <select {...form.register("role")}>
          {allowedRoles.map((role) => (
            <option key={role} value={role}>
              {role === "admin" ? "Admin" : "Member"}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Saving invite..." : "Invite member"}
      </Button>
    </form>
  );
}
