"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("pagePath")} />
      <div className="grid gap-2">
        <Label>Category</Label>
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="workflow">Workflow friction</SelectItem>
                <SelectItem value="output_quality">Output quality</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="feedback-message">What should we know?</Label>
        <Textarea
          id="feedback-message"
          {...form.register("message")}
          rows={5}
          maxLength={1200}
          placeholder="Example: The research result was useful, but I was not sure whether to generate the sequence next or add it to the thread."
          aria-invalid={errors.message ? true : undefined}
          required
        />
        {errors.message ? (
          <p className="text-xs text-destructive">{errors.message.message}</p>
        ) : null}
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Sending feedback..." : "Send feedback"}
      </Button>
    </form>
  );
}
