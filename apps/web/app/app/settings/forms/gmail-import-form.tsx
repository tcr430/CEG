"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";

import { useActionSubmit } from "../../../../lib/use-action-form";
import { importRecentGmailThreadsAction } from "../actions";

const gmailImportSchema = z.object({
  workspaceId: z.string().min(1),
  inboxAccountId: z.string().min(1),
  maxResults: z.string(),
});

type GmailImportValues = z.infer<typeof gmailImportSchema>;

type GmailImportFormProps = {
  workspaceId: string;
  inboxAccountId: string;
  maxResults?: number;
};

export function GmailImportForm({
  workspaceId,
  inboxAccountId,
  maxResults = 10,
}: GmailImportFormProps) {
  const form = useForm<GmailImportValues>({
    resolver: zodResolver(gmailImportSchema),
    defaultValues: {
      workspaceId,
      inboxAccountId,
      maxResults: String(maxResults),
    },
  });

  const { onSubmit, isPending } = useActionSubmit({
    form,
    action: importRecentGmailThreadsAction,
    // Custom success toast below, suppress the default.
    successMessage: null,
    onSuccess: (data) => {
      toast.success(
        `Imported ${data.importedThreadCount} Gmail threads, stored ${data.importedMessageCount} new messages, and auto-analyzed ${data.analyzedReplyCount} reply threads.`,
      );
    },
  });

  return (
    <form onSubmit={onSubmit} className="inlineActions profileHeaderActions">
      <input type="hidden" {...form.register("workspaceId")} />
      <input type="hidden" {...form.register("inboxAccountId")} />
      <input type="hidden" {...form.register("maxResults")} />
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Importing threads..." : "Import recent threads"}
      </Button>
    </form>
  );
}
