import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNoDisallowedControlChars,
  getSupabaseErrorMessage,
  normalizeTextInput,
  normalizedCharCount,
} from "../../src/lib/content-validation.ts";

test("normalizeTextInput trims valid input", () => {
  assert.equal(normalizeTextInput("  hello world  ", "Field"), "hello world");
  assert.equal(normalizedCharCount("  hello  "), 5);
});

test("normalizeTextInput rejects disallowed control characters", () => {
  assert.throws(
    () => assertNoDisallowedControlChars("bad\u0001input", "Field"),
    /Field contains unsupported control characters\./,
  );
});

test("getSupabaseErrorMessage maps missing-row errors to friendly copy", () => {
  assert.equal(
    getSupabaseErrorMessage({ code: "PGRST116", message: "The result contains 0 rows" }, "Not found."),
    "Not found.",
  );
  assert.equal(
    getSupabaseErrorMessage({ code: "42501", message: "permission denied" }, "Not found."),
    "permission denied",
  );
});
