import assert from "node:assert/strict";

import { assertSafeUrl, validateSafeUrl } from "../dist/index.js";

const allowed = validateSafeUrl("https://example.com/about");
assert.equal(allowed.ok, true);

const localhost = validateSafeUrl("http://localhost:3000");
assert.equal(localhost.ok, false);

const credentials = validateSafeUrl("https://user:pass@example.com");
assert.equal(credentials.ok, false);

assert.equal(assertSafeUrl("https://acme.com"), "https://acme.com/");
assert.throws(() => assertSafeUrl("http://127.0.0.1"), /not allowed/i);

console.log("@ceg/security contract tests passed");
