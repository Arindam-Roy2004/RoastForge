import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { NextFunction, Request, Response } from "express";
import { sanitizeBody } from "../src/common/middleware/security.middleware.js";

/** Runs the middleware over a body and returns the mutated result. */
function scrub(body: unknown): unknown {
  const req = { body } as Request;
  let nextCalled = false;
  const next = (() => {
    nextCalled = true;
  }) as NextFunction;

  sanitizeBody(req, {} as Response, next);

  assert.equal(nextCalled, true, "sanitizeBody must always call next()");
  return req.body;
}

describe("sanitizeBody", () => {
  test("strips top-level operator keys", () => {
    assert.deepEqual(scrub({ email: "a@b.com", $where: "1==1" }), { email: "a@b.com" });
  });

  test("strips operator keys nested inside a value", () => {
    // The case a non-recursive scrubber misses: { $ne: "" } matches any document.
    assert.deepEqual(scrub({ email: { $ne: "" } }), { email: {} });
  });

  test("strips dotted keys that would reach into subdocuments", () => {
    assert.deepEqual(
      scrub({ "publicProfile.shareIdentityWithRecruiters": true, name: "ok" }),
      { name: "ok" },
    );
  });

  test("recurses through arrays of objects", () => {
    assert.deepEqual(
      scrub({ filters: [{ $gt: 5 }, { score: 5 }] }),
      { filters: [{}, { score: 5 }] },
    );
  });

  test("recurses to arbitrary depth", () => {
    assert.deepEqual(
      scrub({ a: { b: { c: { $regex: ".*" }, keep: 1 } } }),
      { a: { b: { c: {}, keep: 1 } } },
    );
  });

  test("leaves legitimate payloads untouched", () => {
    const clean = {
      title: "Senior Backend Engineer",
      // A $ anywhere but the first character is an ordinary character.
      blurb: "Cost me $200 in Gemini credits",
      skills: ["node", "mongodb"],
      score: 87,
      nested: { targetRole: "Backend", tags: ["a", "b"] },
    };
    assert.deepEqual(scrub(structuredClone(clean)), clean);
  });

  test("preserves null and falsy primitives", () => {
    assert.deepEqual(scrub({ a: null, b: 0, c: false, d: "" }), {
      a: null,
      b: 0,
      c: false,
      d: "",
    });
  });

  test("tolerates a missing or non-object body", () => {
    assert.equal(scrub(undefined), undefined);
    assert.equal(scrub("raw string"), "raw string");
  });

  test("does not blow the stack on a self-referential body", () => {
    const cyclic: Record<string, unknown> = { name: "ok" };
    cyclic.self = cyclic;
    assert.doesNotThrow(() => scrub(cyclic));
  });
});
