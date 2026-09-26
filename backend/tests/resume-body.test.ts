import assert from "node:assert/strict";
import test, { describe } from "node:test";
import mongoose from "mongoose";
import CreateResumeDto from "../src/modules/resume/dto/create-resume.dto.js";
import UpdateResumeDto from "../src/modules/resume/dto/update-resume.dto.js";
import Resume from "../src/modules/resume/resume.model.js";

// The post body is stored as `blurb`. It is optional plain text, capped at
// 2,000 characters, and the cap has to agree in three places — both DTOs and
// the model — or a body can pass validation and then fail on save.
const BODY_MAX = 2000;

const validCreate = {
  title: "New-grad SWE chasing backend roles",
  name: "resume.pdf",
  fileUrl: "https://res.cloudinary.com/demo/raw/upload/v1/resume.pdf",
  fileType: "pdf",
};

describe("CreateResumeDto blurb", () => {
  test(`accepts a body of exactly ${BODY_MAX} characters`, () => {
    const { errors } = CreateResumeDto.validate({ ...validCreate, blurb: "a".repeat(BODY_MAX) });
    assert.equal(errors, null);
  });

  test(`rejects a body of ${BODY_MAX + 1} characters`, () => {
    const { errors } = CreateResumeDto.validate({ ...validCreate, blurb: "a".repeat(BODY_MAX + 1) });
    assert.ok(errors && errors.some((e) => e.includes("blurb")), `expected a blurb error, got ${errors}`);
  });

  test("accepts an empty body", () => {
    assert.equal(CreateResumeDto.validate({ ...validCreate, blurb: "" }).errors, null);
  });

  test("accepts an omitted body", () => {
    assert.equal(CreateResumeDto.validate(validCreate).errors, null);
  });

  test("keeps line breaks in the body", () => {
    const blurb = "Line one\n\nLine two";
    const { value } = CreateResumeDto.validate({ ...validCreate, blurb });
    assert.equal(value.blurb, blurb);
  });
});

describe("UpdateResumeDto blurb", () => {
  test(`accepts a body of exactly ${BODY_MAX} characters`, () => {
    assert.equal(UpdateResumeDto.validate({ blurb: "a".repeat(BODY_MAX) }).errors, null);
  });

  test(`rejects a body of ${BODY_MAX + 1} characters`, () => {
    const { errors } = UpdateResumeDto.validate({ blurb: "a".repeat(BODY_MAX + 1) });
    assert.ok(errors && errors.some((e) => e.includes("blurb")), `expected a blurb error, got ${errors}`);
  });

  test("accepts clearing the body", () => {
    assert.equal(UpdateResumeDto.validate({ blurb: "" }).errors, null);
  });
});

describe("Resume model blurb", () => {
  // validateSync runs schema validators without a database connection.
  const build = (blurb: string) =>
    new Resume({ ...validCreate, userId: new mongoose.Types.ObjectId(), blurb });

  test(`accepts a body of exactly ${BODY_MAX} characters`, () => {
    assert.equal(build("a".repeat(BODY_MAX)).validateSync(), undefined);
  });

  test(`rejects a body of ${BODY_MAX + 1} characters`, () => {
    const err = build("a".repeat(BODY_MAX + 1)).validateSync();
    assert.ok(err?.errors.blurb, "expected a validation error on blurb");
  });

  test("defaults a missing body to an empty string", () => {
    const doc = new Resume({ ...validCreate, userId: new mongoose.Types.ObjectId() });
    assert.equal(doc.blurb, "");
  });
});
