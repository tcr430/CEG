"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { useActionSubmit } from "../../../lib/use-action-form";

import { createProspectAction } from "./actions";

const prospectFormSchema = z.object({
  workspaceId: z.string().min(1),
  campaignId: z.string().min(1),
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required.")
    .max(160, "Company name is too long."),
  companyWebsite: z.string().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  status: z.enum([
    "new",
    "researched",
    "sequenced",
    "contacted",
    "replied",
    "closed",
    "archived",
  ]),
});

type ProspectFormValues = z.infer<typeof prospectFormSchema>;

type ProspectFormProps = {
  workspaceId: string;
  campaignId: string;
};

export function ProspectForm({ workspaceId, campaignId }: ProspectFormProps) {
  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectFormSchema),
    defaultValues: {
      workspaceId,
      campaignId,
      companyName: "",
      companyWebsite: "",
      contactName: "",
      email: "",
      status: "new",
    },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: createProspectAction,
    successMessage: "Prospect added.",
    onSuccess: () => {
      form.reset({
        workspaceId,
        campaignId,
        companyName: "",
        companyWebsite: "",
        contactName: "",
        email: "",
        status: "new",
      });
    },
  });

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} className="panel prospectForm" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("campaignId")} />

      <div className="formGrid">
        <label className="field">
          <span>Company name</span>
          <input
            {...form.register("companyName")}
            aria-invalid={errors.companyName ? true : undefined}
            required
          />
          {errors.companyName ? (
            <small className="text-xs text-destructive">
              {errors.companyName.message}
            </small>
          ) : null}
        </label>

        <label className="field">
          <span>Website URL</span>
          <input
            {...form.register("companyWebsite")}
            type="url"
            placeholder="https://example.com"
          />
        </label>
      </div>

      <div className="formGrid">
        <label className="field">
          <span>Contact name</span>
          <input {...form.register("contactName")} />
        </label>

        <label className="field">
          <span>Contact email</span>
          <input {...form.register("email")} type="email" />
        </label>
      </div>

      <label className="field">
        <span>Status</span>
        <select {...form.register("status")}>
          <option value="new">New</option>
          <option value="researched">Researched</option>
          <option value="sequenced">Sequenced</option>
          <option value="contacted">Contacted</option>
          <option value="replied">Replied</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding prospect..." : "Add prospect"}
        </Button>
      </div>
    </form>
  );
}
