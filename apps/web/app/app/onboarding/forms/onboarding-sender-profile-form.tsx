"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { createOnboardingSenderProfileAction } from "../actions";

const schema = z.object({
  workspaceId: z.string().min(1),
  senderType: z.enum(["sdr", "saas_founder", "agency"]),
  name: z
    .string()
    .trim()
    .min(1, "Profile name is required.")
    .max(160, "Profile name is too long."),
  companyName: z.string().optional().or(z.literal("")),
  productDescription: z.string().optional().or(z.literal("")),
  targetCustomer: z.string().optional().or(z.literal("")),
  valueProposition: z.string().optional().or(z.literal("")),
  proofPoints: z.string().optional().or(z.literal("")),
  goals: z.string().optional().or(z.literal("")),
  toneStyle: z.string().optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

type Defaults = {
  name: string;
  companyName: string;
  offer: string;
  targetBuyer: string;
  valueProposition: string;
  proofPoints: string;
  goals: string;
  toneStyle: string;
};

type Props = {
  workspaceId: string;
  senderType: "sdr" | "saas_founder" | "agency";
  defaults: Defaults;
};

export function OnboardingSenderProfileForm({
  workspaceId,
  senderType,
  defaults,
}: Props) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      workspaceId,
      senderType,
      name: defaults.name,
      companyName: "",
      productDescription: "",
      targetCustomer: "",
      valueProposition: "",
      proofPoints: "",
      goals: "",
      toneStyle: "",
    },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: createOnboardingSenderProfileAction,
    successMessage: "Sender profile created.",
  });

  const errors = form.formState.errors;

  return (
    <form
      onSubmit={onSubmit}
      className="panel compactPanel senderProfileForm"
      noValidate
    >
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("senderType")} />

      <p className="statusMessage">
        Keep this concise. A good first profile gives the system enough context
        to draft and classify inside the right workflow, and the team can
        refine it later.
      </p>

      <div className="formGrid">
        <label className="field">
          <span>Profile name</span>
          <input
            {...form.register("name")}
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name ? (
            <small className="text-xs text-destructive">{errors.name.message}</small>
          ) : null}
        </label>
        <label className="field">
          <span>Company name</span>
          <input
            {...form.register("companyName")}
            placeholder={defaults.companyName}
          />
        </label>
      </div>

      <label className="field">
        <span>Offer or service</span>
        <textarea
          {...form.register("productDescription")}
          rows={3}
          placeholder={defaults.offer}
        />
      </label>

      <div className="formGrid">
        <label className="field">
          <span>Target buyer</span>
          <textarea
            {...form.register("targetCustomer")}
            rows={3}
            placeholder={defaults.targetBuyer}
          />
        </label>
        <label className="field">
          <span>Value proposition</span>
          <textarea
            {...form.register("valueProposition")}
            rows={3}
            placeholder={defaults.valueProposition}
          />
        </label>
      </div>

      <div className="formGrid">
        <label className="field">
          <span>Proof points</span>
          <textarea
            {...form.register("proofPoints")}
            rows={4}
            placeholder={defaults.proofPoints}
          />
          <small>Use one line per proof point the team can safely reuse in later drafts.</small>
        </label>
        <label className="field">
          <span>Workflow goals</span>
          <textarea
            {...form.register("goals")}
            rows={4}
            placeholder={defaults.goals}
          />
          <small>Use one line per goal, such as booked calls, qualified replies, or smoother client delivery.</small>
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
          {isPending ? "Creating sender profile..." : "Create sender workflow profile"}
        </Button>
      </div>
    </form>
  );
}
