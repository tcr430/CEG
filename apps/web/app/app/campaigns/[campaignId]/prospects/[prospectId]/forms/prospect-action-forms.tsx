"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { ConfirmActionButton } from "../../../../../../../components/confirm-action-button";
import type { ActionResult } from "../../../../../../../lib/action-result";
import { useActionSubmit } from "../../../../../../../lib/use-action-form";
import { useRouter } from "next/navigation";

import {
  analyzeReplyAction,
  appendGeneratedSequenceMessagesAction,
  createInboundReplyAction,
  createManualOutboundMessageAction,
  createReplyInboxDraftAction,
  createSequenceInboxDraftAction,
  editReplyDraftAction,
  editSequenceStepAction,
  generateProspectSequenceAction,
  generateReplyDraftsAction,
  markOutboundMessageSentAction,
  regenerateReplyDraftAction,
  regenerateSequencePartAction,
  runProspectResearchAction,
} from "../../../../actions";

type CommonProps = {
  workspaceId: string;
  campaignId: string;
  prospectId: string;
};

/* -------------------------------------------------------------------------- */
/*  Generic action button — for actions with only hidden inputs.              */
/* -------------------------------------------------------------------------- */

type ActionButtonProps = {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  payload: Record<string, string | undefined>;
  className?: string;
  pendingLabel?: string;
  successMessage?: string;
  children: ReactNode;
};

function ActionButton({
  action,
  payload,
  className = "buttonSecondary",
  pendingLabel,
  successMessage = "Done.",
  children,
}: ActionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          if (value !== undefined && value !== null && value !== "") {
            formData.append(key, value);
          }
        }
        const result = await action(formData);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(successMessage);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
      }
    });
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={isPending}
    >
      {isPending ? (pendingLabel ?? "Working...") : children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Research form (websiteUrl)                                                 */
/* -------------------------------------------------------------------------- */

const researchSchema = z.object({
  workspaceId: z.string().min(1),
  campaignId: z.string().min(1),
  prospectId: z.string().min(1),
  websiteUrl: z
    .string()
    .trim()
    .min(1, "A public website URL is required."),
});

type ResearchValues = z.infer<typeof researchSchema>;

export function ResearchForm({
  workspaceId,
  campaignId,
  prospectId,
  defaultWebsite,
}: CommonProps & { defaultWebsite: string }) {
  const form = useForm<ResearchValues>({
    resolver: zodResolver(researchSchema),
    defaultValues: { workspaceId, campaignId, prospectId, websiteUrl: defaultWebsite },
  });
  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: runProspectResearchAction,
    successMessage: "Research complete.",
  });
  const errors = form.formState.errors;

  return (
    <form
      id="research-form"
      onSubmit={onSubmit}
      className="panel prospectResearchForm"
      noValidate
    >
      <p className="cardLabel">Stage 1</p>
      <h2>Research this target account</h2>
      <p>
        Start by grounding the workflow in real company evidence so later drafts
        and reviews stay specific. The resulting research snapshot becomes
        stored context the workflow can reuse later.
      </p>
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("campaignId")} />
      <input type="hidden" {...form.register("prospectId")} />

      <label className="field">
        <span>Public website URL</span>
        <input
          {...form.register("websiteUrl")}
          type="url"
          required
          placeholder="https://example.com"
          aria-invalid={errors.websiteUrl ? true : undefined}
        />
        {errors.websiteUrl ? (
          <small className="text-xs text-destructive">
            {errors.websiteUrl.message}
          </small>
        ) : null}
      </label>

      <p className="statusMessage">
        The workflow fetches one public page safely, extracts structured text,
        builds a confidence-aware company profile, and stores a research
        snapshot for review before generation.
      </p>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Running research..." : "Run research step"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Generate sequence (button-only with extra messaging)                       */
/* -------------------------------------------------------------------------- */

