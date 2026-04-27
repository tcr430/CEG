"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

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
      className="panel compactPanel senderProfileForm"
      noValidate
    >
      <input type="hidden" {...form.register("workspaceId")} />

      <p className="statusMessage">
        Treat this as a concise operating brief, not a long form. You can
        refine targeting, tone, and workflow rules as the campaign evolves.
      </p>

      <div className="formGrid">
        <label className="field">
          <span>Campaign name</span>
          <input
            {...form.register("name")}
            placeholder={defaults.name}
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name ? (
            <small className="text-xs text-destructive">{errors.name.message}</small>
          ) : null}
        </label>
        <label className="field">
          <span>Target ICP</span>
          <input
            {...form.register("targetIcp")}
            placeholder={defaults.targetIcp}
          />
        </label>
      </div>

      <label className="field">
        <span>Client offer summary</span>
        <textarea
          {...form.register("offerSummary")}
          rows={3}
          placeholder={defaults.offerSummary}
        />
      </label>

      <div className="formGrid">
        <label className="field">
          <span>Target industries</span>
          <textarea
            {...form.register("targetIndustries")}
            rows={4}
            placeholder={defaults.targetIndustries}
          />
          <small>Use one line per industry the team should prioritize in this workflow.</small>
        </label>
        <label className="field">
          <span>Workflow preferences</span>
          <textarea
            {...form.register("frameworkPreferences")}
            rows={4}
            placeholder={defaults.frameworkPreferences}
          />
          <small>Use one line per messaging rule, structure, or review preference you want carried into drafts.</small>
        </label>
      </div>

      <label className="field">
        <span>Tone style</span>
        <input
          {...form.register("toneStyle")}
          placeholder={defaults.toneStyle}
        />
      </label>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating campaign..." : "Create first client workflow"}
        </Button>
      </div>
    </form>
  );
}
