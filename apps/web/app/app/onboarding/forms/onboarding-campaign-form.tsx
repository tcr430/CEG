"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { createOnboardingCampaignAction } from "../actions";

const schema = z.object({
  workspaceId: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(1, "Campaign name is required.")
    .max(160, "Campaign name is too long."),
  targetIcp: z.string().optional().or(z.literal("")),
  offerSummary: z.string().optional().or(z.literal("")),
  targetIndustries: z.string().optional().or(z.literal("")),
  frameworkPreferences: z.string().optional().or(z.literal("")),
  toneStyle: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

type Defaults = {
  name: string;
  targetIcp: string;
  offerSummary: string;
  targetIndustries: string;
  frameworkPreferences: string;
  toneStyle: string;
};

type Props = {
  workspaceId: string;
  defaults: Defaults;
};

export function OnboardingCampaignForm({ workspaceId, defaults }: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      workspaceId,
      name: "",
      targetIcp: "",
      offerSummary: "",
      targetIndustries: "",
      frameworkPreferences: "",
      toneStyle: "",
    },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: createOnboardingCampaignAction,
    successMessage: "First campaign created.",
  });

  const errors = form.formState.errors;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4"
      noValidate
    >
      <input type="hidden" {...form.register("workspaceId")} />

      <p className="text-sm text-muted-foreground">
        Treat this as a concise operating brief, not a long form. You can
        refine targeting, tone, and workflow rules as the campaign evolves.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="ob-campaign-name">Campaign name</Label>
          <Input
            id="ob-campaign-name"
            {...form.register("name")}
            placeholder={defaults.name}
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ob-icp">Target ICP</Label>
          <Input
            id="ob-icp"
            {...form.register("targetIcp")}
            placeholder={defaults.targetIcp}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="ob-offer">Client offer summary</Label>
        <Textarea
          id="ob-offer"
          {...form.register("offerSummary")}
          rows={3}
          placeholder={defaults.offerSummary}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="ob-industries">Target industries</Label>
          <Textarea
            id="ob-industries"
            {...form.register("targetIndustries")}
            rows={4}
            placeholder={defaults.targetIndustries}
          />
          <p className="text-xs text-muted-foreground">Use one line per industry the team should prioritize in this workflow.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ob-framework">Workflow preferences</Label>
          <Textarea
            id="ob-framework"
            {...form.register("frameworkPreferences")}
            rows={4}
            placeholder={defaults.frameworkPreferences}
          />
          <p className="text-xs text-muted-foreground">Use one line per messaging rule, structure, or review preference you want carried into drafts.</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="ob-tone">Tone style</Label>
        <Input
          id="ob-tone"
          {...form.register("toneStyle")}
          placeholder={defaults.toneStyle}
        />
      </div>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating campaign..." : "Create first client workflow"}
        </Button>
      </div>
    </form>
  );
}
