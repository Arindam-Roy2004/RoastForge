import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { decodeCursor, encodeCursor } from "../src/modules/notification/notification.service.js";

describe("notification cursor", () => {
  const id = "65f0c0ffee0c0ffee0c0ffee";

  test("round-trips timestamp and id", () => {
    const at = new Date("2026-10-01T12:00:00.123Z");
    const decoded = decodeCursor(encodeCursor(at, id));
    assert.equal(decoded.at.getTime(), at.getTime());
    assert.equal(decoded.id.toString(), id);
  });

  test("rejects malformed cursors", () => {
    for (const bad of ["", "abc", "123", "x_" + id, "123_notanid"]) {
      assert.throws(() => decodeCursor(bad), /Invalid cursor/, bad);
    }
  });
});
