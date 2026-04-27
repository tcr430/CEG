"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SenderProfile } from "@ceg/validation";
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
  createSenderProfileAction,
  updateSenderProfileAction,
  SenderProfileActionData,
} from "./actions";

const senderProfileFormSchema = z.object({
  workspaceId: z.string().min(1),
  senderProfileId: z.string().optional(),
  senderType: z.enum(["sdr", "saas_founder", "agency", "basic"]),
  name: z
    .string()
    .trim()
    .min(1, "Profile name is required.")
    .max(160, "Profile name is too long."),
  status: z.enum(["draft", "active", "archived"]),
  isDefault: z.boolean(),
  companyName: z.string().optional().or(z.literal("")),
  productDescription: z.string().optional().or(z.literal("")),
  targetCustomer: z.string().optional().or(z.literal("")),
  valueProposition: z.string().optional().or(z.literal("")),
  differentiation: z.string().optional().or(z.literal("")),
  proofPoints: z.string().optional().or(z.literal("")),
  goals: z.string().optional().or(z.literal("")),
  toneStyle: z.string().optional().or(z.literal("")),
  toneDo: z.string().optional().or(z.literal("")),
  toneAvoid: z.string().optional().or(z.literal("")),
  toneNotes: z.string().optional().or(z.literal("")),
});

type SenderProfileFormValues = z.infer<typeof senderProfileFormSchema>;

type SenderProfileActionFn = (
  formData: FormData,
) =>
  | ReturnType<typeof createSenderProfileAction>
  | ReturnType<typeof updateSenderProfileAction>;

type SenderProfileFormProps = {
  action: SenderProfileActionFn;
  workspaceId: string;
  submitLabel: string;
  profile?: SenderProfile;
  allowSenderAwareProfiles?: boolean;
  planLabel?: string;
  /** Where to navigate after a successful submit. */
  successRedirect?: string;
  /** Toast copy shown on success. */
  successMessage?: string;
};

function joinLines(values: readonly string[] | undefined): string {
  return values && values.length > 0 ? values.join("\n") : "";
}

function buildDefaultValues(
  workspaceId: string,
  profile: SenderProfile | undefined,
): SenderProfileFormValues {
  return {
    workspaceId,
    senderProfileId: profile?.id,
    senderType: profile?.senderType ?? "basic",
    name: profile?.name ?? "",
    status: profile?.status ?? "active",
    isDefault: profile?.isDefault ?? false,
    companyName: profile?.companyName ?? "",
    productDescription: profile?.productDescription ?? "",
    targetCustomer: profile?.targetCustomer ?? "",
    valueProposition: profile?.valueProposition ?? "",
    differentiation: profile?.differentiation ?? "",
    proofPoints: joinLines(profile?.proofPoints),
    goals: joinLines(profile?.goals),
    toneStyle: profile?.tonePreferences.style ?? "",
    toneDo: joinLines(profile?.tonePreferences.do),
    toneAvoid: joinLines(profile?.tonePreferences.avoid),
    toneNotes: profile?.tonePreferences.notes ?? "",
  };
}

export function SenderProfileForm({
  action,
  workspaceId,
  submitLabel,
  profile,
  allowSenderAwareProfiles = true,
  planLabel,
  successRedirect,
  successMessage,
}: SenderProfileFormProps) {
  const router = useRouter();

  const form = useForm<SenderProfileFormValues>({
    resolver: zodResolver(senderProfileFormSchema),
    defaultValues: buildDefaultValues(workspaceId, profile),
  });

  const { onSubmit, isPending } = useActionSubmit<
    SenderProfileFormValues,
    SenderProfileActionData
  >({
    form,
    action,
    successMessage:
      successMessage ??
      (profile ? "Sender profile updated." : "Sender profile created."),
    onSuccess: (data) => {
      if (successRedirect) {
        router.push(successRedirect);
      } else {
        router.push(
          `/app/sender-profiles/${data.senderProfileId}?workspace=${data.workspaceId}`,
        );
      }
    },
  });

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} className="grid gap-5 senderProfileForm" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      {profile !== undefined ? (
        <input type="hidden" {...form.register("senderProfileId")} />
      ) : null}

      {!allowSenderAwareProfiles ? (
        <p className="text-sm text-muted-foreground">
          {planLabel ?? "Current plan"} currently supports basic mode only.
          Sender-aware SDR, founder, and agency profiles unlock on a paid plan.
        </p>
      ) : null}

      <div className="formGrid">
        <div className="grid gap-2">
          <Label>Sender type</Label>
          <Controller
            control={form.control}
            name="senderType"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sdr" disabled={!allowSenderAwareProfiles}>
                    SDR
                  </SelectItem>
                  <SelectItem value="saas_founder" disabled={!allowSenderAwareProfiles}>
                    SaaS founder
                  </SelectItem>
                  <SelectItem value="agency" disabled={!allowSenderAwareProfiles}>
                    Lead gen agency
                  </SelectItem>
                  <SelectItem value="basic">Basic mode fallback</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.senderType ? (
            <p className="text-xs text-destructive">{errors.senderType.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sp-name">Profile name</Label>
          <Input
            id="sp-name"
            {...form.register("name")}
            aria-invalid={errors.name ? true : undefined}
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
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <label className="checkboxField flex items-center gap-2">
          <input type="checkbox" {...form.register("isDefault")} />
          <span className="text-sm">Use as default sender profile for this workspace</span>
        </label>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-company">Company name</Label>
        <Input id="sp-company" {...form.register("companyName")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-product">Product or service description</Label>
        <Textarea id="sp-product" rows={4} {...form.register("productDescription")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-target">Target customer</Label>
        <Textarea id="sp-target" rows={3} {...form.register("targetCustomer")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-value">Value proposition</Label>
        <Textarea id="sp-value" rows={4} {...form.register("valueProposition")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-diff">Differentiation</Label>
        <Textarea id="sp-diff" rows={4} {...form.register("differentiation")} />
      </div>

      <div className="formGrid">
        <div className="grid gap-2">
          <Label htmlFor="sp-proof">Proof points</Label>
          <Textarea id="sp-proof" rows={5} {...form.register("proofPoints")} />
          <p className="text-xs text-muted-foreground">One proof point per line.</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sp-goals">Goals</Label>
          <Textarea id="sp-goals" rows={5} {...form.register("goals")} />
          <p className="text-xs text-muted-foreground">One goal per line.</p>
        </div>
      </div>

      <div className="formGrid toneGrid">
        <div className="grid gap-2">
          <Label htmlFor="sp-tone-style">Tone style</Label>
          <Input
            id="sp-tone-style"
            {...form.register("toneStyle")}
            placeholder="Direct, consultative, measured"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sp-tone-do">Tone preferences: do</Label>
          <Textarea id="sp-tone-do" rows={4} {...form.register("toneDo")} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sp-tone-avoid">Tone preferences: avoid</Label>
          <Textarea id="sp-tone-avoid" rows={4} {...form.register("toneAvoid")} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="sp-tone-notes">Tone notes</Label>
          <Textarea id="sp-tone-notes" rows={4} {...form.register("toneNotes")} />
        </div>
      </div>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving sender profile..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
