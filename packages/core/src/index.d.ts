export type SenderProfileType = "sdr" | "saas_founder" | "agency" | "basic";
export declare const senderProfileTypes: readonly ["sdr", "saas_founder", "agency", "basic"];
export declare class AppError extends Error {
    readonly code: string;
    readonly cause?: unknown;
    constructor(message: string, options?: {
        code?: string;
        cause?: unknown;
    });
}
export type Result<TValue, TError = AppError> = {
    ok: true;
    value: TValue;
} | {
    ok: false;
    error: TError;
};
export declare function ok<TValue>(value: TValue): Result<TValue, never>;
export declare function err<TError>(error: TError): Result<never, TError>;
//# sourceMappingURL=index.d.ts.map