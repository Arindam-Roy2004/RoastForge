import assert from "node:assert/strict";
import test, { after, before, describe } from "node:test";
import http from "node:http";
import type { AddressInfo } from "node:net";

// Runs with no Mongo connection — the state a broken deploy is in. The deploy
// workflow keeps or rolls back a release based purely on /health/ready.

process.env.JWT_ACCESS_SECRET ??= "a".repeat(32);
process.env.JWT_REFRESH_SECRET ??= "b".repeat(32);
process.env.GOOGLE_CLIENT_ID ??= "123.apps.googleusercontent.com";
process.env.GOOGLE_AI_KEY ??= "test-key";

let server: http.Server;
let baseUrl: string;

before(async () => {
  const { default: app } = await import("../src/app.js");
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("health endpoints with no database connection", () => {
  test("liveness reports OK even though Mongo is not connected", async () => {
    // The container HEALTHCHECK uses this; failing it would restart-loop the app
    // over a database problem a restart can't fix.
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);

    const body = (await res.json()) as { ok: boolean };
    assert.equal(body.ok, true);
  });

  test("readiness reports 503 when Mongo is not connected", async () => {
    const res = await fetch(`${baseUrl}/health/ready`);
    assert.equal(res.status, 503);

    const body = (await res.json()) as { ok: boolean; checks: { mongo: string } };
    assert.equal(body.ok, false);
    assert.equal(body.checks.mongo, "disconnected");
  });

  test("readiness is reachable without credentials", async () => {
    // If it required a token the deploy gate couldn't poll it.
    const res = await fetch(`${baseUrl}/health/ready`);
    assert.notEqual(res.status, 401);
    assert.notEqual(res.status, 403);
  });

  test("readiness is non-2xx while unready, so curl --fail exits non-zero", async () => {
    const res = await fetch(`${baseUrl}/health/ready`);
    assert.ok(res.status < 200 || res.status >= 300, "must not be 2xx when unready");
  });
});
