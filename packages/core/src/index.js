export const senderProfileTypes = [
    "sdr",
    "saas_founder",
    "agency",
    "basic",
];
export class AppError extends Error {
    code;
    cause;
    constructor(message, options) {
        super(message);
        this.name = "AppError";
        this.code = options?.code ?? "APP_ERROR";
        this.cause = options?.cause;
    }
}
export function ok(value) {
    return { ok: true, value };
}
export function err(error) {
    return { ok: false, error };
}
