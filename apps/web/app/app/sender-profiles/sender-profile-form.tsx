"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SenderProfile } from "@ceg/validation";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

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
    <form onSubmit={onSubmit} className="panel senderProfileForm" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      {profile !== undefined ? (
        <input type="hidden" {...form.register("senderProfileId")} />
      ) : null}

      {!allowSenderAwareProfiles ? (
        <p className="statusMessage">
          {planLabel ?? "Current plan"} currently supports basic mode only.
          Sender-aware SDR, founder, and agency profiles unlock on a paid plan.
        </p>
      ) : null}

      <div className="formGrid">
        <label className="field">
          <span>Sender type</span>
          <select {...form.register("senderType")}>
            <option value="sdr" disabled={!allowSenderAwareProfiles}>
              SDR
            </option>
            <option value="saas_founder" disabled={!allowSenderAwareProfiles}>
              SaaS founder
            </option>
            <option value="agency" disabled={!allowSenderAwareProfiles}>
              Lead gen agency
            </option>
            <option value="basic">Basic mode fallback</option>
          </select>
          {errors.senderType ? (
            <small className="text-xs text-destructive">
              {errors.senderType.message}
            </small>
          ) : null}
        </label>

        <label className="field">
          <span>Profile name</span>
          <input
            {...form.register("name")}
            aria-invalid={errors.name ? true : undefined}
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
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="field checkboxField">
          <input type="checkbox" {...form.register("isDefault")} />
          <span>Use as default sender profile for this workspace</span>
        </label>
      </div>

      <label className="field">
        <span>Company name</span>
        <input {...form.register("companyName")} />
      </label>

      <label className="field">
        <span>Product or service description</span>
        <textarea rows={4} {...form.register("productDescription")} />
      </label>

      <label className="field">
        <span>Target customer</span>
        <textarea rows={3} {...form.register("targetCustomer")} />
      </label>

      <label className="field">
        <span>Value proposition</span>
        <textarea rows={4} {...form.register("valueProposition")} />
      </label>

      <label className="field">
        <span>Differentiation</span>
        <textarea rows={4} {...form.register("differentiation")} />
      </label>

      <div className="formGrid">
        <label className="field">
          <span>Proof points</span>
          <textarea rows={5} {...form.register("proofPoints")} />
          <small>One proof point per line.</small>
        </label>

        <label className="field">
          <span>Goals</span>
          <textarea rows={5} {...form.register("goals")} />
          <small>One goal per line.</small>
        </label>
      </div>

      <div className="formGrid toneGrid">
        <label className="field">
          <span>Tone style</span>
          <input
            {...form.register("toneStyle")}
            placeholder="Direct, consultative, measured"
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
          {isPending ? "Saving sender profile..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