export function GenerateSequenceForm(props: CommonProps) {
  return (
    <form
      id="sequence-form"
      onSubmit={(event) => event.preventDefault()}
      className="panel prospectResearchForm"
    >
      <p className="cardLabel">Stage 2</p>
      <h2>Create a draft sequence for review</h2>
      <p>
        Draft only after the brief and research are ready, then treat the output
        as something to review, not something to send blindly.
      </p>
      <p className="statusMessage">
        Sequence generation uses the campaign brief, sender profile when
        available, and the latest research snapshot. If research confidence is
        low, the copy is instructed to stay softer and avoid unsupported
        specifics. The result is a draft sequence for review and editing before
        use.
      </p>
      <div className="inlineActions">
        <ActionButton
          action={generateProspectSequenceAction}
          payload={props}
          className="buttonPrimary"
          pendingLabel="Generating sequence..."
          successMessage="Sequence generated."
        >
          Create sequence draft
        </ActionButton>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inbound reply form                                                         */
/* -------------------------------------------------------------------------- */

const inboundSchema = z.object({
  workspaceId: z.string().min(1),
  campaignId: z.string().min(1),
  prospectId: z.string().min(1),
  subject: z.string().optional().or(z.literal("")),
  bodyText: z.string().trim().min(1, "Reply body is required."),
});

type InboundValues = z.infer<typeof inboundSchema>;

export function InboundReplyForm(props: CommonProps) {
  const form = useForm<InboundValues>({
    resolver: zodResolver(inboundSchema),
    defaultValues: { ...props, subject: "", bodyText: "" },
  });
  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: createInboundReplyAction,
    successMessage: "Inbound reply saved.",
    onSuccess: () => form.reset({ ...props, subject: "", bodyText: "" }),
  });
  const errors = form.formState.errors;

  return (
    <form
      id="inbound-reply-form"
      onSubmit={onSubmit}
      className="panel threadComposerCard"
      noValidate
    >
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("campaignId")} />
      <input type="hidden" {...form.register("prospectId")} />

      <label className="field">
        <span>Inbound subject</span>
        <input {...form.register("subject")} type="text" placeholder="Re: outbound" />
      </label>

      <label className="field">
        <span>Inbound reply</span>
        <textarea
          {...form.register("bodyText")}
          required
          rows={5}
          placeholder="Paste the latest inbound prospect reply here."
          aria-invalid={errors.bodyText ? true : undefined}
        />
        {errors.bodyText ? (
          <small className="text-xs text-destructive">
            {errors.bodyText.message}
          </small>
        ) : null}
      </label>

      <div className="inlineActions">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving inbound reply..." : "Save inbound reply"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Manual outbound form                                                       */
/* -------------------------------------------------------------------------- */

const outboundSchema = z.object({
  workspaceId: z.string().min(1),
  campaignId: z.string().min(1),
  prospectId: z.string().min(1),
  subject: z.string().optional().or(z.literal("")),
  bodyText: z.string().trim().min(1, "Outbound body is required."),
});

type OutboundValues = z.infer<typeof outboundSchema>;

export function ManualOutboundForm(props: CommonProps) {
  const form = useForm<OutboundValues>({
    resolver: zodResolver(outboundSchema),
    defaultValues: { ...props, subject: "", bodyText: "" },
  });
  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: createManualOutboundMessageAction,
    successMessage: "Outbound note saved.",
    onSuccess: () => form.reset({ ...props, subject: "", bodyText: "" }),
  });
  const errors = form.formState.errors;

  return (
    <form
      onSubmit={onSubmit}
      className="panel threadComposerCard"
      noValidate
    >
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("campaignId")} />
      <input type="hidden" {...form.register("prospectId")} />

      <label className="field">
        <span>Outbound subject</span>
        <input {...form.register("subject")} type="text" placeholder="Draft follow-up subject" />
      </label>

      <label className="field">
        <span>Manual outbound message</span>
        <textarea
          {...form.register("bodyText")}
          required
          rows={5}
          placeholder="Add a manual outbound draft or note for this thread."
          aria-invalid={errors.bodyText ? true : undefined}
        />
        {errors.bodyText ? (
          <small className="text-xs text-destructive">
            {errors.bodyText.message}
          </small>
        ) : null}
      </label>

      <div className="inlineActions">
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Saving outbound note..." : "Add manual outbound"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stand-alone action buttons used inline                                     */
/* -------------------------------------------------------------------------- */

