import assert from "node:assert/strict";
import test, { after, before, beforeEach, describe } from "node:test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// End to end through the real middleware chain — token, per-request user
// lookup, requireAdmin, DTOs — because the security properties live in that
// wiring, not in the service functions alone.

process.env.JWT_ACCESS_SECRET ??= "a".repeat(32);
process.env.JWT_REFRESH_SECRET ??= "b".repeat(32);
process.env.GOOGLE_CLIENT_ID ??= "123.apps.googleusercontent.com";
process.env.GOOGLE_AI_KEY ??= "test-key";

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/modules/auth/auth.model.js");
const { default: Resume } = await import("../src/modules/resume/resume.model.js");
const { default: Like } = await import("../src/modules/resume/like.model.js");
const { default: Comment, TOMBSTONE_TEXT } = await import("../src/modules/comment/comment.model.js");
const { default: AdminAudit } = await import("../src/modules/admin/admin-audit.model.js");
const { generateAccessToken } = await import("../src/common/utils/jwt.utils.js");

let mongod: MongoMemoryServer;
let server: http.Server;
let baseUrl: string;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User, Resume, Like, Comment, AdminAudit].map((m) => (m as mongoose.Model<any>).deleteMany({})));
});

let seq = 0;
async function makeUser(fields: Record<string, unknown> = {}) {
  seq += 1;
  const user = await User.create({
    name: `User ${seq}`,
    email: `user${seq}@example.com`,
    anonymousUsername: `anon-${seq}`,
    ...fields,
  });
  return { id: String(user._id), email: user.email, token: generateAccessToken({ id: String(user._id) }) };
}

async function call(token: string | null, method: string, path: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: (await res.json()) as { success: boolean; message: string; data: any } };
}

describe("admin access control", () => {
  test("rejects anonymous callers and non-admins", async () => {
    const member = await makeUser();
    assert.equal((await call(null, "GET", "/api/admin/overview")).status, 401);
    assert.equal((await call(member.token, "GET", "/api/admin/overview")).status, 403);
    assert.equal((await call(member.token, "GET", "/api/admin/users")).status, 403);
  });

  test("admins get the overview", async () => {
    const admin = await makeUser({ isAdmin: true });
    await makeUser({ role: "recruiter" });
    const res = await call(admin.token, "GET", "/api/admin/overview");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.counts.users, 2);
    assert.equal(res.body.data.counts.recruiters, 1);
    assert.equal(res.body.data.counts.admins, 1);
  });

  test("overview buckets activity by UTC day and compares this week with the last", async () => {
    const admin = await makeUser({ isAdmin: true });
    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    // Today (with `admin`), 3 days ago, 10 days ago, and outside the 14-day window.
    for (const n of [3, 10, 10, 30]) {
      const u = await makeUser();
      await User.collection.updateOne({ _id: new mongoose.Types.ObjectId(u.id) }, { $set: { createdAt: daysAgo(n) } });
    }

    const { data } = (await call(admin.token, "GET", "/api/admin/overview")).body;
    assert.equal(data.series.length, 14);
    assert.equal(data.series.at(-1).date, new Date().toISOString().slice(0, 10));
    assert.equal(data.series.at(-1).users, 1);
    assert.equal(data.series.reduce((n: number, d: { users: number }) => n + d.users, 0), 4);
    assert.deepEqual(data.weekly.users, { current: 2, previous: 2 });
    assert.equal(data.counts.users, 5);
    assert.equal(data.counts.candidates, 5);
  });

  test("revoking admin in the database takes effect on the same token", async () => {
    const admin = await makeUser({ isAdmin: true });
    assert.equal((await call(admin.token, "GET", "/api/admin/overview")).status, 200);
    await User.updateOne({ _id: admin.id }, { $set: { isAdmin: false } });
    assert.equal((await call(admin.token, "GET", "/api/admin/overview")).status, 403);
  });

  test("admin accounts, including the caller's own, can't be changed from the panel", async () => {
    const admin = await makeUser({ isAdmin: true });
    const other = await makeUser({ isAdmin: true });
    for (const target of [admin, other]) {
      assert.equal((await call(admin.token, "PATCH", `/api/admin/users/${target.id}`, { suspended: true })).status, 403);
      assert.equal((await call(admin.token, "PATCH", `/api/admin/users/${target.id}`, { role: "recruiter" })).status, 403);
      assert.equal(
        (await call(admin.token, "DELETE", `/api/admin/users/${target.id}`, { confirmEmail: target.email })).status,
        403,
      );
    }
    assert.equal(await User.countDocuments({ isAdmin: true, suspendedAt: null }), 2);
  });

  test("me reports the admin flag so the client can show the panel", async () => {
    const admin = await makeUser({ isAdmin: true });
    const member = await makeUser();
    assert.equal((await call(admin.token, "GET", "/api/auth/me")).body.data.isAdmin, true);
    assert.equal((await call(member.token, "GET", "/api/auth/me")).body.data.isAdmin, false);
  });
});

