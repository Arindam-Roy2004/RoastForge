import assert from "node:assert/strict";
import test, { afterEach, describe } from "node:test";
import { resolveTrustProxy } from "../src/common/config/trust-proxy.js";

// Every IP-keyed rate limiter reads req.ip, which is only trustworthy if this
// matches the real proxy chain.

const original = process.env.TRUST_PROXY;

afterEach(() => {
  if (original === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = original;
});

function withEnv(value: string | undefined): number | boolean | string {
  if (value === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = value;
  return resolveTrustProxy();
}

describe("resolveTrustProxy", () => {
  test("defaults to a single proxy hop when unset", () => {
    assert.equal(withEnv(undefined), 1);
  });

  test("defaults to a single hop for a blank value", () => {
    // A blank line in .env must not read as "trust nothing", which would collapse
    // every caller into one rate-limit bucket.
    assert.equal(withEnv(""), 1);
    assert.equal(withEnv("   "), 1);
  });

  test("parses a hop count", () => {
    assert.equal(withEnv("2"), 2);
    assert.equal(withEnv(" 3 "), 3);
  });

  test("supports explicit boolean forms", () => {
    assert.equal(withEnv("true"), true);
    assert.equal(withEnv("false"), false);
  });

  test("passes non-numeric values through as a subnet spec", () => {
    assert.equal(withEnv("loopback"), "loopback");
    assert.equal(withEnv("10.0.0.0/8"), "10.0.0.0/8");
  });

  test("treats 0 as trusting no proxy", () => {
    assert.equal(withEnv("0"), 0);
  });
});
