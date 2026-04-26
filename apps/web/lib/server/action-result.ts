import "server-only";

import { ZodError } from "zod";

import type {
  ActionFailure,
  ActionSuccess,
  FieldErrors,
} from "../action-result";

import { toUserFacingError } from "./user-facing-errors";

/**
 * Build a successful action result. Pass `data` for actions whose caller
 * needs the created/updated entity (e.g. for redirects); omit it for
 * fire-and-forget mutations.
 */
export function actionOk<T>(data: T): ActionSuccess<T>;
export function actionOk(): ActionSuccess<undefined>;
export function actionOk<T>(data?: T): ActionSuccess<T | undefined> {
  return { ok: true, data: data as T };
}

/**
 * Build a failed action result. ZodErrors are exploded into
 * `fieldErrors` so the form can surface them inline; everything else is
 * routed through the existing user-facing error mapper so toast copy
 * stays consistent with the legacy banner copy.
 */
export function actionError(
  error: unknown,
  fallbackMessage: string,
): ActionFailure {
  if (error instanceof ZodError) {
    return actionZodError(error, fallbackMessage);
  }
  const userFacing = toUserFacingError(error, fallbackMessage);
  return { ok: false, error: userFacing.message };
}

export function actionZodError(
  error: ZodError,
  fallbackMessage: string,
): ActionFailure {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (path && fieldErrors[path] === undefined) {
      fieldErrors[path] = issue.message;
    }
  }
  return {
    ok: false,
    error: fallbackMessage,
    fieldErrors:
      Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  };
}
