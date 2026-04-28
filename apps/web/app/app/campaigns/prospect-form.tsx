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
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("campaignId")} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="prospect-company">Company name</Label>
          <Input
            id="prospect-company"
            {...form.register("companyName")}
            aria-invalid={errors.companyName ? true : undefined}
            required
          />
          {errors.companyName ? (
            <p className="text-xs text-destructive">{errors.companyName.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prospect-website">Website URL</Label>
          <Input
            id="prospect-website"
            {...form.register("companyWebsite")}
            type="url"
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="prospect-contact">Contact name</Label>
          <Input id="prospect-contact" {...form.register("contactName")} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prospect-email">Contact email</Label>
          <Input id="prospect-email" {...form.register("email")} type="email" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Status</Label>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="researched">Researched</SelectItem>
                <SelectItem value="sequenced">Sequenced</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="replied">Replied</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding prospect..." : "Add prospect"}
        </Button>
      </div>
    </form>
  );
}
