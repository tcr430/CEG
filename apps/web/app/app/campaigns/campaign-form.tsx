"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Campaign, SenderProfile } from "@ceg/validation";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { useActionSubmit } from "../../../lib/use-action-form";

import type {
  CampaignActionData,
  createCampaignAction,
  updateCampaignAction,
} from "./actions";

const campaignFormSchema = z.object({
  workspaceId: z.string().min(1),
  campaignId: z.string().optional(),
  senderProfileId: z.string().optional().or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(1, "Campaign name is required.")
    .max(160, "Campaign name is too long."),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]),
  offerSummary: z.string().optional().or(z.literal("")),
  targetIcp: z.string().optional().or(z.literal("")),
  targetIndustries: z.string().optional().or(z.literal("")),
  frameworkPreferences: z.string().optional().or(z.literal("")),
  toneStyle: z.string().optional().or(z.literal("")),
  toneDo: z.string().optional().or(z.literal("")),
  toneAvoid: z.string().optional().or(z.literal("")),
  toneNotes: z.string().optional().or(z.literal("")),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

type CampaignActionFn = (
  formData: FormData,
) =>
  | ReturnType<typeof createCampaignAction>
  | ReturnType<typeof updateCampaignAction>;

type CampaignFormProps = {
  action: CampaignActionFn;
  workspaceId: string;
  senderProfiles: SenderProfile[];
  submitLabel: string;
  campaign?: Campaign;
  successRedirect?: string;
};

function joinLines(values: readonly string[] | undefined): string {
  return values && values.length > 0 ? values.join("\n") : "";
}

function buildDefaultValues(
  workspaceId: string,
  campaign: Campaign | undefined,
): CampaignFormValues {
  return {
    workspaceId,
    campaignId: campaign?.id,
    senderProfileId: campaign?.senderProfileId ?? "",
    name: campaign?.name ?? "",
    status: campaign?.status ?? "draft",
    offerSummary: campaign?.offerSummary ?? "",
    targetIcp: campaign?.targetIcp ?? campaign?.targetPersona ?? "",
    targetIndustries: joinLines(campaign?.targetIndustries),
    frameworkPreferences: joinLines(campaign?.frameworkPreferences),
    toneStyle: campaign?.tonePreferences.style ?? "",
    toneDo: joinLines(campaign?.tonePreferences.do),
    toneAvoid: joinLines(campaign?.tonePreferences.avoid),
    toneNotes: campaign?.tonePreferences.notes ?? "",
  };
}

export function CampaignForm({
  action,
  workspaceId,
  senderProfiles,
  submitLabel,
  campaign,
  successRedirect,
}: CampaignFormProps) {
  const router = useRouter();

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: buildDefaultValues(workspaceId, campaign),
  });

  const { onSubmit, isPending } = useActionSubmit<
    CampaignFormValues,
    CampaignActionData
  >({
    form,
    action,
    successMessage: campaign ? "Campaign updated." : "Campaign created.",
    onSuccess: (data) => {
      if (successRedirect) {
        router.push(successRedirect);
      } else if (!campaign) {
        router.push(
          `/app/campaigns/${data.campaignId}?workspace=${data.workspaceId}`,
        );
      }
    },
  });

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} className="panel senderProfileForm" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      {campaign !== undefined ? (
        <input type="hidden" {...form.register("campaignId")} />
      ) : null}

      <div className="formGrid">
        <label className="field">
          <span>Campaign name</span>
          <input
            {...form.register("name")}
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name ? (
            <small className="text-xs text-destructive">
              {errors.name.message}
            </small>
          ) : null}
        </label>

        <label className="field">
          <span>Status</span>
          <select {...form.register("status")}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Optional sender profile</span>
        <select {...form.register("senderProfileId")}>
          <option value="">Basic mode fallback</option>
          {senderProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        <small>
          Leave this unset to keep the campaign compatible with basic mode.
        </small>
      </label>

      <label className="field">
        <span>Offer summary</span>
        <textarea rows={4} {...form.register("offerSummary")} />
      </label>

      <label className="field">
        <span>Target ICP</span>
        <textarea rows={3} {...form.register("targetIcp")} />
      </label>

      <div className="formGrid">
        <label className="field">
          <span>Target industries</span>
          <textarea rows={5} {...form.register("targetIndustries")} />
          <small>One industry per line.</small>
        </label>

        <label className="field">
          <span>Framework preferences</span>
          <textarea rows={5} {...form.register("frameworkPreferences")} />
          <small>One framework or prompting preference per line.</small>
        </label>
      </div>

      <div className="formGrid toneGrid">
        <label className="field">
          <span>Tone style</span>
          <input
            {...form.register("toneStyle")}
            placeholder="Sharp, consultative, executive"
          />
        </label>

        <label className="field">
          <span>Tone preferences: do</span>
          <textarea rows={4} {...form.register("toneDo")} />
        </label>

        <label className="field">
          <span>Tone preferences: avoid</span>
          <textarea rows={4} {...form.register("toneAvoid")} />
        </label>

        <label className="field">
          <span>Tone notes</span>
          <textarea rows={4} {...form.register("toneNotes")} />
        </label>
      </div>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving campaign..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