export function AnalyzeReplyButton({
  className = "buttonPrimary",
  ...props
}: CommonProps & { className?: string }) {
  return (
    <ActionButton
      action={analyzeReplyAction}
      payload={props}
      className={className}
      pendingLabel="Analyzing reply..."
      successMessage="Reply analyzed."
    >
      Run reply analysis
    </ActionButton>
  );
}

export function GenerateReplyDraftsButton({
  className = "buttonSecondary",
  label = "Generate reply draft options",
  ...props
}: CommonProps & { className?: string; label?: string }) {
  return (
    <ActionButton
      action={generateReplyDraftsAction}
      payload={props}
      className={className}
      pendingLabel="Generating drafts..."
      successMessage="Reply drafts ready."
    >
      {label}
    </ActionButton>
  );
}

export function AppendSequenceButton({
  className = "buttonSecondary",
  ...props
}: CommonProps & { className?: string }) {
  return (
    <ActionButton
      action={appendGeneratedSequenceMessagesAction}
      payload={props}
      className={className}
      pendingLabel="Adding to thread..."
      successMessage="Sequence draft added to thread."
    >
      Add latest sequence draft to thread
    </ActionButton>
  );
}

type MarkSentProps = CommonProps & {
  messageId: string;
  sendMode: "manual" | "inferred";
  providerMessageId?: string;
  providerThreadId?: string;
  label: string;
};

export function MarkOutboundSentButton({
  workspaceId,
  campaignId,
  prospectId,
  messageId,
  sendMode,
  providerMessageId,
  providerThreadId,
  label,
}: MarkSentProps) {
  return (
    <ConfirmActionButton
      action={markOutboundMessageSentAction}
      payload={{
        workspaceId,
        campaignId,
        prospectId,
        messageId,
        sendMode,
        providerMessageId,
        providerThreadId,
      }}
      label={label}
      title="Mark this message as sent?"
      description="This records the message as sent in the thread history. The state change is hard to reverse — only confirm if the email actually went out."
      confirmLabel="Mark as sent"
      pendingLabel="Updating send state..."
      successMessage="Send state updated."
    />
  );
}

export function CreateSequenceInboxDraftButton({
  artifactType,
  targetStepNumber,
  ...props
}: CommonProps & {
  artifactType: "sequence_initial_email" | "sequence_follow_up_step";
  targetStepNumber?: number;
}) {
  return (
    <ActionButton
      action={createSequenceInboxDraftAction}
      payload={{
        ...props,
        artifactType,
        targetStepNumber:
          targetStepNumber !== undefined ? String(targetStepNumber) : undefined,
      }}
      className="buttonSecondary"
      pendingLabel="Creating draft..."
      successMessage="Gmail draft ready."
    >
      Create Gmail draft
    </ActionButton>
  );
}

export function CreateReplyInboxDraftButton({
  targetSlotId,
  ...props
}: CommonProps & { targetSlotId: string }) {
  return (
    <ActionButton
      action={createReplyInboxDraftAction}
      payload={{ ...props, targetSlotId }}
      className="buttonSecondary"
      pendingLabel="Creating draft..."
      successMessage="Gmail draft ready."
    >
      Create Gmail draft
    </ActionButton>
  );
}

/* -------------------------------------------------------------------------- */
/*  Regenerate / edit forms                                                    */
/* -------------------------------------------------------------------------- */

