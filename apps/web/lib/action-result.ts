/**
 * Shared `ActionResult` contract for server actions.
 *
 * Phase 3 of the shadcn migration replaces the legacy
 * `redirect("?error=...")` / `?success=` query-param banner pattern with
 * server actions that return one of these values. The client form
 * surfaces them via Sonner toasts and inline RHF field errors.
 *
 * This file is safe to import from both server and client modules. The
 * server-side helpers (`actionOk`, `actionError`, `actionZodError`) live
 * in `lib/server/action-result.ts`.
 */

export type FieldErrors = Record<string, string>;

export type ActionSuccess<T> = {
  ok: true;
  data: T;
};

export type ActionFailure = {
  ok: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;
