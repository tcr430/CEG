"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";

import type { ActionResult } from "../lib/action-result";

/**
 * Phase 4: button that fires a destructive server action behind an
 * AlertDialog confirmation. Used for actions whose entire UX is a
 * single click — mark sent, remove member, etc. — where the user has
 * no other surface to express intent. Forms with their own input
 * fields belong in a Sheet instead; the act of typing into the form is
 * already the deliberate gesture, so a second confirm dialog is noise.
 */
type ConfirmActionButtonProps = {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  payload: Record<string, string | undefined>;
  /** Trigger button label (closed state). */
  label: ReactNode;
  /** AlertDialog headline. */
  title: string;
  /** AlertDialog body text. */
  description: string;
  /** Confirm button label inside the dialog. */
  confirmLabel?: string;
  /** Cancel button label inside the dialog. */
  cancelLabel?: string;
  /** Toast copy on success. */
  successMessage?: string;
  /** Pending label while the action runs. */
  pendingLabel?: string;
  /** Variant for the trigger button. */
  triggerVariant?: ButtonProps["variant"];
  /** Variant for the confirm action button. */
  confirmVariant?: ButtonProps["variant"];
  /** Extra trigger className (e.g. legacy `buttonSecondary`). */
  triggerClassName?: string;
};

export function ConfirmActionButton({
  action,
  payload,
  label,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  successMessage = "Done.",
  pendingLabel = "Working...",
  triggerVariant = "secondary",
  confirmVariant = "default",
  triggerClassName,
}: ConfirmActionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
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
        setOpen(false);
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          className={triggerClassName}
          disabled={isPending}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            // Override default styling so the confirm button matches the
            // requested variant (e.g. `destructive`).
            className={confirmVariant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
