"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import type { ActionResult } from "./action-result";

type ToFormData<TValues extends FieldValues> = (values: TValues) => FormData;

type UseActionSubmitOptions<TValues extends FieldValues, TData> = {
  form: UseFormReturn<TValues>;
  action: (formData: FormData) => Promise<ActionResult<TData>>;
  /**
   * Override how the validated form values are serialised into the
   * FormData payload that the server action receives. Defaults to a
   * shallow conversion that mirrors how the legacy form fields used to
   * post: booleans -> "on" / omitted, everything else -> String().
   */
  toFormData?: ToFormData<TValues>;
  /**
   * Toast copy shown on a successful run. Pass `null` to suppress the
   * toast entirely (e.g. when the page does its own success UI).
   */
  successMessage?: string | null;
  /**
   * Optional callback invoked after a successful run, before the
   * router refresh. Receives the action's `data` payload.
   */
  onSuccess?: (data: TData) => void | Promise<void>;
  /**
   * Whether to call `router.refresh()` after success. Defaults to true
   * so server-rendered pages reflect the new state.
   */
  refresh?: boolean;
};

export type UseActionSubmitReturn = {
  onSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  isPending: boolean;
};

function defaultToFormData<TValues extends FieldValues>(
  values: TValues,
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === "boolean") {
      if (value) {
        formData.append(key, "on");
      }
      continue;
    }
    formData.append(key, String(value));
  }
  return formData;
}

/**
 * Wire an existing react-hook-form instance to a server action that
 * returns an `ActionResult`. On submit:
 *
 * 1. RHF runs its resolver to validate the typed form values.
 * 2. Values are serialised to FormData and the action runs inside a
 *    transition so React keeps the UI responsive.
 * 3. `ok: false` results trigger a Sonner error toast and, when
 *    present, set RHF field errors from `result.fieldErrors`.
 * 4. `ok: true` results trigger a success toast (configurable),
 *    optional `onSuccess` callback, and `router.refresh()`.
 *
 * The caller owns the `useForm` instance so the hook stays decoupled
 * from any specific Zod schema typing.
 */
export function useActionSubmit<TValues extends FieldValues, TData>({
  form,
  action,
  toFormData = defaultToFormData,
  successMessage = "Saved.",
  onSuccess,
  refresh = true,
}: UseActionSubmitOptions<TValues, TData>): UseActionSubmitReturn {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onSubmit = form.handleSubmit((values) => {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const formData = toFormData(values);
          const result = await action(formData);

          if (!result.ok) {
            toast.error(result.error);
            if (result.fieldErrors) {
              for (const [field, message] of Object.entries(
                result.fieldErrors,
              )) {
                form.setError(field as Path<TValues>, {
                  type: "server",
                  message,
                });
              }
            }
            resolve();
            return;
          }

          if (successMessage !== null) {
            toast.success(successMessage);
          }

          if (onSuccess) {
            await onSuccess(result.data);
          }

          if (refresh) {
            router.refresh();
          }

          resolve();
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
          );
          resolve();
        }
      });
    });
  });

  return { onSubmit, isPending };
}
