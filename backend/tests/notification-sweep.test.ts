import assert from "node:assert/strict";
import test, { after, before, beforeEach, describe } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Notification from "../src/modules/notification/notification.model.js";
import { listNotifications } from "../src/modules/notification/notification.service.js";
import { runSweep, SweepState } from "../src/modules/notification/notification.sweep.js";
import Like from "../src/modules/resume/like.model.js";
import Resume from "../src/modules/resume/resume.model.js";
import Comment from "../src/modules/comment/comment.model.js";
import CommentVote from "../src/modules/comment/comment-vote.model.js";

// Runs against a throwaway mongod. Source rows are inserted through the raw
// driver so each test controls createdAt/updatedAt exactly — the sweep's
// behaviour is all about timestamps relative to the watermark.

let mongod: MongoMemoryServer;

const id = () => new mongoose.Types.ObjectId();
const T0 = new Date("2026-10-01T12:00:00Z");
const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

const owner = id();
const alice = id();
const bob = id();

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Notification.syncIndexes();
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(
    [Notification, SweepState, Like, Resume, Comment, CommentVote].map((m) =>
      (m as mongoose.Model<any>).deleteMany({}),
    ),
  );
  // Watermarks at T0, so events after T0 are new.
  for (const source of ["likes", "upvotes", "comments"]) {
    await SweepState.create({ _id: source, at: T0 });
  }
});

async function addResume(fields: Record<string, unknown> = {}) {
  const _id = id();
  await Resume.collection.insertOne({ _id, userId: owner, title: "My CV", likesCount: 0, ...fields });
  return _id;
}

async function addLike(resumeId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, when: Date, reaction = "like") {
  await Like.collection.insertOne({ _id: id(), resumeId, userId, reaction, createdAt: when, updatedAt: when });
}

async function addComment(fields: Record<string, unknown>) {
  const _id = id();
  const when = (fields.createdAt as Date) ?? at(1);
  await Comment.collection.insertOne({
    _id,
    text: "nice",
    parentId: null,
    upvotesCount: 0,
    downvotesCount: 0,
    createdAt: when,
    updatedAt: when,
    ...fields,
  });
  return _id;
}

const rowsFor = (recipientId: mongoose.Types.ObjectId) =>
  Notification.find({ recipientId }).sort({ lastEventAt: 1 }).lean();