const regenSequenceSchema = z.object({
  workspaceId: z.string().min(1),
  campaignId: z.string().min(1),
  prospectId: z.string().min(1),
  targetPart: z.enum([
    "subject_line",
    "opener",
    "initial_email",
    "follow_up_step",
  ]),
  targetStepNumber: z.string().optional().or(z.literal("")),
  feedback: z.string().trim().min(1, "Feedback is required."),
});

type RegenSequenceValues = z.infer<typeof regenSequenceSchema>;

export function RegenerateSequencePartForm({
  targetPart,
  targetStepNumber,
  defaultFeedback,
  buttonLabel,
  fieldLabel,
  ...props
}: CommonProps & {
  targetPart: "subject_line" | "opener" | "initial_email" | "follow_up_step";
  targetStepNumber?: number;
  defaultFeedback: string;
  buttonLabel: string;
  fieldLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<RegenSequenceValues>({
    resolver: zodResolver(regenSequenceSchema),
    defaultValues: {
      ...props,
      targetPart,
      targetStepNumber:
        targetStepNumber !== undefined ? String(targetStepNumber) : "",
      feedback: defaultFeedback,
    },
  });
  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: regenerateSequencePartAction,
    successMessage: "Sequence section regenerated.",
    onSuccess: () => setOpen(false),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="secondary">
          {buttonLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{buttonLabel}</SheetTitle>
          <SheetDescription>
            Regenerating overwrites the current draft for this section.
            Capture clear feedback so the new version stays grounded in
            the same campaign brief.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="stack mt-4" noValidate>
          <input type="hidden" {...form.register("workspaceId")} />
          <input type="hidden" {...form.register("campaignId")} />
          <input type="hidden" {...form.register("prospectId")} />
          <input type="hidden" {...form.register("targetPart")} />
          {targetStepNumber !== undefined ? (
            <input type="hidden" {...form.register("targetStepNumber")} />
          ) : null}

          <label className="field">
            <span>{fieldLabel}</span>
            <textarea {...form.register("feedback")} rows={5} />
          </label>
          <div className="inlineActions">
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Regenerating..." : buttonLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const editStepSchema = z.object({
  workspaceId: z.string().min(1),
  campaignId: z.string().min(1),
  prospectId: z.string().min(1),
  targetPart: z.enum(["initial_email", "follow_up_step"]),
  targetStepNumber: z.string().optional().or(z.literal("")),
  subject: z.string(),
  opener: z.string(),
  body: z.string(),
  cta: z.string(),
  rationale: z.string(),
});

type EditStepValues = z.infer<typeof editStepSchema>;

export function EditSequenceStepForm({
  targetPart,
  targetStepNumber,
  defaults,
  buttonLabel,
  ...props
}: CommonProps & {
  targetPart: "initial_email" | "follow_up_step";
  targetStepNumber?: number;
  defaults: {
    subject: string;
    opener: string;
    body: string;
    cta: string;
    rationale: string;
  };
  buttonLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<EditStepValues>({
    resolver: zodResolver(editStepSchema),
    defaultValues: {
      ...props,
      targetPart,
      targetStepNumber:
        targetStepNumber !== undefined ? String(targetStepNumber) : "",
      ...defaults,
    },
  });
  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: editSequenceStepAction,
    successMessage: "Sequence edit saved.",
    onSuccess: () => setOpen(false),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="secondary">
          {buttonLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{buttonLabel}</SheetTitle>
          <SheetDescription>
            Saving overwrites the current stored draft for this step.
            The previous version stays in sequence history.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="stack mt-4" noValidate>
          <input type="hidden" {...form.register("workspaceId")} />
          <input type="hidden" {...form.register("campaignId")} />
          <input type="hidden" {...form.register("prospectId")} />
          <input type="hidden" {...form.register("targetPart")} />
          {targetStepNumber !== undefined ? (
            <input type="hidden" {...form.register("targetStepNumber")} />
          ) : null}

          <label className="field">
            <span>Subject</span>
            <input {...form.register("subject")} />
          </label>
          <label className="field">
            <span>Opener</span>
            <textarea {...form.register("opener")} rows={3} />
          </label>
          <label className="field">
            <span>Body</span>
            <textarea
              {...form.register("body")}
              rows={targetPart === "initial_email" ? 6 : 5}
            />
          </label>
          <label className="field">
            <span>CTA</span>
            <input {...form.register("cta")} />
          </label>
          <label className="field">
            <span>Rationale</span>
            <textarea {...form.register("rationale")} rows={3} />
          </label>
          <div className="inlineActions">
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Saving edit..." : buttonLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const regenReplySchema = z.object({
  workspaceId: z.string().min(1),
  campaignId: z.string().min(1),
  prospectId: z.string().min(1),
  targetSlotId: z.string().min(1),
  feedback: z.string().trim().min(1, "Feedback is required."),
});

type RegenReplyValues = z.infer<typeof regenReplySchema>;

export function RegenerateReplyDraftForm({
  targetSlotId,
  defaultFeedback,
  ...props
}: CommonProps & {
  targetSlotId: string;
  defaultFeedback: string;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<RegenReplyValues>({
    resolver: zodResolver(regenReplySchema),
    defaultValues: {
      ...props,
      targetSlotId,
      feedback: defaultFeedback,
    },
  });
  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: regenerateReplyDraftAction,
    successMessage: "Draft option regenerated.",
    onSuccess: () => setOpen(false),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="secondary">
          Regenerate this option
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Regenerate this draft option</SheetTitle>
          <SheetDescription>
            Regenerating overwrites this slot with a new AI-proposed
            draft. Use the feedback to steer tone, length, or strategy.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="stack mt-4" noValidate>
          <input type="hidden" {...form.register("workspaceId")} />
          <input type="hidden" {...form.register("campaignId")} />
          <input type="hidden" {...form.register("prospectId")} />
          <input type="hidden" {...form.register("targetSlotId")} />

          <label className="field">
            <span>Regeneration feedback</span>
            <textarea {...form.register("feedback")} rows={5} />
          </label>
          <div className="inlineActions">
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Regenerating..." : "Regenerate this option"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const editReplyDraftSchema = z.object({
  workspaceId: z.string().min(1),
  campaignId: z.string().min(1),
  prospectId: z.string().min(1),
  targetSlotId: z.string().min(1),
  subject: z.string(),
  bodyText: z.string(),
  strategyNote: z.string(),
});

type EditReplyDraftValues = z.infer<typeof editReplyDraftSchema>;

export function EditReplyDraftForm({
  targetSlotId,
  defaults,
  ...props
}: CommonProps & {
  targetSlotId: string;
  defaults: { subject: string; bodyText: string; strategyNote: string };
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<EditReplyDraftValues>({
    resolver: zodResolver(editReplyDraftSchema),
    defaultValues: { ...props, targetSlotId, ...defaults },
  });
  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: editReplyDraftAction,
    successMessage: "Draft edit saved.",
    onSuccess: () => setOpen(false),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="secondary">
          Edit this draft
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Edit reviewed draft</SheetTitle>
          <SheetDescription>
            Saving overwrites this draft slot with the reviewed copy.
            The previous AI version is preserved in draft history.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="stack mt-4" noValidate>
          <input type="hidden" {...form.register("workspaceId")} />
          <input type="hidden" {...form.register("campaignId")} />
          <input type="hidden" {...form.register("prospectId")} />
          <input type="hidden" {...form.register("targetSlotId")} />

          <label className="field">
            <span>Subject</span>
            <input {...form.register("subject")} />
          </label>
          <label className="field">
            <span>Body</span>
            <textarea {...form.register("bodyText")} rows={6} />
          </label>
          <label className="field">
            <span>Strategy note</span>
            <textarea {...form.register("strategyNote")} rows={3} />
          </label>
          <div className="inlineActions">
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Saving..." : "Save reviewed draft"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
