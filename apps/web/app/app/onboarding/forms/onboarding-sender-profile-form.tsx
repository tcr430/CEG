"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
      className="grid gap-4"
      noValidate
    >
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("senderType")} />

      <p className="text-sm text-muted-foreground">
        Keep this concise. A good first profile gives the system enough context
        to draft and classify inside the right workflow, and the team can
        refine it later.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sp-name">Profile name</Label>
          <Input
            id="sp-name"
            {...form.register("name")}
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sp-company">Company name</Label>
          <Input
            id="sp-company"
            {...form.register("companyName")}
            placeholder={defaults.companyName}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-offer">Offer or service</Label>
        <Textarea
          id="sp-offer"
          {...form.register("productDescription")}
          rows={3}
          placeholder={defaults.offer}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sp-buyer">Target buyer</Label>
          <Textarea
            id="sp-buyer"
            {...form.register("targetCustomer")}
            rows={3}
            placeholder={defaults.targetBuyer}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sp-value">Value proposition</Label>
          <Textarea
            id="sp-value"
            {...form.register("valueProposition")}
            rows={3}
            placeholder={defaults.valueProposition}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sp-proof">Proof points</Label>
          <Textarea
            id="sp-proof"
            {...form.register("proofPoints")}
            rows={4}
            placeholder={defaults.proofPoints}
          />
          <p className="text-xs text-muted-foreground">Use one line per proof point the team can safely reuse in later drafts.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sp-goals">Workflow goals</Label>
          <Textarea
            id="sp-goals"
            {...form.register("goals")}
            rows={4}
            placeholder={defaults.goals}
          />
          <p className="text-xs text-muted-foreground">Use one line per goal, such as booked calls, qualified replies, or smoother client delivery.</p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sp-tone">Tone style</Label>
        <Input
          id="sp-tone"
          {...form.register("toneStyle")}
          placeholder={defaults.toneStyle}
        />
      </div>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating sender profile..." : "Create sender workflow profile"}
        </Button>
      </div>
    </form>
  );
}