describe("notification sweep", () => {
  test("first run for a source starts at now instead of notifying history", async () => {
    await SweepState.deleteMany({});
    const resumeId = await addResume({ likesCount: 1 });
    await addLike(resumeId, alice, at(5));

    assert.deepEqual(await runSweep(), { likes: 0, upvotes: 0, comments: 0 });
    assert.equal(await Notification.countDocuments(), 0);
    assert.equal(await SweepState.countDocuments(), 3);
  });

  test("folds likes on a post into one row with the latest actor and the post's count", async () => {
    const resumeId = await addResume({ likesCount: 2 });
    await addLike(resumeId, alice, at(5));
    await addLike(resumeId, bob, at(10));

    await runSweep();

    const [row] = await rowsFor(owner);
    assert.equal(row.type, "like");
    assert.equal(row.key, `like:${resumeId}`);
    assert.equal(row.count, 2);
    assert.equal(String(row.actorId), String(bob));
    assert.equal(row.readAt, null);
    assert.equal(row.lastEventAt.getTime(), at(10).getTime());
    assert.equal(row.resumeTitle, "My CV");
  });

  test("replaying the same events changes nothing", async () => {
    const resumeId = await addResume({ likesCount: 1 });
    await addLike(resumeId, alice, at(5));
    await addComment({ resumeId, userId: alice });

    await runSweep();
    const first = await Notification.find().sort({ key: 1 }).lean();

    // Rewind the watermarks so the same events are read again.
    await SweepState.updateMany({}, { $set: { at: T0 } });
    await runSweep();
    const second = await Notification.find().sort({ key: 1 }).lean();

    assert.equal(second.length, 2);
    assert.deepEqual(second, first);
  });

  test("a read row stays read on replay and turns unread on newer activity", async () => {
    const resumeId = await addResume({ likesCount: 1 });
    await addLike(resumeId, alice, at(5));
    await runSweep();

    await Notification.updateOne({ recipientId: owner }, { $set: { readAt: at(20) } });

    await SweepState.updateMany({}, { $set: { at: T0 } });
    await runSweep();
    assert.equal((await rowsFor(owner))[0].readAt?.getTime(), at(20).getTime());

    await Resume.updateOne({ _id: resumeId }, { $set: { likesCount: 2 } });
    await addLike(resumeId, bob, at(30));
    await runSweep();

    const rows = await rowsFor(owner);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].readAt, null);
    assert.equal(rows[0].count, 2);
    assert.equal(String(rows[0].actorId), String(bob));
  });

  test("ignores dislikes and events from before the overlap window", async () => {
    const resumeId = await addResume({ likesCount: 1 });
    await addLike(resumeId, alice, at(5), "dislike");
    await addLike(resumeId, bob, at(-10 * 60)); // 10 min before the watermark

    await runSweep();
    assert.equal(await Notification.countDocuments(), 0);
  });

  test("comment upvotes notify the author, but not for their own upvote", async () => {
    const resumeId = await addResume();
    const commentId = await addComment({ resumeId, userId: alice, upvotesCount: 2 });
    const vote = (userId: mongoose.Types.ObjectId, when: Date, voteType = "upvote") =>
      CommentVote.collection.insertOne({ _id: id(), commentId, userId, voteType, createdAt: when, updatedAt: when });

    await vote(bob, at(5));
    await vote(alice, at(10)); // self-upvote, newer — must not become the actor
    await vote(owner, at(15), "downvote");

    await runSweep();

    const rows = (await rowsFor(alice)).filter((r) => r.type === "comment_like");
    assert.equal(rows.length, 1);
    assert.equal(String(rows[0].actorId), String(bob));
    assert.equal(rows[0].count, 2);
    assert.equal(rows[0].lastEventAt.getTime(), at(5).getTime());
  });

  test("comments notify the post owner and replies notify the parent's author", async () => {
    const resumeId = await addResume();
    const top = await addComment({ resumeId, userId: alice, createdAt: at(5) });
    await addComment({ resumeId, userId: bob, parentId: top, createdAt: at(6) });
    await addComment({ resumeId, userId: alice, parentId: top, createdAt: at(7) }); // self-reply
    await addComment({ resumeId, userId: owner, createdAt: at(8) }); // owner on own post

    await runSweep();

    const ownerRows = await rowsFor(owner);
    assert.deepEqual(ownerRows.map((r) => [r.type, String(r.actorId)]), [["comment", String(alice)]]);

    const aliceRows = await rowsFor(alice);
    assert.deepEqual(aliceRows.map((r) => [r.type, String(r.actorId)]), [["reply", String(bob)]]);
  });

  test("skips replies to tombstoned comments and doesn't re-notify edited ones", async () => {
    const resumeId = await addResume();
    const tomb = await addComment({ resumeId, userId: null, createdAt: at(-3600) });
    await addComment({ resumeId, userId: bob, parentId: tomb, createdAt: at(5) });
    // Written long ago, edited now: updatedAt is new, createdAt isn't.
    await addComment({ resumeId, userId: alice, createdAt: at(-3600), updatedAt: at(5) });

    await runSweep();

    // The reply has no one to notify, and the edit isn't a new comment.
    assert.equal(await Notification.countDocuments(), 0);
  });

  test("stores a title beginning with $ literally", async () => {
    const resumeId = await addResume({ title: "$likesCount", likesCount: 1 });
    await addLike(resumeId, alice, at(5));

    await runSweep();
    assert.equal((await rowsFor(owner))[0].resumeTitle, "$likesCount");
  });

  test("pages through a backlog larger than one page and advances the watermark", async () => {
    const docs = [];
    const resumes = [];
    for (let i = 0; i < 1200; i++) {
      const resumeId = id();
      resumes.push({ _id: resumeId, userId: owner, title: `CV ${i}`, likesCount: 1 });
      docs.push({ _id: id(), resumeId, userId: alice, reaction: "like", createdAt: at(i + 1), updatedAt: at(i + 1) });
    }
    await Resume.collection.insertMany(resumes);
    await Like.collection.insertMany(docs);

    const result = await runSweep();

    assert.equal(result?.likes, 1200);
    assert.equal(await Notification.countDocuments({ type: "like" }), 1200);
    const state = await SweepState.findById("likes").lean();
    assert.equal(state?.at.getTime(), at(1200).getTime());
  });

  test("list quotes the comment, trimmed, and omits deleted ones", async () => {
    const resumeId = await addResume();
    const long = "word ".repeat(80);
    await addComment({ resumeId, userId: alice, text: long, createdAt: at(5) });
    const gone = await addComment({ resumeId, userId: bob, text: "bye", createdAt: at(6) });
    await runSweep();
    await Comment.collection.deleteOne({ _id: gone });

    const { items } = await listNotifications(String(owner), { limit: 10, unreadOnly: false });
    const previews = items.map((i) => i.preview);

    assert.equal(previews[1]?.endsWith("…"), true);
    assert.ok((previews[1] ?? "").length <= 141);
    assert.equal(previews[0], null);
  });
});
