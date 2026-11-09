import assert from "node:assert/strict";
import test, { describe } from "node:test";
import Resume from "../src/modules/resume/resume.model.js";
import Comment from "../src/modules/comment/comment.model.js";
import { PUBLIC_AUTHOR_FIELDS, populateAuthor } from "../src/common/utils/public-author.js";

// The resume feed, resume detail and comment threads are public and promise
// anonymity. Populating the author's real name or Google photo onto them
// de-anonymises every poster to an unauthenticated caller.
const IDENTITY_FIELDS = ["name", "email", "avatar", "googleId", "publicProfile"];

/** The `select` Mongoose will apply when it populates `userId` on this query. */
function populatedSelect(q: unknown): string {
  const populate = (q as { _mongooseOptions: { populate?: Record<string, { select?: string }> } })
    ._mongooseOptions.populate;
  const select = populate?.userId?.select;
  assert.equal(typeof select, "string", "expected userId to be populated with an explicit select");
  return select as string;
}

describe("public author projection", () => {
  test("contains no identity fields", () => {
    const fields = PUBLIC_AUTHOR_FIELDS.split(/\s+/);
    for (const f of IDENTITY_FIELDS) assert.ok(!fields.includes(f), `${f} must not be public`);
  });

  test("still includes the anonymous username the UI renders", () => {
    assert.ok(PUBLIC_AUTHOR_FIELDS.split(/\s+/).includes("anonymousUsername"));
  });

  for (const [label, q] of [
    ["resume query", () => populateAuthor(Resume.find({}))],
    ["comment query", () => populateAuthor(Comment.find({}))],
  ] as const) {
    test(`${label} populates userId with only the public fields`, () => {
      assert.equal(populatedSelect(q()), PUBLIC_AUTHOR_FIELDS);
    });
  }
});
