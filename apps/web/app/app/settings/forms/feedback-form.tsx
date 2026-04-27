"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { submitWorkspaceFeedbackAction } from "../actions";

const feedbackSchema = z.object({
  workspaceId: z.string().min(1),
  pagePath: z.string().min(1),
  category: z.enum(["bug", "workflow", "output_quality", "billing", "other"]),
  message: z
    .string()
    .trim()
    .min(1, "Tell us what we should know.")
    .max(1200),
});

type FeedbackValues = z.infer<typeof feedbackSchema>;

type FeedbackFormProps = {
  workspaceId: string;
  pagePath: string;
};

export function FeedbackForm({ workspaceId, pagePath }: FeedbackFormProps) {
  const form = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      workspaceId,
      pagePath,
      category: "workflow",
      message: "",
    },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: submitWorkspaceFeedbackAction,
    successMessage: "Feedback received.",
    onSuccess: () => {
      form.reset({ workspaceId, pagePath, category: "workflow", message: "" });
    },
  });

  const errors = form.formState.errors;

  return (
    <form onSubmit={onSubmit} className="stack" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("pagePath")} />
      <label>
        <span>Category</span>
        <select {...form.register("category")}>
          <option value="bug">Bug</option>
          <option value="workflow">Workflow friction</option>
          <option value="output_quality">Output quality</option>
          <option value="billing">Billing</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label>
        <span>What should we know?</span>
        <textarea
          {...form.register("message")}
          rows={5}
          maxLength={1200}
          placeholder="Example: The research result was useful, but I was not sure whether to generate the sequence next or add it to the thread."
          aria-invalid={errors.message ? true : undefined}
          required
        />
        {errors.message ? (
          <small className="text-xs text-destructive">{errors.message.message}</small>
        ) : null}
      </label>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Sending feedback..." : "Send feedback"}
      </Button>
    </form>
  );
}
