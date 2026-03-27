export type SenderProfileType =
  | "sdr"
  | "saas_founder"
  | "agency"
  | "basic";

export const senderProfileTypes = [
  "sdr",
  "saas_founder",
  "agency",
  "basic",
] as const satisfies readonly SenderProfileType[];

export class AppError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(message: string, options?: { code?: string; cause?: unknown }) {
    super(message);
    this.name = "AppError";
    this.code = options?.code ?? "APP_ERROR";
    this.cause = options?.cause;
  }
}

export type Result<TValue, TError = AppError> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      error: TError;
    };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}
