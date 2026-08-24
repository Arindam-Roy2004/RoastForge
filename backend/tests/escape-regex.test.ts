import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { escapeRegex } from "../src/modules/recruiter/recruiter.service.js";

// The recruiter search embeds `role` into a Mongo $regex, so unescaped input is
// both an information-disclosure and a CPU-exhaustion primitive.

describe("escapeRegex", () => {
  test("neutralises a catch-all pattern", () => {
    const escaped = escapeRegex(".*");
    assert.equal(escaped, "\\.\\*");
    assert.equal(new RegExp(escaped).test("Backend"), false);
    assert.equal(new RegExp(escaped).test(".*"), true);
  });

  test("escapes every metacharacter", () => {
    for (const char of [".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]) {
      assert.equal(escapeRegex(char), `\\${char}`, `${char} must be escaped`);
    }
  });

  test("defuses a catastrophic-backtracking payload", () => {
    const escaped = escapeRegex("(a+)+$");
    const started = Date.now();
    assert.equal(new RegExp(escaped).test(`${"a".repeat(40)}b`), false);
    assert.ok(Date.now() - started < 1000, "escaped pattern must not backtrack");
  });

  test("leaves ordinary role strings usable", () => {
    assert.equal(escapeRegex("Backend Engineer"), "Backend Engineer");
    assert.equal(new RegExp(escapeRegex("Backend"), "i").test("backend engineer"), true);
  });

  test("is a no-op on an empty string", () => {
    assert.equal(escapeRegex(""), "");
  });
});
