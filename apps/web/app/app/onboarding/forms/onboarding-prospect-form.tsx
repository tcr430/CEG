"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { createOnboardingProspectAction } from "../actions";

const schema = z.object({
  workspaceId: z.string().min(1),
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required.")
    .max(160, "Company name is too long."),
  companyWebsite: z.string().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

type Defaults = {
  companyName: string;
  companyWebsite: string;
  contactName: string;
  email: string;
};

type Props = {
  workspaceId: string;
  defaults: Defaults;
};

export function OnboardingProspectForm({ workspaceId, defaults }: Props) {
  const router = useRouter();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      workspaceId,
      companyName: "",
      companyWebsite: "",
      contactName: "",
      email: "",
    },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: createOnboardingProspectAction,
    successMessage: "Onboarding complete.",
    refresh: false,
    onSuccess: () => {
      router.push(`/app?workspace=${workspaceId}`);
    },
  });

  const errors = form.formState.errors;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 prospectForm"
      noValidate
    >
      <input type="hidden" {...form.register("workspaceId")} />

      <p className="text-sm text-muted-foreground">
        Start with a real company the team would genuinely work. One account
        is enough to get to value and prove the workflow quickly.
      </p>

      <div className="formGrid">
        <div className="grid gap-2">
          <Label htmlFor="ob-company">Company name</Label>
          <Input
            id="ob-company"
            {...form.register("companyName")}
            placeholder={defaults.companyName}
            aria-invalid={errors.companyName ? true : undefined}
            required
          />
          {errors.companyName ? (
            <p className="text-xs text-destructive">{errors.companyName.message}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ob-website">Website URL</Label>
          <Input
            id="ob-website"
            {...form.register("companyWebsite")}
            type="url"
            placeholder={defaults.companyWebsite}
          />
        </div>
      </div>

      <div className="formGrid">
        <div className="grid gap-2">
          <Label htmlFor="ob-contact">Primary contact</Label>
          <Input
            id="ob-contact"
            {...form.register("contactName")}
            placeholder={defaults.contactName}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ob-email">Contact email</Label>
          <Input
            id="ob-email"
            {...form.register("email")}
            type="email"
            placeholder={defaults.email}
          />
        </div>
      </div>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding prospect..." : "Add first target account"}
        </Button>
      </div>
    </form>
  );
}
