import assert from "node:assert/strict";
import test, { describe } from "node:test";
import CreateProjectDto from "../src/modules/project/dto/create-project.dto.js";

// Project links are rendered as clickable hrefs, including on the recruiter's
// candidate page — i.e. to a different user than the one who typed them. Only
// http(s) is allowed, matching the profile DTO, so a `javascript:` or similar
// URL can never be stored in the first place.
const base = { title: "RoastForge" };

describe("CreateProjectDto links", () => {
  for (const field of ["githubUrl", "liveDemo"] as const) {
    test(`${field}: accepts https`, () => {
      assert.equal(CreateProjectDto.validate({ ...base, [field]: "https://github.com/me/app" }).errors, null);
    });

    test(`${field}: accepts http`, () => {
      assert.equal(CreateProjectDto.validate({ ...base, [field]: "http://example.com" }).errors, null);
    });

    test(`${field}: accepts empty`, () => {
      assert.equal(CreateProjectDto.validate({ ...base, [field]: "" }).errors, null);
    });

    test(`${field}: accepts omitted`, () => {
      assert.equal(CreateProjectDto.validate(base).errors, null);
    });

    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "vbscript:msgbox(1)", "ftp://example.com/file"]) {
      test(`${field}: rejects ${bad}`, () => {
        const { errors } = CreateProjectDto.validate({ ...base, [field]: bad });
        assert.ok(errors && errors.some((e) => e.includes(field)), `expected a ${field} error, got ${errors}`);
      });
    }
  }
});
