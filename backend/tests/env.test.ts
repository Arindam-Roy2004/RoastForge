import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { assertEnv } from "../src/common/config/env.js";

// assertEnv memoises only on success, so the failure cases can share one module
// instance. The success case runs last, followed by the memoisation check.

const KEYS = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_AI_KEY",
] as const;

function validEnv(): Record<string, string> {
  return {
    JWT_ACCESS_SECRET: "a".repeat(32),
    JWT_REFRESH_SECRET: "b".repeat(32),
    GOOGLE_CLIENT_ID: "1234567890.apps.googleusercontent.com",
    GOOGLE_AI_KEY: "test-gemini-key",
  };
}

function applyEnv(values: Record<string, string | undefined>): void {
  for (const key of KEYS) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("assertEnv", () => {
  test("names every missing variable at once", () => {
    applyEnv({});
    assert.throws(
      () => assertEnv(),
      (err: Error) => {
        for (const key of KEYS) assert.match(err.message, new RegExp(key));
        return true;
      },
    );
  });

  test("rejects GOOGLE_CLIENT_ID being absent", () => {
    // Regression: env.ts required it while env.example never listed it.
    applyEnv({ ...validEnv(), GOOGLE_CLIENT_ID: undefined });
    assert.throws(() => assertEnv(), /GOOGLE_CLIENT_ID/);
  });

  test("treats an empty string as missing", () => {
    applyEnv({ ...validEnv(), GOOGLE_AI_KEY: "" });
    assert.throws(() => assertEnv(), /Missing required env.*GOOGLE_AI_KEY/s);
  });

  test("rejects a low-entropy JWT secret", () => {
    applyEnv({ ...validEnv(), JWT_ACCESS_SECRET: "short" });
    assert.throws(() => assertEnv(), /Weak secrets.*JWT_ACCESS_SECRET/s);
  });

  test("does not apply the entropy floor to GOOGLE_CLIENT_ID", () => {
    applyEnv({ ...validEnv(), GOOGLE_CLIENT_ID: "x" });
    assert.doesNotThrow(() => assertEnv());
  });

  test("memoises after the first success", () => {
    applyEnv(validEnv());
    assert.doesNotThrow(() => assertEnv());

    applyEnv({});
    assert.doesNotThrow(() => assertEnv(), "should not re-check after success");
  });
});
