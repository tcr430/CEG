import assert from "node:assert/strict";

const moduleUrl = new URL("../lib/server/user-facing-errors.ts", import.meta.url);
const {
  decodeUserFacingMessage,
  toUserFacingError,
} = await import(moduleUrl.href);

const gated = toUserFacingError(new Error("Current workspace plan does not include sender-aware profiles."));
assert.equal(gated.code, "feature-not-included");
assert.match(gated.message, /not included/i);

const invalidUrl = toUserFacingError(new Error("Unsafe URL: localhost is blocked."));
assert.equal(invalidUrl.code, "invalid-website-url");

const fallback = toUserFacingError(new Error("Totally unknown failure"), "Friendly fallback.");
assert.equal(fallback.code, "unknown-error");
assert.equal(fallback.message, "Friendly fallback.");

assert.equal(decodeUserFacingMessage("Signed%20out."), "Signed out.");
assert.equal(decodeUserFacingMessage(undefined), null);

console.log("apps/web user-facing error tests passed");