describe("admin input validation", () => {
  test("rejects malformed ids, queries and bodies", async () => {
    const admin = await makeUser({ isAdmin: true });
    const member = await makeUser();
    assert.equal((await call(admin.token, "GET", "/api/admin/users/not-an-id")).status, 400);
    assert.equal((await call(admin.token, "GET", "/api/admin/users?page=0")).status, 400);
    assert.equal((await call(admin.token, "GET", "/api/admin/users?filter=everyone")).status, 400);
    // One change per request.
    assert.equal(
      (await call(admin.token, "PATCH", `/api/admin/users/${member.id}`, { role: "recruiter", suspended: true })).status,
      400,
    );
    assert.equal((await call(admin.token, "PATCH", `/api/admin/users/${member.id}`, { role: "admin" })).status, 400);
    assert.equal((await call(admin.token, "PATCH", `/api/admin/users/${member.id}`, {})).status, 400);
  });

  test("search input is matched literally, not as a pattern", async () => {
    const admin = await makeUser({ isAdmin: true });
    await makeUser({ name: "Plain Name" });
    const res = await call(admin.token, "GET", `/api/admin/users?search=${encodeURIComponent(".*")}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.total, 0);
  });
});

describe("admin user management", () => {
  test("lists, filters and searches users", async () => {
    const admin = await makeUser({ isAdmin: true });
    await makeUser({ role: "recruiter", name: "Rita Recruiter" });
    await makeUser({ suspendedAt: new Date() });

    const all = await call(admin.token, "GET", "/api/admin/users");
    assert.equal(all.body.data.total, 3);
    assert.equal((await call(admin.token, "GET", "/api/admin/users?filter=recruiters")).body.data.total, 1);
    assert.equal((await call(admin.token, "GET", "/api/admin/users?filter=suspended")).body.data.total, 1);
    assert.equal((await call(admin.token, "GET", "/api/admin/users?filter=admins")).body.data.total, 1);
    const found = await call(admin.token, "GET", "/api/admin/users?search=rita");
    assert.equal(found.body.data.items[0].name, "Rita Recruiter");
  });

  test("suspension locks the user out at once and reinstating restores access", async () => {
    const admin = await makeUser({ isAdmin: true });
    const member = await makeUser({ refreshToken: "stored-hash" });

    const suspended = await call(admin.token, "PATCH", `/api/admin/users/${member.id}`, { suspended: true });
    assert.equal(suspended.status, 200);
    assert.ok(suspended.body.data.suspendedAt);
    assert.equal((await call(member.token, "GET", "/api/auth/me")).status, 403);

    const stored = await User.findById(member.id).select("+refreshToken").lean();
    assert.equal(stored?.refreshToken, undefined, "open sessions must be revoked");

    await call(admin.token, "PATCH", `/api/admin/users/${member.id}`, { suspended: false });
    assert.equal((await call(member.token, "GET", "/api/auth/me")).status, 200);

    const actions = (await AdminAudit.find({}).sort({ createdAt: 1 }).lean()).map((a) => a.action);
    assert.deepEqual(actions, ["user.suspend", "user.reinstate"]);
  });

  test("changes role and audits only real changes", async () => {
    const admin = await makeUser({ isAdmin: true });
    const member = await makeUser();

    const res = await call(admin.token, "PATCH", `/api/admin/users/${member.id}`, { role: "recruiter" });
    assert.equal(res.body.data.role, "recruiter");
    await call(admin.token, "PATCH", `/api/admin/users/${member.id}`, { role: "recruiter" });

    const audit = await AdminAudit.find({}).lean();
    assert.equal(audit.length, 1);
    assert.equal(audit[0].detail, "user → recruiter");
    assert.equal(String(audit[0].actorId), admin.id);
  });

  test("deleting a user needs their email typed back and cascades their content", async () => {
    const admin = await makeUser({ isAdmin: true });
    const member = await makeUser();
    await Resume.create({ userId: member.id, title: "CV", name: "cv.pdf", fileUrl: "https://x/cv.pdf", fileType: "pdf" });

    const wrong = await call(admin.token, "DELETE", `/api/admin/users/${member.id}`, { confirmEmail: "nope@example.com" });
    assert.equal(wrong.status, 400);
    assert.ok(await User.exists({ _id: member.id }));

    const ok = await call(admin.token, "DELETE", `/api/admin/users/${member.id}`, {
      confirmEmail: member.email.toUpperCase(),
    });
    assert.equal(ok.status, 200);
    assert.equal(await User.exists({ _id: member.id }), null);
    assert.equal(await Resume.countDocuments({ userId: member.id }), 0);
    assert.equal((await AdminAudit.findOne({}).lean())?.targetLabel, member.email);
  });

  test("unknown users are a 404", async () => {
    const admin = await makeUser({ isAdmin: true });
    const ghost = new mongoose.Types.ObjectId().toString();
    assert.equal((await call(admin.token, "GET", `/api/admin/users/${ghost}`)).status, 404);
    assert.equal((await call(admin.token, "PATCH", `/api/admin/users/${ghost}`, { suspended: true })).status, 404);
  });
});

describe("admin content moderation", () => {
  test("removes a resume with its reactions and comments", async () => {
    const admin = await makeUser({ isAdmin: true });
    const owner = await makeUser();
    const viewer = await makeUser();
    const resume = await Resume.create({
      userId: owner.id, title: "Spam", name: "s.pdf", fileUrl: "https://x/s.pdf", fileType: "pdf",
    });
    await Like.create({ resumeId: resume._id, userId: viewer.id, reaction: "like" });
    await Comment.create({ resumeId: resume._id, userId: viewer.id, text: "hi" });

    const listed = await call(admin.token, "GET", "/api/admin/resumes?search=spam");
    assert.equal(listed.body.data.items[0].owner.id, owner.id);

    assert.equal((await call(admin.token, "DELETE", `/api/admin/resumes/${resume._id}`)).status, 200);
    assert.equal(await Resume.exists({ _id: resume._id }), null);
    assert.equal(await Like.countDocuments({ resumeId: resume._id }), 0);
    assert.equal(await Comment.countDocuments({ resumeId: resume._id }), 0);
    assert.equal((await call(admin.token, "DELETE", `/api/admin/resumes/${resume._id}`)).status, 404);
  });

  test("removing a comment others replied to tombstones it instead", async () => {
    const admin = await makeUser({ isAdmin: true });
    const owner = await makeUser();
    const author = await makeUser();
    const replier = await makeUser();
    const resume = await Resume.create({
      userId: owner.id, title: "CV", name: "c.pdf", fileUrl: "https://x/c.pdf", fileType: "pdf", commentsCount: 1,
    });
    const root = await Comment.create({ resumeId: resume._id, userId: author.id, text: "rude" });
    await Comment.create({ resumeId: resume._id, userId: replier.id, text: "reply", parentId: root._id });

    assert.equal((await call(admin.token, "DELETE", `/api/admin/comments/${root._id}`)).status, 200);
    const after = await Comment.findById(root._id).lean();
    assert.equal(after?.text, TOMBSTONE_TEXT);
    assert.equal(after?.userId, null);
    assert.equal(await Comment.countDocuments({ resumeId: resume._id }), 2);

    // Tombstones drop out of the moderation queue and can't be removed again.
    const listed = await call(admin.token, "GET", "/api/admin/comments");
    assert.deepEqual(listed.body.data.items.map((c: { text: string }) => c.text), ["reply"]);
    assert.equal((await call(admin.token, "DELETE", `/api/admin/comments/${root._id}`)).status, 404);
  });
});
