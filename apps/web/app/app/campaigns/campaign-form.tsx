"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Campaign, SenderProfile } from "@ceg/validation";
import { useRouter } from "next/navigation";
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
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      {campaign !== undefined ? (
        <input type="hidden" {...form.register("campaignId")} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="campaign-name">Campaign name</Label>
          <Input
            id="campaign-name"
            {...form.register("name")}
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Optional sender profile</Label>
        <Controller
          control={form.control}
          name="senderProfileId"
          render={({ field }) => (
            <Select
              onValueChange={field.onChange}
              value={field.value ?? ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Basic mode fallback" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Basic mode fallback</SelectItem>
                {senderProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Leave this unset to keep the campaign compatible with basic mode.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="campaign-offer">Offer summary</Label>
        <Textarea id="campaign-offer" rows={4} {...form.register("offerSummary")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="campaign-icp">Target ICP</Label>
        <Textarea id="campaign-icp" rows={3} {...form.register("targetIcp")} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="campaign-industries">Target industries</Label>
          <Textarea id="campaign-industries" rows={5} {...form.register("targetIndustries")} />
          <p className="text-xs text-muted-foreground">One industry per line.</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="campaign-framework">Framework preferences</Label>
          <Textarea id="campaign-framework" rows={5} {...form.register("frameworkPreferences")} />
          <p className="text-xs text-muted-foreground">One framework or prompting preference per line.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="campaign-tone-style">Tone style</Label>
          <Input
            id="campaign-tone-style"
            {...form.register("toneStyle")}
            placeholder="Sharp, consultative, executive"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="campaign-tone-do">Tone preferences: do</Label>
          <Textarea id="campaign-tone-do" rows={4} {...form.register("toneDo")} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="campaign-tone-avoid">Tone preferences: avoid</Label>
          <Textarea id="campaign-tone-avoid" rows={4} {...form.register("toneAvoid")} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="campaign-tone-notes">Tone notes</Label>
          <Textarea id="campaign-tone-notes" rows={4} {...form.register("toneNotes")} />
        </div>
      </div>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving campaign..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
